import { NextRequest, NextResponse } from 'next/server'

// Required env vars for real Google Wallet passes:
// GOOGLE_SERVICE_ACCOUNT_EMAIL  - Service account email
// GOOGLE_SERVICE_ACCOUNT_KEY    - Service account private key (base64 encoded)
// GOOGLE_WALLET_ISSUER_ID       - Your Google Wallet issuer ID

const hasGoogleCreds = !!(
  process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
  process.env.GOOGLE_SERVICE_ACCOUNT_KEY &&
  process.env.GOOGLE_WALLET_ISSUER_ID
)

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const businessId = searchParams.get('business_id')
  const businessName = searchParams.get('business_name') || 'Loyalty Card'
  const currentPunches = parseInt(searchParams.get('current_punches') || '0')
  const maxPunches = parseInt(searchParams.get('max_punches') || '10')
  const nextReward = searchParams.get('next_reward') || 'Free reward'

  if (!businessId) {
    return NextResponse.json({ error: 'Missing business_id' }, { status: 400 })
  }

  if (!hasGoogleCreds) {
    return NextResponse.json({
      configured: false,
      preview: { businessName, currentPunches, maxPunches, nextReward },
    })
  }

  try {
    const issuerId = process.env.GOOGLE_WALLET_ISSUER_ID!
    const classId = `${issuerId}.${businessId}`
    const objectId = `${issuerId}.${businessId}_${Date.now()}`

    const loyaltyObject = {
      id: objectId,
      classId,
      state: 'ACTIVE',
      loyaltyPoints: {
        balance: { int: currentPunches },
        label: 'Punches',
      },
      secondaryLoyaltyPoints: {
        balance: { int: maxPunches - currentPunches },
        label: 'Until Reward',
      },
    }

    const payload = {
      iss: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      aud: 'google',
      typ: 'savetowallet',
      iat: Math.floor(Date.now() / 1000),
      payload: {
        loyaltyObjects: [loyaltyObject],
      },
    }

    // Sign the JWT with the service account key
    const keyBase64 = process.env.GOOGLE_SERVICE_ACCOUNT_KEY!
    const keyPem = Buffer.from(keyBase64, 'base64').toString('utf-8')

    const { sign } = await import('crypto')
    const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url')
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
    const signingInput = `${header}.${body}`
    const signature = sign('SHA256', Buffer.from(signingInput), keyPem).toString('base64url')
    const jwt = `${signingInput}.${signature}`

    const saveUrl = `https://pay.google.com/gp/v/save/${jwt}`

    return NextResponse.json({ configured: true, saveUrl })
  } catch (error) {
    console.error('Google Wallet pass generation error:', error)
    return NextResponse.json({ error: 'Failed to generate Google Wallet pass' }, { status: 500 })
  }
}
