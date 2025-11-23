import { useCallback, MutableRefObject } from "react";
import type { Message } from "../types";

interface UseChatSubmitProps {
  selectedModelId: string;
  messages: Message[];
  setMessages: (msgs: Message[] | ((prev: Message[]) => Message[])) => void;
  saveHistory: (msgs: Message[], shouldUpdateDate: boolean) => Promise<any>;
  setIsLoading: (loading: boolean) => void;
  setGeneratingChatId: (id: string | null) => void;
  chatIdRef: MutableRefObject<string>;
}

// Global state for managing multiple concurrent requests
const generationControllers = new Map<string, AbortController>();
const backgroundChatData = new Map<string, { messages: Message[]; aiMsgId: string }>();

export const useChatSubmit = ({
  selectedModelId,
  messages,
  setMessages,
  saveHistory,
  setIsLoading,
  setGeneratingChatId,
  chatIdRef,
}: UseChatSubmitProps) => {
  const onSubmit = useCallback(
    async (e: React.FormEvent, input: string, setInput: (val: string) => void) => {
      e.preventDefault();
      if (!selectedModelId || !input.trim()) return;

      const userText = input.trim();
      setInput("");

      const submittingChatId = chatIdRef.current;
      const currentHistory = [...messages];

      const userMsg: Message = {
        id: Date.now().toString(),
        role: "user",
        content: userText,
      };

      // Always update current chat UI immediately
      if (submittingChatId === chatIdRef.current) {
        setMessages((prev) => [...prev, userMsg]);
        await saveHistory([...currentHistory, userMsg], false);
      }

      // Set loading for current chat only
      if (submittingChatId === chatIdRef.current) {
        setIsLoading(true);
      }
      setGeneratingChatId(submittingChatId);

      const aiMsgId = `${Date.now() + 1}`;

      // Create abort controller for this request
      const controller = new AbortController();
      generationControllers.set(submittingChatId, controller);
      
      // Track background chat data
      backgroundChatData.set(submittingChatId, {
        messages: [...currentHistory, userMsg],
        aiMsgId,
      });

      let aiMsgReasoning = "";
      let aiMsgContent = "";

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [...currentHistory, userMsg].map((m) => ({
              role: m.role,
              content: m.content,
            })),
            model: selectedModelId,
          }),
          signal: controller.signal,
        });

        if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
        if (!response.body) throw new Error("No stream available");

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.trim() === "" || line.trim() === "data: [DONE]") continue;
            if (line.startsWith("data: ")) {
              try {
                const json = JSON.parse(line.substring(6));
                const delta = json.choices?.[0]?.delta;

                if (delta) {
                  if (delta.reasoning_content) {
                    aiMsgReasoning += delta.reasoning_content;
                  }
                  if (delta.content) {
                    aiMsgContent += delta.content;
                  }
                }
              } catch (e) {
                // Ignore parse errors
              }
            }
          }

          let fullMessage = "";
          if (aiMsgReasoning) {
            fullMessage += `<think>${aiMsgReasoning}`;
            if (aiMsgContent) {
              fullMessage += `</think>`;
            }
          }
          fullMessage += aiMsgContent;

          // Update current chat UI
          if (submittingChatId === chatIdRef.current) {
            setMessages((prev) => {
              const exists = prev.some((m) => m.id === aiMsgId);
              let updatedMessages;

              if (exists) {
                updatedMessages = prev.map((m) =>
                  m.id === aiMsgId ? { ...m, content: fullMessage } : m
                );
              } else {
                updatedMessages = [
                  ...prev,
                  { id: aiMsgId, role: "assistant", content: fullMessage },
                ];
              }
              
              // Don't await here, just fire and forget for streaming updates
              saveHistory(updatedMessages, false);
              return updatedMessages;
            });
          } else {
            // Update background chat data in memory
            const bgData = backgroundChatData.get(submittingChatId);
            if (bgData) {
              const existingAiMsgIndex = bgData.messages.findIndex(
                (m) => m.id === aiMsgId
              );
              if (existingAiMsgIndex > -1) {
                bgData.messages[existingAiMsgIndex].content = fullMessage;
              } else {
                bgData.messages.push({
                  id: aiMsgId,
                  role: "assistant",
                  content: fullMessage,
                });
              }
              // Persist background chat to localStorage
              localStorage.setItem(
                `chat_${submittingChatId}`,
                JSON.stringify(bgData.messages)
              );
            }
          }
        }

        // Final construction for save
        let finalMessage = "";
        if (aiMsgReasoning) {
          finalMessage += `<think>${aiMsgReasoning}</think>`;
        }
        finalMessage += aiMsgContent;

        // Finalize the message
        if (submittingChatId === chatIdRef.current) {
          setMessages((prev) => {
            const finalMsg = {
              id: aiMsgId,
              role: "assistant" as const,
              content: finalMessage,
            };

            const exists = prev.some((m) => m.id === aiMsgId);
            let updatedMessages;

            if (exists) {
              updatedMessages = prev.map((m) =>
                m.id === aiMsgId ? finalMsg : m
              );
            } else {
              updatedMessages = [...prev, finalMsg];
            }

            saveHistory(updatedMessages, true);
            return updatedMessages;
          });
        } else {
          // Finalize background chat
          const bgData = backgroundChatData.get(submittingChatId);
          if (bgData) {
            const finalMsg = {
              id: aiMsgId,
              role: "assistant" as const,
              content: finalMessage,
            };

            const existingAiMsgIndex = bgData.messages.findIndex(
              (m) => m.id === aiMsgId
            );
            if (existingAiMsgIndex > -1) {
              bgData.messages[existingAiMsgIndex] = finalMsg;
            } else {
              bgData.messages.push(finalMsg);
            }

            // Persist final background chat state
            localStorage.setItem(
              `chat_${submittingChatId}`,
              JSON.stringify(bgData.messages)
            );

            // Update chat metadata in history
            try {
              const chatList = JSON.parse(localStorage.getItem("all_chats") || "[]");
              const chatIndex = chatList.findIndex((c: any) => c.id === submittingChatId);
              if (chatIndex > -1) {
                chatList[chatIndex].date = Date.now();
                chatList[chatIndex].title =
                  chatList[chatIndex].title === "New Chat"
                    ? await generateChatTitle(bgData.messages, selectedModelId)
                    : chatList[chatIndex].title;
                localStorage.setItem("all_chats", JSON.stringify(chatList));
              }
            } catch (e) {
              console.error("Error updating chat metadata:", e);
            }
          }
        }
      } catch (err: any) {
        console.error("Generation interrupted:", err);

        // Construct partial error message
        let partialMsg = "";
        if (aiMsgReasoning) partialMsg += `<think>${aiMsgReasoning}`;
        if (aiMsgContent) {
          if (aiMsgReasoning) partialMsg += `</think>`;
          partialMsg += aiMsgContent;
        }

        // Determine error message
        let errorAppendix = "";
        if (err.name === "AbortError") {
          errorAppendix =
            partialMsg.length > 0
              ? "\n\n*[Generation stopped]*"
              : "Generation was stopped.";
        } else {
          errorAppendix =
            partialMsg.length > 0
              ? "\n\n*[Connection interrupted]*"
              : "Error: Could not generate response.";
        }

        const finalContent = partialMsg + errorAppendix;

        if (submittingChatId === chatIdRef.current) {
          setMessages((prev) => {
            const exists = prev.some((m) => m.id === aiMsgId);
            let newHistory;
            if (exists) {
              newHistory = prev.map((m) =>
                m.id === aiMsgId ? { ...m, content: finalContent } : m
              );
            } else {
              const userMsgExists = prev.some((m) => m.id === userMsg.id);
              newHistory = [
                ...(userMsgExists ? prev : [...prev, userMsg]),
                { id: aiMsgId, role: "assistant", content: finalContent },
              ];
            }
            saveHistory(newHistory, true);
            return newHistory;
          });
        } else {
          // Handle background chat error
          const bgData = backgroundChatData.get(submittingChatId);
          if (bgData) {
            const finalMsg = {
              id: aiMsgId,
              role: "assistant" as const,
              content: finalContent,
            };

            const existingAiMsgIndex = bgData.messages.findIndex(
              (m) => m.id === aiMsgId
            );
            if (existingAiMsgIndex > -1) {
              bgData.messages[existingAiMsgIndex] = finalMsg;
            } else {
              bgData.messages.push(finalMsg);
            }

            localStorage.setItem(
              `chat_${submittingChatId}`,
              JSON.stringify(bgData.messages)
            );
          }
        }
      } finally {
        // Only stop loading if this is the current chat
        if (submittingChatId === chatIdRef.current) {
          setIsLoading(false);
        }
        setGeneratingChatId(null);
        generationControllers.delete(submittingChatId);
        backgroundChatData.delete(submittingChatId);
      }
    },
    [selectedModelId, messages, setMessages, saveHistory, setIsLoading, setGeneratingChatId, chatIdRef]
  );

  const onStop = useCallback(() => {
    const currentChatId = chatIdRef.current;
    const controller = generationControllers.get(currentChatId);

    if (controller) {
      try {
        controller.abort();
      } catch (e) {
        // Abort might throw, but that's fine
      }
      
      generationControllers.delete(currentChatId);
      setIsLoading(false);
      setGeneratingChatId(null);
    }
  }, [setIsLoading, setGeneratingChatId]);

  return { onSubmit, onStop };
};

// Helper function to generate chat title
async function generateChatTitle(
  messages: Message[],
  modelId: string
): Promise<string> {
  const userMessage = messages.find((m) => m.role === "user");
  if (!userMessage) return "New Chat";

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [
          {
            role: "user",
            content: `Generate a concise 5-word title for a chat. The user's first message was: "${userMessage.content}". 

Rules:
- Exactly 5 words or fewer
- Capture the main topic/intent
- Be descriptive but brief
- Only respond with the title, nothing else

Title:`,
          },
        ],
        model: modelId || "",
      }),
    });

    if (!response.ok) throw new Error("Failed to generate title");
    if (!response.body) throw new Error("No stream available");

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let title = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n");

      for (const line of lines) {
        if (line.trim() === "" || line.trim() === "data: [DONE]") continue;
        if (line.startsWith("data: ")) {
          try {
            const json = JSON.parse(line.substring(6));
            const delta = json.choices?.[0]?.delta;
            if (delta?.content) {
              title += delta.content;
            }
          } catch (e) {
            // Ignore parse errors
          }
        }
      }
    }

    const cleanedTitle = title.trim().replace(/^Title:\s*/i, "").trim();
    return cleanedTitle.slice(0, 60) || "New Chat";
  } catch (err) {
    console.error("Error generating title:", err);
    return "New Chat";
  }
}