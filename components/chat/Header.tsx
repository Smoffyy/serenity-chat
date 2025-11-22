"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, ChevronDown, Star, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ModelData, ChatMetadata } from "./types";

interface HeaderProps {
  models: ModelData[];
  selectedModelId: string;
  defaultModelId: string;
  isModelDropdownOpen: boolean;
  chatList: ChatMetadata[];
  chatId: string;
  isNewChat: boolean;
  onModelSelect: (modelId: string) => void;
  onSetDefaultModel: (e: React.MouseEvent, modelId: string) => void;
  onDropdownToggle: (open: boolean) => void;
  modelDropdownRef: React.RefObject<HTMLDivElement>;
  animationsEnabled: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  models,
  selectedModelId,
  defaultModelId,
  isModelDropdownOpen,
  chatList,
  chatId,
  isNewChat,
  onModelSelect,
  onSetDefaultModel,
  onDropdownToggle,
  modelDropdownRef,
  animationsEnabled,
}) => {
  const currentModelName =
    models.find((m) => m.id === selectedModelId)?.id || "Select Model";

  return (
    // Using CSS variables for background and border
    <header className="flex-none sticky top-0 left-0 right-0 h-14 flex items-center justify-between px-4 z-30 bg-[var(--bg-primary)]/90 backdrop-blur-md select-none border-b border-[var(--border-color)]">
      <div ref={modelDropdownRef} className="relative z-40">
        <motion.button
          // Conditionally apply tap animation
          whileTap={animationsEnabled ? { scale: 0.98 } : undefined}
          onClick={() => onDropdownToggle(!isModelDropdownOpen)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 shadow-sm",
            isModelDropdownOpen
              ? "bg-[var(--accent-color)] text-[var(--bg-primary)] ring-2 ring-[var(--accent-color)]/50"
              : "bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]"
          )}
        >
          <Zap 
            size={14} 
            className={isModelDropdownOpen ? "text-[var(--bg-primary)]" : "text-[var(--text-secondary)]"} 
          />
          <span className="truncate max-w-[150px]">{currentModelName}</span>
          <motion.div
             // Conditionally apply rotation animation
            animate={animationsEnabled ? { rotate: isModelDropdownOpen ? 180 : 0 } : undefined}
            style={{ rotate: !animationsEnabled && isModelDropdownOpen ? 180 : 0 }}
          >
            <ChevronDown size={14} />
          </motion.div>
        </motion.button>

        <AnimatePresence>
          {isModelDropdownOpen && (
            <motion.div
              // Conditionally apply dropdown entry/exit animations
              initial={animationsEnabled ? { opacity: 0, y: 10, scale: 0.95 } : false}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={animationsEnabled ? { opacity: 0, y: 10, scale: 0.95 } : false}
              style={{ transformOrigin: "top left" }}
              className="absolute left-0 mt-2 w-72 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl shadow-2xl p-1 max-h-80 overflow-y-auto"
            >
              {models.map((m, index) => (
                <motion.div
                  key={m.id}
                  // Conditionally apply staggered list item animation
                  initial={animationsEnabled ? { opacity: 0, x: -10 } : false}
                  animate={{ opacity: 1, x: 0 }}
                  transition={animationsEnabled ? {
                    delay: index * 0.05,
                  } : undefined}
                  className={cn(
                    "flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-colors group/model",
                    m.id === selectedModelId
                      ? "bg-[var(--bg-tertiary)] text-[var(--text-primary)] font-medium"
                      : "text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]/70 hover:text-[var(--text-primary)]"
                  )}
                >
                  <motion.button
                    // Conditionally apply hover animation
                    whileHover={animationsEnabled ? { x: 2 } : undefined}
                    onClick={() => onModelSelect(m.id)}
                    className="flex-1 text-left truncate cursor-pointer"
                  >
                    {m.id}
                  </motion.button>

                  <div className="flex items-center gap-2">
                    <motion.button
                      onClick={(e) => onSetDefaultModel(e, m.id)}
                      className={cn(
                        "p-1 rounded-full transition-colors",
                        m.id === defaultModelId
                          ? "text-yellow-400 hover:text-yellow-300"
                          : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] opacity-0 group-hover/model:opacity-100"
                      )}
                      whileTap={animationsEnabled ? { scale: 0.9 } : undefined}
                    >
                      <Star
                        size={14}
                        fill={m.id === defaultModelId ? "currentColor" : "none"}
                      />
                    </motion.button>

                    {m.id === selectedModelId && (
                      <motion.div
                         // Conditionally apply checkmark animation
                        initial={animationsEnabled ? { scale: 0.5, opacity: 0 } : false}
                        animate={{ scale: 1, opacity: 1 }}
                      >
                        <Check size={16} className="text-[var(--text-primary)]" />
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="text-sm text-[var(--text-secondary)] hidden sm:block">
        {isNewChat
          ? "New Chat"
          : chatList.find((c) => c.id === chatId)?.title || "..."}
      </div>
    </header>
  );
};