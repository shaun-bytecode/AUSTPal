import { useState, useMemo, useCallback, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism"
import { oneLight } from "react-syntax-highlighter/dist/esm/styles/prism"
import { Copy, Check, ThumbsUp, ThumbsDown, RotateCcw, Bot, ChevronDown } from "lucide-react"
import { Message } from "@/types/chat"
import { useTypewriter } from "@/hooks/useTypewriter"
import { LoadingDots } from "./LoadingDots"
import { formatTime, cn } from "@/lib/utils"

export interface MessageBubbleProps {
  message: Message
  isRoleSwitch?: boolean
}

const SPRING = { type: "spring", stiffness: 360, damping: 30, mass: 0.85 } as const

/** Reactively tracks the dark-mode class on <html> via MutationObserver */
function useIsDark() {
  const [isDark, setIsDark] = useState(() =>
    document.documentElement.classList.contains("dark"),
  )
  useEffect(() => {
    const obs = new MutationObserver(() =>
      setIsDark(document.documentElement.classList.contains("dark")),
    )
    obs.observe(document.documentElement, { attributeFilter: ["class"] })
    return () => obs.disconnect()
  }, [])
  return isDark
}

/** Shared copy-to-clipboard with 2 s feedback, handles timer cleanup */
function useCopyWithFeedback() {
  const [copied, setCopied] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current) }, [])
  const copy = useCallback(async (text: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setCopied(false), 2000)
  }, [])
  return { copied, copy }
}

/** Bot avatar — shared between BotBubble and LoadingBubble */
function BotAvatar({ showDot, spinning }: { showDot?: boolean; spinning?: boolean }) {
  return (
    <div className="shrink-0 mt-1 relative">
      {spinning && (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }}
          className="absolute -inset-[3px] rounded-[14px]"
          style={{
            background: `conic-gradient(var(--warm-solid) 0deg, hsl(var(--primary) / 0.15) 200deg, transparent 280deg)`,
            borderRadius: "14px",
          }}
        />
      )}
      <div
        className="w-9 h-9 rounded-2xl flex items-center justify-center select-none shadow-sm relative"
        style={{
          background: "linear-gradient(135deg, hsl(var(--primary) / 0.12), hsl(var(--primary) / 0.07))",
          border: spinning ? "none" : "1px solid hsl(var(--primary) / 0.22)",
        }}
      >
        <Bot className="w-[18px] h-[18px]" style={{ color: "var(--warm-solid)" }} />
      </div>
      {showDot && !spinning && (
        <span
          className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-[2px] border-background"
          style={{ background: "var(--warm-solid)", boxShadow: "0 0 6px var(--warm-glow)" }}
        />
      )}
    </div>
  )
}

/** Collapsible thinking process section */
function ThinkingSection({ thinking, isDone }: { thinking: string; isDone: boolean }) {
  const [expanded, setExpanded] = useState(true)
  const contentRef = useRef<HTMLDivElement>(null)

  // Auto-collapse when reasoning finishes
  useEffect(() => {
    if (isDone) setExpanded(false)
  }, [isDone])

  // Auto-scroll thinking area while streaming
  useEffect(() => {
    if (!isDone && contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight
    }
  }, [thinking, isDone])

  return (
    <div
      className="rounded-2xl rounded-tl-md overflow-hidden text-xs"
      style={{
        border: "1px solid hsl(var(--primary) / 0.18)",
        background: "hsl(var(--primary) / 0.04)",
      }}
    >
      {/* Header */}
      <button
        onClick={() => isDone && setExpanded((e) => !e)}
        className={cn(
          "flex items-center gap-1.5 w-full px-3 py-2 text-left select-none",
          isDone && "cursor-pointer hover:bg-primary/5 transition-colors",
          !isDone && "cursor-default",
        )}
      >
        {!isDone ? (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
            className="w-3 h-3 rounded-full border border-t-transparent flex-shrink-0"
            style={{ borderColor: "var(--warm-solid)", borderTopColor: "transparent" }}
          />
        ) : (
          <motion.div
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="w-3 h-3 flex-shrink-0" style={{ color: "var(--warm-solid)" }} />
          </motion.div>
        )}
        <span className="font-medium" style={{ color: "hsl(var(--foreground) / 0.5)" }}>
          {isDone ? "推理过程" : "思考中…"}
        </span>
      </button>

      {/* Content */}
      <AnimatePresence initial={false}>
        {(!isDone || expanded) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
          >
            <div
              ref={contentRef}
              className="px-3 pb-3 max-h-52 overflow-y-auto"
              style={{ color: "hsl(var(--foreground) / 0.55)" }}
            >
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{thinking}</ReactMarkdown>
              {!isDone && (
                <span
                  className="inline-block w-1.5 h-3 ml-0.5 animate-pulse rounded-sm"
                  style={{ background: "var(--warm-solid)", opacity: 0.7 }}
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ─── Bot Bubble ─────────────────────────────────────────────────────────── */
function BotBubble({ message, isRoleSwitch }: MessageBubbleProps) {
  const [reaction, setReaction] = useState<"up" | "down" | null>(null)
  const { copied, copy: handleCopy } = useCopyWithFeedback()
  const isDark = useIsDark()

  const isThinking = !message.thinkingDone
  const hasThinking = !!(message.thinking || isThinking)

  // Extract AUDIO: url from content before passing to typewriter / markdown
  const audioMatch = message.content.match(/^AUDIO:(.+)$/m)
  const audioSrc = audioMatch?.[1]?.trim() ?? null
  const cleanContent = message.content.replace(/^AUDIO:.+$/m, "").trim()

  const { displayedText, isComplete } = useTypewriter({
    text: cleanContent,
    speed: 14,
    enabled: message.isTyping === true,
  })

  const text = message.isTyping ? displayedText : cleanContent
  const showActions = message.thinkingDone && (!message.isTyping || isComplete)

  const markdownComponents = useMemo(() => ({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    img({ src, alt }: any) {
      const proxied = src?.startsWith("http")
        ? `/api/proxy/image?url=${encodeURIComponent(src)}`
        : src
      return (
        <img
          src={proxied}
          alt={alt ?? ""}
          className="max-w-full rounded-xl my-2 border border-border/30"
          loading="lazy"
        />
      )
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    code({ inline, className, children, ...props }: any) {
      const match = /language-(\w+)/.exec(className || "")
      if (!inline && match) {
        return (
          <div className="my-2 rounded-xl overflow-hidden"
            style={{ border: "1px solid rgba(196,98,45,0.15)", boxShadow: "0 2px 12px rgba(0,0,0,0.1)" }}>
            <div className="flex items-center justify-between px-3.5 py-2"
              style={{ background: "hsl(var(--card))", borderBottom: "1px solid hsl(var(--border))" }}>
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: "var(--warm-solid)", opacity: 0.8 }} />
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: "var(--warm-amber)", opacity: 0.7 }} />
                  <span className="w-2.5 h-2.5 rounded-full bg-border" />
                </div>
                <span className="text-[10px] font-mono font-medium text-muted-foreground/60 uppercase tracking-wider">
                  {match[1]}
                </span>
              </div>
              <CopyCodeButton code={String(children).replace(/\n$/, "")} />
            </div>
            <SyntaxHighlighter
              style={isDark ? oneDark : oneLight}
              language={match[1]}
              PreTag="div"
              customStyle={{ margin: 0, borderRadius: 0, fontSize: "0.78rem", lineHeight: "1.7", padding: "0.9rem 1rem" }}
              {...props}
            >
              {String(children).replace(/\n$/, "")}
            </SyntaxHighlighter>
          </div>
        )
      }
      return <code className={className} {...props}>{children}</code>
    },
  }), [isDark])

  return (
    <motion.div
      initial={{ opacity: 0, x: -16, y: 4 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={SPRING}
      className={cn("flex items-start gap-3 group", isRoleSwitch && "mt-6")}
    >
      <BotAvatar showDot spinning={isThinking} />

      <div className="flex flex-col gap-1.5 min-w-0 flex-1 max-w-[calc(100%-3.5rem)]">
        <span className="text-[11px] font-semibold font-display tracking-wide text-muted-foreground/50 pl-0.5 select-none">
          AUSTPal
        </span>

        {/* Thinking section — shown while reasoning or when collapsed after done */}
        {hasThinking && (
          <ThinkingSection
            thinking={message.thinking ?? ""}
            isDone={!isThinking}
          />
        )}

        {/* Loading dots — waiting for first chunk with no thinking content yet */}
        {isThinking && !message.thinking && (
          <div
            className="px-4 py-3.5 rounded-3xl rounded-tl-md border flex items-center gap-3"
            style={{
              background: "hsl(var(--primary) / 0.1)",
              borderColor: "hsl(var(--primary) / 0.25)",
            }}
          >
            <LoadingDots />
            <span className="text-xs text-muted-foreground/45 font-sans">正在思考…</span>
          </div>
        )}

        {/* Answer bubble — only shown once thinking is done */}
        {message.thinkingDone && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            whileHover={{ y: -2, boxShadow: "0 0 0 1px rgba(196,98,45,0.12), 0 6px 24px rgba(0,0,0,0.1)" }}
            className="relative px-4 py-3.5 rounded-3xl rounded-tl-md border transition-colors duration-200"
            style={{
              background: "hsl(var(--primary) / 0.1)",
              borderColor: "hsl(var(--primary) / 0.25)",
              boxShadow: "0 2px 10px hsl(var(--primary) / 0.08)",
            }}
          >
            {/* Warm left accent line */}
            <div
              className="absolute left-0 top-3 bottom-3 w-[2px] rounded-r-full opacity-40 group-hover:opacity-70 transition-opacity"
              style={{ background: "linear-gradient(to bottom, var(--warm-solid), var(--warm-amber))" }}
            />

            <div className="markdown-content text-[0.95rem] leading-relaxed text-foreground">
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                {text}
              </ReactMarkdown>

              {message.isTyping && !isComplete && (
                <span
                  className="inline-block w-[2px] h-[1em] animate-cursor ml-0.5 align-[-0.05em]"
                  style={{ background: "var(--warm-solid)", boxShadow: "0 0 6px var(--warm-glow)" }}
                />
              )}
            </div>

            {/* Audio player — shown after typewriter finishes */}
            {audioSrc && (!message.isTyping || isComplete) && (
              <audio
                controls
                autoPlay
                src={audioSrc}
                className="w-full mt-3 rounded-xl"
                style={{ accentColor: "var(--warm-solid)" }}
              />
            )}
          </motion.div>
        )}

        {/* Action bar */}
        <AnimatePresence>
          {showActions && (
            <motion.div
              initial={{ opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12, duration: 0.2 }}
              className="flex items-center gap-1 pl-0.5"
            >
              <span className="text-[10px] text-muted-foreground/35 tabular-nums">
                {formatTime(message.timestamp)}
              </span>
              <div className="w-px h-3 bg-border/50 mx-0.5" />
              <div className="flex items-center gap-0.5">
                <ActionBtn onClick={() => handleCopy(cleanContent)} title="复制">
                  <AnimatePresence mode="wait">
                    {copied
                      ? <motion.div key="y" initial={{ scale: 0 }} animate={{ scale: 1 }}><Check className="w-3 h-3" style={{ color: "var(--warm-solid)" }} /></motion.div>
                      : <motion.div key="n" initial={{ scale: 0 }} animate={{ scale: 1 }}><Copy className="w-3 h-3" /></motion.div>
                    }
                  </AnimatePresence>
                </ActionBtn>
                <ActionBtn onClick={() => setReaction(reaction === "up" ? null : "up")} title="有帮助"
                  active={reaction === "up"} activeStyle={{ color: "var(--warm-solid)", background: "hsl(var(--primary) / 0.1)" }}>
                  <ThumbsUp className="w-3 h-3" />
                </ActionBtn>
                <ActionBtn onClick={() => setReaction(reaction === "down" ? null : "down")} title="没帮助"
                  active={reaction === "down"} activeStyle={{ color: "#f87171", background: "rgba(248,113,113,0.1)" }}>
                  <ThumbsDown className="w-3 h-3" />
                </ActionBtn>
                <ActionBtn onClick={() => {}} title="重新生成">
                  <RotateCcw className="w-3 h-3" />
                </ActionBtn>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

/* ─── User Bubble ────────────────────────────────────────────────────────── */
function UserBubble({ message, isRoleSwitch }: Pick<MessageBubbleProps, "message" | "isRoleSwitch">) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 16, y: 4 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={SPRING}
      className={cn("flex items-end justify-end gap-3 group", isRoleSwitch && "mt-6")}
    >
      <div className="flex flex-col items-end gap-1.5 min-w-0 max-w-[80%] sm:max-w-[68%]">
        <span className="text-[11px] font-semibold font-display tracking-wide text-muted-foreground/50 pr-0.5 select-none">
          你
        </span>

        <motion.div
          whileHover={{ y: -2, boxShadow: "0 6px 20px hsl(var(--primary) / 0.18)" }}
          transition={{ duration: 0.16 }}
          className="relative px-4 py-3.5 rounded-3xl rounded-br-md border"
          style={{
            background: "hsl(var(--primary) / 0.1)",
            borderColor: "hsl(var(--primary) / 0.25)",
            boxShadow: "0 2px 10px hsl(var(--primary) / 0.08)",
          }}
        >
          <p className="text-[0.95rem] leading-relaxed whitespace-pre-wrap break-words" style={{ color: "hsl(var(--foreground))" }}>
            {message.content}
          </p>
        </motion.div>

        <span className="text-[10px] text-muted-foreground/35 tabular-nums pr-0.5">
          {formatTime(message.timestamp)}
        </span>
      </div>

      {/* User avatar */}
      <div
        className="shrink-0 mb-6 w-9 h-9 rounded-2xl flex items-center justify-center font-bold text-sm select-none shadow-sm"
        style={{
          background: "hsl(var(--primary) / 0.12)",
          border: "1px solid hsl(var(--primary) / 0.25)",
          color: "var(--warm-solid)",
        }}
      >
        我
      </div>
    </motion.div>
  )
}

/* ─── Loading Bubble ─────────────────────────────────────────────────────── */
export function LoadingBubble() {
  return (
    <motion.div
      initial={{ opacity: 0, x: -14, y: 4 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      exit={{ opacity: 0, y: 4, transition: { duration: 0.15 } }}
      transition={SPRING}
      className="flex items-start gap-3 mt-6"
    >
      <BotAvatar />
      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] font-semibold font-display text-muted-foreground/45 pl-0.5 select-none">
          AUSTPal
        </span>
        <div
          className="px-4 py-3.5 rounded-3xl rounded-tl-md border flex items-center gap-3"
          style={{
            background: "hsl(var(--bubble-bot-bg))",
            borderColor: "hsl(var(--primary) / 0.18)",
            boxShadow: "0 0 16px hsl(var(--primary) / 0.06)",
          }}
        >
          <LoadingDots />
          <span className="text-xs text-muted-foreground/45 font-sans">正在生成回答…</span>
        </div>
      </div>
    </motion.div>
  )
}

/* ─── Action Button ──────────────────────────────────────────────────────── */
function ActionBtn({ onClick, title, children, active, activeStyle }: {
  onClick: () => void; title: string; children: React.ReactNode
  active?: boolean; activeStyle?: React.CSSProperties
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.2, y: -1 }}
      whileTap={{ scale: 0.85 }}
      onClick={onClick}
      title={title}
      className="p-1.5 rounded-lg transition-all duration-150 text-muted-foreground/30 hover:text-muted-foreground/65 hover:bg-muted"
      style={active ? activeStyle : {}}
    >
      {children}
    </motion.button>
  )
}

/* ─── Copy Code Button ───────────────────────────────────────────────────── */
function CopyCodeButton({ code }: { code: string }) {
  const { copied, copy: handle } = useCopyWithFeedback()

  return (
    <button onClick={() => handle(code)}
      className="flex items-center gap-1.5 text-xs font-medium transition-colors"
      style={{ color: copied ? "var(--warm-solid)" : "hsl(var(--muted-foreground) / 0.6)" }}>
      <AnimatePresence mode="wait">
        {copied
          ? <motion.span key="y" initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center gap-1"><Check className="w-3 h-3" />已复制</motion.span>
          : <motion.span key="n" initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center gap-1"><Copy className="w-3 h-3" />复制</motion.span>
        }
      </AnimatePresence>
    </button>
  )
}

/* ─── Export ─────────────────────────────────────────────────────────────── */
export function MessageBubble({ message, isRoleSwitch }: MessageBubbleProps) {
  return message.role === "assistant"
    ? <BotBubble message={message} isRoleSwitch={isRoleSwitch} />
    : <UserBubble message={message} isRoleSwitch={isRoleSwitch} />
}
