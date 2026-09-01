import { createServiceClient } from '@/lib/supabase/server';
import { sendStudentEmail } from '@/lib/email/mailer';
import { NextResponse } from 'next/server';

// GET /api/complaints/[id] — Get single complaint with all relations
export async function GET(request, { params }) {
  try {
    const supabase = createServiceClient();
    const { id } = await params;

    const { data, error } = await supabase
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
      .eq('id', id)
      .single();

    if (error) {
      return NextResponse.json({ error: 'Complaint not found.' }, { status: 404 });
    }

    // Get history
    const { data: history } = await supabase
      .from('complaint_history')
      .select(`
        *,
        performer:profiles!complaint_history_performed_by_fkey(full_name)
      `)
      .eq('complaint_id', id)
      .order('created_at', { ascending: false });

    return NextResponse.json({ complaint: data, history: history || [] });
  } catch (error) {
    console.error('Complaint GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch complaint.' }, { status: 500 });
  }
}

// PATCH /api/complaints/[id] — Update complaint
export async function PATCH(request, { params }) {
  try {
    const supabase = createServiceClient();
    const { id } = await params;
    const body = await request.json();

    const {
      status,
      final_category_id,
      final_priority,
      final_department_id,
      final_response,
      response_sent,
      assigned_to,
      reviewed_by,
      action_description,
      performed_by,
    } = body;

    // Build update object (only include provided fields)
    const updates = {};
    if (status !== undefined) {
      updates.status = status;
      if (status === 'under_review') updates.reviewed_at = new Date().toISOString();
      if (status === 'routed') updates.routed_at = new Date().toISOString();
      if (status === 'resolved') updates.resolved_at = new Date().toISOString();
      if (status === 'closed') updates.closed_at = new Date().toISOString();
    }
    if (final_category_id !== undefined) updates.final_category_id = final_category_id;
    if (final_priority !== undefined) updates.final_priority = final_priority;
    if (final_department_id !== undefined) updates.final_department_id = final_department_id;
    if (final_response !== undefined) updates.final_response = final_response;
    if (response_sent !== undefined) updates.response_sent = response_sent;
    if (assigned_to !== undefined) updates.assigned_to = assigned_to;
    if (reviewed_by !== undefined) updates.reviewed_by = reviewed_by;

    const { data, error } = await supabase
      .from('complaints')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Complaint update error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // If dispatching response to student, send real email if recipient exists
    let mailResult = null;
    if (response_sent === true && (data.student_email || data.complaint_text)) {
      mailResult = await sendStudentEmail({
        to: data.student_email,
        studentName: data.student_name,
        complaintNumber: data.complaint_number,
        responseText: final_response || data.final_response || data.ai_response_draft,
      });
    }

    // Log history
    await supabase.from('complaint_history').insert({
      complaint_id: id,
      action: action_description || 'Complaint updated',
      details: mailResult?.simulated
        ? `${action_description || 'Response sent'} (Email logged to console — configure SMTP in .env.local for live delivery)`
        : mailResult?.success
        ? `${action_description || 'Response sent'} (Email delivered to ${data.student_email})`
        : JSON.stringify(updates),
      new_value: updates,
      performed_by: performed_by || null,
    });

    return NextResponse.json({ complaint: data, mailResult });
  } catch (error) {
    console.error('Complaint PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update complaint.' }, { status: 500 });
  }
}

// DELETE /api/complaints/[id] — Delete complaint case
export async function DELETE(request, { params }) {
  try {
    const supabase = createServiceClient();
    const { id } = await params;

    // Delete history first
    await supabase.from('complaint_history').delete().eq('complaint_id', id);

    // Delete complaint
    const { error } = await supabase
      .from('complaints')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Complaint delete error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Complaint deleted successfully' });
  } catch (error) {
    console.error('Complaint DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete complaint.' }, { status: 500 });
  }
}
