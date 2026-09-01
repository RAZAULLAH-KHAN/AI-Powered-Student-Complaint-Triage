import { createServiceClient } from '@/lib/supabase/server';
import { analyzeComplaint } from '@/lib/ai/gemini';
import { NextResponse } from 'next/server';

// POST /api/complaints/[id]/regenerate — Re-run AI analysis
export async function POST(request, { params }) {
  try {
    const supabase = createServiceClient();
    const { id } = await params;
    const body = await request.json();

    // Get the complaint
    const { data: complaint, error: fetchError } = await supabase
      .from('complaints')
      .select('complaint_text')
      .eq('id', id)
      .single();

    if (fetchError || !complaint) {
      return NextResponse.json({ error: 'Complaint not found.' }, { status: 404 });
    }

    // Fetch categories and departments
    const [{ data: categories }, { data: departments }] = await Promise.all([
      supabase.from('categories').select('name, description').eq('is_active', true),
      supabase.from('departments').select('name, description').eq('is_active', true),
    ]);

    // Re-run AI analysis
    const analysis = await analyzeComplaint(
      complaint.complaint_text,
      categories || [],
      departments || []
    );

    // Look up IDs
    let ai_category_id = null;
    if (analysis.category) {
      const { data: catData } = await supabase
        .from('categories')
        .select('id')
        .eq('name', analysis.category)
        .single();
      ai_category_id = catData?.id || null;
    }

    let ai_department_id = null;
    if (analysis.department) {
      const { data: deptData } = await supabase
        .from('departments')
        .select('id')
        .eq('name', analysis.department)
        .single();
      ai_department_id = deptData?.id || null;
    }

    // Update the complaint with new AI results
    const { data: updated, error: updateError } = await supabase
      .from('complaints')
      .update({
        ai_category_id,
        ai_subcategory: analysis.subcategory,
        ai_priority: analysis.priority,
        ai_priority_reason: analysis.priority_reason,
        ai_department_id,
        ai_summary: analysis.summary,
        ai_response_draft: analysis.response_draft,
        ai_confidence: analysis.confidence,
        ai_missing_info: analysis.missing_info,
        ai_is_sensitive: analysis.is_sensitive,
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Log history
    await supabase.from('complaint_history').insert({
      complaint_id: id,
      action: 'AI analysis regenerated',
      details: 'Staff requested re-analysis of the complaint',
      new_value: analysis,
      performed_by: body.performed_by || null,
    });

    return NextResponse.json({ complaint: updated, analysis });
  } catch (error) {
    console.error('Regenerate error:', error);
    return NextResponse.json({ error: 'Failed to regenerate AI analysis.' }, { status: 500 });
  }
}
