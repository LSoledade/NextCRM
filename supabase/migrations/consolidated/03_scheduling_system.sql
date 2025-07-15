-- =====================================================
-- SCHEDULING SYSTEM - Complete scheduling functionality
-- =====================================================
-- This migration creates all scheduling-related tables and functions
-- Includes trainer availability, appointments, and scheduling logic

BEGIN;

-- =====================================================
-- TRAINER AVAILABILITY TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.trainer_availability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trainer_id UUID NOT NULL REFERENCES public.trainers(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0 = Sunday, 6 = Saturday
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    
    -- Ensure end time is after start time
    CONSTRAINT valid_time_range CHECK (end_time > start_time),
    -- Prevent overlapping availability slots for same trainer on same day
    CONSTRAINT unique_trainer_day_time UNIQUE (trainer_id, day_of_week, start_time, end_time)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_trainer_availability_trainer_id ON public.trainer_availability(trainer_id);
CREATE INDEX IF NOT EXISTS idx_trainer_availability_day_of_week ON public.trainer_availability(day_of_week);
CREATE INDEX IF NOT EXISTS idx_trainer_availability_user_id ON public.trainer_availability(user_id);
CREATE INDEX IF NOT EXISTS idx_trainer_availability_is_available ON public.trainer_availability(is_available);

-- Enable RLS
ALTER TABLE public.trainer_availability ENABLE ROW LEVEL SECURITY;

-- Users can manage their own trainer availability
CREATE POLICY "Users can manage own trainer availability"
  ON public.trainer_availability
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- APPOINTMENTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trainer_id UUID NOT NULL REFERENCES public.trainers(id) ON DELETE CASCADE,
    student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
    lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    status TEXT DEFAULT 'scheduled' CHECK (status = ANY (ARRAY['scheduled'::text, 'confirmed'::text, 'completed'::text, 'cancelled'::text, 'no_show'::text])),
    appointment_type TEXT DEFAULT 'training' CHECK (appointment_type = ANY (ARRAY['training'::text, 'consultation'::text, 'assessment'::text, 'follow_up'::text])),
    location TEXT,
    notes TEXT,
    reminder_sent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    
    -- Ensure end time is after start time
    CONSTRAINT valid_appointment_time CHECK (end_time > start_time),
    -- Ensure either student_id or lead_id is provided
    CONSTRAINT appointment_participant_check CHECK (student_id IS NOT NULL OR lead_id IS NOT NULL)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_appointments_trainer_id ON public.appointments(trainer_id);
CREATE INDEX IF NOT EXISTS idx_appointments_student_id ON public.appointments(student_id);
CREATE INDEX IF NOT EXISTS idx_appointments_lead_id ON public.appointments(lead_id);
CREATE INDEX IF NOT EXISTS idx_appointments_start_time ON public.appointments(start_time);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON public.appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_user_id ON public.appointments(user_id);
CREATE INDEX IF NOT EXISTS idx_appointments_type ON public.appointments(appointment_type);

-- Enable RLS
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Users can manage their own appointments
CREATE POLICY "Users can manage own appointments"
  ON public.appointments
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- RECURRING APPOINTMENTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.recurring_appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trainer_id UUID NOT NULL REFERENCES public.trainers(id) ON DELETE CASCADE,
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    days_of_week INTEGER[] NOT NULL, -- Array of days: 0=Sunday, 1=Monday, etc.
    recurrence_start_date DATE NOT NULL,
    recurrence_end_date DATE,
    appointment_type TEXT DEFAULT 'training' CHECK (appointment_type = ANY (ARRAY['training'::text, 'consultation'::text, 'assessment'::text, 'follow_up'::text])),
    location TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    
    -- Ensure end time is after start time
    CONSTRAINT valid_recurring_time CHECK (end_time > start_time),
    -- Ensure recurrence end date is after start date
    CONSTRAINT valid_recurrence_dates CHECK (recurrence_end_date IS NULL OR recurrence_end_date >= recurrence_start_date),
    -- Ensure days_of_week contains valid values
    CONSTRAINT valid_days_of_week CHECK (
        array_length(days_of_week, 1) > 0 AND
        NOT EXISTS (
            SELECT 1 FROM unnest(days_of_week) AS day
            WHERE day < 0 OR day > 6
        )
    )
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_recurring_appointments_trainer_id ON public.recurring_appointments(trainer_id);
CREATE INDEX IF NOT EXISTS idx_recurring_appointments_student_id ON public.recurring_appointments(student_id);
CREATE INDEX IF NOT EXISTS idx_recurring_appointments_user_id ON public.recurring_appointments(user_id);
CREATE INDEX IF NOT EXISTS idx_recurring_appointments_is_active ON public.recurring_appointments(is_active);
CREATE INDEX IF NOT EXISTS idx_recurring_appointments_start_date ON public.recurring_appointments(recurrence_start_date);

-- Enable RLS
ALTER TABLE public.recurring_appointments ENABLE ROW LEVEL SECURITY;

-- Users can manage their own recurring appointments
CREATE POLICY "Users can manage own recurring appointments"
  ON public.recurring_appointments
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- SCHEDULING FUNCTIONS
-- =====================================================

-- Function to check trainer availability for a specific time slot
CREATE OR REPLACE FUNCTION public.check_trainer_availability(
    p_trainer_id UUID,
    p_start_time TIMESTAMPTZ,
    p_end_time TIMESTAMPTZ,
    p_exclude_appointment_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    day_of_week INTEGER;
    start_time_only TIME;
    end_time_only TIME;
    availability_exists BOOLEAN;
    conflict_exists BOOLEAN;
BEGIN
    -- Check authentication
    IF auth.role() != 'authenticated' THEN
        RAISE EXCEPTION 'Access denied. Authentication required.';
    END IF;
    
    -- Extract day of week and time components
    day_of_week := EXTRACT(DOW FROM p_start_time);
    start_time_only := p_start_time::TIME;
    end_time_only := p_end_time::TIME;
    
    -- Check if trainer has availability for this day and time
    SELECT EXISTS (
        SELECT 1 FROM public.trainer_availability ta
        WHERE ta.trainer_id = p_trainer_id
          AND ta.day_of_week = day_of_week
          AND ta.start_time <= start_time_only
          AND ta.end_time >= end_time_only
          AND ta.is_available = TRUE
    ) INTO availability_exists;
    
    -- If no availability slot covers this time, return false
    IF NOT availability_exists THEN
        RETURN FALSE;
    END IF;
    
    -- Check for conflicting appointments
    SELECT EXISTS (
        SELECT 1 FROM public.appointments a
        WHERE a.trainer_id = p_trainer_id
          AND a.status NOT IN ('cancelled', 'no_show')
          AND (
            (a.start_time <= p_start_time AND a.end_time > p_start_time) OR
            (a.start_time < p_end_time AND a.end_time >= p_end_time) OR
            (a.start_time >= p_start_time AND a.end_time <= p_end_time)
          )
          AND (p_exclude_appointment_id IS NULL OR a.id != p_exclude_appointment_id)
    ) INTO conflict_exists;
    
    RETURN NOT conflict_exists;
END;
$$;

-- Function to get available time slots for a trainer on a specific date
CREATE OR REPLACE FUNCTION public.get_trainer_available_slots(
    p_trainer_id UUID,
    p_date DATE,
    p_duration_minutes INTEGER DEFAULT 60
)
RETURNS TABLE (
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    day_of_week INTEGER;
    availability_record RECORD;
    current_time TIME;
    slot_start TIMESTAMPTZ;
    slot_end TIMESTAMPTZ;
BEGIN
    -- Check authentication
    IF auth.role() != 'authenticated' THEN
        RAISE EXCEPTION 'Access denied. Authentication required.';
    END IF;
    
    day_of_week := EXTRACT(DOW FROM p_date);
    
    -- Loop through availability slots for this day
    FOR availability_record IN
        SELECT ta.start_time as avail_start, ta.end_time as avail_end
        FROM public.trainer_availability ta
        WHERE ta.trainer_id = p_trainer_id
          AND ta.day_of_week = day_of_week
          AND ta.is_available = TRUE
        ORDER BY ta.start_time
    LOOP
        current_time := availability_record.avail_start;
        
        -- Generate slots within this availability window
        WHILE current_time + (p_duration_minutes || ' minutes')::INTERVAL <= availability_record.avail_end LOOP
            slot_start := p_date + current_time;
            slot_end := slot_start + (p_duration_minutes || ' minutes')::INTERVAL;
            
            -- Check if this slot is available (no conflicts)
            IF public.check_trainer_availability(p_trainer_id, slot_start, slot_end) THEN
                start_time := slot_start;
                end_time := slot_end;
                RETURN NEXT;
            END IF;
            
            -- Move to next slot (15-minute intervals)
            current_time := current_time + INTERVAL '15 minutes';
        END LOOP;
    END LOOP;
END;
$$;

-- Function to generate recurring appointments
CREATE OR REPLACE FUNCTION public.generate_recurring_appointments(
    p_recurring_appointment_id UUID,
    p_generate_until_date DATE DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    recurring_record RECORD;
    current_date DATE;
    end_date DATE;
    day_of_week INTEGER;
    appointment_start TIMESTAMPTZ;
    appointment_end TIMESTAMPTZ;
    generated_count INTEGER := 0;
BEGIN
    -- Check authentication
    IF auth.role() != 'authenticated' THEN
        RAISE EXCEPTION 'Access denied. Authentication required.';
    END IF;
    
    -- Get recurring appointment details
    SELECT * INTO recurring_record
    FROM public.recurring_appointments
    WHERE id = p_recurring_appointment_id
      AND is_active = TRUE
      AND user_id = auth.uid();
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Recurring appointment not found or access denied.';
    END IF;
    
    -- Determine end date for generation
    end_date := COALESCE(
        p_generate_until_date,
        recurring_record.recurrence_end_date,
        CURRENT_DATE + INTERVAL '3 months'
    );
    
    -- Start from the recurrence start date
    current_date := recurring_record.recurrence_start_date;
    
    -- Generate appointments
    WHILE current_date <= end_date LOOP
        day_of_week := EXTRACT(DOW FROM current_date);
        
        -- Check if this day is in the recurring days
        IF day_of_week = ANY(recurring_record.days_of_week) THEN
            appointment_start := current_date + recurring_record.start_time;
            appointment_end := current_date + recurring_record.end_time;
            
            -- Check if appointment doesn't already exist and trainer is available
            IF NOT EXISTS (
                SELECT 1 FROM public.appointments
                WHERE trainer_id = recurring_record.trainer_id
                  AND start_time = appointment_start
                  AND status NOT IN ('cancelled')
            ) AND public.check_trainer_availability(
                recurring_record.trainer_id,
                appointment_start,
                appointment_end
            ) THEN
                -- Create the appointment
                INSERT INTO public.appointments (
                    trainer_id,
                    student_id,
                    title,
                    description,
                    start_time,
                    end_time,
                    appointment_type,
                    location,
                    user_id
                ) VALUES (
                    recurring_record.trainer_id,
                    recurring_record.student_id,
                    recurring_record.title,
                    recurring_record.description,
                    appointment_start,
                    appointment_end,
                    recurring_record.appointment_type,
                    recurring_record.location,
                    recurring_record.user_id
                );
                
                generated_count := generated_count + 1;
            END IF;
        END IF;
        
        current_date := current_date + INTERVAL '1 day';
    END LOOP;
    
    RETURN generated_count;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.check_trainer_availability(UUID, TIMESTAMPTZ, TIMESTAMPTZ, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_trainer_available_slots(UUID, DATE, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_recurring_appointments(UUID, DATE) TO authenticated;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Apply update trigger to scheduling tables
DROP TRIGGER IF EXISTS update_trainer_availability_updated_at ON public.trainer_availability;
CREATE TRIGGER update_trainer_availability_updated_at
    BEFORE UPDATE ON public.trainer_availability
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_appointments_updated_at ON public.appointments;
CREATE TRIGGER update_appointments_updated_at
    BEFORE UPDATE ON public.appointments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_recurring_appointments_updated_at ON public.recurring_appointments;
CREATE TRIGGER update_recurring_appointments_updated_at
    BEFORE UPDATE ON public.recurring_appointments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

COMMIT;