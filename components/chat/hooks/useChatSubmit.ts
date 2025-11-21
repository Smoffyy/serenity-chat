import { useCallback } from "react";
import type { Message } from "../types";

interface UseChatSubmitProps {
  selectedModelId: string;
  messages: Message[];
  setMessages: (msgs: Message[] | ((prev: Message[]) => Message[])) => void;
  saveHistory: (msgs: Message[], shouldUpdateDate: boolean) => void;
  setIsLoading: (loading: boolean) => void;
}

export const useChatSubmit = ({
  selectedModelId,
  messages,
  setMessages,
  saveHistory,
  setIsLoading,
}: UseChatSubmitProps) => {
  const onSubmit = useCallback(
    async (e: React.FormEvent, input: string, setInput: (val: string) => void) => {
      e.preventDefault();
      if (!selectedModelId || !input.trim()) return;

      const userText = input.trim();
      setInput("");

      const userMsg: Message = {
        id: Date.now().toString(),
        role: "user",
        content: userText,
      };

      setMessages((prev) => [...prev, userMsg]);
      setIsLoading(true);

      const aiMsgId = `${Date.now() + 1}`;

      await new Promise((resolve) => setTimeout(resolve, 50));

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [...messages, userMsg].map((m) => ({
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
        let rawAccumulated = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          rawAccumulated += chunk;

          setMessages((prev) => {
            if (!prev.some((m) => m.id === aiMsgId)) {
              return [
                ...prev,
                { id: aiMsgId, role: "assistant", content: rawAccumulated },
              ];
            }
            return prev.map((m) =>
              m.id === aiMsgId ? { ...m, content: rawAccumulated } : m
            );
          });
        }

        const finalMsg = { id: aiMsgId, role: "assistant", content: rawAccumulated };
        const finalHistory = [...messages, userMsg, finalMsg];

        setMessages(finalHistory);
        saveHistory(finalHistory, true);
      } catch (err) {
        console.error("Chat error:", err);
        setMessages((prev) =>
          prev.filter((m) => m.id !== aiMsgId && m.id !== userMsg.id)
        );
      } finally {
        setIsLoading(false);
      }
    },
    [selectedModelId, messages, setMessages, saveHistory, setIsLoading]
  );

  return { onSubmit };
};