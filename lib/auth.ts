import { supabase } from "./supabase"
import { demoUsers } from "./demo-data"

export interface User {
  id: string
  email: string
  name: string
  phone?: string
  created_at: string
}

export interface AuthResult {
  success: boolean
  user?: User
  error?: string
  token?: string
}

// Simple hash function for demo purposes
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password + "salt")
  const hashBuffer = await crypto.subtle.digest("SHA-256", data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const hashedInput = await hashPassword(password)
  return hashedInput === hash
}

export async function generateSessionToken(): Promise<string> {
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}

export async function registerUser(email: string, password: string, name: string, phone?: string): Promise<AuthResult> {
  try {
    // Check if user already exists
    const { data: existingUser } = await supabase.from("users").select("id").eq("email", email).single()

    if (existingUser) {
      return { success: false, error: "User already exists with this email" }
    }

    // Hash password
    const passwordHash = await hashPassword(password)

    // Create user
    const { data: user, error } = await supabase
      .from("users")
      .insert({
        email,
        name,
        phone,
        password_hash: passwordHash,
        is_verified: true,
      })
      .select("id, email, name, phone, created_at")
      .single()

    if (error || !user) {
      return { success: false, error: "Failed to create user" }
    }

    // Create session
    const sessionToken = await generateSessionToken()
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    await supabase.from("user_sessions").insert({
      user_id: user.id,
      session_token: sessionToken,
      expires_at: expiresAt.toISOString(),
    })

    return {
      success: true,
      user: user as User,
      token: sessionToken,
    }
  } catch (error) {
    console.error("Registration error:", error)
    return { success: false, error: "Registration failed" }
  }
}

export async function loginUser(email: string, password: string): Promise<AuthResult> {
  try {
    console.log("Login attempt:", { email, password })

    // First, check if this is a demo user login attempt
    const isDemoUser = email.includes("@example.com") || email === "demo@example.com"
    const isDemoPassword = password === "demo123"

    if (isDemoUser && isDemoPassword) {
      console.log("Demo user login detected")

      // Find the demo user
      const demoUser = demoUsers.find((u) => u.email === email)

      if (demoUser) {
        console.log("Demo user found, creating demo session")
        const sessionToken = await generateSessionToken()

        // Store in localStorage for demo session
        if (typeof window !== "undefined") {
          localStorage.setItem("demo_user", JSON.stringify(demoUser))
          localStorage.setItem("demo_token", sessionToken)
          localStorage.setItem("demo_mode", "true")
        }

        return {
          success: true,
          user: demoUser,
          token: sessionToken,
        }
      }
    }

    // Try regular Supabase authentication
    console.log("Attempting Supabase authentication")
    const { data: user, error } = await supabase
      .from("users")
      .select("id, email, name, phone, created_at, password_hash")
      .eq("email", email)
      .single()

    if (error || !user) {
      console.log("User not found in database:", error)
      return { success: false, error: "Invalid email or password" }
    }

    // Verify password
    let isValidPassword = false
    if (password === "demo123" && user.email.includes("example.com")) {
      // Allow demo password for seeded demo users
      isValidPassword = true
    } else {
      isValidPassword = await verifyPassword(password, user.password_hash)
    }

    if (!isValidPassword) {
      console.log("Invalid password")
      return { success: false, error: "Invalid email or password" }
    }

    // Create session
    const sessionToken = await generateSessionToken()
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    await supabase.from("user_sessions").insert({
      user_id: user.id,
      session_token: sessionToken,
      expires_at: expiresAt.toISOString(),
    })

    const { password_hash, ...userWithoutPassword } = user

    return {
      success: true,
      user: userWithoutPassword as User,
      token: sessionToken,
    }
  } catch (error) {
    console.error("Login error:", error)
    return { success: false, error: "Login failed" }
  }
}

export async function validateSession(token: string): Promise<User | null> {
  try {
    // Check if this is a demo session first
    if (typeof window !== "undefined") {
      const demoMode = localStorage.getItem("demo_mode")
      const demoUser = localStorage.getItem("demo_user")
      const demoToken = localStorage.getItem("demo_token")

      if (demoMode === "true" && demoUser && demoToken === token) {
        return JSON.parse(demoUser)
      }
    }

    // Regular Supabase session validation
    const { data: session } = await supabase
      .from("user_sessions")
      .select(`
        user_id,
        expires_at,
        users:user_id (id, email, name, phone, created_at)
      `)
      .eq("session_token", token)
      .gt("expires_at", new Date().toISOString())
      .single()

    if (!session || !session.users) {
      return null
    }

    return session.users as User
  } catch (error) {
    console.error("Session validation error:", error)
    return null
  }
}

export async function logoutUser(token: string): Promise<void> {
  try {
    // Clear demo session if exists
    if (typeof window !== "undefined") {
      const demoMode = localStorage.getItem("demo_mode")
      if (demoMode === "true") {
        localStorage.removeItem("demo_user")
        localStorage.removeItem("demo_token")
        localStorage.removeItem("demo_mode")
        return
      }
    }

    // Regular Supabase logout
    await supabase.from("user_sessions").delete().eq("session_token", token)
  } catch (error) {
    console.error("Logout error:", error)
  }
}
