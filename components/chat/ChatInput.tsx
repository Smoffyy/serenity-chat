"use client";

import React from "react";
import { motion } from "framer-motion";
import { Send, Loader2, Terminal, Square } from "lucide-react";
import { cn } from "@/lib/utils";
import { inputGlowVariants } from "./animations";

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
  onStop: () => void;
  inputRef: React.RefObject<HTMLTextAreaElement>;
  animationsEnabled: boolean;
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
  onStop,
  inputRef,
  animationsEnabled,
}) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (isLoading) {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
      }
      return;
    }
    onKeyDown(e);
  };

  return (
    <motion.div
      layout={animationsEnabled}
      className={cn(
        "bg-[var(--bg-primary)] select-none w-full z-20",
        isInitialState
          ? "absolute inset-0 flex flex-col items-center justify-center p-4"
          : "flex-none p-6 pt-2 border-t border-[var(--border-color)]"
      )}
    >
      {isInitialState && (
        <motion.div
          initial={animationsEnabled ? { opacity: 0, y: 20 } : false}
          animate={{ opacity: 1, y: 0 }}
          exit={animationsEnabled ? { opacity: 0, y: -20 } : false}
          className="flex flex-col items-center justify-center mb-8"
        >
          <div className="w-16 h-16 rounded-3xl bg-[var(--bg-secondary)] flex items-center justify-center mb-4 shadow-2xl border border-[var(--border-color)] backdrop-blur-sm">
            <Terminal size={32} className="text-[var(--text-primary)]" />
          </div>
          <h2 className="text-2xl font-semibold text-[var(--text-primary)]">
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
        {/* Conditionally render glow effect based on animationsEnabled */}
        {animationsEnabled && (
          <motion.div
            className="absolute inset-0 bg-[var(--accent-color)]/20 rounded-[28px] blur-xl"
            variants={inputGlowVariants}
            initial="unfocused"
            animate={
              isLoading ? "focused" : isInputFocused ? "focused" : "unfocused"
            }
          />
        )}

        <form
          onSubmit={(e) => {
            if (isLoading) {
              e.preventDefault();
              return;
            }
            onSubmit(e);
          }}
          className={cn(
            "relative flex flex-col bg-[var(--input-bg)] border rounded-[28px] shadow-2xl transition-all overflow-hidden",
            isLoading
              ? "border-[var(--accent-color)]/50 ring-2 ring-[var(--accent-color)]/50 opacity-90"
              : isInputFocused
              ? "border-[var(--accent-color)]/50 ring-2 ring-[var(--accent-color)]/50"
              : "border-[var(--border-color)]",
            isInitialState ? "min-h-[48px]" : "min-h-[56px]"
          )}
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={onInputChange}
            onKeyDown={handleKeyDown}
            onKeyUp={onKeyUp}
            onFocus={onFocus}
            onBlur={onBlur}
            placeholder={
              isLoading
                ? "Generating response..."
                : isInitialState
                ? "How can I help you today?"
                : "Send a Message."
            }
            rows={1}
            wrap="off"
            disabled={false}
            className={cn(
              "w-full bg-transparent text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] text-base focus:outline-none max-h-[200px] overflow-hidden leading-relaxed max-w-full transition-all",
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
            {isLoading ? (
              <motion.button
                type="button"
                onClick={onStop}
                className={cn(
                  "p-2 rounded-full transition-all duration-200 bg-red-600 hover:bg-red-700 text-white shadow-md"
                )}
                whileTap={animationsEnabled ? { scale: 0.85 } : undefined}
                title="Stop generation"
              >
                <Square size={16} strokeWidth={2.5} fill="currentColor" />
              </motion.button>
            ) : (
              <motion.button
                type="submit"
                disabled={!input.trim()}
                className={cn(
                  "p-2 rounded-full transition-all duration-200",
                  input.trim()
                    ? "bg-[var(--accent-color)] text-white hover:bg-[var(--accent-color)]/90 shadow-md"
                    : "bg-[var(--bg-tertiary)] text-[var(--text-secondary)] cursor-not-allowed",
                  isInitialState ? "mb-0" : "mb-0.5"
                )}
                whileTap={
                  animationsEnabled && input.trim()
                    ? { scale: 0.85, rotate: 10 }
                    : undefined
                }
              >
                <Send size={16} strokeWidth={2.5} />
              </motion.button>
            )}
          </div>
        </form>

        <div
          className={cn(
            "text-center transition-all",
            isInitialState ? "mt-4" : "mt-3"
          )}
        >
          <p className="text-[11px] text-[var(--text-secondary)]">
            Always fact check important information.
          </p>
        </div>
      </div>
    </motion.div>
  );
};