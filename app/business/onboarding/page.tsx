"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  CheckCircle, 
  Wifi, 
  QrCode, 
  Smartphone, 
  Store, 
  Gift, 
  BarChart3, 
  ArrowRight,
  ArrowLeft,
  Download,
  Printer,
  Copy,
  ExternalLink,
  PlayCircle
} from "lucide-react"
import Link from "next/link"

export default function BusinessOnboardingPage() {
  const [currentStep, setCurrentStep] = useState(1)
  const [businessData, setBusinessData] = useState<any>(null)
  const [nfcTagId, setNfcTagId] = useState<string>('')
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set())
  const router = useRouter()
  const searchParams = useSearchParams()

  const totalSteps = 6
  const progress = (completedSteps.size / totalSteps) * 100

  useEffect(() => {
    const businessId = searchParams?.get('business_id')
    const nfcTag = searchParams?.get('nfc_tag')
    
    if (nfcTag) {
      setNfcTagId(nfcTag)
    }

    if (businessId) {
      // Load business data from localStorage (demo mode)
      const businesses = JSON.parse(localStorage.getItem('demo_registered_businesses') || '[]')
      const business = businesses.find((b: any) => b.id === businessId)
      if (business) {
        setBusinessData(business)
      }
    }
  }, [searchParams])

  const markStepComplete = (step: number) => {
    setCompletedSteps(prev => new Set([...prev, step]))
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const generateNfcUrl = () => {
    const baseUrl = window.location.origin
    return `${baseUrl}/tap?nfc=${nfcTagId}`
  }

  const downloadNfcLabel = () => {
    // Create SVG for NFC label
    const svg = `
      <svg width="300" height="200" xmlns="http://www.w3.org/2000/svg">
        <rect width="300" height="200" fill="#f8fafc" stroke="#e2e8f0" stroke-width="2" rx="8"/>
        <text x="150" y="40" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="#1e293b">
          ${businessData?.name || 'Business Name'}
        </text>
        <circle cx="150" cy="80" r="25" fill="#3b82f6" opacity="0.1"/>
        <path d="M135 70 Q150 60 165 70 Q150 90 135 70" fill="#3b82f6"/>
        <text x="150" y="120" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" fill="#64748b">
          Tap your phone here
        </text>
        <text x="150" y="140" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" fill="#64748b">
          to get punched!
        </text>
        <text x="150" y="170" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" fill="#94a3b8">
          ${nfcTagId}
        </text>
      </svg>
    `
    
    const blob = new Blob([svg], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${businessData?.name || 'business'}-nfc-label.svg`
    a.click()
    URL.revokeObjectURL(url)
  }

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="text-center space-y-6">
            <div className="flex items-center justify-center">
              <CheckCircle className="h-16 w-16 text-green-500" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Welcome to TapRanked!
              </h2>
              <p className="text-lg text-gray-600 mb-6">
                Your account has been created successfully. Let's get your digital loyalty program up and running.
              </p>
              {businessData && (
                <Card className="max-w-md mx-auto bg-blue-50 border-blue-200">
                  <CardContent className="p-4">
                    <div className="text-center">
                      <h3 className="font-semibold text-blue-900">{businessData.name}</h3>
                      <p className="text-sm text-blue-700">{businessData.description}</p>
                      <Badge className="mt-2 bg-blue-500">{businessData.plan} Plan</Badge>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
            <Button 
              onClick={() => {
                markStepComplete(1)
                setCurrentStep(2)
              }}
              size="lg"
              className="bg-blue-600 hover:bg-blue-700"
            >
              Let's Get Started
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
          </div>
        )

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <Wifi className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900">Your NFC Tag Information</h2>
              <p className="text-gray-600">Each customer tap will redirect to this unique URL</p>
            </div>

            <Card className="bg-gray-50">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div>
                    <Label className="font-semibold text-gray-900">NFC Tag ID</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="bg-white px-3 py-2 rounded border text-sm font-mono flex-1">
                        {nfcTagId}
                      </code>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(nfcTagId)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label className="font-semibold text-gray-900">Customer Tap URL</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="bg-white px-3 py-2 rounded border text-sm font-mono flex-1 break-all">
                        {generateNfcUrl()}
                      </code>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(generateNfcUrl())}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(generateNfcUrl(), '_blank')}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Important:</strong> Save this information! You'll need the NFC Tag ID when ordering physical NFC tags.
              </p>
            </div>

            <div className="flex justify-center">
              <Button 
                onClick={() => {
                  markStepComplete(2)
                  setCurrentStep(3)
                }}
              >
                Continue Setup
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </div>
          </div>
        )

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <QrCode className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900">Download Your NFC Labels</h2>
              <p className="text-gray-600">Print these labels and attach them to your NFC tags</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">NFC Label Design</CardTitle>
                  <CardDescription>Print this design on sticker paper</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="bg-gray-100 p-6 rounded-lg text-center mb-4">
                    <Wifi className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                    <h3 className="font-semibold">{businessData?.name}</h3>
                    <p className="text-sm text-gray-600 mb-2">Tap your phone here to get punched!</p>
                    <code className="text-xs text-gray-500">{nfcTagId}</code>
                  </div>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={downloadNfcLabel}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download SVG Label
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">QR Code Backup</CardTitle>
                  <CardDescription>For phones without NFC</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="bg-gray-100 p-6 rounded-lg text-center mb-4">
                    <QrCode className="h-16 w-16 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">QR code would be generated here</p>
                  </div>
                  <Button variant="outline" className="w-full" disabled>
                    <Download className="h-4 w-4 mr-2" />
                    Download QR Code
                  </Button>
                </CardContent>
              </Card>
            </div>

            <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
              <h4 className="font-semibold text-amber-900 mb-2">Next Steps:</h4>
              <ol className="list-decimal list-inside text-sm text-amber-800 space-y-1">
                <li>Order blank NFC tags online (recommended: NTAG216)</li>
                <li>Use an NFC writing app to program tags with your URL</li>
                <li>Print and attach the labels to your programmed tags</li>
                <li>Place tags where customers can easily tap them</li>
              </ol>
            </div>

            <div className="flex justify-center">
              <Button 
                onClick={() => {
                  markStepComplete(3)
                  setCurrentStep(4)
                }}
              >
                I've Downloaded the Labels
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </div>
          </div>
        )

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <Smartphone className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900">Test Your Setup</h2>
              <p className="text-gray-600">Let's make sure everything works perfectly</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <PlayCircle className="h-5 w-5 text-green-600" />
                    Test Customer Experience
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 mb-4">
                    Try the full customer journey from NFC tap to punch collection
                  </p>
                  <Button 
                    className="w-full mb-2"
                    onClick={() => window.open(generateNfcUrl(), '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Test Customer Flow
                  </Button>
                  <p className="text-xs text-gray-500">
                    Demo login: demo@example.com / demo123
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-blue-600" />
                    Check Analytics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 mb-4">
                    View your business dashboard and analytics
                  </p>
                  <Button 
                    variant="outline"
                    className="w-full"
                    onClick={() => window.open('/business', '_blank')}
                  >
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Open Dashboard
                  </Button>
                </CardContent>
              </Card>
            </div>

            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-green-900">Testing Checklist</h4>
                  <ul className="text-sm text-green-800 mt-1 space-y-1">
                    <li>✓ NFC URL opens correctly</li>
                    <li>✓ Business is identified automatically</li>
                    <li>✓ Customer can login and get punches</li>
                    <li>✓ Analytics update in business dashboard</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex justify-center">
              <Button 
                onClick={() => {
                  markStepComplete(4)
                  setCurrentStep(5)
                }}
              >
                Everything Works Great!
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </div>
          </div>
        )

      case 5:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <Store className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900">Placement Best Practices</h2>
              <p className="text-gray-600">Where to place your NFC tags for maximum effectiveness</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <Card className="border-green-200 bg-green-50">
                <CardHeader>
                  <CardTitle className="text-lg text-green-900 flex items-center gap-2">
                    <CheckCircle className="h-5 w-5" />
                    Best Locations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-green-800">
                    <li>• Point of sale/checkout counter</li>
                    <li>• Table tents (restaurants)</li>
                    <li>• Near entrance/exit</li>
                    <li>• Waiting area</li>
                    <li>• Product displays</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-red-200 bg-red-50">
                <CardHeader>
                  <CardTitle className="text-lg text-red-900">Avoid These Areas</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-red-800">
                    <li>• Behind metal objects</li>
                    <li>• Near other electronics</li>
                    <li>• Hard to reach locations</li>
                    <li>• Areas that get wet</li>
                    <li>• High-traffic damage zones</li>
                  </ul>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Pro Tips</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <h4 className="font-semibold mb-2">🎯 Visibility</h4>
                    <p className="text-gray-600">Make tags obvious with clear "Tap Here" signage</p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">📱 Height</h4>
                    <p className="text-gray-600">Place at comfortable phone-tapping height (waist level)</p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">🔄 Multiple Tags</h4>
                    <p className="text-gray-600">Use the same URL on multiple tags around your space</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-center">
              <Button 
                onClick={() => {
                  markStepComplete(5)
                  setCurrentStep(6)
                }}
              >
                Got It - Let's Finish Setup
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </div>
          </div>
        )

      case 6:
        return (
          <div className="text-center space-y-6">
            <div className="flex items-center justify-center">
              <CheckCircle className="h-16 w-16 text-green-500" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                🎉 You're All Set!
              </h2>
              <p className="text-lg text-gray-600 mb-6">
                Your digital loyalty program is ready to start building customer relationships.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-4 max-w-2xl mx-auto">
              <Card className="text-center p-4">
                <Gift className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <h3 className="font-semibold">Rewards Ready</h3>
                <p className="text-sm text-gray-600">Your punch card system is configured</p>
              </Card>
              <Card className="text-center p-4">
                <Wifi className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <h3 className="font-semibold">NFC Tags Generated</h3>
                <p className="text-sm text-gray-600">Ready to program physical tags</p>
              </Card>
              <Card className="text-center p-4">
                <BarChart3 className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                <h3 className="font-semibold">Analytics Active</h3>
                <p className="text-sm text-gray-600">Start tracking customer engagement</p>
              </Card>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg"
                onClick={() => router.push('/business')}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <BarChart3 className="h-5 w-5 mr-2" />
                Go to Dashboard
              </Button>
              <Button 
                variant="outline"
                size="lg"
                onClick={() => window.open(generateNfcUrl(), '_blank')}
              >
                <Smartphone className="h-5 w-5 mr-2" />
                Test Customer Experience
              </Button>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg max-w-md mx-auto">
              <p className="text-sm text-blue-800">
                <strong>Need help?</strong> Check out our setup guide or contact support for assistance with NFC tag programming.
              </p>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  if (!businessData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your business setup...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <img src="/taprankedlogo.svg" alt="TapRanked Logo" className="w-6 h-6" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">TapRanked Onboarding</h1>
          </div>
          <p className="text-lg text-gray-600">Let's get {businessData.name} set up with digital loyalty</p>
        </div>

        {/* Progress */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm font-medium text-gray-600">Step {currentStep} of {totalSteps}</span>
              <span className="text-sm font-medium text-gray-600">{Math.round(progress)}% Complete</span>
            </div>
            <Progress value={progress} className="h-2" />
            
            {/* Step indicators */}
            <div className="flex justify-between mt-4 text-xs text-gray-500">
              <span className={completedSteps.has(1) ? 'text-green-600' : ''}>Welcome</span>
              <span className={completedSteps.has(2) ? 'text-green-600' : ''}>NFC Setup</span>
              <span className={completedSteps.has(3) ? 'text-green-600' : ''}>Labels</span>
              <span className={completedSteps.has(4) ? 'text-green-600' : ''}>Testing</span>
              <span className={completedSteps.has(5) ? 'text-green-600' : ''}>Placement</span>
              <span className={completedSteps.has(6) ? 'text-green-600' : ''}>Complete</span>
            </div>
          </CardContent>
        </Card>

        {/* Content */}
        <Card>
          <CardContent className="p-8">
            {renderStep()}

            {/* Navigation */}
            {currentStep > 1 && currentStep < 6 && (
              <div className="flex justify-between mt-8 pt-6 border-t">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep(prev => prev - 1)}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Previous
                </Button>
                
                <div className="text-sm text-gray-500">
                  Skip to: 
                  <Button 
                    variant="link" 
                    size="sm"
                    onClick={() => router.push('/business')}
                    className="ml-2"
                  >
                    Business Dashboard
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// Helper component for labels since it's not imported
function Label({ children, className = '', ...props }: any) {
  return (
    <label className={`text-sm font-medium text-gray-700 ${className}`} {...props}>
      {children}
    </label>
  )
}