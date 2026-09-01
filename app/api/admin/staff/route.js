import { createServiceClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// POST /api/admin/staff — Create a new staff member
export async function POST(request) {
  try {
    const supabase = createServiceClient();
    const { email, password, full_name, role, department_id } = await request.json();

    if (!email || !password || !full_name) {
      return NextResponse.json(
        { error: 'Email, password, and full name are required.' },
        { status: 400 }
      );
    }

    // Create auth user with service role
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name,
        role: role || 'staff',
      },
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    // Update profile with department assignment
    if (department_id) {
      await supabase
        .from('profiles')
        .update({ department_id, role: role || 'staff' })
        .eq('id', authData.user.id);
    }

    return NextResponse.json({ user: authData.user }, { status: 201 });
  } catch (error) {
    console.error('Staff creation error:', error);
    return NextResponse.json({ error: 'Failed to create staff member.' }, { status: 500 });
  }
}
