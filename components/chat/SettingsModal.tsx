"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Settings, X, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { spring } from "./animations";

interface SettingsModalProps {
  isOpen: boolean;
  isCursorEnabled: boolean;
  onClose: () => void;
  onToggleCursor: () => void;
  onDeleteAllChats: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  isCursorEnabled,
  onClose,
  onToggleCursor,
  onDeleteAllChats,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center backdrop-blur-sm"
          onClick={onClose}
          style={{ userSelect: "none" }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: -50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -50 }}
            transition={spring}
            className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl w-full max-w-md shadow-2xl select-none relative z-60"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
                <Settings size={20} className="text-zinc-300" />
              </h2>
              <motion.button
                className="text-zinc-500 hover:text-zinc-300 p-1 rounded-full hover:bg-zinc-800"
                onClick={onClose}
                whileTap={{ scale: 0.9 }}
              >
                <X size={20} />
              </motion.button>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="flex items-center justify-between p-4 bg-zinc-800/30 border border-zinc-700/50 rounded-xl mb-4"
            >
              <div className="flex flex-col">
                <span className="text-sm text-zinc-300 font-medium">
                  Streaming Cursor
                </span>
                <span className="text-[11px] text-zinc-500 mt-0.5">
                  Show a blinking cursor while generating response.
                </span>
              </div>

              <motion.button
                onClick={onToggleCursor}
                className={cn(
                  "w-11 h-6 rounded-full p-1 flex items-center transition-colors shadow-inner",
                  isCursorEnabled ? "bg-zinc-100" : "bg-zinc-700"
                )}
                whileTap={{ scale: 0.9 }}
              >
                <motion.div
                  className={cn(
                    "w-4 h-4 rounded-full shadow-sm",
                    isCursorEnabled ? "bg-zinc-900" : "bg-zinc-400"
                  )}
                  animate={{ x: isCursorEnabled ? 20 : 0 }}
                  transition={{
                    type: "spring",
                    stiffness: 500,
                    damping: 30,
                  }}
                />
              </motion.button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="p-4 bg-red-900/20 border border-red-700/50 rounded-xl flex items-center justify-between"
            >
              <span className="text-sm text-red-400 font-medium">
                Clear all chat history from local storage.
              </span>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onDeleteAllChats}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-colors shadow-lg shadow-red-600/30"
              >
                <Trash2 size={14} className="inline-block mr-1" /> Delete All
              </motion.button>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
