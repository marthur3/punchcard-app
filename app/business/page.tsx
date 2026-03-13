"use client"

import { useState, useEffect, useRef } from "react"
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
import { Store, Gift, Users, TrendingUp, Plus, Edit, CheckCircle, LogOut, RefreshCw, Search, Phone, Mail, Award } from "lucide-react"
import { isDemoMode } from "@/lib/supabase"
import {
  getAllBusinesses,
  getAllPrizes,
  getAdminSession,
  getRegisteredPrizes,
  saveRegisteredPrizes,
} from "@/lib/demo-store"
import Link from "next/link"
import { useRouter } from "next/navigation"

interface LeaderboardEntry {
  rank: number
  user_id: string
  display_name: string
  total_punches: number
  tier: string
  badge?: string
  businesses_visited?: number
}

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

interface Customer {
  id: string
  name: string
  email: string
  phone: string | null
  current_punches: number
  total_punches: number
  prizes_redeemed: number
  last_visit: string
  joined_at: string
  punch_card_id: string
}

export default function BusinessDashboard() {
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null)
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [prizes, setPrizes] = useState<Prize[]>([])
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [businessLeaderboard, setBusinessLeaderboard] = useState<LeaderboardEntry[]>([])
  const [globalLeaderboard, setGlobalLeaderboard] = useState<LeaderboardEntry[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [customerSearch, setCustomerSearch] = useState("")
  const [customersLoading, setCustomersLoading] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [newPrize, setNewPrize] = useState({
    name: "",
    description: "",
    punches_required: 5,
  })
  const [editingPrize, setEditingPrize] = useState<Prize | null>(null)
  const [editPrizeData, setEditPrizeData] = useState({ name: "", description: "", punches_required: 5 })
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [activeTab, setActiveTab] = useState("analytics")
  const pollingRef = useRef<NodeJS.Timeout | null>(null)
  const router = useRouter()

  const fetchBusinesses = async () => {
    if (isDemoMode) {
      const allBusinesses = await getAllBusinesses()
      setBusinesses(allBusinesses)

      const adminSession = getAdminSession()
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

    try {
      const res = await fetch("/api/businesses")
      if (res.ok) {
        const data = await res.json()
        const bizList = data.businesses || []
        setBusinesses(bizList)
        if (bizList.length > 0 && !selectedBusiness) {
          setSelectedBusiness(bizList[0])
        }
      }
    } catch (error) {
      console.error("Error fetching businesses:", error)
    }
  }

  const fetchPrizes = async (businessId: string) => {
    if (isDemoMode) {
      const allPrizes = await getAllPrizes()
      setPrizes(allPrizes
        .filter((p) => p.business_id === businessId)
        .map((p) => ({ ...p, is_active: p.is_active ?? true }))
      )
      return
    }

    try {
      const res = await fetch(`/api/prizes?business_id=${businessId}`)
      if (res.ok) {
        const data = await res.json()
        setPrizes(data.prizes || [])
      }
    } catch (error) {
      console.error("Error fetching prizes:", error)
    }
  }

  const fetchAnalytics = async (businessId: string) => {
    setIsLoading(true)
    try {
      if (isDemoMode) {
        const { demoPunchCards, getBusinessLeaderboard, generateLeaderboardData } = await import("@/lib/demo-data")

        let savedCards: any[] = []
        if (typeof window !== "undefined") {
          savedCards = JSON.parse(localStorage.getItem("demo_punch_cards") || "[]")
        }

        const businessCards = demoPunchCards.filter((c) => c.business_id === businessId)
        const businessSavedCards = savedCards.filter((c: any) => c.business_id === businessId)

        const totalPunches = businessSavedCards.reduce((sum: number, card: any) => sum + card.total_punches, 0) +
                            businessCards.reduce((sum, card) => sum + card.total_punches, 0)
        const activeUsers = Math.max(businessCards.length, businessSavedCards.length)
        const avgPunchesPerUser = activeUsers > 0 ? totalPunches / activeUsers : 0

        const redeemedPrizes = JSON.parse(localStorage.getItem("demo_redeemed_prizes") || "[]")
        const businessRedeemed = redeemedPrizes.filter((r: any) => r.business_id === businessId)

        setAnalytics({
          totalPunches,
          activeUsers,
          prizesRedeemed: businessRedeemed.length,
          avgPunchesPerUser: Math.round(avgPunchesPerUser * 10) / 10,
        })

        setBusinessLeaderboard(getBusinessLeaderboard(businessId))
        setGlobalLeaderboard(generateLeaderboardData())
      } else {
        // Real mode: fetch from API
        const [analyticsRes, bizLeaderboardRes, globalLeaderboardRes] = await Promise.all([
          fetch("/api/business/analytics"),
          fetch(`/api/leaderboard?business_id=${businessId}&limit=10`),
          fetch("/api/leaderboard?limit=10"),
        ])

        if (analyticsRes.ok) {
          const data = await analyticsRes.json()
          setAnalytics({
            totalPunches: data.total_punches,
            activeUsers: data.active_users,
            prizesRedeemed: data.prizes_redeemed,
            avgPunchesPerUser: data.avg_punches_per_user,
          })
        }

        if (bizLeaderboardRes.ok) {
          const data = await bizLeaderboardRes.json()
          setBusinessLeaderboard(data.leaderboard || [])
        }

        if (globalLeaderboardRes.ok) {
          const data = await globalLeaderboardRes.json()
          setGlobalLeaderboard(data.leaderboard || [])
        }
      }
      setLastUpdated(new Date())
    } catch (error) {
      console.error("Error fetching analytics:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchCustomers = async (businessId: string) => {
    setCustomersLoading(true)
    try {
      if (isDemoMode) {
        const { demoUsers, demoPunchCards, demoPunches } = await import("@/lib/demo-data")
        const businessCards = demoPunchCards.filter((c) => c.business_id === businessId)
        const built: Customer[] = businessCards.map((card) => {
          const user = demoUsers.find((u) => u.id === card.user_id)
          const userPunches = demoPunches
            .filter((p) => p.user_id === card.user_id && p.business_id === businessId)
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          return {
            id: user?.id || card.user_id,
            name: user?.name || "Unknown",
            email: user?.email || "",
            phone: user?.phone || null,
            current_punches: card.current_punches,
            total_punches: card.total_punches,
            prizes_redeemed: 0,
            last_visit: userPunches[0]?.created_at || card.updated_at,
            joined_at: card.created_at,
            punch_card_id: card.id,
          }
        })
        built.sort((a, b) => b.total_punches - a.total_punches)
        setCustomers(built)
        return
      }

      const res = await fetch("/api/business/customers")
      if (res.ok) {
        const data = await res.json()
        setCustomers(data.customers || [])
      }
    } catch (error) {
      console.error("Error fetching customers:", error)
    } finally {
      setCustomersLoading(false)
    }
  }

  const addPrize = async () => {
    if (!selectedBusiness || !newPrize.name) return

    try {
      if (isDemoMode) {
        const prize = {
          id: `prize-${Date.now()}`,
          business_id: selectedBusiness.id,
          name: newPrize.name,
          description: newPrize.description,
          punches_required: newPrize.punches_required,
          is_active: true,
        }
        const regPrizes = getRegisteredPrizes()
        regPrizes.push(prize)
        saveRegisteredPrizes(regPrizes)
        setPrizes([...prizes, prize])
      } else {
        const res = await fetch("/api/business/prizes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            business_id: selectedBusiness.id,
            name: newPrize.name,
            description: newPrize.description,
            punches_required: newPrize.punches_required,
          }),
        })

        if (res.ok) {
          const data = await res.json()
          if (data.prize) {
            setPrizes([...prizes, data.prize])
          }
        }
      }

      setNewPrize({ name: "", description: "", punches_required: 5 })
    } catch (error) {
      console.error("Error adding prize:", error)
    }
  }

  const togglePrizeStatus = async (prizeId: string, isActive: boolean) => {
    try {
      if (isDemoMode) {
        setPrizes(prizes.map((prize) => (prize.id === prizeId ? { ...prize, is_active: !isActive } : prize)))
      } else {
        const res = await fetch("/api/business/prizes", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: prizeId, is_active: !isActive }),
        })
        if (res.ok) {
          setPrizes(prizes.map((prize) => (prize.id === prizeId ? { ...prize, is_active: !isActive } : prize)))
        }
      }
    } catch (error) {
      console.error("Error updating prize:", error)
    }
  }

  const handleAdminLogout = async () => {
    try {
      await fetch("/api/auth/admin-logout", { method: "POST" })
    } catch {}
    if (isDemoMode) {
      localStorage.removeItem("business_admin_session")
    }
    router.push("/business/login")
  }

  useEffect(() => {
    // Auth check: if demo mode and no admin session, redirect to login
    if (isDemoMode) {
      const session = localStorage.getItem("business_admin_session")
      if (!session) {
        router.push("/business/login")
        return
      }
    }
    fetchBusinesses()
  }, [])

  useEffect(() => {
    if (selectedBusiness) {
      fetchPrizes(selectedBusiness.id)
      fetchAnalytics(selectedBusiness.id)
      fetchCustomers(selectedBusiness.id)
    }
  }, [selectedBusiness])

  // 30-second polling when analytics tab is active
  useEffect(() => {
    if (activeTab === "analytics" && selectedBusiness) {
      pollingRef.current = setInterval(() => {
        fetchAnalytics(selectedBusiness.id)
      }, 30000)
    }
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [activeTab, selectedBusiness])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Business Dashboard</h1>
            <p className="text-gray-600">Manage your digital punch card program</p>
          </div>
          <div className="flex gap-3">
            <Link href="/">
              <Button variant="outline">Back to Home</Button>
            </Link>
            <Button variant="outline" onClick={handleAdminLogout} className="text-red-700 border-red-300 hover:bg-red-50">
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
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
          <Tabs defaultValue="analytics" className="space-y-6" onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="customers">Customers</TabsTrigger>
              <TabsTrigger value="prizes">Prizes</TabsTrigger>
              <TabsTrigger value="nfc">NFC Tags</TabsTrigger>
            </TabsList>

            <TabsContent value="analytics">
              <div className="flex justify-between items-center mb-4">
                <div className="text-sm text-gray-500">
                  {lastUpdated && `Last updated: ${lastUpdated.toLocaleTimeString()}`}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => selectedBusiness && fetchAnalytics(selectedBusiness.id)}
                  disabled={isLoading}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
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

            </TabsContent>

            <TabsContent value="customers">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-blue-600" />
                        Customer List
                      </CardTitle>
                      <CardDescription>
                        {customers.length} members at {selectedBusiness.name}
                      </CardDescription>
                    </div>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search customers..."
                        value={customerSearch}
                        onChange={(e) => setCustomerSearch(e.target.value)}
                        className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-56"
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {customersLoading ? (
                    <div className="flex justify-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
                    </div>
                  ) : customers.length === 0 ? (
                    <div className="text-center py-12">
                      <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500 font-medium">No customers yet</p>
                      <p className="text-sm text-gray-400 mt-1">Customers will appear here after their first tap.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {customers
                        .filter((c) => {
                          const q = customerSearch.toLowerCase()
                          return (
                            !q ||
                            c.name?.toLowerCase().includes(q) ||
                            c.email?.toLowerCase().includes(q) ||
                            c.phone?.includes(q)
                          )
                        })
                        .map((customer, index) => {
                          const lastVisitDate = new Date(customer.last_visit)
                          const daysSince = Math.floor((Date.now() - lastVisitDate.getTime()) / (1000 * 60 * 60 * 24))
                          const isVIP = customer.total_punches >= 20
                          const isAtRisk = daysSince > 14

                          return (
                            <div
                              key={customer.id}
                              className="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors"
                            >
                              <div className="flex items-center gap-4">
                                {/* Rank / Avatar */}
                                <div
                                  className="flex items-center justify-center w-9 h-9 rounded-full text-sm font-bold text-white flex-shrink-0"
                                  style={{ background: index === 0 ? '#f59e0b' : index === 1 ? '#9ca3af' : index === 2 ? '#b45309' : '#e5e7eb', color: index < 3 ? '#fff' : '#6b7280' }}
                                >
                                  {index + 1}
                                </div>

                                {/* Info */}
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-sm text-gray-900">{customer.name}</span>
                                    {isVIP && (
                                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-700">
                                        <Award className="h-2.5 w-2.5" /> VIP
                                      </span>
                                    )}
                                    {isAtRisk && (
                                      <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-100 text-red-700">
                                        At Risk
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-3 mt-0.5">
                                    {customer.email && (
                                      <span className="flex items-center gap-1 text-xs text-gray-500">
                                        <Mail className="h-3 w-3" />
                                        {customer.email}
                                      </span>
                                    )}
                                    {customer.phone && (
                                      <span className="flex items-center gap-1 text-xs text-gray-500">
                                        <Phone className="h-3 w-3" />
                                        {customer.phone}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Stats */}
                              <div className="flex items-center gap-6 text-right">
                                <div>
                                  <div className="text-sm font-bold text-gray-900">{customer.current_punches}/{selectedBusiness.max_punches}</div>
                                  <div className="text-[10px] text-gray-400 uppercase tracking-wide">Current</div>
                                </div>
                                <div>
                                  <div className="text-sm font-bold text-gray-900">{customer.total_punches}</div>
                                  <div className="text-[10px] text-gray-400 uppercase tracking-wide">Lifetime</div>
                                </div>
                                <div>
                                  <div className="text-sm font-medium text-gray-700">
                                    {daysSince === 0 ? 'Today' : daysSince === 1 ? 'Yesterday' : `${daysSince}d ago`}
                                  </div>
                                  <div className="text-[10px] text-gray-400 uppercase tracking-wide">Last Visit</div>
                                </div>
                                {customer.prizes_redeemed > 0 && (
                                  <div>
                                    <div className="text-sm font-bold text-emerald-600">{customer.prizes_redeemed}</div>
                                    <div className="text-[10px] text-gray-400 uppercase tracking-wide">Redeemed</div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )
                        })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Summary stats */}
              {customers.length > 0 && (
                <div className="grid grid-cols-3 gap-4 mt-4">
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-gray-900">{customers.filter(c => c.total_punches >= 20).length}</div>
                      <div className="text-sm text-gray-500">VIP Members</div>
                      <div className="text-xs text-gray-400">20+ lifetime visits</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-red-500">
                        {customers.filter(c => {
                          const days = Math.floor((Date.now() - new Date(c.last_visit).getTime()) / (1000 * 60 * 60 * 24))
                          return days > 14
                        }).length}
                      </div>
                      <div className="text-sm text-gray-500">At Risk</div>
                      <div className="text-xs text-gray-400">No visit in 14+ days</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {customers.length > 0
                          ? Math.round(customers.reduce((s, c) => s + c.total_punches, 0) / customers.length)
                          : 0}
                      </div>
                      <div className="text-sm text-gray-500">Avg Visits</div>
                      <div className="text-xs text-gray-400">per member</div>
                    </CardContent>
                  </Card>
                </div>
              )}
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
                          <Button size="sm" variant="outline" onClick={() => {
                            setEditingPrize(prize)
                            setEditPrizeData({ name: prize.name, description: prize.description, punches_required: prize.punches_required })
                          }}>
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Edit Prize Dialog */}
                <Dialog open={!!editingPrize} onOpenChange={(open) => { if (!open) setEditingPrize(null) }}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Edit Prize</DialogTitle>
                      <DialogDescription>Update this reward</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="edit-prize-name">Prize Name</Label>
                        <Input
                          id="edit-prize-name"
                          value={editPrizeData.name}
                          onChange={(e) => setEditPrizeData({ ...editPrizeData, name: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="edit-prize-description">Description</Label>
                        <Textarea
                          id="edit-prize-description"
                          value={editPrizeData.description}
                          onChange={(e) => setEditPrizeData({ ...editPrizeData, description: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="edit-punches-required">Punches Required</Label>
                        <Input
                          id="edit-punches-required"
                          type="number"
                          min="1"
                          value={editPrizeData.punches_required}
                          onChange={(e) => setEditPrizeData({ ...editPrizeData, punches_required: Number.parseInt(e.target.value) })}
                        />
                      </div>
                      <Button onClick={async () => {
                        if (!editingPrize) return
                        const updated = { ...editingPrize, ...editPrizeData }
                        if (isDemoMode) {
                          const regPrizes = getRegisteredPrizes()
                          const idx = regPrizes.findIndex((p) => p.id === editingPrize.id)
                          if (idx >= 0) {
                            regPrizes[idx] = { ...regPrizes[idx], ...editPrizeData }
                            saveRegisteredPrizes(regPrizes)
                          }
                        } else {
                          await fetch("/api/business/prizes", {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ id: editingPrize.id, ...editPrizeData }),
                          })
                        }
                        setPrizes(prizes.map(p => p.id === editingPrize.id ? updated : p))
                        setEditingPrize(null)
                      }} className="w-full">
                        Save Changes
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
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

          </Tabs>
        )}
      </div>
    </div>
  )
}
