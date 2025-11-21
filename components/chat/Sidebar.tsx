"use client";

import React, { useState } from "react";
import {
  motion,
  AnimatePresence,
} from "framer-motion";
import { Plus, MoreVertical, User, Settings, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatMetadata } from "./types";
import { spring } from "./animations";

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
}) => {
  const [hoveredChatId, setHoveredChatId] = useState<string | null>(null);

  return (
    <motion.div
      initial={{ x: -260 }}
      animate={{ x: 0 }}
      transition={spring}
      className="w-[260px] bg-[#09090b] border-r border-zinc-800/50 flex flex-col flex-shrink-0 select-none relative z-20"
    >
      <div className="p-3">
        <motion.button
          whileHover={{
            scale: 1.01,
            boxShadow: "0 4px 10px rgba(0,0,0,.3)",
          }}
          whileTap={{ scale: 0.98 }}
          transition={spring}
          onClick={onNewChat}
          className="flex items-center gap-2 w-full px-3 py-2 bg-zinc-900 text-zinc-200 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-sm font-semibold transition-colors shadow-lg shadow-zinc-900/20"
        >
          <Plus size={16} className="text-zinc-400" /> Start New Chat
        </motion.button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
        <div className="text-[11px] font-medium text-zinc-500 px-2 mb-2 uppercase tracking-wider">
          History
        </div>

        <AnimatePresence initial={false}>
          {chatList.map((chat) => (
            <motion.div
              key={chat.id}
              initial={{ opacity: 0, height: 0, y: -10 }}
              animate={{ opacity: 1, height: "auto", y: 0 }}
              exit={{
                opacity: 0,
                height: 0,
                transition: { duration: 0.2 },
              }}
              transition={{ ...spring, duration: 0.3, type: "tween" }}
              onMouseEnter={() => setHoveredChatId(chat.id)}
              onMouseLeave={() => setHoveredChatId(null)}
              className={cn(
                "group relative rounded-xl text-sm transition-all flex items-center justify-between",
                chat.id === chatId
                  ? "bg-zinc-800/50 text-zinc-100 font-medium border border-zinc-700"
                  : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
              )}
            >
              <motion.button
                whileHover={{ x: 2 }}
                onClick={() => onLoadChat(chat.id)}
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
                    // Show trash icon when hovering and shift is pressed
                    <motion.button
                      key="trash"
                      initial={{ scale: 0.5, rotate: -45, opacity: 0 }}
                      animate={{ scale: 1, rotate: 0, opacity: 1 }}
                      exit={{ scale: 0.5, rotate: 45, opacity: 0 }}
                      transition={spring}
                      onClick={(e) => onDeleteChat(e, chat.id)}
                      className="p-1.5 rounded-full text-red-400 bg-zinc-700/80 hover:bg-zinc-600 transition-colors"
                      title="Shift + Click to Delete"
                      whileTap={{ scale: 0.8 }}
                    >
                      <Trash2 size={14} />
                    </motion.button>
                  ) : hoveredChatId === chat.id && !isShiftPressed ? (
                    // Show three dots when hovering without shift
                    <motion.button
                      key="dots"
                      initial={{ scale: 0.5, rotate: -45, opacity: 0 }}
                      animate={{ scale: 1, rotate: 0, opacity: 1 }}
                      exit={{ scale: 0.5, rotate: 45, opacity: 0 }}
                      transition={spring}
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenuId(activeMenuId === chat.id ? null : chat.id);
                      }}
                      className={cn(
                        "p-1.5 rounded-full transition-colors",
                        activeMenuId === chat.id
                          ? "bg-zinc-700 text-zinc-300"
                          : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700/50"
                      )}
                      title="More options"
                      whileTap={{ scale: 0.8 }}
                    >
                      <MoreVertical size={14} />
                    </motion.button>
                  ) : null}
                </AnimatePresence>
              </div>

              <AnimatePresence>
                {activeMenuId === chat.id && hoveredChatId === chat.id && !isShiftPressed && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 5 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 5 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-2 top-full mt-1 w-32 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl text-left text-zinc-300 z-50"
                    style={{ transformOrigin: "top right" }}
                  >
                    <motion.button
                      whileHover={{ backgroundColor: "#27272a" }}
                      whileTap={{ scale: 0.95 }}
                      onClick={(e) => {
                        onDeleteChat(e, chat.id);
                        setActiveMenuId(null);
                      }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-400 hover:bg-zinc-800 rounded-md"
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

      <div className="p-3 border-t border-zinc-800/50">
        <motion.button
          whileHover={{ backgroundColor: "#27272a", x: 2 }}
          whileTap={{ scale: 0.98 }}
          transition={spring}
          onClick={onSettingsOpen}
          className="flex items-center gap-3 px-2 py-2 w-full rounded-xl hover:bg-zinc-800/50 text-zinc-400 hover:text-zinc-200 transition-all"
        >
          <div className="w-6 h-6 rounded-lg bg-zinc-700 flex items-center justify-center border border-zinc-600">
            <User size={14} className="text-zinc-300" />
          </div>
          <span className="text-sm font-medium">User</span>
          <Settings size={14} className="ml-auto" />
        </motion.button>
      </div>
    </motion.div>
  );
};