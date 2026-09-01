# AI-Powered Student Complaint Triage Assistant

A full-stack, enterprise-grade web application built with **Next.js 14+ (App Router)**, **Google Gemini 2.0 AI**, **Supabase (PostgreSQL & Auth)**, and **Nodemailer**. Designed to automate, classify, prioritize, route, and draft official responses for student grievances while keeping university staff in full control.

---

## 🌟 Key Features

### 🤖 1. Automated Gemini 2.0 AI Triage
- **Multi-Category Classification**: Automatically maps incoming complaints into university categories (`Finance`, `Examination`, `IT`, `Admissions`, `Hostel`, `Library`, `Transport`, `Academic`, `Student Affairs`).
- **Urgency Assessment**: Evaluates complaint text for approaching deadlines, exam dates, or critical grievances to assign priority levels (`low`, `normal`, `high`, `critical`) with explicit reasoning.
- **Smart Department Routing**: Recommends the responsible university department.
- **Executive Summaries**: Summarizes raw student text into 1–2 actionable sentences.
- **Information Gap & Sensitivity Flags**: Identifies missing student details (e.g., transaction ID, roll number) and flags sensitive/disciplinary complaints for human review.
- **Empathetic Response Drafting**: Generates professional, policy-compliant response drafts.

### 👤 2. Human-in-the-Loop Staff Review & Triage
- **Staff Overrides**: University staff can override AI-recommended categories, priorities, and assigned departments with a single click.
- **Response Editor**: Staff can edit, preview, and refine AI-drafted responses before sending.
- **Official Email Dispatch**: Integrates with SMTP (Gmail/Nodemailer) to deliver official HTML response emails directly to student inboxes when staff click *"Mark Response as Sent"*.
- **Workflow Status Lifecycle**: Moves complaints seamlessly through `New` ➔ `Under Review` ➔ `Routed` ➔ `In Progress` ➔ `Resolved` ➔ `Closed`.
- **Complete Audit Trail**: Every action, status change, override, and email dispatch is timestamped and recorded in `complaint_history`.

### 📊 3. Real-Time Triage Dashboard & Analytics
- **Live Metrics**: At-a-glance stats for Total Cases, New Intake, High/Critical Urgency, In Progress, and Resolved complaints.
- **Department Load Distribution**: Visual volume bars highlighting workload per department.
- **Quick Action Filters**: 1-click filtering for high-priority cases and unreviewed intake.
- **1-Click Sample Data Generator**: Pre-populates 6+ realistic PRD-compliant complaints for instant demonstration.

### 🌓 4. Senior Dual-Theme UI System (Day & Dark Mode)
- Built with a custom vanilla CSS design system (zero Tailwind dependencies).
- Features a persistent **Theme Switcher** (saves preference in `localStorage`).
- Clean, typography-focused UI with no clutter or generic icons.

### ⚙️ 5. Administrative Management
- **Department Management**: Create, edit, and toggle active/inactive status for departments.
- **Category Management**: Define custom complaint categories for AI classification.
- **Staff & Role Management**: Invite staff, assign roles (`admin`, `staff`, `department_staff`), and bind accounts to specific departments.

---

## 🏗️ System Architecture

```text
STUDENT INTAKE
  (Email / WhatsApp / Walk-in)
        │
        ▼
┌─────────────────────────────────────────────────────────────┐
│ Next.js 14+ Frontend (React App Router)                    │
│  ├─ Staff Dashboard                                         │
│  ├─ Staff Review & Triage Screen                            │
│  ├─ Filterable Complaint Case Records                       │
│  └─ Day / Dark Theme Engine                                 │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ Serverless Node.js API Backend                              │
│  ├─ Auth & Route Protection Middleware                      │
│  ├─ REST API (/api/complaints, /api/dashboard/stats, etc.)  │
│  └─ Nodemailer Outbound Email Dispatcher                    │
└──────────────┬───────────────┼───────────────┬──────────────┘
               │               │               │
               ▼               ▼               ▼
┌──────────────────────┐ ┌───────────┐ ┌──────────────────────┐
│ Supabase Database    │ │ Gemini AI │ │ Supabase Auth        │
│ (PostgreSQL + RLS)   │ │ (2.0 Flash)│ │ (Role-Based Access) │
└──────────────────────┘ └───────────┘ └──────────────────────┘
```

---

## 🛠️ Technology Stack

- **Framework**: [Next.js 14+](https://nextjs.org/) (App Router, Server Actions, API Routes)
- **Frontend Logic & UI**: React 18, Custom CSS Custom Properties (Dual-Theme Architecture)
- **Database & Authentication**: [Supabase](https://supabase.com/) (PostgreSQL, Row Level Security, SSR Cookies)
- **AI Model**: [@google/generative-ai](https://www.npmjs.com/package/@google/generative-ai) (`gemini-2.0-flash`)
- **Email Service**: [Nodemailer](https://nodemailer.com/) (SMTP / Gmail Integration)

---

## 📁 Project Structure

```text
complaint-triage/
├── app/
│   ├── layout.js                          # Root layout with metadata
│   ├── page.js                            # Redirects to /dashboard
│   ├── globals.css                        # Dual-theme CSS design system
│   ├── login/page.js                      # Glassmorphism auth screen
│   ├── auth/callback/route.js             # Supabase auth confirmation callback
│   ├── (dashboard)/                       # Authenticated Layout Group
│   │   ├── layout.js                      # Sidebar navigation wrapper
│   │   ├── dashboard/page.js              # Triage Dashboard & Analytics
│   │   ├── complaints/
│   │   │   ├── page.js                    # Complaints list with multi-filters
│   │   │   ├── new/page.js                # New intake form + Gemini AI panel
│   │   │   └── [id]/page.js              # Staff Review Screen (Human-in-the-Loop)
│   │   └── admin/
│   │       ├── departments/page.js        # Department CRUD
│   │       ├── categories/page.js         # Category CRUD
│   │       └── staff/page.js              # Staff Account Management
│   └── api/
│       ├── ai/analyze/route.js            # Gemini AI Analysis Endpoint
│       ├── complaints/
│       │   ├── route.js                   # GET (list/filter), POST (create)
│       │   └── [id]/
│       │       ├── route.js               # GET (detail), PATCH (update), DELETE
│       │       └── regenerate/route.js    # Re-run AI analysis
│       ├── dashboard/stats/route.js       # Aggregated dashboard metrics
│       ├── seed/route.js                  # 1-Click sample data generator
│       └── admin/
│           ├── departments/route.js        # Server-side department operations
│           ├── categories/route.js         # Server-side category operations
│           └── staff/route.js              # Server-side staff creation
├── components/
│   ├── Sidebar.js                         # Responsive navigation sidebar
│   └── ThemeToggle.js                     # Day/Dark mode theme switcher
├── lib/
│   ├── ai/gemini.js                       # Gemini prompt engineering & validation
│   ├── email/mailer.js                    # Nodemailer email dispatcher
│   ├── supabase/                          # Supabase browser & server clients
│   └── schema.sql                         # Complete Database Schema & Grants
└── middleware.js                           # Route protection & URL path sanitizer
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **Supabase Account**: Free project at [supabase.com](https://supabase.com)
- **Google Gemini API Key**: Free key from [Google AI Studio](https://aistudio.google.com)

---

### Installation & Environment Setup

1. **Clone the Repository**:
   ```bash
   cd complaint-triage
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env.local` file in the root of `complaint-triage/`:

   ```env
   # Supabase Configuration
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

   # Gemini AI API Key
   GEMINI_API_KEY=your-gemini-api-key

   # Email Dispatch Configuration (Optional for real email sending)
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your_email@gmail.com
   SMTP_PASS=your_gmail_app_password
   ```

4. **Initialize Database Schema**:
   - Open your Supabase Dashboard: `https://supabase.com/dashboard/project/YOUR_PROJECT_ID/sql/new`
   - Copy the full SQL script from [`lib/schema.sql`](file:///d:/PROJECTS/AI-Powered%20Student%20Complaint%20Triage%20Assistant/complaint-triage/lib/schema.sql).
   - Paste into the SQL Editor and click **Run**.

5. **Start the Development Server**:
   ```bash
   npm run dev
   ```
   Open **`http://localhost:3000`** in your browser.

---

## 📡 REST API Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/ai/analyze` | Analyzes raw complaint text using Gemini AI |
| `GET` | `/api/complaints` | Lists complaints with optional query filters (`status`, `priority`, `search`) |
| `POST` | `/api/complaints` | Programmatically creates a new complaint |
| `GET` | `/api/complaints/[id]` | Fetches single complaint details with audit history |
| `PATCH` | `/api/complaints/[id]` | Updates status, staff overrides, or dispatches student response |
| `DELETE` | `/api/complaints/[id]` | Deletes a complaint record and its history |
| `POST` | `/api/complaints/[id]/regenerate` | Re-runs Gemini AI analysis on an existing complaint |
| `GET` | `/api/dashboard/stats` | Returns aggregated metrics and department loads |
| `POST` | `/api/seed` | Generates sample PRD complaints for testing |

---

## 🧪 Testing with Postman

### Analyze Complaint via AI
- **`POST`** `http://localhost:3000/api/ai/analyze`
- **Body (`JSON`)**:
  ```json
  {
    "complaint_text": "My examination is tomorrow morning at 9:00 AM and my admit card slip has disappeared from the student portal."
  }
  ```

### Create Complaint (Simulate Automated Intake)
- **`POST`** `http://localhost:3000/api/complaints`
- **Body (`JSON`)**:
  ```json
  {
    "student_name": "Muhammad Raza",
    "student_id": "STU-2024-889",
    "student_email": "student@gmail.com",
    "complaint_text": "I paid my tuition fee yesterday but portal shows unpaid and registration closes tomorrow.",
    "source": "email"
  }
  ```

---

## 📄 License
This project is licensed under the MIT License. Developed for University Student Complaint Triage Automation.
