import { NextResponse } from 'next/server';
import { logoutAdmin } from '@/lib/auth/server';
import { isDemoMode } from '@/lib/supabase';

export async function POST() {
  try {
    if (!isDemoMode) {
      await logoutAdmin();
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin logout error:', error);
    return NextResponse.json({ success: true });
  }
}
