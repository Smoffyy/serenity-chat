"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, ChevronDown, Star, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ModelData, ChatMetadata } from "./types";
import { spring } from "./animations";

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
}) => {
  const currentModelName =
    models.find((m) => m.id === selectedModelId)?.id || "Select Model";

  return (
    <header className="flex-none sticky top-0 left-0 right-0 h-14 flex items-center justify-between px-4 z-30 bg-[#06060a]/90 backdrop-blur-md select-none border-b border-zinc-800/50">
      <div ref={modelDropdownRef} className="relative z-40">
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => onDropdownToggle(!isModelDropdownOpen)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 shadow-xl",
            isModelDropdownOpen
              ? "bg-zinc-700 text-white ring-2 ring-zinc-500/50"
              : "bg-zinc-900 border border-zinc-700/50 text-zinc-300 hover:bg-zinc-800 hover:border-zinc-600"
          )}
        >
          <Zap size={14} className="text-zinc-300" />
          <span className="truncate max-w-[150px]">{currentModelName}</span>
          <motion.div
            animate={{ rotate: isModelDropdownOpen ? 180 : 0 }}
            transition={spring}
          >
            <ChevronDown size={14} />
          </motion.div>
        </motion.button>

        <AnimatePresence>
          {isModelDropdownOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={spring}
              style={{ transformOrigin: "top left" }}
              className="absolute left-0 mt-2 w-72 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl p-1 max-h-80 overflow-y-auto"
            >
              {models.map((m) => (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{
                    duration: 0.1,
                    delay: models.indexOf(m) * 0.05,
                  }}
                  className={cn(
                    "flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-colors group/model",
                    m.id === selectedModelId
                      ? "bg-zinc-800/50 text-zinc-100 font-medium"
                      : "text-zinc-400 hover:bg-zinc-800/70 hover:text-zinc-200"
                  )}
                >
                  <motion.button
                    whileHover={{ x: 2 }}
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
                          : "text-zinc-600 hover:text-zinc-400 opacity-0 group-hover/model:opacity-100"
                      )}
                      whileTap={{ scale: 0.9 }}
                    >
                      <Star
                        size={14}
                        fill={m.id === defaultModelId ? "currentColor" : "none"}
                      />
                    </motion.button>

                    {m.id === selectedModelId && (
                      <motion.div
                        initial={{ scale: 0.5, opacity: 0, rotate: -90 }}
                        animate={{ scale: 1, opacity: 1, rotate: 0 }}
                        transition={spring}
                      >
                        <Check size={16} className="text-zinc-300" />
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="text-sm text-zinc-500 hidden sm:block">
        {isNewChat
          ? "New Chat"
          : chatList.find((c) => c.id === chatId)?.title || "..."}
      </div>
    </header>
  );
};
