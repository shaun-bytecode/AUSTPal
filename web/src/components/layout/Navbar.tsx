import { motion, AnimatePresence } from "framer-motion"
import { Moon, Sun, Menu, Github, BookMarked, Zap, PanelLeft } from "lucide-react"
import { cn } from "@/lib/utils"

interface NavbarProps {
  isDark: boolean
  onToggleDark: () => void
  onToggleSidebar: () => void
  isSidebarOpen: boolean
  isCollapsed: boolean
  onToggleCollapse: () => void
}

export function Navbar({ isDark, onToggleDark, onToggleSidebar, isSidebarOpen, isCollapsed, onToggleCollapse }: NavbarProps) {
  return (
    <header className="shrink-0 h-16 glass-deep border-b z-30 relative flex items-center px-4 sm:px-5 gap-3">

      {/* Warm top line — subtle gradient */}
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
        {/* Icon */}
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
          href="#" onClick={(e) => e.preventDefault()}
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
      </div>
    </header>
  )
}
