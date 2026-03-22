import { useState, useCallback } from "react"

const TOKEN_KEY = "austpal-token"
const USER_KEY  = "austpal-user"

export interface AuthUser {
  user_id:      string
  display_name: string | null
}

function readUser(): AuthUser | null {
  try {
    const s = localStorage.getItem(USER_KEY)
    return s ? (JSON.parse(s) as AuthUser) : null
  } catch {
    return null
  }
}

export function useAuth() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY))
  const [user,  setUser]  = useState<AuthUser | null>(readUser)

  const _applyAuth = useCallback((accessToken: string, authUser: AuthUser) => {
    localStorage.setItem(TOKEN_KEY, accessToken)
    localStorage.setItem(USER_KEY, JSON.stringify(authUser))
    setToken(accessToken)
    setUser(authUser)
  }, [])

  /** 登录：失败时抛出 Error（message 为后端返回的中文提示） */
  const login = useCallback(async (user_id: string, password: string): Promise<void> => {
    const res = await fetch("/api/auth/login", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ user_id, password }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.detail ?? "登录失败，请稍后重试")
    }
    const data = await res.json()
    _applyAuth(data.access_token, {
      user_id:      data.user_id,
      display_name: data.display_name ?? null,
    })
  }, [_applyAuth])

  /** 注册：成功后自动登录 */
  const register = useCallback(async (
    user_id:      string,
    password:     string,
    display_name?: string,
    email?:        string,
  ): Promise<void> => {
    const res = await fetch("/api/auth/register", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ user_id, password, display_name, email }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.detail ?? "注册失败，请稍后重试")
    }
    await login(user_id, password)
  }, [login])

  /** 退出登录，清除所有本地状态 */
  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    setToken(null)
    setUser(null)
  }, [])

  return {
    token,
    user,
    isAuthenticated: !!token,
    login,
    register,
    logout,
  }
}
