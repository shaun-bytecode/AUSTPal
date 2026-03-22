import { useState, useEffect, useCallback } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Navbar } from "@/components/layout/Navbar"
import { Sidebar } from "@/components/layout/Sidebar"
import { ChatArea } from "@/components/chat/ChatArea"
import { AuthPage } from "@/components/auth/AuthPage"
import { useChat } from "@/hooks/useChat"
import { useAuth } from "@/hooks/useAuth"

export default function App() {
  const auth = useAuth()

  const [isDark, setIsDark] = useState(() => {
    if (typeof window === "undefined") return false
    const stored = localStorage.getItem("austpal-theme")
    if (stored) return stored === "dark"
    return window.matchMedia("(prefers-color-scheme: dark)").matches
  })

  const [sidebarOpen,      setSidebarOpen]      = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const handleToggleSidebar  = useCallback(() => setSidebarOpen((o) => !o), [])
  const handleToggleCollapse = useCallback(() => setSidebarCollapsed((c) => !c), [])

  const {
    conversations,
    activeConversation,
    activeConversationId,
    isLoading,
    createNewConversation,
    sendMessage,
    selectConversation,
    deleteConversation,
  } = useChat(auth.token)

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark)
    localStorage.setItem("austpal-theme", isDark ? "dark" : "light")
  }, [isDark])

  return (
    <AnimatePresence mode="wait">
      {/* ── 未登录：显示认证页 ── */}
      {!auth.isAuthenticated ? (
        <AuthPage key="auth" auth={auth} />
      ) : (
        /* ── 已登录：聊天界面 ── */
        <motion.div
          key="chat"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col h-screen w-screen overflow-hidden bg-background"
        >
          {/* ── Warm ambient background ── */}
          <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10" aria-hidden>
            <motion.div
              animate={{ x: [0, 35, -15, 0], y: [0, -25, 15, 0] }}
              transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -top-32 -left-32 w-[520px] h-[520px] rounded-full opacity-[0.06] dark:opacity-[0.08]"
              style={{ background: "radial-gradient(circle, #C4622D 0%, transparent 70%)" }}
            />
            <motion.div
              animate={{ x: [0, -30, 20, 0], y: [0, 20, -18, 0] }}
              transition={{ duration: 26, repeat: Infinity, ease: "easeInOut", delay: 4 }}
              className="absolute -bottom-40 -right-40 w-[600px] h-[600px] rounded-full opacity-[0.04] dark:opacity-[0.07]"
              style={{ background: "radial-gradient(circle, #A87D3C 0%, transparent 70%)" }}
            />
            <motion.div
              animate={{ x: [0, 20, -10, 0], y: [0, -10, 20, 0] }}
              transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 8 }}
              className="absolute top-1/3 right-1/4 w-[360px] h-[360px] rounded-full opacity-[0.03] dark:opacity-[0.05]"
              style={{ background: "radial-gradient(circle, #C4622D 0%, transparent 70%)" }}
            />
            <div
              className="absolute inset-0 opacity-0 dark:opacity-[0.018]"
              style={{
                backgroundImage: `linear-gradient(hsl(30 15% 55% / 0.3) 1px, transparent 1px),
                                  linear-gradient(90deg, hsl(30 15% 55% / 0.3) 1px, transparent 1px)`,
                backgroundSize: "48px 48px",
              }}
            />
          </div>

          {/* Top navbar */}
          <Navbar
            isDark={isDark}
            onToggleDark={() => setIsDark((d) => !d)}
            onToggleSidebar={handleToggleSidebar}
            isSidebarOpen={sidebarOpen}
            isCollapsed={sidebarCollapsed}
            onToggleCollapse={handleToggleCollapse}
            user={auth.user}
            onLogout={auth.logout}
          />

          {/* Main layout */}
          <div className="flex flex-1 overflow-hidden">
            <Sidebar
              conversations={conversations}
              activeId={activeConversationId}
              isOpen={sidebarOpen}
              isCollapsed={sidebarCollapsed}
              onClose={() => setSidebarOpen(false)}
              onToggleCollapse={handleToggleCollapse}
              onNew={() => { createNewConversation(); setSidebarOpen(false) }}
              onSelect={(id) => { selectConversation(id); setSidebarOpen(false) }}
              onDelete={deleteConversation}
            />

            <main className="flex-1 overflow-hidden flex flex-col min-w-0">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeConversationId ?? "welcome"}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                  className="flex-1 h-full overflow-hidden flex flex-col"
                >
                  <ChatArea
                    conversation={activeConversation}
                    isLoading={isLoading}
                    onSendMessage={sendMessage}
                  />
                </motion.div>
              </AnimatePresence>
            </main>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
