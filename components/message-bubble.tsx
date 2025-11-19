import { Bot, User } from 'lucide-react';
import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight'; 
import 'highlight.js/styles/atom-one-dark.css'; 
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion'; 

interface MessageBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  modelColor: string;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ role, content, modelColor }) => {
  const isUser = role === 'user';
  
  // Custom components for ReactMarkdown to apply the tightest Tailwind styles
  const MarkdownComponents: Record<string, React.FC<any>> = {
    p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>, 
    ul: ({ children }) => <ul className="list-disc list-inside space-y-0.5 mb-1 pl-3">{children}</ul>,
    ol: ({ children }) => <ol className="list-decimal list-inside space-y-0.5 mb-1 pl-3">{children}</ol>,
    
    // Heading styling with gradient accents
    h1: ({ children }) => <h1 className="text-xl font-extrabold mt-3 mb-2 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">{children}</h1>,
    h2: ({ children }) => <h2 className="text-lg font-bold mt-3 mb-1 border-b border-zinc-700 pb-0.5 text-blue-300">{children}</h2>,
    h3: ({ children }) => <h3 className="text-base font-bold mt-2 mb-0.5 text-purple-300">{children}</h3>,
    
    // Code block styling
    code: ({ node, className, children, ...props }) => {
      const match = /language-(\w+)/.exec(className || '');
      if (!match) {
        // Inline code
        return <code className="bg-zinc-700 px-1 py-0.5 rounded text-sm font-mono text-cyan-300" {...props}>{children}</code>;
      }
      
      // Code block
      return (
        <pre className="mt-1 mb-1 rounded-lg overflow-x-auto p-4 bg-zinc-900 shadow-inner">
          <code className={cn(className, "text-sm")} {...props}>
            {children}
          </code>
        </pre>
      );
    },
    
    // Blockquote styling
    blockquote: ({ children }) => (
      <blockquote className="border-l-4 border-purple-500 pl-3 py-1 italic text-zinc-400 my-2 bg-zinc-700/30 rounded-r-md">
        {children}
      </blockquote>
    ),
  };

  return (
    <motion.div
        initial={{ opacity: 0, y: isUser ? 10 : -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}
    >
      <div 
        className={cn(
          "flex items-start gap-3 max-w-3xl", 
          isUser ? "flex-row-reverse" : "flex-row"
        )}
      >
        {/* Avatar */}
        <div 
          className={cn(
            "p-2 rounded-full flex-shrink-0 shadow-lg",
            isUser ? "bg-gradient-to-br from-blue-500 to-cyan-500" : "bg-transparent border-2"
          )}
          style={!isUser ? { borderColor: modelColor, color: modelColor } : {}}
        >
          {isUser ? <User size={18} className="text-white" /> : <Bot size={18} />}
        </div>
        
        {/* Message Content */}
        <div 
          className={cn(
            "p-3 rounded-2xl shadow-xl text-base leading-relaxed transition-colors duration-300", 
            isUser 
              ? "bg-gradient-to-br from-blue-600 to-cyan-600 text-white rounded-br-none" 
              : "bg-zinc-800 text-zinc-100 rounded-tl-none border border-zinc-700 hover:shadow-2xl hover:shadow-zinc-950/50"
          )}
        >
          {/* CRITICAL: No skipHtml prop is used, so it treats all content as Markdown/Text */}
          <ReactMarkdown
            components={MarkdownComponents}
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeHighlight]}
          >
            {content}
          </ReactMarkdown>
        </div>
      </div>
    </motion.div>
  );
};