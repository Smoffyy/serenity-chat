"use client";

import React, {
  useEffect,
  useState,
  useRef,
  FormEvent,
  KeyboardEvent,
  useCallback,
} from "react";
import { cn } from "@/lib/utils";

import type { Message, ChatMetadata, ModelData } from "./types";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { ChatMessages } from "./ChatMessages";
import { ChatInput } from "./ChatInput";
import { SettingsModal } from "./SettingsModal";
import { useChatHistory } from "./hooks/useChatHistory";
import { useChatSubmit } from "./hooks/useChatSubmit";

export default function ChatInterface() {
  /* ---------- STATE ---------- */
  const [models, setModels] = useState<ModelData[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string>("");
  const [defaultModelId, setDefaultModelId] = useState<string>("");
  const [chatId, setChatId] = useState<string>(() => Date.now().toString());
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [chatList, setChatList] = useState<ChatMetadata[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [isNewChat, setIsNewChat] = useState(true);
  const [isShiftPressed, setIsShiftPressed] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [isCursorEnabled, setIsCursorEnabled] = useState(false);

  const isInitialState = messages.length === 0;

  /* ---------- REFS ---------- */
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const shouldAutoScrollRef = useRef(true);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const modelDropdownRef = useRef<HTMLDivElement>(null);
  const chatListRef = useRef<HTMLDivElement>(null);

  /* ---------- HOOKS ---------- */
  const { getChatMetadata, saveHistory: saveHistoryBase } = useChatHistory(chatId);
  const { onSubmit: submitChat } = useChatSubmit({
    selectedModelId,
    messages,
    setMessages,
    saveHistory: (msgs, shouldUpdateDate) => {
      const updatedList = saveHistoryBase(msgs, shouldUpdateDate);
      setChatList(updatedList);
    },
    setIsLoading,
  });

  /* ---------- SETTINGS ---------- */
  const toggleCursor = () => {
    const newState = !isCursorEnabled;
    setIsCursorEnabled(newState);
    localStorage.setItem("cursor_enabled", String(newState));
  };

  /* ---------- CHAT LOGIC ---------- */
  const loadChat = useCallback(
    (id: string) => {
      if (messages.length > 0 && chatId !== id && !isNewChat) {
        saveHistoryBase(messages, false);
      }

      setActiveMenuId(null);
      setChatId(id);
      setMessages([]);
      setInput("");
      shouldAutoScrollRef.current = true;

      const saved = localStorage.getItem(`chat_${id}`);
      if (saved) {
        try {
          setMessages(JSON.parse(saved));
          setIsNewChat(false);
        } catch (e) {
          console.error("Error loading chat:", e);
          setIsNewChat(true);
        }
      } else {
        setIsNewChat(true);
      }

      setTimeout(() => inputRef.current?.focus(), 300);
    },
    [messages, saveHistoryBase, chatId, isNewChat]
  );

  const startNewChat = useCallback(() => {
    if (messages.length > 0 && !isNewChat) saveHistoryBase(messages, false);

    setActiveMenuId(null);
    setChatId(Date.now().toString());
    setMessages([]);
    setInput("");
    setIsNewChat(true);
    shouldAutoScrollRef.current = true;
    if (defaultModelId) setSelectedModelId(defaultModelId);
    setTimeout(() => inputRef.current?.focus(), 300);
  }, [messages, isNewChat, saveHistoryBase, defaultModelId]);

  const deleteAllChats = useCallback(() => {
    chatList.forEach((c) => localStorage.removeItem(`chat_${c.id}`));
    localStorage.setItem("all_chats", "[]");
    setChatList([]);
    startNewChat();
    setIsSettingsOpen(false);
  }, [chatList, startNewChat]);

  const deleteChat = useCallback(
    (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      localStorage.removeItem(`chat_${id}`);

      const updatedList = chatList.filter((c) => c.id !== id);
      localStorage.setItem("all_chats", JSON.stringify(updatedList));
      setChatList(updatedList);

      // If deleting current chat, go back to home
      if (chatId === id) startNewChat();
    },
    [chatId, chatList, startNewChat]
  );

  const handleSetDefaultModel = useCallback(
    (e: React.MouseEvent, modelId: string) => {
      e.stopPropagation();
      const newDefault = defaultModelId === modelId ? "" : modelId;
      setDefaultModelId(newDefault);
      localStorage.setItem("default_model", newDefault);
    },
    [defaultModelId]
  );

  const handleModelSelect = useCallback((modelId: string) => {
    setSelectedModelId(modelId);
    setTimeout(() => setIsModelDropdownOpen(false), 150);
  }, []);

  /* ---------- INPUT HANDLERS ---------- */
  const handleInputTextChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const el = e.currentTarget;
      setInput(el.value);

      el.style.height = "auto";
      const scrollHeight = el.scrollHeight;
      const minH = isInitialState ? 48 : 56;
      const newHeight = Math.min(Math.max(scrollHeight, minH), 200);
      el.style.height = `${newHeight}px`;
    },
    [isInitialState]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        submitChat(e as unknown as FormEvent, input, setInput);
      }
    },
    [submitChat, input]
  );

  const handleKeyUp = useCallback((e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Shift") setIsShiftPressed(false);
  }, []);

  /* ---------- EFFECTS ---------- */
  useEffect(() => {
    const handleShiftDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Shift") setIsShiftPressed(true);
    };
    const handleShiftUp = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Shift") setIsShiftPressed(false);
    };

    window.addEventListener("keydown", handleShiftDown);
    window.addEventListener("keyup", handleShiftUp);

    return () => {
      window.removeEventListener("keydown", handleShiftDown);
      window.removeEventListener("keyup", handleShiftUp);
    };
  }, []);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.resize = "none";
      inputRef.current.style.height = isInitialState ? "48px" : "56px";

      inputRef.current.onfocus = () => setIsInputFocused(true);
      inputRef.current.onblur = () => setIsInputFocused(false);
    }
  }, [isInitialState]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        modelDropdownRef.current &&
        !modelDropdownRef.current.contains(event.target as Node)
      )
        setIsModelDropdownOpen(false);

      if (
        chatListRef.current &&
        !chatListRef.current.contains(event.target as Node)
      )
        setActiveMenuId(null);
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setChatList(getChatMetadata());

    const savedDefaultModel = localStorage.getItem("default_model") || "";
    setDefaultModelId(savedDefaultModel);

    const savedCursorSetting = localStorage.getItem("cursor_enabled");
    if (savedCursorSetting === "true") {
      setIsCursorEnabled(true);
    }

    fetch("/api/models")
      .then((res) => res.json())
      .then((data) => {
        if (data.data?.length) {
          setModels(data.data);
          let initialModel = data.data[0].id;
          if (
            savedDefaultModel &&
            data.data.some((m: ModelData) => m.id === savedDefaultModel)
          )
            initialModel = savedDefaultModel;
          if (!selectedModelId) setSelectedModelId(initialModel);
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- SCROLL LOGIC ---------- */
  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    const isAtBottom = distanceFromBottom <= 75;

    shouldAutoScrollRef.current = isAtBottom;
  }, []);

  useEffect(() => {
    if (isInitialState || !scrollContainerRef.current) return;

    if (!isLoading && shouldAutoScrollRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }

    let animationFrameId: number;

    const smoothScrollToBottom = () => {
      if (shouldAutoScrollRef.current && scrollContainerRef.current) {
        scrollContainerRef.current.scrollTo({
          top: scrollContainerRef.current.scrollHeight,
          behavior: "smooth",
        });
      }
      if (isLoading) {
        animationFrameId = requestAnimationFrame(smoothScrollToBottom);
      }
    };

    if (isLoading) {
      animationFrameId = requestAnimationFrame(smoothScrollToBottom);
    }

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [messages, isLoading, isInitialState]);

  useEffect(() => {
    if (!isLoading && messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg?.role === "assistant") {
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    }
  }, [isLoading, messages]);

  /* ---------- SUBMIT ---------- */
  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (!selectedModelId || !input.trim() || isLoading) return;

      if (inputRef.current) inputRef.current.style.height = "56px";

      shouldAutoScrollRef.current = true;
      setIsNewChat(false);

      await submitChat(e, input, setInput);
    },
    [selectedModelId, input, isLoading, submitChat]
  );

  return (
    <div className="flex h-screen bg-[#06060a] text-zinc-100 font-sans overflow-hidden selection:bg-zinc-700 selection:text-white">
      <style jsx global>{`
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        ::-webkit-scrollbar-thumb {
          background-color: #27272a;
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background-color: #3f3f46;
        }
        * {
          scrollbar-width: thin;
          scrollbar-color: #27272a transparent;
        }
      `}</style>

      <Sidebar
        chatList={chatList}
        chatId={chatId}
        isShiftPressed={isShiftPressed}
        activeMenuId={activeMenuId}
        onNewChat={startNewChat}
        onLoadChat={loadChat}
        onDeleteChat={deleteChat}
        onSettingsOpen={() => setIsSettingsOpen(true)}
        setActiveMenuId={setActiveMenuId}
      />

      <div className="flex-1 flex flex-col relative min-w-0 h-full overflow-hidden">
        <Header
          models={models}
          selectedModelId={selectedModelId}
          defaultModelId={defaultModelId}
          isModelDropdownOpen={isModelDropdownOpen}
          chatList={chatList}
          chatId={chatId}
          isNewChat={isNewChat}
          onModelSelect={handleModelSelect}
          onSetDefaultModel={handleSetDefaultModel}
          onDropdownToggle={setIsModelDropdownOpen}
          modelDropdownRef={modelDropdownRef}
        />

        <ChatMessages
          messages={messages}
          isLoading={isLoading}
          isCursorEnabled={isCursorEnabled}
          isInitialState={isInitialState}
          scrollContainerRef={scrollContainerRef}
          onScroll={handleScroll}
        />

        <ChatInput
          input={input}
          isLoading={isLoading}
          isInitialState={isInitialState}
          isInputFocused={isInputFocused}
          onInputChange={handleInputTextChange}
          onKeyDown={handleKeyDown}
          onKeyUp={handleKeyUp}
          onFocus={() => setIsInputFocused(true)}
          onBlur={() => setIsInputFocused(false)}
          onSubmit={handleSubmit}
          inputRef={inputRef}
        />
      </div>

      <SettingsModal
        isOpen={isSettingsOpen}
        isCursorEnabled={isCursorEnabled}
        onClose={() => setIsSettingsOpen(false)}
        onToggleCursor={toggleCursor}
        onDeleteAllChats={deleteAllChats}
      />
    </div>
  );
}