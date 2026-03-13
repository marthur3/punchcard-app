"use client"

import { AlertCircle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ErrorFallbackProps {
  error: Error & { digest?: string }
  reset: () => void
  title?: string
}

export function ErrorFallback({ error, reset, title = "Something went wrong" }: ErrorFallbackProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-gray-200 p-8 max-w-md w-full text-center shadow-sm">
        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="h-6 w-6 text-red-600" />
        </div>
        <h2 className="text-lg font-bold text-gray-900 mb-2">{title}</h2>
        <p className="text-sm text-gray-500 mb-6">
          {error.message || "An unexpected error occurred. Please try again."}
        </p>
        <div className="flex gap-3 justify-center">
          <Button
            onClick={reset}
            className="bg-gray-900 hover:bg-gray-800 text-white rounded-xl"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
          <Button
            variant="outline"
            onClick={() => window.location.href = "/"}
            className="rounded-xl"
          >
            Go Home
          </Button>
        </div>
        {error.digest && (
          <p className="text-[10px] text-gray-400 mt-4">Error ID: {error.digest}</p>
        )}
      </div>
    </div>
  )
}
