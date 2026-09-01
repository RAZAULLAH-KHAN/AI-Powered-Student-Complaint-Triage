import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Analyze a student complaint using Gemini AI.
 * Returns structured classification, priority, department, summary, and response draft.
 *
 * @param {string} complaintText - The raw complaint text from the student
 * @param {Array} categories - Available categories [{name, description}]
 * @param {Array} departments - Available departments [{name, description}]
 * @returns {Object} AI analysis result
 */
export async function analyzeComplaint(complaintText, categories = [], departments = []) {
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.3,
      maxOutputTokens: 2048,
    },
  });

  const categoryList = categories.map((c) => `- ${c.name}: ${c.description || ''}`).join('\n');
  const departmentList = departments.map((d) => `- ${d.name}: ${d.description || ''}`).join('\n');

  const prompt = `You are an AI assistant for a university complaint triage system. Your job is to analyze student complaints and provide structured classification.

## AVAILABLE CATEGORIES:
${categoryList || '- Finance, Examination, IT, Admissions, Hostel, Library, Transport, Academic, Student Affairs, Other'}

## AVAILABLE DEPARTMENTS:
${departmentList || '- IT, Finance, Examination, Admissions, Hostel, Library, Transport, Academic, Student Affairs'}

## RULES:
1. You MUST select a category and department ONLY from the lists above.
2. Priority levels: "low", "normal", "high", "critical"
3. Confidence levels: "low", "medium", "high"
4. Do NOT invent university policies, deadlines, refund decisions, or promises.
5. Do NOT claim the issue has been resolved or that specific actions have been taken.
6. If the complaint mentions an upcoming deadline, exam, or time-sensitive event, set priority to "high" or "critical".
7. Flag complaints involving disciplinary matters, safety, financial disputes, legal issues, or serious academic disputes as sensitive.
8. If information is missing (like student ID, payment reference, etc.), note it in missing_info.
9. The response draft should be professional, empathetic, and acknowledge the student's concern WITHOUT making promises or stating facts you don't know.
10. Keep the summary concise (1-2 sentences max).
11. If the complaint could belong to multiple categories, choose the most appropriate one and note the ambiguity in priority_reason.

## STUDENT COMPLAINT:
"${complaintText}"

## RESPOND WITH THIS EXACT JSON STRUCTURE:
{
  "category": "category name from list above",
  "subcategory": "more specific sub-category if applicable, or null",
  "priority": "low | normal | high | critical",
  "priority_reason": "short explanation for the priority level",
  "department": "department name from list above",
  "summary": "1-2 sentence summary of the complaint",
  "response_draft": "professional response draft for the student",
  "confidence": "low | medium | high",
  "missing_info": "list any missing information, or null",
  "is_sensitive": false
}`;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    // Parse the JSON response
    let analysis;
    try {
      analysis = JSON.parse(text);
    } catch (parseError) {
      // Try to extract JSON from the response if it contains extra text
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Failed to parse AI response as JSON');
      }
    }

    // Validate and normalize the response
    return {
      category: analysis.category || 'Other',
      subcategory: analysis.subcategory || null,
      priority: ['low', 'normal', 'high', 'critical'].includes(analysis.priority)
        ? analysis.priority
        : 'normal',
      priority_reason: analysis.priority_reason || 'Standard priority assigned.',
      department: analysis.department || 'Student Affairs',
      summary: analysis.summary || 'Complaint requires review.',
      response_draft: analysis.response_draft || 'Thank you for your complaint. It has been forwarded to the relevant department for review.',
      confidence: ['low', 'medium', 'high'].includes(analysis.confidence)
        ? analysis.confidence
        : 'medium',
      missing_info: analysis.missing_info || null,
      is_sensitive: analysis.is_sensitive === true,
    };
  } catch (error) {
    console.error('Gemini AI Error:', error);

    // Return a safe fallback
    return {
      category: 'Other',
      subcategory: null,
      priority: 'normal',
      priority_reason: 'AI analysis failed. Manual review required.',
      department: 'Student Affairs',
      summary: 'AI analysis could not be completed. Please review manually.',
      response_draft: 'Thank you for reaching out. Your complaint has been received and will be reviewed by our staff.',
      confidence: 'low',
      missing_info: null,
      is_sensitive: false,
      error: error.message,
    };
  }
}
