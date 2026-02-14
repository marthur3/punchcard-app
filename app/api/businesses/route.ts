import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer, isDemoMode } from '@/lib/supabase';

// GET /api/businesses?nfc_tag_id=xxx or GET /api/businesses?id=xxx
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const nfcTagId = searchParams.get('nfc_tag_id');
    const businessId = searchParams.get('id');

    if (isDemoMode) {
      const { demoBusinesses } = await import('@/lib/demo-data');
      if (nfcTagId) {
        const found = demoBusinesses.find((b: any) => b.nfc_tag_id === nfcTagId);
        if (found) return NextResponse.json({ business: found });
        return NextResponse.json({ error: 'Business not found' }, { status: 404 });
      }
      if (businessId) {
        const found = demoBusinesses.find((b: any) => b.id === businessId);
        if (found) return NextResponse.json({ business: found });
        return NextResponse.json({ error: 'Business not found' }, { status: 404 });
      }
      return NextResponse.json({ businesses: demoBusinesses });
    }

    const db = getSupabaseServer();

    if (nfcTagId) {
      const { data: business, error } = await db
        .from('businesses')
        .select('id, name, description, logo_url, nfc_tag_id, max_punches')
        .eq('nfc_tag_id', nfcTagId)
        .single();

      if (error || !business) {
        return NextResponse.json(
          { error: 'Business not found' },
          { status: 404 }
        );
      }
      return NextResponse.json({ business });
    }

    if (businessId) {
      const { data: business, error } = await db
        .from('businesses')
        .select('id, name, description, logo_url, nfc_tag_id, max_punches')
        .eq('id', businessId)
        .single();

      if (error || !business) {
        return NextResponse.json(
          { error: 'Business not found' },
          { status: 404 }
        );
      }
      return NextResponse.json({ business });
    }

    // List all businesses (public)
    const { data: businesses, error } = await db
      .from('businesses')
      .select('id, name, description, logo_url, nfc_tag_id, max_punches')
      .order('name');

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch businesses' },
        { status: 500 }
      );
    }

    return NextResponse.json({ businesses: businesses || [] });
  } catch (error) {
    console.error('Businesses fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch businesses' },
      { status: 500 }
    );
  }
}
