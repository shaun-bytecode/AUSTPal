import { useState, useMemo, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Plus, MessageSquare, Trash2, X, Search, Clock, MessagesSquare, ChevronRight } from "lucide-react"
import { Conversation } from "@/types/chat"
import { formatTime, cn, truncate } from "@/lib/utils"

interface SidebarProps {
  conversations: Conversation[]
  activeId: string | null
  isOpen: boolean           // mobile overlay state
  isCollapsed?: boolean     // desktop collapse state
  onClose: () => void
  onToggleCollapse?: () => void
  onNew: () => void
  onSelect: (id: string) => void
  onDelete: (id: string) => void
}

function groupConversations(convs: Conversation[]) {
  const now = Date.now()
  const DAY = 86_400_000
  const groups: { label: string; items: Conversation[] }[] = [
    { label: "今天", items: [] },
    { label: "昨天", items: [] },
    { label: "更早", items: [] },
  ]
  for (const c of convs) {
    const age = now - c.updatedAt.getTime()
    if (age < DAY) groups[0].items.push(c)
    else if (age < DAY * 2) groups[1].items.push(c)
    else groups[2].items.push(c)
  }
  return groups.filter((g) => g.items.length > 0)
}

export function Sidebar({ conversations, activeId, isOpen, isCollapsed = false, onClose, onNew, onSelect, onDelete }: SidebarProps) {
  const [search, setSearch] = useState("")

  const filtered = useMemo(() => {
    if (!search.trim()) return conversations
    const q = search.toLowerCase()
    return conversations.filter(
      (c) => c.title.toLowerCase().includes(q) || c.messages.some((m) => m.content.toLowerCase().includes(q)),
    )
  }, [conversations, search])

  const groups = useMemo(
    () => (search.trim() ? null : groupConversations(filtered)),
    [filtered, search],
  )

  return (
    <>
      {/* Mobile backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-20 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Panel */}
      <aside
        className={cn(
          "flex flex-col w-72 border-r overflow-hidden",
          "transition-all duration-300 ease-out",
          /* Mobile: fixed overlay */
          "fixed top-0 left-0 h-full z-30",
          isOpen ? "translate-x-0" : "-translate-x-full",
          /* Desktop: in-flow, width collapses */
          "lg:relative lg:translate-x-0 lg:h-auto lg:z-auto",
          isCollapsed ? "lg:w-0 lg:border-r-0" : "lg:shrink-0",
          "bg-card/95 backdrop-blur-xl border-border/60",
        )}
      >
        {/* Subtle warm left accent stripe */}
        <div
          className="absolute left-0 top-0 bottom-0 w-[2px] opacity-50 dark:opacity-30 lg:hidden"
          style={{ background: "linear-gradient(to bottom, transparent 0%, var(--warm-solid) 40%, var(--warm-amber) 70%, transparent 100%)" }}
        />

        {/* Header */}
        <div className="shrink-0 pt-4 px-3 pb-3 border-b border-border/40 space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <MessagesSquare className="w-4 h-4 text-primary" />
              <span className="font-display font-semibold text-sm text-foreground">对话历史</span>
              {conversations.length > 0 && (
                <span
                  className="px-1.5 py-0.5 rounded-full text-[10px] font-bold font-display"
                  style={{ background: "hsl(var(--primary) / 0.1)", color: "var(--warm-solid)", border: "1px solid hsl(var(--primary) / 0.2)" }}
                >
                  {conversations.length}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              {/* New conversation button */}
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.93 }}
                onClick={onNew}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold font-display transition-all duration-150"
                style={{
                  background: "hsl(var(--primary) / 0.1)",
                  color: "var(--warm-solid)",
                  border: "1px solid hsl(var(--primary) / 0.25)",
                }}
              >
                <Plus className="w-3.5 h-3.5" />
                新对话
              </motion.button>

              <button
                onClick={onClose}
                className="lg:hidden p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/40 pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索对话…"
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl outline-none transition-all placeholder:text-muted-foreground/35 font-sans"
              style={{
                background: "hsl(var(--muted) / 0.5)",
                border: "1px solid hsl(var(--border) / 0.5)",
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = "hsl(var(--primary) / 0.4)" }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "hsl(var(--border) / 0.5)" }}
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-muted-foreground transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <EmptyState hasSearch={!!search} />
          ) : search.trim() ? (
            <div className="px-2 space-y-0.5">
              <p className="text-[10px] text-muted-foreground/45 font-medium px-2 py-1">
                找到 {filtered.length} 条结果
              </p>
              {filtered.map((conv, i) => (
                <ConversationItem key={conv.id} conv={conv} isActive={conv.id === activeId} index={i}
                  onSelect={onSelect}
                  onDelete={onDelete} />
              ))}
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {groups!.map((group) => (
                <ConversationGroup key={group.label} label={group.label} items={group.items}
                  activeId={activeId} onSelect={onSelect} onDelete={onDelete} />
              ))}
            </AnimatePresence>
          )}
        </div>

        {/* Footer */}
        <SidebarFooter total={conversations.length} />
      </aside>
    </>
  )
}

/* ─── Group ─────────────────────────────────────────────────────────────── */
function ConversationGroup({ label, items, activeId, onSelect, onDelete }: {
  label: string; items: Conversation[]; activeId: string | null
  onSelect: (id: string) => void; onDelete: (id: string) => void
}) {
  return (
    <div className="px-2 mb-1">
      <div className="flex items-center gap-1.5 px-2 py-1.5 mb-0.5">
        <Clock className="w-3 h-3 text-muted-foreground/35" />
        <span className="text-[10px] font-semibold font-display text-muted-foreground/45 uppercase tracking-widest">
          {label}
        </span>
      </div>
      <div className="space-y-0.5">
        {items.map((conv, i) => (
          <ConversationItem key={conv.id} conv={conv} isActive={conv.id === activeId} index={i}
            onSelect={onSelect}
            onDelete={onDelete} />
        ))}
      </div>
    </div>
  )
}

/* ─── Item ───────────────────────────────────────────────────────────────── */
interface ConversationItemProps {
  conv: Conversation; isActive: boolean; index: number
  onSelect: (id: string) => void; onDelete: (id: string) => void
}

function ConversationItem({ conv, isActive, index, onSelect, onDelete }: ConversationItemProps) {
  const lastMsg = conv.messages[conv.messages.length - 1]
  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onDelete(conv.id)
  }, [conv.id, onDelete])

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -6, transition: { duration: 0.12 } }}
      transition={{ delay: index * 0.025, duration: 0.22 }}
    >
      <motion.button
        whileHover={{ x: 2 }}
        transition={{ duration: 0.1 }}
        onClick={() => onSelect(conv.id)}
        className={cn(
          "group w-full flex items-start gap-2.5 px-2.5 py-2.5 rounded-xl text-left transition-all duration-150 relative overflow-hidden",
          isActive ? "border" : "hover:bg-muted/50 border border-transparent",
        )}
        style={isActive ? {
          background: "hsl(var(--primary) / 0.07)",
          borderColor: "hsl(var(--primary) / 0.22)",
          boxShadow: "0 0 12px hsl(var(--primary) / 0.08)",
        } : {}}
      >
        {/* Active: left accent bar */}
        {isActive && (
          <div className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full"
            style={{ background: "var(--warm-solid)" }} />
        )}

        {/* Icon */}
        <div className={cn(
          "mt-0.5 shrink-0 w-6 h-6 rounded-lg flex items-center justify-center transition-all",
          isActive ? "" : "bg-muted group-hover:bg-muted/80",
        )}
          style={isActive ? { background: "hsl(var(--primary) / 0.12)" } : {}}>
          <MessageSquare className="w-3.5 h-3.5"
            style={isActive ? { color: "var(--warm-solid)" } : { color: "hsl(var(--muted-foreground) / 0.5)" }} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold font-display truncate leading-snug"
            style={isActive ? { color: "var(--warm-solid)" } : {}}>
            {conv.title}
          </p>
          <p className="text-[11px] text-muted-foreground/45 truncate mt-0.5 font-sans">
            {lastMsg ? truncate(lastMsg.content.replace(/[#*`]/g, ""), 22) : "空对话"}
          </p>
        </div>

        <div className="shrink-0 flex flex-col items-end gap-1 pt-0.5">
          <span className="text-[10px] text-muted-foreground/35 whitespace-nowrap tabular-nums">
            {formatTime(conv.updatedAt)}
          </span>
          <motion.button whileTap={{ scale: 0.85 }} onClick={handleDelete}
            className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-muted-foreground/30 hover:text-destructive transition-all">
            <Trash2 className="w-3 h-3" />
          </motion.button>
        </div>

        {isActive && <ChevronRight className="w-3 h-3 mt-0.5 shrink-0 self-center" style={{ color: "hsl(var(--primary) / 0.5)" }} />}
      </motion.button>
    </motion.div>
  )
}

/* ─── Empty State ────────────────────────────────────────────────────────── */
function EmptyState({ hasSearch }: { hasSearch: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 px-4 text-center">
      <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center mb-3 text-2xl">
        {hasSearch ? "🔍" : "💬"}
      </div>
      <p className="text-sm font-semibold font-display text-foreground/55 mb-1">
        {hasSearch ? "没有找到对话" : "还没有对话"}
      </p>
      <p className="text-xs text-muted-foreground/35 leading-relaxed">
        {hasSearch ? "换个关键词试试" : "点击「新对话」开始"}
      </p>
    </div>
  )
}

/* ─── Footer ─────────────────────────────────────────────────────────────── */
function SidebarFooter({ total }: { total: number }) {
  return (
    <div className="shrink-0 px-3 py-3 border-t border-border/40">
      <div className="flex items-center gap-2.5 px-1">
        <div
          className="w-7 h-7 rounded-xl flex items-center justify-center text-sm shadow-sm select-none"
          style={{ background: "linear-gradient(135deg, hsl(var(--primary) / 0.12), hsl(var(--primary) / 0.08))", border: "1px solid hsl(var(--primary) / 0.22)" }}
        >
          🎓
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-black font-display gradient-text leading-none">AUSTPal</p>
          <p className="text-[10px] text-muted-foreground/40 mt-0.5 truncate font-sans">
            安理工 RAG 助手 · {total} 条对话
          </p>
        </div>
        <div
          className="flex items-center gap-1 px-1.5 py-0.5 rounded-full"
          style={{ background: "hsl(var(--primary) / 0.08)", border: "1px solid hsl(var(--primary) / 0.18)" }}
        >
          <span className="w-1 h-1 rounded-full animate-pulse" style={{ background: "var(--warm-solid)" }} />
          <span className="text-[9px] font-semibold font-display" style={{ color: "var(--warm-solid)" }}>运行中</span>
        </div>
      </div>
    </div>
  )
}
