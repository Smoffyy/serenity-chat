"use client";

import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { Bot, User } from 'lucide-react';
import { cn } from '@/lib/utils'; // Assuming you have a standard cn utility

interface MessageBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  // New prop for the model's gradient color
  modelColor?: string;
}

const gradientFromColor = (color: string) => {
  if (color.includes('#')) {
    // Simple gradient for placeholder colors
    return `from-[${color}] via-white/5 to-[${color}]`;
  }
  return `from-${color}-500 to-${color}-700`;
};

export function MessageBubble({ role, content, modelColor = 'blue' }: MessageBubbleProps) {
  const isUser = role === 'user';
  
  // Use a slight delay for messages that appear after the initial load
  const delay = isUser ? 0 : 0.05;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: delay }}
      className={cn(
        "flex w-full max-w-4xl mx-auto",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "flex items-start gap-4 p-4 rounded-xl shadow-md transition-all duration-300",
          isUser
            ? "bg-blue-600 text-white rounded-br-none"
            : "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-tl-none"
        )}
      >
        {!isUser && (
          <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white p-1"
               style={{ 
                   background: `linear-gradient(45deg, ${modelColor} 30%, #fff 100%)` 
               }}
          >
            <Bot size={18} />
          </div>
        )}
        
        <div className={cn("prose max-w-none break-words", isUser ? "prose-invert" : "dark:prose-invert")}>
          <ReactMarkdown
            components={{
              // Custom rendering for paragraphs and code blocks
              p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
              code: ({ node, className, children, ...props }) => {
                const match = /language-(\w+)/.exec(className || '')
                return match ? (
                  <pre className="bg-zinc-200 dark:bg-zinc-900 p-2 rounded-md overflow-x-auto text-sm my-3">
                    <code className={`language-${match[1]}`}>{children}</code>
                  </pre>
                ) : (
                  <code className="bg-zinc-200 dark:bg-zinc-700 rounded-sm px-1 py-0.5 text-sm">{children}</code>
                )
              }
            }}
          >
            {content}
          </ReactMarkdown>
        </div>
        
        {isUser && (
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-800 flex items-center justify-center text-white">
            <User size={18} />
          </div>
        )}
      </div>
    </motion.div>
  );
}