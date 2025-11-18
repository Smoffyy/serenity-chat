"use client";

import { useEffect, useState, useRef, FormEvent } from 'react';
import { MessageBubble } from './message-bubble';
import { Send, Bot, PlusCircle, Loader2, AlertCircle } from 'lucide-react';

// Define our own Message type since we aren't using the SDK
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatInterface() {
  const [models, setModels] = useState<any[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [chatId, setChatId] = useState<string>(() => Date.now().toString());
  
  // Manual State Management
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Auto-scroll ref
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. Fetch Models
  useEffect(() => {
    fetch('/api/models')
      .then(res => res.json())
      .then(data => {
        if (data.data && data.data.length > 0) {
          setModels(data.data);
          setSelectedModel(data.data[0].id);
        }
      })
      .catch(err => console.error("Failed to fetch models", err));
  }, []);

  // 2. Load History
  useEffect(() => {
    const saved = localStorage.getItem(`chat_${chatId}`);
    if (saved) {
      try {
        setMessages(JSON.parse(saved));
      } catch (e) { console.error("Parse error", e); }
    }
  }, [chatId]);

  // 3. Save History Helper
  const saveHistory = (currentMessages: Message[]) => {
    localStorage.setItem(`chat_${chatId}`, JSON.stringify(currentMessages));
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const startNewChat = () => {
    const newId = Date.now().toString();
    setChatId(newId);
    setMessages([]);
    setInput('');
    setError(null);
  };

  // --- THE MANUAL SUBMIT HANDLER (The Fix) ---
  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedModel || !input.trim() || isLoading) return;

    const userText = input.trim();
    setInput(''); // Clear input
    setError(null);

    // 1. Add User Message Optimistically
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: userText };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setIsLoading(true);

    // 2. Create Placeholder for AI Response
    const aiMsgId = (Date.now() + 1).toString();
    const aiMsg: Message = { id: aiMsgId, role: 'assistant', content: '' };
    setMessages(prev => [...prev, aiMsg]);

    try {
      // 3. Start the Fetch Request
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages, // Send full history context
          model: selectedModel
        })
      });

      if (!response.ok) throw new Error("Failed to connect to AI server");
      if (!response.body) throw new Error("No response body");

      // 4. Read the Stream Manually
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // Decode chunk and append to our content
        const text = decoder.decode(value, { stream: true });
        accumulatedContent += text;

        // Update the specific AI message in the state
        setMessages(currentMsgs => 
          currentMsgs.map(msg => 
            msg.id === aiMsgId 
              ? { ...msg, content: accumulatedContent } 
              : msg
          )
        );
      }

      // 5. Stream Finished - Save History
      saveHistory([...newMessages, { ...aiMsg, content: accumulatedContent }]);

    } catch (err: any) {
      setError(err.message || "Something went wrong");
      // Remove the empty AI placeholder if it failed completely
      setMessages(prev => prev.filter(m => m.id !== aiMsgId));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-sans overflow-hidden">
      
      {/* Sidebar */}
      <div className="w-64 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 flex flex-col gap-4">
        <button 
          onClick={startNewChat}
          className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-lg font-medium hover:opacity-90 transition shadow-sm"
        >
          <PlusCircle size={18} /> New Chat
        </button>
        <div className="flex-1 overflow-y-auto p-2 text-sm text-zinc-400 italic">
           History is saved to LocalStorage.
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative">
        
        {/* Header */}
        <header className="h-16 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between px-6 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${isLoading ? 'bg-amber-500 animate-pulse' : 'bg-green-500'}`} />
            <span className="font-semibold">Local AI</span>
          </div>
          
          <select 
            value={selectedModel} 
            onChange={(e) => setSelectedModel(e.target.value)}
            className="bg-zinc-100 dark:bg-zinc-800 border-none rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
          >
            {models.length === 0 && <option value="">Loading models...</option>}
            {models.map(m => (
              <option key={m.id} value={m.id}>{m.id.split('/').pop()}</option>
            ))}
          </select>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center opacity-50">
              <Bot size={48} className="mb-4 text-zinc-300" />
              <p className="text-lg font-medium">Select a model and say hello.</p>
            </div>
          )}
          
          {messages.map((m) => (
            <MessageBubble key={m.id} role={m.role} content={m.content} />
          ))}
          
          {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
            <div className="flex justify-start animate-in fade-in">
              <div className="bg-zinc-100 dark:bg-zinc-800 rounded-2xl px-4 py-3 text-sm text-zinc-500 flex items-center gap-2">
                <Loader2 size={16} className="animate-spin" /> Thinking...
              </div>
            </div>
          )}

          {error && (
            <div className="flex justify-center p-4">
              <div className="bg-red-100 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2 text-sm">
                <AlertCircle size={16} /> <span>{error}</span>
              </div>
            </div>
          )}
          
          {/* Invisible element to scroll to */}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <form onSubmit={onSubmit} className="max-w-4xl mx-auto relative flex items-center">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Send a message..."
              className="w-full bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-full px-6 py-4 pr-14 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all shadow-sm text-base"
            />
            <button 
              type="submit" 
              disabled={isLoading || !input.trim() || !selectedModel}
              className="absolute right-2 p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:bg-zinc-400 disabled:cursor-not-allowed transition-all shadow-md"
            >
              {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
            </button>
          </form>
          <div className="text-center mt-2 text-xs text-zinc-400">
             {selectedModel ? `Using ${selectedModel.split('/').pop()}` : 'No model selected'}
          </div>
        </div>

      </div>
    </div>
  );
}