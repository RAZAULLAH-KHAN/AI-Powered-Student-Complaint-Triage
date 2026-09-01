import { createServiceClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const supabase = createServiceClient();

    // Fetch existing categories and departments to map IDs
    const [{ data: categories }, { data: departments }] = await Promise.all([
      supabase.from('categories').select('id, name'),
      supabase.from('departments').select('id, name'),
    ]);

    const catMap = {};
    (categories || []).forEach((c) => { catMap[c.name.toLowerCase()] = c.id; });

    const deptMap = {};
    (departments || []).forEach((d) => { deptMap[d.name.toLowerCase()] = d.id; });

    const sampleComplaints = [
      {
        student_name: 'Ahmad Bilal',
        student_id: 'FA21-BCS-042',
        student_email: 'ahmad.bilal@student.edu',
        complaint_text: 'My final examination is tomorrow morning at 9:00 AM and my admit card/registration has disappeared from the student portal. I cannot print my slip.',
        source: 'whatsapp',
        status: 'new',
        ai_category_name: 'examination',
        ai_subcategory: 'Admit Card / Exam Registration',
        ai_priority: 'critical',
        ai_priority_reason: 'Student mentions an upcoming final examination tomorrow morning with missing admit card.',
        ai_department_name: 'examination',
        ai_summary: 'Student cannot access examination admit card on portal for tomorrow morning exam.',
        ai_response_draft: 'Dear Ahmad, we have prioritized your urgent examination registration issue. The Examination Office has been immediately notified regarding your admit card status for tomorrow.',
        ai_confidence: 'high',
        ai_is_sensitive: false,
      },
      {
        student_name: 'Fatima Noor',
        student_id: 'SP22-BSE-108',
        student_email: 'fatima.noor@student.edu',
        complaint_text: 'Sir I paid my semester tuition fee yesterday through online banking but the portal still says unpaid and course registration closes tomorrow evening. Please help verify.',
        source: 'email',
        status: 'under_review',
        ai_category_name: 'finance',
        ai_subcategory: 'Tuition Fee Verification',
        ai_priority: 'high',
        ai_priority_reason: 'Registration deadline closes tomorrow and fee verification is pending.',
        ai_department_name: 'finance',
        ai_summary: 'Paid tuition fee is not reflected on portal while registration deadline closes tomorrow.',
        ai_response_draft: 'Dear Fatima, thank you for contacting us. We have received your payment verification inquiry and routed it to the Finance Department along with your deadline urgency.',
        ai_confidence: 'high',
        ai_is_sensitive: false,
      },
      {
        student_name: 'Usman Tariq',
        student_id: 'FA23-BAI-019',
        student_email: 'usman.tariq@student.edu',
        complaint_text: 'My LMS account is giving error 403 Forbidden since morning and I have an assignment due tonight at 11:59 PM for CS-301. Tried clearing cache without success.',
        source: 'manual',
        status: 'routed',
        ai_category_name: 'it',
        ai_subcategory: 'LMS Account Access',
        ai_priority: 'high',
        ai_priority_reason: 'LMS account login failure with assignment deadline approaching tonight.',
        ai_department_name: 'it',
        ai_summary: 'Student is locked out of LMS with error 403 before tonight assignment deadline.',
        ai_response_draft: 'Dear Usman, your LMS account access issue has been forwarded to the IT Support team. The course instructor has also been notified of the technical difficulty.',
        ai_confidence: 'high',
        ai_is_sensitive: false,
      },
      {
        student_name: 'Zainab Qureshi',
        student_id: 'SP21-BEE-077',
        student_email: 'zainab.q@student.edu',
        complaint_text: 'The air conditioning unit in Hostel Block B, room 204 has been malfunctioning for 3 days. We submitted a maintenance slip to the warden office on Monday.',
        source: 'manual',
        status: 'in_progress',
        ai_category_name: 'hostel',
        ai_subcategory: 'Room Maintenance',
        ai_priority: 'normal',
        ai_priority_reason: 'Hostel facility maintenance request requiring routine departmental repair.',
        ai_department_name: 'hostel',
        ai_summary: 'Air conditioning in Hostel Block B room 204 requires maintenance following prior slip.',
        ai_response_draft: 'Dear Zainab, thank you for following up. The Hostel Management team has scheduled maintenance technicians for Block B today.',
        ai_confidence: 'high',
        ai_is_sensitive: false,
      },
      {
        student_name: 'Hamza Malik',
        student_id: 'FA22-BCS-154',
        student_email: 'hamza.m@student.edu',
        complaint_text: 'I was charged a Rs 2,000 late fee fine on my voucher, but my bank receipt timestamp shows transaction on the 15th before the due date cutoff.',
        source: 'email',
        status: 'new',
        ai_category_name: 'finance',
        ai_subcategory: 'Late Fee Dispute',
        ai_priority: 'normal',
        ai_priority_reason: 'Fee adjustment dispute regarding transaction timestamp verification.',
        ai_department_name: 'finance',
        ai_summary: 'Student disputes late fee penalty with bank transaction proof before due date.',
        ai_response_draft: 'Dear Hamza, thank you for providing the receipt details. Your case is currently being reviewed by the Accounts branch for voucher adjustment.',
        ai_confidence: 'high',
        ai_is_sensitive: false,
      },
      {
        student_name: 'Sara Khan',
        student_id: 'SP23-BBA-033',
        student_email: 'sara.k@student.edu',
        complaint_text: 'The university route 5 shuttle bus arrived 40 minutes late today at Gulshan stop, causing several students to arrive after class attendance was marked.',
        source: 'whatsapp',
        status: 'resolved',
        ai_category_name: 'transport',
        ai_subcategory: 'Bus Schedule & Punctuality',
        ai_priority: 'low',
        ai_priority_reason: 'Transport schedule delay complaint resolved with fleet coordinator.',
        ai_department_name: 'transport',
        ai_summary: 'Route 5 bus delay affected class attendance for Gulshan pickup students.',
        ai_response_draft: 'Dear Sara, the Transport Office has investigated the route 5 delay caused by temporary road construction. Backup drivers have been assigned to ensure punctual morning service.',
        ai_confidence: 'high',
        ai_is_sensitive: false,
        response_sent: true,
      },
      {
        student_name: 'Ali Raza',
        student_id: 'FA20-BCS-005',
        student_email: 'ali.raza@student.edu',
        complaint_text: 'I completed Linear Algebra during semester exchange in Turkey but the credit transfer is not reflecting on my degree audit for graduation clearance.',
        source: 'manual',
        status: 'under_review',
        ai_category_name: 'academic',
        ai_subcategory: 'Course Credit Transfer',
        ai_priority: 'normal',
        ai_priority_reason: 'Credit transfer documentation verification for graduation audit.',
        ai_department_name: 'academic',
        ai_summary: 'Exchange program credit transfer for Linear Algebra pending graduation degree audit.',
        ai_response_draft: 'Dear Ali, your academic credit transfer application and official transcript are currently under review with the Academic Evaluation Committee.',
        ai_confidence: 'high',
        ai_is_sensitive: false,
      },
    ];

    const inserted = [];
    for (const item of sampleComplaints) {
      const catId = catMap[item.ai_category_name] || null;
      const deptId = deptMap[item.ai_department_name] || null;

      const { data, error } = await supabase
        .from('complaints')
        .insert({
          student_name: item.student_name,
          student_id: item.student_id,
          student_email: item.student_email,
          complaint_text: item.complaint_text,
          source: item.source,
          status: item.status,
          ai_category_id: catId,
          ai_subcategory: item.ai_subcategory,
          ai_priority: item.ai_priority,
          ai_priority_reason: item.ai_priority_reason,
          ai_department_id: deptId,
          ai_summary: item.ai_summary,
          ai_response_draft: item.ai_response_draft,
          ai_confidence: item.ai_confidence,
          ai_is_sensitive: item.ai_is_sensitive,
          response_sent: item.response_sent || false,
        })
        .select()
        .single();

      if (!error && data) {
        inserted.push(data);
        await supabase.from('complaint_history').insert({
          complaint_id: data.id,
          action: 'Complaint logged into system',
          details: `Source: ${item.source}, Initial status: ${item.status}`,
        });
      }
    }

    return NextResponse.json({
      message: `Successfully seeded ${inserted.length} sample complaints`,
      count: inserted.length,
    });
  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json({ error: 'Failed to seed sample complaints' }, { status: 500 });
  }
}
