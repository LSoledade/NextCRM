-- =====================================================
-- CORE SCHEMA - Base tables and essential functionality
-- =====================================================
-- This migration creates the foundational tables for the CRM system
-- including users, leads, trainers, and students with proper RLS policies

BEGIN;

-- =====================================================
-- USERS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT auth.uid(),
    username TEXT,
    role TEXT DEFAULT 'user' CHECK (role = ANY (ARRAY['admin'::text, 'user'::text])),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Users can view their own data
CREATE POLICY "Users can view own data"
  ON public.users
  FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own data
CREATE POLICY "Users can update own data"
  ON public.users
  FOR UPDATE
  USING (auth.uid() = id);

-- Admins can view all users
CREATE POLICY "Admins can view all users"
  ON public.users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =====================================================
-- LEADS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT, -- Optional if phone is provided
    phone TEXT, -- Optional if email is provided
    status TEXT DEFAULT 'New' CHECK (status = ANY (ARRAY['New'::text, 'Contacted'::text, 'Converted'::text, 'Lost'::text])),
    tags TEXT[],
    source TEXT,
    company TEXT CHECK (company = ANY (ARRAY['Favale'::text, 'Pink'::text, 'Favale&Pink'::text])),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    
    -- Ensure at least email or phone is provided
    CONSTRAINT leads_contact_check CHECK (email IS NOT NULL OR phone IS NOT NULL)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_leads_user_id ON public.leads(user_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON public.leads(created_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_phone_unique ON public.leads(phone) WHERE phone IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_email_unique ON public.leads(email) WHERE email IS NOT NULL;

-- Enable RLS
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Users can manage their own leads
CREATE POLICY "Users can manage own leads"
  ON public.leads
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admins can manage all leads
CREATE POLICY "Admins can manage all leads"
  ON public.leads
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =====================================================
-- TRAINERS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.trainers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    specialties TEXT[],
    company TEXT CHECK (company = ANY (ARRAY['Favale'::text, 'Pink'::text, 'Favale&Pink'::text])),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_trainers_user_id ON public.trainers(user_id);
CREATE INDEX IF NOT EXISTS idx_trainers_company ON public.trainers(company);

-- Enable RLS
ALTER TABLE public.trainers ENABLE ROW LEVEL SECURITY;

-- Users can manage their own trainers
CREATE POLICY "Users can manage own trainers"
  ON public.trainers
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- STUDENTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    trainer_id UUID REFERENCES public.trainers(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_students_lead_id ON public.students(lead_id);
CREATE INDEX IF NOT EXISTS idx_students_trainer_id ON public.students(trainer_id);
CREATE INDEX IF NOT EXISTS idx_students_user_id ON public.students(user_id);

-- Enable RLS
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

-- Users can manage their own students
CREATE POLICY "Users can manage own students"
  ON public.students
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- TASKS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'pending' CHECK (status = ANY (ARRAY['pending'::text, 'in_progress'::text, 'completed'::text, 'cancelled'::text])),
    priority TEXT DEFAULT 'medium' CHECK (priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'urgent'::text])),
    due_date TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    related_lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
    assigned_to_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON public.tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON public.tasks(assigned_to_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks(due_date);

-- Enable RLS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Users can manage their own tasks
CREATE POLICY "Users can manage own tasks"
  ON public.tasks
  FOR ALL
  USING (auth.uid() = user_id OR auth.uid() = assigned_to_id)
  WITH CHECK (auth.uid() = user_id OR auth.uid() = assigned_to_id);

-- =====================================================
-- UTILITY FUNCTIONS
-- =====================================================

-- Function to get users (for admin use)
CREATE OR REPLACE FUNCTION public.get_users()
RETURNS TABLE (
    id UUID,
    username TEXT,
    role TEXT,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if user is admin
    IF NOT EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid() AND users.role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Access denied. Admin role required.';
    END IF;
    
    RETURN QUERY
    SELECT u.id, u.username, u.role, u.created_at
    FROM public.users u
    ORDER BY u.created_at DESC;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_users() TO authenticated;

COMMIT;