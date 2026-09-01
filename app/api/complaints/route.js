import { createServiceClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// GET /api/complaints — List complaints with filters
export async function GET(request) {
  try {
    const supabase = createServiceClient();
    const { searchParams } = new URL(request.url);

    // Build query
    let query = supabase
      .from('complaints')
      .select(`
        *,
        ai_category:categories!complaints_ai_category_id_fkey(id, name),
        ai_department:departments!complaints_ai_department_id_fkey(id, name),
        final_category:categories!complaints_final_category_id_fkey(id, name),
        final_dept:departments!complaints_final_department_id_fkey(id, name),
        creator:profiles!complaints_created_by_fkey(full_name),
        reviewer:profiles!complaints_reviewed_by_fkey(full_name),
        assignee:profiles!complaints_assigned_to_fkey(full_name)
      `)
      .order('created_at', { ascending: false });

    // Apply filters
    const status = searchParams.get('status');
    if (status) {
      const statuses = status.split(',');
      query = query.in('status', statuses);
    }

    const priority = searchParams.get('priority');
    if (priority) {
      const priorities = priority.split(',');
      query = query.in('ai_priority', priorities);
    }

    const department = searchParams.get('department');
    if (department) {
      query = query.eq('ai_department_id', department);
    }

    const category = searchParams.get('category');
    if (category) {
      query = query.eq('ai_category_id', category);
    }

    const search = searchParams.get('search');
    if (search) {
      query = query.or(`student_name.ilike.%${search}%,student_id.ilike.%${search}%,complaint_text.ilike.%${search}%,complaint_number.ilike.%${search}%`);
    }

    // Pagination
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error('Complaints fetch error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      complaints: data || [],
      page,
      limit,
      total: count,
    });
  } catch (error) {
    console.error('Complaints GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch complaints.' }, { status: 500 });
  }
}

// POST /api/complaints — Create new complaint
export async function POST(request) {
  try {
    const supabase = createServiceClient();
    const body = await request.json();

    const {
      student_name,
      student_id,
      student_email,
      complaint_text,
      source = 'manual',
      // AI analysis results
      ai_category,
      ai_subcategory,
      ai_priority,
      ai_priority_reason,
      ai_department,
      ai_summary,
      ai_response_draft,
      ai_confidence,
      ai_missing_info,
      ai_is_sensitive,
      created_by,
    } = body;

    // Validation
    if (!student_name || !complaint_text) {
      return NextResponse.json(
        { error: 'Student name and complaint text are required.' },
        { status: 400 }
      );
    }

    // Look up category ID by name
    let ai_category_id = null;
    if (ai_category) {
      const { data: catData } = await supabase
        .from('categories')
        .select('id')
        .eq('name', ai_category)
        .single();
      ai_category_id = catData?.id || null;
    }

    // Look up department ID by name
    let ai_department_id = null;
    if (ai_department) {
      const { data: deptData } = await supabase
        .from('departments')
        .select('id')
        .eq('name', ai_department)
        .single();
      ai_department_id = deptData?.id || null;
    }

    const { data, error } = await supabase
      .from('complaints')
      .insert({
        student_name,
        student_id: student_id || null,
        student_email: student_email || null,
        complaint_text,
        source,
        status: 'new',
        ai_category_id,
        ai_subcategory: ai_subcategory || null,
        ai_priority: ai_priority || null,
        ai_priority_reason: ai_priority_reason || null,
        ai_department_id,
        ai_summary: ai_summary || null,
        ai_response_draft: ai_response_draft || null,
        ai_confidence: ai_confidence || null,
        ai_missing_info: ai_missing_info || null,
        ai_is_sensitive: ai_is_sensitive || false,
        created_by: created_by || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Complaint create error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log history
    await supabase.from('complaint_history').insert({
      complaint_id: data.id,
      action: 'Complaint created',
      details: `New complaint from ${student_name} via ${source}`,
      performed_by: created_by || null,
    });

    return NextResponse.json({ complaint: data }, { status: 201 });
  } catch (error) {
    console.error('Complaints POST error:', error);
    return NextResponse.json({ error: 'Failed to create complaint.' }, { status: 500 });
  }
}
