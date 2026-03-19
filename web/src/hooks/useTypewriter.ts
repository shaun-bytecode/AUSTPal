import { useState, useEffect, useRef } from "react"

interface UseTypewriterOptions {
  text: string
  speed?: number
  enabled?: boolean
  onComplete?: () => void
}

export function useTypewriter({
  text,
  speed = 18,
  enabled = true,
  onComplete,
}: UseTypewriterOptions) {
  const [displayedText, setDisplayedText] = useState(enabled ? "" : text)
  const [isComplete, setIsComplete] = useState(!enabled)
  const indexRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const textRef = useRef(text)
  const onCompleteRef = useRef(onComplete)

  // Keep ref in sync so tick always calls the latest callback
  useEffect(() => {
    onCompleteRef.current = onComplete
  })

  useEffect(() => {
    textRef.current = text

    if (!enabled) {
      setDisplayedText(text)
      setIsComplete(true)
      return
    }

    setDisplayedText("")
    setIsComplete(false)
    indexRef.current = 0

    const tick = () => {
      if (indexRef.current < textRef.current.length) {
        setDisplayedText(textRef.current.slice(0, indexRef.current + 1))
        indexRef.current++
        timerRef.current = setTimeout(tick, speed)
      } else {
        setIsComplete(true)
        onCompleteRef.current?.()
      }
    }

    timerRef.current = setTimeout(tick, speed)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [text, speed, enabled])

  return { displayedText, isComplete }
}
