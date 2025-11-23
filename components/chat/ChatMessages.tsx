"use client";

import React, { memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Terminal } from "lucide-react";
import { MessageBubble } from "../message-bubble";
import type { Message } from "./types";
import { cn } from "@/lib/utils";

interface ChatMessagesProps {
  messages: Message[];
  isLoading: boolean;
  isInitialState: boolean;
  scrollContainerRef: React.RefObject<HTMLDivElement>;
  onScroll: () => void;
  animationsEnabled: boolean;
}

const BouncingLoader = () => {
  const dotTransition = {
    duration: 0.6,
    repeat: Infinity,
    ease: "easeInOut",
  };

  return (
    <div className="flex items-center gap-1.5 h-5 px-1">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-2 h-2 bg-[var(--text-secondary)] rounded-full"
          animate={{
            y: ["0%", "-50%", "0%"],
            opacity: [0.4, 1, 0.4],
          }}
          transition={{
            ...dotTransition,
            delay: i * 0.15,
          }}
        />
      ))}
    </div>
  );
};

const MemoizedMessageBubble = memo(MessageBubble, (prev, next) => {
  return (
    prev.content === next.content &&
    prev.role === next.role &&
    prev.isGenerating === next.isGenerating
  );
});

export const ChatMessages: React.FC<ChatMessagesProps> = ({
  messages,
  isLoading,
  isInitialState,
  scrollContainerRef,
  onScroll,
  animationsEnabled,
}) => {
  return (
    <div
      className={cn(
        "flex-1 flex flex-col relative z-10 overflow-hidden",
        isInitialState ? "justify-center items-center" : "justify-end",
        // Only apply transition class if animations are enabled
        animationsEnabled && "transition-all duration-500 ease-in-out"
      )}
    >
      <div
        ref={scrollContainerRef}
        onScroll={onScroll}
        className={cn(
          "w-full",
          isInitialState ? "hidden h-0" : "flex-1 min-h-0 pt-4 pb-4 overflow-y-auto"
        )}
      >
        <div className="max-w-4xl mx-auto px-4">
          <AnimatePresence initial={false}>
            {messages.map((m) => (
              <MemoizedMessageBubble
                key={m.id}
                {...m}
                isGenerating={
                  isLoading &&
                  m.id === messages[messages.length - 1]?.id &&
                  m.role === "assistant"
                }
                // Pass animationsEnabled down if MessageBubble needs it (it doesn't currently use it for entry)
              />
            ))}
          </AnimatePresence>

          {isLoading &&
            messages.length > 0 &&
            messages[messages.length - 1]?.role === "user" && (
              <div className="flex justify-start w-full py-2">
                  <div className="px-4 py-2 bg-[var(--bg-secondary)] rounded-[26px] rounded-tl-sm">
                    {/* Only animate the loader if enabled */}
                    {animationsEnabled ? <BouncingLoader /> : <span className="text-sm text-[var(--text-secondary)]">Thinking...</span>}
                  </div>
              </div>
            )}

          <div className="h-4" />
        </div>
      </div>

      <AnimatePresence>
        {isInitialState && (
          <motion.div
            // Conditionally apply animation props based on setting
            initial={animationsEnabled ? { opacity: 0, y: 20 } : false}
            animate={{ opacity: 1, y: 0 }}
            exit={animationsEnabled ? { opacity: 0, y: -20 } : false}
            className="flex flex-col items-center justify-center mb-8 z-10 absolute inset-0"
          >
            <div className="w-16 h-16 rounded-3xl bg-[var(--bg-secondary)] flex items-center justify-center mb-4 shadow-2xl border border-[var(--border-color)] backdrop-blur-sm">
              <Terminal size={32} className="text-[var(--text-primary)]" />
            </div>
            <h2 className="text-2xl font-semibold text-[var(--text-primary)]">
              Hello! How can I help you?
            </h2>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};