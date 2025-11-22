import { useCallback, MutableRefObject } from "react";
import type { Message } from "../types";

interface UseChatSubmitProps {
  selectedModelId: string;
  messages: Message[];
  setMessages: (msgs: Message[] | ((prev: Message[]) => Message[])) => void;
  saveHistory: (msgs: Message[], shouldUpdateDate: boolean) => void;
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
      
      // Capture the ID of the chat that INITIATED the request
      const submittingChatId = chatIdRef.current;
      
      // Capture current messages state at moment of send
      const currentHistory = [...messages];

      const userMsg: Message = {
        id: Date.now().toString(),
        role: "user",
        content: userText,
      };

      if (submittingChatId === chatIdRef.current) {
        setMessages((prev) => [...prev, userMsg]);
      }

      setIsLoading(true);
      setGeneratingChatId(submittingChatId);

      const aiMsgId = `${Date.now() + 1}`;
      
      // Helper to construct the final AI message object
      let aiMsgContent = "";
      
      await new Promise((resolve) => setTimeout(resolve, 50));

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

        if (!response.ok) throw new Error("Connection failed or API error");
        if (!response.body) throw new Error("No stream available");

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          aiMsgContent += chunk;

          if (submittingChatId === chatIdRef.current) {
            // User is on the active chat -> Update UI State
            setMessages((prev) => {
              // If the message exists, update it; otherwise append it
              const exists = prev.some((m) => m.id === aiMsgId);
              if (exists) {
                return prev.map((m) =>
                  m.id === aiMsgId ? { ...m, content: aiMsgContent } : m
                );
              } else {
                return [
                  ...prev,
                  { id: aiMsgId, role: "assistant", content: aiMsgContent },
                ];
              }
            });
          } else {
            // User switched tabs -> Update LocalStorage silently
            const savedChat = localStorage.getItem(`chat_${submittingChatId}`);
            
            if (savedChat) {
              const chatMessages = JSON.parse(savedChat) as Message[];
              
              // We need to ensure the User Message is saved first if it wasn't yet
              const userMsgExists = chatMessages.some(m => m.id === userMsg.id);
              if (!userMsgExists) {
                 chatMessages.push(userMsg);
              }

              const existingAiMsg = chatMessages.find((m) => m.id === aiMsgId);
              if (existingAiMsg) {
                existingAiMsg.content = aiMsgContent;
              } else {
                chatMessages.push({
                  id: aiMsgId,
                  role: "assistant",
                  content: aiMsgContent,
                });
              }
              localStorage.setItem(`chat_${submittingChatId}`, JSON.stringify(chatMessages));
            } else {
                // If savedChat is null, the user might have deleted the chat while it was generating.
                // In that case, we should stop processing to avoid resurrecting a deleted chat.
                break; 
            }
          }
        }

        const finalMsg: Message = { id: aiMsgId, role: "assistant", content: aiMsgContent };
        
        if (submittingChatId === chatIdRef.current) {
          setMessages(prev => {
             const final = prev.map(m => m.id === aiMsgId ? finalMsg : m);
             saveHistory(final, true);
             return final;
          });
        } else {
           // Background save finalization
           const savedChat = localStorage.getItem(`chat_${submittingChatId}`);
           if (savedChat) {
             const chatMessages = JSON.parse(savedChat) as Message[];
             // Ensure user message is there
             if (!chatMessages.some(m => m.id === userMsg.id)) {
                 chatMessages.push(userMsg);
             }
             // Update or push AI message
             const existingIndex = chatMessages.findIndex(m => m.id === aiMsgId);
             if (existingIndex !== -1) {
                 chatMessages[existingIndex] = finalMsg;
             } else {
                 chatMessages.push(finalMsg);
             }
             localStorage.setItem(`chat_${submittingChatId}`, JSON.stringify(chatMessages));
             
             const allChatsStr = localStorage.getItem("all_chats");
             if(allChatsStr) {
                 const allChats = JSON.parse(allChatsStr);
                 const chatIndex = allChats.findIndex((c: any) => c.id === submittingChatId);
                 if(chatIndex > -1) {
                     allChats[chatIndex].date = Date.now();
                     localStorage.setItem("all_chats", JSON.stringify(allChats.sort((a: any, b: any) => b.date - a.date)));
                 }
             }
           }
        }

      } catch (err) {
        console.error("Chat error:", err);
        if (submittingChatId === chatIdRef.current) {
          setMessages((prev) =>
            prev.filter((m) => m.id !== aiMsgId && m.id !== userMsg.id)
          );
          setInput(userText);
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