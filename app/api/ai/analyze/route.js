import { createServiceClient } from '@/lib/supabase/server';
import { analyzeComplaint } from '@/lib/ai/gemini';
import { NextResponse } from 'next/server';

// POST /api/ai/analyze — Analyze complaint text with AI
export async function POST(request) {
  try {
    const { complaint_text } = await request.json();

    if (!complaint_text || complaint_text.trim().length < 10) {
      return NextResponse.json(
        { error: 'Complaint text must be at least 10 characters.' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Fetch active categories and departments for the AI prompt
    const [{ data: categories }, { data: departments }] = await Promise.all([
      supabase.from('categories').select('name, description').eq('is_active', true),
      supabase.from('departments').select('name, description').eq('is_active', true),
    ]);

    // Run AI analysis
    const analysis = await analyzeComplaint(
      complaint_text.trim(),
      categories || [],
      departments || []
    );

    return NextResponse.json({ analysis });
  } catch (error) {
    console.error('AI Analysis Error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze complaint. Please try again.' },
      { status: 500 }
    );
  }
}
