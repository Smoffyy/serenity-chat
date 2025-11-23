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
  saveHistoryToTarget: (msgs: Message[], targetChatId: string, shouldUpdateDate: boolean) => Promise<any>;
}

export const useChatSubmit = ({
  selectedModelId,
  messages,
  setMessages,
  saveHistory,
  setIsLoading,
  setGeneratingChatId,
  chatIdRef,
  saveHistoryToTarget,
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

      if (submittingChatId === chatIdRef.current) {
        setMessages((prev) => [...prev, userMsg]);
        await saveHistory([...currentHistory, userMsg], false); 
      }

      setIsLoading(true);
      setGeneratingChatId(submittingChatId);

      const aiMsgId = `${Date.now() + 1}`;
      
      let aiMsgReasoning = "";
      let aiMsgContent = "";
      
      let backgroundMessages: Message[] | null = null;
      if (submittingChatId !== chatIdRef.current) {
         backgroundMessages = [...currentHistory, userMsg];
         // Initial background save of user message
         saveHistoryToTarget(backgroundMessages, submittingChatId, false);
      }

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
        
        let messagesToSave: Message[] = [...currentHistory, userMsg];

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

          // Update UI or Storage
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
              messagesToSave = updatedMessages; 
              return updatedMessages;
            });
            
            saveHistory(messagesToSave, false);
          } else {
            // Update storage for background chat
            if (backgroundMessages) {
                const existingAiMsgIndex = backgroundMessages.findIndex((m) => m.id === aiMsgId);
                if (existingAiMsgIndex > -1) {
                    backgroundMessages[existingAiMsgIndex].content = fullMessage;
                } else {
                    backgroundMessages.push({ id: aiMsgId, role: "assistant", content: fullMessage });
                }
                // Save partial result for background chat
                saveHistoryToTarget(backgroundMessages, submittingChatId, false);
            }
          }
        }

        // Final construction for save
        let finalMessage = "";
        if (aiMsgReasoning) {
            finalMessage += `<think>${aiMsgReasoning}</think>`;
        }
        finalMessage += aiMsgContent;

        await finalizeChat(
            submittingChatId, 
            chatIdRef, 
            aiMsgId, 
            finalMessage, 
            userMsg, 
            setMessages, 
            saveHistory, 
            saveHistoryToTarget,
            backgroundMessages
        );

      } catch (err) {
        console.error("Generation interrupted:", err);
        
        // Construct partial error message
        let partialMsg = "";
        if (aiMsgReasoning) partialMsg += `<think>${aiMsgReasoning}`;
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
                     // Add user message if optimistic update failed
                     const userMsgExists = prev.some(m => m.id === userMsg.id);
                     newHistory = [...(userMsgExists ? prev : [...prev, userMsg]), { id: aiMsgId, role: "assistant", content: finalContent }];
                 }
                 saveHistory(newHistory, true);
                 return newHistory;
             });
        } else {
             
             if (backgroundMessages) {
                const existingAiMsgIndex = backgroundMessages.findIndex((m) => m.id === aiMsgId);
                if (existingAiMsgIndex > -1) {
                    backgroundMessages[existingAiMsgIndex].content = finalContent;
                } else {
                    backgroundMessages.push({ id: aiMsgId, role: "assistant", content: finalContent });
                }
                saveHistoryToTarget(backgroundMessages, submittingChatId, true);
             }
        }
      } finally {
        setIsLoading(false);
        setGeneratingChatId(null);
      }
    },
    [selectedModelId, messages, setMessages, saveHistory, setIsLoading, setGeneratingChatId, chatIdRef, saveHistoryToTarget]
  );

  return { onSubmit };
};

/* --- Helpers for Finalization --- */

async function finalizeChat(
    chatId: string, 
    chatIdRef: MutableRefObject<string>, 
    aiMsgId: string, 
    finalContent: string, 
    userMsg: Message,
    setMessages: any, 
    saveHistory: any, // For current chat
    saveHistoryToTarget: any, // For background chat
    backgroundMessages: Message[] | null // The message array being built in the background
) {
    const finalMsg = { id: aiMsgId, role: "assistant" as const, content: finalContent };

    if (chatId === chatIdRef.current) {
        setMessages((prev: Message[]) => {
            // Ensure both user and assistant message are present before saving
            const userMsgExists = prev.some(m => m.id === userMsg.id);
            let final = prev;
            if (!userMsgExists) {
                // Should not happen if optimistic update worked, but for safety
                final = [...prev, userMsg]; 
            }
            final = final.map(m => m.id === aiMsgId ? finalMsg : m);
            saveHistory(final, true); // true to generate title/update date
            return final;
        });
    } else {
        if (backgroundMessages) {
             const existingAiMsgIndex = backgroundMessages.findIndex((m) => m.id === aiMsgId);
             if (existingAiMsgIndex > -1) {
                 backgroundMessages[existingAiMsgIndex].content = finalContent;
             } else {
                 backgroundMessages.push(finalMsg);
             }
             saveHistoryToTarget(backgroundMessages, chatId, true); // true to generate title/update date
        }
    }
}