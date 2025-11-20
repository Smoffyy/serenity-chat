"use client";

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import remarkBreaks from 'remark-breaks'; 
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

import 'highlight.js/styles/atom-one-dark.css';

interface MessageBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  showCursor?: boolean; 
}

// Blinking Cursor Component - UPDATED STYLING
const TypingCursor = () => (
    <motion.span
        aria-hidden="true"
        className="inline-block w-[10px] h-4 ml-0.5 bg-white align-middle translate-y-[0px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{
            duration: 0.5,
            repeat: Infinity,
            repeatType: "reverse",
            ease: "easeInOut",
        }}
    />
);


export const MessageBubble: React.FC<MessageBubbleProps> = ({ role, content, showCursor = false }) => {
  const isUser = role === 'user';

  // ReactMarkdown Components (Used when NOT streaming or for User messages)
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
      <blockquote className="border-l-4 border-zinc-600 pl-4 italic text-zinc-400 my-4">{children}</blockquote>
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
    table: ({ children }) => (
      <div className="w-full overflow-x-auto my-4 rounded-lg border border-zinc-700">
        <table className="w-full text-sm text-left border-collapse">{children}</table>
      </div>
    ),
    th: ({ children }) => (
      <th className="px-4 py-2 bg-zinc-800 border-b border-zinc-700 font-semibold text-zinc-300">{children}</th>
    ),
    td: ({ children }) => (
      <td className="px-4 py-2 border-b border-zinc-800 last:border-b-0 even:bg-zinc-900/50">{children}</td>
    ),
    tr: ({ children }) => (
        <tr className="border-b border-zinc-700 last:border-b-0 hover:bg-zinc-800/20 transition-colors">{children}</tr>
    ),
    br: () => <br />,
  };
  
  // Conditional content rendering based on streaming status
  const renderedContent = showCursor && !isUser
    ? (() => {
        // --- LIVE MARKDOWN STREAMING LOGIC ---
        
        const contentToParse = content;
        let finalMarkdown = '';
        let streamingChunk = '';

        // Safest Heuristic: Split content into a safe-to-parse part and a raw streaming part.
        // We find the index of the last *complete* block break (\n\n).
        const lastBlockBreakIndex = contentToParse.lastIndexOf('\n\n');

        if (lastBlockBreakIndex !== -1) {
            // Everything *before* the last block break is considered safe Markdown.
            // We use lastBlockBreakIndex for the substring length.
            finalMarkdown = contentToParse.substring(0, lastBlockBreakIndex);
            
            // The rest, starting from the lastBlockBreakIndex, is the raw chunk.
            streamingChunk = contentToParse.substring(lastBlockBreakIndex);
            
        } else {
            // If no major break, the entire content is treated as a raw chunk.
            finalMarkdown = '';
            streamingChunk = contentToParse;
        }

        return (
            <>
                {/* 1. Render the fully parsed Markdown blocks */}
                {finalMarkdown.length > 0 && (
                    <div className="inline">
                      <ReactMarkdown
                        components={MarkdownComponents}
                        // ADDED REMARK-MATH
                        remarkPlugins={[remarkGfm, remarkBreaks, remarkMath]} 
                        // ADDED REHYPE-KATEX
                        rehypePlugins={[rehypeHighlight, rehypeKatex]}
                        // Adding key helps ReactMarkdown re-parse correctly as finalMarkdown grows
                        key={finalMarkdown.length} 
                        skipHtml={false}
                      >
                        {finalMarkdown}
                      </ReactMarkdown>
                    </div>
                )}
                
                {/* 2. Render the raw, streaming chunk + cursor */}
                <span className="whitespace-pre-wrap break-words leading-7 text-zinc-100 inline">
                    {streamingChunk}
                    <TypingCursor />
                </span>
            </>
        );
    })()
    : (
        // Strategy 3: If complete or user message, use ReactMarkdown for full formatting
        <ReactMarkdown
          components={MarkdownComponents}
          // ADDED REMARK-MATH
          remarkPlugins={[remarkGfm, remarkBreaks, remarkMath]} 
          // ADDED REHYPE-KATEX
          rehypePlugins={[rehypeHighlight, rehypeKatex]}
          skipHtml={false}
        >
          {content}
        </ReactMarkdown>
      );

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn('w-full py-2', isUser ? 'flex justify-end' : 'flex justify-start')}
    >
      <div
        className={cn(
          isUser
            ? 'w-fit max-w-[85%] sm:max-w-[70%] bg-[#2f2f2f] text-zinc-100 px-5 py-3 rounded-[26px] rounded-tr-sm shadow-lg' 
            : 'w-full max-w-full' 
        )}
      >
        <div className={cn('prose prose-invert max-w-none', isUser ? 'text-[15px]' : 'text-[16px]')}>
          {renderedContent}
        </div>
      </div>
    </motion.div>
  );
};