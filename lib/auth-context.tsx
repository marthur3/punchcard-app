"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState, useCallback } from "react"

export interface User {
  id: string
  email: string
  name: string
  phone?: string
  created_at?: string
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isDemoMode: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  register: (email: string, password: string, name: string, phone?: string) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Demo mode helpers
function getDemoUser(): User | null {
  if (typeof window === "undefined") return null
  const stored = localStorage.getItem("demo_user")
  return stored ? JSON.parse(stored) : null
}

function setDemoUser(user: User) {
  if (typeof window === "undefined") return
  localStorage.setItem("demo_user", JSON.stringify(user))
  localStorage.setItem("demo_mode", "true")
}

function clearDemoUser() {
  if (typeof window === "undefined") return
  localStorage.removeItem("demo_user")
  localStorage.removeItem("demo_token")
  localStorage.removeItem("demo_mode")
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDemoMode, setIsDemoMode] = useState(false)

  const checkAuth = useCallback(async () => {
    try {
      // Check for demo user first
      const demoUser = getDemoUser()
      if (demoUser) {
        setUser(demoUser)
        setIsDemoMode(true)
        setIsLoading(false)
        return
      }

      // Check server session via API
      const res = await fetch("/api/auth/session")
      if (res.ok) {
        const data = await res.json()
        if (data.user) {
          setUser(data.user)
          setIsDemoMode(false)
        } else if (data.demo) {
          setIsDemoMode(true)
        }
      }
    } catch {
      // Session check failed - user not logged in
    } finally {
      setIsLoading(false)
    }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        return { success: false, error: data.error || "Login failed" }
      }

      if (data.demo) {
        // Demo mode - store in localStorage
        setDemoUser(data.user)
        setUser(data.user)
        setIsDemoMode(true)
      } else {
        // Real mode - cookie is set by server
        setUser(data.user)
        setIsDemoMode(false)
      }

      return { success: true }
    } catch {
      return { success: false, error: "Login failed. Please try again." }
    }
  }, [])

  const register = useCallback(async (email: string, password: string, name: string, phone?: string) => {
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name, phone }),
      })

      const data = await res.json()

      if (!res.ok) {
        return { success: false, error: data.error || "Registration failed" }
      }

      // Cookie is set by server, update local state
      setUser(data.user)
      setIsDemoMode(false)

      return { success: true }
    } catch {
      return { success: false, error: "Registration failed. Please try again." }
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" })
    } catch {
      // Logout failed, still clear local state
    }
    clearDemoUser()
    setUser(null)
    setIsDemoMode(false)
  }, [])

  const refreshUser = useCallback(async () => {
    await checkAuth()
  }, [checkAuth])

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  return (
    <AuthContext.Provider value={{ user, isLoading, isDemoMode, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
