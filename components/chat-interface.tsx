"use client";

import { useEffect, useState, useRef, FormEvent, useCallback, KeyboardEvent, MouseEvent } from 'react';
import { MessageBubble } from './message-bubble';
import { Send, Bot, PlusCircle, Loader2, AlertCircle, History, MoreVertical, Trash2, User, Settings, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils'; 

// Define types for clarity
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  modelColor?: string; 
}
interface ChatMetadata {
  id: string;
  title: string;
  model: string;
  color: string;
  date: number; 
}
interface ModelData {
    id: string;
    color: string;
}

const generateRandomColor = () => {
  const colors = [
    '#6366F1', // Indigo
    '#3B82F6', // Blue
    '#06B6D4', // Cyan
    '#A855F7', // Purple
    '#EC4899', // Pink
  ];
  const getRandomInt = (min: number, max: number) => {
      min = Math.ceil(min);
      max = Math.floor(max);
      return Math.floor(Math.random() * (max - min + 1)) + min;
  }
  return colors[Math.floor(getRandomInt(0, colors.length - 1))];
};


// History Item Component with Motion (Restored/Maintained the superior dark-gradient look)
const HistoryItem: React.FC<{ 
    chat: ChatMetadata, 
    isActive: boolean, 
    onChatClick: (e: MouseEvent, chat: ChatMetadata) => void, 
    onDelete: (id: string) => void 
}> = ({ chat, isActive, onChatClick, onDelete }) => {
    const [showMenu, setShowMenu] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [isShiftDown, setIsShiftDown] = useState(false);
    
    // Effect to track the Shift key state globally
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Shift') {
                setIsShiftDown(true);
            }
        };
        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.key === 'Shift') {
                setIsShiftDown(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown as any);
        window.addEventListener('keyup', handleKeyUp as any);

        return () => {
            window.removeEventListener('keydown', handleKeyDown as any);
            window.removeEventListener('keyup', handleKeyUp as any);
        };
    }, []);

    const handleMenuToggle = (e: MouseEvent) => {
        e.stopPropagation();
        setShowMenu(prev => !prev);
    };

    const confirmAndDelete = (e: MouseEvent) => {
        e.stopPropagation();
        if (window.confirm(`Are you sure you want to delete chat: "${chat.title}"?`)) {
            onDelete(chat.id);
        }
        setShowMenu(false);
    };
    
    // Handler for the trash icon click (used when Shift is held)
    const handleShiftDeleteClick = (e: MouseEvent) => {
        e.stopPropagation();
        confirmAndDelete(e);
    };
    
    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = () => {
            if (showMenu) {
                setShowMenu(false);
            }
        };
        window.addEventListener('click', handleClickOutside);
        return () => window.removeEventListener('click', handleClickOutside);
    }, [showMenu]);

    const showTrashIcon = isHovered && isShiftDown;

    return (
        <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            layout 
            onClick={(e) => onChatClick(e, chat)}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className={cn(
                "flex items-center justify-between px-3 py-2 rounded-xl text-sm transition-all group relative cursor-pointer overflow-visible",
                isActive 
                    ? "bg-blue-600/20 text-blue-300 font-medium border border-blue-600/50 shadow-md" 
                    : "text-zinc-300 hover:bg-zinc-800 hover:border-zinc-700 border border-transparent"
            )}
        >
            <span className="flex-1 text-left truncate" title={chat.title}>
                {chat.title}
            </span>
            
            {/* Action Menu Button */}
            <div className="flex-shrink-0">
                {(isHovered || showMenu) && (
                    <div className="flex items-center gap-1">
                        {/* Trash Icon for Shift + Click */}
                        {showTrashIcon && (
                            <motion.button
                                key="trash-icon"
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                onClick={handleShiftDeleteClick}
                                className={cn(
                                    "p-1 rounded-full transition-colors bg-red-500/10 text-red-500 hover:bg-red-500/30",
                                )}
                                title="Click to delete"
                            >
                                <Trash2 size={16} />
                            </motion.button>
                        )}
                        
                        {/* Three-dot menu button */}
                        {!showTrashIcon && (
                            <motion.button
                                key="more-icon"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={handleMenuToggle}
                                className={cn(
                                    "p-1 rounded-full transition-colors opacity-0 group-hover:opacity-100",
                                    isActive ? "text-blue-400" : "text-zinc-500 hover:bg-zinc-700",
                                    showMenu && "bg-zinc-700 opacity-100"
                                )}
                            >
                                <MoreVertical size={16} />
                            </motion.button>
                        )}
                    </div>
                )}
                
                {/* Deletion Menu (Dropdown) */}
                {showMenu && (
                    <div className="absolute right-0 top-full mt-1 w-40 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl z-20">
                        <button 
                            onClick={confirmAndDelete}
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        >
                            <Trash2 size={14} /> Delete Chat
                        </button>
                    </div>
                )}
            </div>
        </motion.div>
    );
};

// Settings Modal Component (Restored/Maintained the superior dark-gradient look)
const SettingsModal: React.FC<{ isOpen: boolean, onClose: () => void, deleteAllChats: () => void }> = ({ isOpen, onClose, deleteAllChats }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center backdrop-blur-sm">
            <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-zinc-900 p-8 rounded-2xl w-full max-w-md shadow-2xl border border-zinc-800"
            >
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold flex items-center gap-2 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400"><Settings size={24} /> Settings</h2>
                    <button onClick={onClose} className="p-2 rounded-full text-zinc-400 hover:bg-zinc-800 transition"><X size={20} /></button>
                </div>
                
                <div className="space-y-6">
                    <h3 className="text-lg font-semibold text-zinc-300 border-b border-zinc-700 pb-2">Data Management</h3>
                    <div className="flex justify-between items-center p-4 bg-red-900/20 rounded-xl border border-red-800/50">
                        <span className="text-red-400 font-medium">Permanently Delete All Chat History</span>
                        <button
                            onClick={() => { 
                                if (window.confirm("Are you sure you want to permanently delete ALL chat history? This action cannot be undone.")) {
                                    deleteAllChats();
                                }
                            }}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium text-sm shadow-lg hover:shadow-red-500/30"
                        >
                            Delete All
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};


export default function ChatInterface() {
  const [models, setModels] = useState<ModelData[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string>('');
  const [selectedModelColor, setSelectedModelColor] = useState<string>('');

  const [chatId, setChatId] = useState<string>(() => Date.now().toString());
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chatList, setChatList] = useState<ChatMetadata[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // --- Utility Functions ---

  const getChatMetadata = useCallback((): ChatMetadata[] => {
    try {
      const list = JSON.parse(localStorage.getItem('all_chats') || '[]') as ChatMetadata[];
      return list.sort((a, b) => b.date - a.date);
    } catch (e) {
      console.error("Failed to parse chat list", e);
      return [];
    }
  }, []);

  const saveHistory = useCallback((currentMessages: Message[], modelId: string, modelColor: string) => {
    localStorage.setItem(`chat_${chatId}`, JSON.stringify(currentMessages));
    
    const currentList = getChatMetadata();
    const existingIndex = currentList.findIndex(c => c.id === chatId);
    
    let title: string = 'New Chat';
    if (existingIndex > -1) {
        title = currentList[existingIndex].title; 
    } else if (currentMessages.length > 0) {
        const firstMessage = currentMessages[0].content.trim(); 
        title = firstMessage.length > 30 ? firstMessage.slice(0, 30) + '...' : firstMessage;
    }
    
    const newMetadata: ChatMetadata = {
      id: chatId,
      title: title,
      model: modelId,
      color: modelColor,
      date: Date.now() 
    };

    if (existingIndex > -1) {
      currentList[existingIndex] = newMetadata; 
    } else {
      currentList.unshift(newMetadata); 
    }
    
    localStorage.setItem('all_chats', JSON.stringify(currentList)); 
    setChatList(currentList.sort((a, b) => b.date - a.date)); 
  }, [chatId, getChatMetadata]);
  
  const loadChat = useCallback((id: string, modelId: string, color: string) => {
    if (messages.length > 0) {
        saveHistory(messages, selectedModelId, selectedModelColor);
    }

    setChatId(id);
    setSelectedModelId(modelId);
    setSelectedModelColor(color);
    setInput('');
    setError(null);

    const saved = localStorage.getItem(`chat_${id}`);
    if (saved) {
      try {
        setMessages(JSON.parse(saved));
      } catch (e) { 
        console.error("Failed to load chat history", e);
        setMessages([]);
      }
    } else {
      setMessages([]);
    }
    
    setTimeout(() => {
        inputRef.current?.focus(); 
    }, 0); 

  }, [messages, selectedModelId, selectedModelColor, saveHistory]);

  const startNewChat = () => {
    if (messages.length > 0) {
        saveHistory(messages, selectedModelId, selectedModelColor);
    }
    const newId = Date.now().toString();
    setChatId(newId);
    setMessages([]);
    setInput('');
    setError(null);
    if (models.length > 0) {
        setSelectedModelId(models[0].id);
        setSelectedModelColor(models[0].color);
    }
    
    setTimeout(() => {
        inputRef.current?.focus(); 
    }, 0); 
  };
  
  const deleteChat = (idToDelete: string) => {
      localStorage.removeItem(`chat_${idToDelete}`);

      const updatedList = chatList.filter(chat => chat.id !== idToDelete);
      localStorage.setItem('all_chats', JSON.stringify(updatedList));
      setChatList(updatedList);
      
      if (idToDelete === chatId) {
          if (updatedList.length > 0) {
              const nextChat = updatedList[0];
              loadChat(nextChat.id, nextChat.model, nextChat.color);
          } else {
              startNewChat();
          }
      }
  };
  
  const deleteAllChats = () => {
      const currentList = getChatMetadata();
      currentList.forEach(chat => {
          localStorage.removeItem(`chat_${chat.id}`);
      });

      localStorage.removeItem('all_chats');
      setChatList([]);

      startNewChat();
      
      setIsSettingsOpen(false);
  };


  // --- Effects ---

  useEffect(() => {
    setChatList(getChatMetadata());

    const fetchModels = async () => {
      try {
        const res = await fetch('/api/models');
        
        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.error || `Failed to fetch models with status: ${res.status}`);
        }

        const data = await res.json();

        if (data.data && data.data.length > 0) {
          const coloredModels = data.data.map((m: any) => ({
              id: m.id,
              color: generateRandomColor(), 
          }));
          
          setModels(coloredModels);
          
          let initialModel = coloredModels[0].id;
          let initialColor = coloredModels[0].color;
          
          const lastChat = getChatMetadata()[0];
          if (lastChat) {
              loadChat(lastChat.id, lastChat.model, lastChat.color);
              return; 
          }
          
          setSelectedModelId(initialModel);
          setSelectedModelColor(initialColor);
          
          // Initial focus on load
          setTimeout(() => {
            inputRef.current?.focus(); 
          }, 0); 
        }
      } catch (err: any) {
        setError(`Initialization Error: ${err.message || "Failed to connect to Local AI models."}`);
        console.error("Initialization Error:", err);
      }
    };
    
    fetchModels();
  }, []); 

  useEffect(() => {
    const model = models.find(m => m.id === selectedModelId);
    if (model) {
        setSelectedModelColor(model.color);
    }
  }, [selectedModelId, models]);


  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, isLoading]);


  // --- Event Handlers ---

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSubmit(e as unknown as FormEvent<HTMLFormElement>);
    }
  };
  
  const handleHistoryClick = (e: MouseEvent, chat: ChatMetadata) => {
    if (!e.shiftKey) {
        loadChat(chat.id, chat.model, chat.color);
    }
  };

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedModelId || !input.trim() || isLoading) return;

    let userText = input; 
    setInput(''); 
    setError(null);

    userText = userText.replace(/\n(?!\n)/g, '\n\n'); 
    userText = userText.trim();


    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: userText };
    const messagesToSend = [...messages, userMsg];
    setMessages(messagesToSend);
    setIsLoading(true);

    const aiMsgId = (Date.now() + 1).toString();
    const aiMsg: Message = { id: aiMsgId, role: 'assistant', content: "Thinking..." }; 
    setMessages(prev => [...prev, aiMsg]);


    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messagesToSend.map(m => ({ role: m.role, content: m.content })),
          model: selectedModelId
        })
      });

      if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || "Failed to connect to AI server.");
      }
      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        accumulatedContent += chunk;
        
        setMessages(currentMsgs => 
          currentMsgs.map(msg => 
            msg.id === aiMsgId 
              ? { ...msg, content: accumulatedContent, modelColor: selectedModelColor } 
              : msg
          )
        );
      }
      
      const finalMessages = [...messagesToSend, { ...aiMsg, content: accumulatedContent, modelColor: selectedModelColor }]; 
      setMessages(finalMessages); 
      saveHistory(finalMessages, selectedModelId, selectedModelColor); 

    } catch (err: any) {
      setError(err.message || "Something went wrong");
      setMessages(prev => prev.filter(m => m.id !== aiMsgId && m.id !== userMsg.id));
    } finally {
      setIsLoading(false);
      
      setTimeout(() => {
        inputRef.current?.focus(); 
      }, 0); 
    }
  };

  // --- Rendering ---
  
  const currentModelName = models.find(m => m.id === selectedModelId)?.id.split('/').pop() || 'Loading...';
  
  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100 font-sans overflow-hidden">
      
      {/* Sidebar: Chat History */}
      <motion.div 
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="w-64 border-r border-zinc-800 bg-zinc-900 p-4 flex flex-col gap-4 flex-shrink-0 shadow-2xl shadow-black/50"
      >
        <motion.button 
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={startNewChat}
          className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition shadow-lg shadow-purple-500/30"
        >
          <PlusCircle size={18} /> New AI Conversation
        </motion.button>
        
        {/* Chat List Area */}
        <div className="flex-1 overflow-y-auto pt-2 space-y-2">
           <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3 flex items-center gap-1">
             <History size={14} /> Recent Chats
           </div>
           
           <AnimatePresence initial={false}>
             {chatList.map((chat) => (
                <HistoryItem 
                    key={chat.id} 
                    chat={chat} 
                    isActive={chat.id === chatId}
                    onChatClick={handleHistoryClick}
                    onDelete={deleteChat}
                />
             ))}
           </AnimatePresence>
           {chatList.length === 0 && <p className="text-sm text-zinc-600 italic px-2">No history saved.</p>}
        </div>
        
        {/* User Profile Section */}
        <div className="mt-auto border-t border-zinc-800 pt-4">
            <motion.button
                whileHover={{ backgroundColor: '#18181b', x: 2 }}
                onClick={() => setIsSettingsOpen(true)}
                className="w-full flex items-center gap-3 p-3 rounded-xl text-left hover:bg-zinc-800 transition"
            >
                <div className="p-2 rounded-full bg-zinc-700">
                    <User size={18} className="text-zinc-400" />
                </div>
                <span className="font-medium text-sm">User Settings</span>
                <Settings size={16} className="ml-auto text-zinc-500" />
            </motion.button>
        </div>
      </motion.div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative bg-gradient-to-br from-zinc-950 to-zinc-900">
        
        {/* Header (Model Selector) */}
        <header className="h-16 border-b border-zinc-800 flex items-center justify-between px-6 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-10 shadow-lg">
           <motion.h1 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500"
            >
                AI Chat Interface
            </motion.h1>
          <motion.select 
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            value={selectedModelId} 
            onChange={(e) => setSelectedModelId(e.target.value)}
            className="bg-zinc-800 border-zinc-700 border rounded-xl px-4 py-2 text-sm text-zinc-300 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer hover:bg-zinc-700 transition"
          >
            {models.length === 0 && <option value="">Loading models...</option>}
            {models.map(m => (
              <option key={m.id} value={m.id}>{m.id.split('/').pop()}</option>
            ))}
          </motion.select>
        </header>

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto scroll-smooth">
          <div className="max-w-4xl mx-auto px-6 py-8 space-y-6"> 
            
            {messages.length === 0 && (
              <motion.div 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 0.7 }}
                    transition={{ delay: 0.5, duration: 1 }}
                    className="h-full flex flex-col items-center justify-center opacity-50 pt-20"
              >
                <Bot size={48} className="mb-4 text-zinc-600" />
                <p className="text-lg font-medium text-zinc-500">How can I assist you today? Start a conversation.</p>
                <p className="text-sm text-zinc-600 mt-2">Currently using **{currentModelName}**.</p>
              </motion.div>
            )}
            
            <AnimatePresence initial={false}>
              {messages.map((m) => (
                <MessageBubble 
                    key={m.id} 
                    role={m.role} 
                    content={m.content} 
                    modelColor={m.modelColor || selectedModelColor} 
                />
              ))}
            </AnimatePresence>
            
            <div ref={messagesEndRef} />
            
            {error && (
              <motion.div 
                  initial={{ opacity: 0, y: 10 }} 
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-center p-4"
              >
                <div className="bg-red-900/30 border border-red-800 text-red-400 px-4 py-3 rounded-xl flex items-center gap-2 text-sm max-w-md shadow-xl">
                  <AlertCircle size={16} /> <span>{error}</span>
                </div>
              </motion.div>
            )}

          </div> 
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-900 shadow-2xl shadow-black/50">
          <motion.form 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            onSubmit={onSubmit} 
            className="max-w-4xl mx-auto relative flex items-center"
          >
            <textarea
              ref={inputRef} 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown} 
              placeholder="Send a message (Shift+Enter for new line)..."
              rows={Math.min(10, Math.max(1, input.split('\n').length))} 
              className="w-full bg-zinc-800 text-zinc-100 rounded-xl px-6 py-4 pr-16 focus:outline-none focus:ring-2 focus:ring-blue-600/50 transition-all shadow-inner shadow-black/30 text-base resize-none overflow-y-auto"
              disabled={isLoading || !selectedModelId}
            />
            <motion.button 
              type="submit" 
              whileHover={{ scale: 1.05, boxShadow: "0 0 10px rgba(99, 102, 241, 0.7)" }}
              whileTap={{ scale: 0.95 }}
              disabled={isLoading || !input.trim() || !selectedModelId}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 disabled:opacity-30 disabled:bg-zinc-700 disabled:cursor-not-allowed transition-all shadow-lg shadow-purple-500/40"
            >
              <AnimatePresence mode="wait">
                {isLoading 
                  ? <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><Loader2 size={20} className="animate-spin" /></motion.div>
                  : <motion.div key="send" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><Send size={20} /></motion.div>
                }
              </AnimatePresence>
            </motion.button>
          </motion.form>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center mt-2 text-xs text-zinc-500"
          >
             {selectedModelId ? `Currently using ${currentModelName}` : 'No model selected'}
          </motion.div>
        </div>

      </div>
      
      {/* Settings Modal */}
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} deleteAllChats={deleteAllChats} />
    </div>
  );
}