import { NextResponse } from 'next/server';
import { getCurrentCustomer } from '@/lib/auth/server';
import { isDemoMode } from '@/lib/supabase';

export async function GET() {
  try {
    if (isDemoMode) {
      return NextResponse.json({ user: null, demo: true });
    }

    const user = await getCurrentCustomer();

    if (!user) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Session check error:', error);
    return NextResponse.json({ user: null }, { status: 401 });
  }
}
