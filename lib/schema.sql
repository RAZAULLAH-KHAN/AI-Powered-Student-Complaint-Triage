-- ============================================
-- AI Student Complaint Triage Assistant
-- Database Schema — Run in Supabase SQL Editor
-- ============================================

-- ⚠️ DROP existing tables if they exist (to fix type conflicts)
-- Order matters: drop dependent tables first
DROP TABLE IF EXISTS complaint_history CASCADE;
DROP TABLE IF EXISTS complaints CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS departments CASCADE;

-- 1. DEPARTMENTS TABLE
CREATE TABLE IF NOT EXISTS departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. PROFILES TABLE (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  role TEXT CHECK (role IN ('admin', 'staff', 'department_staff')) DEFAULT 'staff',
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. COMPLAINTS TABLE (core table)
CREATE TABLE IF NOT EXISTS complaints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_number TEXT UNIQUE NOT NULL,
  -- Student info
  student_name TEXT NOT NULL,
  student_id TEXT,
  student_email TEXT,
  -- Complaint details
  complaint_text TEXT NOT NULL,
  source TEXT CHECK (source IN ('manual', 'email', 'whatsapp')) DEFAULT 'manual',
  status TEXT CHECK (status IN ('new', 'under_review', 'routed', 'in_progress', 'resolved', 'closed')) DEFAULT 'new',
  -- AI analysis fields
  ai_category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  ai_subcategory TEXT,
  ai_priority TEXT CHECK (ai_priority IN ('low', 'normal', 'high', 'critical')),
  ai_priority_reason TEXT,
  ai_department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  ai_summary TEXT,
  ai_response_draft TEXT,
  ai_confidence TEXT CHECK (ai_confidence IN ('low', 'medium', 'high')),
  ai_missing_info TEXT,
  ai_is_sensitive BOOLEAN DEFAULT false,
  -- Staff overrides / final decisions
  final_category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  final_priority TEXT CHECK (final_priority IN ('low', 'normal', 'high', 'critical')),
  final_department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  final_response TEXT,
  response_sent BOOLEAN DEFAULT false,
  -- Tracking
  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  routed_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. COMPLAINT HISTORY / AUDIT LOG
CREATE TABLE IF NOT EXISTS complaint_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id UUID REFERENCES complaints(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  details TEXT,
  old_value JSONB,
  new_value JSONB,
  performed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES for performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status);
CREATE INDEX IF NOT EXISTS idx_complaints_priority ON complaints(ai_priority);
CREATE INDEX IF NOT EXISTS idx_complaints_department ON complaints(ai_department_id);
CREATE INDEX IF NOT EXISTS idx_complaints_category ON complaints(ai_category_id);
CREATE INDEX IF NOT EXISTS idx_complaints_created_at ON complaints(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_complaints_number ON complaints(complaint_number);
CREATE INDEX IF NOT EXISTS idx_complaint_history_complaint ON complaint_history(complaint_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- ============================================
-- COMPLAINT NUMBER SEQUENCE
-- ============================================
CREATE SEQUENCE IF NOT EXISTS complaint_number_seq START WITH 1001;

-- Function to generate complaint number
CREATE OR REPLACE FUNCTION generate_complaint_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.complaint_number IS NULL OR NEW.complaint_number = '' THEN
    NEW.complaint_number := 'CMP-' || nextval('complaint_number_seq');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for auto complaint number
DROP TRIGGER IF EXISTS set_complaint_number ON complaints;
CREATE TRIGGER set_complaint_number
  BEFORE INSERT ON complaints
  FOR EACH ROW
  EXECUTE FUNCTION generate_complaint_number();

-- ============================================
-- UPDATED_AT TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at_complaints ON complaints;
CREATE TRIGGER set_updated_at_complaints
  BEFORE UPDATE ON complaints
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_profiles ON profiles;
CREATE TRIGGER set_updated_at_profiles
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_departments ON departments;
CREATE TRIGGER set_updated_at_departments
  BEFORE UPDATE ON departments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_categories ON categories;
CREATE TRIGGER set_updated_at_categories
  BEFORE UPDATE ON categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- ============================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'staff')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE IF EXISTS public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaint_history ENABLE ROW LEVEL SECURITY;

-- USERS policies (if public.users exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users') THEN
    EXECUTE 'CREATE POLICY "Users can read own row" ON public.users FOR SELECT TO authenticated USING (id = auth.uid())';
    EXECUTE 'CREATE POLICY "Users can update own row" ON public.users FOR UPDATE TO authenticated USING (id = auth.uid())';
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- PROFILES policies (readable by authenticated, editable by owner/admin)
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON profiles;

CREATE POLICY "Authenticated users can view profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- DEPARTMENTS policies (readable by all authenticated, manageable by authenticated staff)
DROP POLICY IF EXISTS "Authenticated users can view departments" ON departments;
DROP POLICY IF EXISTS "Admins can manage departments" ON departments;

CREATE POLICY "Authenticated users can view departments"
  ON departments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage departments"
  ON departments FOR ALL
  TO authenticated
  USING (true);

-- CATEGORIES policies (readable by all authenticated, manageable by authenticated staff)
DROP POLICY IF EXISTS "Authenticated users can view categories" ON categories;
DROP POLICY IF EXISTS "Admins can manage categories" ON categories;

CREATE POLICY "Authenticated users can view categories"
  ON categories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage categories"
  ON categories FOR ALL
  TO authenticated
  USING (true);

-- COMPLAINTS policies
CREATE POLICY "Staff and admins can view all complaints"
  ON complaints FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'staff')
    )
  );

CREATE POLICY "Department staff can view assigned complaints"
  ON complaints FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'department_staff'
      AND department_id = complaints.final_department_id
    )
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'department_staff'
      AND department_id = complaints.ai_department_id
    )
  );

CREATE POLICY "Staff and admins can create complaints"
  ON complaints FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'staff')
    )
  );

CREATE POLICY "Staff and admins can update complaints"
  ON complaints FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'staff')
    )
  );

CREATE POLICY "Department staff can update assigned complaints"
  ON complaints FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'department_staff'
      AND (
        department_id = complaints.final_department_id
        OR department_id = complaints.ai_department_id
      )
    )
  );

-- COMPLAINT HISTORY policies
CREATE POLICY "Authenticated users can view complaint history"
  ON complaint_history FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert complaint history"
  ON complaint_history FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ============================================
-- SEED DATA — Default Departments
-- ============================================
INSERT INTO departments (name, description) VALUES
  ('IT', 'Portal, network, login, and technical problems'),
  ('Finance', 'Fee payment, refund, and financial issues'),
  ('Examination', 'Exam results, registration, and scheduling issues'),
  ('Admissions', 'Admission applications, documents, and enrollment'),
  ('Hostel', 'Room allocation, hostel facilities, and accommodation'),
  ('Library', 'Books, library access, and resource issues'),
  ('Transport', 'Bus routes, transport services, and scheduling'),
  ('Academic', 'Course registration, instructor, and academic issues'),
  ('Student Affairs', 'Student welfare, clubs, events, and general matters')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- SEED DATA — Default Categories
-- ============================================
INSERT INTO categories (name, description) VALUES
  ('Finance', 'Fee/payment problems'),
  ('Examination', 'Exam/result issues'),
  ('IT', 'Portal/network/login problems'),
  ('Admissions', 'Admission/application issues'),
  ('Hostel', 'Room/hostel problems'),
  ('Library', 'Books/library access'),
  ('Transport', 'Bus/transport issues'),
  ('Academic', 'Course/instructor issues'),
  ('Student Affairs', 'Student welfare and general matters'),
  ('Other', 'Unrecognized or miscellaneous issues')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- GRANTS — Allow Supabase roles to access public schema
-- ============================================
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres, anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO postgres, anon, authenticated, service_role;

