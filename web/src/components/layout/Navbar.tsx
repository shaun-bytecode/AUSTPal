import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Moon, Sun, Menu, Github, BookMarked, Zap, PanelLeft, LogOut, User, ChevronDown, X, Mail, CalendarDays, Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import { apiFetch } from "@/lib/api"
import type { AuthUser } from "@/hooks/useAuth"

interface UserDetail {
  user_id:        string
  display_name:   string | null
  email:          string | null
  is_active:      number
  created_at:     string
  last_active_at: string | null
}

function ProfileModal({ user, onClose }: { user: AuthUser; onClose: () => void }) {
  const [detail, setDetail] = useState<UserDetail | null>(null)

  useEffect(() => {
    apiFetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setDetail(d))
      .catch(() => {})
  }, [])

  const displayName = detail?.display_name || user.display_name || user.user_id
  const avatar      = displayName.charAt(0).toUpperCase()

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-background/60 backdrop-blur-sm"
      />

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.93, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.93, y: 12 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-sm glass-deep rounded-2xl overflow-hidden"
        style={{ boxShadow: "0 12px 48px hsl(var(--primary) / 0.12), 0 2px 12px rgb(0 0 0 / 0.1)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Warm top line */}
        <div className="h-[2px]" style={{
          background: "linear-gradient(90deg, transparent, var(--warm-solid), var(--warm-amber), transparent)"
        }} />

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4">
          <h2 className="text-base font-bold text-foreground font-display">个人信息</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Avatar + name */}
        <div className="px-5 pb-5 flex items-center gap-4">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-black text-white select-none shrink-0"
            style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.7))" }}
          >
            {avatar}
          </div>
          <div className="min-w-0">
            <p className="text-lg font-bold text-foreground truncate font-display">{displayName}</p>
            <p className="text-sm text-muted-foreground">@{user.user_id}</p>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-border/50 mx-5" />

        {/* Detail rows */}
        <div className="px-5 py-4 space-y-3">
          {[
            {
              icon: <User className="w-3.5 h-3.5" />,
              label: "用户名",
              value: user.user_id,
            },
            {
              icon: <Mail className="w-3.5 h-3.5" />,
              label: "邮箱",
              value: detail?.email ?? "—",
            },
            {
              icon: <CalendarDays className="w-3.5 h-3.5" />,
              label: "注册时间",
              value: detail?.created_at ?? "—",
            },
            {
              icon: <Clock className="w-3.5 h-3.5" />,
              label: "最后活跃",
              value: detail?.last_active_at ?? "—",
            },
          ].map(({ icon, label, value }) => (
            <div key={label} className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: "hsl(var(--primary) / 0.1)", color: "var(--warm-solid)" }}>
                {icon}
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground font-medium tracking-wide uppercase font-display">{label}</p>
                <p className="text-sm text-foreground truncate font-display">{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Status badge */}
        <div className="px-5 pb-5">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold font-display"
            style={{
              background: "hsl(142 60% 50% / 0.1)",
              color: "hsl(142 60% 40%)",
              border: "1px solid hsl(142 60% 50% / 0.2)",
            }}>
            <span className="w-1.5 h-1.5 rounded-full bg-current" />
            账号正常
          </span>
        </div>
      </motion.div>
    </div>
  )
}

interface NavbarProps {
  isDark:           boolean
  onToggleDark:     () => void
  onToggleSidebar:  () => void
  isSidebarOpen:    boolean
  isCollapsed:      boolean
  onToggleCollapse: () => void
  user?:            AuthUser | null
  onLogout?:        () => void
}

export function Navbar({
  isDark, onToggleDark, onToggleSidebar,
  isSidebarOpen, isCollapsed, onToggleCollapse,
  user, onLogout,
}: NavbarProps) {
  const [userMenuOpen,  setUserMenuOpen]  = useState(false)
  const [profileOpen,   setProfileOpen]   = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // 点击外部关闭菜单
  useEffect(() => {
    if (!userMenuOpen) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [userMenuOpen])

  // 显示名优先，fallback 到 user_id 首字母
  const displayName = user?.display_name || user?.user_id || "?"
  const avatar      = displayName.charAt(0).toUpperCase()

  return (
    <>
    <header className="shrink-0 h-16 glass-deep border-b z-30 relative flex items-center px-4 sm:px-5 gap-3">

      {/* Warm top line */}
      <div className="absolute top-0 left-0 right-0 h-[1px] overflow-hidden">
        <div
          className="h-full w-full animate-aurora-flow"
          style={{
            background: "linear-gradient(90deg, transparent 0%, var(--warm-solid) 25%, var(--warm-solid) 50%, var(--warm-amber) 75%, transparent 100%)",
            backgroundSize: "200% 100%",
          }}
        />
      </div>

      {/* Desktop sidebar collapse toggle */}
      <motion.button
        whileTap={{ scale: 0.88 }}
        onClick={onToggleCollapse}
        title={isCollapsed ? "展开侧边栏" : "收起侧边栏"}
        className={cn(
          "hidden lg:flex p-2 rounded-xl transition-all duration-150",
          isCollapsed
            ? "text-primary bg-primary/10"
            : "text-muted-foreground hover:text-foreground hover:bg-muted",
        )}
      >
        <motion.div
          animate={{ rotate: isCollapsed ? 180 : 0 }}
          transition={{ duration: 0.25, type: "spring", stiffness: 300 }}
        >
          <PanelLeft className="w-[18px] h-[18px]" />
        </motion.div>
      </motion.button>

      {/* Mobile sidebar toggle */}
      <motion.button
        whileTap={{ scale: 0.88 }}
        onClick={onToggleSidebar}
        className={cn(
          "lg:hidden p-2 rounded-xl transition-all duration-150",
          isSidebarOpen
            ? "bg-primary/12 text-primary"
            : "text-muted-foreground hover:text-foreground hover:bg-muted",
        )}
      >
        <motion.div animate={{ rotate: isSidebarOpen ? 90 : 0 }} transition={{ duration: 0.22, type: "spring", stiffness: 300 }}>
          <Menu className="w-5 h-5" />
        </motion.div>
      </motion.button>

      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, x: -12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="flex items-center gap-3 mr-auto"
      >
        <motion.div
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.94 }}
          transition={{ type: "spring", stiffness: 400 }}
          className="relative w-8 h-8 rounded-xl flex items-center justify-center text-base select-none"
          style={{
            background: "linear-gradient(135deg, hsl(var(--primary) / 0.12), hsl(var(--primary) / 0.08))",
            border: "1px solid hsl(var(--primary) / 0.22)",
          }}
        >
          <span>🎓</span>
        </motion.div>

        <div className="flex flex-col leading-none font-display">
          <div className="flex items-center gap-2">
            <span className="font-black text-[17px] sm:text-lg tracking-tight gradient-text">
              AUSTPal
            </span>
            <div className="flex items-center gap-1 px-1.5 py-[3px] rounded-full border"
              style={{ borderColor: "hsl(var(--primary) / 0.3)", background: "hsl(var(--primary) / 0.1)" }}>
              <Zap className="w-2.5 h-2.5" style={{ color: "var(--warm-solid)" }} />
              <span className="text-[9px] font-bold tracking-wide" style={{ color: "var(--warm-solid)" }}>RAG</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Center — model status (desktop) */}
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.4 }}
        className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/60 border border-border/50"
      >
        <span className="w-1.5 h-1.5 rounded-full animate-glow-pulse" style={{ background: "var(--warm-solid)" }} />
        <span className="text-xs text-muted-foreground font-medium font-display">LLM · v1.0</span>
        <span className="w-px h-3 bg-border" />
        <span className="text-[10px] text-muted-foreground/50">在线</span>
      </motion.div>

      {/* Right actions */}
      <div className="flex items-center gap-1 sm:gap-1.5">
        <motion.a
          href="#" onClick={(e) => e.preventDefault()}
          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.92 }}
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted border border-transparent hover:border-border/60 transition-all duration-150"
        >
          <BookMarked className="w-3.5 h-3.5" />
          <span className="hidden lg:inline">文档</span>
        </motion.a>

        <motion.a
          href="https://github.com/shaun-bytecode/AUSTPal" target="_blank" rel="noopener noreferrer"
          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.92 }}
          className="hidden sm:flex w-8 h-8 rounded-xl items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
        >
          <Github className="w-4 h-4" />
        </motion.a>

        <div className="hidden sm:block w-px h-5 bg-border/60 mx-0.5" />

        {/* Theme toggle */}
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.88 }}
          onClick={onToggleDark}
          className="relative w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted overflow-hidden transition-all duration-200"
          title={isDark ? "切换浅色" : "切换深色"}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={isDark ? "moon" : "sun"}
              initial={{ rotate: -25, opacity: 0, scale: 0.65 }}
              animate={{ rotate: 0, opacity: 1, scale: 1 }}
              exit={{ rotate: 25, opacity: 0, scale: 0.65 }}
              transition={{ duration: 0.22, type: "spring", stiffness: 300 }}
            >
              {isDark
                ? <Moon className="w-[17px] h-[17px]" />
                : <Sun className="w-[18px] h-[18px]" style={{ color: "var(--warm-solid)" }} />
              }
            </motion.div>
          </AnimatePresence>
        </motion.button>

        {/* ── User menu ── */}
        {user && (
          <>
            <div className="hidden sm:block w-px h-5 bg-border/60 mx-0.5" />
            <div ref={menuRef} className="relative">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setUserMenuOpen((o) => !o)}
                className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-xl hover:bg-muted transition-all duration-150"
              >
                {/* Avatar */}
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white select-none"
                  style={{
                    background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.7))",
                  }}
                >
                  {avatar}
                </div>
                <span className="hidden sm:block text-xs font-semibold text-foreground/80 font-display max-w-[80px] truncate">
                  {displayName}
                </span>
                <motion.div
                  animate={{ rotate: userMenuOpen ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                </motion.div>
              </motion.button>

              {/* Dropdown */}
              <AnimatePresence>
                {userMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.95 }}
                    transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                    className="absolute right-0 top-full mt-2 w-48 glass-deep rounded-xl border overflow-hidden z-50"
                    style={{ boxShadow: "0 8px 24px rgb(0 0 0 / 0.12)" }}
                  >
                    {/* User info */}
                    <div className="px-3.5 py-3 border-b border-border/50">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold text-white"
                          style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.7))" }}
                        >
                          {avatar}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate font-display">{displayName}</p>
                          <p className="text-[10px] text-muted-foreground truncate">@{user.user_id}</p>
                        </div>
                      </div>
                    </div>

                    {/* Menu items */}
                    <div className="p-1.5">
                      <button
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors font-display"
                        onClick={() => { setUserMenuOpen(false); setProfileOpen(true) }}
                      >
                        <User className="w-3.5 h-3.5" />
                        个人信息
                      </button>
                      <button
                        onClick={() => { setUserMenuOpen(false); onLogout?.() }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-colors font-display"
                        style={{ color: "hsl(var(--destructive))" }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "hsl(var(--destructive) / 0.08)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        退出登录
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </>
        )}
      </div>
    </header>

    {/* Profile modal — rendered outside header to avoid z-index clipping */}
    <AnimatePresence>
      {profileOpen && user && (
        <ProfileModal user={user} onClose={() => setProfileOpen(false)} />
      )}
    </AnimatePresence>
    </>
  )
}
