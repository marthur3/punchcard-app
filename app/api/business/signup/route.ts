import { NextRequest, NextResponse } from 'next/server';
import { businessSignupSchema } from '@/lib/validations';
import { hashPassword, generateSessionToken, setAdminSession } from '@/lib/auth/server';
import { getSupabaseServer, isDemoMode } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    if (isDemoMode) {
      return NextResponse.json(
        { error: 'Business signup not available in demo mode' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const parsed = businessSignupSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const db = getSupabaseServer();

    // Check if admin email already exists
    const { data: existingAdmin } = await db
      .from('business_admins')
      .select('id')
      .eq('email', data.admin_email.toLowerCase())
      .single();

    if (existingAdmin) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      );
    }

    // Generate NFC tag ID
    const slug = data.business_name.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_');
    const nfcTagId = `nfc_${slug}_${Date.now()}`;

    // Create business
    const { data: business, error: bizError } = await db
      .from('businesses')
      .insert({
        name: data.business_name,
        description: data.business_description || null,
        max_punches: data.max_punches,
        nfc_tag_id: nfcTagId,
      })
      .select('*')
      .single();

    if (bizError || !business) {
      console.error('Business creation error:', bizError);
      return NextResponse.json(
        { error: 'Failed to create business' },
        { status: 500 }
      );
    }

    // Create default prize if provided
    if (data.default_reward) {
      await db.from('prizes').insert({
        business_id: business.id,
        name: data.default_reward,
        description: data.reward_description || null,
        punches_required: data.max_punches,
        is_active: true,
      });
    }

    // Hash admin password and create admin account
    const passwordHash = await hashPassword(data.admin_password);

    const { data: admin, error: adminError } = await db
      .from('business_admins')
      .insert({
        business_id: business.id,
        email: data.admin_email.toLowerCase(),
        name: data.admin_name,
        password_hash: passwordHash,
        is_verified: true,
        role: 'owner',
      })
      .select('id, email, name, business_id, role')
      .single();

    if (adminError || !admin) {
      console.error('Admin creation error:', adminError);
      // Clean up business if admin creation fails
      await db.from('businesses').delete().eq('id', business.id);
      return NextResponse.json(
        { error: 'Failed to create admin account' },
        { status: 500 }
      );
    }

    // Create admin session
    const sessionToken = await generateSessionToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await db.from('business_admin_sessions').insert({
      admin_id: admin.id,
      session_token: sessionToken,
      expires_at: expiresAt.toISOString(),
    });

    await setAdminSession(sessionToken);

    return NextResponse.json({
      success: true,
      business: {
        id: business.id,
        name: business.name,
        nfc_tag_id: nfcTagId,
      },
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
      },
    });
  } catch (error) {
    console.error('Business signup error:', error);
    return NextResponse.json(
      { error: 'Signup failed' },
      { status: 500 }
    );
  }
}
