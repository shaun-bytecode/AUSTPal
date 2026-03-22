import { useState, useId } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Eye, EyeOff, User, Lock, Mail, BadgeCheck, Loader2, ArrowRight, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import type { useAuth } from "@/hooks/useAuth"

type AuthHook = ReturnType<typeof useAuth>
interface AuthPageProps { auth: AuthHook }

const shake = {
  idle:  { x: 0 },
  shake: { x: [0, -10, 10, -7, 7, -4, 4, 0], transition: { duration: 0.5 } },
}

const DOTS = Array.from({ length: 18 }, (_, i) => ({
  id: i,
  x:  `${8 + Math.random() * 84}%`,
  y:  `${5 + Math.random() * 90}%`,
  r:  1 + Math.random() * 2,
  dur: 7 + Math.random() * 9,
  delay: Math.random() * 5,
}))

/* ─── Pill input ──────────────────────────────────────────── */
interface PillInputProps {
  id: string; label: string; type?: string
  value: string; onChange: (v: string) => void
  icon: React.ReactNode; placeholder?: string
  disabled?: boolean; autoComplete?: string
}
function PillInput({ id, label, type = "text", value, onChange, icon, placeholder, disabled, autoComplete }: PillInputProps) {
  const [focused,  setFocused]  = useState(false)
  const [showPass, setShowPass] = useState(false)
  const isPassword = type === "password"
  const inputType  = isPassword ? (showPass ? "text" : "password") : type

  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-[11px] font-bold tracking-widest uppercase"
        style={{ color: "hsl(var(--muted-foreground) / 0.7)" }}>
        {label}
      </label>
      <motion.div
        animate={focused ? { scale: 1.012 } : { scale: 1 }}
        transition={{ duration: 0.15 }}
        className="relative flex items-center"
        style={{
          borderRadius: "999px",
          border: `1.5px solid ${focused ? "hsl(var(--primary) / 0.7)" : "hsl(var(--border))"}`,
          background: focused ? "hsl(var(--card))" : "hsl(var(--card) / 0.6)",
          boxShadow: focused ? "0 0 0 3px hsl(var(--primary) / 0.1)" : "none",
          transition: "all 0.2s",
        }}
      >
        <span className="pl-4 pr-1 shrink-0 transition-colors duration-200"
          style={{ color: focused ? "var(--warm-solid)" : "hsl(var(--muted-foreground) / 0.4)" }}>
          {icon}
        </span>
        <input
          id={id} type={inputType} value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder} disabled={disabled} autoComplete={autoComplete}
          className="flex-1 bg-transparent px-2 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/30 outline-none disabled:opacity-50 font-display"
        />
        {isPassword && (
          <button type="button" tabIndex={-1} onClick={() => setShowPass(s => !s)}
            className="pr-4 text-muted-foreground/35 hover:text-muted-foreground/70 transition-colors">
            {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </motion.div>
    </div>
  )
}

/* ─── Main ────────────────────────────────────────────────── */
export function AuthPage({ auth }: AuthPageProps) {
  const [mode,     setMode]    = useState<"login" | "register">("login")
  const [userId,   setUserId]  = useState("")
  const [password, setPassword]= useState("")
  const [confirm,  setConfirm] = useState("")
  const [name,     setName]    = useState("")
  const [email,    setEmail]   = useState("")
  const [error,    setError]   = useState("")
  const [loading,  setLoading] = useState(false)
  const [shakeKey, setShakeKey]= useState(0)
  const uid = useId()

  const switchMode = (m: "login" | "register") => {
    setMode(m); setError(""); setPassword(""); setConfirm("")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError("")
    if (mode === "register" && password !== confirm) {
      setError("两次输入的密码不一致"); setShakeKey(k => k + 1); return
    }
    setLoading(true)
    try {
      if (mode === "login") await auth.login(userId.trim(), password)
      else await auth.register(userId.trim(), password, name.trim() || undefined, email.trim() || undefined)
    } catch (err) {
      setError(err instanceof Error ? err.message : "操作失败"); setShakeKey(k => k + 1)
    } finally { setLoading(false) }
  }

  return (
    <motion.div
      key="auth-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.97, filter: "blur(6px)" }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="h-screen w-full flex overflow-hidden bg-background"
    >
      {/* ══════════ LEFT PANEL ══════════ */}
      <motion.div
        initial={{ x: -60, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="hidden lg:flex lg:w-[56%] xl:w-[60%] relative flex-col items-center justify-center overflow-hidden select-none shrink-0"
        style={{ background: "linear-gradient(145deg, hsl(20 45% 8%) 0%, hsl(22 38% 14%) 50%, hsl(25 35% 18%) 100%)" }}
      >
        {/* Radial glow */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at 38% 50%, hsl(var(--primary) / 0.2) 0%, transparent 62%)" }} />

        {/* Grid */}
        <div className="absolute inset-0 opacity-[0.035]" style={{
          backgroundImage: `linear-gradient(hsl(30 30% 60% / 0.6) 1px, transparent 1px),
                            linear-gradient(90deg, hsl(30 30% 60% / 0.6) 1px, transparent 1px)`,
          backgroundSize: "44px 44px",
        }} />

        {/* Particles */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden>
          {DOTS.map(d => (
            <motion.circle key={d.id} cx={d.x} cy={d.y} r={d.r}
              fill="var(--warm-solid)" fillOpacity={0.2}
              animate={{ cy: [`${parseFloat(d.y)}%`, `${parseFloat(d.y) - 2.5}%`, `${parseFloat(d.y)}%`] }}
              transition={{ duration: d.dur, repeat: Infinity, ease: "easeInOut", delay: d.delay }}
            />
          ))}
        </svg>

        {/* Curved edge */}
        <svg className="absolute right-0 top-0 h-full w-16 pointer-events-none" viewBox="0 0 64 800" preserveAspectRatio="none">
          <path d="M64,0 Q0,400 64,800 L64,800 L64,0 Z" fill="hsl(var(--background))" />
        </svg>

        {/* Branding */}
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 flex flex-col items-center gap-8"
        >
          {/* Orbit icon */}
          <div className="relative w-28 h-28">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="absolute inset-[-14px] rounded-full border border-dashed"
              style={{ borderColor: "hsl(var(--primary) / 0.2)" }} />
            <motion.div animate={{ rotate: -360 }} transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
              className="absolute inset-[-4px] rounded-full border"
              style={{ borderColor: "hsl(var(--primary) / 0.32)" }}>
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full"
                style={{ background: "var(--warm-solid)", boxShadow: "0 0 8px var(--warm-solid)" }} />
            </motion.div>
            <div className="absolute inset-0 rounded-3xl flex items-center justify-center text-4xl"
              style={{
                background: "linear-gradient(135deg, hsl(var(--primary) / 0.28), hsl(var(--primary) / 0.1))",
                border: "1px solid hsl(var(--primary) / 0.4)",
                boxShadow: "0 0 40px hsl(var(--primary) / 0.22), inset 0 1px 0 hsl(0 0% 100% / 0.08)",
              }}>
              🎓
            </div>
          </div>

          {/* Name */}
          <div className="text-center">
            <h1 className="text-7xl font-black tracking-tight leading-none"
              style={{
                background: "linear-gradient(135deg, #fff 0%, hsl(var(--primary) / 0.85) 55%, var(--warm-amber) 100%)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
              }}>
              AUSTPal
            </h1>
            <p className="mt-4 text-2xl tracking-widest font-medium"
              style={{ color: "hsl(0 0% 100% / 0.35)", letterSpacing: "0.2em" }}>
              安徽理工大学
            </p>
          </div>

          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.7, duration: 0.4 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full"
            style={{
              background: "hsl(var(--primary) / 0.12)",
              border: "1px solid hsl(var(--primary) / 0.25)",
            }}
          >
            <Sparkles className="w-3 h-3" style={{ color: "var(--warm-solid)" }} />
            <span className="text-base font-medium tracking-wide" style={{ color: "hsl(0 0% 100% / 0.45)" }}>
              RAG · LLM · LangChain
            </span>
          </motion.div>
        </motion.div>
      </motion.div>

      {/* ══════════ RIGHT PANEL ══════════ */}
      <motion.div
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
        className="flex-1 flex flex-col overflow-y-auto"
      >
        {/* Scrollable inner — centers content when short, scrolls from top when tall */}
        <div className="flex-1 flex flex-col items-center px-8 sm:px-14 py-10 min-h-full">
          <div className="my-auto w-full flex flex-col items-center">

          {/* Mobile logo */}
          <div className="lg:hidden mb-8 text-center">
            <span className="text-4xl font-black gradient-text font-display">AUSTPal</span>
            <p className="text-xs text-muted-foreground mt-1 font-display tracking-wider">安徽理工大学智能问答助手</p>
          </div>

          <div className="w-full max-w-sm space-y-6">

            {/* Heading */}
            <div>
              <AnimatePresence mode="wait">
                <motion.h2 key={mode}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.22 }}
                  className="text-3xl font-black text-foreground font-display tracking-tight">
                  {mode === "login" ? "欢迎回来 👋" : "加入我们 🎉"}
                </motion.h2>
              </AnimatePresence>
              <p className="text-sm text-muted-foreground font-display mt-1">
                {mode === "login" ? "登录账号继续使用" : "创建账号，探索校园助手"}
              </p>
            </div>

            {/* Toggle */}
            <div className="relative flex p-1 rounded-full bg-muted/60"
              style={{ border: "1px solid hsl(var(--border) / 0.6)" }}>
              <motion.div layoutId="auth-pill"
                className="absolute top-1 bottom-1 rounded-full bg-card"
                style={{
                  width: "calc(50% - 4px)",
                  left: mode === "login" ? "4px" : "calc(50%)",
                  boxShadow: "0 2px 8px rgb(0 0 0 / 0.08)",
                }}
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
              {(["login", "register"] as const).map(m => (
                <button key={m} onClick={() => switchMode(m)}
                  className={cn(
                    "relative z-10 flex-1 py-2 text-sm font-bold rounded-full transition-colors duration-200 font-display",
                    mode === m ? "text-foreground" : "text-muted-foreground/60 hover:text-muted-foreground",
                  )}>
                  {m === "login" ? "登录" : "注册"}
                </button>
              ))}
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3">
              <AnimatePresence mode="wait">
                <motion.div key={mode}
                  initial={{ opacity: 0, x: mode === "login" ? -16 : 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: mode === "login" ? 16 : -16 }}
                  transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                  className="space-y-3">

                  <PillInput id={`${uid}-uid`} label="用户名" value={userId} onChange={setUserId}
                    icon={<User className="w-4 h-4" />}
                    placeholder={mode === "login" ? "输入用户名" : "设置用户名 (3~64位)"}
                    disabled={loading} autoComplete="username" />

                  {mode === "register" && (
                    <PillInput id={`${uid}-name`} label="显示名称（可选）" value={name} onChange={setName}
                      icon={<BadgeCheck className="w-4 h-4" />} placeholder="你的昵称"
                      disabled={loading} autoComplete="nickname" />
                  )}

                  <PillInput id={`${uid}-pwd`} label="密码" type="password" value={password} onChange={setPassword}
                    icon={<Lock className="w-4 h-4" />}
                    placeholder={mode === "login" ? "输入密码" : "至少 6 位"}
                    disabled={loading} autoComplete={mode === "login" ? "current-password" : "new-password"} />

                  {mode === "register" && (
                    <>
                      <PillInput id={`${uid}-confirm`} label="确认密码" type="password" value={confirm} onChange={setConfirm}
                        icon={<Lock className="w-4 h-4" />} placeholder="再次输入密码"
                        disabled={loading} autoComplete="new-password" />
                      <PillInput id={`${uid}-email`} label="邮箱（可选）" type="email" value={email} onChange={setEmail}
                        icon={<Mail className="w-4 h-4" />} placeholder="your@email.com"
                        disabled={loading} autoComplete="email" />
                    </>
                  )}
                </motion.div>
              </AnimatePresence>

              {/* Error */}
              <AnimatePresence>
                {error && (
                  <motion.div key={shakeKey} variants={shake} initial="idle" animate="shake"
                    className="flex items-center gap-2 px-4 py-2 rounded-full text-sm"
                    style={{
                      background: "hsl(var(--destructive) / 0.08)",
                      border: "1px solid hsl(var(--destructive) / 0.2)",
                      color: "hsl(var(--destructive))",
                    }}>
                    <span>⚠</span>
                    <span className="font-medium font-display">{error}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Submit */}
              <motion.button type="submit"
                disabled={loading || !userId.trim() || !password.trim()}
                whileHover={{ scale: loading ? 1 : 1.02 }}
                whileTap={{ scale: loading ? 1 : 0.97 }}
                className="w-full flex items-center justify-center gap-2 py-3 text-sm font-bold text-white font-display disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  borderRadius: "999px",
                  background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.75))",
                  boxShadow: loading ? "none" : "0 6px 24px hsl(var(--primary) / 0.35)",
                }}>
                <AnimatePresence mode="wait">
                  {loading ? (
                    <motion.span key="l" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {mode === "login" ? "登录中…" : "注册中…"}
                    </motion.span>
                  ) : (
                    <motion.span key="i" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="flex items-center gap-2">
                      {mode === "login" ? "登录" : "创建账号"}
                      <ArrowRight className="w-4 h-4" />
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            </form>

            {/* Switch */}
            <p className="text-center text-sm text-muted-foreground font-display">
              {mode === "login" ? "还没有账号？" : "已有账号？"}
              <button onClick={() => switchMode(mode === "login" ? "register" : "login")}
                className="ml-1 font-bold hover:underline underline-offset-2 transition-colors"
                style={{ color: "var(--warm-solid)" }}>
                {mode === "login" ? "立即注册 →" : "返回登录 →"}
              </button>
            </p>
          </div>

          <p className="mt-10 text-[11px] text-muted-foreground/35 font-display text-center">
            AUSTPal · 仅供安徽理工大学内部使用
          </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
