import { useCallback } from "react";
import type { Message, ChatMetadata } from "../types";

export const useChatHistory = (chatId: string) => {
  const getChatMetadata = useCallback((): ChatMetadata[] => {
    try {
      return JSON.parse(localStorage.getItem("all_chats") || "[]");
    } catch {
      return [];
    }
  }, []);

  const saveHistory = useCallback(
    (currentMessages: Message[], shouldUpdateDate = false) => {
      if (currentMessages.length === 0) return;

      localStorage.setItem(`chat_${chatId}`, JSON.stringify(currentMessages));

      const currentList = getChatMetadata();
      const existingIndex = currentList.findIndex((c) => c.id === chatId);

      let title = "New Chat";
      let date = Date.now();

      if (existingIndex > -1) {
        title = currentList[existingIndex].title;
        date = shouldUpdateDate ? Date.now() : currentList[existingIndex].date;
      } else if (currentMessages.length > 0) {
        const firstUserMsg = currentMessages.find((m) => m.role === "user");
        if (firstUserMsg) {
          const txt = firstUserMsg.content.trim();
          title = txt.length > 30 ? `${txt.slice(0, 30)}...` : txt;
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
    [chatId, getChatMetadata]
  );

  return { getChatMetadata, saveHistory };
};