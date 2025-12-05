"use client";

import React, { useState } from "react";
import {
  motion,
  AnimatePresence,
} from "framer-motion";
import { Plus, MoreVertical, User, Settings, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatMetadata } from "./types";

interface SidebarProps {
  chatList: ChatMetadata[];
  chatId: string;
  isShiftPressed: boolean;
  activeMenuId: string | null;
  onNewChat: () => void;
  onLoadChat: (id: string) => void;
  onDeleteChat: (e: React.MouseEvent, id: string) => void;
  onSettingsOpen: () => void;
  setActiveMenuId: (id: string | null) => void;
  animationsEnabled: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  chatList,
  chatId,
  isShiftPressed,
  activeMenuId,
  onNewChat,
  onLoadChat,
  onDeleteChat,
  onSettingsOpen,
  setActiveMenuId,
  animationsEnabled,
}) => {
  const [hoveredChatId, setHoveredChatId] = useState<string | null>(null);

  return (
    <motion.div
      // Conditionally apply sidebar entry animation
      initial={animationsEnabled ? { x: -260 } : false}
      animate={{ x: 0 }}
      className="w-[260px] bg-[var(--bg-secondary)] border-r border-[var(--border-color)] flex flex-col flex-shrink-0 select-none relative z-20"
    >
      <div className="p-3">
        <motion.button
          // Conditionally apply button animations
          whileHover={animationsEnabled ? { scale: 1.01, boxShadow: "0 4px 10px rgba(0,0,0,.1)" } : undefined}
          whileTap={animationsEnabled ? { scale: 0.98 } : undefined}
          onClick={onNewChat}
          className="flex items-center gap-2 w-full px-3 py-2 bg-[var(--bg-tertiary)] text-[var(--text-primary)] hover:bg-[var(--border-color)] border border-[var(--border-color)] rounded-xl text-sm font-semibold transition-colors shadow-sm"
        >
          <Plus size={16} className="text-[var(--text-secondary)]" /> Start New Chat
        </motion.button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
        <div className="text-[11px] font-medium text-[var(--text-secondary)] px-2 mb-2 uppercase tracking-wider">
          History
        </div>

        <AnimatePresence initial={false}>
          {chatList.map((chat) => (
            <motion.div
              key={chat.id}
              // Conditionally apply list item entry/exit animations
              initial={animationsEnabled ? { opacity: 0, height: 0, y: -10 } : false}
              animate={{ opacity: 1, height: "auto", y: 0 }}
              exit={animationsEnabled ? { opacity: 0, height: 0 } : false}
              onMouseEnter={() => setHoveredChatId(chat.id)}
              onMouseLeave={() => setHoveredChatId(null)}
              className={cn(
                "group relative rounded-xl text-sm transition-all flex items-center justify-between",
                chat.id === chatId
                  ? "bg-[var(--bg-tertiary)] text-[var(--text-primary)] font-medium border border-[var(--border-color)]"
                  : "text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]/50 hover:text-[var(--text-primary)]"
              )}
            >
              <motion.button
                 // Conditionally apply hover animation
                whileHover={animationsEnabled ? { x: 2 } : undefined}
                onClick={(e) => {
                  if (e.button === 1) {
                    e.preventDefault();
                    onLoadChat(chat.id, true);
                  } else {
                    onLoadChat(chat.id);
                  }
                }}
                onAuxClick={(e) => {
                  if (e.button === 1) {
                    e.preventDefault();
                    onLoadChat(chat.id, true);
                  }
                }}
                className="flex-1 text-left truncate px-3 py-2 cursor-pointer pr-10"
              >
                {chat.title}
              </motion.button>

              <div
                className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 z-10"
                onClick={(e) => e.stopPropagation()}
              >
                <AnimatePresence mode="wait">
                  {hoveredChatId === chat.id && isShiftPressed ? (
                    <motion.button
                      key="trash"
                      // Conditionally apply icon animations
                      initial={animationsEnabled ? { scale: 0.5, opacity: 0 } : false}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={animationsEnabled ? { scale: 0.5, opacity: 0 } : false}
                      onClick={(e) => onDeleteChat(e, chat.id)}
                      className="p-1.5 rounded-full text-red-400 bg-[var(--bg-tertiary)] hover:bg-[var(--border-color)] transition-colors"
                      title="Shift + Click to Delete"
                      whileTap={animationsEnabled ? { scale: 0.8 } : undefined}
                    >
                      <Trash2 size={14} />
                    </motion.button>
                  ) : hoveredChatId === chat.id && !isShiftPressed ? (
                    <motion.button
                      key="dots"
                      initial={animationsEnabled ? { scale: 0.5, opacity: 0 } : false}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={animationsEnabled ? { scale: 0.5, opacity: 0 } : false}
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenuId(activeMenuId === chat.id ? null : chat.id);
                      }}
                      className={cn(
                        "p-1.5 rounded-full transition-colors",
                        activeMenuId === chat.id
                          ? "bg-[var(--bg-tertiary)] text-[var(--text-primary)]"
                          : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]/50"
                      )}
                      title="More options"
                      whileTap={animationsEnabled ? { scale: 0.8 } : undefined}
                    >
                      <MoreVertical size={14} />
                    </motion.button>
                  ) : null}
                </AnimatePresence>
              </div>

              <AnimatePresence>
                {activeMenuId === chat.id && hoveredChatId === chat.id && !isShiftPressed && (
                  <motion.div
                    // Conditionally apply context menu animation
                    initial={animationsEnabled ? { opacity: 0, scale: 0.9, y: 5 } : false}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={animationsEnabled ? { opacity: 0, scale: 0.9, y: 5 } : false}
                    className="absolute right-2 top-full mt-1 w-32 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg shadow-xl text-left text-[var(--text-primary)] z-50"
                    style={{ transformOrigin: "top right" }}
                  >
                    <motion.button
                      whileHover={animationsEnabled ? { backgroundColor: "var(--bg-tertiary)" } : undefined}
                      whileTap={animationsEnabled ? { scale: 0.95 } : undefined}
                      onClick={(e) => {
                        onDeleteChat(e, chat.id);
                        setActiveMenuId(null);
                      }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-400 hover:bg-[var(--bg-tertiary)] rounded-md"
                    >
                      <Trash2 size={14} /> Delete
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="p-3 border-t border-[var(--border-color)]">
        <motion.button
          // Conditionally apply user button animations
          whileHover={animationsEnabled ? { backgroundColor: "var(--bg-tertiary)", x: 2 } : undefined}
          whileTap={animationsEnabled ? { scale: 0.98 } : undefined}
          onClick={onSettingsOpen}
          className="flex items-center gap-3 px-2 py-2 w-full rounded-xl hover:bg-[var(--bg-tertiary)]/50 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all"
        >
          <div className="w-6 h-6 rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center border border-[var(--border-color)]">
            <User size={14} className="text-[var(--text-secondary)]" />
          </div>
          <span className="text-sm font-medium">User</span>
          <Settings size={14} className="ml-auto" />
        </motion.button>
      </div>
    </motion.div>
  );
};