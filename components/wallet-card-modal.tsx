"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"

interface WalletCardModalProps {
  businessName: string
  businessId: string
  currentPunches: number
  maxPunches: number
  nextReward: string
  customerName: string
  open: boolean
  onClose: () => void
}

export function WalletCardModal({
  businessName,
  businessId,
  currentPunches,
  maxPunches,
  nextReward,
  customerName,
  open,
  onClose,
}: WalletCardModalProps) {
  const [appleLoading, setAppleLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  if (!open) return null

  const progress = Math.round((currentPunches / maxPunches) * 100)
  const remaining = maxPunches - currentPunches

  const handleAppleWallet = async () => {
    setAppleLoading(true)
    try {
      const params = new URLSearchParams({
        business_id: businessId,
        business_name: businessName,
        current_punches: String(currentPunches),
        max_punches: String(maxPunches),
        next_reward: nextReward,
        customer_name: customerName,
      })
      const res = await fetch(`/api/wallet/apple?${params}`)
      const contentType = res.headers.get('content-type') || ''

      if (contentType.includes('pkpass')) {
        // Real pass — trigger download/add to wallet
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${businessName}_loyalty.pkpass`
        a.click()
        URL.revokeObjectURL(url)
      } else {
        // Not configured yet — card is already shown as preview
        alert('Apple Wallet integration coming soon! Your card is shown above.')
      }
    } catch {
      alert('Could not connect to wallet service.')
    } finally {
      setAppleLoading(false)
    }
  }

  const handleGoogleWallet = async () => {
    setGoogleLoading(true)
    try {
      const params = new URLSearchParams({
        business_id: businessId,
        business_name: businessName,
        current_punches: String(currentPunches),
        max_punches: String(maxPunches),
        next_reward: nextReward,
      })
      const res = await fetch(`/api/wallet/google?${params}`)
      const data = await res.json()

      if (data.configured && data.saveUrl) {
        window.open(data.saveUrl, '_blank')
      } else {
        alert('Google Wallet integration coming soon! Your card is shown above.')
      }
    } catch {
      alert('Could not connect to wallet service.')
    } finally {
      setGoogleLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.75)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Apple Wallet style card */}
        <div
          className="relative rounded-3xl overflow-hidden shadow-2xl"
          style={{
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
            minHeight: 220,
            padding: '28px 28px 24px',
          }}
        >
          {/* Top row */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="text-xs font-semibold tracking-widest" style={{ color: '#7eb8f7' }}>
                LOYALTY CARD
              </div>
              <div className="text-xl font-bold text-white mt-0.5">{businessName}</div>
            </div>
            <div className="text-right">
              <div className="text-xs tracking-widest" style={{ color: '#7eb8f7' }}>PUNCHES</div>
              <div className="text-2xl font-bold text-white">{currentPunches}/{maxPunches}</div>
            </div>
          </div>

          {/* Punch dots */}
          <div className="flex flex-wrap gap-2 mb-5">
            {Array.from({ length: maxPunches }).map((_, i) => (
              <div
                key={i}
                className="rounded-full transition-all"
                style={{
                  width: 28,
                  height: 28,
                  background: i < currentPunches
                    ? 'linear-gradient(135deg, #f59e0b, #ef4444)'
                    : 'rgba(255,255,255,0.12)',
                  border: i < currentPunches ? 'none' : '1.5px solid rgba(255,255,255,0.2)',
                  boxShadow: i < currentPunches ? '0 0 8px rgba(245,158,11,0.6)' : 'none',
                }}
              />
            ))}
          </div>

          {/* Bottom row */}
          <div className="flex items-end justify-between">
            <div>
              <div className="text-xs tracking-widest mb-0.5" style={{ color: '#7eb8f7' }}>NEXT REWARD</div>
              <div className="text-sm font-semibold text-white">{nextReward}</div>
            </div>
            <div className="text-right">
              <div className="text-xs tracking-widest mb-0.5" style={{ color: '#7eb8f7' }}>MEMBER</div>
              <div className="text-sm font-medium text-white">{customerName}</div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-4 rounded-full overflow-hidden" style={{ height: 4, background: 'rgba(255,255,255,0.15)' }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${progress}%`,
                background: 'linear-gradient(90deg, #f59e0b, #ef4444)',
              }}
            />
          </div>
          <div className="text-xs mt-1.5 text-right" style={{ color: 'rgba(255,255,255,0.5)' }}>
            {remaining === 0 ? 'Ready to redeem!' : `${remaining} more ${remaining === 1 ? 'punch' : 'punches'} to go`}
          </div>

          {/* TapRanked watermark */}
          <div className="absolute top-4 right-4 opacity-20">
            <div className="text-white text-xs font-bold tracking-wider">TapRanked</div>
          </div>
        </div>

        {/* Wallet buttons */}
        <div className="space-y-3">
          <button
            onClick={handleAppleWallet}
            disabled={appleLoading}
            className="w-full flex items-center justify-center gap-2 rounded-2xl py-3.5 font-semibold text-white text-sm transition-opacity disabled:opacity-60"
            style={{ background: '#000', border: '1.5px solid #333' }}
          >
            {appleLoading ? (
              <span>Generating pass...</span>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                </svg>
                Add to Apple Wallet
              </>
            )}
          </button>

          <button
            onClick={handleGoogleWallet}
            disabled={googleLoading}
            className="w-full flex items-center justify-center gap-2 rounded-2xl py-3.5 font-semibold text-white text-sm transition-opacity disabled:opacity-60"
            style={{ background: '#1a73e8' }}
          >
            {googleLoading ? (
              <span>Generating pass...</span>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                  <path d="M21.56 10.74l-9.3-9.3a1 1 0 0 0-1.41 0l-9.3 9.3a1 1 0 0 0 0 1.41l9.3 9.3a1 1 0 0 0 1.41 0l9.3-9.3a1 1 0 0 0 0-1.41zM11 16v-4H7l5-8v4h4z"/>
                </svg>
                Save to Google Wallet
              </>
            )}
          </button>
        </div>

        <button
          onClick={onClose}
          className="w-full text-center text-sm py-2 rounded-xl transition-colors"
          style={{ color: 'rgba(255,255,255,0.6)' }}
        >
          Close
        </button>
      </div>
    </div>
  )
}
