import { NextResponse } from 'next/server';
import { logoutCustomer } from '@/lib/auth/server';
import { isDemoMode } from '@/lib/supabase';

export async function POST() {
  try {
    if (!isDemoMode) {
      await logoutCustomer();
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json({ success: true });
  }
}
