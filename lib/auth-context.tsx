"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import { type User, validateSession, logoutUser } from "./auth"

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (token: string) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const login = (token: string) => {
    localStorage.setItem("auth_token", token)
    checkAuth()
  }

  const logout = async () => {
    const token = localStorage.getItem("auth_token")
    if (token) {
      await logoutUser(token)
      localStorage.removeItem("auth_token")
    }
    setUser(null)
  }

  const checkAuth = async () => {
    const token = localStorage.getItem("auth_token")
    if (!token) {
      setIsLoading(false)
      return
    }

    const validatedUser = await validateSession(token)
    if (validatedUser) {
      setUser(validatedUser)
    } else {
      localStorage.removeItem("auth_token")
    }
    setIsLoading(false)
  }

  useEffect(() => {
    checkAuth()
  }, [])

  return <AuthContext.Provider value={{ user, isLoading, login, logout }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
