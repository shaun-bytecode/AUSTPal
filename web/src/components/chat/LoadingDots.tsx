import React from "react"

const DOT_STYLES: React.CSSProperties[] = [
  { width: "7px", height: "7px", animationDelay: "0s",    background: "rgba(196, 98, 45, 0.5)", boxShadow: "none" },
  { width: "9px", height: "9px", animationDelay: "0.17s", background: "#C4622D",                boxShadow: "0 0 8px rgba(196,98,45,0.5)" },
  { width: "7px", height: "7px", animationDelay: "0.34s", background: "rgba(196, 98, 45, 0.7)", boxShadow: "none" },
]

export function LoadingDots() {
  return (
    <div className="flex items-end gap-[5px]">
      {DOT_STYLES.map((style, i) => (
        <span key={i} className="block rounded-full animate-bounce-dot" style={style} />
      ))}
    </div>
  )
}
