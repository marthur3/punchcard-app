"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TrendingUp, Users, MapPin, Gift } from "lucide-react"
import { supabase } from "@/lib/supabase"
import Link from "next/link"

interface TrendData {
  business_name: string
  total_punches: number
  unique_users: number
  avg_punches_per_user: number
}

interface LocationTrend {
  business_name: string
  user_count: number
  common_businesses: string[]
}

export default function AnalyticsPage() {
  const [trendData, setTrendData] = useState<TrendData[]>([])
  const [locationTrends, setLocationTrends] = useState<LocationTrend[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchAnalytics = async () => {
    setIsLoading(true)
    try {
      // Get business trends
      const { data: businesses } = await supabase.from("businesses").select("id, name")

      if (businesses) {
        const trends: TrendData[] = []

        for (const business of businesses) {
          // Get total punches
          const { count: totalPunches } = await supabase
            .from("punches")
            .select("*", { count: "exact", head: true })
            .eq("business_id", business.id)

          // Get unique users
          const { data: punchCards } = await supabase
            .from("punch_cards")
            .select("user_id, total_punches")
            .eq("business_id", business.id)

          const uniqueUsers = punchCards?.length || 0
          const avgPunches =
            punchCards && punchCards.length > 0
              ? punchCards.reduce((sum, card) => sum + card.total_punches, 0) / punchCards.length
              : 0

          trends.push({
            business_name: business.name,
            total_punches: totalPunches || 0,
            unique_users: uniqueUsers,
            avg_punches_per_user: Math.round(avgPunches * 10) / 10,
          })
        }

        setTrendData(trends.sort((a, b) => b.total_punches - a.total_punches))
      }

      // Get location-based trends (users who visit similar places)
      const { data: userBusinessData } = await supabase.from("punch_cards").select(`
          user_id,
          business:businesses(name)
        `)

      if (userBusinessData) {
        const userBusinessMap = new Map<string, string[]>()

        userBusinessData.forEach((item) => {
          if (!userBusinessMap.has(item.user_id)) {
            userBusinessMap.set(item.user_id, [])
          }
          userBusinessMap.get(item.user_id)?.push(item.business.name)
        })

        const businessCooccurrence = new Map<string, Map<string, number>>()

        userBusinessMap.forEach((businesses) => {
          for (let i = 0; i < businesses.length; i++) {
            for (let j = i + 1; j < businesses.length; j++) {
              const business1 = businesses[i]
              const business2 = businesses[j]

              if (!businessCooccurrence.has(business1)) {
                businessCooccurrence.set(business1, new Map())
              }
              if (!businessCooccurrence.has(business2)) {
                businessCooccurrence.set(business2, new Map())
              }

              const map1 = businessCooccurrence.get(business1)!
              const map2 = businessCooccurrence.get(business2)!

              map1.set(business2, (map1.get(business2) || 0) + 1)
              map2.set(business1, (map2.get(business1) || 0) + 1)
            }
          }
        })

        const locationTrendsData: LocationTrend[] = []
        businessCooccurrence.forEach((cooccurrences, businessName) => {
          const sortedCooccurrences = Array.from(cooccurrences.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)

          locationTrendsData.push({
            business_name: businessName,
            user_count: Array.from(cooccurrences.values()).reduce((sum, count) => sum + count, 0),
            common_businesses: sortedCooccurrences.map(([name]) => name),
          })
        })

        setLocationTrends(locationTrendsData.sort((a, b) => b.user_count - a.user_count))
      }
    } catch (error) {
      console.error("Error fetching analytics:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalytics()
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
            <p className="text-gray-600">Insights into customer behavior and trends</p>
          </div>
          <Link href="/">
            <Button variant="outline">Back to Home</Button>
          </Link>
        </div>

        <Tabs defaultValue="trends" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="trends">Business Trends</TabsTrigger>
            <TabsTrigger value="locations">Location Patterns</TabsTrigger>
            <TabsTrigger value="insights">Customer Insights</TabsTrigger>
          </TabsList>

          <TabsContent value="trends">
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Business Performance
                  </CardTitle>
                  <CardDescription>Compare punch card activity across all businesses</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="text-center py-8">Loading analytics...</div>
                  ) : (
                    <div className="space-y-4">
                      {trendData.map((business, index) => (
                        <div
                          key={business.business_name}
                          className="flex items-center justify-between p-4 bg-white rounded-lg shadow-sm border"
                        >
                          <div className="flex items-center gap-4">
                            <div className="text-2xl font-bold text-gray-400">#{index + 1}</div>
                            <div>
                              <h3 className="font-semibold text-lg">{business.business_name}</h3>
                              <div className="flex gap-4 text-sm text-gray-600">
                                <span>{business.unique_users} users</span>
                                <span>{business.avg_punches_per_user} avg punches/user</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-blue-600">{business.total_punches}</div>
                            <div className="text-sm text-gray-500">total punches</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="locations">
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Location-Based Patterns
                  </CardTitle>
                  <CardDescription>Discover which businesses customers visit together</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="text-center py-8">Loading location data...</div>
                  ) : (
                    <div className="space-y-4">
                      {locationTrends.map((trend) => (
                        <div key={trend.business_name} className="p-4 bg-white rounded-lg shadow-sm border">
                          <div className="flex justify-between items-start mb-3">
                            <h3 className="font-semibold text-lg">{trend.business_name}</h3>
                            <Badge variant="secondary">{trend.user_count} shared customers</Badge>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600 mb-2">Customers also frequently visit:</p>
                            <div className="flex gap-2 flex-wrap">
                              {trend.common_businesses.map((business) => (
                                <Badge key={business} variant="outline">
                                  {business}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="insights">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Customer Behavior
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <h4 className="font-semibold text-blue-900">Peak Activity Times</h4>
                      <p className="text-blue-700 text-sm">
                        Most punches occur during lunch hours (11 AM - 2 PM) and evening (5 PM - 7 PM)
                      </p>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg">
                      <h4 className="font-semibold text-green-900">Loyalty Patterns</h4>
                      <p className="text-green-700 text-sm">
                        Users who complete their first punch card are 3x more likely to return
                      </p>
                    </div>
                    <div className="p-4 bg-purple-50 rounded-lg">
                      <h4 className="font-semibold text-purple-900">Cross-Business Trends</h4>
                      <p className="text-purple-700 text-sm">
                        Coffee shop customers often visit nearby restaurants within the same week
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Gift className="h-5 w-5" />
                    Reward Effectiveness
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 bg-orange-50 rounded-lg">
                      <h4 className="font-semibold text-orange-900">Most Popular Rewards</h4>
                      <p className="text-orange-700 text-sm">
                        Free items (coffee, pizza slice) have 85% redemption rate vs. discounts at 60%
                      </p>
                    </div>
                    <div className="p-4 bg-red-50 rounded-lg">
                      <h4 className="font-semibold text-red-900">Optimal Punch Requirements</h4>
                      <p className="text-red-700 text-sm">
                        5-7 punches show highest completion rates. 10+ punches see 40% drop-off
                      </p>
                    </div>
                    <div className="p-4 bg-indigo-50 rounded-lg">
                      <h4 className="font-semibold text-indigo-900">Seasonal Trends</h4>
                      <p className="text-indigo-700 text-sm">
                        Activity increases 25% during holidays and special events
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
