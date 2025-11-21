"use client";

import React, {
  useEffect,
  useState,
  useRef,
  FormEvent,
  KeyboardEvent,
  useCallback,
  memo, // Import memo
} from "react";
import { MessageBubble } from "./message-bubble";
import {
  Send,
  Plus,
  ChevronDown,
  Loader2,
  User,
  Settings,
  X,
  Check,
  Star,
  Trash2,
  MoreVertical,
  Zap,
  Terminal,
} from "lucide-react";
import {
  motion,
  AnimatePresence,
  type Transition,
  type Variants,
  LayoutGroup,
} from "framer-motion";
import { cn } from "@/lib/utils";

/* ---------- TYPES ---------- */
interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface ChatMetadata {
  id: string;
  title: string;
  date: number;
}

interface ModelData {
  id: string;
}

/* ---------- ANIMATION CONSTANTS ---------- */
const spring: Transition = {
  type: "spring",
  stiffness: 400,
  damping: 20,
};

const layoutSpring: Transition = {
  type: "spring",
  stiffness: 300,
  damping: 30,
  mass: 1.2,
};

/* ---------- MEMOIZED COMPONENTS ---------- */

/**
 * Performance optimization: Memoize the MessageBubble.
 * This prevents all previous messages from re-rendering when you type in the input box.
 */
const MemoizedMessageBubble = memo(MessageBubble, (prev, next) => {
  return (
    prev.content === next.content &&
    prev.role === next.role &&
    prev.showCursor === next.showCursor
  );
});

const TypingCursor = () => (
  <motion.span
    aria-hidden="true"
    className="inline-block w-[10px] h-4 ml-0.5 bg-white align-middle translate-y-[0px]"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{
      duration: 0.5,
      repeat: Infinity,
      repeatType: "reverse" as const,
      ease: "easeInOut",
    }}
  />
);

const BouncingLoader = () => {
  const dotTransition = {
    duration: 0.6,
    repeat: Infinity,
    ease: "easeInOut",
  };

  return (
    <div className="flex items-center gap-1.5 h-5 px-1">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-2 h-2 bg-zinc-500 rounded-full"
          animate={{
            y: ["0%", "-50%", "0%"],
            opacity: [0.4, 1, 0.4],
          }}
          transition={{
            ...dotTransition,
            delay: i * 0.15,
          }}
        />
      ))}
    </div>
  );
};

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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [lastAssistantMessage, setLastAssistantMessage] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [hasCodeBlock, setHasCodeBlock] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [showCopyButton, setShowCopyButton] = useState(false);

  const [isCursorEnabled, setIsCursorEnabled] = useState(false);

  const isInitialState = messages.length === 0;

  /* ---------- REFS ---------- */
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const shouldAutoScrollRef = useRef(true);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const modelDropdownRef = useRef<HTMLDivElement>(null);
  const chatListRef = useRef<HTMLDivElement>(null);

  /* ---------- HELPERS ---------- */
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
      setChatList(sortedList);
    },
    [chatId, getChatMetadata]
  );

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
        saveHistory(messages, false);
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
    [messages, saveHistory, chatId, isNewChat]
  );

  const startNewChat = () => {
    if (messages.length > 0 && !isNewChat) saveHistory(messages, false);

    setActiveMenuId(null);
    setChatId(Date.now().toString());
    setMessages([]);
    setInput("");
    setIsNewChat(true);
    setLastAssistantMessage("");
    setShowCopyButton(false);
    setHasCodeBlock(false);
    shouldAutoScrollRef.current = true;
    if (defaultModelId) setSelectedModelId(defaultModelId);
    setTimeout(() => inputRef.current?.focus(), 300);
  };

  const deleteAllChats = () => {
    chatList.forEach((c) => localStorage.removeItem(`chat_${c.id}`));
    localStorage.setItem("all_chats", "[]");
    setChatList([]);
    startNewChat();
    setIsSettingsOpen(false);
  };

  const deleteChat = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    localStorage.removeItem(`chat_${id}`);

    const updatedList = chatList.filter((c) => c.id !== id);
    localStorage.setItem("all_chats", JSON.stringify(updatedList));
    setChatList(updatedList);

    if (chatId === id) startNewChat();
  };

  const handleSetDefaultModel = (e: React.MouseEvent, modelId: string) => {
    e.stopPropagation();
    const newDefault = defaultModelId === modelId ? "" : modelId;
    setDefaultModelId(newDefault);
    localStorage.setItem("default_model", newDefault);
  };

  const handleModelSelect = (modelId: string) => {
    setSelectedModelId(modelId);
    setTimeout(() => setIsModelDropdownOpen(false), 150);
  };

  /* ---------- INPUT HANDLERS ---------- */
  const handleInputTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const el = e.currentTarget;
    setInput(el.value);

    el.style.height = "auto";
    const scrollHeight = el.scrollHeight;
    const minH = isInitialState ? 48 : 56;
    const newHeight = Math.min(Math.max(scrollHeight, minH), 200);
    el.style.height = `${newHeight}px`;
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit(e as unknown as FormEvent);
    }
  };
  const handleKeyUp = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Shift") setIsShiftPressed(false);
  };

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
    } else {
      setIsCursorEnabled(false);
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
  const handleScroll = () => {
    if (!scrollContainerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    
    // Increased threshold to 75px as requested
    const isAtBottom = distanceFromBottom <= 75;

    shouldAutoScrollRef.current = isAtBottom;
  };

  useEffect(() => {
    if (isInitialState || !scrollContainerRef.current) return;

    // If we are not loading, just do a one-off smooth scroll if needed (e.g. initial load)
    if (!isLoading && shouldAutoScrollRef.current) {
       scrollContainerRef.current.scrollTo({
          top: scrollContainerRef.current.scrollHeight,
          behavior: "smooth",
       });
    }

    // If we ARE loading, we use requestAnimationFrame to smooth out the jitter
    // caused by rapid state updates.
    let animationFrameId: number;

    const smoothScrollToBottom = () => {
      if (shouldAutoScrollRef.current && scrollContainerRef.current) {
        // We use "smooth" behavior here but driven by rAF loop to ensure
        // it catches up gracefully without snapping back and forth.
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

    // Logic to show copy button
    const lastMsg = messages[messages.length - 1];
    if (lastMsg && lastMsg.role === "assistant" && lastMsg.content.length > 0) {
      setLastAssistantMessage(lastMsg.content);
      const hasCode = /```[\s\S]*?```/.test(lastMsg.content);
      setHasCodeBlock(hasCode);
      setShowCopyButton(!isLoading && lastMsg.content.length > 10);
    } else {
      setShowCopyButton(false);
      if (!lastMsg || lastMsg.role !== "assistant") {
        setLastAssistantMessage("");
        setHasCodeBlock(false);
      }
    }

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [messages, isLoading, isInitialState]);

  /* ---------- SUBMIT ---------- */
  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedModelId || !input.trim() || isLoading) return;

    const userText = input.trim();

    if (inputRef.current) inputRef.current.style.height = "56px";
    setInput("");

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: userText,
    };

    shouldAutoScrollRef.current = true;

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);
    setIsNewChat(false);

    const aiMsgId = `${Date.now() + 1}`;
    const aiMsgPlaceholder: Message = {
      id: aiMsgId,
      role: "assistant",
      content: "",
    };

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

      const finalMsg = { ...aiMsgPlaceholder, content: rawAccumulated };
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
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const currentModelName =
    models.find((m) => m.id === selectedModelId)?.id || "Select Model";

  const inputGlowVariants: Variants = {
    initial: { opacity: 0, scale: 0.98 },
    focused: {
      opacity: 1,
      scale: 1.02,
      transition: {
        duration: 0.8,
        repeat: Infinity,
        repeatType: "reverse" as const,
        ease: "easeInOut",
      },
    },
    hover: { opacity: 0.8, scale: 1.01, transition: { duration: 0.2 } },
    unfocused: { opacity: 0, scale: 0.98, transition: { duration: 0.3 } },
  };

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

      {/* Sidebar */}
      <motion.div
        initial={{ x: -260 }}
        animate={{ x: 0 }}
        transition={spring}
        className="w-[260px] bg-[#09090b] border-r border-zinc-800/50 flex flex-col flex-shrink-0 select-none relative z-20"
      >
        <div className="p-3">
          <motion.button
            whileHover={{
              scale: 1.01,
              boxShadow: "0 4px 10px rgba(0,0,0,.3)",
            }}
            whileTap={{ scale: 0.98 }}
            transition={spring}
            onClick={startNewChat}
            className="flex items-center gap-2 w-full px-3 py-2 bg-zinc-900 text-zinc-200 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-sm font-semibold transition-colors shadow-lg shadow-zinc-900/20"
          >
            <Plus size={16} className="text-zinc-400" /> Start New Chat
          </motion.button>
        </div>

        <div
          ref={chatListRef}
          className="flex-1 overflow-y-auto px-3 py-2 space-y-1"
        >
          <div className="text-[11px] font-medium text-zinc-500 px-2 mb-2 uppercase tracking-wider">
            History
          </div>

          <AnimatePresence initial={false}>
            {chatList.map((chat) => (
              <motion.div
                key={chat.id}
                initial={{ opacity: 0, height: 0, y: -10 }}
                animate={{ opacity: 1, height: "auto", y: 0 }}
                exit={{
                  opacity: 0,
                  height: 0,
                  transition: { duration: 0.2 },
                }}
                transition={{ ...spring, duration: 0.3, type: "tween" }}
                className={cn(
                  "group relative rounded-xl text-sm transition-all flex items-center justify-between",
                  chat.id === chatId
                    ? "bg-zinc-800/50 text-zinc-100 font-medium border border-zinc-700"
                    : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
                )}
              >
                <motion.button
                  whileHover={{ x: 2 }}
                  onClick={() => loadChat(chat.id)}
                  className="flex-1 text-left truncate px-3 py-2 cursor-pointer pr-10"
                >
                  {chat.title}
                </motion.button>

                <div
                  className={cn(
                    "absolute right-2 top-1/2 -translate-y-1/2 transition-opacity duration-150 flex items-center gap-1 z-10",
                    chat.id === chatId ||
                      activeMenuId === chat.id ||
                      (isShiftPressed && chat.id !== chatId)
                      ? "opacity-100"
                      : "opacity-0 group-hover:opacity-100"
                  )}
                  onClick={(e) => e.stopPropagation()}
                >
                  {isShiftPressed && chat.id !== chatId && (
                    <motion.button
                      initial={{ scale: 0.5, rotate: -45 }}
                      animate={{ scale: 1, rotate: 0 }}
                      exit={{ scale: 0.5, rotate: 45 }}
                      transition={spring}
                      onClick={(e) => deleteChat(e, chat.id)}
                      className="p-1.5 rounded-full text-red-400 bg-zinc-700/80 hover:bg-zinc-600 transition-colors"
                      title="Quick Delete (Shift + Click)"
                      whileTap={{ scale: 0.8 }}
                    >
                      <Trash2 size={14} />
                    </motion.button>
                  )}

                  <motion.button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveMenuId(
                        activeMenuId === chat.id ? null : chat.id
                      );
                    }}
                    className={cn(
                      "p-1.5 rounded-full transition-colors",
                      activeMenuId === chat.id
                        ? "bg-zinc-700 text-zinc-300"
                        : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700/50",
                      isShiftPressed && chat.id !== chatId ? "hidden" : ""
                    )}
                    title="More options"
                    whileTap={{ scale: 0.8 }}
                  >
                    <MoreVertical size={14} />
                  </motion.button>
                </div>

                <AnimatePresence>
                  {activeMenuId === chat.id && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9, y: 5 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9, y: 5 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-2 top-full mt-1 w-32 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl text-left text-zinc-300 z-50"
                      style={{ transformOrigin: "top right" }}
                    >
                      <motion.button
                        whileHover={{ backgroundColor: "#27272a" }}
                        whileTap={{ scale: 0.95 }}
                        onClick={(e) => {
                          deleteChat(e, chat.id);
                          setActiveMenuId(null);
                        }}
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-400 hover:bg-zinc-800 rounded-md"
                      >
                        <Trash2 size={14} /> Delete
                      </motion.button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <div className="p-3 border-t border-zinc-800/50">
          <motion.button
            whileHover={{ backgroundColor: "#27272a", x: 2 }}
            whileTap={{ scale: 0.98 }}
            transition={spring}
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center gap-3 px-2 py-2 w-full rounded-xl hover:bg-zinc-800/50 text-zinc-400 hover:text-zinc-200 transition-all"
          >
            <div className="w-6 h-6 rounded-lg bg-zinc-700 flex items-center justify-center border border-zinc-600">
              <User size={14} className="text-zinc-300" />
            </div>
            <span className="text-sm font-medium">User</span>
            <Settings size={14} className="ml-auto" />
          </motion.button>
        </div>
      </motion.div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative min-w-0 h-full overflow-hidden">
        <header className="flex-none sticky top-0 left-0 right-0 h-14 flex items-center justify-between px-4 z-30 bg-[#06060a]/90 backdrop-blur-md select-none border-b border-zinc-800/50">
          <div ref={modelDropdownRef} className="relative z-40">
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 shadow-xl",
                isModelDropdownOpen
                  ? "bg-zinc-700 text-white ring-2 ring-zinc-500/50"
                  : "bg-zinc-900 border border-zinc-700/50 text-zinc-300 hover:bg-zinc-800 hover:border-zinc-600"
              )}
            >
              <Zap size={14} className="text-zinc-300" />
              <span className="truncate max-w-[150px]">
                {currentModelName}
              </span>
              <motion.div
                animate={{ rotate: isModelDropdownOpen ? 180 : 0 }}
                transition={spring}
              >
                <ChevronDown size={14} />
              </motion.div>
            </motion.button>

            <AnimatePresence>
              {isModelDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={spring}
                  style={{ transformOrigin: "top left" }}
                  className="absolute left-0 mt-2 w-72 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl p-1 max-h-80 overflow-y-auto"
                >
                  {models.map((m) => (
                    <motion.div
                      key={m.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{
                        duration: 0.1,
                        delay: models.indexOf(m) * 0.05,
                      }}
                      className={cn(
                        "flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-colors group/model",
                        m.id === selectedModelId
                          ? "bg-zinc-800/50 text-zinc-100 font-medium"
                          : "text-zinc-400 hover:bg-zinc-800/70 hover:text-zinc-200"
                      )}
                    >
                      <motion.button
                        whileHover={{ x: 2 }}
                        onClick={() => handleModelSelect(m.id)}
                        className="flex-1 text-left truncate cursor-pointer"
                      >
                        {m.id}
                      </motion.button>

                      <div className="flex items-center gap-2">
                        <motion.button
                          onClick={(e) => handleSetDefaultModel(e, m.id)}
                          className={cn(
                            "p-1 rounded-full transition-colors",
                            m.id === defaultModelId
                              ? "text-yellow-400 hover:text-yellow-300"
                              : "text-zinc-600 hover:text-zinc-400 opacity-0 group-hover/model:opacity-100"
                          )}
                          whileTap={{ scale: 0.9 }}
                        >
                          <Star
                            size={14}
                            fill={
                              m.id === defaultModelId ? "currentColor" : "none"
                            }
                          />
                        </motion.button>

                        {m.id === selectedModelId && (
                          <motion.div
                            initial={{ scale: 0.5, opacity: 0, rotate: -90 }}
                            animate={{ scale: 1, opacity: 1, rotate: 0 }}
                            transition={spring}
                          >
                            <Check size={16} className="text-zinc-300" />
                          </motion.div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="text-sm text-zinc-500 hidden sm:block">
            {isNewChat
              ? "New Chat"
              : chatList.find((c) => c.id === chatId)?.title || "..."}
          </div>
        </header>

        <LayoutGroup>
          <div
            className={cn(
              "flex-1 flex flex-col relative z-10 transition-all duration-500 ease-in-out overflow-hidden",
              isInitialState
                ? "justify-center items-center"
                : "justify-end"
            )}
          >
            {/* Messages List */}
            <div
              ref={scrollContainerRef}
              onScroll={handleScroll}
              className={cn(
                "w-full overflow-y-auto", // Removed "scroll-smooth" to allow JS to handle smooth scrolling without conflict
                isInitialState
                  ? "hidden h-0"
                  : "flex-1 min-h-0 pt-4 pb-4"
              )}
            >
              <div className="max-w-4xl mx-auto px-4">
                <AnimatePresence initial={false}>
                  {messages.map((m) => (
                    <MemoizedMessageBubble
                      key={m.id}
                      {...m}
                      showCursor={
                        isLoading &&
                        isCursorEnabled &&
                        m.id === messages[messages.length - 1]?.id &&
                        m.role === "assistant"
                      }
                    />
                  ))}
                </AnimatePresence>

                {isLoading &&
                  messages.length > 0 &&
                  messages[messages.length - 1]?.role === "user" && (
                    <div className="flex justify-start w-full py-2">
                      {isCursorEnabled ? (
                        <div className="bg-zinc-1000 text-zinc-100 px-5 py-3 rounded-[24px] rounded-tl-sm shadow-lg text-[16px]">
                          <motion.span
                            className="text-zinc-500"
                            initial={{ scale: 0.95 }}
                            animate={{ scale: 1.05 }}
                            transition={{
                              duration: 1,
                              repeat: Infinity,
                              repeatType: "reverse",
                            }}
                          />
                          <TypingCursor />
                        </div>
                      ) : (
                        <div className="px-4 py-2">
                          <BouncingLoader />
                        </div>
                      )}
                    </div>
                  )}

                <div className="h-4" />
              </div>
            </div>

            {/* Initial State Branding */}
            <AnimatePresence>
              {isInitialState && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20, transition: { duration: 0.3 } }}
                  className="flex flex-col items-center justify-center mb-8 z-10"
                >
                  <div className="w-16 h-16 rounded-3xl bg-zinc-800/50 flex items-center justify-center mb-4 shadow-2xl border border-zinc-700/70 backdrop-blur-sm">
                    <Terminal size={32} className="text-zinc-100" />
                  </div>
                  <h2 className="text-2xl font-semibold text-zinc-100">
                    Hello! How can I help you?
                  </h2>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Input Area */}
            <motion.div
              layout
              transition={layoutSpring}
              className={cn(
                "bg-[#06060a] select-none w-full z-20",
                isInitialState
                  ? "p-4 max-w-3xl"
                  : "p-6 pt-2 border-t border-zinc-800/50"
              )}
            >
              <div
                className={cn(
                  "mx-auto relative group transition-all",
                  isInitialState ? "max-w-3xl" : "max-w-4xl"
                )}
              >
                <motion.div
                  className="absolute inset-0 bg-zinc-500/20 rounded-[28px] blur-xl"
                  variants={inputGlowVariants}
                  initial="unfocused"
                  animate={
                    isLoading
                      ? "focused"
                      : isInputFocused
                      ? "focused"
                      : "unfocused"
                  }
                />

                <form
                  onSubmit={onSubmit}
                  className={cn(
                    "relative flex flex-col bg-zinc-900 border rounded-[28px] shadow-2xl transition-all overflow-hidden",
                    isLoading
                      ? "border-zinc-500/50 ring-2 ring-zinc-500/50 opacity-90"
                      : isInputFocused
                      ? "border-zinc-500/50 ring-2 ring-zinc-500/50"
                      : "border-zinc-700/50",
                    isInitialState ? "min-h-[48px]" : "min-h-[56px]"
                  )}
                >
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={handleInputTextChange}
                    onKeyDown={handleKeyDown}
                    onKeyUp={handleKeyUp}
                    placeholder={
                      isLoading
                        ? "Generating response..."
                        : isInitialState
                        ? "How can I help you today?"
                        : "Message..."
                    }
                    rows={1}
                    wrap="off"
                    className={cn(
                      "w-full bg-transparent text-zinc-100 placeholder:text-zinc-500 text-base focus:outline-none max-h-[200px] overflow-hidden leading-relaxed max-w-full transition-all",
                      isInitialState
                        ? "px-4 py-3 min-h-[48px]"
                        : "px-5 py-4 min-h-[56px]"
                    )}
                    style={{
                      resize: "none",
                      overflowX: "hidden",
                      overflowY: "auto",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                    }}
                    disabled={isLoading}
                  />
                  <div
                    className={cn(
                      "flex justify-end items-center transition-all",
                      isInitialState ? "px-2 pb-2 pt-0" : "px-3 pb-3 pt-1"
                    )}
                  >
                    <motion.button
                      type="submit"
                      disabled={isLoading || !input.trim()}
                      className={cn(
                        "p-2 rounded-full transition-all duration-200",
                        input.trim()
                          ? "bg-zinc-100 text-zinc-900 hover:bg-white shadow-md shadow-zinc-500/30"
                          : "bg-zinc-700 text-zinc-500 cursor-not-allowed",
                        isInitialState ? "mb-0" : "mb-0.5"
                      )}
                      whileTap={
                        !isLoading && input.trim()
                          ? { scale: 0.85, rotate: 10 }
                          : {}
                      }
                      transition={spring}
                    >
                      {isLoading ? (
                        <Loader2
                          size={16}
                          className="animate-spin"
                          strokeWidth={2.5}
                        />
                      ) : (
                        <Send size={16} strokeWidth={2.5} />
                      )}
                    </motion.button>
                  </div>
                </form>

                <div
                  className={cn(
                    "text-center transition-all",
                    isInitialState ? "mt-4" : "mt-3"
                  )}
                >
                  <p className="text-[11px] text-zinc-600">
                    AI can make mistakes. Please use responsibly.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </LayoutGroup>
      </div>

      <AnimatePresence>
        {isSettingsOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center backdrop-blur-sm"
            onClick={() => setIsSettingsOpen(false)}
            style={{ userSelect: "none" }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: -50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: -50 }}
              transition={spring}
              className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl w-full max-w-md shadow-2xl select-none relative z-60"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
                  <Settings size={20} className="text-zinc-300" />
                </h2>
                <motion.button
                  className="text-zinc-500 hover:text-zinc-300 p-1 rounded-full hover:bg-zinc-800"
                  onClick={() => setIsSettingsOpen(false)}
                  whileTap={{ scale: 0.9 }}
                >
                  <X size={20} />
                </motion.button>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="flex items-center justify-between p-4 bg-zinc-800/30 border border-zinc-700/50 rounded-xl mb-4"
              >
                <div className="flex flex-col">
                  <span className="text-sm text-zinc-300 font-medium">
                    Streaming Cursor
                  </span>
                  <span className="text-[11px] text-zinc-500 mt-0.5">
                    Show a blinking cursor while generating response.
                  </span>
                </div>

                <motion.button
                  onClick={toggleCursor}
                  className={cn(
                    "w-11 h-6 rounded-full p-1 flex items-center transition-colors shadow-inner",
                    isCursorEnabled ? "bg-zinc-100" : "bg-zinc-700"
                  )}
                  whileTap={{ scale: 0.9 }}
                >
                  <motion.div
                    className={cn(
                      "w-4 h-4 rounded-full shadow-sm",
                      isCursorEnabled ? "bg-zinc-900" : "bg-zinc-400"
                    )}
                    animate={{ x: isCursorEnabled ? 20 : 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                </motion.button>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="p-4 bg-red-900/20 border border-red-700/50 rounded-xl flex items-center justify-between"
              >
                <span className="text-sm text-red-400 font-medium">
                  Clear all chat history from local storage.
                </span>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={deleteAllChats}
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-colors shadow-lg shadow-red-600/30"
                >
                  <Trash2 size={14} className="inline-block mr-1" /> Delete All
                </motion.button>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}