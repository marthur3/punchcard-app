"use client"

import type React from "react"

import { Suspense, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Eye, EyeOff, UserPlus, ArrowLeft } from "lucide-react"
import { useAuth } from "@/lib/auth-context"

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-900"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400"></div></div>}>
      <RegisterContent />
    </Suspense>
  )
}

function RegisterContent() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  })
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()
  const searchParams = useSearchParams()
  const { register } = useAuth()
  const redirect = searchParams.get("redirect") || "/dashboard"

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match")
      setIsLoading(false)
      return
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters long")
      setIsLoading(false)
      return
    }

    const result = await register(formData.email, formData.password, formData.name, formData.phone || undefined)

    if (result.success) {
      const separator = redirect.includes("?") ? "&" : "?"
      router.push(`${redirect}${separator}welcome=true`)
    } else {
      setError(result.error || "Registration failed")
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
          <h1 className="text-2xl font-bold text-white">Create your account</h1>
          <p className="text-gray-400 mt-1">Start earning rewards today</p>
        </div>
      </div>

      {/* Form card pulled up into header */}
      <div className="max-w-md mx-auto px-4 -mt-8 pb-8">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive" className="border-red-200 bg-red-50">
                <AlertDescription className="text-red-800">{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="name" className="text-gray-700 text-sm font-medium">Full Name</Label>
              <Input
                id="name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleChange}
                placeholder="John Doe"
                className="h-11 border-gray-200 bg-gray-50 focus:bg-white focus:border-amber-400 focus:ring-amber-400 rounded-xl"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-700 text-sm font-medium">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="your@email.com"
                className="h-11 border-gray-200 bg-gray-50 focus:bg-white focus:border-amber-400 focus:ring-amber-400 rounded-xl"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-gray-700 text-sm font-medium">Phone (Optional)</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+1 (555) 123-4567"
                className="h-11 border-gray-200 bg-gray-50 focus:bg-white focus:border-amber-400 focus:ring-amber-400 rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-700 text-sm font-medium">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Create a password"
                  className="h-11 border-gray-200 bg-gray-50 focus:bg-white focus:border-amber-400 focus:ring-amber-400 rounded-xl"
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

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-gray-700 text-sm font-medium">Confirm Password</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm your password"
                className="h-11 border-gray-200 bg-gray-50 focus:bg-white focus:border-amber-400 focus:ring-amber-400 rounded-xl"
                required
              />
            </div>

            <Button type="submit" className="w-full h-11 bg-gray-900 hover:bg-gray-800 text-white rounded-xl font-medium" disabled={isLoading}>
              {isLoading ? (
                "Creating account..."
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Create Account
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              Already have an account?{" "}
              <Link href={`/auth/login?redirect=${encodeURIComponent(redirect)}`} className="text-amber-600 hover:text-amber-700 font-medium">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
