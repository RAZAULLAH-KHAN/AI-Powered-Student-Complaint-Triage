import { createServiceClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = createServiceClient();

    // Fetch complaints
    const { data: complaints, error } = await supabase
      .from('complaints')
      .select(`
        id,
        complaint_number,
        student_name,
        status,
        ai_priority,
        ai_summary,
        created_at,
        ai_department_id,
        ai_category_id
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Stats fetch error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { data: departments } = await supabase
      .from('departments')
      .select('id, name');

    const deptNameMap = {};
    (departments || []).forEach((d) => {
      deptNameMap[d.id] = d.name;
    });

    const all = complaints || [];

    const stats = {
      total: all.length,
      new: all.filter((c) => c.status === 'new').length,
      underReview: all.filter((c) => c.status === 'under_review').length,
      routed: all.filter((c) => c.status === 'routed').length,
      inProgress: all.filter((c) => c.status === 'in_progress').length,
      resolved: all.filter((c) => c.status === 'resolved').length,
      closed: all.filter((c) => c.status === 'closed').length,
      high: all.filter((c) => c.ai_priority === 'high').length,
      critical: all.filter((c) => c.ai_priority === 'critical').length,
    };

    const deptMap = {};
    all.forEach((c) => {
      const name = deptNameMap[c.ai_department_id] || 'Unassigned';
      deptMap[name] = (deptMap[name] || 0) + 1;
    });

    const departmentStats = Object.entries(deptMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    return NextResponse.json({
      stats,
      recentComplaints: all.slice(0, 8),
      departmentStats,
    });
  } catch (error) {
    console.error('Dashboard stats API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    );
  }
}
