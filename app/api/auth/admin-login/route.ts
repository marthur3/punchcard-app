import { NextRequest, NextResponse } from 'next/server';
import { adminLoginSchema } from '@/lib/validations';
import { verifyPassword, generateSessionToken, setAdminSession } from '@/lib/auth/server';
import { getSupabaseServer, isDemoMode } from '@/lib/supabase';
import { checkRateLimit, getClientIP } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    const rateLimited = checkRateLimit(request, `admin-login:${getClientIP(request)}`, 5, 15 * 60 * 1000);
    if (rateLimited) return rateLimited;

    const body = await request.json();
    const parsed = adminLoginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;

    if (isDemoMode) {
      // In demo mode, allow any admin login
      return NextResponse.json({
        success: true,
        admin: {
          id: 'demo-admin',
          email,
          name: 'Demo Admin',
          business_id: 'demo-business',
          role: 'owner',
        },
        demo: true,
      });
    }

    const db = getSupabaseServer();

    // Find admin by email
    const { data: admin, error } = await db
      .from('business_admins')
      .select('id, email, name, business_id, password_hash, role, is_verified')
      .eq('email', email.toLowerCase())
      .single();

    if (error || !admin) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Verify password
    const isValid = await verifyPassword(password, admin.password_hash);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Create session
    const sessionToken = await generateSessionToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await db.from('business_admin_sessions').insert({
      admin_id: admin.id,
      session_token: sessionToken,
      expires_at: expiresAt.toISOString(),
    });

    // Update last_login
    await db
      .from('business_admins')
      .update({ last_login: new Date().toISOString() })
      .eq('id', admin.id);

    // Set httpOnly cookie
    await setAdminSession(sessionToken);

    return NextResponse.json({
      success: true,
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        business_id: admin.business_id,
        role: admin.role,
      },
    });
  } catch (error) {
    console.error('Admin login error:', error);
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    );
  }
}
