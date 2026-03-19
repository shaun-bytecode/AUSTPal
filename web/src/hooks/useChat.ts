import { useState, useCallback, useMemo, useEffect, useRef } from "react"
import { Conversation, Message } from "@/types/chat"
import { generateId, truncate, TYPEWRITER_SPEED_MS } from "@/lib/utils"

const USER_ID = "web_user"

function makeConversation(title: string): Conversation {
  return {
    id: generateId(),
    title,
    messages: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

/** 将后端 session JSON 转换为前端 Conversation */
function sessionToConversation(session: {
  session_id: string
  created_at: string
  updated_at: string
  messages: { type: string; content: string }[]
}): Conversation {
  // 后端日期格式 "2026-03-19 00:31:46" → ISO 8601，避免浏览器解析歧义
  const toDate = (s: string) => new Date(s.replace(" ", "T"))
  const createdAt = toDate(session.created_at)
  const updatedAt = toDate(session.updated_at)

  const messages: Message[] = session.messages.map((m, i) => ({
    id: `${session.session_id}-${i}`,
    role: m.type === "human" ? "user" : "assistant",
    content: m.content,
    timestamp: new Date(updatedAt.getTime() - (session.messages.length - i) * 1000),
    isTyping: false,
  }))

  const firstUser = session.messages.find((m) => m.type === "human")
  const title = firstUser ? truncate(firstUser.content, 18) : "历史对话"

  return { id: session.session_id, title, messages, createdAt, updatedAt }
}

/** Immutably update one conversation in the list by id */
function patchConv(id: string, update: (c: Conversation) => Conversation) {
  return (convs: Conversation[]) => convs.map((c) => (c.id === id ? update(c) : c))
}

export function useChat() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const isLoadingRef = useRef(false)
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => {
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
  }, [])

  // 启动时从后端加载历史会话
  useEffect(() => {
    async function loadHistory() {
      try {
        const res = await fetch(`/api/history/${USER_ID}`)
        if (!res.ok) return
        const { sessions } = await res.json() as { sessions: { session_id: string; message_count: number }[] }
        if (!sessions.length) return

        const convs = await Promise.all(
          sessions
            .filter((s) => s.message_count > 0)
            .map(async (s) => {
              const r = await fetch(`/api/history/${USER_ID}/${s.session_id}`)
              if (!r.ok) return null
              return sessionToConversation(await r.json())
            })
        )

        setConversations(convs.filter((c): c is Conversation => c !== null))
      } catch (err) {
        console.error("[useChat] 加载历史记录失败：", err)
      }
    }
    loadHistory()
  }, [])

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeConversationId) ?? null,
    [conversations, activeConversationId],
  )

  const createNewConversation = useCallback(() => {
    const conv = makeConversation("新对话")
    setConversations((prev) => [conv, ...prev])
    setActiveConversationId(conv.id)
    return conv.id
  }, [])

  const sendMessage = useCallback(
    async (content: string) => {
      if (isLoadingRef.current) return

      let convId = activeConversationId

      // Auto-create a conversation if none is active
      if (!convId) {
        const conv = makeConversation(truncate(content, 18))
        setConversations((prev) => [conv, ...prev])
        setActiveConversationId(conv.id)
        convId = conv.id
      }

      const userMsg: Message = {
        id: generateId(),
        role: "user",
        content,
        timestamp: new Date(),
      }

      setConversations(patchConv(convId, (c) => ({
        ...c,
        messages: [...c.messages, userMsg],
        title: c.messages.length === 0 ? truncate(content, 18) : c.title,
        updatedAt: new Date(),
      })))

      isLoadingRef.current = true
      setIsLoading(true)

      const assistantMsgId = generateId()

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: content,
            user_id: "web_user",
            session_id: convId,
          }),
        })

        if (!response.ok || !response.body) {
          throw new Error(`HTTP ${response.status}`)
        }

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ""
        let firstChunk = true
        let fullAnswer = ""

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split("\n")
          buffer = lines.pop() ?? ""

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue
            const data = line.slice(6)
            if (data === "[DONE]") continue

            try {
              const parsed = JSON.parse(data) as { type: string; content: string }
              const { type, content: chunk } = parsed

              if (firstChunk) {
                firstChunk = false
                isLoadingRef.current = false
                setIsLoading(false)
                // 立即插入助手消息，开始流式显示推理过程
                setConversations(patchConv(convId!, (c) => ({
                  ...c,
                  messages: [
                    ...c.messages,
                    {
                      id: assistantMsgId,
                      role: "assistant" as const,
                      content: "",
                      timestamp: new Date(),
                      isTyping: false,
                      thinking: type === "thinking" ? chunk : "",
                      thinkingDone: false,
                    },
                  ],
                  updatedAt: new Date(),
                })))
                if (type === "answer") fullAnswer += chunk
              } else {
                if (type === "thinking") {
                  // 实时追加推理内容
                  setConversations(patchConv(convId!, (c) => ({
                    ...c,
                    messages: c.messages.map((m) =>
                      m.id === assistantMsgId
                        ? { ...m, thinking: (m.thinking ?? "") + chunk }
                        : m,
                    ),
                  })))
                } else {
                  fullAnswer += chunk
                }
              }
            } catch {
              // Ignore malformed chunks
            }
          }
        }

        // 流结束：推理完毕，用打字机播放最终答案
        if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
        const finalContent = fullAnswer.trim() || "（未收到回答，请重试）"
        setConversations(patchConv(convId!, (c) => ({
          ...c,
          messages: c.messages.map((m) =>
            m.id === assistantMsgId
              ? { ...m, content: finalContent, thinkingDone: true, isTyping: true }
              : m,
          ),
        })))
        const duration = finalContent.length * TYPEWRITER_SPEED_MS + 300
        typingTimerRef.current = setTimeout(() => {
          setConversations(patchConv(convId!, (c) => ({
            ...c,
            messages: c.messages.map((m) =>
              m.id === assistantMsgId ? { ...m, isTyping: false } : m,
            ),
          })))
        }, duration)
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : "未知错误"
        setConversations(patchConv(convId!, (c) => ({
          ...c,
          messages: [
            ...c.messages,
            {
              id: assistantMsgId,
              role: "assistant" as const,
              content: `> ⚠️ 连接后端服务失败：${errMsg}\n>\n> 请确保后端已在 \`localhost:8000\` 启动（运行 \`python server.py\`）。`,
              timestamp: new Date(),
              isTyping: false,
            },
          ],
          updatedAt: new Date(),
        })))
      } finally {
        isLoadingRef.current = false
        setIsLoading(false)
      }
    },
    [activeConversationId],
  )

  const selectConversation = useCallback((id: string) => {
    setActiveConversationId(id)
  }, [])

  const deleteConversation = useCallback(
    (id: string) => {
      setConversations((prev) => prev.filter((c) => c.id !== id))
      if (activeConversationId === id) setActiveConversationId(null)
      fetch(`/api/history/${USER_ID}/${id}`, { method: "DELETE" }).catch(() => {})
    },
    [activeConversationId],
  )

  return {
    conversations,
    activeConversation,
    activeConversationId,
    isLoading,
    createNewConversation,
    sendMessage,
    selectConversation,
    deleteConversation,
  }
}
