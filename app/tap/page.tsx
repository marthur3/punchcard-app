"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Wifi, Gift, Star, Zap, ArrowLeft } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { supabase } from "@/lib/supabase"
import Link from "next/link"

interface Business {
  id: string
  name: string
  description: string
  max_punches: number
  nfc_tag_id: string
}

interface PunchCard {
  id: string
  current_punches: number
  total_punches: number
  business: Business
}

interface Prize {
  id: string
  name: string
  description: string
  punches_required: number
}

export default function TapPage() {
  const { user, isLoading: authLoading } = useAuth()
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null)
  const [punchCard, setPunchCard] = useState<PunchCard | null>(null)
  const [prizes, setPrizes] = useState<Prize[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isPunching, setIsPunching] = useState(false)
  const [showAnimation, setShowAnimation] = useState(false)
  const [nfcScanning, setNfcScanning] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  const fetchBusinesses = async () => {
    // Check if we're in demo mode
    const isDemoMode =
      process.env.NEXT_PUBLIC_SUPABASE_URL === undefined ||
      process.env.NEXT_PUBLIC_SUPABASE_URL === "https://demo.supabase.co"

    if (isDemoMode) {
      const { demoBusinesses } = await import("@/lib/demo-data")
      setBusinesses(demoBusinesses)

      // Auto-select business from NFC tag ID or business name
      const nfcTagId = searchParams?.get("nfc")
      const businessParam = searchParams?.get("business")
      
      if (nfcTagId && demoBusinesses) {
        const business = demoBusinesses.find((b) => b.nfc_tag_id === nfcTagId)
        if (business) {
          setSelectedBusiness(business)
        }
      } else if (businessParam && demoBusinesses) {
        const business = demoBusinesses.find((b) => b.name === businessParam)
        if (business) {
          setSelectedBusiness(business)
        }
      }
      return
    }

    // Real Supabase mode
    const { data } = await supabase.from("businesses").select("*").order("name")
    setBusinesses(data || [])

    // Auto-select business from NFC tag ID or business name
    const nfcTagId = searchParams?.get("nfc")
    const businessParam = searchParams?.get("business")
    
    if (nfcTagId && data) {
      const business = data.find((b) => b.nfc_tag_id === nfcTagId)
      if (business) {
        setSelectedBusiness(business)
      }
    } else if (businessParam && data) {
      const business = data.find((b) => b.name === businessParam)
      if (business) {
        setSelectedBusiness(business)
      }
    }
  }

  const fetchPunchCard = async (businessId: string) => {
    if (!user) return

    setIsLoading(true)
    try {
      // Check if we're in demo mode
      const isDemoMode =
        process.env.NEXT_PUBLIC_SUPABASE_URL === undefined ||
        process.env.NEXT_PUBLIC_SUPABASE_URL === "https://demo.supabase.co"

      if (isDemoMode) {
        const { demoPunchCards, demoPrizes } = await import("@/lib/demo-data")

        // Check localStorage for updated demo cards first
        let savedCards: any[] = []
        if (typeof window !== "undefined") {
          savedCards = JSON.parse(localStorage.getItem("demo_punch_cards") || "[]")
        }

        // Find existing card in saved cards or demo data
        let card = savedCards.find((c) => c.user_id === user.id && c.business_id === businessId) ||
                  demoPunchCards.find((c) => c.user_id === user.id && c.business_id === businessId)

        if (!card) {
          // Create new demo card
          const business = businesses.find((b) => b.id === businessId)
          card = {
            id: `card-${Date.now()}`,
            user_id: user.id,
            business_id: businessId,
            current_punches: 0,
            total_punches: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            business: business!,
          }
        } else {
          // Ensure business object is attached
          card.business = businesses.find((b) => b.id === businessId)
        }

        setPunchCard(card)

        // Get available prizes
        const businessPrizes = demoPrizes.filter((p) => p.business_id === businessId)
        setPrizes(businessPrizes)

        setIsLoading(false)
        return
      }

      // Real Supabase mode (existing code)
      let { data: card } = await supabase
        .from("punch_cards")
        .select(`
          *,
          business:businesses(*)
        `)
        .eq("user_id", user.id)
        .eq("business_id", businessId)
        .single()

      if (!card) {
        const { data: newCard } = await supabase
          .from("punch_cards")
          .insert({
            user_id: user.id,
            business_id: businessId,
            current_punches: 0,
            total_punches: 0,
          })
          .select(`
            *,
            business:businesses(*)
          `)
          .single()
        card = newCard
      }

      setPunchCard(card)

      // Get available prizes
      const { data: prizesData } = await supabase
        .from("prizes")
        .select("*")
        .eq("business_id", businessId)
        .eq("is_active", true)
        .order("punches_required")

      setPrizes(prizesData || [])
    } catch (error) {
      console.error("Error fetching punch card:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const simulateNFCTap = async () => {
    if (!punchCard || !user) return

    setIsPunching(true)
    setShowAnimation(true)

    try {
      // Check if we're in demo mode
      const isDemoMode =
        process.env.NEXT_PUBLIC_SUPABASE_URL === undefined ||
        process.env.NEXT_PUBLIC_SUPABASE_URL === "https://demo.supabase.co"

      if (isDemoMode) {
        // Demo mode - simulate punch without actual database calls
        const newPunches = punchCard.current_punches + 1
        const resetCard = newPunches >= punchCard.business.max_punches

        const updatedCard = {
          ...punchCard,
          current_punches: resetCard ? 0 : newPunches,
          total_punches: punchCard.total_punches + 1,
          updated_at: new Date().toISOString(),
        }

        setPunchCard(updatedCard)

        // Store updated card in localStorage for demo persistence
        if (typeof window !== "undefined") {
          const demoCards = JSON.parse(localStorage.getItem("demo_punch_cards") || "[]")
          const cardIndex = demoCards.findIndex((c: any) => c.id === punchCard.id)
          if (cardIndex >= 0) {
            demoCards[cardIndex] = updatedCard
          } else {
            demoCards.push(updatedCard)
          }
          localStorage.setItem("demo_punch_cards", JSON.stringify(demoCards))
        }

        // Simulate animation delay
        setTimeout(() => {
          setShowAnimation(false)
          setIsPunching(false)
        }, 2000)
        return
      }

      // Real Supabase mode
      // Add punch
      await supabase.from("punches").insert({
        punch_card_id: punchCard.id,
        user_id: user.id,
        business_id: punchCard.business.id,
        location_data: { simulated: true, timestamp: new Date().toISOString() },
      })

      // Update punch card
      const newPunches = punchCard.current_punches + 1
      const resetCard = newPunches >= punchCard.business.max_punches

      const { data: updatedCard } = await supabase
        .from("punch_cards")
        .update({
          current_punches: resetCard ? 0 : newPunches,
          total_punches: punchCard.total_punches + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", punchCard.id)
        .select(`
          *,
          business:businesses(*)
        `)
        .single()

      setPunchCard(updatedCard)

      // Simulate animation delay
      setTimeout(() => {
        setShowAnimation(false)
        setIsPunching(false)
      }, 2000)
    } catch (error) {
      console.error("Error adding punch:", error)
      setIsPunching(false)
      setShowAnimation(false)
    }
  }

  const startNFCScanning = async () => {
    setNfcScanning(true)
    // Simulate NFC scanning
    setTimeout(() => {
      setNfcScanning(false)
      simulateNFCTap()
    }, 1500)
  }

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/login")
      return
    }

    if (user) {
      fetchBusinesses()
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (selectedBusiness && user) {
      fetchPunchCard(selectedBusiness.id)
    }
  }, [selectedBusiness, user])

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
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
            Logged in as {user.name}
          </Badge>
        </div>

        {/* Business Selection - only show if no NFC tag detected */}
        {!searchParams?.get("nfc") && (
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
                      {business.name} - {business.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        )}

        {/* NFC Detection Banner */}
        {searchParams?.get("nfc") && selectedBusiness && (
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

        {/* Punch Card */}
        {selectedBusiness && punchCard && (
          <>
            <Card className="mb-6 border border-gray-200 shadow-sm bg-white">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl text-gray-900">{punchCard.business.name}</CardTitle>
                <CardDescription className="text-gray-600">{punchCard.business.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center mb-6">
                  <div className="text-4xl font-bold text-blue-600 mb-2">
                    {punchCard.current_punches}/{punchCard.business.max_punches}
                  </div>
                  <Progress
                    value={(punchCard.current_punches / punchCard.business.max_punches) * 100}
                    className="mb-4"
                  />
                  <Badge variant="secondary" className="bg-gray-100 text-gray-700">
                    Total Punches: {punchCard.total_punches}
                  </Badge>
                </div>

                {/* Punch Card Visual */}
                <div className="grid grid-cols-5 gap-2 mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  {Array.from({ length: punchCard.business.max_punches }).map((_, index) => (
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
                      <Button size="sm" className="mt-2 w-full bg-emerald-600 hover:bg-emerald-700 text-white">
                        Redeem Now
                      </Button>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  )
}
