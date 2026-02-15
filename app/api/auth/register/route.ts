import { NextRequest, NextResponse } from 'next/server';
import { registerSchema } from '@/lib/validations';
import { hashPassword, generateSessionToken, setCustomerSession } from '@/lib/auth/server';
import { getSupabaseServer } from '@/lib/supabase';
import { checkRateLimit, getClientIP } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    const rateLimited = checkRateLimit(request, `register:${getClientIP(request)}`, 3, 15 * 60 * 1000);
    if (rateLimited) return rateLimited;

    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { email, password, name, phone } = parsed.data;
    const db = getSupabaseServer();

    // Check if user already exists
    const { data: existingUser } = await db
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .single();

    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      );
    }

    // Hash password with bcrypt
    const passwordHash = await hashPassword(password);

    // Create user
    const { data: user, error: createError } = await db
      .from('users')
      .insert({
        email: email.toLowerCase(),
        name,
        phone: phone || null,
        password_hash: passwordHash,
        is_verified: true,
      })
      .select('id, email, name, phone, created_at')
      .single();

    if (createError || !user) {
      console.error('User creation error:', createError);
      return NextResponse.json(
        { error: 'Failed to create account' },
        { status: 500 }
      );
    }

    // Create session
    const sessionToken = await generateSessionToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await db.from('user_sessions').insert({
      user_id: user.id,
      session_token: sessionToken,
      expires_at: expiresAt.toISOString(),
    });

    // Set httpOnly cookie
    await setCustomerSession(sessionToken);

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        created_at: user.created_at,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Registration failed' },
      { status: 500 }
    );
  }
}
