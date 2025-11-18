import { Bot, User } from 'lucide-react';
import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight'; // For syntax highlighting in code blocks
import 'highlight.js/styles/atom-one-dark.css'; // Add a CSS style for the highlighting
import { cn } from '@/lib/utils';


interface MessageBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  modelColor: string;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ role, content, modelColor }) => {
  const isUser = role === 'user';
  
  // Custom components for ReactMarkdown to apply Tailwind styles
  const MarkdownComponents: Record<string, React.FC<any>> = {
    // Standard paragraph element
    p: ({ children }) => <p className="mb-4 last:mb-0">{children}</p>,
    
    // Lists
    ul: ({ children }) => <ul className="list-disc list-inside space-y-2 mb-4 pl-4">{children}</ul>,
    ol: ({ children }) => <ol className="list-decimal list-inside space-y-2 mb-4 pl-4">{children}</ol>,
    
    // Headings
    h1: ({ children }) => <h1 className="text-2xl font-bold mt-6 mb-4">{children}</h1>,
    h2: ({ children }) => <h2 className="text-xl font-bold mt-5 mb-3 border-b border-zinc-200 dark:border-zinc-700 pb-1">{children}</h2>,
    h3: ({ children }) => <h3 className="text-lg font-bold mt-4 mb-2">{children}</h3>,
    
    // Code blocks
    code: ({ node, className, children, ...props }) => {
      const match = /language-(\w+)/.exec(className || '');
      // Check if it's an inline code snippet (no language match) or a code block
      if (!match) {
        return <code className="bg-zinc-200 dark:bg-zinc-700 px-1 py-0.5 rounded text-sm font-mono" {...props}>{children}</code>;
      }
      
      // Render code block with syntax highlighting
      return (
        <pre className="mt-4 mb-4 rounded-xl overflow-x-auto p-4 bg-zinc-900">
          <code className={cn(className, "text-sm")} {...props}>
            {children}
          </code>
        </pre>
      );
    },
    
    // Blockquotes
    blockquote: ({ children }) => (
      <blockquote className="border-l-4 border-blue-500 pl-4 py-1 italic text-zinc-600 dark:text-zinc-400 my-4">
        {children}
      </blockquote>
    ),
  };

  return (
    <div className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}>
      <div 
        className={cn(
          "flex items-start gap-4 max-w-3xl",
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
            "p-4 rounded-2xl shadow-md text-base leading-relaxed",
            isUser 
              ? "bg-blue-600 text-white rounded-br-none" 
              : "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-tl-none border border-zinc-200 dark:border-zinc-700"
          )}
        >
          {/* Implement Markdown Rendering */}
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