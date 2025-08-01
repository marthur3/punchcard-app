"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Wifi, Gift, Star, Zap } from "lucide-react"
import { supabase } from "@/lib/supabase"

interface PunchCard {
  id: string
  current_punches: number
  total_punches: number
  business: {
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
}

export default function PunchPage() {
  const searchParams = useSearchParams()
  const [email, setEmail] = useState(searchParams?.get("email") || "")
  const [businessName, setBusinessName] = useState(searchParams?.get("business") || "")
  const [punchCard, setPunchCard] = useState<PunchCard | null>(null)
  const [prizes, setPrizes] = useState<Prize[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isPunching, setIsPunching] = useState(false)
  const [showAnimation, setShowAnimation] = useState(false)
  const [nfcScanning, setNfcScanning] = useState(false)

  const fetchPunchCard = async () => {
    if (!email || !businessName) return

    setIsLoading(true)
    try {
      // Get or create user
      let { data: user } = await supabase.from("users").select("*").eq("email", email).single()

      if (!user) {
        const { data: newUser } = await supabase
          .from("users")
          .insert({ email, name: email.split("@")[0] })
          .select()
          .single()
        user = newUser
      }

      // Get business
      const { data: business } = await supabase.from("businesses").select("*").eq("name", businessName).single()

      if (!business) {
        throw new Error("Business not found")
      }

      // Get or create punch card
      let { data: card } = await supabase
        .from("punch_cards")
        .select(`
          *,
          business:businesses(name, description, max_punches)
        `)
        .eq("user_id", user.id)
        .eq("business_id", business.id)
        .single()

      if (!card) {
        const { data: newCard } = await supabase
          .from("punch_cards")
          .insert({
            user_id: user.id,
            business_id: business.id,
            current_punches: 0,
            total_punches: 0,
          })
          .select(`
            *,
            business:businesses(name, description, max_punches)
          `)
          .single()
        card = newCard
      }

      setPunchCard(card)

      // Get available prizes
      const { data: prizesData } = await supabase
        .from("prizes")
        .select("*")
        .eq("business_id", business.id)
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
    if (!punchCard) return

    setIsPunching(true)
    setShowAnimation(true)

    try {
      // Add punch
      const { data: punch } = await supabase
        .from("punches")
        .insert({
          punch_card_id: punchCard.id,
          user_id: punchCard.user_id,
          business_id: punchCard.business_id,
          location_data: { simulated: true, timestamp: new Date().toISOString() },
        })
        .select()
        .single()

      // Update punch card
      const newPunches = punchCard.current_punches + 1
      const resetCard = newPunches >= punchCard.business.max_punches

      const { data: updatedCard } = await supabase
        .from("punch_cards")
        .update({
          current_punches: resetCard ? 0 : newPunches,
          total_punches: punchCard.total_punches + 1,
        })
        .eq("id", punchCard.id)
        .select(`
          *,
          business:businesses(name, description, max_punches)
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
    if (email && businessName) {
      fetchPunchCard()
    }
  }, [email, businessName])

  if (!email || !businessName) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4">
        <div className="max-w-md mx-auto pt-20">
          <Card>
            <CardHeader>
              <CardTitle>Enter Details</CardTitle>
              <CardDescription>Enter your email and select a business to get started</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                />
              </div>
              <div>
                <Label htmlFor="business">Business Name</Label>
                <Input
                  id="business"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Coffee Corner"
                />
              </div>
              <Button onClick={fetchPunchCard} disabled={!email || !businessName || isLoading} className="w-full">
                {isLoading ? "Loading..." : "Get My Punch Card"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      <div className="max-w-md mx-auto">
        {punchCard && (
          <>
            <Card className="mb-6 border-0 shadow-lg">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">{punchCard.business.name}</CardTitle>
                <CardDescription>{punchCard.business.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center mb-6">
                  <div className="text-4xl font-bold text-purple-600 mb-2">
                    {punchCard.current_punches}/{punchCard.business.max_punches}
                  </div>
                  <Progress
                    value={(punchCard.current_punches / punchCard.business.max_punches) * 100}
                    className="mb-4"
                  />
                  <Badge variant="secondary">Total Punches: {punchCard.total_punches}</Badge>
                </div>

                {/* Punch Card Visual */}
                <div className="grid grid-cols-5 gap-2 mb-6 p-4 bg-white rounded-lg shadow-inner">
                  {Array.from({ length: punchCard.business.max_punches }).map((_, index) => (
                    <div
                      key={index}
                      className={`aspect-square rounded-full border-2 flex items-center justify-center transition-all duration-500 ${
                        index < punchCard.current_punches
                          ? "bg-purple-500 border-purple-500 text-white"
                          : "border-gray-300 bg-gray-50"
                      } ${showAnimation && index === punchCard.current_punches - 1 ? "animate-pulse scale-110" : ""}`}
                    >
                      {index < punchCard.current_punches && <Star className="h-4 w-4 fill-current" />}
                    </div>
                  ))}
                </div>

                <Button
                  onClick={startNFCScanning}
                  disabled={isPunching || nfcScanning}
                  className="w-full mb-4 h-12"
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
                    <div className="text-lg font-semibold text-purple-600 mt-2">Punch Added!</div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Available Prizes */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gift className="h-5 w-5" />
                  Available Rewards
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {prizes.map((prize) => (
                  <div
                    key={prize.id}
                    className={`p-3 rounded-lg border ${
                      punchCard.current_punches >= prize.punches_required
                        ? "bg-green-50 border-green-200"
                        : "bg-gray-50 border-gray-200"
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold">{prize.name}</h4>
                        <p className="text-sm text-gray-600">{prize.description}</p>
                      </div>
                      <Badge variant={punchCard.current_punches >= prize.punches_required ? "default" : "secondary"}>
                        {prize.punches_required} punches
                      </Badge>
                    </div>
                    {punchCard.current_punches >= prize.punches_required && (
                      <Button size="sm" className="mt-2 w-full">
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
