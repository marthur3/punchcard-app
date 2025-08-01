"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  Store, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Gift, 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle,
  CreditCard,
  Wifi,
  Building2
} from "lucide-react"
import Link from "next/link"

interface BusinessFormData {
  // Business Info
  businessName: string
  businessDescription: string
  businessType: string
  address: string
  city: string
  state: string
  zipCode: string
  phone: string
  website: string
  
  // Admin Account
  adminName: string
  adminEmail: string
  adminPassword: string
  adminPasswordConfirm: string
  
  // Punch Card Config
  maxPunches: number
  defaultReward: string
  rewardDescription: string
  
  // Plan Selection
  selectedPlan: 'starter' | 'professional' | 'enterprise'
}

const initialFormData: BusinessFormData = {
  businessName: '',
  businessDescription: '',
  businessType: '',
  address: '',
  city: '',
  state: '',
  zipCode: '',
  phone: '',
  website: '',
  adminName: '',
  adminEmail: '',
  adminPassword: '',
  adminPasswordConfirm: '',
  maxPunches: 10,
  defaultReward: '',
  rewardDescription: '',
  selectedPlan: 'starter'
}

const plans = [
  {
    id: 'starter' as const,
    name: 'Starter',
    price: '$29/month',
    features: [
      'Up to 1,000 customers',
      'Basic analytics',
      '1 location',
      'Email support'
    ]
  },
  {
    id: 'professional' as const,
    name: 'Professional',
    price: '$79/month',
    features: [
      'Up to 10,000 customers',
      'Advanced analytics',
      'Up to 5 locations',
      'Priority support',
      'Custom rewards'
    ]
  },
  {
    id: 'enterprise' as const,
    name: 'Enterprise',
    price: '$199/month',
    features: [
      'Unlimited customers',
      'Full analytics suite',
      'Unlimited locations',
      '24/7 phone support',
      'Custom integrations'
    ]
  }
]

export default function BusinessSignupPage() {
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState<BusinessFormData>(initialFormData)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const router = useRouter()

  const totalSteps = 5
  const progress = (currentStep / totalSteps) * 100

  const updateFormData = (updates: Partial<BusinessFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }))
    // Clear errors for updated fields
    const updatedFields = Object.keys(updates)
    setErrors(prev => {
      const newErrors = { ...prev }
      updatedFields.forEach(field => delete newErrors[field])
      return newErrors
    })
  }

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {}

    switch (step) {
      case 1: // Business Info
        if (!formData.businessName.trim()) newErrors.businessName = 'Business name is required'
        if (!formData.businessDescription.trim()) newErrors.businessDescription = 'Description is required'
        if (!formData.businessType.trim()) newErrors.businessType = 'Business type is required'
        if (!formData.phone.trim()) newErrors.phone = 'Phone number is required'
        break
        
      case 2: // Location
        if (!formData.address.trim()) newErrors.address = 'Address is required'
        if (!formData.city.trim()) newErrors.city = 'City is required'
        if (!formData.state.trim()) newErrors.state = 'State is required'
        if (!formData.zipCode.trim()) newErrors.zipCode = 'ZIP code is required'
        break
        
      case 3: // Admin Account
        if (!formData.adminName.trim()) newErrors.adminName = 'Admin name is required'
        if (!formData.adminEmail.trim()) newErrors.adminEmail = 'Email is required'
        if (!/\S+@\S+\.\S+/.test(formData.adminEmail)) newErrors.adminEmail = 'Valid email is required'
        if (!formData.adminPassword) newErrors.adminPassword = 'Password is required'
        if (formData.adminPassword.length < 6) newErrors.adminPassword = 'Password must be at least 6 characters'
        if (formData.adminPassword !== formData.adminPasswordConfirm) {
          newErrors.adminPasswordConfirm = 'Passwords do not match'
        }
        break
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, totalSteps))
    }
  }

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1))
  }

  const generateNfcTagId = (businessName: string): string => {
    const sanitized = businessName.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 8)
    const timestamp = Date.now().toString().slice(-4)
    return `nfc_${sanitized}_${timestamp}`
  }

  const submitRegistration = async () => {
    if (!validateStep(currentStep)) return

    setIsSubmitting(true)
    try {
      // Generate unique NFC tag ID
      const nfcTagId = generateNfcTagId(formData.businessName)
      
      // In demo mode, store in localStorage
      const isDemoMode = process.env.NEXT_PUBLIC_SUPABASE_URL === undefined ||
                        process.env.NEXT_PUBLIC_SUPABASE_URL === "https://demo.supabase.co"

      if (isDemoMode) {
        // Store business registration in localStorage
        const businessData = {
          id: `business-${Date.now()}`,
          name: formData.businessName,
          description: formData.businessDescription,
          nfc_tag_id: nfcTagId,
          max_punches: formData.maxPunches,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          admin_email: formData.adminEmail,
          admin_name: formData.adminName,
          address: `${formData.address}, ${formData.city}, ${formData.state} ${formData.zipCode}`,
          phone: formData.phone,
          website: formData.website,
          plan: formData.selectedPlan
        }

        // Store business data
        const existingBusinesses = JSON.parse(localStorage.getItem('demo_registered_businesses') || '[]')
        existingBusinesses.push(businessData)
        localStorage.setItem('demo_registered_businesses', JSON.stringify(existingBusinesses))

        // Create initial prize
        if (formData.defaultReward.trim()) {
          const prizeData = {
            id: `prize-${Date.now()}`,
            business_id: businessData.id,
            name: formData.defaultReward,
            description: formData.rewardDescription,
            punches_required: formData.maxPunches,
            is_active: true,
            created_at: new Date().toISOString()
          }

          const existingPrizes = JSON.parse(localStorage.getItem('demo_registered_prizes') || '[]')
          existingPrizes.push(prizeData)
          localStorage.setItem('demo_registered_prizes', JSON.stringify(existingPrizes))
        }

        // Store admin session
        localStorage.setItem('business_admin_session', JSON.stringify({
          business_id: businessData.id,
          admin_email: formData.adminEmail,
          admin_name: formData.adminName,
          nfc_tag_id: nfcTagId
        }))

        // Redirect to onboarding wizard
        router.push(`/business/onboarding?business_id=${businessData.id}&nfc_tag=${nfcTagId}`)
      } else {
        // Real Supabase implementation would go here
        console.log('Real registration would happen here with Supabase')
      }
    } catch (error) {
      console.error('Registration error:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <Building2 className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900">Tell us about your business</h2>
              <p className="text-gray-600">We'll use this information to set up your digital punch card system</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="businessName">Business Name *</Label>
                  <Input
                    id="businessName"
                    value={formData.businessName}
                    onChange={(e) => updateFormData({ businessName: e.target.value })}
                    placeholder="Coffee Corner"
                    className={errors.businessName ? 'border-red-500' : ''}
                  />
                  {errors.businessName && <p className="text-sm text-red-600">{errors.businessName}</p>}
                </div>

                <div>
                  <Label htmlFor="businessType">Business Type *</Label>
                  <Input
                    id="businessType"
                    value={formData.businessType}
                    onChange={(e) => updateFormData({ businessType: e.target.value })}
                    placeholder="Coffee Shop, Restaurant, Retail, etc."
                    className={errors.businessType ? 'border-red-500' : ''}
                  />
                  {errors.businessType && <p className="text-sm text-red-600">{errors.businessType}</p>}
                </div>

                <div>
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => updateFormData({ phone: e.target.value })}
                    placeholder="(555) 123-4567"
                    className={errors.phone ? 'border-red-500' : ''}
                  />
                  {errors.phone && <p className="text-sm text-red-600">{errors.phone}</p>}
                </div>

                <div>
                  <Label htmlFor="website">Website (Optional)</Label>
                  <Input
                    id="website"
                    value={formData.website}
                    onChange={(e) => updateFormData({ website: e.target.value })}
                    placeholder="https://coffecorner.com"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="businessDescription">Business Description *</Label>
                <Textarea
                  id="businessDescription"
                  value={formData.businessDescription}
                  onChange={(e) => updateFormData({ businessDescription: e.target.value })}
                  placeholder="Describe your business and what makes it special..."
                  className={`min-h-[200px] ${errors.businessDescription ? 'border-red-500' : ''}`}
                />
                {errors.businessDescription && <p className="text-sm text-red-600">{errors.businessDescription}</p>}
              </div>
            </div>
          </div>
        )

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <MapPin className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900">Where are you located?</h2>
              <p className="text-gray-600">This helps customers find you and enables local features</p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="address">Street Address *</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => updateFormData({ address: e.target.value })}
                  placeholder="123 Main Street"
                  className={errors.address ? 'border-red-500' : ''}
                />
                {errors.address && <p className="text-sm text-red-600">{errors.address}</p>}
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => updateFormData({ city: e.target.value })}
                    placeholder="San Francisco"
                    className={errors.city ? 'border-red-500' : ''}
                  />
                  {errors.city && <p className="text-sm text-red-600">{errors.city}</p>}
                </div>

                <div>
                  <Label htmlFor="state">State *</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => updateFormData({ state: e.target.value })}
                    placeholder="CA"
                    className={errors.state ? 'border-red-500' : ''}
                  />
                  {errors.state && <p className="text-sm text-red-600">{errors.state}</p>}
                </div>

                <div>
                  <Label htmlFor="zipCode">ZIP Code *</Label>
                  <Input
                    id="zipCode"
                    value={formData.zipCode}
                    onChange={(e) => updateFormData({ zipCode: e.target.value })}
                    placeholder="94101"
                    className={errors.zipCode ? 'border-red-500' : ''}
                  />
                  {errors.zipCode && <p className="text-sm text-red-600">{errors.zipCode}</p>}
                </div>
              </div>
            </div>
          </div>
        )

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <User className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900">Create your admin account</h2>
              <p className="text-gray-600">This account will manage your business dashboard and settings</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="adminName">Your Name *</Label>
                  <Input
                    id="adminName"
                    value={formData.adminName}
                    onChange={(e) => updateFormData({ adminName: e.target.value })}
                    placeholder="John Doe"
                    className={errors.adminName ? 'border-red-500' : ''}
                  />
                  {errors.adminName && <p className="text-sm text-red-600">{errors.adminName}</p>}
                </div>

                <div>
                  <Label htmlFor="adminEmail">Email Address *</Label>
                  <Input
                    id="adminEmail"
                    type="email"
                    value={formData.adminEmail}
                    onChange={(e) => updateFormData({ adminEmail: e.target.value })}
                    placeholder="john@coffecorner.com"
                    className={errors.adminEmail ? 'border-red-500' : ''}
                  />
                  {errors.adminEmail && <p className="text-sm text-red-600">{errors.adminEmail}</p>}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="adminPassword">Password *</Label>
                  <Input
                    id="adminPassword"
                    type="password"
                    value={formData.adminPassword}
                    onChange={(e) => updateFormData({ adminPassword: e.target.value })}
                    placeholder="Minimum 6 characters"
                    className={errors.adminPassword ? 'border-red-500' : ''}
                  />
                  {errors.adminPassword && <p className="text-sm text-red-600">{errors.adminPassword}</p>}
                </div>

                <div>
                  <Label htmlFor="adminPasswordConfirm">Confirm Password *</Label>
                  <Input
                    id="adminPasswordConfirm"
                    type="password"
                    value={formData.adminPasswordConfirm}
                    onChange={(e) => updateFormData({ adminPasswordConfirm: e.target.value })}
                    placeholder="Re-enter password"
                    className={errors.adminPasswordConfirm ? 'border-red-500' : ''}
                  />
                  {errors.adminPasswordConfirm && <p className="text-sm text-red-600">{errors.adminPasswordConfirm}</p>}
                </div>
              </div>
            </div>
          </div>
        )

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <Gift className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900">Configure your punch card</h2>
              <p className="text-gray-600">Set up how many punches customers need and what they get</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="maxPunches">Punches Required for Reward</Label>
                  <Input
                    id="maxPunches"
                    type="number"
                    min="3"
                    max="20"
                    value={formData.maxPunches}
                    onChange={(e) => updateFormData({ maxPunches: parseInt(e.target.value) || 10 })}
                  />
                  <p className="text-sm text-gray-600">Recommended: 8-12 punches</p>
                </div>

                <div>
                  <Label htmlFor="defaultReward">Default Reward (Optional)</Label>
                  <Input
                    id="defaultReward"
                    value={formData.defaultReward}
                    onChange={(e) => updateFormData({ defaultReward: e.target.value })}
                    placeholder="Free Coffee"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="rewardDescription">Reward Description</Label>
                <Textarea
                  id="rewardDescription"
                  value={formData.rewardDescription}
                  onChange={(e) => updateFormData({ rewardDescription: e.target.value })}
                  placeholder="Get any coffee drink on the house when you complete your punch card"
                  className="min-h-[120px]"
                />
              </div>
            </div>

            {/* Preview */}
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="font-semibold mb-4">Punch Card Preview</h3>
              <Card className="max-w-sm mx-auto">
                <CardHeader className="text-center">
                  <CardTitle>{formData.businessName}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center mb-4">
                    <div className="text-2xl font-bold text-blue-600">0/{formData.maxPunches}</div>
                  </div>
                  <div className="grid grid-cols-5 gap-1 mb-4">
                    {Array.from({ length: formData.maxPunches }).map((_, index) => (
                      <div key={index} className="aspect-square rounded-full border-2 border-gray-300 bg-white" />
                    ))}
                  </div>
                  {formData.defaultReward && (
                    <div className="text-center">
                      <Badge className="bg-green-500 text-white">{formData.defaultReward}</Badge>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )

      case 5:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <CreditCard className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900">Choose your plan</h2>
              <p className="text-gray-600">Start with a plan that fits your business size</p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {plans.map((plan) => (
                <Card 
                  key={plan.id}
                  className={`cursor-pointer transition-all ${
                    formData.selectedPlan === plan.id 
                      ? 'ring-2 ring-blue-500 bg-blue-50' 
                      : 'hover:shadow-lg'
                  }`}
                  onClick={() => updateFormData({ selectedPlan: plan.id })}
                >
                  <CardHeader className="text-center">
                    <CardTitle className="text-xl">{plan.name}</CardTitle>
                    <div className="text-3xl font-bold text-blue-600">{plan.price}</div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>14-day free trial</strong> - No credit card required. Cancel anytime.
              </p>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4">
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <img src="/taprankedlogo.svg" alt="TapRanked Logo" className="w-6 h-6" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">TapRanked</h1>
          </div>
          <p className="text-lg text-gray-600">Set up your digital loyalty program in minutes</p>
        </div>

        {/* Progress */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm font-medium text-gray-600">Step {currentStep} of {totalSteps}</span>
              <span className="text-sm font-medium text-gray-600">{Math.round(progress)}% Complete</span>
            </div>
            <Progress value={progress} className="h-2" />
          </CardContent>
        </Card>

        {/* Form */}
        <Card>
          <CardContent className="p-8">
            {renderStep()}

            {/* Navigation */}
            <div className="flex justify-between mt-8 pt-6 border-t">
              <Button
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 1}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>

              {currentStep < totalSteps ? (
                <Button onClick={nextStep}>
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button 
                  onClick={submitRegistration}
                  disabled={isSubmitting}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isSubmitting ? 'Creating Account...' : 'Complete Registration'}
                  <CheckCircle className="h-4 w-4 ml-2" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}