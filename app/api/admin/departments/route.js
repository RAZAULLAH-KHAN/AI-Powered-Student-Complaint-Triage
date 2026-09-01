import { createServiceClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// GET /api/admin/departments — List departments
export async function GET() {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from('departments')
      .select('*')
      .order('name');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ departments: data || [] });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch departments' }, { status: 500 });
  }
}

// POST /api/admin/departments — Create department
export async function POST(request) {
  try {
    const supabase = createServiceClient();
    const body = await request.json();
    const { name, description } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Department name is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('departments')
      .insert({
        name: name.trim(),
        description: description?.trim() || null,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error('Department insert error:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ department: data }, { status: 201 });
  } catch (error) {
    console.error('Department POST catch error:', error);
    return NextResponse.json({ error: error.message || 'Failed to create department' }, { status: 500 });
  }
}

// PATCH /api/admin/departments — Update department
export async function PATCH(request) {
  try {
    const supabase = createServiceClient();
    const body = await request.json();
    const { id, name, description, is_active } = body;

    if (!id) {
      return NextResponse.json({ error: 'Department ID is required' }, { status: 400 });
    }

    const updates = {};
    if (name !== undefined) updates.name = name.trim();
    if (description !== undefined) updates.description = description.trim();
    if (is_active !== undefined) updates.is_active = is_active;

    const { data, error } = await supabase
      .from('departments')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ department: data });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update department' }, { status: 500 });
  }
}
