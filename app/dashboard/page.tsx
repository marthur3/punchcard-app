"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CreditCard, Gift, History, LogOut, Star, Trophy, Calendar, Zap, Crown, Settings, CheckCircle } from "lucide-react"
import { useAuth } from "@/lib/auth-context"

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
  const router = useRouter()

  const fetchUserData = useCallback(async () => {
    if (!user) return

    setIsLoading(true)
    try {
      if (isDemoMode) {
        // Demo mode: use local demo data
        const { demoPunchCards, demoPrizes, demoPunches, generateLeaderboardData } = await import("@/lib/demo-data")

        let savedCards: any[] = []
        if (typeof window !== "undefined") {
          savedCards = JSON.parse(localStorage.getItem("demo_punch_cards") || "[]")
        }

        const userCards = demoPunchCards.filter((card) => card.user_id === user.id).map((card) => {
          const savedCard = savedCards.find((c: any) => c.user_id === user.id && c.business_id === card.business_id)
          return savedCard || card
        })

        savedCards.forEach((savedCard: any) => {
          if (savedCard.user_id === user.id && !userCards.find((c: any) => c.business_id === savedCard.business_id)) {
            userCards.push(savedCard)
          }
        })

        setPunchCards(userCards)

        const userBusinessIds = userCards.map((card: any) => card.business_id)
        const prizes = demoPrizes
          .filter((prize) => userBusinessIds.includes(prize.business_id))
          .map((prize) => ({
            ...prize,
            business_name: userCards.find((card: any) => card.business_id === prize.business_id)?.business?.name || "",
          }))
          .filter((prize) => {
            const card = userCards.find((c: any) => c.business_id === prize.business_id)
            return card && card.current_punches >= prize.punches_required
          })

        setAvailablePrizes(prizes)
        setPunchHistory(demoPunches.filter((punch) => punch.user_id === user.id))

        const savedRedeemed = JSON.parse(localStorage.getItem("demo_redeemed_prizes") || "[]")
        const userRedeemed = savedRedeemed.filter((r: any) => r.user_id === user.id)
        setRedeemedPrizes(userRedeemed)

        const leaderboard = generateLeaderboardData()
        setLeaderboardData(leaderboard)

        const leaderboardSettings = JSON.parse(localStorage.getItem('leaderboard_settings') || '{}')
        const userSettings = leaderboardSettings[user.id] || {}
        setIsLeaderboardOptedIn(userSettings.opted_in || false)
        setUserDisplayName(userSettings.display_name || user.name)
      } else {
        // Real mode: fetch from API
        const [cardsRes, leaderboardRes] = await Promise.all([
          fetch("/api/punch-cards"),
          fetch("/api/leaderboard?limit=10"),
        ])

        if (cardsRes.ok) {
          const cardsData = await cardsRes.json()

          // Transform punch cards
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

          // Get available prizes for each business
          const allPrizes: Prize[] = []
          for (const card of cards) {
            const prizesRes = await fetch(`/api/prizes?business_id=${card.business.id}`)
            if (prizesRes.ok) {
              const prizesData = await prizesRes.json()
              const redeemable = (prizesData.prizes || [])
                .filter((p: any) => card.current_punches >= p.punches_required)
                .map((p: any) => ({
                  ...p,
                  business_name: card.business.name,
                  business_id: card.business.id,
                }))
              allPrizes.push(...redeemable)
            }
          }
          setAvailablePrizes(allPrizes)

          // Transform punch history
          const history = (cardsData.recent_punches || []).map((p: any) => ({
            id: p.id,
            created_at: p.created_at,
            business: { name: p.businesses?.name || 'Unknown' },
          }))
          setPunchHistory(history)

          // Transform redeemed prizes
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
        // Demo mode: deduct punches, record redemption, show success
        const prize = availablePrizes.find(p => p.id === prizeId)
        if (!prize || !user) return

        // Deduct punches from the card
        const savedCards = JSON.parse(localStorage.getItem("demo_punch_cards") || "[]")
        const cardIndex = savedCards.findIndex((c: any) => c.user_id === user.id && c.business_id === businessId)
        if (cardIndex >= 0) {
          savedCards[cardIndex].current_punches = Math.max(0, savedCards[cardIndex].current_punches - prize.punches_required)
          localStorage.setItem("demo_punch_cards", JSON.stringify(savedCards))
        }

        // Record redemption
        const redeemed = JSON.parse(localStorage.getItem("demo_redeemed_prizes") || "[]")
        redeemed.push({
          id: `redeemed-${Date.now()}`,
          prize_id: prizeId,
          business_id: businessId,
          user_id: user.id,
          redeemed_at: new Date().toISOString(),
          prize: { name: prize.name, description: prize.description },
          business: { name: prize.business_name },
        })
        localStorage.setItem("demo_redeemed_prizes", JSON.stringify(redeemed))

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

    const leaderboardSettings = JSON.parse(localStorage.getItem('leaderboard_settings') || '{}')
    leaderboardSettings[user.id] = {
      opted_in: optedIn,
      display_name: displayName
    }
    localStorage.setItem('leaderboard_settings', JSON.stringify(leaderboardSettings))

    setIsLeaderboardOptedIn(optedIn)
    setUserDisplayName(displayName)
  }

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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Welcome back, {user.name}!</h1>
            <p className="text-gray-700">
              Manage your punch cards and rewards
              {isDemoMode && <Badge className="ml-2 bg-amber-100 text-amber-800 border-amber-200">Demo Mode</Badge>}
            </p>
          </div>
          <div className="flex gap-4">
            <Button
              variant="outline"
              onClick={() => router.push("/tap")}
              className="border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              <Zap className="h-4 w-4 mr-2" />
              Tap NFC
            </Button>
            <Button
              variant="outline"
              onClick={handleLogout}
              className="border-gray-300 text-gray-700 hover:bg-gray-50 bg-transparent"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>

        <Tabs defaultValue="cards" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 bg-gray-100 p-1">
            <TabsTrigger value="cards" className="data-[state=active]:bg-white data-[state=active]:text-gray-900 text-gray-600">
              My Cards
            </TabsTrigger>
            <TabsTrigger value="rewards" className="data-[state=active]:bg-white data-[state=active]:text-gray-900 text-gray-600">
              Available Rewards
            </TabsTrigger>
            <TabsTrigger value="leaderboard" className="data-[state=active]:bg-white data-[state=active]:text-gray-900 text-gray-600">
              Leaderboard
            </TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:bg-white data-[state=active]:text-gray-900 text-gray-600">
              History
            </TabsTrigger>
            <TabsTrigger value="redeemed" className="data-[state=active]:bg-white data-[state=active]:text-gray-900 text-gray-600">
              Redeemed
            </TabsTrigger>
          </TabsList>

          <TabsContent value="cards">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {punchCards.length === 0 ? (
                <Card className="col-span-full">
                  <CardContent className="text-center py-12">
                    <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Punch Cards Yet</h3>
                    <p className="text-gray-600 mb-4">Start collecting punches at participating businesses</p>
                    <Button onClick={() => router.push("/tap")}>
                      <Zap className="h-4 w-4 mr-2" />
                      Find NFC Locations
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                punchCards.map((card) => (
                  <Card key={card.id} className="border border-gray-200 shadow-sm bg-white">
                    <CardHeader>
                      <CardTitle className="text-lg text-gray-900">{card.business.name}</CardTitle>
                      <CardDescription className="text-gray-600">{card.business.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center mb-4">
                        <div className="text-3xl font-bold text-blue-600 mb-2">
                          {card.current_punches}/{card.business.max_punches}
                        </div>
                        <Progress value={(card.current_punches / card.business.max_punches) * 100} className="mb-2" />
                        <Badge variant="secondary" className="bg-gray-100 text-gray-700">
                          Total: {card.total_punches} punches
                        </Badge>
                      </div>

                      <div className="grid grid-cols-5 gap-1 mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                        {Array.from({ length: card.business.max_punches }).map((_, index) => (
                          <div
                            key={index}
                            className={`aspect-square rounded-full border-2 flex items-center justify-center text-xs ${
                              index < card.current_punches
                                ? "bg-blue-500 border-blue-500 text-white"
                                : "border-gray-300 bg-white"
                            }`}
                          >
                            {index < card.current_punches && <Star className="h-3 w-3 fill-current" />}
                          </div>
                        ))}
                      </div>

                      {card.current_punches >= card.business.max_punches && (
                        <Badge className="w-full justify-center bg-emerald-500 hover:bg-emerald-600 text-white">
                          <Trophy className="h-4 w-4 mr-2" />
                          Card Complete!
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="rewards">
            {redeemSuccess && (
              <Alert className="mb-4 border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">{redeemSuccess}</AlertDescription>
              </Alert>
            )}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {availablePrizes.length === 0 ? (
                <Card className="col-span-full">
                  <CardContent className="text-center py-12">
                    <Gift className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Rewards Available</h3>
                    <p className="text-gray-600">Keep collecting punches to unlock rewards!</p>
                  </CardContent>
                </Card>
              ) : (
                availablePrizes.map((prize) => (
                  <Card key={prize.id} className="border border-emerald-200 shadow-sm bg-emerald-50">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2 text-gray-900">
                        <Gift className="h-5 w-5 text-emerald-600" />
                        {prize.name}
                      </CardTitle>
                      <CardDescription className="text-gray-700">{prize.business_name}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-700 mb-4">{prize.description}</p>
                      <div className="flex justify-between items-center">
                        <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white">
                          {prize.punches_required} punches required
                        </Badge>
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white"
                          onClick={() => redeemPrize(prize.id, prize.business_id)}
                        >
                          Redeem Now
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="leaderboard">
            <div className="space-y-6">
              <Card className="border-2 border-dashed border-gray-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Leaderboard Settings
                  </CardTitle>
                  <CardDescription>
                    Join the leaderboard to compete with other loyal customers!
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <h4 className="font-semibold">Participate in Leaderboard</h4>
                      <p className="text-sm text-gray-600">
                        {isLeaderboardOptedIn
                          ? "You're currently visible on the public leaderboard"
                          : "You're not participating in the leaderboard"}
                      </p>
                    </div>
                    <Button
                      variant={isLeaderboardOptedIn ? "destructive" : "default"}
                      onClick={() => updateLeaderboardSettings(!isLeaderboardOptedIn, userDisplayName)}
                    >
                      {isLeaderboardOptedIn ? "Opt Out" : "Join Leaderboard"}
                    </Button>
                  </div>

                  {isLeaderboardOptedIn && (
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <h4 className="font-semibold mb-2">Display Name</h4>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={userDisplayName}
                          onChange={(e) => setUserDisplayName(e.target.value)}
                          className="flex-1 px-3 py-2 border rounded-md"
                          placeholder="Enter your display name"
                        />
                        <Button
                          variant="outline"
                          onClick={() => updateLeaderboardSettings(isLeaderboardOptedIn, userDisplayName)}
                        >
                          Update
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Crown className="h-5 w-5 text-yellow-500" />
                    Global Leaderboard
                  </CardTitle>
                  <CardDescription>Top loyal customers across all businesses</CardDescription>
                </CardHeader>
                <CardContent>
                  {leaderboardData.length === 0 ? (
                    <div className="text-center py-8">
                      <Crown className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">No leaderboard data available</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {leaderboardData.slice(0, 10).map((entry, index) => (
                        <div
                          key={entry.user_id}
                          className={`flex items-center justify-between p-4 rounded-lg border-2 ${
                            entry.user_id === user?.id
                              ? "bg-blue-50 border-blue-200"
                              : "bg-gray-50 border-gray-200"
                          }`}
                        >
                          <div className="flex items-center gap-4">
                            <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-white ${
                              index === 0 ? "bg-yellow-500" :
                              index === 1 ? "bg-gray-400" :
                              index === 2 ? "bg-amber-600" :
                              "bg-gray-300 text-gray-700"
                            }`}>
                              {entry.rank}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold">{entry.display_name}</span>
                                {entry.badge && <span className="text-lg">{entry.badge}</span>}
                                {entry.user_id === user?.id && (
                                  <Badge variant="outline" className="text-xs">You</Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-4 text-sm text-gray-600">
                                <span>{entry.total_punches} total punches</span>
                                {entry.businesses_visited && <span>{entry.businesses_visited} businesses</span>}
                                <Badge
                                  variant="secondary"
                                  className={`text-xs ${
                                    entry.tier === 'platinum' ? 'bg-purple-100 text-purple-800' :
                                    entry.tier === 'gold' ? 'bg-yellow-100 text-yellow-800' :
                                    entry.tier === 'silver' ? 'bg-gray-100 text-gray-800' :
                                    'bg-amber-100 text-amber-800'
                                  }`}
                                >
                                  {entry.tier}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-lg">{entry.total_punches}</div>
                            <div className="text-xs text-gray-500">punches</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {!isLeaderboardOptedIn && (
                <Card className="border-yellow-200 bg-yellow-50">
                  <CardContent className="p-6 text-center">
                    <Crown className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Join the Competition!</h3>
                    <p className="text-gray-600 mb-4">
                      Opt into the leaderboard to compete with other customers!
                    </p>
                    <Button onClick={() => updateLeaderboardSettings(true, user?.name || '')}>
                      <Crown className="h-4 w-4 mr-2" />
                      Join Leaderboard
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Recent Punches
                </CardTitle>
                <CardDescription>Your latest punch card activity</CardDescription>
              </CardHeader>
              <CardContent>
                {punchHistory.length === 0 ? (
                  <div className="text-center py-8">
                    <History className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No punch history yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {punchHistory.map((punch) => (
                      <div key={punch.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <div>
                            <p className="font-medium">{punch.business.name}</p>
                            <p className="text-sm text-gray-600 flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(punch.created_at).toLocaleDateString()} at{" "}
                              {new Date(punch.created_at).toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline">+1 Punch</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="redeemed">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  Redeemed Prizes
                </CardTitle>
                <CardDescription>Your reward redemption history</CardDescription>
              </CardHeader>
              <CardContent>
                {redeemedPrizes.length === 0 ? (
                  <div className="text-center py-8">
                    <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No prizes redeemed yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {redeemedPrizes.map((redeemed) => (
                      <div
                        key={redeemed.id}
                        className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200"
                      >
                        <div className="flex items-center gap-3">
                          <Trophy className="h-5 w-5 text-green-600" />
                          <div>
                            <p className="font-medium">{redeemed.prize.name}</p>
                            <p className="text-sm text-gray-600">{redeemed.business.name}</p>
                            <p className="text-xs text-gray-500 flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(redeemed.redeemed_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <Badge className="bg-green-500">Redeemed</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
