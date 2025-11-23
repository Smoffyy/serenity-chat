"use client";

import React, { useState, useEffect, useRef, Children } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import remarkBreaks from "remark-breaks";
import { cn } from "@/lib/utils";
import { motion, type Transition, AnimatePresence } from "framer-motion";
import { Copy, Check, Brain, ChevronRight, ChevronDown, Loader2 } from "lucide-react";
import { parseReasoning } from "@/lib/reasoning-parser";

import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

import "highlight.js/styles/atom-one-dark.css";

interface CodeBlockProps {
  children: React.ReactNode;
  className?: string;
  inline?: boolean;
}

const getCodeContent = (children: React.ReactNode): string => {
    if (Array.isArray(children)) {
        return children.map(child => {
            if (typeof child === 'string') return child;
            if (React.isValidElement(child) && child.props.children) {
                return getCodeContent(child.props.children);
            }
            return '';
        }).join('');
    }
    if (typeof children === 'string') {
        return children;
    }
    return '';
}

const CodeBlock: React.FC<CodeBlockProps> = ({ children, className, inline, ...props }) => {
  const [copied, setCopied] = useState(false);
  
  const codeContent = getCodeContent(children).trim(); 
  
  const match = /language-(\w+)/.exec(className || "");
  const language = match ? match[1] : '';

  const handleCopy = () => {
    navigator.clipboard.writeText(codeContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (inline) {
    return (
      <code className={cn(className, "break-words whitespace-pre-wrap")} {...props}>
        {children}
      </code>
    );
  }

  return (
    <div className="relative group/code my-4 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-800/80 text-xs font-mono text-zinc-400 border-b border-zinc-700/50">
        <span className="capitalize">{language || 'code'}</span>
        <motion.button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-zinc-700/50 hover:bg-zinc-700 text-zinc-300 transition-colors"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {copied ? (
            <>
              <Check size={14} className="text-emerald-400" />
              <span className="text-emerald-400">Copied!</span>
            </>
          ) : (
            <>
              <Copy size={14} />
              <span>Copy Code</span>
            </>
          )}
        </motion.button>
      </div>
      <pre className="p-4 bg-zinc-900 overflow-x-auto">
        <code className={cn(className, "break-words whitespace-pre-wrap")} {...props}>
          {children}
        </code>
      </pre>
    </div>
  );
};


interface ReasoningProps {
  content: string;
  isThinking: boolean; 
}

const Reasoning: React.FC<ReasoningProps> = ({ content, isThinking }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isThinking && !isExpanded && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [content, isThinking, isExpanded]);

  if (!content) return null;

  return (
    <div className="mb-2 w-full">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors select-none mb-1"
      >
        {isThinking ? (
          <Loader2 size={12} className="animate-spin text-[var(--accent-color)]" />
        ) : (
          <Brain size={12} />
        )}
        <span className={cn(isThinking && "text-[var(--accent-color)]")}>
          {isThinking ? "Thinking..." : "Thought Process"}
        </span>
        {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
      </button>

      <AnimatePresence initial={false} mode="wait">
        {isExpanded ? (
          <motion.div
            key="expanded"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            className="overflow-hidden"
          >
            <div className="bg-[var(--bg-tertiary)]/40 p-3 rounded-xl border border-[var(--border-color)] text-[var(--text-secondary)] text-xs leading-relaxed border-l-2 border-l-[var(--accent-color)]/50 prose prose-invert prose-sm max-w-none break-words">
              <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkBreaks]}
                rehypePlugins={[rehypeHighlight]}
                components={{
                  p: ({ children }) => (
                    <div className="mb-2 last:mb-0 leading-relaxed whitespace-pre-wrap break-words block">
                      {children}
                    </div>
                  ),
                }}
              >
                {content}
              </ReactMarkdown>
            </div>
          </motion.div>
        ) : isThinking ? (
          <motion.div
            key="preview"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative w-full"
          >
            <div
              ref={scrollRef}
              className="h-24 overflow-hidden relative bg-[var(--bg-tertiary)]/20 rounded-lg border border-[var(--border-color)] w-full"
            >
              <div className="absolute inset-0 bg-gradient-to-b from-[var(--bg-primary)]/90 via-transparent to-transparent z-10 pointer-events-none h-12" />
              
              <div className="p-3 text-xs text-[var(--text-secondary)] font-mono leading-relaxed min-h-full flex flex-col justify-end">
                 <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkBreaks]}
                    components={{
                      p: ({ children }) => (
                        <div className="mb-2 last:mb-0 leading-relaxed whitespace-pre-wrap break-words block">
                          {children}
                        </div>
                      ),
                    }}
                 >
                    {content}
                 </ReactMarkdown>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
};

interface MessageBubbleProps {
  role: "user" | "assistant";
  content: string;
  isGenerating?: boolean;
}

const spring: Transition = {
  type: "spring",
  stiffness: 400,
  damping: 30,
};

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  role,
  content,
  isGenerating = false,
}) => {
  const isUser = role === "user";
  const [copied, setCopied] = useState(false);

  const { reasoningContent, mainContent } = parseReasoning(content);

  const isThinking = isGenerating && !isUser && reasoningContent.length > 0 && mainContent.trim().length === 0;
  const showReasoning = !isUser && reasoningContent.length > 0;
  const contentToDisplay = mainContent.trim();
  
  const showMainCopyButton = !isUser && !isGenerating && contentToDisplay.length > 0;

  const handleCopy = () => {
    navigator.clipboard.writeText(contentToDisplay || reasoningContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderedContent = (
    <>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks, remarkMath]}
        rehypePlugins={[rehypeHighlight, rehypeKatex]}
        components={{
          p: ({ children }) => (
            <div className="mb-3 last:mb-0 leading-relaxed whitespace-pre-wrap break-words block">
              {children}
            </div>
          ),
          ul: ({ children }) => (
            <ul className="list-disc list-outside space-y-1 mb-4 pl-5">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-outside space-y-1 mb-4 pl-5">
              {children}
            </ol>
          ),
          h1: ({ children }) => (
            <h1 className="text-2xl font-bold mt-6 mb-4 text-[var(--text-primary)]">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xl font-bold mt-5 mb-3 text-[var(--text-primary)] border-b border-[var(--border-color)] pb-2">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-lg font-bold mt-4 mb-2 text-[var(--text-primary)]">{children}</h3>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--accent-color)] hover:underline"
            >
              {children}
            </a>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-[var(--accent-color)] pl-4 italic text-[var(--text-secondary)] my-4 bg-[var(--bg-tertiary)]/50 p-2 rounded-r-lg">
              {children}
            </blockquote>
          ),
          code: (props) => <CodeBlock {...props} />,
          table: ({ children }) => (
            <div className="w-full overflow-x-auto my-4 rounded-lg border border-[var(--border-color)]">
              <table className="w-full text-sm text-left border-collapse">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th className="px-4 py-2 bg-[var(--bg-tertiary)] border-b border-[var(--border-color)] font-semibold text-[var(--text-primary)]">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-4 py-2 border-b border-[var(--border-color)] last:border-b-0 even:bg-[var(--bg-tertiary)]/20">
              {children}
            </td>
          ),
          tr: ({ children }) => (
            <tr className="border-b border-[var(--border-color)] last:border-b-0 hover:bg-[var(--bg-tertiary)]/20 transition-colors">
              {children}
            </tr>
          ),
        }}
      >
        {contentToDisplay}
      </ReactMarkdown>
    </>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={spring}
      className={cn(
        "w-full py-2",
        isUser ? "flex justify-end" : "flex flex-col justify-start"
      )}
    >
      <div
        className={cn(
          "relative max-w-full",
          isUser
            ? "bg-[var(--user-msg-bg)] text-[var(--text-primary)] px-5 py-3 rounded-[26px] rounded-tr-sm shadow-lg break-words overflow-x-auto"
            : "w-full"
        )}
        style={isUser ? { maxWidth: "85%", wordBreak: "break-word", overflowWrap: "break-word" } : {}}
      >
        <div className={cn("prose prose-invert max-w-none w-full", isUser ? "text-[15px]" : "text-[16px]")}>
          
          {showReasoning && <Reasoning content={reasoningContent} isThinking={isThinking} />}

          {(contentToDisplay.length > 0 || (!isThinking && !isUser)) && (
             <div className="min-h-[1.5rem] w-full">
               {renderedContent}
             </div>
          )}
          
        </div>
      </div>

      {showMainCopyButton && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleCopy}
          className="flex items-center gap-2 mt-2 px-3 py-1.5 rounded-lg bg-[var(--bg-tertiary)] hover:bg-[var(--border-color)] text-[var(--text-secondary)] text-xs font-medium transition-colors self-start"
        >
          {copied ? (
            <>
              <Check size={14} className="text-emerald-400" />
              <span className="text-emerald-400">Copied!</span>
            </>
          ) : (
            <>
              <Copy size={14} />
              <span>Copy</span>
            </>
          )}
        </motion.button>
      )}
    </motion.div>
  );
};