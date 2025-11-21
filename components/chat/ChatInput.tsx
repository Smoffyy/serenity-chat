"use client";

import React from "react";
import { motion } from "framer-motion";
import { Send, Loader2, Terminal } from "lucide-react";
import { cn } from "@/lib/utils";
import { spring, inputGlowVariants, layoutSpring } from "./animations";

interface ChatInputProps {
  input: string;
  isLoading: boolean;
  isInitialState: boolean;
  isInputFocused: boolean;
  onInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onKeyUp: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onFocus: () => void;
  onBlur: () => void;
  onSubmit: (e: React.FormEvent) => void;
  inputRef: React.RefObject<HTMLTextAreaElement>;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  input,
  isLoading,
  isInitialState,
  isInputFocused,
  onInputChange,
  onKeyDown,
  onKeyUp,
  onFocus,
  onBlur,
  onSubmit,
  inputRef,
}) => {
  return (
    <motion.div
      layout
      transition={layoutSpring}
      className={cn(
        "bg-[#06060a] select-none w-full z-20",
        isInitialState
          ? "absolute inset-0 flex flex-col items-center justify-center p-4"
          : "flex-none p-6 pt-2 border-t border-zinc-800/50"
      )}
    >
      {isInitialState && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20, transition: { duration: 0.3 } }}
          className="flex flex-col items-center justify-center mb-8"
        >
          <div className="w-16 h-16 rounded-3xl bg-zinc-800/50 flex items-center justify-center mb-4 shadow-2xl border border-zinc-700/70 backdrop-blur-sm">
            <Terminal size={32} className="text-zinc-100" />
          </div>
          <h2 className="text-2xl font-semibold text-zinc-100">
            Hello! How can I help you?
          </h2>
        </motion.div>
      )}

      <div
        className={cn(
          "mx-auto relative group transition-all",
          isInitialState ? "max-w-3xl w-full" : "max-w-4xl"
        )}
      >
        <motion.div
          className="absolute inset-0 bg-zinc-500/20 rounded-[28px] blur-xl"
          variants={inputGlowVariants}
          initial="unfocused"
          animate={
            isLoading ? "focused" : isInputFocused ? "focused" : "unfocused"
          }
        />

        <form
          onSubmit={onSubmit}
          className={cn(
            "relative flex flex-col bg-zinc-900 border rounded-[28px] shadow-2xl transition-all overflow-hidden",
            isLoading
              ? "border-zinc-500/50 ring-2 ring-zinc-500/50 opacity-90"
              : isInputFocused
              ? "border-zinc-500/50 ring-2 ring-zinc-500/50"
              : "border-zinc-700/50",
            isInitialState ? "min-h-[48px]" : "min-h-[56px]"
          )}
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={onInputChange}
            onKeyDown={onKeyDown}
            onKeyUp={onKeyUp}
            onFocus={onFocus}
            onBlur={onBlur}
            placeholder={
              isLoading
                ? "Generating response..."
                : isInitialState
                ? "How can I help you today?"
                : "Message..."
            }
            rows={1}
            wrap="off"
            disabled={isLoading}
            className={cn(
              "w-full bg-transparent text-zinc-100 placeholder:text-zinc-500 text-base focus:outline-none max-h-[200px] overflow-hidden leading-relaxed max-w-full transition-all",
              isInitialState
                ? "px-4 py-3 min-h-[48px]"
                : "px-5 py-4 min-h-[56px]"
            )}
            style={{
              resize: "none",
              overflowX: "hidden",
              overflowY: "auto",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          />
          <div
            className={cn(
              "flex justify-end items-center transition-all",
              isInitialState ? "px-2 pb-2 pt-0" : "px-3 pb-3 pt-1"
            )}
          >
            <motion.button
              type="submit"
              disabled={isLoading || !input.trim()}
              className={cn(
                "p-2 rounded-full transition-all duration-200",
                input.trim()
                  ? "bg-zinc-100 text-zinc-900 hover:bg-white shadow-md shadow-zinc-500/30"
                  : "bg-zinc-700 text-zinc-500 cursor-not-allowed",
                isInitialState ? "mb-0" : "mb-0.5"
              )}
              whileTap={
                !isLoading && input.trim()
                  ? { scale: 0.85, rotate: 10 }
                  : {}
              }
              transition={spring}
            >
              {isLoading ? (
                <Loader2
                  size={16}
                  className="animate-spin"
                  strokeWidth={2.5}
                />
              ) : (
                <Send size={16} strokeWidth={2.5} />
              )}
            </motion.button>
          </div>
        </form>

        <div
          className={cn(
            "text-center transition-all",
            isInitialState ? "mt-4" : "mt-3"
          )}
        >
          <p className="text-[11px] text-zinc-600">
            AI can make mistakes. Please use responsibly.
          </p>
        </div>
      </div>
    </motion.div>
  );
};