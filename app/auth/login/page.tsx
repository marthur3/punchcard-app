"use client"

import type React from "react"

import { Suspense, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Eye, EyeOff, LogIn, ArrowLeft } from "lucide-react"
import { useAuth } from "@/lib/auth-context"

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-900"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400"></div></div>}>
      <LoginContent />
    </Suspense>
  )
}

function LoginContent() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login, isDemoMode } = useAuth()

  const redirect = searchParams.get("redirect") || "/dashboard"

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const result = await login(email, password)

      if (result.success) {
        router.push(redirect)
      } else {
        setError(result.error || "Login failed")
      }
    } catch {
      setError("An unexpected error occurred")
    }

    setIsLoading(false)
  }

  const fillDemoCredentials = async () => {
    setEmail("demo@example.com")
    setPassword("demo123")
    setIsLoading(true)
    setError("")
    try {
      const result = await login("demo@example.com", "demo123")
      if (result.success) {
        router.push(redirect)
      } else {
        setError(result.error || "Demo login failed")
      }
    } catch {
      setError("An unexpected error occurred")
    }
    setIsLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Dark header */}
      <div className="bg-gradient-to-b from-gray-900 to-gray-800">
        <div className="max-w-md mx-auto px-4 pt-6 pb-16">
          <Link href="/" className="inline-flex items-center text-sm text-gray-400 hover:text-white transition-colors mb-8">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Link>
          <h1 className="text-2xl font-bold text-white">Welcome back</h1>
          <p className="text-gray-400 mt-1">Sign in to your account</p>
        </div>
      </div>

      {/* Form card pulled up into header */}
      <div className="max-w-md mx-auto px-4 -mt-8">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive" className="border-red-200 bg-red-50">
                <AlertDescription className="text-red-800">{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-700 text-sm font-medium">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="h-11 border-gray-200 bg-gray-50 focus:bg-white focus:border-amber-400 focus:ring-amber-400 rounded-xl"
                autoComplete="email"
                inputMode="email"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck="false"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-700 text-sm font-medium">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="h-11 border-gray-200 bg-gray-50 focus:bg-white focus:border-amber-400 focus:ring-amber-400 rounded-xl"
                  autoComplete="current-password"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck="false"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </Button>
              </div>
            </div>

            <Button type="submit" className="w-full h-11 bg-gray-900 hover:bg-gray-800 text-white rounded-xl font-medium" disabled={isLoading}>
              {isLoading ? (
                "Signing in..."
              ) : (
                <>
                  <LogIn className="h-4 w-4 mr-2" />
                  Sign In
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              Don&apos;t have an account?{" "}
              <Link href={`/auth/register?redirect=${encodeURIComponent(redirect)}`} className="text-amber-600 hover:text-amber-700 font-medium">
                Sign up
              </Link>
            </p>
          </div>

          {isDemoMode && (
            <div className="mt-4 p-4 bg-amber-50 rounded-xl border border-amber-200">
              <div className="flex justify-between items-center mb-2">
                <p className="text-sm font-medium text-gray-900">Demo Account</p>
                <Button
                  type="button"
                  size="sm"
                  onClick={fillDemoCredentials}
                  className="text-xs bg-amber-500 hover:bg-amber-600 text-white rounded-lg"
                >
                  Use Demo
                </Button>
              </div>
              <p className="text-xs text-gray-600">demo@example.com / demo123</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
