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

import type { Message, ChatMetadata, ModelData } from "./types";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { ChatMessages } from "./ChatMessages";
import { ChatInput } from "./ChatInput";
import { SettingsModal } from "./SettingsModal";
import { useChatHistory } from "./hooks/useChatHistory";
import { useChatSubmit } from "./hooks/useChatSubmit";

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
  // Ref to track the active chat ID instantly for async operations
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
  const [isCursorEnabled, setIsCursorEnabled] = useState(false);

  const isInitialState = messages.length === 0;

  /* ---------- REFS ---------- */
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const shouldAutoScrollRef = useRef(true);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const modelDropdownRef = useRef<HTMLDivElement>(null);
  const chatListRef = useRef<HTMLDivElement>(null);

  /* ---------- SYNC WITH URL ---------- */
  useEffect(() => {
    if (urlChatId) {
      setChatId(urlChatId);
      chatIdRef.current = urlChatId; // Update ref immediately
      
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

      // Reset input focus
      setTimeout(() => inputRef.current?.focus(), 300);
    } else {
      // No chat in URL, create new chat
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
  const { getChatMetadata, saveHistory: saveHistoryBase } = useChatHistory(chatId);

  // Pass the ref to useChatSubmit so it knows the LIVE status of the UI
  const { onSubmit: submitChat } = useChatSubmit({
    selectedModelId,
    messages,
    setMessages,
    saveHistory: (msgs, shouldUpdateDate) => {
      const updatedList = saveHistoryBase(msgs, shouldUpdateDate);
      setChatList(updatedList || []);
    },
    setIsLoading,
    setGeneratingChatId,
    chatIdRef, // Passing the Ref instead of just the value
  });

  /* ---------- SETTINGS ---------- */
  const toggleCursor = () => {
    const newState = !isCursorEnabled;
    setIsCursorEnabled(newState);
    localStorage.setItem("cursor_enabled", String(newState));
  };

  /* ---------- CHAT LOGIC ---------- */
  const loadChat = useCallback(
    (id: string, newTab: boolean = false) => {
      if (newTab) {
        window.open(`${window.location.pathname}?chat=${id}`, "_blank");
        return;
      }

      // Save current chat before switching if needed
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
    
    router.push(`?chat=${newChatId}`);
    setTimeout(() => inputRef.current?.focus(), 300);
  }, [messages, isNewChat, saveHistoryBase, defaultModelId, router]);

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

      // If deleting current chat, go to new chat
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
        // Pass the event as React.FormEvent since it's compatible for our usage
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

    // Fetch models
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
          
          // Only set if not already set (prevents overwriting user selection on re-mounts)
          setSelectedModelId((prev) => prev || initialModel);
        }
      })
      .catch(err => console.error("Failed to fetch models", err));
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

    // If auto-scroll is enabled, snap to bottom on new messages
    if (shouldAutoScrollRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: isLoading ? "smooth" : "auto",
      });
    }
  }, [messages, isLoading, isInitialState]); // Trigger on message updates

  /* ---------- AUTO FOCUS AFTER RESPONSE ---------- */
  useEffect(() => {
    if (!isLoading && messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg?.role === "assistant") {
        // Small delay to ensure DOM is ready
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

      await submitChat(e, input, setInput);
    },
    [selectedModelId, input, isLoading, submitChat, chatId]
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