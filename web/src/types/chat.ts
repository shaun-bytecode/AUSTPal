export interface Source {
  title: string
  url?: string
  snippet?: string
}

export interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
  isTyping?: boolean
  sources?: Source[]
  thinking?: string      // 推理过程（流式追加）
  thinkingDone?: boolean // true = 推理结束，最终答案已就绪
}

export interface Conversation {
  id: string
  title: string
  messages: Message[]
  createdAt: Date
  updatedAt: Date
}
