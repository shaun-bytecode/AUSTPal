import { motion } from "framer-motion"
import { LibraryBig, CloudSun, GalleryHorizontal, Disc3, BookOpen, Users, FlaskConical, Trophy, ArrowRight } from "lucide-react"

const STATS = [
  { value: "78+", label: "年办学历史", icon: Trophy },
  { value: "3万+", label: "在校学生",   icon: Users },
  { value: "200+", label: "万册馆藏",   icon: BookOpen },
  { value: "20+",  label: "博士授权点", icon: FlaskConical },
]

const CARDS = [
  {
    icon: LibraryBig,
    title: "知识库查询", desc: "从校园知识库中检索权威信息",
    features: ["RAG 增强检索", "校园百科", "政策文件"],
    prompt: "帮我在知识库里查一下安徽理工大学的校史和办学特色",
    accentFrom: "#C4622D", accentTo: "#E07245", tag: "RAG",
  },
  {
    icon: CloudSun,
    title: "校园天气", desc: "淮南校区 & 合肥校区实时天气",
    features: ["实时气温", "未来三天", "双校区"],
    prompt: "查询安徽理工大学淮南校区今天的天气情况",
    accentFrom: "#0EA5E9", accentTo: "#38BDF8", tag: "天气",
  },
  {
    icon: GalleryHorizontal,
    title: "校园图片", desc: "智能搜索校园相关图片",
    features: ["校园风景", "教学楼", "智能搜图"],
    prompt: "帮我搜索一些安徽理工大学校园风景的图片",
    accentFrom: "#A87D3C", accentTo: "#C4A265", tag: "图片",
  },
  {
    icon: Disc3,
    title: "播放校歌", desc: "播放安徽理工大学校歌及歌词",
    features: ["校歌音频", "同步歌词", "一键播放"],
    prompt: "播放安徽理工大学的校歌",
    accentFrom: "#8B5CF6", accentTo: "#A78BFA", tag: "校歌",
  },
]

const QUICK_PROMPTS = [
  "安徽理工大学基本情况介绍",
  "学校现任领导有哪些？",
  "学校有哪些教学学院？",
  "学校章程的主要内容是什么？",
  "学校的校训和校徽是什么？",
]

interface WelcomeScreenProps {
  onSuggestion: (prompt: string) => void
}

const container = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } }
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 320, damping: 28 } } }

export function WelcomeScreen({ onSuggestion }: WelcomeScreenProps) {
  return (
    <div className="overflow-y-auto h-full">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-8">

        {/* ── Hero card ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="relative rounded-3xl overflow-hidden p-6 sm:p-8"
          style={{
            background: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
          }}
        >
          {/* Warm glow blobs */}
          <div className="absolute top-0 right-0 w-64 h-64 pointer-events-none"
            style={{ background: "radial-gradient(circle at top right, hsl(var(--primary) / 0.08), transparent 65%)" }} />
          <div className="absolute bottom-0 left-0 w-48 h-48 pointer-events-none"
            style={{ background: "radial-gradient(circle at bottom left, hsl(var(--primary) / 0.05), transparent 65%)" }} />

          {/* Top stripe */}
          <div className="absolute top-0 left-0 right-0 h-[2px]"
            style={{ background: "linear-gradient(90deg, transparent, #C4622D 35%, #E07245 65%, transparent)" }} />

          <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-5">
            {/* Avatar */}
            <motion.div
              animate={{ y: [0, -7, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="relative shrink-0"
            >
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl flex items-center justify-center text-4xl sm:text-5xl shadow-xl select-none"
                style={{
                  background: "linear-gradient(135deg, hsl(var(--primary) / 0.12), hsl(var(--primary) / 0.08))",
                  border: "1px solid hsl(var(--primary) / 0.2)",
                }}>
                🎓
              </div>
              {/* Pulsing ring */}
              <motion.div
                animate={{ scale: [1, 1.15, 1], opacity: [0.35, 0, 0.35] }}
                transition={{ duration: 2.5, repeat: Infinity }}
                className="absolute inset-0 rounded-3xl pointer-events-none"
                style={{ border: "1px solid #C4622D" }}
              />
            </motion.div>

            <div className="flex-1">
              <h1 className="font-display font-black text-2xl sm:text-3xl text-foreground mb-2 leading-tight">
                你好！我是{" "}
                <span className="gradient-text">AUSTPal</span>
                {" "}👋
              </h1>
              <p className="text-sm sm:text-base leading-relaxed font-sans text-muted-foreground/70">
                基于 RAG 技术的校园知识助手，涵盖招生、校园生活、学术、就业等全方位信息。
              </p>
            </div>
          </div>
        </motion.div>

        {/* ── Stats ── */}
        <motion.div
          variants={container} initial="hidden" animate="show"
          className="grid grid-cols-2 sm:grid-cols-4 gap-3"
        >
          {STATS.map((stat) => {
            const Icon = stat.icon
            return (
              <motion.div key={stat.label} variants={item}
                className="flex flex-col items-center gap-2 p-3.5 rounded-2xl border transition-all duration-200 cursor-default"
                style={{ background: "hsl(var(--card))", borderColor: "hsl(var(--border))" }}
                whileHover={{ borderColor: "hsl(var(--primary) / 0.3)", boxShadow: "0 0 16px hsl(var(--primary) / 0.08)", y: -2 }}
              >
                <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background: "hsl(var(--primary) / 0.1)" }}>
                  <Icon className="w-4 h-4" style={{ color: "var(--warm-solid)" }} />
                </div>
                <p className="text-lg font-black font-display gradient-text">{stat.value}</p>
                <p className="text-[11px] text-muted-foreground/55 text-center leading-tight font-sans">
                  {stat.label}
                </p>
              </motion.div>
            )
          })}
        </motion.div>

        {/* ── Suggestion cards ── */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}>
          <div className="flex items-center gap-2.5 mb-3.5">
            <div className="w-1 h-4 rounded-full" style={{ background: "linear-gradient(to bottom, #C4622D, #E07245)" }} />
            <p className="text-sm font-semibold font-display text-foreground/75">快速开始</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {CARDS.map((card, i) => (
              <motion.button
                key={card.title}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.28 + i * 0.07, type: "spring", stiffness: 300, damping: 28 }}
                whileHover={{ y: -3, scale: 1.015 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onSuggestion(card.prompt)}
                className="group relative flex items-start gap-3.5 p-4 rounded-2xl border text-left overflow-hidden transition-all duration-200"
                style={{ background: "hsl(var(--card))", borderColor: "hsl(var(--border))" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = `${card.accentFrom}40`
                  e.currentTarget.style.boxShadow = `0 0 20px ${card.accentFrom}12, 0 6px 20px rgba(0,0,0,0.08)`
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "hsl(var(--border))"
                  e.currentTarget.style.boxShadow = ""
                }}
              >
                <div className="absolute left-0 top-0 bottom-0 w-[3px] opacity-0 group-hover:opacity-100 transition-opacity rounded-l-2xl"
                  style={{ background: `linear-gradient(to bottom, ${card.accentFrom}, ${card.accentTo})` }} />

                <div className="shrink-0 w-10 h-10 rounded-2xl flex items-center justify-center"
                  style={{ background: `${card.accentFrom}18`, border: `1px solid ${card.accentFrom}35` }}>
                  <card.icon className="w-5 h-5" style={{ color: card.accentFrom }} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-sm font-display text-foreground">{card.title}</p>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full font-display"
                      style={{ background: `${card.accentFrom}20`, color: card.accentFrom, border: `1px solid ${card.accentFrom}30` }}>
                      {card.tag}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground/55 leading-relaxed font-sans mb-2">{card.desc}</p>
                  <div className="flex flex-wrap gap-1">
                    {card.features.map((f) => (
                      <span key={f} className="text-[10px] px-2 py-0.5 rounded-full font-sans"
                        style={{ background: `${card.accentFrom}12`, color: `${card.accentFrom}cc`, border: `1px solid ${card.accentFrom}25` }}>
                        {f}
                      </span>
                    ))}
                  </div>
                </div>

                <ArrowRight className="w-4 h-4 text-muted-foreground/20 group-hover:text-muted-foreground/60 group-hover:translate-x-0.5 transition-all duration-200 shrink-0 mt-3" />
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* ── Quick prompts ── */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.38 }} className="pb-2">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-1 h-4 rounded-full" style={{ background: "linear-gradient(to bottom, #A87D3C, #C4622D)" }} />
            <p className="text-sm font-semibold font-display text-foreground/75">大家都在问</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {QUICK_PROMPTS.map((prompt, i) => (
              <motion.button
                key={prompt}
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.42 + i * 0.05, type: "spring", stiffness: 320 }}
                whileHover={{ scale: 1.05, y: -1 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => onSuggestion(prompt)}
                className="px-3.5 py-1.5 rounded-full text-xs font-medium font-display border transition-all duration-150"
                style={{ background: "hsl(var(--secondary))", borderColor: "hsl(var(--border))", color: "hsl(var(--muted-foreground))" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "hsl(var(--primary) / 0.08)"
                  e.currentTarget.style.borderColor = "hsl(var(--primary) / 0.3)"
                  e.currentTarget.style.color = "var(--warm-solid)"
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "hsl(var(--secondary))"
                  e.currentTarget.style.borderColor = "hsl(var(--border))"
                  e.currentTarget.style.color = "hsl(var(--muted-foreground))"
                }}
              >
                {prompt}
              </motion.button>
            ))}
          </div>
        </motion.div>

      </div>
    </div>
  )
}
