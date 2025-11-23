"use client";

import React from "react";
import { motion, AnimatePresence, Transition } from "framer-motion";
import { Settings, X, Trash2, Moon, Sun, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AppSettings, Theme } from "./types";

interface SettingsModalProps {
  isOpen: boolean;
  settings: AppSettings;
  onClose: () => void;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  onDeleteAllChats: () => void;
  transition: Transition;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  settings,
  onClose,
  onUpdateSettings,
  onDeleteAllChats,
  transition,
}) => {
  const themes: { id: Theme; icon: React.ReactNode; label: string }[] = [
    { id: "dark", icon: <Moon size={16} />, label: "Dark" },
    { id: "light", icon: <Sun size={16} />, label: "Light" },
    { id: "chatgpt", icon: <Zap size={16} />, label: "ChatGPT" },
  ];

  // If animations are disabled, override transition for instant open/close
  const modalTransition = settings.animationsEnabled ? transition : { duration: 0 };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={modalTransition}
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center backdrop-blur-sm"
          onClick={onClose}
          style={{ userSelect: "none" }}
        >
          <motion.div
            initial={settings.animationsEnabled ? { opacity: 0, scale: 0.95, y: 20 } : false}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={settings.animationsEnabled ? { opacity: 0, scale: 0.95, y: 20 } : false}
            transition={modalTransition}
            // Use CSS variables for styling
            className="bg-[var(--bg-secondary)] border border-[var(--border-color)] p-6 rounded-2xl w-full max-w-md shadow-2xl select-none relative z-60 text-[var(--text-primary)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Settings size={20} /> Settings
              </h2>
              <button
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1 rounded-full hover:bg-[var(--bg-tertiary)] transition-colors"
                onClick={onClose}
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              {/* --- Theme Selector --- */}
              <div className="p-4 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl">
                <span className="text-sm font-medium block mb-3">Theme</span>
                <div className="grid grid-cols-3 gap-2">
                  {themes.map((theme) => (
                    <button
                      key={theme.id}
                      onClick={() => onUpdateSettings({ theme: theme.id })}
                      className={cn(
                        "flex items-center justify-center gap-2 p-2 rounded-lg text-sm font-medium transition-all border",
                        settings.theme === theme.id
                          ? "bg-[var(--bg-tertiary)] border-[var(--accent-color)] text-[var(--text-primary)] shadow-sm"
                          : "bg-[var(--bg-secondary)] border-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
                      )}
                    >
                      {theme.icon} {theme.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* --- Animations Toggle --- */}
              <div className="flex items-center justify-between p-4 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl">
                <div className="flex flex-col">
                  <span className="text-sm font-medium">Animations</span>
                  <span className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                    Enable UI transitions and effects.
                  </span>
                </div>
                <button
                  onClick={() =>
                    onUpdateSettings({
                      animationsEnabled: !settings.animationsEnabled,
                    })
                  }
                  className={cn(
                    "w-12 h-6 rounded-full p-1 flex items-center transition-colors shadow-inner relative",
                    settings.animationsEnabled
                      ? "bg-[var(--accent-color)]"
                      : "bg-[var(--bg-tertiary)]"
                  )}
                >
                  {/* Use standard div if animations disabled for instant switch */}
                  {settings.animationsEnabled ? (
                    <motion.div
                      className="w-4 h-4 rounded-full shadow-sm bg-[var(--bg-primary)]"
                      layout
                      transition={transition}
                      style={{
                        marginLeft: settings.animationsEnabled ? "auto" : "0",
                      }}
                    />
                  ) : (
                    <div
                      className={cn(
                        "w-4 h-4 rounded-full shadow-sm bg-white",
                         !settings.animationsEnabled && "ml-0"
                      )}
                    />
                  )}
                </button>
              </div>

              {/* --- Animation Speed Slider --- */}
              <AnimatePresence>
                {settings.animationsEnabled && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={transition}
                    className="overflow-hidden"
                  >
                   <div className="p-4 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl mt-2">
                    <div className="flex justify-between mb-2">
                        <span className="text-sm font-medium">Animation Speed</span>
                        <span className="text-xs text-[var(--text-secondary)] font-mono">{settings.animationSpeed.toFixed(1)}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="2.0"
                      step="0.1"
                      value={settings.animationSpeed}
                      onChange={(e) =>
                        onUpdateSettings({
                          animationSpeed: parseFloat(e.target.value),
                        })
                      }
                      className="w-full h-2 bg-[var(--bg-tertiary)] rounded-lg appearance-none cursor-pointer accent-[var(--accent-color)]"
                    />
                    <div className="flex justify-between text-[10px] text-[var(--text-secondary)] mt-1">
                        <span>Slower</span>
                        <span>Faster</span>
                    </div>
                   </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* --- Delete All --- */}
              <div className="p-4 bg-red-900/20 border border-red-700/50 rounded-xl flex items-center justify-between mt-6">
                <span className="text-sm text-red-400 font-medium">
                  Clear all chat history.
                </span>
                <button
                  onClick={onDeleteAllChats}
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-colors shadow-lg shadow-red-600/30 flex items-center"
                >
                  <Trash2 size={14} className="mr-1" /> Delete All
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};