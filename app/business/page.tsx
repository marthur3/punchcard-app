"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Store, Gift, Users, TrendingUp, Plus, Edit, CheckCircle, Trophy } from "lucide-react"
import { supabase } from "@/lib/supabase"
import Link from "next/link"

interface Business {
  id: string
  name: string
  description: string
  max_punches: number
  nfc_tag_id: string
}

interface Prize {
  id: string
  name: string
  description: string
  punches_required: number
  is_active: boolean
}

interface Analytics {
  totalPunches: number
  activeUsers: number
  prizesRedeemed: number
  avgPunchesPerUser: number
}

export default function BusinessDashboard() {
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null)
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [prizes, setPrizes] = useState<Prize[]>([])
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [businessLeaderboard, setBusinessLeaderboard] = useState<LeaderboardEntry[]>([])
  const [globalLeaderboard, setGlobalLeaderboard] = useState<LeaderboardEntry[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [newPrize, setNewPrize] = useState({
    name: "",
    description: "",
    punches_required: 5,
  })

  const fetchBusinesses = async () => {
    // Check if we're in demo mode
    const isDemoMode =
      process.env.NEXT_PUBLIC_SUPABASE_URL === undefined ||
      process.env.NEXT_PUBLIC_SUPABASE_URL === "https://demo.supabase.co"

    if (isDemoMode) {
      const { demoBusinesses } = await import("@/lib/demo-data")
      
      // Load registered businesses from localStorage
      const registeredBusinesses = JSON.parse(localStorage.getItem('demo_registered_businesses') || '[]')
      
      // Combine demo and registered businesses
      const allBusinesses = [...demoBusinesses, ...registeredBusinesses]
      setBusinesses(allBusinesses)
      
      // Check if user has an admin session for a specific business
      const adminSession = JSON.parse(localStorage.getItem('business_admin_session') || '{}')
      if (adminSession.business_id) {
        const userBusiness = allBusinesses.find(b => b.id === adminSession.business_id)
        if (userBusiness) {
          setSelectedBusiness(userBusiness)
          return
        }
      }
      
      if (allBusinesses.length > 0 && !selectedBusiness) {
        setSelectedBusiness(allBusinesses[0])
      }
      return
    }

    const { data } = await supabase.from("businesses").select("*").order("name")

    setBusinesses(data || [])
    if (data && data.length > 0 && !selectedBusiness) {
      setSelectedBusiness(data[0])
    }
  }

  const fetchPrizes = async (businessId: string) => {
    // Check if we're in demo mode
    const isDemoMode =
      process.env.NEXT_PUBLIC_SUPABASE_URL === undefined ||
      process.env.NEXT_PUBLIC_SUPABASE_URL === "https://demo.supabase.co"

    if (isDemoMode) {
      const { demoPrizes } = await import("@/lib/demo-data")
      
      // Load registered prizes from localStorage
      const registeredPrizes = JSON.parse(localStorage.getItem('demo_registered_prizes') || '[]')
      
      // Combine demo and registered prizes for this business
      const demoPrizesForBusiness = demoPrizes.filter((p) => p.business_id === businessId)
      const registeredPrizesForBusiness = registeredPrizes.filter((p: any) => p.business_id === businessId)
      
      const allPrizes = [...demoPrizesForBusiness, ...registeredPrizesForBusiness]
      setPrizes(allPrizes)
      return
    }

    const { data } = await supabase.from("prizes").select("*").eq("business_id", businessId).order("punches_required")

    setPrizes(data || [])
  }

  const fetchAnalytics = async (businessId: string) => {
    setIsLoading(true)
    try {
      // Check if we're in demo mode
      const isDemoMode =
        process.env.NEXT_PUBLIC_SUPABASE_URL === undefined ||
        process.env.NEXT_PUBLIC_SUPABASE_URL === "https://demo.supabase.co"

      if (isDemoMode) {
        const { demoPunchCards, demoPunches } = await import("@/lib/demo-data")
        
        // Get saved cards from localStorage
        let savedCards: any[] = []
        if (typeof window !== "undefined") {
          savedCards = JSON.parse(localStorage.getItem("demo_punch_cards") || "[]")
        }

        // Merge demo cards with saved cards for this business
        const businessCards = demoPunchCards.filter((c) => c.business_id === businessId)
        const businessSavedCards = savedCards.filter((c) => c.business_id === businessId)
        
        // Calculate demo analytics
        const totalPunches = businessSavedCards.reduce((sum, card) => sum + card.total_punches, 0) + 
                            businessCards.reduce((sum, card) => sum + card.total_punches, 0)
        const activeUsers = Math.max(businessCards.length, businessSavedCards.length)
        const avgPunchesPerUser = activeUsers > 0 ? totalPunches / activeUsers : 0

        setAnalytics({
          totalPunches,
          activeUsers,
          prizesRedeemed: 2, // Demo value
          avgPunchesPerUser: Math.round(avgPunchesPerUser * 10) / 10,
        })

        // Load leaderboard data
        const businessLeaderboardData = getBusinessLeaderboard(businessId)
        const globalLeaderboardData = generateLeaderboardData()
        setBusinessLeaderboard(businessLeaderboardData)
        setGlobalLeaderboard(globalLeaderboardData)

        setIsLoading(false)
        return
      }

      // Real Supabase mode
      // Get total punches
      const { count: totalPunches } = await supabase
        .from("punches")
        .select("*", { count: "exact", head: true })
        .eq("business_id", businessId)

      // Get active users (users with punch cards)
      const { count: activeUsers } = await supabase
        .from("punch_cards")
        .select("*", { count: "exact", head: true })
        .eq("business_id", businessId)

      // Get redeemed prizes
      const { count: prizesRedeemed } = await supabase
        .from("redeemed_prizes")
        .select("*", { count: "exact", head: true })
        .eq("business_id", businessId)

      // Calculate average punches per user
      const { data: punchCards } = await supabase
        .from("punch_cards")
        .select("total_punches")
        .eq("business_id", businessId)

      const avgPunchesPerUser =
        punchCards && punchCards.length > 0
          ? punchCards.reduce((sum, card) => sum + card.total_punches, 0) / punchCards.length
          : 0

      setAnalytics({
        totalPunches: totalPunches || 0,
        activeUsers: activeUsers || 0,
        prizesRedeemed: prizesRedeemed || 0,
        avgPunchesPerUser: Math.round(avgPunchesPerUser * 10) / 10,
      })
    } catch (error) {
      console.error("Error fetching analytics:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const addPrize = async () => {
    if (!selectedBusiness || !newPrize.name) return

    try {
      const { data } = await supabase
        .from("prizes")
        .insert({
          business_id: selectedBusiness.id,
          name: newPrize.name,
          description: newPrize.description,
          punches_required: newPrize.punches_required,
        })
        .select()
        .single()

      if (data) {
        setPrizes([...prizes, data])
        setNewPrize({ name: "", description: "", punches_required: 5 })
      }
    } catch (error) {
      console.error("Error adding prize:", error)
    }
  }

  const togglePrizeStatus = async (prizeId: string, isActive: boolean) => {
    try {
      await supabase.from("prizes").update({ is_active: !isActive }).eq("id", prizeId)

      setPrizes(prizes.map((prize) => (prize.id === prizeId ? { ...prize, is_active: !isActive } : prize)))
    } catch (error) {
      console.error("Error updating prize:", error)
    }
  }

  useEffect(() => {
    fetchBusinesses()
  }, [])

  useEffect(() => {
    if (selectedBusiness) {
      fetchPrizes(selectedBusiness.id)
      fetchAnalytics(selectedBusiness.id)
    }
  }, [selectedBusiness])

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Business Dashboard</h1>
            <p className="text-gray-600">Manage your digital punch card program</p>
          </div>
          <Link href="/">
            <Button variant="outline">Back to Home</Button>
          </Link>
        </div>

        {/* Business Selection */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="h-5 w-5" />
              Select Business
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              {businesses.map((business) => (
                <Card
                  key={business.id}
                  className={`cursor-pointer transition-all ${
                    selectedBusiness?.id === business.id ? "ring-2 ring-blue-500 bg-blue-50" : "hover:shadow-md"
                  }`}
                  onClick={() => setSelectedBusiness(business)}
                >
                  <CardContent className="p-4">
                    <h3 className="font-semibold">{business.name}</h3>
                    <p className="text-sm text-gray-600 mb-2">{business.description}</p>
                    <Badge variant="secondary">{business.max_punches} punch card</Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        {selectedBusiness && (
          <Tabs defaultValue="analytics" className="space-y-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
              <TabsTrigger value="prizes">Manage Prizes</TabsTrigger>
              <TabsTrigger value="nfc">NFC Tags</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="analytics">
              <div className="grid md:grid-cols-4 gap-4 mb-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total Punches</p>
                        <p className="text-2xl font-bold">{analytics?.totalPunches || 0}</p>
                      </div>
                      <TrendingUp className="h-8 w-8 text-blue-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Active Users</p>
                        <p className="text-2xl font-bold">{analytics?.activeUsers || 0}</p>
                      </div>
                      <Users className="h-8 w-8 text-green-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Prizes Redeemed</p>
                        <p className="text-2xl font-bold">{analytics?.prizesRedeemed || 0}</p>
                      </div>
                      <Gift className="h-8 w-8 text-purple-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Avg Punches/User</p>
                        <p className="text-2xl font-bold">{analytics?.avgPunchesPerUser || 0}</p>
                      </div>
                      <TrendingUp className="h-8 w-8 text-orange-500" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>Latest punches and redemptions at {selectedBusiness.name}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-gray-500">
                    <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Detailed analytics coming soon...</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="leaderboard">
              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Trophy className="h-5 w-5 text-blue-600" />
                      Your Business Leaderboard
                    </CardTitle>
                    <CardDescription>Top customers at {selectedBusiness.name}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {businessLeaderboard.length === 0 ? (
                      <div className="text-center py-8">
                        <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600">No leaderboard data available</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {businessLeaderboard.slice(0, 8).map((entry, index) => (
                          <div
                            key={entry.user_id}
                            className={`flex items-center justify-between p-3 rounded-lg border ${
                              index < 3 ? "bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200" : "bg-gray-50 border-gray-200"
                            }`}
                          >
                            <div className="flex items-center gap-3">
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
                                  <span className="font-semibold text-sm">{entry.display_name}</span>
                                  {entry.badge && <span className="text-sm">{entry.badge}</span>}
                                </div>
                                <div className="text-xs text-gray-600">
                                  {entry.total_punches} visits
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-semibold">{entry.total_punches}</div>
                              <div className="text-xs text-gray-500">punches</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-green-600" />
                      Global Leaderboard
                    </CardTitle>
                    <CardDescription>See how your customers rank globally</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {globalLeaderboard.slice(0, 5).map((entry, index) => {
                        const isYourCustomer = businessLeaderboard.some(c => c.user_id === entry.user_id)
                        return (
                          <div
                            key={entry.user_id}
                            className={`flex items-center justify-between p-3 rounded-lg border ${
                              isYourCustomer ? "bg-blue-50 border-blue-200" : "bg-gray-50 border-gray-200"
                            }`}
                          >
                            <div className="flex items-center gap-3">
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
                                  <span className="font-semibold text-sm">{entry.display_name}</span>
                                  {entry.badge && <span className="text-sm">{entry.badge}</span>}
                                  {isYourCustomer && (
                                    <Badge variant="outline" className="text-xs">Your Customer</Badge>
                                  )}
                                </div>
                                <div className="text-xs text-gray-600">
                                  {entry.businesses_visited} businesses
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-semibold">{entry.total_punches}</div>
                              <div className="text-xs text-gray-500">total</div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-800">
                        <strong>Pro Tip:</strong> Your customers highlighted in blue are also active at other businesses. Consider cross-promotions!
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Leaderboard Analytics</CardTitle>
                  <CardDescription>Understand how competition drives customer behavior</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-gray-900">{businessLeaderboard.length}</div>
                      <div className="text-sm text-gray-600">Active Competitors</div>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-gray-900">
                        {businessLeaderboard.length > 0 ? Math.round(businessLeaderboard.reduce((sum, entry) => sum + entry.total_punches, 0) / businessLeaderboard.length) : 0}
                      </div>
                      <div className="text-sm text-gray-600">Avg Visits per Customer</div>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-gray-900">
                        {businessLeaderboard.filter(entry => entry.tier === 'gold' || entry.tier === 'platinum').length}
                      </div>
                      <div className="text-sm text-gray-600">VIP Customers</div>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-gray-900">
                        {globalLeaderboard.filter(entry => businessLeaderboard.some(c => c.user_id === entry.user_id)).length}
                      </div>
                      <div className="text-sm text-gray-600">Multi-Business Customers</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="prizes">
              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      Current Prizes
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="sm">
                            <Plus className="h-4 w-4 mr-2" />
                            Add Prize
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Add New Prize</DialogTitle>
                            <DialogDescription>Create a new reward for your customers</DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="prize-name">Prize Name</Label>
                              <Input
                                id="prize-name"
                                value={newPrize.name}
                                onChange={(e) => setNewPrize({ ...newPrize, name: e.target.value })}
                                placeholder="Free Coffee"
                              />
                            </div>
                            <div>
                              <Label htmlFor="prize-description">Description</Label>
                              <Textarea
                                id="prize-description"
                                value={newPrize.description}
                                onChange={(e) => setNewPrize({ ...newPrize, description: e.target.value })}
                                placeholder="Get any coffee drink on the house"
                              />
                            </div>
                            <div>
                              <Label htmlFor="punches-required">Punches Required</Label>
                              <Input
                                id="punches-required"
                                type="number"
                                min="1"
                                value={newPrize.punches_required}
                                onChange={(e) =>
                                  setNewPrize({ ...newPrize, punches_required: Number.parseInt(e.target.value) })
                                }
                              />
                            </div>
                            <Button onClick={addPrize} className="w-full">
                              Add Prize
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {prizes.map((prize) => (
                      <div
                        key={prize.id}
                        className={`p-3 rounded-lg border ${
                          prize.is_active ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"
                        }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="font-semibold">{prize.name}</h4>
                            <p className="text-sm text-gray-600">{prize.description}</p>
                          </div>
                          <Badge variant={prize.is_active ? "default" : "secondary"}>
                            {prize.punches_required} punches
                          </Badge>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant={prize.is_active ? "destructive" : "default"}
                            onClick={() => togglePrizeStatus(prize.id, prize.is_active)}
                          >
                            {prize.is_active ? "Deactivate" : "Activate"}
                          </Button>
                          <Button size="sm" variant="outline">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Prize Performance</CardTitle>
                    <CardDescription>See which rewards are most popular</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8 text-gray-500">
                      <Gift className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Prize analytics coming soon...</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="nfc">
              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      NFC Tag Information
                    </CardTitle>
                    <CardDescription>Your unique NFC tag details for customer taps</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="font-semibold text-gray-900 text-sm">NFC Tag ID</label>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="bg-gray-100 px-3 py-2 rounded border text-sm font-mono flex-1">
                          {selectedBusiness.nfc_tag_id}
                        </code>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigator.clipboard.writeText(selectedBusiness.nfc_tag_id)}
                        >
                          Copy
                        </Button>
                      </div>
                    </div>

                    <div>
                      <label className="font-semibold text-gray-900 text-sm">Customer Tap URL</label>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="bg-gray-100 px-3 py-2 rounded border text-sm font-mono flex-1 break-all">
                          {`${window.location.origin}/tap?nfc=${selectedBusiness.nfc_tag_id}`}
                        </code>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigator.clipboard.writeText(`${window.location.origin}/tap?nfc=${selectedBusiness.nfc_tag_id}`)}
                        >
                          Copy
                        </Button>
                      </div>
                    </div>

                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-blue-900 mb-2">How it works:</h4>
                      <ol className="list-decimal list-inside text-sm text-blue-800 space-y-1">
                        <li>Program NFC tags with your unique URL</li>
                        <li>Place tags where customers can easily tap</li>
                        <li>When customers tap, they're redirected to your punch card</li>
                        <li>Track all activity in your analytics dashboard</li>
                      </ol>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>NFC Tag Resources</CardTitle>
                    <CardDescription>Everything you need to get your tags working</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <Button 
                        variant="outline" 
                        className="w-full justify-start"
                        onClick={() => window.open(`/tap?nfc=${selectedBusiness.nfc_tag_id}`, '_blank')}
                      >
                        <Gift className="h-4 w-4 mr-2" />
                        Test Customer Experience
                      </Button>
                      
                      <Button 
                        variant="outline" 
                        className="w-full justify-start"
                        disabled
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Download NFC Labels (Coming Soon)
                      </Button>
                      
                      <Button 
                        variant="outline" 
                        className="w-full justify-start"
                        disabled
                      >
                        <Gift className="h-4 w-4 mr-2" />
                        Order Physical Tags (Coming Soon)
                      </Button>
                    </div>

                    <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                      <h4 className="font-semibold text-amber-900 mb-2">Need NFC Tags?</h4>
                      <p className="text-sm text-amber-800 mb-2">
                        We recommend NTAG216 chips for best compatibility.
                      </p>
                      <p className="text-xs text-amber-700">
                        You can order them online and program them with any NFC writing app using your URL above.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Tag Placement Guide</CardTitle>
                  <CardDescription>Best practices for placing your NFC tags</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-6">
                    <div>
                      <h4 className="font-semibold text-green-900 mb-2 flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        Recommended Locations
                      </h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>• Point of sale counter</li>
                        <li>• Table tents (restaurants)</li>
                        <li>• Near entrance/exit</li>
                        <li>• Waiting areas</li>
                        <li>• Product displays</li>
                      </ul>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold text-red-900 mb-2">Avoid These Areas</h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>• Behind metal objects</li>
                        <li>• Near other electronics</li>
                        <li>• Hard to reach locations</li>
                        <li>• Areas that get wet</li>
                        <li>• High-traffic damage zones</li>
                      </ul>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold text-blue-900 mb-2">Pro Tips</h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>• Use clear "Tap Here" signage</li>
                        <li>• Place at comfortable height</li>
                        <li>• Test tap sensitivity</li>
                        <li>• Use multiple tags per location</li>
                        <li>• Monitor tag performance</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="settings">
              <Card>
                <CardHeader>
                  <CardTitle>Business Settings</CardTitle>
                  <CardDescription>Configure your punch card program</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="business-name">Business Name</Label>
                    <Input id="business-name" value={selectedBusiness.name} readOnly />
                  </div>
                  <div>
                    <Label htmlFor="business-description">Description</Label>
                    <Textarea id="business-description" value={selectedBusiness.description || ""} readOnly />
                  </div>
                  <div>
                    <Label htmlFor="max-punches">Maximum Punches</Label>
                    <Input id="max-punches" type="number" value={selectedBusiness.max_punches} readOnly />
                  </div>
                  <div>
                    <Label htmlFor="nfc-tag">NFC Tag ID</Label>
                    <Input id="nfc-tag" value={selectedBusiness.nfc_tag_id || ""} readOnly />
                  </div>
                  <Button disabled>Save Changes (Demo Mode)</Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  )
}
