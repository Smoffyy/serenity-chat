import { useCallback } from "react";
import type { Message, ChatMetadata } from "../types";

// FIXED: Accepts selectedModelId
export const useChatHistory = (chatId: string, selectedModelId: string) => {
  const getChatMetadata = useCallback((): ChatMetadata[] => {
    try {
      return JSON.parse(localStorage.getItem("all_chats") || "[]");
    } catch {
      return [];
    }
  }, []);

  // FIXED: Accepts modelId argument
  const generateChatTitle = useCallback(
    async (messages: Message[], modelId: string): Promise<string> => {
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
            // FIXED: Use the passed modelId, or fallback
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
        return cleanedTitle.slice(0, 60) || "New Chat"; // Cap at 60 chars
      } catch (err) {
        console.error("Error generating title:", err);
        return "New Chat";
      }
    },
    []
  );

  const saveHistory = useCallback(
    async (currentMessages: Message[], shouldUpdateDate = false): Promise<ChatMetadata[]> => {
      if (currentMessages.length === 0) return getChatMetadata();

      localStorage.setItem(`chat_${chatId}`, JSON.stringify(currentMessages));

      const currentList = getChatMetadata();
      const existingIndex = currentList.findIndex((c) => c.id === chatId);

      let title = "New Chat";
      let date = Date.now();

      if (existingIndex > -1) {
        title = currentList[existingIndex].title;
        date = shouldUpdateDate ? Date.now() : currentList[existingIndex].date;

        // Only generate title once: if title is "New Chat", have 2+ messages, and this is the first time (only when AI just responded)
        if (title === "New Chat" && currentMessages.length >= 2 && shouldUpdateDate) {
          // FIXED: Pass selectedModelId
          title = await generateChatTitle(currentMessages, selectedModelId);
        }
      } else if (currentMessages.length > 0) {
        // New chat - only generate if we have 2+ messages and shouldUpdateDate is true (meaning AI just responded)
        if (currentMessages.length >= 2 && shouldUpdateDate) {
          // FIXED: Pass selectedModelId
          title = await generateChatTitle(currentMessages, selectedModelId);
        } else {
          title = "New Chat";
        }
      }

      const newMeta: ChatMetadata = { id: chatId, title, date };
      const updatedList =
        existingIndex > -1
          ? currentList.map((c, i) => (i === existingIndex ? newMeta : c))
          : [newMeta, ...currentList];

      const sortedList = updatedList.sort((a, b) => b.date - a.date);
      localStorage.setItem("all_chats", JSON.stringify(sortedList));
      
      return sortedList;
    },
    // FIXED: Add selectedModelId to dependencies
    [chatId, getChatMetadata, generateChatTitle, selectedModelId] 
  );

  return { getChatMetadata, saveHistory };
};