"use client"

import { Suspense, useState, useEffect, useCallback, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowLeft, Crown, Trophy, Flame } from "lucide-react"
import { useAuth } from "@/lib/auth-context"

interface LeaderboardEntry {
  rank: number
  user_id: string
  display_name: string
  total_punches: number
  tier: string
  badge?: string
  current_streak?: number
  last_visit?: string
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
        <div className="min-h-screen flex items-center justify-center bg-gray-900">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400"></div>
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

  const topEntry = leaderboard[0]
  const restEntries = leaderboard.slice(1)

  const currentUserEntry = useMemo(
    () => user ? leaderboard.find((e) => e.user_id === user.id) : null,
    [leaderboard, user]
  )

  const stats = useMemo(() => {
    if (leaderboard.length === 0) return null
    const totalVisits = leaderboard.reduce((s, e) => s + e.total_punches, 0)
    return {
      participants: leaderboard.length,
      leaderVisits: leaderboard[0]?.total_punches ?? 0,
      avgVisits: Math.round(totalVisits / leaderboard.length),
    }
  }, [leaderboard])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-400 mx-auto mb-3"></div>
          <p className="text-gray-400 text-sm">Loading leaderboard...</p>
        </div>
      </div>
    )
  }

  if (error || !business) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <Card className="max-w-sm w-full bg-gray-800 border-gray-700">
          <CardContent className="pt-6 text-center">
            <Trophy className="h-12 w-12 text-gray-600 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-white mb-2">
              {error || "Business not found"}
            </h2>
            <p className="text-sm text-gray-400 mb-4">
              We couldn&apos;t load this leaderboard.
            </p>
            <Button onClick={() => router.push("/dashboard")} variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-700">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Dark header with golden #1 hero */}
      <div className="bg-gradient-to-b from-gray-900 to-gray-800">
        <div className="max-w-lg mx-auto px-4">
          {/* Navigation row */}
          <div className="flex items-center justify-between pt-4 pb-2">
            <button
              onClick={() => router.back()}
              className="p-2 -ml-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-gray-300" />
            </button>
            <div className="text-center flex-1 mx-4">
              <h1 className="font-bold text-white text-base leading-tight truncate">
                {business.name}
              </h1>
              <p className="text-xs text-amber-400 font-medium">Local Legend</p>
            </div>
            <div className="w-9" />
          </div>

          {/* Time filter pills */}
          <div className="flex justify-center gap-2 py-3">
            <button
              onClick={() => setTimeFilter("90days")}
              className={`px-4 py-1.5 text-xs font-medium rounded-full transition-colors ${
                timeFilter === "90days"
                  ? "bg-white/20 text-white"
                  : "text-gray-400 hover:text-gray-300"
              }`}
            >
              90 Days
            </button>
            <button
              onClick={() => setTimeFilter("alltime")}
              className={`px-4 py-1.5 text-xs font-medium rounded-full transition-colors ${
                timeFilter === "alltime"
                  ? "bg-white/20 text-white"
                  : "text-gray-400 hover:text-gray-300"
              }`}
            >
              All Time
            </button>
          </div>

          {/* #1 Hero */}
          {topEntry && (
            <div className="text-center pb-6 pt-2">
              {/* Avatar with golden laurel wreath */}
              <div className="relative inline-block mb-3">
                <svg
                  viewBox="0 0 120 120"
                  className="absolute -inset-4 w-[calc(100%+2rem)] h-[calc(100%+2rem)] text-amber-400"
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

                <div
                  className={`w-24 h-24 rounded-full flex items-center justify-center text-white text-2xl font-bold ${getAvatarColor(
                    topEntry.display_name
                  )} ring-4 ring-amber-400 relative`}
                >
                  {getInitials(topEntry.display_name)}
                </div>

                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-amber-400 rounded-full p-1.5 shadow-md">
                  <Crown className="h-4 w-4 text-gray-900" />
                </div>
              </div>

              <h2 className="text-lg font-bold text-white mt-2">
                {topEntry.display_name}
                {topEntry.user_id === user?.id && (
                  <span className="text-amber-400 text-sm font-normal ml-2">(You)</span>
                )}
              </h2>
              <p className="text-3xl font-bold text-amber-400 mt-1">
                {topEntry.total_punches} <span className="text-lg font-medium">visits</span>
              </p>
              <Badge className="mt-2 bg-amber-400/20 text-amber-300 border-amber-400/30">
                {getTierLabel(topEntry.tier)}
              </Badge>
            </div>
          )}
        </div>
      </div>

      {/* Stats bar */}
      {stats && (
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-around">
            <div className="text-center">
              <div className="text-sm font-bold text-gray-900">{stats.participants}</div>
              <div className="text-[10px] text-gray-500 uppercase tracking-wide">Participants</div>
            </div>
            <div className="w-px h-8 bg-gray-200" />
            <div className="text-center">
              <div className="text-sm font-bold text-gray-900">{stats.leaderVisits}</div>
              <div className="text-[10px] text-gray-500 uppercase tracking-wide">Leader Visits</div>
            </div>
            <div className="w-px h-8 bg-gray-200" />
            <div className="text-center">
              <div className="text-sm font-bold text-gray-900">{stats.avgVisits}</div>
              <div className="text-[10px] text-gray-500 uppercase tracking-wide">Avg Visits</div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-lg mx-auto px-4 py-4">
        {leaderboard.length === 0 ? (
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="pt-6 text-center">
              <Trophy className="h-12 w-12 text-gray-600 mx-auto mb-4" />
              <h3 className="font-semibold text-white mb-1">No rankings yet</h3>
              <p className="text-sm text-gray-400">
                Be the first to visit {business.name} and top the leaderboard!
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* "Your position" callout card */}
            {currentUserEntry && currentUserEntry.rank > 1 && topEntry && (
              <div className="bg-gray-800 rounded-xl p-4 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-white">
                    You&apos;re #{currentUserEntry.rank}
                  </span>
                  <span className="text-xs text-gray-400">
                    {topEntry.total_punches - currentUserEntry.total_punches} visits behind the leader
                  </span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-amber-400 h-2 rounded-full transition-all"
                    style={{
                      width: `${Math.round(
                        (currentUserEntry.total_punches / topEntry.total_punches) * 100
                      )}%`,
                    }}
                  />
                </div>
                <div className="flex justify-between mt-1.5">
                  <span className="text-[10px] text-gray-500">
                    {currentUserEntry.total_punches} visits
                  </span>
                  <span className="text-[10px] text-gray-500">
                    {topEntry.total_punches} visits
                  </span>
                </div>
              </div>
            )}

            {/* Ranked list (2nd place onward) */}
            {restEntries.length > 0 && (
              <div className="space-y-1.5">
                {restEntries.map((entry) => {
                  const isCurrentUser = entry.user_id === user?.id
                  const rankColor =
                    entry.rank === 2
                      ? "text-gray-400"
                      : entry.rank === 3
                      ? "text-amber-600"
                      : "text-gray-400"
                  const isTopThree = entry.rank <= 3

                  return (
                    <div
                      key={entry.user_id}
                      className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
                        isCurrentUser
                          ? "bg-amber-50 border-l-4 border-l-amber-400"
                          : "bg-white border border-gray-100 hover:bg-gray-50"
                      }`}
                    >
                      {/* Rank */}
                      <div className="w-7 text-center">
                        <span
                          className={`font-bold ${rankColor} ${
                            isTopThree ? "text-base" : "text-sm"
                          }`}
                        >
                          {entry.rank}
                        </span>
                      </div>

                      {/* Avatar */}
                      <div
                        className={`${
                          isTopThree ? "w-10 h-10" : "w-9 h-9"
                        } rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${getAvatarColor(
                          entry.display_name
                        )}`}
                      >
                        {getInitials(entry.display_name)}
                      </div>

                      {/* Name & info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-gray-900 truncate">
                            {entry.display_name}
                          </span>
                          {isCurrentUser && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-300 text-amber-600">
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
                          {entry.current_streak && entry.current_streak > 0 && (
                            <span className="flex items-center gap-0.5 text-[10px] font-medium text-orange-500">
                              <Flame className="h-3 w-3" />
                              {entry.current_streak}-day streak
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
