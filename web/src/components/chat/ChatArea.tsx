import { useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Send, Paperclip, Mic, ArrowDown } from "lucide-react"
import { Conversation } from "@/types/chat"
import { MessageBubble, LoadingBubble } from "./MessageBubble"
import { WelcomeScreen } from "./WelcomeScreen"
import { cn } from "@/lib/utils"


interface ChatAreaProps {
  conversation: Conversation | null
  isLoading: boolean
  onSendMessage: (content: string) => void
}

export function ChatArea({ conversation, isLoading, onSendMessage }: ChatAreaProps) {
  const [input, setInput] = useState("")
  const [focused, setFocused] = useState(false)
  const [showScrollBtn, setShowScrollBtn] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const hasMessages = (conversation?.messages.length ?? 0) > 0
  const maxChars = 800

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [conversation?.messages, isLoading])

  useEffect(() => {
    const el = scrollAreaRef.current
    if (!el) return
    const onScroll = () => setShowScrollBtn(el.scrollHeight - el.scrollTop - el.clientHeight > 120)
    el.addEventListener("scroll", onScroll)
    return () => el.removeEventListener("scroll", onScroll)
  }, [])

  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = "auto"
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`
  }, [input])

  const handleSend = () => {
    const trimmed = input.trim()
    if (!trimmed || isLoading || trimmed.length > maxChars) return
    onSendMessage(trimmed)
    setInput("")
    if (textareaRef.current) textareaRef.current.style.height = "auto"
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const canSend = !!input.trim() && !isLoading && input.length <= maxChars
  const messages = conversation?.messages ?? []

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Messages ── */}
      <div ref={scrollAreaRef} className="flex-1 overflow-y-auto chat-bg relative">
        {!hasMessages ? (
          <WelcomeScreen onSuggestion={(p) => { if (!isLoading) onSendMessage(p) }} />
        ) : (
          <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-5 pb-4">

            {/* Session header */}
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2.5 mb-7 pb-4 border-b border-border/30"
            >
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center text-sm select-none shadow-sm"
                style={{ background: "linear-gradient(135deg, rgba(196,98,45,0.12), rgba(168,125,60,0.1))", border: "1px solid rgba(196,98,45,0.18)" }}
              >
                💬
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold font-display text-foreground/70 truncate">
                  {conversation?.title ?? "对话"}
                </p>
                <p className="text-[11px] text-muted-foreground/40 mt-px font-sans">
                  {messages.length} 条消息
                </p>
              </div>
            </motion.div>

            {/* Messages with smart spacing */}
            <AnimatePresence initial={false}>
              {messages.map((msg, idx) => {
                const prev = messages[idx - 1]
                const isRoleSwitch = idx > 0 && prev.role !== msg.role
                return (
                  <div key={msg.id} className={isRoleSwitch ? "" : idx > 0 ? "mt-3" : ""}>
                    <MessageBubble message={msg} isRoleSwitch={isRoleSwitch} />
                  </div>
                )
              })}
              {isLoading && <LoadingBubble key="loading" />}
            </AnimatePresence>

            <div ref={messagesEndRef} className="h-3" />
          </div>
        )}

        {/* Scroll-to-bottom */}
        <AnimatePresence>
          {showScrollBtn && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 8 }}
              transition={{ type: "spring", stiffness: 380, damping: 26 }}
              onClick={() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })}
              className="fixed bottom-28 right-6 sm:right-10 z-10 w-9 h-9 rounded-full flex items-center justify-center shadow-lg transition-shadow"
              style={{
                background: "linear-gradient(135deg, var(--warm-solid), hsl(var(--primary)))",
                color: "#FFFFFF",
                boxShadow: "0 4px 16px var(--warm-glow)",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 6px 24px hsl(var(--primary) / 0.5)" }}
              onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "0 4px 16px var(--warm-glow)" }}
            >
              <ArrowDown className="w-4 h-4" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* ── Input bar ── */}
      <div
        className="shrink-0 border-t px-4 sm:px-6 pt-3 pb-4 sm:pb-5"
        style={{
          background: "hsl(var(--card) / 0.9)",
          backdropFilter: "blur(20px)",
          borderColor: "hsl(var(--border) / 0.5)",
        }}
      >
        <div className="max-w-5xl mx-auto space-y-2.5">

          {/* Input box */}
          <div
            className={cn(
              "relative flex items-end gap-2 px-3 pt-2.5 pb-2 rounded-2xl border transition-all duration-200",
              "bg-card",
            )}
            style={{
              borderColor: focused ? "hsl(var(--primary) / 0.4)" : "hsl(var(--border) / 0.7)",
              boxShadow: focused
                ? "0 0 0 3px hsl(var(--primary) / 0.1), 0 4px 20px rgba(0,0,0,0.1)"
                : "0 2px 16px rgba(0,0,0,0.06)",
            }}
          >
            {/* Inner aurora glow when focused */}
            {focused && (
              <div className="absolute inset-0 rounded-2xl pointer-events-none"
                style={{ background: "radial-gradient(ellipse at 50% 100%, hsl(var(--primary) / 0.05), transparent 70%)" }} />
            )}

            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
              className="shrink-0 mb-1 p-1.5 rounded-xl text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted transition-all">
              <Paperclip className="w-4 h-4" />
            </motion.button>

            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="有什么关于安理工的问题，尽管问我…"
              rows={1}
              maxLength={maxChars + 20}
              className="flex-1 resize-none bg-transparent outline-none text-[0.95rem] leading-relaxed text-foreground placeholder:text-muted-foreground/35 py-1.5 max-h-40 min-h-[2.25rem] relative z-10 font-sans"
            />

            <div className="flex items-center gap-1.5 shrink-0 mb-1 relative z-10">
              {input.length > 200 && (
                <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="text-[10px] font-mono tabular-nums"
                  style={{ color: input.length > maxChars * 0.9 ? "var(--warm-amber)" : "hsl(var(--muted-foreground) / 0.35)" }}>
                  {input.length}/{maxChars}
                </motion.span>
              )}

              <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                className="p-1.5 rounded-xl text-muted-foreground/35 hover:text-muted-foreground hover:bg-muted transition-all">
                <Mic className="w-4 h-4" />
              </motion.button>

              {/* Send — aurora green when active */}
              <motion.button
                whileHover={canSend ? { scale: 1.08 } : {}}
                whileTap={canSend ? { scale: 0.92 } : {}}
                onClick={handleSend}
                disabled={!canSend}
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200"
                style={canSend ? {
                  background: "linear-gradient(135deg, var(--warm-solid), hsl(var(--primary)))",
                  color: "#FFFFFF",
                  boxShadow: "0 2px 12px var(--warm-glow)",
                } : {
                  background: "hsl(var(--muted) / 0.6)",
                  color: "hsl(var(--muted-foreground) / 0.35)",
                }}
                onMouseEnter={(e) => { if (canSend) e.currentTarget.style.boxShadow = "0 4px 20px hsl(var(--primary) / 0.5)" }}
                onMouseLeave={(e) => { if (canSend) e.currentTarget.style.boxShadow = "0 2px 12px var(--warm-glow)" }}
              >
                <motion.div
                  animate={isLoading ? { rotate: 360 } : { rotate: 0 }}
                  transition={isLoading ? { duration: 1.1, repeat: Infinity, ease: "linear" } : { duration: 0 }}
                >
                  <Send className="w-4 h-4" />
                </motion.div>
              </motion.button>
            </div>
          </div>

          {/* Hint */}
          <div className="flex items-center justify-between px-0.5">
            <p className="text-[10px] text-muted-foreground/30 font-sans">
              AUSTPal 可能出现错误，重要决策请以官方信息为准
            </p>
            <div className="hidden sm:flex items-center gap-1 text-[10px] text-muted-foreground/25 font-sans">
              <kbd className="px-1.5 py-0.5 rounded border font-mono" style={{ background: "hsl(var(--muted)/0.7)", borderColor: "hsl(var(--border)/0.5)" }}>Enter</kbd>
              <span>发送</span>
              <span className="mx-0.5 opacity-50">·</span>
              <kbd className="px-1.5 py-0.5 rounded border font-mono" style={{ background: "hsl(var(--muted)/0.7)", borderColor: "hsl(var(--border)/0.5)" }}>⇧ Enter</kbd>
              <span>换行</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
