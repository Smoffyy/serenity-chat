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

      // Optimistically add user message
      if (submittingChatId === chatIdRef.current) {
        setMessages((prev) => [...prev, userMsg]);
      }

      setIsLoading(true);
      setGeneratingChatId(submittingChatId);

      const aiMsgId = `${Date.now() + 1}`;
      
      // Track distinct parts of the response
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
                    // Capture reasoning tokens if they exist
                    if (delta.reasoning_content) {
                        aiMsgReasoning += delta.reasoning_content;
                    }
                    // Capture standard content tokens
                    if (delta.content) {
                        aiMsgContent += delta.content;
                    }
                 }
              } catch (e) {
                 // Ignore parse errors for partial chunks
              }
            }
          }

          // Construct the full message string using <think> tags for the UI parser
          let fullMessage = "";
          if (aiMsgReasoning) {
             fullMessage += `<think>${aiMsgReasoning}`;
             if (aiMsgContent) {
                 fullMessage += `</think>`;
             }
          }
          fullMessage += aiMsgContent;

          // Update UI or Storage
          if (submittingChatId === chatIdRef.current) {
            setMessages((prev) => {
              const exists = prev.some((m) => m.id === aiMsgId);
              if (exists) {
                return prev.map((m) =>
                  m.id === aiMsgId ? { ...m, content: fullMessage } : m
                );
              } else {
                return [
                  ...prev,
                  { id: aiMsgId, role: "assistant", content: fullMessage },
                ];
              }
            });
          } else {
            updateLocalStorage(submittingChatId, userMsg, aiMsgId, fullMessage);
          }
        }

        // Final construction for save
        let finalMessage = "";
        if (aiMsgReasoning) {
            finalMessage += `<think>${aiMsgReasoning}</think>`;
        }
        finalMessage += aiMsgContent;

        await finalizeChat(submittingChatId, chatIdRef, aiMsgId, finalMessage, userMsg, setMessages, saveHistory);

      } catch (err) {
        console.error("Generation interrupted:", err);
        
        // Construct partial error message
        let partialMsg = "";
        if (aiMsgReasoning) partialMsg += `<think>${aiMsgReasoning}`; // Leave open to show incomplete thought
        if (aiMsgContent) {
             if (aiMsgReasoning) partialMsg += `</think>`; 
             partialMsg += aiMsgContent;
        }
        
        const errorAppendix = partialMsg.length > 0 
            ? "\n\n*[Connection interrupted]*" 
            : "Error: Could not generate response.";
            
        const finalContent = partialMsg + errorAppendix;

        if (submittingChatId === chatIdRef.current) {
             setMessages(prev => {
                 const exists = prev.some(m => m.id === aiMsgId);
                 let newHistory;
                 if(exists) {
                     newHistory = prev.map(m => m.id === aiMsgId ? {...m, content: finalContent} : m);
                 } else {
                     newHistory = [...prev, { id: aiMsgId, role: "assistant", content: finalContent }];
                 }
                 saveHistory(newHistory, true);
                 return newHistory;
             });
        } else {
             updateLocalStorage(submittingChatId, userMsg, aiMsgId, finalContent);
        }
      } finally {
        setIsLoading(false);
        setGeneratingChatId(null);
      }
    },
    [selectedModelId, messages, setMessages, saveHistory, setIsLoading, setGeneratingChatId, chatIdRef]
  );

  return { onSubmit };
};

/* --- Helpers for Background Storage Updates --- */

function updateLocalStorage(chatId: string, userMsg: Message, aiMsgId: string, content: string) {
    const savedChat = localStorage.getItem(`chat_${chatId}`);
    if (savedChat) {
      const chatMessages = JSON.parse(savedChat) as Message[];
      
      if (!chatMessages.some(m => m.id === userMsg.id)) {
         chatMessages.push(userMsg);
      }

      const existingAiMsg = chatMessages.find((m) => m.id === aiMsgId);
      if (existingAiMsg) {
        existingAiMsg.content = content;
      } else {
        chatMessages.push({
          id: aiMsgId,
          role: "assistant",
          content: content,
        });
      }
      localStorage.setItem(`chat_${chatId}`, JSON.stringify(chatMessages));
    }
}

async function finalizeChat(
    chatId: string, 
    chatIdRef: MutableRefObject<string>, 
    aiMsgId: string, 
    finalContent: string, 
    userMsg: Message,
    setMessages: any, 
    saveHistory: any
) {
    const finalMsg = { id: aiMsgId, role: "assistant" as const, content: finalContent };

    if (chatId === chatIdRef.current) {
        setMessages((prev: Message[]) => {
            const final = prev.map(m => m.id === aiMsgId ? finalMsg : m);
            saveHistory(final, true);
            return final;
        });
    } else {
        updateLocalStorage(chatId, userMsg, aiMsgId, finalContent);
        const allChatsStr = localStorage.getItem("all_chats");
        if(allChatsStr) {
            const allChats = JSON.parse(allChatsStr);
            const chatIndex = allChats.findIndex((c: any) => c.id === chatId);
            if(chatIndex > -1) {
                allChats[chatIndex].date = Date.now();
                localStorage.setItem("all_chats", JSON.stringify(allChats.sort((a: any, b: any) => b.date - a.date)));
            }
        }
    }
}