"use client"

import { Suspense, useState, useEffect, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CreditCard, Gift, History, LogOut, Star, Trophy, Calendar, Zap, Crown, Settings, CheckCircle, X } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import {
  getUserPunchCards,
  getAllPrizes,
  getRedeemedPrizes,
  getSavedPunchCards,
  upsertPunchCard,
  addRedeemedPrize,
  getLeaderboardSettings,
  saveLeaderboardSettings,
} from "@/lib/demo-store"
import Link from "next/link"

interface PunchCard {
  id: string
  current_punches: number
  total_punches: number
  business: {
    id: string
    name: string
    description: string
    max_punches: number
  }
}

interface Prize {
  id: string
  name: string
  description: string
  punches_required: number
  business_name: string
  business_id: string
}

interface PunchHistory {
  id: string
  created_at: string
  business: {
    name: string
  }
}

interface RedeemedPrize {
  id: string
  redeemed_at: string
  prize: {
    name: string
    description: string
  }
  business: {
    name: string
  }
}

interface LeaderboardEntry {
  rank: number
  user_id: string
  display_name: string
  total_punches: number
  tier: string
  badge?: string
  businesses_visited?: number
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-900"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400"></div></div>}>
      <DashboardContent />
    </Suspense>
  )
}

function DashboardContent() {
  const { user, logout, isLoading: authLoading, isDemoMode } = useAuth()
  const [punchCards, setPunchCards] = useState<PunchCard[]>([])
  const [availablePrizes, setAvailablePrizes] = useState<Prize[]>([])
  const [punchHistory, setPunchHistory] = useState<PunchHistory[]>([])
  const [redeemedPrizes, setRedeemedPrizes] = useState<RedeemedPrize[]>([])
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([])
  const [isLeaderboardOptedIn, setIsLeaderboardOptedIn] = useState(false)
  const [userDisplayName, setUserDisplayName] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [redeemSuccess, setRedeemSuccess] = useState("")
  const [showWelcome, setShowWelcome] = useState(false)
  const [activeTab, setActiveTab] = useState("cards")
  const router = useRouter()
  const searchParams = useSearchParams()
  const welcome = searchParams?.get("welcome")

  const fetchUserData = useCallback(async () => {
    if (!user) return

    setIsLoading(true)
    try {
      if (isDemoMode) {
        const { demoPunches, generateLeaderboardData } = await import("@/lib/demo-data")

        const enrichedCards = (await getUserPunchCards(user.id))
          .filter((c): c is typeof c & { business: NonNullable<typeof c.business> } => !!c.business)
        setPunchCards(enrichedCards)

        const allPrizes = await getAllPrizes()
        const userBusinessIds = enrichedCards.map((c) => c.business_id)
        const redeemable = allPrizes
          .filter((prize) => userBusinessIds.includes(prize.business_id))
          .map((prize) => ({
            ...prize,
            business_name: enrichedCards.find((c) => c.business_id === prize.business_id)?.business?.name || "",
            business_id: prize.business_id,
          }))
          .filter((prize) => {
            const card = enrichedCards.find((c) => c.business_id === prize.business_id)
            return card && card.current_punches >= prize.punches_required
          })
        setAvailablePrizes(redeemable)

        setPunchHistory(demoPunches.filter((punch) => punch.user_id === user.id))
        setRedeemedPrizes(getRedeemedPrizes().filter((r) => r.user_id === user.id))

        setLeaderboardData(generateLeaderboardData())

        const lbSettings = getLeaderboardSettings()
        const userSettings = lbSettings[user.id] || {}
        setIsLeaderboardOptedIn(userSettings.opted_in || false)
        setUserDisplayName(userSettings.display_name || user.name)
      } else {
        const [cardsRes, leaderboardRes] = await Promise.all([
          fetch("/api/punch-cards"),
          fetch("/api/leaderboard?limit=10"),
        ])

        if (cardsRes.ok) {
          const cardsData = await cardsRes.json()

          const cards = (cardsData.punch_cards || []).map((card: any) => {
            const biz = card.businesses || card.business
            return {
              id: card.id,
              current_punches: card.current_punches,
              total_punches: card.total_punches,
              business: {
                id: biz?.id,
                name: biz?.name || 'Unknown',
                description: biz?.description || '',
                max_punches: biz?.max_punches || 10,
              },
            }
          })
          setPunchCards(cards)

          // Batch-fetch all prizes in a single request instead of N+1 queries
          const businessIds = cards.map((c: PunchCard) => c.business.id).filter(Boolean)
          const allPrizes: Prize[] = []
          if (businessIds.length > 0) {
            const prizesRes = await fetch(`/api/prizes/batch?business_ids=${businessIds.join(',')}`)
            if (prizesRes.ok) {
              const prizesData = await prizesRes.json()
              for (const card of cards) {
                const redeemable = (prizesData.prizes || [])
                  .filter((p: any) => p.business_id === card.business.id && card.current_punches >= p.punches_required)
                  .map((p: any) => ({
                    ...p,
                    business_name: card.business.name,
                    business_id: card.business.id,
                  }))
                allPrizes.push(...redeemable)
              }
            }
          }
          setAvailablePrizes(allPrizes)

          const history = (cardsData.recent_punches || []).map((p: any) => ({
            id: p.id,
            created_at: p.created_at,
            business: { name: p.businesses?.name || 'Unknown' },
          }))
          setPunchHistory(history)

          const redeemed = (cardsData.redeemed_prizes || []).map((r: any) => ({
            id: r.id,
            redeemed_at: r.redeemed_at,
            prize: { name: r.prizes?.name || 'Unknown', description: r.prizes?.description || '' },
            business: { name: r.businesses?.name || 'Unknown' },
          }))
          setRedeemedPrizes(redeemed)
        }

        if (leaderboardRes.ok) {
          const lbData = await leaderboardRes.json()
          setLeaderboardData(lbData.leaderboard || [])
        }
      }
    } catch (error) {
      console.error("Error fetching user data:", error)
    } finally {
      setIsLoading(false)
    }
  }, [user, isDemoMode])

  const handleLogout = async () => {
    await logout()
    router.push("/")
  }

  const redeemPrize = async (prizeId: string, businessId: string) => {
    try {
      if (isDemoMode) {
        const prize = availablePrizes.find(p => p.id === prizeId)
        if (!prize || !user) return

        const savedCards = getSavedPunchCards()
        const card = savedCards.find(c => c.user_id === user.id && c.business_id === businessId)
        if (card) {
          card.current_punches = Math.max(0, card.current_punches - prize.punches_required)
          upsertPunchCard(card)
        }

        addRedeemedPrize({
          id: `redeemed-${Date.now()}`,
          prize_id: prizeId,
          business_id: businessId,
          user_id: user.id,
          redeemed_at: new Date().toISOString(),
          prize: { name: prize.name, description: prize.description },
          business: { name: prize.business_name },
        })

        setRedeemSuccess(`${prize.name} redeemed!`)
        setTimeout(() => setRedeemSuccess(""), 3000)
        fetchUserData()
        return
      }

      const res = await fetch("/api/prizes/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prize_id: prizeId, business_id: businessId }),
      })

      if (res.ok) {
        fetchUserData()
      }
    } catch (error) {
      console.error("Error redeeming prize:", error)
    }
  }

  const updateLeaderboardSettings = (optedIn: boolean, displayName: string) => {
    if (!user) return

    const settings = getLeaderboardSettings()
    settings[user.id] = { opted_in: optedIn, display_name: displayName }
    saveLeaderboardSettings(settings)

    setIsLeaderboardOptedIn(optedIn)
    setUserDisplayName(displayName)
  }

  useEffect(() => {
    if (welcome === "true") {
      setShowWelcome(true)
    }
  }, [welcome])

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/login")
      return
    }

    if (user) {
      fetchUserData()
    }
  }, [user, authLoading, router, fetchUserData])

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-400 mx-auto mb-3"></div>
          <p className="text-gray-400 text-sm">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const tabs = [
    { id: "cards", label: "Cards", icon: CreditCard, count: punchCards.length },
    { id: "rewards", label: "Rewards", icon: Gift, count: availablePrizes.length },
    { id: "leaderboard", label: "Rankings", icon: Crown },
    { id: "history", label: "History", icon: History },
    { id: "redeemed", label: "Redeemed", icon: Trophy, count: redeemedPrizes.length },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Dark header */}
      <div className="bg-gradient-to-b from-gray-900 to-gray-800">
        <div className="max-w-2xl mx-auto px-4 pt-6 pb-4">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-xl font-bold text-white">Hey, {user.name}</h1>
              <p className="text-gray-400 text-sm">
                Manage your cards & rewards
                {isDemoMode && <Badge className="ml-2 bg-amber-400/20 text-amber-300 border-amber-400/30 text-[10px]">Demo</Badge>}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => router.push("/tap")}
                className="bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs h-8"
              >
                <Zap className="h-3.5 w-3.5 mr-1" />
                Tap
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleLogout}
                className="text-gray-400 hover:text-white hover:bg-white/10 rounded-lg h-8"
              >
                <LogOut className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Tab navigation in header */}
          <div className="flex gap-1 overflow-x-auto pb-1 -mb-4 relative z-10">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-lg whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? "bg-gray-50 text-gray-900"
                    : "text-gray-400 hover:text-gray-300 hover:bg-white/5"
                }`}
              >
                <tab.icon className="h-3.5 w-3.5" />
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded-full ${
                    activeTab === tab.id ? "bg-amber-100 text-amber-700" : "bg-white/10 text-gray-400"
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {showWelcome && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start justify-between">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-emerald-900 mb-1">Welcome to TapRanked!</h3>
                <ol className="space-y-1 text-sm text-emerald-700">
                  <li>1. Visit a business and tap their NFC tag</li>
                  <li>2. Collect punches with every visit</li>
                  <li>3. Earn rewards and climb the leaderboard</li>
                </ol>
                <Button
                  size="sm"
                  className="mt-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs"
                  onClick={() => router.push("/tap")}
                >
                  <Zap className="h-3.5 w-3.5 mr-1" />
                  Find NFC Locations
                </Button>
              </div>
            </div>
            <button onClick={() => setShowWelcome(false)} className="text-emerald-400 hover:text-emerald-600">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Cards Tab */}
        {activeTab === "cards" && (
          <div className="space-y-4">
            {punchCards.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
                <CreditCard className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="font-semibold text-gray-900 mb-1">No Punch Cards Yet</h3>
                <p className="text-sm text-gray-500 mb-4">Start collecting punches at participating businesses</p>
                <Button onClick={() => router.push("/tap")} className="bg-gray-900 hover:bg-gray-800 text-white rounded-xl">
                  <Zap className="h-4 w-4 mr-2" />
                  Find Locations
                </Button>
              </div>
            ) : (
              punchCards.map((card) => {
                const progress = (card.current_punches / card.business.max_punches) * 100
                const isComplete = card.current_punches >= card.business.max_punches
                return (
                  <div key={card.id} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-bold text-gray-900">{card.business.name}</h3>
                        <p className="text-xs text-gray-500">{card.business.description}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-gray-900">
                          {card.current_punches}<span className="text-gray-400 text-sm font-normal">/{card.business.max_punches}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mb-3">
                      <Progress value={progress} className="h-2" />
                    </div>

                    {/* Punch dots */}
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {Array.from({ length: card.business.max_punches }).map((_, index) => (
                        <div
                          key={index}
                          className={`w-7 h-7 rounded-full border-2 flex items-center justify-center ${
                            index < card.current_punches
                              ? "bg-amber-400 border-amber-400 text-white"
                              : "border-gray-200 bg-gray-50"
                          }`}
                        >
                          {index < card.current_punches && <Star className="h-3 w-3 fill-current" />}
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between">
                      {isComplete ? (
                        <Badge className="bg-emerald-500 text-white">
                          <Trophy className="h-3 w-3 mr-1" />
                          Card Complete!
                        </Badge>
                      ) : (
                        <span className="text-xs text-gray-400">{card.total_punches} total visits</span>
                      )}
                      <Link
                        href={`/leaderboard/${card.business.id}`}
                        className="text-xs text-amber-600 hover:text-amber-700 font-medium flex items-center gap-1"
                      >
                        <Trophy className="h-3 w-3" />
                        Rankings
                      </Link>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* Rewards Tab */}
        {activeTab === "rewards" && (
          <div className="space-y-4">
            {redeemSuccess && (
              <Alert className="border-emerald-200 bg-emerald-50 rounded-xl">
                <CheckCircle className="h-4 w-4 text-emerald-600" />
                <AlertDescription className="text-emerald-800">{redeemSuccess}</AlertDescription>
              </Alert>
            )}
            {availablePrizes.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
                <Gift className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="font-semibold text-gray-900 mb-1">No Rewards Available</h3>
                <p className="text-sm text-gray-500">Keep collecting punches to unlock rewards!</p>
              </div>
            ) : (
              availablePrizes.map((prize) => (
                <div key={prize.id} className="bg-white rounded-2xl border border-emerald-200 p-5 shadow-sm">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                        <Gift className="h-5 w-5 text-emerald-600" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900">{prize.name}</h3>
                        <p className="text-xs text-gray-500">{prize.business_name}</p>
                      </div>
                    </div>
                    <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">
                      {prize.punches_required} punches
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{prize.description}</p>
                  <Button
                    size="sm"
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
                    onClick={() => redeemPrize(prize.id, prize.business_id)}
                  >
                    Redeem Now
                  </Button>
                </div>
              ))
            )}
          </div>
        )}

        {/* Leaderboard Tab */}
        {activeTab === "leaderboard" && (
          <div className="space-y-4">
            {/* Settings card */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                    <Settings className="h-5 w-5 text-gray-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 text-sm">Leaderboard</h4>
                    <p className="text-xs text-gray-500">
                      {isLeaderboardOptedIn ? "You're visible on leaderboards" : "Not participating"}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant={isLeaderboardOptedIn ? "outline" : "default"}
                  onClick={() => updateLeaderboardSettings(!isLeaderboardOptedIn, userDisplayName)}
                  className={isLeaderboardOptedIn
                    ? "border-gray-200 text-gray-600 rounded-lg text-xs"
                    : "bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs"
                  }
                >
                  {isLeaderboardOptedIn ? "Opt Out" : "Join"}
                </Button>
              </div>

              {isLeaderboardOptedIn && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <label className="text-xs font-medium text-gray-600 mb-1.5 block">Display Name</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={userDisplayName}
                      onChange={(e) => setUserDisplayName(e.target.value)}
                      className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:border-amber-400 focus:ring-1 focus:ring-amber-400 outline-none"
                      placeholder="Enter display name"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateLeaderboardSettings(isLeaderboardOptedIn, userDisplayName)}
                      className="border-gray-200 rounded-lg text-xs"
                    >
                      Save
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Leaderboard list */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <Crown className="h-4 w-4 text-amber-500" />
                  Global Rankings
                </h3>
                <p className="text-xs text-gray-500">Top customers across all businesses</p>
              </div>
              {leaderboardData.length === 0 ? (
                <div className="p-8 text-center">
                  <Crown className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">No rankings yet</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {leaderboardData.slice(0, 10).map((entry) => {
                    const isYou = entry.user_id === user?.id
                    return (
                      <div
                        key={entry.user_id}
                        className={`flex items-center gap-3 px-5 py-3 ${
                          isYou ? "bg-amber-50" : "hover:bg-gray-50"
                        }`}
                      >
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                          entry.rank === 1 ? "bg-amber-400 text-white" :
                          entry.rank === 2 ? "bg-gray-300 text-white" :
                          entry.rank === 3 ? "bg-amber-600 text-white" :
                          "bg-gray-100 text-gray-500"
                        }`}>
                          {entry.rank}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-gray-900 truncate">{entry.display_name}</span>
                            {entry.badge && <span className="text-sm">{entry.badge}</span>}
                            {isYou && (
                              <Badge className="bg-amber-100 text-amber-700 text-[10px] px-1.5 py-0">You</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-gray-500">
                            <span>{entry.total_punches} punches</span>
                            {entry.businesses_visited && <span>{entry.businesses_visited} businesses</span>}
                            <Badge className={`text-[10px] px-1 py-0 ${
                              entry.tier === 'platinum' ? 'bg-purple-100 text-purple-700' :
                              entry.tier === 'gold' ? 'bg-amber-100 text-amber-700' :
                              entry.tier === 'silver' ? 'bg-gray-100 text-gray-600' :
                              'bg-orange-100 text-orange-700'
                            }`}>
                              {entry.tier}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-sm font-bold text-gray-900">{entry.total_punches}</div>
                          <div className="text-[10px] text-gray-400">punches</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {!isLeaderboardOptedIn && (
              <div className="bg-amber-50 rounded-2xl border border-amber-200 p-6 text-center">
                <Crown className="h-10 w-10 text-amber-500 mx-auto mb-3" />
                <h3 className="font-semibold text-gray-900 mb-1">Join the Competition</h3>
                <p className="text-sm text-gray-600 mb-3">
                  Opt in to compete with other customers
                </p>
                <Button
                  size="sm"
                  onClick={() => updateLeaderboardSettings(true, user?.name || '')}
                  className="bg-amber-500 hover:bg-amber-600 text-white rounded-xl"
                >
                  <Crown className="h-3.5 w-3.5 mr-1" />
                  Join Leaderboard
                </Button>
              </div>
            )}
          </div>
        )}

        {/* History Tab */}
        {activeTab === "history" && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <History className="h-4 w-4 text-gray-500" />
                Recent Punches
              </h3>
            </div>
            {punchHistory.length === 0 ? (
              <div className="p-8 text-center">
                <History className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">No punch history yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {punchHistory.map((punch) => (
                  <div key={punch.id} className="flex items-center justify-between px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-amber-400 rounded-full"></div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{punch.business.name}</p>
                        <p className="text-[10px] text-gray-500 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(punch.created_at).toLocaleDateString()} at{" "}
                          {new Date(punch.created_at).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                    <Badge className="bg-gray-100 text-gray-600 text-[10px]">+1</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Redeemed Tab */}
        {activeTab === "redeemed" && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <Trophy className="h-4 w-4 text-amber-500" />
                Redeemed Prizes
              </h3>
            </div>
            {redeemedPrizes.length === 0 ? (
              <div className="p-8 text-center">
                <Trophy className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">No prizes redeemed yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {redeemedPrizes.map((redeemed) => (
                  <div key={redeemed.id} className="flex items-center justify-between px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                        <Trophy className="h-4 w-4 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{redeemed.prize.name}</p>
                        <p className="text-[10px] text-gray-500">{redeemed.business.name}</p>
                        <p className="text-[10px] text-gray-400 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(redeemed.redeemed_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">Redeemed</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
