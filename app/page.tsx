"use client"

import { useState, useEffect } from "react"
import { isDemoMode as checkDemoMode } from "@/lib/supabase"
import { generateLeaderboardData } from "@/lib/demo-data"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  AlertCircle, 
  Users, 
  Star, 
  CheckCircle, 
  ArrowRight, 
  Smartphone, 
  BarChart3,
  Phone,
  Mail,
  MapPin,
  X,
  Trophy,
  Target,
  Heart,
  Zap,
  Crown,
  Medal,
  Award
} from "lucide-react"
import Link from "next/link"

export default function HomePage() {
  const [showPrivacyModal, setShowPrivacyModal] = useState(false)
  const [showTermsModal, setShowTermsModal] = useState(false)
  const [showDemoModal, setShowDemoModal] = useState(false)
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const [leaderboardData, setLeaderboardData] = useState<any[]>([])
  const [contactSubmitted, setContactSubmitted] = useState(false)

  const isDemoMode = checkDemoMode

  useEffect(() => {
    const leaderboard = generateLeaderboardData()
    setLeaderboardData(leaderboard)
  }, [])

  const Modal = ({ isOpen, onClose, title, children }: {
    isOpen: boolean
    onClose: () => void
    title: string
    children: React.ReactNode
  }) => {
    if (!isOpen) return null
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg max-w-4xl w-full max-h-[80vh] overflow-y-auto">
          <div className="flex justify-between items-center p-6 border-b border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
            <button 
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          <div className="p-6">
            {children}
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Structured Data for SEO and Generative AI */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            "name": "TapRanked",
            "applicationCategory": "BusinessApplication",
            "operatingSystem": "Web",
            "description": "NFC-powered digital loyalty programs with competitive leaderboards for Blacksburg businesses. Increase customer retention with gamified rewards and real-time analytics.",
            "url": "https://tapranked.com",
            "screenshot": "https://tapranked.com/screenshot.png",
            "offers": [
              {
                "@type": "Offer",
                "name": "Starter Plan",
                "price": "29",
                "priceCurrency": "USD",
                "billingIncrement": "Monthly",
                "description": "Up to 1,000 customers, basic analytics, 1 location, email support"
              },
              {
                "@type": "Offer", 
                "name": "Professional Plan",
                "price": "79",
                "priceCurrency": "USD",
                "billingIncrement": "Monthly",
                "description": "Up to 10,000 customers, advanced analytics & leaderboards, up to 5 locations, priority support"
              },
              {
                "@type": "Offer",
                "name": "Enterprise Plan", 
                "price": "199",
                "priceCurrency": "USD",
                "billingIncrement": "Monthly",
                "description": "Unlimited customers, full analytics suite, unlimited locations, 24/7 support"
              }
            ],
            "provider": {
              "@type": "Organization",
              "name": "TapRanked",
              "url": "https://tapranked.com",
              "contactPoint": {
                "@type": "ContactPoint",
                "telephone": "+1-540-555-8277",
                "contactType": "customer service",
                "areaServed": "US",
                "availableLanguage": "English"
              },
              "address": {
                "@type": "PostalAddress",
                "addressLocality": "Blacksburg",
                "addressRegion": "VA",
                "addressCountry": "US"
              }
            },
            "keywords": ["loyalty programs", "NFC technology", "customer retention", "digital rewards", "leaderboards", "Virginia Tech", "Blacksburg business"],
            "featureList": [
              "NFC-powered customer check-ins",
              "Competitive leaderboards",
              "Real-time analytics dashboard", 
              "Gamified reward systems",
              "Multi-location support",
              "Customer segmentation",
              "Prize management",
              "Mobile-optimized experience"
            ]
          })
        }}
      />
      
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-red-800 rounded-xl flex items-center justify-center">
              <img src="/taprankedlogo.svg" alt="TapRanked Logo" className="w-10 h-10" />
            </div>
          </div>
          <div className="flex items-center gap-6">
            <button 
              onClick={() => {
                const pricingSection = document.getElementById('pricing-section');
                pricingSection?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="text-gray-600 hover:text-red-800 font-medium"
            >
              Pricing
            </button>
            <button
              onClick={() => setShowDemoModal(true)}
              className="text-gray-600 hover:text-red-800 font-medium"
            >
              Demo
            </button>
            <Link href="/auth/register" className="text-gray-600 hover:text-red-800 font-medium">
              Sign Up
            </Link>
            <Link href="/auth/login" className="text-gray-600 hover:text-red-800 font-medium">
              Customer Login
            </Link>
            <Link href="/business/login">
              <Button variant="outline" className="border-red-300 text-red-800 hover:bg-red-50">Business Login</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Demo Mode Alert */}
      {isDemoMode && (
        <div className="bg-amber-50 border-b border-amber-200">
          <div className="max-w-6xl mx-auto px-4 py-3">
            <div className="flex items-center justify-center gap-2 text-amber-800">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm"><strong>Demo Mode:</strong> Try the full experience with sample data</span>
            </div>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-4 py-16 text-center">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            In-Person Loyalty Program That Make <span className="text-red-800">Customers Compete</span><br /> for Your Top Spot
          </h1>
          <p className="text-xl text-gray-600 mb-8 leading-relaxed">
            Transform your business with gamified loyalty programs featuring competitive leaderboards, 
            NFC tap-to-earn technology, and real-time customer analytics. Perfect for Virginia Tech area businesses.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/business/signup">
              <Button size="lg" className="bg-red-800 hover:bg-orange-600 text-white px-8 py-4 text-lg">
                Get Started Today
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Button 
              variant="outline" 
              size="lg" 
              className="border-red-800 text-red-800 hover:bg-red-800 hover:text-white px-8 py-4 text-lg"
              onClick={() => setShowDemoModal(true)}
            >
              See How It Works
            </Button>
          </div>
          <div className="mt-8 text-sm text-gray-500">
            Proudly serving Blacksburg, and the New River Valley
          </div>
        </div>
      </section>

      {/* Risk Reversal Section */}
      <section className="bg-gradient-to-r from-emerald-50 to-green-50 py-12">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="bg-white rounded-2xl p-8 shadow-lg border border-green-200">
            <div className="flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-green-600 mr-3" />
              <h2 className="text-2xl font-bold text-gray-900">Try Risk-Free for 90 Days</h2>
            </div>
            <p className="text-lg text-gray-700 mb-6 leading-relaxed">
              If you don't see <strong className="text-green-700">more visits from your top customers</strong>, 
              we'll refund every penny and let you keep the NFC tags.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <div className="flex items-center text-green-700 font-semibold">
                <CheckCircle className="h-5 w-5 mr-2" />
                No contracts or setup fees
              </div>
              <div className="flex items-center text-green-700 font-semibold">
                <CheckCircle className="h-5 w-5 mr-2" />
                Keep all equipment
              </div>
              <div className="flex items-center text-green-700 font-semibold">
                <CheckCircle className="h-5 w-5 mr-2" />
                Full money-back guarantee
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Challenge Section */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              The Hidden Challenge of Customer Loyalty
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Your best customers are invisible. You don't know who they are, what they love, or how to keep them coming back.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="text-center p-6 bg-white border border-gray-200">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Anonymous Customers</h3>
              <p className="text-gray-600">
                You see faces but don't know names, preferences, or visit patterns. Every interaction starts from zero.
              </p>
            </Card>

            <Card className="text-center p-6 bg-white border border-gray-200">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Target className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Generic Rewards</h3>
              <p className="text-gray-600">
                One-size-fits-all promotions don't excite anyone. Find out if students want different rewards than local families.
              </p>
            </Card>

            <Card className="text-center p-6 bg-white border border-gray-200">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Heart className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Emotional Connection</h3>
              <p className="text-gray-600">
                Customers don't feel special or recognized. There's no story, no status, no reason to choose you over competitors.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Build a Loyalty Community That Drives Growth
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Transform anonymous visitors into loyal advocates with gamified rewards, exclusive perks, and social recognition
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="text-center p-6 bg-white border border-yellow-200 shadow-sm">
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trophy className="h-6 w-6 text-yellow-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Customer Leaderboards</h3>
              <p className="text-gray-600">
                Your top customers compete for status and exclusive rewards. Create buzz as regulars chase the #1 spot and show off their ranking.
              </p>
            </Card>

            <Card className="text-center p-6 bg-white border border-blue-200 shadow-sm">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Deep Customer Insights</h3>
              <p className="text-gray-600">
                Discover what students order vs. locals, peak study hours, seasonal preferences. Make data-driven decisions about inventory and hours.
              </p>
            </Card>

            <Card className="text-center p-6 bg-white border border-purple-200 shadow-sm">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Crown className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Exclusive VIP Rewards</h3>
              <p className="text-gray-600">
                Limited edition merchandise, early access to new items, VIP events. Give loyal customers something money can't buy.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Gamification Section */}
      <section className="bg-gradient-to-r from-red-50 to-orange-50 py-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Make Loyalty Fun and Competitive
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Turn your regular customers into brand ambassadors with status, competition, and exclusive rewards
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Medal className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">VIP Status Levels</h3>
                    <p className="text-gray-600">Bronze, Silver, Gold, Platinum - customers love progressing through tiers and unlocking new perks</p>
                  </div>
                </div>
                
                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Trophy className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Public Leaderboards</h3>
                    <p className="text-gray-600">Display top customers on screens in your store. Watch regulars compete for the crown and bring friends to witness their reign</p>
                  </div>
                </div>
                
                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Crown className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Exclusive Merchandise</h3>
                    <p className="text-gray-600">Custom t-shirts, mugs, stickers only available to loyalty members. Turn customers into walking advertisements</p>
                  </div>
                </div>
              </div>
            </div>
            
            <Card className="p-8 bg-white shadow-lg">
              <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">Sample Leaderboard</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="flex items-center gap-3">
                    <Crown className="h-6 w-6 text-yellow-600" />
                    <div>
                      <p className="font-semibold text-gray-900">Sarah Chen</p>
                      <p className="text-sm text-gray-600">VT Senior • 47 visits</p>
                    </div>
                  </div>
                  <Award className="h-5 w-5 text-yellow-600" />
                </div>
                
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Medal className="h-6 w-6 text-gray-400" />
                    <div>
                      <p className="font-semibold text-gray-900">Mike Rodriguez</p>
                      <p className="text-sm text-gray-600">Local • 34 visits</p>
                    </div>
                  </div>
                  <span className="text-sm text-gray-500">#2</span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Medal className="h-6 w-6 text-gray-400" />
                    <div>
                      <p className="font-semibold text-gray-900">Emma Wilson</p>
                      <p className="text-sm text-gray-600">Graduate Student • 28 visits</p>
                    </div>
                  </div>
                  <span className="text-sm text-gray-500">#3</span>
                </div>
              </div>
              
              <div className="mt-6 text-center">
                <Button 
                  className="bg-red-800 text-white hover:bg-orange-600"
                  onClick={() => setShowLeaderboard(true)}
                >
                  View Full Rankings
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Local Focus Section */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Built for the Blacksburg Community
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              We understand Blacksburg's unique mix of students, faculty, and local families
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Why Local Businesses Choose Us</h3>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="w-6 h-6 bg-red-800 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <CheckCircle className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Student-Friendly Technology</h4>
                    <p className="text-gray-600">Works with any smartphone - no apps to download or accounts to create</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-6 h-6 bg-red-800 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <CheckCircle className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Local Support Team</h4>
                    <p className="text-gray-600">Based right here in Blacksburg - we're your neighbors helping neighbors</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-6 h-6 bg-red-800 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <CheckCircle className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Affordable Pricing</h4>
                    <p className="text-gray-600">Designed for local businesses - no enterprise pricing or hidden fees</p>
                  </div>
                </div>
              </div>
            </div>
            <Card className="p-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Perfect for Blacksburg businesses like:</h4>
              <ul className="space-y-2 text-gray-600">
                <li>• Coffee shops near campus</li>
                <li>• Restaurants on University City Boulevard</li>
                <li>• Local retail in downtown Blacksburg</li>
                <li>• Services around Virginia Tech</li>
                <li>• Any business serving students and locals</li>
              </ul>
            </Card>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">About TapRanked</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              We're local entrepreneurs passionate about helping Blacksburg businesses thrive
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Our Story</h3>
              <p className="text-gray-600 mb-4">
                Founded by locals love Blacksburg, we saw local businesses struggling with outdated loyalty programs that didn't work for the modern customer - especially tech-savvy students.
              </p>
              <p className="text-gray-600 mb-4">
                We built TapRanked to bridge that gap, combining cutting-edge NFC technology with the personal touch that makes our community special.
              </p>
              <p className="text-gray-600">
                Today, we're proud to help dozens of local businesses build stronger relationships with their customers while contributing to Blacksburg's vibrant economic ecosystem.
              </p>
            </div>
            <Card className="p-8 bg-red-50">
              <h4 className="text-xl font-semibold text-gray-900 mb-4">Our Mission</h4>
              <p className="text-gray-600 mb-6">
                To empower every Blacksburg business with modern loyalty technology that increases customer retention and provides valuable insights.
              </p>
              <h4 className="text-xl font-semibold text-gray-900 mb-4">Our Values</h4>
              <ul className="space-y-2 text-gray-600">
                <li><strong>Local First:</strong> Supporting our community businesses</li>
                <li><strong>Simplicity:</strong> Technology that just works</li>
                <li><strong>Partnership:</strong> Your success is our success</li>
                <li><strong>Innovation:</strong> Always improving and adapting</li>
              </ul>
            </Card>
          </div>
        </div>
      </section>

      {/* Social Proof Section */}
      <section className="bg-white py-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Real Results from Real Businesses
            </h2>
            <div className="grid md:grid-cols-3 gap-8 mt-8">
              <Card className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 text-center border border-green-200">
                <div className="flex justify-center mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-gray-600 mb-4 italic">
                  "Our top 10 customers now visit 3x more often! The leaderboard created this amazing competition. Sarah brought 6 friends just to show off her #1 ranking."
                </p>
                <div className="font-semibold text-gray-900">Maria Rodriguez</div>
                <div className="text-sm text-gray-600">Campus Corner Café</div>
              </Card>

              <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 p-6 text-center border border-blue-200">
                <div className="flex justify-center mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-gray-600 mb-4 italic">
                  "I discovered VT students prefer different menu items than locals. Now I stock accordingly and waste is down 25%. The data is incredible!"
                </p>
                <div className="font-semibold text-gray-900">David Kim</div>
                <div className="text-sm text-gray-600">Hokie Burger</div>
              </Card>

              <Card className="bg-gradient-to-br from-purple-50 to-pink-50 p-6 text-center border border-purple-200">
                <div className="flex justify-center mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-gray-600 mb-4 italic">
                  "Our VIP merchandise program is amazing! Platinum members wear our t-shirts around campus. It's like having walking billboards everywhere."
                </p>
                <div className="font-semibold text-gray-900">Jennifer Williams</div>
                <div className="text-sm text-gray-600">Downtown Blacksburg Books</div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              The Power of Loyal Customers
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              When customers feel special and recognized, they become your biggest advocates
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <Trophy className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">3x More Frequent Visits</h3>
                  <p className="text-gray-600">Leaderboard competition drives customers to visit more often to maintain their ranking and unlock exclusive rewards</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Natural Word-of-Mouth Marketing</h3>
                  <p className="text-gray-600">VIP customers bring friends to witness their status. Exclusive merchandise turns them into walking advertisements</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <BarChart3 className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Deep Customer Intelligence</h3>
                  <p className="text-gray-600">Discover VT student vs. local preferences, peak study hours, seasonal patterns. Make inventory decisions with confidence</p>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <Heart className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Emotional Brand Connection</h3>
                  <p className="text-gray-600">Customers don't just buy from you - they're part of your community with status, recognition, and exclusive access</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <Target className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Personalized Customer Experience</h3>
                  <p className="text-gray-600">Know your regulars by name, their preferences, and visit history. Create personalized offers that actually work</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <Zap className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Instant Customer Feedback</h3>
                  <p className="text-gray-600">See what rewards drive behavior, which promotions work, and adjust your strategy in real-time based on data</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing-section" className="bg-white py-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Choose the plan that fits your business size. Start building customer loyalty today.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="border-2 border-gray-200 p-6">
              <div className="text-center">
                <h3 className="text-xl font-bold text-gray-900 mb-2">Starter</h3>
                <div className="text-3xl font-bold text-red-800 mb-4">$29<span className="text-lg text-gray-600">/month</span></div>
                <ul className="text-left space-y-3 mb-6">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Up to 1,000 customers</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Basic analytics dashboard</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm">1 location</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Email support</span>
                  </li>
                </ul>
                <Link href="/business/signup">
                  <Button variant="outline" className="w-full">Get Started</Button>
                </Link>
              </div>
            </Card>

            <Card className="border-2 border-red-500 p-6 relative">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-red-500 text-white">Most Popular</Badge>
              </div>
              <div className="text-center">
                <h3 className="text-xl font-bold text-gray-900 mb-2">Professional</h3>
                <div className="text-3xl font-bold text-red-800 mb-4">$79<span className="text-lg text-gray-600">/month</span></div>
                <ul className="text-left space-y-3 mb-6">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Up to 10,000 customers</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Advanced analytics & leaderboards</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Up to 5 locations</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Priority support</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Custom rewards & tiers</span>
                  </li>
                </ul>
                <Link href="/business/signup">
                  <Button className="w-full bg-red-800 hover:bg-red-700">Get Started</Button>
                </Link>
              </div>
            </Card>

            <Card className="border-2 border-gray-200 p-6">
              <div className="text-center">
                <h3 className="text-xl font-bold text-gray-900 mb-2">Enterprise</h3>
                <div className="text-3xl font-bold text-red-800 mb-4">$199<span className="text-lg text-gray-600">/month</span></div>
                <ul className="text-left space-y-3 mb-6">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Unlimited customers</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Full analytics suite</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Unlimited locations</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm">24/7 phone support</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Custom integrations</span>
                  </li>
                </ul>
                <Link href="/business/signup">
                  <Button variant="outline" className="w-full">Get Started</Button>
                </Link>
              </div>
            </Card>
          </div>

          <div className="text-center mt-8">
            <p className="text-gray-600">
              All plans include a <strong>14-day free trial</strong>. No credit card required.
            </p>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Get Started Today</h2>
            <p className="text-lg text-gray-600">
              Ready to transform your customer loyalty? We're here to help.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Contact Information</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-red-800" />
                  <span className="text-gray-600">(540) 555-TAPP</span>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-red-800" />
                  <span className="text-gray-600">hello@tapranked.com</span>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-red-800" />
                  <span className="text-gray-600">Serving Blacksburg & Virginia Tech</span>
                </div>
              </div>

              <div className="mt-8">
                <h4 className="font-semibold text-gray-900 mb-2">Business Hours</h4>
                <p className="text-gray-600">Monday - Friday: 9:00 AM - 6:00 PM</p>
                <p className="text-gray-600">Weekend support available</p>
              </div>
            </div>

            <Card className="p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Schedule a Consultation</h3>
              {contactSubmitted ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">Thanks, we'll be in touch!</h4>
                  <p className="text-gray-600">We typically respond within 24 hours.</p>
                </div>
              ) : (
              <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); setContactSubmitted(true); }}>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
                  <input 
                    type="text" 
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-800 focus:border-transparent" 
                    required 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Your Name</label>
                  <input 
                    type="text" 
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-800 focus:border-transparent" 
                    required 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input 
                    type="email" 
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-800 focus:border-transparent" 
                    required 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input 
                    type="tel" 
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-800 focus:border-transparent" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tell us about your business</label>
                  <textarea 
                    rows={3} 
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-800 focus:border-transparent"
                  ></textarea>
                </div>
                <Button 
                  type="submit" 
                  className="w-full bg-red-800 text-white hover:bg-orange-600"
                >
                  Request Consultation
                </Button>
              </form>
              )}
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-red-800 py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Build Stronger Customer Relationships?
          </h2>
          <p className="text-xl text-orange-100 mb-8">
            Join the growing family of Blacksburg businesses using smart loyalty technology
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/business/signup">
              <Button size="lg" className="bg-white text-red-800 hover:bg-gray-100 px-8 py-4 text-lg">
                Get Your Free Consultation
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Button 
              variant="outline" 
              size="lg" 
              className="border-white text-white bg-black hover:bg-white/10 px-8 py-4 text-lg"
              onClick={() => setShowDemoModal(true)}
            >
              See a Live Demo
            </Button>
          </div>
          {isDemoMode && (
            <div className="mt-6 text-orange-100 text-sm">
              Demo Mode: Try Coffee Corner with demo@example.com / demo123
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 py-12">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 bg-red-800 rounded flex items-center justify-center">
                  <img src="/taprankedlogo.svg" alt="TapRanked Logo" className="w-4 h-4" />
                </div>
                <span className="text-white font-semibold text-lg">TapRanked</span>
              </div>
              <p className="text-gray-400 text-sm">
                Helping Blacksburg businesses build lasting customer loyalty with smart technology.
              </p>
            </div>
            
            <div>
              <h4 className="text-white font-semibold mb-4">Services</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><a href="#" className="hover:text-white">NFC Loyalty Programs</a></li>
                <li><a href="#" className="hover:text-white">Customer Analytics</a></li>
                <li><a href="#" className="hover:text-white">Full Setup Service</a></li>
                <li><a href="#" className="hover:text-white">Local Support</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><a href="#" className="hover:text-white">About Us</a></li>
                <li><a href="#" className="hover:text-white">Contact</a></li>
                <li>
                  <button 
                    onClick={() => setShowPrivacyModal(true)}
                    className="hover:text-white text-left"
                  >
                    Privacy Policy
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => setShowTermsModal(true)}
                    className="hover:text-white text-left"
                  >
                    Terms of Service
                  </button>
                </li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-white font-semibold mb-4">Contact</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li>(540) 555-TAPP</li>
                <li>hello@tapranked.com</li>
                <li>Blacksburg, VA</li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center">
            <p className="text-gray-400 text-sm">
              © 2025 TapRanked. All rights reserved. Proudly serving the Virginia Tech community.
            </p>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <Modal
        isOpen={showPrivacyModal}
        onClose={() => setShowPrivacyModal(false)}
        title="Privacy Policy"
      >
        <div className="prose prose-gray max-w-none">
          <p className="text-gray-600 mb-4"><strong>Last updated:</strong> January 2025</p>
          
          <h3 className="text-lg font-semibold text-gray-900 mb-2">1. Information We Collect</h3>
          <p className="text-gray-600 mb-4">
            We collect information you provide directly to us, such as when you create an account, contact us, or use our loyalty program services. This may include your name, email address, phone number, and business information.
          </p>
          
          <h3 className="text-lg font-semibold text-gray-900 mb-2">2. How We Use Your Information</h3>
          <p className="text-gray-600 mb-4">
            We use the information we collect to provide, maintain, and improve our services, process transactions, send you communications, and comply with legal obligations.
          </p>
          
          <h3 className="text-lg font-semibold text-gray-900 mb-2">3. Information Sharing</h3>
          <p className="text-gray-600 mb-4">
            We do not sell, trade, or otherwise transfer your personal information to third parties without your consent, except as described in this policy or as required by law.
          </p>
          
          <h3 className="text-lg font-semibold text-gray-900 mb-2">4. Data Security</h3>
          <p className="text-gray-600 mb-4">
            We implement appropriate security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.
          </p>
          
          <h3 className="text-lg font-semibold text-gray-900 mb-2">5. Contact Us</h3>
          <p className="text-gray-600">
            If you have any questions about this Privacy Policy, please contact us at hello@tapranked.com or (540) 555-TAPP.
          </p>
        </div>
      </Modal>

      <Modal
        isOpen={showTermsModal}
        onClose={() => setShowTermsModal(false)}
        title="Terms of Service"
      >
        <div className="prose prose-gray max-w-none">
          <p className="text-gray-600 mb-4"><strong>Last updated:</strong> January 2025</p>
          
          <h3 className="text-lg font-semibold text-gray-900 mb-2">1. Acceptance of Terms</h3>
          <p className="text-gray-600 mb-4">
            By accessing and using TapRanked's services, you accept and agree to be bound by the terms and provision of this agreement.
          </p>
          
          <h3 className="text-lg font-semibold text-gray-900 mb-2">2. Service Description</h3>
          <p className="text-gray-600 mb-4">
            TapRanked provides NFC-powered digital loyalty program solutions for local businesses in the Blacksburg, Virginia area.
          </p>
          
          <h3 className="text-lg font-semibold text-gray-900 mb-2">3. User Responsibilities</h3>
          <p className="text-gray-600 mb-4">
            You are responsible for maintaining the confidentiality of your account and password and for restricting access to your computer or device.
          </p>
          
          <h3 className="text-lg font-semibold text-gray-900 mb-2">4. Payment Terms</h3>
          <p className="text-gray-600 mb-4">
            Payment for services is due as specified in your service agreement. Late payments may result in service suspension.
          </p>
          
          <h3 className="text-lg font-semibold text-gray-900 mb-2">5. Limitation of Liability</h3>
          <p className="text-gray-600 mb-4">
            TapRanked shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of our services.
          </p>
          
          <h3 className="text-lg font-semibold text-gray-900 mb-2">6. Contact Information</h3>
          <p className="text-gray-600">
            For questions regarding these terms, contact us at hello@tapranked.com or (540) 555-TAPP.
          </p>
        </div>
      </Modal>

      <Modal
        isOpen={showDemoModal}
        onClose={() => setShowDemoModal(false)}
        title="See How It Works"
      >
        <div className="text-center">
          <div className="bg-red-50 p-8 rounded-lg mb-6">
            <div className="w-24 h-24 bg-red-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Smartphone className="h-12 w-12 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Try the Customer Experience</h3>
            <p className="text-gray-600 mb-4">
              Simulate what your customers will experience when they tap their phone on your NFC tag.
            </p>
            <Link href="/tap?nfc=nfc_coffee_001">
              <Button className="bg-red-800 text-white hover:bg-orange-600">
                Try Demo Experience
              </Button>
            </Link>
          </div>
          <p className="text-sm text-gray-500">
            This demo shows the customer journey from tap to reward redemption
          </p>
        </div>
      </Modal>

      <Modal
        isOpen={showLeaderboard}
        onClose={() => setShowLeaderboard(false)}
        title="Global Customer Leaderboard"
      >
        <div className="space-y-4">
          <p className="text-gray-600 mb-6">
            See the most loyal customers across all participating Blacksburg businesses
          </p>
          
          <div className="space-y-3">
            {leaderboardData.slice(0, 20).map((entry, index) => (
              <div
                key={entry.user_id}
                className={`flex items-center justify-between p-4 rounded-lg border ${
                  index < 3 ? "bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200" : "bg-gray-50 border-gray-200"
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold text-white ${
                    index === 0 ? "bg-gradient-to-r from-yellow-400 to-yellow-600" :
                    index === 1 ? "bg-gradient-to-r from-gray-300 to-gray-500" :
                    index === 2 ? "bg-gradient-to-r from-amber-400 to-amber-600" :
                    "bg-gray-400"
                  }`}>
                    {index < 3 ? (
                      index === 0 ? <Crown className="h-5 w-5" /> :
                      <Medal className="h-5 w-5" />
                    ) : (
                      entry.rank
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">{entry.display_name}</span>
                      {entry.badge && <span className="text-lg">{entry.badge}</span>}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span>{entry.total_punches} total punches</span>
                      <span>{entry.businesses_visited} businesses</span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        entry.tier === 'platinum' ? 'bg-purple-100 text-purple-800' :
                        entry.tier === 'gold' ? 'bg-yellow-100 text-yellow-800' :
                        entry.tier === 'silver' ? 'bg-gray-100 text-gray-800' :
                        'bg-amber-100 text-amber-800'
                      }`}>
                        {entry.tier.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-xl text-gray-900">{entry.total_punches}</div>
                  <div className="text-xs text-gray-500">punches</div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="text-center pt-6 border-t">
            <p className="text-sm text-gray-600 mb-4">
              Join the competition! Sign up as a customer to participate in the leaderboard.
            </p>
            <Link href="/auth/login">
              <Button className="bg-red-800 text-white hover:bg-orange-600">
                <Crown className="h-4 w-4 mr-2" />
                Join the Leaderboard
              </Button>
            </Link>
          </div>
        </div>
      </Modal>
      </div>
    </>
  )
}