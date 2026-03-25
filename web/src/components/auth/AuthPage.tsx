import { useState, useId, useRef, useEffect } from "react"
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

/* ─── Pill input ─────────────────────────────────────────── */
interface PillInputProps {
  id: string; label: string; type?: string
  value: string; onChange: (v: string) => void
  icon: React.ReactNode; placeholder?: string
  disabled?: boolean; autoComplete?: string
  showPass?: boolean; onTogglePass?: () => void
  onFocusChange?: (focused: boolean) => void
}
function PillInput({ id, label, type = "text", value, onChange, icon, placeholder, disabled, autoComplete, showPass, onTogglePass, onFocusChange }: PillInputProps) {
  const [focused, setFocused] = useState(false)
  const isPassword = type === "password"
  const inputType  = isPassword ? (showPass ? "text" : "password") : type

  const handleFocus = () => { setFocused(true); onFocusChange?.(true) }
  const handleBlur  = () => { setFocused(false); onFocusChange?.(false) }

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
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder} disabled={disabled} autoComplete={autoComplete}
          className="flex-1 bg-transparent px-2 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/30 outline-none disabled:opacity-50 font-display"
        />
        {isPassword && (
          <button type="button" tabIndex={-1} onClick={onTogglePass}
            className="pr-4 text-muted-foreground/35 hover:text-muted-foreground/70 transition-colors">
            {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </motion.div>
    </div>
  )
}

/* ─── Pupil (dot eyes for orange/yellow) ─────────────────── */
function Pupil({ size = 12, maxDistance = 5, color = "#2D2D2D", forceLookX, forceLookY }: {
  size?: number; maxDistance?: number; color?: string
  forceLookX?: number; forceLookY?: number
}) {
  const [mouseX, setMouseX] = useState(0)
  const [mouseY, setMouseY] = useState(0)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => { setMouseX(e.clientX); setMouseY(e.clientY) }
    window.addEventListener("mousemove", h)
    return () => window.removeEventListener("mousemove", h)
  }, [])

  const pos = (() => {
    if (!ref.current) return { x: 0, y: 0 }
    if (forceLookX !== undefined && forceLookY !== undefined) return { x: forceLookX, y: forceLookY }
    const r = ref.current.getBoundingClientRect()
    const dx = mouseX - (r.left + r.width / 2)
    const dy = mouseY - (r.top + r.height / 2)
    const dist = Math.min(Math.sqrt(dx * dx + dy * dy), maxDistance)
    const angle = Math.atan2(dy, dx)
    return { x: Math.cos(angle) * dist, y: Math.sin(angle) * dist }
  })()

  return (
    <div ref={ref} className="rounded-full" style={{
      width: size, height: size, backgroundColor: color,
      transform: `translate(${pos.x}px, ${pos.y}px)`,
      transition: "transform 0.1s ease-out",
    }} />
  )
}

/* ─── EyeBall (white eye + pupil for purple/black) ───────── */
function EyeBall({ size = 48, pupilSize = 16, maxDistance = 10, isBlinking = false, forceLookX, forceLookY }: {
  size?: number; pupilSize?: number; maxDistance?: number
  isBlinking?: boolean; forceLookX?: number; forceLookY?: number
}) {
  const [mouseX, setMouseX] = useState(0)
  const [mouseY, setMouseY] = useState(0)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => { setMouseX(e.clientX); setMouseY(e.clientY) }
    window.addEventListener("mousemove", h)
    return () => window.removeEventListener("mousemove", h)
  }, [])

  const pos = (() => {
    if (!ref.current) return { x: 0, y: 0 }
    if (forceLookX !== undefined && forceLookY !== undefined) return { x: forceLookX, y: forceLookY }
    const r = ref.current.getBoundingClientRect()
    const dx = mouseX - (r.left + r.width / 2)
    const dy = mouseY - (r.top + r.height / 2)
    const dist = Math.min(Math.sqrt(dx * dx + dy * dy), maxDistance)
    const angle = Math.atan2(dy, dx)
    return { x: Math.cos(angle) * dist, y: Math.sin(angle) * dist }
  })()

  return (
    <div ref={ref} className="rounded-full flex items-center justify-center transition-all duration-150"
      style={{
        width: size, height: isBlinking ? 2 : size,
        backgroundColor: "white", overflow: "hidden",
      }}>
      {!isBlinking && (
        <div className="rounded-full" style={{
          width: pupilSize, height: pupilSize, backgroundColor: "#2D2D2D",
          transform: `translate(${pos.x}px, ${pos.y}px)`,
          transition: "transform 0.1s ease-out",
        }} />
      )}
    </div>
  )
}

/* ─── Animated Characters ────────────────────────────────── */
function AnimatedCharacters({ isTyping = false, showPassword = false, passwordLength = 0 }: {
  isTyping?: boolean; showPassword?: boolean; passwordLength?: number
}) {
  const [mouseX, setMouseX] = useState(0)
  const [mouseY, setMouseY] = useState(0)
  const [isPurpleBlinking, setIsPurpleBlinking] = useState(false)
  const [isBlackBlinking, setIsBlackBlinking] = useState(false)
  const [isLookingAtEachOther, setIsLookingAtEachOther] = useState(false)
  const [isPurplePeeking, setIsPurplePeeking] = useState(false)
  const purpleRef = useRef<HTMLDivElement>(null)
  const blackRef = useRef<HTMLDivElement>(null)
  const yellowRef = useRef<HTMLDivElement>(null)
  const orangeRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => { setMouseX(e.clientX); setMouseY(e.clientY) }
    window.addEventListener("mousemove", h)
    return () => window.removeEventListener("mousemove", h)
  }, [])

  // Blinking — purple
  useEffect(() => {
    const schedule = (): ReturnType<typeof setTimeout> => {
      return setTimeout(() => {
        setIsPurpleBlinking(true)
        setTimeout(() => { setIsPurpleBlinking(false); schedule() }, 150)
      }, Math.random() * 4000 + 3000)
    }
    const t = schedule()
    return () => clearTimeout(t)
  }, [])

  // Blinking — black
  useEffect(() => {
    const schedule = (): ReturnType<typeof setTimeout> => {
      return setTimeout(() => {
        setIsBlackBlinking(true)
        setTimeout(() => { setIsBlackBlinking(false); schedule() }, 150)
      }, Math.random() * 4000 + 3000)
    }
    const t = schedule()
    return () => clearTimeout(t)
  }, [])

  // Look at each other when typing starts
  useEffect(() => {
    if (isTyping) {
      setIsLookingAtEachOther(true)
      const t = setTimeout(() => setIsLookingAtEachOther(false), 800)
      return () => clearTimeout(t)
    }
    setIsLookingAtEachOther(false)
  }, [isTyping])

  // Purple peeking when password visible
  useEffect(() => {
    if (passwordLength > 0 && showPassword) {
      const t = setTimeout(() => {
        setIsPurplePeeking(true)
        setTimeout(() => setIsPurplePeeking(false), 800)
      }, Math.random() * 3000 + 2000)
      return () => clearTimeout(t)
    }
    setIsPurplePeeking(false)
  }, [passwordLength, showPassword, isPurplePeeking])

  const calcPos = (ref: React.RefObject<HTMLDivElement | null>) => {
    if (!ref.current) return { faceX: 0, faceY: 0, bodySkew: 0 }
    const rect = ref.current.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 3
    const dx = mouseX - cx
    const dy = mouseY - cy
    return {
      faceX: Math.max(-15, Math.min(15, dx / 20)),
      faceY: Math.max(-10, Math.min(10, dy / 30)),
      bodySkew: Math.max(-6, Math.min(6, -dx / 120)),
    }
  }

  const purplePos = calcPos(purpleRef)
  const blackPos = calcPos(blackRef)
  const yellowPos = calcPos(yellowRef)
  const orangePos = calcPos(orangeRef)

  const isHiding = passwordLength > 0 && !showPassword
  const isRevealed = passwordLength > 0 && showPassword

  return (
    <div className="relative" style={{ width: 550, height: 400 }}>
      {/* ── Purple tall rectangle ── z1 */}
      <div ref={purpleRef} className="absolute bottom-0 transition-all duration-700 ease-in-out"
        style={{
          left: 70, width: 180,
          height: (isTyping || isHiding) ? 440 : 400,
          backgroundColor: "#6C3FF5",
          borderRadius: "10px 10px 0 0",
          zIndex: 1,
          transform: isRevealed
            ? "skewX(0deg)"
            : (isTyping || isHiding)
              ? `skewX(${(purplePos.bodySkew) - 12}deg) translateX(40px)`
              : `skewX(${purplePos.bodySkew}deg)`,
          transformOrigin: "bottom center",
        }}>
        <div className="absolute flex gap-8 transition-all duration-700 ease-in-out"
          style={{
            left: isRevealed ? 20 : isLookingAtEachOther ? 55 : 45 + purplePos.faceX,
            top: isRevealed ? 35 : isLookingAtEachOther ? 65 : 40 + purplePos.faceY,
          }}>
          <EyeBall size={18} pupilSize={7} maxDistance={5} isBlinking={isPurpleBlinking}
            forceLookX={isRevealed ? (isPurplePeeking ? 4 : -4) : isLookingAtEachOther ? 3 : undefined}
            forceLookY={isRevealed ? (isPurplePeeking ? 5 : -4) : isLookingAtEachOther ? 4 : undefined} />
          <EyeBall size={18} pupilSize={7} maxDistance={5} isBlinking={isPurpleBlinking}
            forceLookX={isRevealed ? (isPurplePeeking ? 4 : -4) : isLookingAtEachOther ? 3 : undefined}
            forceLookY={isRevealed ? (isPurplePeeking ? 5 : -4) : isLookingAtEachOther ? 4 : undefined} />
        </div>
      </div>

      {/* ── Black tall rectangle ── z2 */}
      <div ref={blackRef} className="absolute bottom-0 transition-all duration-700 ease-in-out"
        style={{
          left: 240, width: 120, height: 310,
          backgroundColor: "#2D2D2D",
          borderRadius: "8px 8px 0 0",
          zIndex: 2,
          transform: isRevealed
            ? "skewX(0deg)"
            : isLookingAtEachOther
              ? `skewX(${blackPos.bodySkew * 1.5 + 10}deg) translateX(20px)`
              : (isTyping || isHiding)
                ? `skewX(${blackPos.bodySkew * 1.5}deg)`
                : `skewX(${blackPos.bodySkew}deg)`,
          transformOrigin: "bottom center",
        }}>
        <div className="absolute flex gap-6 transition-all duration-700 ease-in-out"
          style={{
            left: isRevealed ? 10 : isLookingAtEachOther ? 32 : 26 + blackPos.faceX,
            top: isRevealed ? 28 : isLookingAtEachOther ? 12 : 32 + blackPos.faceY,
          }}>
          <EyeBall size={16} pupilSize={6} maxDistance={4} isBlinking={isBlackBlinking}
            forceLookX={isRevealed ? -4 : isLookingAtEachOther ? 0 : undefined}
            forceLookY={isRevealed ? -4 : isLookingAtEachOther ? -4 : undefined} />
          <EyeBall size={16} pupilSize={6} maxDistance={4} isBlinking={isBlackBlinking}
            forceLookX={isRevealed ? -4 : isLookingAtEachOther ? 0 : undefined}
            forceLookY={isRevealed ? -4 : isLookingAtEachOther ? -4 : undefined} />
        </div>
      </div>

      {/* ── Orange semi-circle ── z3 */}
      <div ref={orangeRef} className="absolute bottom-0 transition-all duration-700 ease-in-out"
        style={{
          left: 0, width: 240, height: 200,
          backgroundColor: "#FF9B6B",
          borderRadius: "120px 120px 0 0",
          zIndex: 3,
          transform: isRevealed ? "skewX(0deg)" : `skewX(${orangePos.bodySkew}deg)`,
          transformOrigin: "bottom center",
        }}>
        <div className="absolute flex gap-8 transition-all duration-200 ease-out"
          style={{
            left: isRevealed ? 50 : 82 + orangePos.faceX,
            top: isRevealed ? 85 : 90 + orangePos.faceY,
          }}>
          <Pupil size={12} maxDistance={5} forceLookX={isRevealed ? -5 : undefined} forceLookY={isRevealed ? -4 : undefined} />
          <Pupil size={12} maxDistance={5} forceLookX={isRevealed ? -5 : undefined} forceLookY={isRevealed ? -4 : undefined} />
        </div>
      </div>

      {/* ── Yellow rounded character ── z4 */}
      <div ref={yellowRef} className="absolute bottom-0 transition-all duration-700 ease-in-out"
        style={{
          left: 310, width: 140, height: 230,
          backgroundColor: "#E8D754",
          borderRadius: "70px 70px 0 0",
          zIndex: 4,
          transform: isRevealed ? "skewX(0deg)" : `skewX(${yellowPos.bodySkew}deg)`,
          transformOrigin: "bottom center",
        }}>
        <div className="absolute flex gap-6 transition-all duration-200 ease-out"
          style={{
            left: isRevealed ? 20 : 52 + yellowPos.faceX,
            top: isRevealed ? 35 : 40 + yellowPos.faceY,
          }}>
          <Pupil size={12} maxDistance={5} forceLookX={isRevealed ? -5 : undefined} forceLookY={isRevealed ? -4 : undefined} />
          <Pupil size={12} maxDistance={5} forceLookX={isRevealed ? -5 : undefined} forceLookY={isRevealed ? -4 : undefined} />
        </div>
        {/* Mouth */}
        <div className="absolute w-20 h-[4px] bg-[#2D2D2D] rounded-full transition-all duration-200 ease-out"
          style={{
            left: isRevealed ? 10 : 40 + yellowPos.faceX,
            top: isRevealed ? 88 : 88 + yellowPos.faceY,
          }} />
      </div>
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
  const [showPass, setShowPass] = useState(false)
  const [showConfirmPass, setShowConfirmPass] = useState(false)
  const [isTypingPwd, setIsTypingPwd] = useState(false)
  const uid = useId()

  const passwordVisible = showPass || showConfirmPass

  const switchMode = (m: "login" | "register") => {
    setMode(m); setError(""); setPassword(""); setConfirm("")
    setShowPass(false); setShowConfirmPass(false)
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
        className="hidden lg:flex lg:w-[56%] xl:w-[60%] relative flex-col justify-between shrink-0 p-10 overflow-hidden"
        style={{ background: "linear-gradient(160deg, #9898b0 0%, #7a7a93 40%, #6a6a80 100%)" }}
      >
        {/* Brand */}
        <div className="relative z-20 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
            style={{ background: "rgba(255,255,255,0.12)", backdropFilter: "blur(8px)" }}>
            🎓
          </div>
          <span className="text-white/90 text-lg font-bold tracking-wide font-display">AUSTPal</span>
        </div>

        {/* Characters */}
        <div className="relative z-20 flex items-end justify-center" style={{ height: 420 }}>
          <AnimatedCharacters
            isTyping={isTypingPwd}
            showPassword={passwordVisible}
            passwordLength={password.length}
          />
        </div>

        {/* Bottom tag */}
        <div className="relative z-20 flex items-center gap-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full"
            style={{ background: "rgba(255,255,255,0.1)", backdropFilter: "blur(8px)" }}>
            <Sparkles className="w-3 h-3 text-white/50" />
            <span className="text-xs font-medium tracking-wide text-white/50 font-display">
              安徽理工大学智能助手
            </span>
          </div>
        </div>

        {/* Decorative blurs */}
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: "radial-gradient(circle at 25% 75%, rgba(255,255,255,0.06) 0%, transparent 50%), radial-gradient(circle at 75% 25%, rgba(255,255,255,0.04) 0%, transparent 50%)",
        }} />

        {/* Curved edge */}
        <svg className="absolute right-0 top-0 h-full w-16 pointer-events-none z-30" viewBox="0 0 64 800" preserveAspectRatio="none">
          <path d="M64,0 Q0,400 64,800 L64,800 L64,0 Z" fill="hsl(var(--background))" />
        </svg>
      </motion.div>

      {/* ══════════ RIGHT PANEL ══════════ */}
      <motion.div
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
        className="flex-1 flex flex-col overflow-y-auto"
      >
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
                    disabled={loading} autoComplete={mode === "login" ? "current-password" : "new-password"}
                    showPass={showPass} onTogglePass={() => setShowPass(s => !s)}
                    onFocusChange={setIsTypingPwd} />

                  {mode === "register" && (
                    <>
                      <PillInput id={`${uid}-confirm`} label="确认密码" type="password" value={confirm} onChange={setConfirm}
                        icon={<Lock className="w-4 h-4" />} placeholder="再次输入密码"
                        disabled={loading} autoComplete="new-password"
                        showPass={showConfirmPass} onTogglePass={() => setShowConfirmPass(s => !s)}
                        onFocusChange={(f) => setIsTypingPwd(f)} />
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
