"use client";

import { useEffect, useState, useRef, FormEvent, useCallback } from 'react';
import { MessageBubble } from './message-bubble';
import { Send, Bot, PlusCircle, Loader2, AlertCircle, History } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils'; // Assuming you have a standard cn utility

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

// Simple color generator for the AI icon
const generateRandomColor = () => {
  const colors = [
    '#EF4444', // Red
    '#3B82F6', // Blue
    '#10B981', // Green
    '#F59E0B', // Amber
    '#8B5CF6', // Violet
    '#EC4899', // Pink
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
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // --- Utility Functions ---

  const getChatMetadata = useCallback((): ChatMetadata[] => {
    try {
      // Sort by date descending
      const list = JSON.parse(localStorage.getItem('all_chats') || '[]') as ChatMetadata[];
      return list.sort((a, b) => b.date - a.date);
    } catch (e) {
      console.error("Failed to parse chat list", e);
      return [];
    }
  }, []);

  const saveHistory = useCallback((currentMessages: Message[], title: string, modelId: string, modelColor: string) => {
    localStorage.setItem(`chat_${chatId}`, JSON.stringify(currentMessages));
    
    // Update chat list metadata
    const currentList = getChatMetadata();
    const existingIndex = currentList.findIndex(c => c.id === chatId);
    const newMetadata: ChatMetadata = {
      id: chatId,
      title: title || 'New Chat',
      model: modelId,
      color: modelColor,
      date: Date.now()
    };

    if (existingIndex > -1) {
      currentList[existingIndex] = newMetadata; // Update existing chat
    } else {
      currentList.unshift(newMetadata); // Add new chat to top
    }
    // Re-save the sorted list (the utility function does the sorting)
    localStorage.setItem('all_chats', JSON.stringify(currentList)); 
    setChatList(currentList);
  }, [chatId, getChatMetadata]);
  
  const loadChat = useCallback((id: string, modelId: string, color: string) => {
    // Save current chat before switching
    if (messages.length > 0) {
        const title = messages[0].content.length > 30 ? messages[0].content.slice(0, 30) + '...' : messages[0].content;
        saveHistory(messages, title, selectedModelId, selectedModelColor);
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
  }, [messages, selectedModelId, selectedModelColor, saveHistory]);

  const startNewChat = () => {
    // Save current chat before starting new one
    if (messages.length > 0) {
        const title = messages[0].content.length > 30 ? messages[0].content.slice(0, 30) + '...' : messages[0].content;
        saveHistory(messages, title, selectedModelId, selectedModelColor);
    }
    const newId = Date.now().toString();
    setChatId(newId);
    setMessages([]);
    setInput('');
    setError(null);
    // If models are loaded, default to the first one
    if (models.length > 0) {
        setSelectedModelId(models[0].id);
        setSelectedModelColor(models[0].color);
    }
  };

  // --- Effects ---

  // Initial Load (Models & Chat List) 
  // FIX: Using an empty dependency array [] is the CRITICAL fix for the infinite loop
  useEffect(() => {
    // 1. Load chat list
    setChatList(getChatMetadata());

    // 2. Define and run the fetch function
    const fetchModels = async () => {
      try {
        const res = await fetch('/api/models');
        
        if (!res.ok) {
            // Read and throw the error message from the JSON response
            const errorData = await res.json();
            throw new Error(errorData.error || `Failed to fetch models with status: ${res.status}`);
        }

        const data = await res.json();

        if (data.data && data.data.length > 0) {
          // Assign a random color to each model
          const coloredModels = data.data.map((m: any) => ({
              id: m.id,
              color: generateRandomColor(), 
          }));
          
          // CRITICAL: setModels state update runs only on this initial render cycle
          setModels(coloredModels);
          
          // Determine initial selected model and color
          let initialModel = coloredModels[0].id;
          let initialColor = coloredModels[0].color;
          
          const lastChat = getChatMetadata()[0];
          if (lastChat) {
              // Load the last active chat/model if history exists
              loadChat(lastChat.id, lastChat.model, lastChat.color);
              return; 
          }
          
          // Set initial model/color if no history was loaded
          setSelectedModelId(initialModel);
          setSelectedModelColor(initialColor);
        }
      } catch (err: any) {
        setError(`Initialization Error: ${err.message || "Failed to connect to Local AI models."}`);
        console.error("Initialization Error:", err);
      }
    };
    
    fetchModels();

    // Empty array ensures this effect runs ONLY once on mount.
  }, []); 

  // Handle Model Dropdown Change (Updates selectedModelColor when modelId changes)
  useEffect(() => {
    const model = models.find(m => m.id === selectedModelId);
    if (model) {
        setSelectedModelColor(model.color);
    }
  }, [selectedModelId, models]);


  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);


  // --- Submit Handler (Manual Streaming) ---

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedModelId || !input.trim() || isLoading) return;

    const userText = input.trim();
    setInput(''); 
    setError(null);

    // 1. Add User Message Optimistically
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: userText };
    const messagesToSend = [...messages, userMsg];
    setMessages(messagesToSend);
    setIsLoading(true);

    // 2. Create Placeholder for AI Response (with "Thinking..." message)
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

      // 3. Read the Stream Manually
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        accumulatedContent += chunk;

        // Update the specific AI message in the state
        setMessages(currentMsgs => 
          currentMsgs.map(msg => 
            msg.id === aiMsgId 
              ? { ...msg, content: accumulatedContent, modelColor: selectedModelColor } 
              : msg
          )
        );
      }

      // 4. Stream Finished - Save History
      const title = userText.length > 30 ? userText.slice(0, 30) + '...' : userText;
      const finalMessages = [...messagesToSend, { ...aiMsg, content: accumulatedContent, modelColor: selectedModelColor }];
      saveHistory(finalMessages, title, selectedModelId, selectedModelColor);

    } catch (err: any) {
      setError(err.message || "Something went wrong");
      // Remove the empty AI placeholder if it failed completely
      setMessages(prev => prev.filter(m => m.id !== aiMsgId && m.id !== userMsg.id));
    } finally {
      setIsLoading(false);
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
        
        <div className="flex-1 overflow-y-auto pt-2">
           <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3 flex items-center gap-1">
             <History size={14} /> Recent Chats
           </div>
           
           <AnimatePresence initial={false}>
             {chatList.map((chat) => (
               <motion.div
                 key={chat.id}
                 initial={{ opacity: 0, x: -10 }}
                 animate={{ opacity: 1, x: 0 }}
                 exit={{ opacity: 0, height: 0 }}
                 transition={{ duration: 0.2 }}
                 onClick={() => loadChat(chat.id, chat.model, chat.color)}
                 className={cn(
                   "p-3 mb-2 rounded-lg cursor-pointer transition-all duration-200 flex items-center gap-3",
                   chat.id === chatId 
                     ? "bg-blue-500/10 text-blue-400 font-medium border border-blue-500/30"
                     : "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300"
                 )}
               >
                 <div 
                    className="w-2 h-2 rounded-full flex-shrink-0" 
                    style={{ backgroundColor: chat.color }}
                 />
                 <span className="text-sm truncate leading-tight">{chat.title}</span>
               </motion.div>
             ))}
           </AnimatePresence>
           {chatList.length === 0 && <p className="text-sm text-zinc-400 italic px-2">No history saved.</p>}
        </div>
      </motion.div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative">
        
        {/* Header */}
        <header className="h-16 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between px-6 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md sticky top-0 z-10">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2"
          >
            <div className={`w-2.5 h-2.5 rounded-full ${isLoading ? 'bg-amber-500 animate-pulse' : 'bg-green-500'}`} />
            <span className="font-semibold text-lg">Local AI</span>
          </motion.div>
          
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

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 scroll-smooth">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center opacity-50">
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
          
          {/* Scroll target */}
          <div ref={messagesEndRef} />
          
          {/* Error Banner */}
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

        {/* Input Area */}
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <motion.form 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            onSubmit={onSubmit} 
            className="max-w-4xl mx-auto relative flex items-center"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Send a message..."
              className="w-full bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-full px-6 py-4 pr-14 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all shadow-xl dark:shadow-none text-base"
              disabled={isLoading || !selectedModelId}
            />
            <button 
              type="submit" 
              disabled={isLoading || !input.trim() || !selectedModelId}
              className="absolute right-2 p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-30 disabled:bg-zinc-400 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-500/50"
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
    </div>
  );
}