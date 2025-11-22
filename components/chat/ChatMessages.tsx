"use client";

import React, { memo } from "react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { Terminal } from "lucide-react";
// FIXED IMPORT: Adjusted path to point to the parent components folder
import { MessageBubble } from "../message-bubble";
import type { Message } from "./types";
import { cn } from "@/lib/utils";

interface ChatMessagesProps {
  messages: Message[];
  isLoading: boolean;
  isCursorEnabled: boolean;
  isInitialState: boolean;
  scrollContainerRef: React.RefObject<HTMLDivElement>;
  onScroll: () => void;
}

const TypingCursor = () => (
  <motion.span
    aria-hidden="true"
    className="inline-block w-[10px] h-4 ml-0.5 bg-white align-middle translate-y-[0px]"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{
      duration: 0.5,
      repeat: Infinity,
      repeatType: "reverse" as const,
      ease: "easeInOut",
    }}
  />
);

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
          className="w-2 h-2 bg-zinc-500 rounded-full"
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
    prev.showCursor === next.showCursor &&
    prev.isGenerating === next.isGenerating
  );
});

export const ChatMessages: React.FC<ChatMessagesProps> = ({
  messages,
  isLoading,
  isCursorEnabled,
  isInitialState,
  scrollContainerRef,
  onScroll,
}) => {
  return (
    // REMOVED LayoutGroup to prevent global layout thrashing during streams
    <div
      className={cn(
        "flex-1 flex flex-col relative z-10 transition-all duration-500 ease-in-out overflow-hidden",
        isInitialState ? "justify-center items-center" : "justify-end"
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
                showCursor={
                  isLoading &&
                  isCursorEnabled &&
                  m.id === messages[messages.length - 1]?.id &&
                  m.role === "assistant"
                }
              />
            ))}
          </AnimatePresence>

          {isLoading &&
            messages.length > 0 &&
            messages[messages.length - 1]?.role === "user" && (
              <div className="flex justify-start w-full py-2">
                {isCursorEnabled ? (
                  <div className="bg-zinc-1000 text-zinc-100 px-5 py-3 rounded-[24px] rounded-tl-sm shadow-lg text-[16px]">
                    <motion.span
                      className="text-zinc-500"
                      initial={{ scale: 0.95 }}
                      animate={{ scale: 1.05 }}
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                        repeatType: "reverse",
                      }}
                    />
                    <TypingCursor />
                  </div>
                ) : (
                  <div className="px-4 py-2">
                    <BouncingLoader />
                  </div>
                )}
              </div>
            )}

          <div className="h-4" />
        </div>
      </div>

      <AnimatePresence>
        {isInitialState && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20, transition: { duration: 0.3 } }}
            className="flex flex-col items-center justify-center mb-8 z-10 absolute inset-0 flex items-center justify-center"
          >
            <div className="w-16 h-16 rounded-3xl bg-zinc-800/50 flex items-center justify-center mb-4 shadow-2xl border border-zinc-700/70 backdrop-blur-sm">
              <Terminal size={32} className="text-zinc-100" />
            </div>
            <h2 className="text-2xl font-semibold text-zinc-100">
              Hello! How can I help you?
            </h2>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};