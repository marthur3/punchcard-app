"use client"

import { Suspense, useState, useEffect, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Wifi, Gift, Star, Zap, ArrowLeft, UserPlus, AlertTriangle, X, CheckCircle, Trophy } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { WalletCardModal } from "@/components/wallet-card-modal"
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
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-900"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400"></div></div>}>
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
  const [showWalletModal, setShowWalletModal] = useState(false)
  const [error, setError] = useState("")
  const [businessNotFound, setBusinessNotFound] = useState(false)
  const [showWelcome, setShowWelcome] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  const nfcTagId = searchParams?.get("nfc")
  const welcome = searchParams?.get("welcome")

  const fetchBusiness = useCallback(async () => {
    try {
      if (nfcTagId) {
        const res = await fetch(`/api/businesses?nfc_tag_id=${encodeURIComponent(nfcTagId)}`)
        if (res.ok) {
          const data = await res.json()
          if (data.business) {
            setSelectedBusiness(data.business)
            return
          }
        }

        if (isDemoMode) {
          const { demoBusinesses } = await import("@/lib/demo-data")
          const found = demoBusinesses.find((b: any) => b.nfc_tag_id === nfcTagId)
          if (found) {
            setSelectedBusiness(found)
            return
          }

          if (typeof window !== "undefined") {
            const registered = JSON.parse(localStorage.getItem("demo_registered_businesses") || "[]")
            const regFound = registered.find((b: any) => b.nfc_tag_id === nfcTagId)
            if (regFound) {
              setSelectedBusiness(regFound)
              return
            }
          }
        }

        setBusinessNotFound(true)
        return
      }

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

  const fetchPunchCard = useCallback(async (business: Business) => {
    if (!user) return
    setIsLoading(true)

    try {
      if (isDemoMode) {
        const { demoPunchCards, demoPrizes } = await import("@/lib/demo-data")
        let savedCards: any[] = []
        if (typeof window !== "undefined") {
          savedCards = JSON.parse(localStorage.getItem("demo_punch_cards") || "[]")
        }

        const card = savedCards.find((c: any) => c.user_id === user.id && c.business_id === business.id) ||
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

  const collectPunch = async () => {
    if (!punchCard || !user || !selectedBusiness) return

    setIsPunching(true)
    setShowAnimation(true)
    setError("")

    try {
      if (isDemoMode) {
        const newPunches = punchCard.current_punches + 1
        const resetCard = newPunches >= punchCard.max_punches

        const updated = {
          ...punchCard,
          current_punches: resetCard ? 0 : newPunches,
          total_punches: punchCard.total_punches + 1,
        }
        setPunchCard(updated)

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
    if (!authLoading) {
      fetchBusiness()
    }
  }, [fetchBusiness, authLoading])

  useEffect(() => {
    if (welcome === "true") {
      setShowWelcome(true)
    }
  }, [welcome])

  useEffect(() => {
    if (selectedBusiness && user && !authLoading) {
      fetchPunchCard(selectedBusiness)
    }
  }, [selectedBusiness, user, authLoading, fetchPunchCard])

  // Not logged in + NFC tag: sign-up CTA
  if (!authLoading && !user && nfcTagId) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-gradient-to-b from-gray-900 to-gray-800">
          <div className="max-w-md mx-auto px-4 pt-8 pb-16 text-center">
            {selectedBusiness ? (
              <>
                <div className="w-16 h-16 bg-amber-400/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Star className="h-8 w-8 text-amber-400" />
                </div>
                <h1 className="text-2xl font-bold text-white">{selectedBusiness.name}</h1>
                <p className="text-gray-400 mt-1">{selectedBusiness.description || "Start earning rewards today!"}</p>
              </>
            ) : businessNotFound ? (
              <>
                <div className="w-16 h-16 bg-red-400/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="h-8 w-8 text-red-400" />
                </div>
                <h1 className="text-2xl font-bold text-white">Tag Not Recognized</h1>
                <p className="text-gray-400 mt-1">This NFC tag isn&apos;t linked to any business.</p>
              </>
            ) : (
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-400 mx-auto"></div>
            )}
          </div>
        </div>

        <div className="max-w-md mx-auto px-4 -mt-8">
          {selectedBusiness ? (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 space-y-4">
              <div className="text-center p-4 bg-amber-50 rounded-xl">
                <p className="text-sm text-gray-600 mb-1">Earn a free reward after</p>
                <p className="text-3xl font-bold text-amber-600">{selectedBusiness.max_punches} visits</p>
              </div>
              <Button
                className="w-full h-12 bg-gray-900 hover:bg-gray-800 text-white rounded-xl font-medium"
                size="lg"
                onClick={() => router.push(`/auth/register?redirect=/tap?nfc=${nfcTagId}`)}
              >
                <UserPlus className="mr-2 h-5 w-5" />
                Sign Up to Start Earning
              </Button>
              <Button
                variant="ghost"
                className="w-full text-gray-500 hover:text-gray-700"
                onClick={() => router.push(`/auth/login?redirect=/tap?nfc=${nfcTagId}`)}
              >
                Already have an account? Sign In
              </Button>
            </div>
          ) : businessNotFound ? (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 space-y-3">
              <Button
                className="w-full bg-gray-900 hover:bg-gray-800 text-white rounded-xl"
                onClick={() => router.push("/tap")}
              >
                Browse Businesses
              </Button>
              <Button
                variant="ghost"
                className="w-full text-gray-500"
                onClick={() => router.push("/")}
              >
                Go Home
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    )
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-400 mx-auto mb-3"></div>
          <p className="text-gray-400 text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    router.push("/auth/login")
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Dark header */}
      <div className="bg-gradient-to-b from-gray-900 to-gray-800">
        <div className="max-w-md mx-auto px-4 pt-4 pb-6">
          <div className="flex justify-between items-center mb-4">
            <Link href="/dashboard" className="inline-flex items-center text-sm text-gray-400 hover:text-white transition-colors">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Dashboard
            </Link>
            <Badge className="bg-white/10 text-gray-300 border-white/10 text-xs">
              {user.name}
            </Badge>
          </div>

          {selectedBusiness && (
            <div className="text-center">
              <h1 className="text-xl font-bold text-white">{selectedBusiness.name}</h1>
              <p className="text-amber-400 text-sm font-medium">Tap to collect</p>
            </div>
          )}
          {!selectedBusiness && !nfcTagId && (
            <div className="text-center">
              <h1 className="text-xl font-bold text-white">Collect a Punch</h1>
              <p className="text-gray-400 text-sm">Select a business below</p>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-4">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm">
            {error}
          </div>
        )}

        {nfcTagId && businessNotFound && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0" />
              <div>
                <p className="font-semibold text-red-900 text-sm">NFC Tag Not Recognized</p>
                <p className="text-xs text-red-700">This tag isn&apos;t linked to any business.</p>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <Button size="sm" variant="outline" onClick={() => router.push("/tap")} className="text-xs rounded-lg">
                Browse Businesses
              </Button>
              <Button size="sm" variant="outline" onClick={() => router.push("/dashboard")} className="text-xs rounded-lg">
                Dashboard
              </Button>
            </div>
          </div>
        )}

        {showWelcome && (
          <div className="mb-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start justify-between">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-emerald-600 mt-0.5" />
              <div>
                <p className="font-semibold text-emerald-900 text-sm">Welcome, {user.name}!</p>
                <p className="text-xs text-emerald-700">Tap below to collect your first punch.</p>
              </div>
            </div>
            <button onClick={() => setShowWelcome(false)} className="text-emerald-400 hover:text-emerald-600">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Business Selection */}
        {!nfcTagId && (
          <div className="mb-4 bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <label className="text-sm font-medium text-gray-700 mb-2 block">Select Business</label>
            <Select
              value={selectedBusiness?.id || ""}
              onValueChange={(value) => {
                const business = businesses.find((b) => b.id === value)
                setSelectedBusiness(business || null)
              }}
            >
              <SelectTrigger className="border-gray-200 bg-gray-50 focus:border-amber-400 focus:ring-amber-400 rounded-xl h-11">
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
          </div>
        )}

        {/* NFC Detection */}
        {nfcTagId && selectedBusiness && (
          <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3">
            <Wifi className="h-5 w-5 text-amber-600" />
            <div>
              <p className="font-semibold text-gray-900 text-sm">NFC Tag Detected</p>
              <p className="text-xs text-gray-600">Connected to {selectedBusiness.name}</p>
            </div>
          </div>
        )}

        {/* Loading */}
        {isLoading && selectedBusiness && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400 mx-auto mb-3"></div>
            <p className="text-sm text-gray-500">Loading your punch card...</p>
          </div>
        )}

        {/* Punch Card */}
        {selectedBusiness && punchCard && !isLoading && (
          <>
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm mb-4">
              {/* Progress */}
              <div className="text-center mb-5">
                <div className="text-4xl font-bold text-gray-900 mb-1">
                  {punchCard.current_punches}<span className="text-gray-300 text-xl font-normal">/{punchCard.max_punches}</span>
                </div>
                <Progress
                  value={(punchCard.current_punches / punchCard.max_punches) * 100}
                  className="h-2 mb-2"
                />
                <span className="text-xs text-gray-400">{punchCard.total_punches} total visits</span>
              </div>

              {/* Punch dots */}
              <div className="flex flex-wrap justify-center gap-2 mb-6">
                {Array.from({ length: punchCard.max_punches }).map((_, index) => (
                  <div
                    key={index}
                    className={`w-9 h-9 rounded-full border-2 flex items-center justify-center transition-all duration-500 ${
                      index < punchCard.current_punches
                        ? "bg-amber-400 border-amber-400 text-white"
                        : "border-gray-200 bg-gray-50"
                    } ${showAnimation && index === punchCard.current_punches - 1 ? "animate-pulse scale-110" : ""}`}
                  >
                    {index < punchCard.current_punches && <Star className="h-4 w-4 fill-current" />}
                  </div>
                ))}
              </div>

              {/* Tap button */}
              <Button
                onClick={startNFCScanning}
                disabled={isPunching || nfcScanning}
                className="w-full h-14 bg-gray-900 hover:bg-gray-800 text-white rounded-xl font-medium text-base"
                size="lg"
              >
                {nfcScanning ? (
                  <>
                    <Wifi className="mr-2 h-5 w-5 animate-pulse" />
                    Scanning...
                  </>
                ) : isPunching ? (
                  <>
                    <Zap className="mr-2 h-5 w-5 animate-bounce" />
                    Punching...
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
                  <div className="text-5xl animate-bounce">🎉</div>
                  <div className="text-base font-semibold text-amber-600 mt-2">Punch Added!</div>
                </div>
              )}

              {/* Add to Wallet */}
              <button
                onClick={() => setShowWalletModal(true)}
                className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                </svg>
                Add to Wallet
              </button>
            </div>

            {/* Available Prizes */}
            {prizes.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm mb-4">
                <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-3">
                  <Gift className="h-4 w-4 text-emerald-600" />
                  Available Rewards
                </h3>
                <div className="space-y-2.5">
                  {prizes.map((prize) => {
                    const canRedeem = punchCard.current_punches >= prize.punches_required
                    return (
                      <div
                        key={prize.id}
                        className={`p-3 rounded-xl border ${
                          canRedeem
                            ? "bg-emerald-50 border-emerald-200"
                            : "bg-gray-50 border-gray-100"
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <h4 className="font-semibold text-sm text-gray-900">{prize.name}</h4>
                            <p className="text-xs text-gray-500">{prize.description}</p>
                          </div>
                          <Badge
                            className={
                              canRedeem
                                ? "bg-emerald-500 text-white text-[10px]"
                                : "bg-gray-100 text-gray-500 text-[10px]"
                            }
                          >
                            {prize.punches_required} punches
                          </Badge>
                        </div>
                        {canRedeem && (
                          <Link href="/dashboard" className="block mt-2 text-center text-xs font-medium text-emerald-700 hover:text-emerald-800">
                            Go to Dashboard to Redeem
                          </Link>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Leaderboard link */}
            <Link
              href={`/leaderboard/${selectedBusiness.id}`}
              className="flex items-center justify-center gap-2 py-3 text-sm font-medium text-amber-600 hover:text-amber-700 transition-colors"
            >
              <Trophy className="h-4 w-4" />
              View Leaderboard
            </Link>
          </>
        )}
      </div>

      {/* Wallet Card Modal */}
      {selectedBusiness && punchCard && user && (
        <WalletCardModal
          open={showWalletModal}
          onClose={() => setShowWalletModal(false)}
          businessName={selectedBusiness.name}
          businessId={selectedBusiness.id}
          currentPunches={punchCard.current_punches}
          maxPunches={punchCard.max_punches}
          nextReward={prizes[0]?.name || 'Free reward'}
          customerName={user.name}
        />
      )}
    </div>
  )
}
