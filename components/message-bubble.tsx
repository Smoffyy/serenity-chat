"use client";

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import remarkBreaks from 'remark-breaks'; 
import 'highlight.js/styles/atom-one-dark.css';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface MessageBubbleProps {
  role: 'user' | 'assistant';
  content: string;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ role, content }) => {
  const isUser = role === 'user';

  const MarkdownComponents: Record<string, React.FC<any>> = {
    p: ({ children }) => <p className="mb-3 last:mb-0 leading-7 whitespace-pre-wrap break-words">{children}</p>,
    ul: ({ children }) => <ul className="list-disc list-outside space-y-1 mb-4 pl-5">{children}</ul>,
    ol: ({ children }) => <ol className="list-decimal list-outside space-y-1 mb-4 pl-5">{children}</ol>,
    h1: ({ children }) => <h1 className="text-2xl font-bold mt-6 mb-4 text-zinc-100">{children}</h1>,
    h2: ({ children }) => <h2 className="text-xl font-bold mt-5 mb-3 text-zinc-100 border-b border-zinc-800 pb-2">{children}</h2>,
    h3: ({ children }) => <h3 className="text-lg font-bold mt-4 mb-2 text-zinc-100">{children}</h3>,
    a: ({ href, children }) => (
      <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
        {children}
      </a>
    ),
    blockquote: ({ children }) => (
      <blockquote className="border-l-2 border-zinc-600 pl-4 italic text-zinc-400 my-4">{children}</blockquote>
    ),
    code: ({ node, className, children, ...props }) => {
      const match = /language-(\w+)/.exec(className || '');
      const isInline = !match;

      if (isInline) {
        return (
          <code className="bg-zinc-800 px-1.5 py-0.5 rounded text-sm font-mono text-zinc-200" {...props}>
            {children}
          </code>
        );
      }

      return (
        <div className="my-4 rounded-lg overflow-hidden border border-zinc-800 bg-[#0d0d0d]">
          <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-900 border-b border-zinc-800">
            <span className="text-xs text-zinc-500 font-medium">{match![1]}</span>
          </div>
          <div className="p-4 overflow-x-auto">
            <code className={cn(className, 'text-sm font-mono')} {...props}>
              {children}
            </code>
          </div>
        </div>
      );
    },
    br: () => <br />,
    text: ({ children }) => <span className="whitespace-pre-wrap break-words">{children}</span>,
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn('w-full py-2', isUser ? 'flex justify-end' : 'flex justify-start')}
    >
      <div
        className={cn(
          'max-w-3xl', // Base max width for all content
          isUser
            ? 'w-fit bg-[#2f2f2f] text-zinc-100 px-5 py-3 rounded-[26px] rounded-tr-sm max-w-[85%] md:max-w-[70%]' // w-fit makes the bubble shrink to content
            : 'w-full' // AI messages use the full width up to max-w-3xl
        )}
      >
        <div className={cn('prose prose-invert max-w-none', isUser ? 'text-[15px]' : 'text-[16px]')}>
          <ReactMarkdown
            components={MarkdownComponents}
            remarkPlugins={[remarkGfm, remarkBreaks]}
            rehypePlugins={[rehypeHighlight]}
            skipHtml={false}
          >
            {content}
          </ReactMarkdown>
        </div>
      </div>
    </motion.div>
  );
};