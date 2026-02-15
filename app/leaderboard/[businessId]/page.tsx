"use client"

import { Suspense, useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowLeft, Crown, Trophy } from "lucide-react"
import { useAuth } from "@/lib/auth-context"

interface LeaderboardEntry {
  rank: number
  user_id: string
  display_name: string
  total_punches: number
  tier: string
  badge?: string
}

interface Business {
  id: string
  name: string
  description: string
}

const AVATAR_COLORS = [
  "bg-orange-500",
  "bg-blue-500",
  "bg-emerald-500",
  "bg-purple-500",
  "bg-pink-500",
  "bg-teal-500",
  "bg-indigo-500",
  "bg-rose-500",
]

function getAvatarColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

function getTierLabel(tier: string): string {
  switch (tier) {
    case "platinum": return "Platinum"
    case "gold": return "Gold"
    case "silver": return "Silver"
    case "bronze": return "Bronze"
    default: return "Newcomer"
  }
}

function getTierColor(tier: string): string {
  switch (tier) {
    case "platinum": return "bg-purple-100 text-purple-800"
    case "gold": return "bg-yellow-100 text-yellow-800"
    case "silver": return "bg-gray-100 text-gray-800"
    case "bronze": return "bg-amber-100 text-amber-800"
    default: return "bg-gray-100 text-gray-600"
  }
}

export default function LeaderboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
        </div>
      }
    >
      <LeaderboardContent />
    </Suspense>
  )
}

function LeaderboardContent() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const businessId = params?.businessId as string

  const [business, setBusiness] = useState<Business | null>(null)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [timeFilter, setTimeFilter] = useState<"90days" | "alltime">("alltime")

  const fetchData = useCallback(async () => {
    if (!businessId) return
    setIsLoading(true)
    setError("")

    try {
      const [bizRes, lbRes] = await Promise.all([
        fetch(`/api/businesses?id=${businessId}`),
        fetch(`/api/leaderboard?business_id=${businessId}&limit=50`),
      ])

      if (!bizRes.ok) {
        setError("Business not found")
        setIsLoading(false)
        return
      }

      const bizData = await bizRes.json()
      setBusiness(bizData.business)

      if (lbRes.ok) {
        const lbData = await lbRes.json()
        setLeaderboard(lbData.leaderboard || [])
      }
    } catch {
      setError("Failed to load leaderboard")
    } finally {
      setIsLoading(false)
    }
  }, [businessId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500 mx-auto mb-3"></div>
          <p className="text-gray-500 text-sm">Loading leaderboard...</p>
        </div>
      </div>
    )
  }

  if (error || !business) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-sm w-full">
          <CardContent className="pt-6 text-center">
            <Trophy className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              {error || "Business not found"}
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              We couldn&apos;t load this leaderboard.
            </p>
            <Button onClick={() => router.push("/dashboard")} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const topEntry = leaderboard[0]
  const restEntries = leaderboard.slice(1)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200">
        <div className="max-w-lg mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.back()}
              className="p-2 -ml-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-gray-700" />
            </button>
            <div className="text-center flex-1 mx-4">
              <h1 className="font-bold text-gray-900 text-base leading-tight truncate">
                {business.name}
              </h1>
              <p className="text-xs text-gray-500">Venue Leaderboard</p>
            </div>
            <div className="w-9" /> {/* Spacer for centering */}
          </div>

          {/* Time Filter Toggle */}
          <div className="flex mt-3 bg-gray-100 rounded-lg p-0.5">
            <button
              onClick={() => setTimeFilter("90days")}
              className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-colors ${
                timeFilter === "90days"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              90 Days
            </button>
            <button
              onClick={() => setTimeFilter("alltime")}
              className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-colors ${
                timeFilter === "alltime"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              All Time
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        {leaderboard.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <Trophy className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="font-semibold text-gray-900 mb-1">No rankings yet</h3>
              <p className="text-sm text-gray-500">
                Be the first to visit {business.name} and top the leaderboard!
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Hero #1 Card */}
            {topEntry && (
              <Card className="mb-6 overflow-hidden relative">
                <CardContent className="pt-8 pb-6 text-center relative">
                  {/* Trophy watermark */}
                  <Trophy className="absolute top-3 right-3 h-20 w-20 text-gray-100" />

                  {/* Avatar with laurel wreath */}
                  <div className="relative inline-block mb-4">
                    {/* SVG Laurel Wreath */}
                    <svg
                      viewBox="0 0 120 120"
                      className="absolute -inset-4 w-[calc(100%+2rem)] h-[calc(100%+2rem)] text-orange-400"
                      fill="none"
                    >
                      {/* Left branch */}
                      <path
                        d="M30 90 C25 75, 20 60, 25 45 C28 38, 22 30, 28 22"
                        stroke="currentColor"
                        strokeWidth="2"
                        fill="none"
                      />
                      <ellipse cx="22" cy="72" rx="6" ry="10" transform="rotate(-20 22 72)" fill="currentColor" opacity="0.3" />
                      <ellipse cx="20" cy="55" rx="6" ry="10" transform="rotate(-10 20 55)" fill="currentColor" opacity="0.3" />
                      <ellipse cx="22" cy="38" rx="5" ry="9" transform="rotate(5 22 38)" fill="currentColor" opacity="0.3" />
                      {/* Right branch */}
                      <path
                        d="M90 90 C95 75, 100 60, 95 45 C92 38, 98 30, 92 22"
                        stroke="currentColor"
                        strokeWidth="2"
                        fill="none"
                      />
                      <ellipse cx="98" cy="72" rx="6" ry="10" transform="rotate(20 98 72)" fill="currentColor" opacity="0.3" />
                      <ellipse cx="100" cy="55" rx="6" ry="10" transform="rotate(10 100 55)" fill="currentColor" opacity="0.3" />
                      <ellipse cx="98" cy="38" rx="5" ry="9" transform="rotate(-5 98 38)" fill="currentColor" opacity="0.3" />
                    </svg>

                    {/* Avatar circle */}
                    <div
                      className={`w-24 h-24 rounded-full flex items-center justify-center text-white text-2xl font-bold ${getAvatarColor(
                        topEntry.display_name
                      )} ring-4 ring-orange-100 relative`}
                    >
                      {getInitials(topEntry.display_name)}
                    </div>

                    {/* Crown badge */}
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-orange-500 rounded-full p-1.5 shadow-md">
                      <Crown className="h-4 w-4 text-white" />
                    </div>
                  </div>

                  <h2 className="text-xl font-bold text-gray-900 mt-2">
                    {topEntry.display_name}
                    {topEntry.user_id === user?.id && (
                      <span className="text-orange-500 text-sm font-normal ml-2">(You)</span>
                    )}
                  </h2>
                  <p className="text-2xl font-bold text-orange-500 mt-1">
                    {topEntry.total_punches} visits
                  </p>
                  <Badge className={`mt-2 ${getTierColor(topEntry.tier)}`}>
                    {getTierLabel(topEntry.tier)}
                  </Badge>
                </CardContent>
              </Card>
            )}

            {/* Ranked List */}
            {restEntries.length > 0 && (
              <div className="space-y-2">
                {restEntries.map((entry) => {
                  const isCurrentUser = entry.user_id === user?.id
                  return (
                    <div
                      key={entry.user_id}
                      className={`flex items-center gap-3 p-3 rounded-xl bg-white transition-colors ${
                        isCurrentUser
                          ? "border-l-4 border-l-orange-500 bg-orange-50"
                          : "border border-gray-100 hover:bg-gray-50"
                      }`}
                    >
                      {/* Rank */}
                      <div className="w-7 text-center">
                        <span
                          className={`text-sm font-bold ${
                            entry.rank === 2
                              ? "text-gray-400"
                              : entry.rank === 3
                              ? "text-amber-600"
                              : "text-gray-400"
                          }`}
                        >
                          {entry.rank}
                        </span>
                      </div>

                      {/* Avatar */}
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${getAvatarColor(
                          entry.display_name
                        )}`}
                      >
                        {getInitials(entry.display_name)}
                      </div>

                      {/* Name & status */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-gray-900 truncate">
                            {entry.display_name}
                          </span>
                          {isCurrentUser && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-orange-300 text-orange-600">
                              You
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            className={`text-[10px] px-1.5 py-0 ${getTierColor(entry.tier)}`}
                          >
                            {getTierLabel(entry.tier)}
                          </Badge>
                          {isCurrentUser && (
                            <span className="text-[10px] font-medium text-orange-500">
                              Rising
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Visit count */}
                      <div className="text-right flex-shrink-0">
                        <div className="text-sm font-bold text-gray-900">
                          {entry.total_punches}
                        </div>
                        <div className="text-[10px] text-gray-400">visits</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Footer note */}
            <p className="text-center text-xs text-gray-400 italic mt-8 mb-4">
              Rankings update every 15 minutes
            </p>
          </>
        )}
      </div>
    </div>
  )
}
