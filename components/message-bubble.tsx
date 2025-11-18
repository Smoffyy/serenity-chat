import { Bot, User } from 'lucide-react';
import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight'; 
import 'highlight.js/styles/atom-one-dark.css'; 
import { cn } from '@/lib/utils';


interface MessageBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  modelColor: string;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ role, content, modelColor }) => {
  const isUser = role === 'user';
  
  // Custom components for ReactMarkdown to apply the tightest Tailwind styles
  const MarkdownComponents: Record<string, React.FC<any>> = {
    // Tighter vertical spacing
    p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>, 
    
    // Tighter list spacing
    ul: ({ children }) => <ul className="list-disc list-inside space-y-0.5 mb-1 pl-3">{children}</ul>,
    ol: ({ children }) => <ol className="list-decimal list-inside space-y-0.5 mb-1 pl-3">{children}</ol>,
    
    // Tighter heading spacing
    h1: ({ children }) => <h1 className="text-xl font-bold mt-3 mb-2">{children}</h1>,
    h2: ({ children }) => <h2 className="text-lg font-bold mt-3 mb-1 border-b border-zinc-200 dark:border-zinc-700 pb-0.5">{children}</h2>,
    h3: ({ children }) => <h3 className="text-base font-bold mt-2 mb-0.5">{children}</h3>,
    
    // Tighter code block spacing
    code: ({ node, className, children, ...props }) => {
      const match = /language-(\w+)/.exec(className || '');
      if (!match) {
        // Inline code
        return <code className="bg-zinc-200 dark:bg-zinc-700 px-1 py-0.5 rounded text-sm font-mono" {...props}>{children}</code>;
      }
      
      // Code block
      return (
        <pre className="mt-1 mb-1 rounded-lg overflow-x-auto p-2 bg-zinc-900">
          <code className={cn(className, "text-sm")} {...props}>
            {children}
          </code>
        </pre>
      );
    },
    
    // Tighter blockquote spacing
    blockquote: ({ children }) => (
      <blockquote className="border-l-4 border-blue-500 pl-3 py-1 italic text-zinc-600 dark:text-zinc-400 my-2">
        {children}
      </blockquote>
    ),
  };

  return (
    // Outer flex container remains w-full for centering logic in chat-interface.tsx
    <div className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}>
      <div 
        className={cn(
          // Maximum width of the bubble within the centered container
          "flex items-start gap-3 max-w-3xl", 
          isUser ? "flex-row-reverse" : "flex-row"
        )}
      >
        {/* Avatar */}
        <div 
          className={cn(
            "p-2 rounded-full flex-shrink-0",
            isUser ? "bg-blue-600" : "bg-transparent border-2"
          )}
          style={!isUser ? { borderColor: modelColor, color: modelColor } : {}}
        >
          {isUser ? <User size={18} className="text-white" /> : <Bot size={18} />}
        </div>
        
        {/* Message Content */}
        <div 
          className={cn(
            // Reduced padding p-2 for minimum spacing
            "p-2 rounded-2xl shadow-md text-base leading-relaxed", 
            isUser 
              ? "bg-blue-600 text-white rounded-br-none" 
              : "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-tl-none border border-zinc-200 dark:border-zinc-700"
          )}
        >
          {/* Renders content as Markdown for both user and assistant */}
          <ReactMarkdown
            components={MarkdownComponents}
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeHighlight]}
          >
            {content}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
};