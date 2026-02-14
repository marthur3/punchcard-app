"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Store, Plus, Copy, QrCode, ExternalLink, Gift, Check } from "lucide-react"
import { useAuth } from "@/lib/auth-context"

interface Business {
  id: string
  name: string
  description: string | null
  nfc_tag_id: string | null
  max_punches: number
  created_at: string
}

export default function AdminPage() {
  const { user } = useAuth()
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [copiedId, setCopiedId] = useState("")

  // New business form
  const [newBusiness, setNewBusiness] = useState({
    name: "",
    description: "",
    max_punches: 10,
  })
  const [isCreating, setIsCreating] = useState(false)

  // New prize form (for adding to created business)
  const [prizeBusiness, setPrizeBusiness] = useState<string | null>(null)
  const [newPrize, setNewPrize] = useState({
    name: "",
    description: "",
    punches_required: 10,
  })

  const fetchBusinesses = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/businesses")
      if (res.ok) {
        const data = await res.json()
        setBusinesses(data.businesses || [])
      } else if (res.status === 403) {
        setError("You don't have admin access")
      }
    } catch {
      setError("Failed to load businesses")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchBusinesses()
  }, [fetchBusinesses])

  const createBusiness = async () => {
    if (!newBusiness.name.trim()) return

    setIsCreating(true)
    setError("")
    setSuccess("")

    try {
      const res = await fetch("/api/admin/businesses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newBusiness),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Failed to create business")
        return
      }

      setSuccess(`Created "${data.business.name}" with NFC tag: ${data.business.nfc_tag_id}`)
      setBusinesses([data.business, ...businesses])
      setNewBusiness({ name: "", description: "", max_punches: 10 })

      // Open prize form for this business
      setPrizeBusiness(data.business.id)
      setNewPrize({
        name: "",
        description: "",
        punches_required: data.business.max_punches,
      })
    } catch {
      setError("Failed to create business")
    } finally {
      setIsCreating(false)
    }
  }

  const createPrize = async () => {
    if (!prizeBusiness || !newPrize.name.trim()) return

    try {
      const res = await fetch("/api/admin/prizes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_id: prizeBusiness,
          ...newPrize,
        }),
      })

      if (res.ok) {
        setSuccess("Prize created successfully!")
        setPrizeBusiness(null)
        setNewPrize({ name: "", description: "", punches_required: 10 })
      }
    } catch {
      setError("Failed to create prize")
    }
  }

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(""), 2000)
  }

  const getBaseUrl = () => {
    if (typeof window !== "undefined") {
      return window.location.origin
    }
    return ""
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Panel</h1>
          <p className="text-gray-600">Set up businesses and manage the platform</p>
          {user && (
            <Badge variant="outline" className="mt-2">
              Logged in as {user.email}
            </Badge>
          )}
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-6 border-green-200 bg-green-50">
            <Check className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        {/* Quick Create Business */}
        <Card className="mb-8 border-2 border-blue-200 bg-blue-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-blue-600" />
              Quick Create Business
            </CardTitle>
            <CardDescription>Set up a new business in under 60 seconds</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <Label htmlFor="biz-name">Business Name *</Label>
                  <Input
                    id="biz-name"
                    value={newBusiness.name}
                    onChange={(e) => setNewBusiness({ ...newBusiness, name: e.target.value })}
                    placeholder="Coffee Corner"
                  />
                </div>
                <div>
                  <Label htmlFor="biz-desc">Description</Label>
                  <Textarea
                    id="biz-desc"
                    value={newBusiness.description}
                    onChange={(e) => setNewBusiness({ ...newBusiness, description: e.target.value })}
                    placeholder="Local coffee shop on Main Street"
                    rows={2}
                  />
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="max-punches">Punches for Reward</Label>
                  <Input
                    id="max-punches"
                    type="number"
                    min={1}
                    max={50}
                    value={newBusiness.max_punches}
                    onChange={(e) => setNewBusiness({ ...newBusiness, max_punches: parseInt(e.target.value) || 10 })}
                  />
                  <p className="text-xs text-gray-500 mt-1">How many punches until a free reward?</p>
                </div>
                <Button
                  onClick={createBusiness}
                  disabled={isCreating || !newBusiness.name.trim()}
                  className="w-full mt-4 bg-blue-600 hover:bg-blue-700"
                >
                  {isCreating ? "Creating..." : "Create Business"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Add Prize Modal-like section */}
        {prizeBusiness && (
          <Card className="mb-8 border-2 border-emerald-200 bg-emerald-50/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gift className="h-5 w-5 text-emerald-600" />
                Add Reward for This Business
              </CardTitle>
              <CardDescription>What do customers get after completing their card?</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <Label>Reward Name *</Label>
                  <Input
                    value={newPrize.name}
                    onChange={(e) => setNewPrize({ ...newPrize, name: e.target.value })}
                    placeholder="Free Coffee"
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Input
                    value={newPrize.description}
                    onChange={(e) => setNewPrize({ ...newPrize, description: e.target.value })}
                    placeholder="Any drink, any size"
                  />
                </div>
                <div>
                  <Label>Punches Required</Label>
                  <Input
                    type="number"
                    value={newPrize.punches_required}
                    onChange={(e) => setNewPrize({ ...newPrize, punches_required: parseInt(e.target.value) || 10 })}
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button onClick={createPrize} className="bg-emerald-600 hover:bg-emerald-700">
                  Add Reward
                </Button>
                <Button variant="outline" onClick={() => setPrizeBusiness(null)}>
                  Skip
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Existing Businesses */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="h-5 w-5" />
              All Businesses ({businesses.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            ) : businesses.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Store className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No businesses yet. Create your first one above!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {businesses.map((biz) => (
                  <div key={biz.id} className="p-4 border rounded-lg bg-white">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold text-lg">{biz.name}</h3>
                        {biz.description && <p className="text-sm text-gray-600">{biz.description}</p>}
                      </div>
                      <Badge>{biz.max_punches} punches</Badge>
                    </div>

                    {biz.nfc_tag_id && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono flex-1 overflow-hidden">
                            {biz.nfc_tag_id}
                          </code>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyToClipboard(biz.nfc_tag_id!, `nfc-${biz.id}`)}
                          >
                            {copiedId === `nfc-${biz.id}` ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                          </Button>
                        </div>

                        <div className="flex items-center gap-2">
                          <code className="text-xs bg-blue-50 px-2 py-1 rounded font-mono flex-1 overflow-hidden text-blue-700">
                            {getBaseUrl()}/tap?nfc={biz.nfc_tag_id}
                          </code>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyToClipboard(`${getBaseUrl()}/tap?nfc=${biz.nfc_tag_id}`, `url-${biz.id}`)}
                          >
                            {copiedId === `url-${biz.id}` ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(`/tap?nfc=${biz.nfc_tag_id}`, '_blank')}
                          >
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        </div>

                        <div className="flex gap-2 mt-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setPrizeBusiness(biz.id)
                              setNewPrize({ name: "", description: "", punches_required: biz.max_punches })
                            }}
                          >
                            <Gift className="h-3 w-3 mr-1" />
                            Add Reward
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
