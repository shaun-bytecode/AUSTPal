const TOKEN_KEY = "austpal-token"

/**
 * 带 Authorization 头的 fetch 封装。
 * 自动从 localStorage 读取 token，注入 Bearer 头。
 */
export function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = localStorage.getItem(TOKEN_KEY)
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  }
  if (token) headers["Authorization"] = `Bearer ${token}`
  return fetch(url, { ...options, headers })
}
