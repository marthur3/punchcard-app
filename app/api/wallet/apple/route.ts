import { NextRequest, NextResponse } from 'next/server'

// Required env vars for real .pkpass generation (once you have Apple Developer account):
// APPLE_CERT_BASE64     - Signing certificate (PEM, base64 encoded)
// APPLE_KEY_BASE64      - Private key matching the cert (PEM, base64 encoded)
// APPLE_WWDR_BASE64     - Apple WWDR G4 intermediate cert (base64 encoded)
// APPLE_PASS_TYPE_ID    - e.g. "pass.com.tapranked.loyalty"
// APPLE_TEAM_ID         - Your Apple Developer Team ID

const hasAppleCerts = !!(
  process.env.APPLE_CERT_BASE64 &&
  process.env.APPLE_KEY_BASE64 &&
  process.env.APPLE_WWDR_BASE64 &&
  process.env.APPLE_PASS_TYPE_ID &&
  process.env.APPLE_TEAM_ID
)

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const businessId = searchParams.get('business_id')
  const businessName = searchParams.get('business_name') || 'Loyalty Card'
  const currentPunches = parseInt(searchParams.get('current_punches') || '0')
  const maxPunches = parseInt(searchParams.get('max_punches') || '10')
  const nextReward = searchParams.get('next_reward') || 'Free reward'
  const customerName = searchParams.get('customer_name') || 'Member'

  if (!businessId) {
    return NextResponse.json({ error: 'Missing business_id' }, { status: 400 })
  }

  // Pass structure (pass.json contents) — ready to use with passkit-generator once certs arrive
  const passJson = {
    formatVersion: 1,
    passTypeIdentifier: process.env.APPLE_PASS_TYPE_ID || 'pass.com.tapranked.loyalty',
    serialNumber: `${businessId}-${customerName.replace(/\s+/g, '-').toLowerCase()}`,
    teamIdentifier: process.env.APPLE_TEAM_ID || 'XXXXXXXXXX',
    organizationName: businessName,
    description: `${businessName} Loyalty Card`,
    backgroundColor: 'rgb(30, 30, 30)',
    foregroundColor: 'rgb(255, 255, 255)',
    labelColor: 'rgb(126, 184, 247)',
    storeCard: {
      headerFields: [
        { key: 'punches', label: 'PUNCHES', value: `${currentPunches}/${maxPunches}` },
      ],
      primaryFields: [
        { key: 'business', label: 'LOYALTY CARD', value: businessName },
      ],
      secondaryFields: [
        { key: 'next_reward', label: 'NEXT REWARD', value: nextReward },
        { key: 'customer', label: 'MEMBER', value: customerName },
      ],
      auxiliaryFields: [
        {
          key: 'progress',
          label: 'PROGRESS',
          value: `${Math.round((currentPunches / maxPunches) * 100)}% complete`,
        },
      ],
      backFields: [
        {
          key: 'about',
          label: 'About TapRanked',
          value: 'Tap the NFC stand at each visit to collect punches and earn free rewards.',
        },
        {
          key: 'redeem',
          label: 'Redeeming Rewards',
          value: 'Show this card to staff when you reach your punch goal.',
        },
      ],
    },
  }

  // When Apple certs are configured, generate and return real .pkpass
  if (hasAppleCerts) {
    try {
      const { PKPass } = await import('passkit-generator')

      const certBuffer = Buffer.from(process.env.APPLE_CERT_BASE64!, 'base64')
      const keyBuffer = Buffer.from(process.env.APPLE_KEY_BASE64!, 'base64')
      const wwdrBuffer = Buffer.from(process.env.APPLE_WWDR_BASE64!, 'base64')

      const pass = new PKPass(
        { 'pass.json': Buffer.from(JSON.stringify(passJson)) },
        { wwdr: wwdrBuffer, signerCert: certBuffer, signerKey: keyBuffer }
      )

      const buffer = pass.getAsBuffer()

      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'application/vnd.apple.pkpass',
          'Content-Disposition': `attachment; filename="${businessName.replace(/\s+/g, '_')}_loyalty.pkpass"`,
          'Cache-Control': 'no-cache',
        },
      })
    } catch (error) {
      console.error('Apple Wallet pass generation error:', error)
      return NextResponse.json({ error: 'Failed to generate pass' }, { status: 500 })
    }
  }

  // No certs yet — return pass preview data for the card UI
  return NextResponse.json({
    configured: false,
    passJson,
    preview: {
      businessName,
      currentPunches,
      maxPunches,
      nextReward,
      customerName,
    },
  })
}
