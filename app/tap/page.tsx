"use client"

import { Suspense, useState, useEffect, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Wifi, Gift, Star, Zap, ArrowLeft, UserPlus, AlertTriangle, X, CheckCircle, Trophy } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import Link from "next/link"

interface Business {
  id: string
  name: string
  description: string
  max_punches: number
  nfc_tag_id: string
}

interface PunchCardData {
  current_punches: number
  total_punches: number
  max_punches: number
  business: Business
}

interface Prize {
  id: string
  name: string
  description: string
  punches_required: number
  business_id: string
}

export default function TapPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>}>
      <TapContent />
    </Suspense>
  )
}

function TapContent() {
  const { user, isLoading: authLoading, isDemoMode } = useAuth()
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null)
  const [punchCard, setPunchCard] = useState<PunchCardData | null>(null)
  const [prizes, setPrizes] = useState<Prize[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isPunching, setIsPunching] = useState(false)
  const [showAnimation, setShowAnimation] = useState(false)
  const [nfcScanning, setNfcScanning] = useState(false)
  const [error, setError] = useState("")
  const [businessNotFound, setBusinessNotFound] = useState(false)
  const [showWelcome, setShowWelcome] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  const nfcTagId = searchParams?.get("nfc")
  const welcome = searchParams?.get("welcome")

  // Fetch business info
  const fetchBusiness = useCallback(async () => {
    try {
      if (nfcTagId) {
        // Look up business by NFC tag
        const res = await fetch(`/api/businesses?nfc_tag_id=${encodeURIComponent(nfcTagId)}`)
        if (res.ok) {
          const data = await res.json()
          if (data.business) {
            setSelectedBusiness(data.business)
            return
          }
        }

        // If in demo mode, try demo data
        if (isDemoMode) {
          const { demoBusinesses } = await import("@/lib/demo-data")
          const found = demoBusinesses.find((b: any) => b.nfc_tag_id === nfcTagId)
          if (found) {
            setSelectedBusiness(found)
            return
          }

          // Also check registered businesses in localStorage
          if (typeof window !== "undefined") {
            const registered = JSON.parse(localStorage.getItem("demo_registered_businesses") || "[]")
            const regFound = registered.find((b: any) => b.nfc_tag_id === nfcTagId)
            if (regFound) {
              setSelectedBusiness(regFound)
              return
            }
          }
        }

        // All lookups failed - NFC tag not recognized
        setBusinessNotFound(true)
        return
      }

      // No NFC tag - fetch all businesses for selector
      if (isDemoMode) {
        const { demoBusinesses } = await import("@/lib/demo-data")
        const registered = typeof window !== "undefined"
          ? JSON.parse(localStorage.getItem("demo_registered_businesses") || "[]")
          : []
        setBusinesses([...demoBusinesses, ...registered])
      } else {
        const res = await fetch("/api/businesses")
        if (res.ok) {
          const data = await res.json()
          setBusinesses(data.businesses || [])
        }
      }
    } catch {
      setError("Failed to load business info")
    }
  }, [nfcTagId, isDemoMode])

  // Fetch punch card for selected business
  const fetchPunchCard = useCallback(async (business: Business) => {
    if (!user) return
    setIsLoading(true)

    try {
      if (isDemoMode) {
        // Demo mode: use localStorage
        const { demoPunchCards, demoPrizes } = await import("@/lib/demo-data")
        let savedCards: any[] = []
        if (typeof window !== "undefined") {
          savedCards = JSON.parse(localStorage.getItem("demo_punch_cards") || "[]")
        }

        let card = savedCards.find((c: any) => c.user_id === user.id && c.business_id === business.id) ||
                   demoPunchCards.find((c: any) => c.user_id === user.id && c.business_id === business.id)

        setPunchCard({
          current_punches: card?.current_punches || 0,
          total_punches: card?.total_punches || 0,
          max_punches: business.max_punches,
          business,
        })

        const registeredPrizes = typeof window !== "undefined"
          ? JSON.parse(localStorage.getItem("demo_registered_prizes") || "[]")
          : []
        const allPrizes = [...demoPrizes, ...registeredPrizes]
        const businessPrizes = allPrizes.filter((p: any) => p.business_id === business.id)
        setPrizes(businessPrizes)
      } else {
        // Real mode: fetch from API
        const [cardsRes, prizesRes] = await Promise.all([
          fetch("/api/punch-cards"),
          fetch(`/api/prizes?business_id=${business.id}`),
        ])

        if (cardsRes.ok) {
          const cardsData = await cardsRes.json()
          const card = cardsData.punch_cards?.find((c: any) => {
            const biz = c.businesses || c.business
            return biz?.id === business.id
          })

          setPunchCard({
            current_punches: card?.current_punches || 0,
            total_punches: card?.total_punches || 0,
            max_punches: business.max_punches,
            business,
          })
        } else {
          setPunchCard({
            current_punches: 0,
            total_punches: 0,
            max_punches: business.max_punches,
            business,
          })
        }

        if (prizesRes.ok) {
          const prizesData = await prizesRes.json()
          setPrizes(prizesData.prizes || [])
        }
      }
    } catch {
      setError("Failed to load punch card")
    } finally {
      setIsLoading(false)
    }
  }, [user, isDemoMode])

  // Collect a punch
  const collectPunch = async () => {
    if (!punchCard || !user || !selectedBusiness) return

    setIsPunching(true)
    setShowAnimation(true)
    setError("")

    try {
      if (isDemoMode) {
        // Demo mode: update localStorage
        const newPunches = punchCard.current_punches + 1
        const resetCard = newPunches >= punchCard.max_punches

        const updated = {
          ...punchCard,
          current_punches: resetCard ? 0 : newPunches,
          total_punches: punchCard.total_punches + 1,
        }
        setPunchCard(updated)

        // Persist to localStorage
        if (typeof window !== "undefined") {
          const demoCards = JSON.parse(localStorage.getItem("demo_punch_cards") || "[]")
          const cardIndex = demoCards.findIndex(
            (c: any) => c.user_id === user.id && c.business_id === selectedBusiness.id
          )
          const cardData = {
            id: `card-${user.id}-${selectedBusiness.id}`,
            user_id: user.id,
            business_id: selectedBusiness.id,
            current_punches: updated.current_punches,
            total_punches: updated.total_punches,
            updated_at: new Date().toISOString(),
          }
          if (cardIndex >= 0) {
            demoCards[cardIndex] = cardData
          } else {
            demoCards.push(cardData)
          }
          localStorage.setItem("demo_punch_cards", JSON.stringify(demoCards))
        }
      } else {
        // Real mode: call API
        const res = await fetch("/api/punches", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nfc_tag_id: selectedBusiness.nfc_tag_id }),
        })

        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || "Failed to collect punch")
        }

        const data = await res.json()
        setPunchCard({
          ...punchCard,
          current_punches: data.punch.current_punches,
          total_punches: data.punch.total_punches,
        })
      }

      setTimeout(() => {
        setShowAnimation(false)
        setIsPunching(false)
      }, 2000)
    } catch (err: any) {
      setError(err.message || "Failed to collect punch")
      setIsPunching(false)
      setShowAnimation(false)
    }
  }

  const startNFCScanning = async () => {
    setNfcScanning(true)
    setTimeout(() => {
      setNfcScanning(false)
      collectPunch()
    }, 1500)
  }

  useEffect(() => {
    fetchBusiness()
  }, [fetchBusiness])

  useEffect(() => {
    if (welcome === "true") {
      setShowWelcome(true)
    }
  }, [welcome])

  useEffect(() => {
    if (selectedBusiness && user) {
      fetchPunchCard(selectedBusiness)
    }
  }, [selectedBusiness, user, fetchPunchCard])

  // If not logged in and there's an NFC tag, show sign-up CTA
  if (!authLoading && !user && nfcTagId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 p-4">
        <div className="max-w-md mx-auto">
          {selectedBusiness ? (
            <Card className="border border-gray-200 shadow-sm bg-white">
              <CardHeader className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Star className="h-8 w-8 text-blue-600" />
                </div>
                <CardTitle className="text-2xl text-gray-900">{selectedBusiness.name}</CardTitle>
                <CardDescription className="text-gray-600">
                  {selectedBusiness.description || "Start earning rewards today!"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-800 mb-1">Earn a free reward after</p>
                  <p className="text-3xl font-bold text-blue-600">{selectedBusiness.max_punches} visits</p>
                </div>

                <Button
                  className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white"
                  size="lg"
                  onClick={() => router.push(`/auth/register?redirect=/tap?nfc=${nfcTagId}`)}
                >
                  <UserPlus className="mr-2 h-5 w-5" />
                  Sign Up to Start Earning
                </Button>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => router.push(`/auth/login?redirect=/tap?nfc=${nfcTagId}`)}
                >
                  Already have an account? Sign In
                </Button>
              </CardContent>
            </Card>
          ) : businessNotFound ? (
            <Card className="border border-red-200 shadow-sm bg-white">
              <CardHeader className="text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="h-8 w-8 text-red-600" />
                </div>
                <CardTitle className="text-2xl text-gray-900">NFC Tag Not Recognized</CardTitle>
                <CardDescription className="text-gray-600">
                  This NFC tag isn't linked to any business in our system.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() => router.push("/tap")}
                >
                  Browse Businesses
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => router.push("/")}
                >
                  Go Home
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading business info...</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    router.push("/auth/login")
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 p-4">
      <div className="max-w-md mx-auto">
        <div className="mb-6 flex justify-between items-center">
          <Link href="/dashboard" className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Link>
          <Badge variant="outline" className="border-gray-300 text-gray-700">
            {user.name}
          </Badge>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
            {error}
          </div>
        )}

        {nfcTagId && businessNotFound && (
          <Card className="mb-6 border border-red-200 shadow-sm bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-6 w-6 text-red-600" />
                <div>
                  <p className="font-semibold text-red-900">NFC Tag Not Recognized</p>
                  <p className="text-sm text-red-700">This tag isn't linked to any business.</p>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="outline" onClick={() => router.push("/tap")}>
                  Browse Businesses
                </Button>
                <Button size="sm" variant="outline" onClick={() => router.push("/dashboard")}>
                  Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {showWelcome && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start justify-between">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-semibold text-green-900">Welcome, {user.name}!</p>
                <p className="text-sm text-green-700">Tap below to collect your first punch.</p>
              </div>
            </div>
            <button onClick={() => setShowWelcome(false)} className="text-green-600 hover:text-green-800">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Business Selection - only show if no NFC tag detected */}
        {!nfcTagId && (
          <Card className="mb-6 border border-gray-200 shadow-sm bg-white">
            <CardHeader>
              <CardTitle className="text-gray-900">Select Business</CardTitle>
              <CardDescription className="text-gray-600">Choose where you want to get punched</CardDescription>
            </CardHeader>
            <CardContent>
              <Select
                value={selectedBusiness?.id || ""}
                onValueChange={(value) => {
                  const business = businesses.find((b) => b.id === value)
                  setSelectedBusiness(business || null)
                }}
              >
                <SelectTrigger className="border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                  <SelectValue placeholder="Choose a business" />
                </SelectTrigger>
                <SelectContent>
                  {businesses.map((business) => (
                    <SelectItem key={business.id} value={business.id}>
                      {business.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        )}

        {/* NFC Detection Banner */}
        {nfcTagId && selectedBusiness && (
          <Card className="mb-6 border border-blue-200 shadow-sm bg-blue-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Wifi className="h-6 w-6 text-blue-600" />
                <div>
                  <p className="font-semibold text-blue-900">NFC Tag Detected</p>
                  <p className="text-sm text-blue-700">Connected to {selectedBusiness.name}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Loading state */}
        {isLoading && selectedBusiness && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading your punch card...</p>
          </div>
        )}

        {/* Punch Card */}
        {selectedBusiness && punchCard && !isLoading && (
          <>
            <Card className="mb-6 border border-gray-200 shadow-sm bg-white">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl text-gray-900">{punchCard.business.name}</CardTitle>
                <CardDescription className="text-gray-600">{punchCard.business.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center mb-6">
                  <div className="text-4xl font-bold text-blue-600 mb-2">
                    {punchCard.current_punches}/{punchCard.max_punches}
                  </div>
                  <Progress
                    value={(punchCard.current_punches / punchCard.max_punches) * 100}
                    className="mb-4"
                  />
                  <Badge variant="secondary" className="bg-gray-100 text-gray-700">
                    Total Punches: {punchCard.total_punches}
                  </Badge>
                </div>

                {/* Punch Card Visual */}
                <div className="grid grid-cols-5 gap-2 mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  {Array.from({ length: punchCard.max_punches }).map((_, index) => (
                    <div
                      key={index}
                      className={`aspect-square rounded-full border-2 flex items-center justify-center transition-all duration-500 ${
                        index < punchCard.current_punches
                          ? "bg-blue-500 border-blue-500 text-white"
                          : "border-gray-300 bg-white"
                      } ${showAnimation && index === punchCard.current_punches - 1 ? "animate-pulse scale-110" : ""}`}
                    >
                      {index < punchCard.current_punches && <Star className="h-4 w-4 fill-current" />}
                    </div>
                  ))}
                </div>

                <Button
                  onClick={startNFCScanning}
                  disabled={isPunching || nfcScanning}
                  className="w-full mb-4 h-12 bg-blue-600 hover:bg-blue-700 text-white"
                  size="lg"
                >
                  {nfcScanning ? (
                    <>
                      <Wifi className="mr-2 h-5 w-5 animate-pulse" />
                      Scanning for NFC...
                    </>
                  ) : isPunching ? (
                    <>
                      <Zap className="mr-2 h-5 w-5 animate-bounce" />
                      Punching Card...
                    </>
                  ) : (
                    <>
                      <Wifi className="mr-2 h-5 w-5" />
                      Tap NFC Tag
                    </>
                  )}
                </Button>

                {showAnimation && (
                  <div className="text-center py-4">
                    <div className="text-6xl animate-bounce">🎉</div>
                    <div className="text-lg font-semibold text-blue-600 mt-2">Punch Added!</div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Available Prizes */}
            {prizes.length > 0 && (
              <Card className="border border-gray-200 shadow-sm bg-white">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-gray-900">
                    <Gift className="h-5 w-5 text-emerald-600" />
                    Available Rewards
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {prizes.map((prize) => (
                    <div
                      key={prize.id}
                      className={`p-3 rounded-lg border ${
                        punchCard.current_punches >= prize.punches_required
                          ? "bg-emerald-50 border-emerald-200"
                          : "bg-gray-50 border-gray-200"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold text-gray-900">{prize.name}</h4>
                          <p className="text-sm text-gray-600">{prize.description}</p>
                        </div>
                        <Badge
                          variant={punchCard.current_punches >= prize.punches_required ? "default" : "secondary"}
                          className={
                            punchCard.current_punches >= prize.punches_required
                              ? "bg-emerald-500 text-white"
                              : "bg-gray-100 text-gray-700"
                          }
                        >
                          {prize.punches_required} punches
                        </Badge>
                      </div>
                      {punchCard.current_punches >= prize.punches_required && (
                        <Link href="/dashboard" className="block mt-2 text-center text-sm font-medium text-emerald-700 hover:text-emerald-800 underline">
                          Visit Dashboard to Redeem
                        </Link>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* View Leaderboard Link */}
            <Link
              href={`/leaderboard/${selectedBusiness.id}`}
              className="flex items-center justify-center gap-2 mt-4 py-3 text-sm font-medium text-orange-600 hover:text-orange-700 transition-colors"
            >
              <Trophy className="h-4 w-4" />
              View Leaderboard
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
