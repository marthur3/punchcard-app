"use client"

import { Suspense, useState, useEffect } from "react"
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
  Gift,
  BarChart3,
  ArrowRight,
  ArrowLeft,
  PlayCircle
} from "lucide-react"
import QRCode from "qrcode"

export default function BusinessOnboardingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>}>
      <OnboardingContent />
    </Suspense>
  )
}

function OnboardingContent() {
  const [currentStep, setCurrentStep] = useState(1)
  const [businessData, setBusinessData] = useState<any>(null)
  const [nfcTagId, setNfcTagId] = useState<string>('')
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set())
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('')
  const router = useRouter()
  const searchParams = useSearchParams()

  const totalSteps = 3
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

  // Generate QR code when nfcTagId is available
  useEffect(() => {
    if (nfcTagId) {
      const generateQRCode = async () => {
        try {
          const url = `${window.location.origin}/tap?nfc=${nfcTagId}`
          const qrDataUrl = await QRCode.toDataURL(url, {
            width: 300,
            margin: 2,
            color: {
              dark: '#1e293b',
              light: '#ffffff'
            }
          })
          setQrCodeDataUrl(qrDataUrl)
        } catch (err) {
          console.error('Error generating QR code:', err)
        }
      }
      generateQRCode()
    }
  }, [nfcTagId])

  const markStepComplete = (step: number) => {
    setCompletedSteps(prev => new Set([...prev, step]))
  }

  const generateNfcUrl = () => {
    const baseUrl = window.location.origin
    return `${baseUrl}/tap?nfc=${nfcTagId}`
  }

  const downloadQRCode = () => {
    if (!qrCodeDataUrl) return

    const a = document.createElement('a')
    a.href = qrCodeDataUrl
    a.download = `${businessData?.name || 'business'}-qr-code.png`
    a.click()
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
              <Smartphone className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900">Live Test</h2>
              <p className="text-gray-600">Let's make sure everything works perfectly</p>
            </div>

            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-8 text-center">
                <Wifi className="h-16 w-16 text-blue-600 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">Tap your NFC tag now</h3>
                <p className="text-gray-600 mb-4">
                  Hold your phone near the tag to see the customer experience
                </p>
                <Button
                  size="lg"
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={() => window.open(generateNfcUrl(), '_blank')}
                >
                  <PlayCircle className="h-5 w-5 mr-2" />
                  Open Tap URL
                </Button>
                <p className="text-xs text-gray-500 mt-3">
                  {generateNfcUrl()}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <BarChart3 className="h-10 w-10 text-blue-600 shrink-0" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">See it in action</h3>
                    <p className="text-sm text-gray-600">
                      Open your dashboard to watch analytics update live as customers tap
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => window.open('/business', '_blank')}
                  >
                    Open Dashboard
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-green-900">What to check</h4>
                  <ul className="text-sm text-green-800 mt-1 space-y-1">
                    <li>NFC tap opens the right business page</li>
                    <li>Customers can sign up and collect punches</li>
                    <li>Dashboard updates with new activity</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex justify-center">
              <Button
                onClick={() => {
                  markStepComplete(2)
                  setCurrentStep(3)
                }}
                size="lg"
              >
                Everything Works!
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </div>
          </div>
        )

      case 3:
        return (
          <div className="text-center space-y-6">
            <div className="flex items-center justify-center">
              <CheckCircle className="h-16 w-16 text-green-500" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                You're All Set!
              </h2>
              <p className="text-lg text-gray-600 mb-6">
                Your digital loyalty program is live. Customers can start tapping and earning rewards.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-4 max-w-lg mx-auto">
              <Card className="text-center p-4">
                <Gift className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <h3 className="font-semibold">Rewards Ready</h3>
                <p className="text-sm text-gray-600">Punch card system is live</p>
              </Card>
              <Card className="text-center p-4">
                <BarChart3 className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                <h3 className="font-semibold">Analytics Active</h3>
                <p className="text-sm text-gray-600">Tracking customer engagement</p>
              </Card>
            </div>

            <Button
              size="lg"
              onClick={() => router.push('/business')}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <BarChart3 className="h-5 w-5 mr-2" />
              Go to Dashboard
            </Button>

            {/* QR Code backup */}
            <Card className="max-w-sm mx-auto">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center justify-center gap-2">
                  <QrCode className="h-4 w-4" />
                  QR Code Backup
                </CardTitle>
                <CardDescription>For customers without NFC</CardDescription>
              </CardHeader>
              <CardContent className="pb-4">
                {qrCodeDataUrl ? (
                  <img
                    src={qrCodeDataUrl}
                    alt="QR Code"
                    className="mx-auto w-36 h-36 mb-3"
                  />
                ) : (
                  <div className="text-center py-4">
                    <QrCode className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">Generating QR code...</p>
                  </div>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={downloadQRCode}
                  disabled={!qrCodeDataUrl}
                >
                  Download QR Code
                </Button>
              </CardContent>
            </Card>
          </div>
        )

      default:
        return null
    }
  }

  if (!businessData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your business setup...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 p-4">
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
              <span className={completedSteps.has(2) ? 'text-green-600' : ''}>Live Test</span>
              <span className={completedSteps.has(3) ? 'text-green-600' : ''}>Complete</span>
            </div>
          </CardContent>
        </Card>

        {/* Content */}
        <Card>
          <CardContent className="p-8">
            {renderStep()}

            {/* Navigation */}
            {currentStep === 2 && (
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
