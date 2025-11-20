"use client";

import { useEffect, useState, useRef, FormEvent, useCallback, KeyboardEvent } from 'react';
import { MessageBubble } from './message-bubble';
import { Send, Plus, ChevronDown, Terminal, Loader2, User, Settings, X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  role: 'user' | 'assistant';
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

export default function ChatInterface() {
  const [models, setModels] = useState<ModelData[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string>('');
  const [chatId, setChatId] = useState<string>(() => Date.now().toString());
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chatList, setChatList] = useState<ChatMetadata[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false); // NEW: State for dropdown
  const [isNewChat, setIsNewChat] = useState(true); // FIX: Tracks if the current chat has ever been saved

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const modelDropdownRef = useRef<HTMLDivElement>(null); // NEW: Ref for dropdown

  // --- Utility Functions ---

  const getChatMetadata = useCallback((): ChatMetadata[] => {
    try {
      const list = JSON.parse(localStorage.getItem('all_chats') || '[]') as ChatMetadata[];
      // Sort by date descending
      return list.sort((a, b) => b.date - a.date);
    } catch {
      return [];
    }
  }, []);

  const saveHistory = useCallback(
    (currentMessages: Message[], shouldUpdateDate: boolean = false) => { // FIX: Added shouldUpdateDate
      localStorage.setItem(`chat_${chatId}`, JSON.stringify(currentMessages));

      const currentList = getChatMetadata();
      const existingIndex = currentList.findIndex((c) => c.id === chatId);

      let title = 'New Chat';
      let date = Date.now();

      if (existingIndex > -1) {
        title = currentList[existingIndex].title;
        // FIX: Only update the date if shouldUpdateDate is true (i.e., new message sent)
        date = shouldUpdateDate ? Date.now() : currentList[existingIndex].date;
      } else if (currentMessages.length > 0) {
        const firstUserMsg = currentMessages.find((m) => m.role === 'user');
        if (firstUserMsg) {
          const txt = firstUserMsg.content.trim();
          title = txt.length > 30 ? txt.slice(0, 30) + '...' : txt;
        }
      }

      const newMeta: ChatMetadata = { id: chatId, title, date };

      if (existingIndex > -1) {
        currentList[existingIndex] = newMeta;
      } else {
        currentList.unshift(newMeta);
      }
      
      const sortedList = currentList.sort((a, b) => b.date - a.date);
      localStorage.setItem('all_chats', JSON.stringify(sortedList));
      setChatList(sortedList);
    },
    [chatId, getChatMetadata]
  );

  const loadChat = useCallback(
    (id: string) => {
      // FIX: Save the current chat, but only update the date if a new message was sent
      if (messages.length > 0 && chatId !== id && !isNewChat) {
          saveHistory(messages, false); 
      }

      setChatId(id);
      setMessages([]);
      setInput('');

      const saved = localStorage.getItem(`chat_${id}`);
      if (saved) {
        try {
          setMessages(JSON.parse(saved));
          setIsNewChat(false); // Mark as existing chat
        } catch (e) {
          console.error(e);
          setIsNewChat(true); 
        }
      } else {
          setIsNewChat(true); // Mark as new chat if nothing loaded
      }

      setTimeout(() => inputRef.current?.focus(), 0);
    },
    [messages, saveHistory, chatId, isNewChat]
  );

  const startNewChat = () => {
    // FIX: Save the current chat's state if it has content, but DO NOT update the date.
    if (messages.length > 0 && !isNewChat) saveHistory(messages, false);

    setChatId(Date.now().toString());
    setMessages([]);
    setInput('');
    setIsNewChat(true); // Mark as new chat
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const deleteAllChats = () => {
    chatList.forEach((c) => localStorage.removeItem(`chat_${c.id}`));
    localStorage.setItem('all_chats', '[]');
    setChatList([]);
    startNewChat();
    setIsSettingsOpen(false);
  };

  const handleModelSelect = (modelId: string) => {
    setSelectedModelId(modelId);
    setTimeout(() => {
        setIsModelDropdownOpen(false);
    }, 150);
  };

  const handleInputResize = useCallback((e: React.FormEvent<HTMLTextAreaElement>) => {
    const el = e.currentTarget as HTMLTextAreaElement;
    el.style.height = 'auto';
    const scrollHeight = el.scrollHeight;
    const newHeight = Math.min(Math.max(scrollHeight, 56), 200);
    el.style.height = `${newHeight}px`;
  }, []);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSubmit(e as unknown as FormEvent);
    }
  };

  // --- Effects ---

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.resize = 'none';
      inputRef.current.style.overflow = 'hidden';
    }
  }, []);
  
  // NEW: Click outside handler for model dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(event.target as Node)) {
        setIsModelDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    setChatList(getChatMetadata());

    fetch('/api/models')
      .then((res) => res.json())
      .then((data) => {
        if (data.data?.length) {
          setModels(data.data);
          if (!selectedModelId) setSelectedModelId(data.data[0].id);
        }
      });
  }, []);

  // SCROLLING FIX: Conditional smooth/instant scroll
  useEffect(() => {
    if (!messagesEndRef.current) return;
    
    // If loading/streaming, use 'instant' scroll to prevent stuttering.
    // Otherwise, use 'smooth' scroll for a pleasant effect.
    const scrollBehavior = isLoading ? 'instant' : 'smooth';

    messagesEndRef.current.scrollIntoView({ behavior: scrollBehavior });
    
  }, [messages, isLoading]);

  // --- Submission Logic ---

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedModelId || !input.trim() || isLoading) return;

    const userText = input.trim();

    if (inputRef.current) {
      inputRef.current.style.height = '56px';
    }

    setInput('');

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userText,
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setIsLoading(true);

    const aiMsgId = (Date.now() + 1).toString();
    const aiMsg: Message = { id: aiMsgId, role: 'assistant', content: '' };

    setMessages((prev) => [...prev, aiMsg]);
    setIsNewChat(false); // Mark as saved/active

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
          model: selectedModelId,
        }),
      });

      if (!response.ok) throw new Error('Connection failed');
      if (!response.body) throw new Error('No stream');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      let rawAccumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        rawAccumulated += chunk;

        setMessages((prev) =>
          prev.map((m) => (m.id === aiMsgId ? { ...m, content: rawAccumulated } : m))
        );
      }

      const finalMsg = { ...aiMsg, content: rawAccumulated };
      const finalHistory = [...newMessages.filter(m => m.id !== userMsg.id), userMsg, finalMsg]; // Re-arrange in case of race condition

      setMessages(finalHistory);
      saveHistory(finalHistory, true); // FIX: Update date because a new message was sent
    } catch (err) {
      console.error(err);
      setMessages((prev) => prev.filter((m) => m.id !== aiMsgId && m.id !== userMsg.id));
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  };

  return (
    <div 
      className="flex h-screen bg-[#09090b] text-zinc-100 font-sans overflow-hidden selection:bg-zinc-800 selection:text-white"
      style={{
        userSelect: 'none',
        WebkitUserSelect: 'none',
        MozUserSelect: 'none',
        msUserSelect: 'none',
        WebkitUserDrag: 'none',
        userDrag: 'none'
      }}
    >
      <motion.div
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="w-[260px] bg-[#09090b] border-r border-zinc-800/50 flex flex-col flex-shrink-0"
        style={{
          userSelect: 'none',
          WebkitUserSelect: 'none',
          flexShrink: 0,
          position: 'relative'
        }}
        draggable={false}
      >
        <div className="p-3 select-none">
          <button
            onClick={startNewChat}
            className="flex items-center gap-2 w-full px-3 py-2 bg-zinc-100 text-zinc-900 hover:bg-zinc-200 rounded-lg text-sm font-medium transition-colors select-none"
            draggable={false}
          >
            <Plus size={16} /> New Chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1 scrollbar-thin scrollbar-thumb-zinc-800 select-none">
          <div className="text-[11px] font-medium text-zinc-500 px-2 mb-2 uppercase tracking-wider select-none">History</div>

          {chatList.map((chat) => (
            <div
              key={chat.id}
              onClick={() => loadChat(chat.id)}
              className={cn(
                'px-3 py-2 rounded-lg text-sm truncate cursor-pointer transition-all select-none',
                chat.id === chatId
                  ? 'bg-zinc-800 text-zinc-100'
                  : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
              )}
              draggable={false}
            >
              {chat.title}
            </div>
          ))}
        </div>

        <div className="p-3 border-t border-zinc-800/50 select-none">
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center gap-3 px-2 py-2 w-full rounded-lg hover:bg-zinc-800/50 text-zinc-400 hover:text-zinc-200 transition-all select-none"
            draggable={false}
          >
            <div className="w-6 h-6 rounded bg-zinc-700 flex items-center justify-center">
              <User size={14} />
            </div>
            <span className="text-sm font-medium">User</span>
            <Settings size={14} className="ml-auto" />
          </button>
        </div>
      </motion.div>

      <div className="flex-1 flex flex-col relative min-w-0">
        <header className="absolute top-0 left-0 right-0 h-14 flex items-center justify-between px-4 z-20 bg-[#09090b]/80 backdrop-blur-sm">
          {/* NEW: Custom Animated Model Dropdown */}
          <div ref={modelDropdownRef} className="relative z-30">
            <button
              onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200",
                isModelDropdownOpen 
                  ? "bg-zinc-800 text-zinc-200" 
                  : "bg-zinc-900 border border-zinc-700/50 text-zinc-400 hover:bg-zinc-800 hover:border-zinc-700"
              )}
            >
              <span className="truncate max-w-[150px]">
                {models.find((m) => m.id === selectedModelId)?.id || 'Select Model'}
              </span>
              <ChevronDown size={14} className={cn("transition-transform", isModelDropdownOpen ? "rotate-180" : "rotate-0")} />
            </button>
            
            <AnimatePresence>
              {isModelDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scaleY: 0.95 }}
                  animate={{ opacity: 1, y: 0, scaleY: 1 }}
                  exit={{ opacity: 0, y: 10, scaleY: 0.95 }}
                  transition={{ duration: 0.15 }}
                  style={{ transformOrigin: 'top' }}
                  className="absolute left-0 mt-2 w-72 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl p-1 max-h-80 overflow-y-auto"
                >
                  {models.map((m) => (
                    <div
                      key={m.id}
                      onClick={() => handleModelSelect(m.id)}
                      className={cn(
                        'flex items-center justify-between px-3 py-2 text-sm rounded-lg cursor-pointer transition-colors',
                        m.id === selectedModelId
                          ? 'bg-zinc-800 text-zinc-100 font-medium'
                          : 'text-zinc-400 hover:bg-zinc-800/70 hover:text-zinc-200'
                      )}
                    >
                      <span className="truncate">{m.id}</span>
                      {m.id === selectedModelId && (
                        <motion.div
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 0.1 }}
                        >
                            <Check size={16} className="text-blue-400" />
                        </motion.div>
                      )}
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto scroll-smooth">
          <div className="max-w-4xl mx-auto px-4 py-20">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center min-h-[40vh] text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-zinc-900 flex items-center justify-center mb-6 shadow-inner border border-zinc-800">
                  <Terminal size={32} className="text-zinc-500" />
                </div>
                <h2 className="text-2xl font-semibold text-zinc-200 mb-2">
                  How can I help you today?
                </h2>
              </div>
            )}

            <AnimatePresence initial={false}>
              {messages.map((m) => (
                <MessageBubble key={m.id} {...m} />
              ))}
            </AnimatePresence>

            {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
              <div className="flex items-center gap-2 text-zinc-500 text-sm mt-4 ml-1">
                <Loader2 size={14} className="animate-spin" /> Generating...
              </div>
            )}

            <div ref={messagesEndRef} className="h-4" />
          </div>
        </div>

        <div className="p-6 pt-2 bg-[#09090b]">
          <div className="max-w-4xl mx-auto relative group">
            <div className="absolute inset-0 bg-zinc-800/20 rounded-[28px] blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            <form
              onSubmit={onSubmit}
              className="relative flex flex-col bg-zinc-900 border border-zinc-700/50 rounded-[26px] shadow-lg focus-within:border-zinc-600 focus-within:ring-1 focus-within:ring-zinc-700/50 transition-all overflow-hidden"
              style={{ resize: 'none' }}
            >
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything..."
                rows={1}
                className="w-full bg-transparent text-zinc-100 placeholder:text-zinc-500 text-base px-5 py-4 focus:outline-none resize-none select-none [resize:none] max-h-[200px] min-h-[56px] overflow-hidden leading-relaxed max-w-full"
                style={{ 
                  height: '56px', 
                  resize: 'none',
                  overflow: 'hidden',
                  userSelect: 'text'
                }}
                onInput={handleInputResize}
                disabled={isLoading}
                draggable={false}
              />

              <div className="flex justify-between items-center px-3 pb-3 pt-1 select-none">
                <div className="flex gap-1"></div>
                <button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  className={cn(
                    'p-2 rounded-full mb-0.5 transition-all duration-200 select-none',
                    input.trim()
                      ? 'bg-zinc-100 text-zinc-900 hover:bg-white shadow-md hover:shadow-zinc-100/20'
                      : 'bg-zinc-700 text-zinc-500 cursor-not-allowed'
                  )}
                  draggable={false}
                >
                  <Send size={16} strokeWidth={2.5} />
                </button>
              </div>
            </form>

            <div className="text-center mt-3">
              <p className="text-[11px] text-zinc-600 select-none">AI can make mistakes. Please use responsibly.</p>
            </div>
          </div>
        </div>
      </div>

      {isSettingsOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center backdrop-blur-[2px]"
          onClick={() => setIsSettingsOpen(false)}
          style={{ userSelect: 'none' }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl w-full max-w-md shadow-2xl select-none"
            onClick={(e) => e.stopPropagation()}
            style={{ userSelect: 'none' }}
          >
            <div className="flex justify-between items-center mb-6 select-none">
              <h2 className="text-lg font-semibold text-zinc-100 select-none">Settings</h2>
              <button className="text-zinc-500 hover:text-zinc-300" onClick={() => setIsSettingsOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-between">
              <span className="text-sm text-red-400 font-medium select-none">Clear all chats</span>
              <button
                onClick={deleteAllChats}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-md transition-colors select-none"
              >
                Delete
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}