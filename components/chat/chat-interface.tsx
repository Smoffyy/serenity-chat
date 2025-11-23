"use client";

import React, {
  useEffect,
  useState,
  useRef,
  FormEvent,
  KeyboardEvent,
  useCallback,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, MotionConfig } from "framer-motion";

import type { Message, ChatMetadata, ModelData, AppSettings, Theme } from "./types";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { ChatMessages } from "./ChatMessages";
import { ChatInput } from "./ChatInput";
import { SettingsModal } from "./SettingsModal";
import { useChatHistory } from "./hooks/useChatHistory";
import { useChatSubmit } from "./hooks/useChatSubmit";
import { getTransition } from "./animations";

// Define theme colors using CSS variables
const themeDefinitions: Record<Theme, Record<string, string>> = {
  dark: {
    "--bg-primary": "#06060a",
    "--bg-secondary": "#09090b",
    "--bg-tertiary": "#27272a",
    "--text-primary": "#f4f4f5",
    "--text-secondary": "#a1a1aa",
    "--border-color": "#27272a80",
    "--accent-color": "#ffffff", 
    "--input-bg": "#18181b",
    "--user-msg-bg": "#2f2f2f",
  },
  light: {
    "--bg-primary": "#ffffff",
    "--bg-secondary": "#e5e5e5ff",
    "--bg-tertiary": "#e4e4e7",
    "--text-primary": "#18181b",
    "--text-secondary": "#71717a",
    "--border-color": "#e4e4e7",
    "--accent-color": "#18181b", 
    "--input-bg": "#ffffff",
    "--user-msg-bg": "#f4f4f5",
  },
  chatgpt: {
    "--bg-primary": "#212121", 
    "--bg-secondary": "#181818", 
    "--bg-tertiary": "#303030", 
    "--text-primary": "#ececf1",
    "--text-secondary": "#c5c5d2",
    "--border-color": "#4d4d4f80",
    "--accent-color": "#ffffffff",
    "--input-bg": "#303030",
    "--user-msg-bg": "#303030", 
  },
};

export default function ChatInterface() {
  /* ---------- ROUTER & PARAMS ---------- */
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlChatId = searchParams.get("chat");

  /* ---------- STATE ---------- */
  const [models, setModels] = useState<ModelData[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string>("");
  const [defaultModelId, setDefaultModelId] = useState<string>("");

  const [chatId, setChatId] = useState<string>("");
  const chatIdRef = useRef<string>("");

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [generatingChatId, setGeneratingChatId] = useState<string | null>(null);
  const [chatList, setChatList] = useState<ChatMetadata[]>([]);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [isNewChat, setIsNewChat] = useState(true);
  const [isShiftPressed, setIsShiftPressed] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [isInputFocused, setIsInputFocused] = useState(false);

  // Settings State
  const [settings, setSettings] = useState<AppSettings>({
    theme: "dark",
    animationsEnabled: true,
    animationSpeed: 1.0,
  });

  const isInitialState = messages.length === 0;
  const currentTransition = getTransition(settings.animationsEnabled, settings.animationSpeed);

  /* ---------- REFS ---------- */
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const shouldAutoScrollRef = useRef(true);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const modelDropdownRef = useRef<HTMLDivElement>(null);
  const chatListRef = useRef<HTMLDivElement>(null);

  /* ---------- THEME APPLICATION ---------- */
  useEffect(() => {
    const root = document.documentElement;
    const themeColors = themeDefinitions[settings.theme];
    for (const [key, value] of Object.entries(themeColors)) {
      root.style.setProperty(key, value);
    }
    // Set base styles on body to prevent flashes
    document.body.style.backgroundColor = themeColors["--bg-primary"];
    document.body.style.color = themeColors["--text-primary"];
  }, [settings.theme]);

  /* ---------- SYNC WITH URL ---------- */
  useEffect(() => {
    if (urlChatId) {
      setChatId(urlChatId);
      chatIdRef.current = urlChatId;

      shouldAutoScrollRef.current = true;

      const saved = localStorage.getItem(`chat_${urlChatId}`);
      if (saved) {
        try {
          setMessages(JSON.parse(saved));
          setIsNewChat(false);
        } catch (e) {
          console.error("Error loading chat:", e);
          setMessages([]);
          setIsNewChat(true);
        }
      } else {
        setMessages([]);
        setIsNewChat(true);
      }

      setTimeout(() => inputRef.current?.focus(), 300);
    } else {
      const newChatId = Date.now().toString();
      setChatId(newChatId);
      chatIdRef.current = newChatId;
      setMessages([]);
      setInput("");
      setIsNewChat(true);
      router.push(`?chat=${newChatId}`);
    }
  }, [urlChatId, router]);

  /* ---------- HOOKS ---------- */
  const { getChatMetadata, saveHistory: saveHistoryBase } = useChatHistory(
    chatId,
    selectedModelId
  );

  const { onSubmit: submitChat, onStop: stopChat } = useChatSubmit({
    selectedModelId,
    messages,
    setMessages,
    saveHistory: async (msgs, shouldUpdateDate) => {
      const updatedList = await saveHistoryBase(msgs, shouldUpdateDate);
      setChatList(updatedList || []);
      return updatedList;
    },
    setIsLoading,
    setGeneratingChatId,
    chatIdRef,
  });

  // When URL changes (switching chats), reload messages from storage and check if generating
  useEffect(() => {
    if (urlChatId && urlChatId !== chatId) {
      const saved = localStorage.getItem(`chat_${urlChatId}`);
      if (saved) {
        try {
          setMessages(JSON.parse(saved));
        } catch (e) {
          console.error("Error loading chat:", e);
          setMessages([]);
        }
      }
    }
  }, [urlChatId, chatId, setMessages]);

  /* ---------- SETTINGS HANDLERS ---------- */
  const updateSettings = useCallback((newSettings: Partial<AppSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      localStorage.setItem("app_settings", JSON.stringify(updated));
      return updated;
    });
  }, []);

  /* ---------- CHAT LOGIC ---------- */
  const loadChat = useCallback(
    (id: string, newTab: boolean = false) => {
      if (newTab) {
        window.open(`${window.location.pathname}?chat=${id}`, "_blank");
        return;
      }

      if (messages.length > 0 && chatId !== id && !isNewChat) {
        saveHistoryBase(messages, false);
      }

      setActiveMenuId(null);
      router.push(`?chat=${id}`);
    },
    [messages, chatId, isNewChat, saveHistoryBase, router]
  );

  const startNewChat = useCallback(() => {
    if (messages.length > 0 && !isNewChat) saveHistoryBase(messages, false);

    const newChatId = Date.now().toString();
    setActiveMenuId(null);
    setMessages([]);
    setInput("");
    setIsNewChat(true);
    shouldAutoScrollRef.current = true;

    if (defaultModelId) setSelectedModelId(defaultModelId);

    const newChat: ChatMetadata = {
      id: newChatId,
      title: "New Chat",
      date: Date.now(),
    };
    const updatedList = [newChat, ...(chatList || [])];
    setChatList(updatedList);
    localStorage.setItem("all_chats", JSON.stringify(updatedList));

    router.push(`?chat=${newChatId}`);
    setTimeout(() => inputRef.current?.focus(), 300);
  }, [messages, isNewChat, saveHistoryBase, defaultModelId, router, chatList]);

  const deleteAllChats = useCallback(() => {
    chatList.forEach((c) => localStorage.removeItem(`chat_${c.id}`));

    const newChatId = Date.now().toString();
    const newChat: ChatMetadata = {
      id: newChatId,
      title: "New Chat",
      date: Date.now(),
    };

    localStorage.setItem("all_chats", JSON.stringify([newChat]));
    setChatList([newChat]);

    setActiveMenuId(null);
    setMessages([]);
    setInput("");
    setIsNewChat(true);
    shouldAutoScrollRef.current = true;

    setChatId(newChatId);
    chatIdRef.current = newChatId;

    if (defaultModelId) setSelectedModelId(defaultModelId);

    router.push(`?chat=${newChatId}`);
    setIsSettingsOpen(false);
    setTimeout(() => inputRef.current?.focus(), 300);
  }, [chatList, router, defaultModelId]);

  const deleteChat = useCallback(
    (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      localStorage.removeItem(`chat_${id}`);

      const updatedList = chatList.filter((c) => c.id !== id);
      localStorage.setItem("all_chats", JSON.stringify(updatedList));
      setChatList(updatedList);

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

    // Load Settings
    const savedSettingsStr = localStorage.getItem("app_settings");
    if (savedSettingsStr) {
      try {
        const savedSettings = JSON.parse(savedSettingsStr);
        setSettings((prev) => ({ ...prev, ...savedSettings }));
      } catch (e) {
        console.error("Failed to parse saved settings", e);
      }
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

          setSelectedModelId((prev) => prev || initialModel);
        }
      })
      .catch((err) => console.error("Failed to fetch models", err));
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

    if (shouldAutoScrollRef.current) {
      // Only animate scroll if animations are enabled
      const behavior = isLoading && settings.animationsEnabled ? "smooth" : "auto";
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: behavior,
      });
    }
  }, [messages, isLoading, isInitialState, settings.animationsEnabled]);

  /* ---------- AUTO FOCUS AFTER RESPONSE ---------- */
  useEffect(() => {
    if (!isLoading && messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg?.role === "assistant") {
        setTimeout(() => inputRef.current?.focus(), 50);
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
      setGeneratingChatId(chatId);

      if (messages.length === 0) {
        const newChat: ChatMetadata = {
          id: chatId,
          title: "New Chat",
          date: Date.now(),
        };
        const filtered = (chatList || []).filter((c) => c.id !== chatId);
        const updatedList = [newChat, ...filtered];
        setChatList(updatedList);
        localStorage.setItem("all_chats", JSON.stringify(updatedList));
      }

      await submitChat(e, input, setInput);
    },
    [selectedModelId, input, isLoading, submitChat, chatId, messages, chatList]
  );

  return (
    <div className="flex h-screen font-sans overflow-hidden selection:bg-zinc-700 selection:text-white" style={{
        backgroundColor: 'var(--bg-primary)',
        color: 'var(--text-primary)'
    }}>
      <style jsx global>{`
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        ::-webkit-scrollbar-thumb {
          background-color: var(--bg-tertiary);
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background-color: var(--border-color);
        }
        * {
          scrollbar-width: thin;
          scrollbar-color: var(--bg-tertiary) transparent;
        }
      `}</style>

      {/* Provide global motion config based on settings */}
      <MotionConfig transition={currentTransition}>
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
          animationsEnabled={settings.animationsEnabled}
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
            animationsEnabled={settings.animationsEnabled}
          />

          <ChatMessages
            messages={messages}
            isLoading={isLoading}
            isInitialState={isInitialState}
            scrollContainerRef={scrollContainerRef}
            onScroll={handleScroll}
            animationsEnabled={settings.animationsEnabled}
          />

          <ChatInput
            input={input}
            isLoading={isLoading && generatingChatId === chatId}
            isInitialState={isInitialState}
            isInputFocused={isInputFocused}
            onInputChange={handleInputTextChange}
            onKeyDown={handleKeyDown}
            onKeyUp={handleKeyUp}
            onFocus={() => setIsInputFocused(true)}
            onBlur={() => setIsInputFocused(false)}
            onSubmit={handleSubmit}
            onStop={stopChat}
            inputRef={inputRef}
            animationsEnabled={settings.animationsEnabled}
          />
        </div>

        <SettingsModal
          isOpen={isSettingsOpen}
          settings={settings}
          onClose={() => setIsSettingsOpen(false)}
          onUpdateSettings={updateSettings}
          onDeleteAllChats={deleteAllChats}
          transition={currentTransition}
        />
      </MotionConfig>
    </div>
  );
}