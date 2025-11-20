"use client";

import { useEffect, useState, useRef, FormEvent, useCallback, KeyboardEvent } from 'react';
import { MessageBubble } from './message-bubble';
import { Send, Plus, ChevronDown, Terminal, Loader2, User, Settings, X, Check, Star, Trash2, MoreVertical } from 'lucide-react';
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
  const [defaultModelId, setDefaultModelId] = useState<string>('');
  const [chatId, setChatId] = useState<string>(() => Date.now().toString());
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chatList, setChatList] = useState<ChatMetadata[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [isNewChat, setIsNewChat] = useState(true);
  const [isShiftPressed, setIsShiftPressed] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const modelDropdownRef = useRef<HTMLDivElement>(null);
  const chatListRef = useRef<HTMLDivElement>(null);

  const getChatMetadata = useCallback((): ChatMetadata[] => {
    try {
      const list = JSON.parse(localStorage.getItem('all_chats') || '[]') as ChatMetadata[];
      return list.sort((a, b) => b.date - a.date);
    } catch {
      return [];
    }
  }, []);

  const saveHistory = useCallback(
    (currentMessages: Message[], shouldUpdateDate: boolean = false) => {
      localStorage.setItem(`chat_${chatId}`, JSON.stringify(currentMessages));

      const currentList = getChatMetadata();
      const existingIndex = currentList.findIndex((c) => c.id === chatId);

      let title = 'New Chat';
      let date = Date.now();

      if (existingIndex > -1) {
        title = currentList[existingIndex].title;
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
      if (messages.length > 0 && chatId !== id && !isNewChat) {
          saveHistory(messages, false); 
      }
      setActiveMenuId(null);
      setChatId(id);
      setMessages([]);
      setInput('');

      const saved = localStorage.getItem(`chat_${id}`);
      if (saved) {
        try {
          setMessages(JSON.parse(saved));
          setIsNewChat(false);
        } catch (e) {
          console.error(e);
          setIsNewChat(true); 
        }
      } else {
          setIsNewChat(true);
      }

      setTimeout(() => inputRef.current?.focus(), 0);
    },
    [messages, saveHistory, chatId, isNewChat]
  );

  const startNewChat = () => {
    if (messages.length > 0 && !isNewChat) saveHistory(messages, false);

    setActiveMenuId(null);
    setChatId(Date.now().toString());
    setMessages([]);
    setInput('');
    setIsNewChat(true);
    if (defaultModelId) setSelectedModelId(defaultModelId);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const deleteAllChats = () => {
    chatList.forEach((c) => localStorage.removeItem(`chat_${c.id}`));
    localStorage.setItem('all_chats', '[]');
    setChatList([]);
    startNewChat();
    setIsSettingsOpen(false);
  };
  
  const deleteChat = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      localStorage.removeItem(`chat_${id}`);
      
      const updatedList = chatList.filter(c => c.id !== id);
      localStorage.setItem('all_chats', JSON.stringify(updatedList));
      setChatList(updatedList);
      
      if (chatId === id) {
          startNewChat();
      }
  };
  
  const handleSetDefaultModel = (e: React.MouseEvent, modelId: string) => {
    e.stopPropagation();
    const newDefault = defaultModelId === modelId ? '' : modelId;
    setDefaultModelId(newDefault);
    localStorage.setItem('default_model', newDefault);
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
  
  // GLOBAL SHIFT KEY LISTENERS for reliable quick delete
  useEffect(() => {
    const handleShiftDown = (e: globalThis.KeyboardEvent) => {
        if (e.key === 'Shift') {
            setIsShiftPressed(true);
        }
    };
    const handleShiftUp = (e: globalThis.KeyboardEvent) => {
        if (e.key === 'Shift') {
            setIsShiftPressed(false);
        }
    };

    window.addEventListener('keydown', handleShiftDown);
    window.addEventListener('keyup', handleShiftUp);

    return () => {
        window.removeEventListener('keydown', handleShiftDown);
        window.removeEventListener('keyup', handleShiftUp);
    };
  }, []);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.resize = 'none';
      inputRef.current.style.overflow = 'hidden';
    }
  }, []);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(event.target as Node)) {
        setIsModelDropdownOpen(false);
      }
      
      if (chatListRef.current && !chatListRef.current.contains(event.target as Node)) {
        setActiveMenuId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    setChatList(getChatMetadata());
    
    const savedDefaultModel = localStorage.getItem('default_model') || '';
    setDefaultModelId(savedDefaultModel);

    fetch('/api/models')
      .then((res) => res.json())
      .then((data) => {
        if (data.data?.length) {
          setModels(data.data);
          
          let initialModel = data.data[0].id;
          if (savedDefaultModel && data.data.some((m: ModelData) => m.id === savedDefaultModel)) {
            initialModel = savedDefaultModel;
          }
          if (!selectedModelId) setSelectedModelId(initialModel);
        }
      });
  }, []);

  useEffect(() => {
    if (!messagesEndRef.current) return;
    
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
    setIsNewChat(false);

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
      const finalHistory = [...newMessages.filter(m => m.id !== userMsg.id), userMsg, finalMsg];

      setMessages(finalHistory);
      saveHistory(finalHistory, true);
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
      // FIX: Removed userSelect: 'none' to allow text selection in the chat area
    >
      <motion.div
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="w-[260px] bg-[#09090b] border-r border-zinc-800/50 flex flex-col flex-shrink-0 select-none" // Applied select-none here
        style={{
          WebkitUserSelect: 'none',
          flexShrink: 0,
          position: 'relative'
        }}
        draggable={false}
      >
        <div className="p-3">
          <button
            onClick={startNewChat}
            className="flex items-center gap-2 w-full px-3 py-2 bg-zinc-100 text-zinc-900 hover:bg-zinc-200 rounded-lg text-sm font-medium transition-colors"
            draggable={false}
          >
            <Plus size={16} /> New Chat
          </button>
        </div>

        <div ref={chatListRef} className="flex-1 overflow-y-auto px-3 py-2 space-y-1 scrollbar-thin scrollbar-thumb-zinc-800">
          <div className="text-[11px] font-medium text-zinc-500 px-2 mb-2 uppercase tracking-wider">History</div>

          {chatList.map((chat) => (
            <div
              key={chat.id}
              className={cn(
                'group relative px-3 py-2 rounded-lg text-sm truncate transition-all flex items-center justify-between',
                chat.id === chatId
                  ? 'bg-zinc-800 text-zinc-100'
                  : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
              )}
              draggable={false}
            >
              <button onClick={() => loadChat(chat.id)} className="flex-1 text-left truncate pr-8 cursor-pointer">
                  {chat.title}
              </button>

              <div 
                  className={cn(
                      "absolute right-2 top-1/2 -translate-y-1/2 transition-opacity duration-150 flex items-center gap-1",
                      chat.id === chatId || activeMenuId === chat.id || (isShiftPressed && chat.id !== chatId)
                          ? 'opacity-100'
                          : 'opacity-0 group-hover:opacity-100'
                  )}
                  onClick={(e) => e.stopPropagation()}
              >
                  {/* Dedicated Shift Quick-Delete Button (Trash Icon) */}
                  {isShiftPressed && chat.id !== chatId && (
                      <button
                          onClick={(e) => deleteChat(e, chat.id)}
                          className="p-1.5 rounded-full text-red-400 bg-zinc-700/50 hover:bg-zinc-600 transition-colors z-50"
                          title="Quick Delete (Shift + Click)"
                      >
                          <Trash2 size={14} />
                      </button>
                  )}

                  {/* Dedicated Context Menu Button (3 Dots) */}
                  <button
                      onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuId(activeMenuId === chat.id ? null : chat.id);
                      }}
                      className={cn(
                          "p-1.5 rounded-full transition-colors",
                          activeMenuId === chat.id 
                              ? "bg-zinc-700 text-zinc-300"
                              : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700/50",
                          isShiftPressed && chat.id !== chatId ? 'hidden' : ''
                      )}
                      title="More options"
                  >
                      <MoreVertical size={14} />
                  </button>
              </div>

              <AnimatePresence>
                  {activeMenuId === chat.id && (
                      <motion.div
                          initial={{ opacity: 0, scale: 0.9, y: 5 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.9, y: 5 }}
                          transition={{ duration: 0.1 }}
                          className="absolute right-2 top-full mt-1 w-32 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl text-left text-zinc-300 z-40"
                          style={{ transformOrigin: 'top right' }}
                      >
                          <button
                              onClick={(e) => {deleteChat(e, chat.id); setActiveMenuId(null);}}
                              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-400 hover:bg-zinc-800 rounded-md"
                          >
                              <Trash2 size={14} /> Delete
                          </button>
                      </motion.div>
                  )}
              </AnimatePresence>
            </div>
          ))}
        </div>

        <div className="p-3 border-t border-zinc-800/50">
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center gap-3 px-2 py-2 w-full rounded-lg hover:bg-zinc-800/50 text-zinc-400 hover:text-zinc-200 transition-all"
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
        <header className="absolute top-0 left-0 right-0 h-14 flex items-center justify-between px-4 z-20 bg-[#09090b]/80 backdrop-blur-sm select-none">
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
                      className={cn(
                        'flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-colors group/model',
                        m.id === selectedModelId
                          ? 'bg-zinc-800 text-zinc-100 font-medium'
                          : 'text-zinc-400 hover:bg-zinc-800/70 hover:text-zinc-200'
                      )}
                    >
                      <button
                          onClick={() => handleModelSelect(m.id)}
                          className="flex-1 text-left truncate cursor-pointer"
                      >
                          {m.id}
                      </button>

                      <div className="flex items-center gap-2">
                          <button
                              onClick={(e) => handleSetDefaultModel(e, m.id)}
                              className={cn(
                                  'p-1 rounded-full transition-colors',
                                  m.id === defaultModelId
                                      ? 'text-yellow-400 hover:text-yellow-300'
                                      : 'text-zinc-600 hover:text-zinc-400 opacity-0 group-hover/model:opacity-100'
                              )}
                          >
                              <Star size={14} fill={m.id === defaultModelId ? 'currentColor' : 'none'} />
                          </button>

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
              <div className="flex flex-col items-center justify-center min-h-[40vh] text-center space-y-4 select-none">
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
              <div className="flex items-center gap-2 text-zinc-500 text-sm mt-4 ml-1 select-none">
                <Loader2 size={14} className="animate-spin" /> Generating...
              </div>
            )}

            <div ref={messagesEndRef} className="h-4" />
          </div>
        </div>

        <div className="p-6 pt-2 bg-[#09090b] select-none">
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
                className="w-full bg-transparent text-zinc-100 placeholder:text-zinc-500 text-base px-5 py-4 focus:outline-none resize-none [resize:none] max-h-[200px] min-h-[56px] overflow-hidden leading-relaxed max-w-full"
                style={{ 
                  height: '56px', 
                  resize: 'none',
                  overflow: 'hidden',
                  userSelect: 'text' // Allows selection in the textarea
                }}
                onInput={handleInputResize}
                disabled={isLoading}
                draggable={false}
              />

              <div className="flex justify-between items-center px-3 pb-3 pt-1">
                <div className="flex gap-1"></div>
                <button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  className={cn(
                    'p-2 rounded-full mb-0.5 transition-all duration-200',
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
              <p className="text-[11px] text-zinc-600">AI can make mistakes. Please use responsibly.</p>
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
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-zinc-100">Settings</h2>
              <button className="text-zinc-500 hover:text-zinc-300" onClick={() => setIsSettingsOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-between">
              <span className="text-sm text-red-400 font-medium">Clear all chats</span>
              <button
                onClick={deleteAllChats}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-md transition-colors"
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