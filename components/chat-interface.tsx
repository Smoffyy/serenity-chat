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
    '#EF4444', 
    '#3B82F6', 
    '#10B981', 
    '#F59E0B', 
    '#8B5CF6', 
    '#EC4899', 
  ];
  return colors[Math.floor(Math.random() * colors.length)];
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
  const inputRef = useRef<HTMLTextAreaElement>(null); // Ref for the input textarea

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
    
    // Ensure input is focused when loading an existing chat
    inputRef.current?.focus(); 

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
    
    // Ensure input is focused when starting a new chat
    inputRef.current?.focus(); 
  };
  
  const deleteChat = (idToDelete: string) => {
      // 1. Remove from localStorage
      localStorage.removeItem(`chat_${idToDelete}`);

      // 2. Remove from chat list metadata
      const updatedList = chatList.filter(chat => chat.id !== idToDelete);
      localStorage.setItem('all_chats', JSON.stringify(updatedList));
      setChatList(updatedList);
      
      // 3. Handle active chat
      if (idToDelete === chatId) {
          if (updatedList.length > 0) {
              const nextChat = updatedList[0];
              loadChat(nextChat.id, nextChat.model, nextChat.color);
          } else {
              startNewChat();
          }
      }
  };
  
  // Delete All Chats Logic
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
          inputRef.current?.focus(); 
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
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);


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

    // Fix for user newlines not rendering in Markdown
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
      
      // *** FINAL AUTO-FOCUS FIX ***
      // Use setTimeout(0) to ensure the focus command runs AFTER React finishes 
      // updating the DOM and clearing the input state (setInput('')).
      setTimeout(() => {
        inputRef.current?.focus(); 
      }, 0); 
    }
  };

  // --- Rendering ---
  
  const currentModelName = models.find(m => m.id === selectedModelId)?.id.split('/').pop() || 'Loading...';
  
  return (
    <div className="flex h-screen bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-sans overflow-hidden">
      
      {/* Sidebar: Chat History */}
      <motion.div 
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="w-64 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 flex flex-col gap-4 flex-shrink-0"
      >
        <button 
          onClick={startNewChat}
          className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-blue-600 text-white dark:bg-blue-700 rounded-xl font-medium hover:bg-blue-700 dark:hover:bg-blue-800 transition shadow-lg shadow-blue-500/30"
        >
          <PlusCircle size={18} /> Start New Chat
        </button>
        
        {/* Chat List Area */}
        <div className="flex-1 overflow-y-auto pt-2">
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
           {chatList.length === 0 && <p className="text-sm text-zinc-400 italic px-2">No history saved.</p>}
        </div>
        
        {/* User Profile Section */}
        <div className="mt-auto border-t border-zinc-200 dark:border-zinc-800 pt-4">
            <button
                onClick={() => setIsSettingsOpen(true)}
                className="w-full flex items-center gap-3 p-2 rounded-xl text-left hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
            >
                <div className="p-2 rounded-full bg-zinc-200 dark:bg-zinc-700">
                    <User size={18} className="text-zinc-600 dark:text-zinc-300" />
                </div>
                <span className="font-medium text-sm">User</span>
                <Settings size={16} className="ml-auto text-zinc-400" />
            </button>
        </div>
      </motion.div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative">
        
        {/* Header */}
        <header className="h-16 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-end px-6 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md sticky top-0 z-10">
          <motion.select 
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            value={selectedModelId} 
            onChange={(e) => setSelectedModelId(e.target.value)}
            className="bg-zinc-100 dark:bg-zinc-800 border-none rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer hover:bg-zinc-200 dark:hover:bg-zinc-700 transition"
          >
            {models.length === 0 && <option value="">Loading models...</option>}
            {models.map(m => (
              <option key={m.id} value={m.id}>{m.id.split('/').pop()}</option>
            ))}
          </motion.select>
        </header>

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto scroll-smooth">
          <div className="max-w-4xl mx-auto px-6 py-6 space-y-4"> 
            
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center opacity-50 pt-20">
                <Bot size={48} className="mb-4 text-zinc-300" />
                <p className="text-lg font-medium">Select a model and start chatting.</p>
              </div>
            )}
            
            <AnimatePresence>
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
                <div className="bg-red-100 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-2 text-sm max-w-md shadow-md">
                  <AlertCircle size={16} /> <span>{error}</span>
                </div>
              </motion.div>
            )}

          </div> 
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <motion.form 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
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
              className="w-full bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-xl px-6 py-4 pr-14 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all shadow-xl dark:shadow-none text-base resize-none overflow-y-auto"
              disabled={isLoading || !selectedModelId}
            />
            <button 
              type="submit" 
              disabled={isLoading || !input.trim() || !selectedModelId}
              className="absolute right-2 bottom-2 p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-30 disabled:bg-zinc-400 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-500/50"
            >
              <AnimatePresence mode="wait">
                {isLoading 
                  ? <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><Loader2 size={20} className="animate-spin" /></motion.div>
                  : <motion.div key="send" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><Send size={20} /></motion.div>
                }
              </AnimatePresence>
            </button>
          </motion.form>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center mt-2 text-xs text-zinc-400"
          >
             {selectedModelId ? `Using ${currentModelName}` : 'No model selected'}
          </motion.div>
        </div>

      </div>
      
      {/* Settings Modal */}
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} deleteAllChats={deleteAllChats} />
    </div>
  );
}

// --- HISTORY ITEM AND SETTINGS COMPONENTS ---

// Settings Modal Component
interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    deleteAllChats: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, deleteAllChats }) => {
    const [activeTab, setActiveTab] = useState('Chat');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/70 backdrop-blur-sm" onClick={onClose}>
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
                className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl w-full max-w-2xl h-3/4 max-h-[600px] flex flex-col"
                onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
            >
                {/* Header */}
                <div className="flex justify-between items-center p-5 border-b border-zinc-200 dark:border-zinc-800">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Settings size={20} /> Settings
                    </h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex flex-1 overflow-hidden">
                    {/* Sidebar */}
                    <div className="w-40 border-r border-zinc-200 dark:border-zinc-800 p-4 flex flex-col gap-1">
                        <button
                            onClick={() => setActiveTab('Chat')}
                            className={cn(
                                "flex items-center gap-2 p-3 rounded-lg text-sm transition text-left",
                                activeTab === 'Chat' 
                                    ? "bg-blue-600 text-white font-medium" 
                                    : "text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                            )}
                        >
                            <History size={16} /> Chat
                        </button>
                        {/* Future tabs can go here */}
                    </div>

                    {/* Content */}
                    <div className="flex-1 p-6 overflow-y-auto">
                        <AnimatePresence mode="wait">
                            {activeTab === 'Chat' && (
                                <motion.div
                                    key="chat-settings"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.15 }}
                                >
                                    <h3 className="text-lg font-semibold mb-4">Chat History</h3>

                                    <div className="p-4 border border-red-500/20 bg-red-500/5 dark:bg-red-500/10 rounded-xl">
                                        <p className="font-medium text-red-500 flex items-center gap-2 mb-3">
                                            <AlertCircle size={18} /> Danger Zone
                                        </p>
                                        <div className="flex justify-between items-center">
                                            <p className="text-sm">Delete all chat history and saved metadata.</p>
                                            
                                            {!showDeleteConfirm ? (
                                                <button
                                                    onClick={() => setShowDeleteConfirm(true)}
                                                    className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition font-medium"
                                                >
                                                    Delete All Messages
                                                </button>
                                            ) : (
                                                <motion.div 
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    className="flex items-center gap-2"
                                                >
                                                    <button
                                                        onClick={() => {
                                                            if (window.confirm("ARE YOU ABSOLUTELY SURE? This action cannot be undone and will permanently delete ALL chat history.")) {
                                                                deleteAllChats();
                                                            }
                                                        }}
                                                        className="px-4 py-2 bg-red-700 text-white rounded-lg text-sm hover:bg-red-800 transition font-medium"
                                                    >
                                                        Confirm Delete
                                                    </button>
                                                    <button
                                                        onClick={() => setShowDeleteConfirm(false)}
                                                        className="px-4 py-2 bg-zinc-300 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 rounded-lg text-sm hover:bg-zinc-400 dark:hover:bg-zinc-600 transition"
                                                    >
                                                        Cancel
                                                    </button>
                                                </motion.div>
                                            )}
                                        </div>
                                    </div>

                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};


// History Item Component for sidebar
interface HistoryItemProps {
    chat: ChatMetadata;
    isActive: boolean;
    onChatClick: (e: MouseEvent, chat: ChatMetadata) => void;
    onDelete: (chatId: string) => void;
}

const HistoryItem: React.FC<HistoryItemProps> = ({ chat, isActive, onChatClick, onDelete }) => {
    const [isHovered, setIsHovered] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
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

    // Function to handle the final delete action with confirmation
    const confirmAndDelete = (e: MouseEvent) => {
        e.stopPropagation();
        if (window.confirm(`Are you sure you want to delete "${chat.title}"?`)) {
            onDelete(chat.id);
        }
        setShowMenu(false);
    };
    
    // Handler for the trash icon click (used when Shift is held)
    const handleShiftDeleteClick = (e: MouseEvent) => {
        e.stopPropagation();
        confirmAndDelete(e);
    };
    
    // Handler for the three-dot menu click
    const handleMenuToggle = (e: MouseEvent) => {
        e.stopPropagation(); 
        setShowMenu(prev => !prev);
    };
    
    // Check if the trash icon should be visually active/shown
    const showTrashIcon = isHovered && isShiftDown;

    return (
        <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => onChatClick(e, chat)}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => {
                setIsHovered(false);
            }}
            className={cn(
                "p-3 mb-2 rounded-lg cursor-pointer transition-all duration-200 flex items-center justify-between gap-3 relative overflow-visible",
                isActive 
                    ? "bg-blue-500/10 text-blue-400 font-medium border border-blue-500/30"
                    : "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 group"
            )}
        >
            <div className="flex items-center gap-3 min-w-0 flex-grow">
                <div 
                    className="w-2 h-2 rounded-full flex-shrink-0" 
                    style={{ backgroundColor: chat.color }}
                />
                <span className="text-sm truncate leading-tight">{chat.title}</span>
            </div>
            
            {(isHovered || showMenu) && (
                <div className="flex-shrink-0 flex items-center gap-1">
                    
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
                                "p-1 rounded-full transition-colors",
                                isActive ? "text-blue-400" : "text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700",
                                showMenu && "bg-zinc-200 dark:bg-zinc-700"
                            )}
                        >
                            <MoreVertical size={16} />
                        </motion.button>
                    )}
                    
                    {/* Deletion Menu (Dropdown) */}
                    {showMenu && (
                        <div className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-xl z-20">
                            <button 
                                onClick={confirmAndDelete}
                                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-500/10 rounded-lg"
                            >
                                <Trash2 size={14} /> Delete Chat
                            </button>
                        </div>
                    )}
                </div>
            )}
        </motion.div>
    );
};