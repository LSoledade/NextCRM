-- =====================================================
-- MIGRAÇÃO: Sistema de Agendamento Completo
-- Data: 2025-07-08
-- Descrição: Cria todas as tabelas necessárias para o sistema de agendamento
-- =====================================================

-- Criar tabela de sessões recorrentes
CREATE TABLE IF NOT EXISTS recurring_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES trainers(id) ON DELETE CASCADE,
    service_id UUID, -- Will be added later when services table exists
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    rrule TEXT NOT NULL, -- String RRule para definir recorrência
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE
);

-- Criar tabela de disponibilidade dos professores
CREATE TABLE IF NOT EXISTS teacher_availability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES trainers(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0 = Sunday, 6 = Saturday
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE
);

-- Criar tabela de ausências dos professores
CREATE TABLE IF NOT EXISTS teacher_absences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES trainers(id) ON DELETE CASCADE,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    reason TEXT,
    is_recurring BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE
);

-- Criar tabela de feriados personalizados
CREATE TABLE IF NOT EXISTS holidays (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    date DATE NOT NULL,
    is_national BOOLEAN DEFAULT TRUE,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE
);

-- Criar tabela de serviços
CREATE TABLE IF NOT EXISTS services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    duration_minutes INTEGER DEFAULT 60,
    price DECIMAL(10,2),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE
);

-- Adicionar campo service_id na tabela sessions se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sessions' AND column_name = 'service_id'
    ) THEN
        ALTER TABLE sessions ADD COLUMN service_id UUID REFERENCES services(id);
    END IF;
END $$;

-- Habilitar RLS em todas as tabelas
ALTER TABLE recurring_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_absences ENABLE ROW LEVEL SECURITY;
ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- POLÍTICAS RLS (Row Level Security)
-- =====================================================

-- Políticas RLS para recurring_sessions
CREATE POLICY "Users can read own recurring_sessions"
  ON recurring_sessions FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own recurring_sessions"
  ON recurring_sessions FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own recurring_sessions"
  ON recurring_sessions FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own recurring_sessions"
  ON recurring_sessions FOR DELETE
  USING (user_id = auth.uid());

-- Políticas RLS para teacher_availability
CREATE POLICY "Users can read own teacher_availability"
  ON teacher_availability FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own teacher_availability"
  ON teacher_availability FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own teacher_availability"
  ON teacher_availability FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own teacher_availability"
  ON teacher_availability FOR DELETE
  USING (user_id = auth.uid());

-- Políticas RLS para teacher_absences
CREATE POLICY "Users can read own teacher_absences"
  ON teacher_absences FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own teacher_absences"
  ON teacher_absences FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own teacher_absences"
  ON teacher_absences FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own teacher_absences"
  ON teacher_absences FOR DELETE
  USING (user_id = auth.uid());

-- Políticas RLS para holidays
CREATE POLICY "Users can read own holidays"
  ON holidays FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own holidays"
  ON holidays FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own holidays"
  ON holidays FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own holidays"
  ON holidays FOR DELETE
  USING (user_id = auth.uid());

-- Políticas RLS para services
CREATE POLICY "Users can read own services"
  ON services FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own services"
  ON services FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own services"
  ON services FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own services"
  ON services FOR DELETE
  USING (user_id = auth.uid());

-- =====================================================
-- ÍNDICES PARA PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_recurring_sessions_user_id ON recurring_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_recurring_sessions_start_date ON recurring_sessions(start_date);
CREATE INDEX IF NOT EXISTS idx_recurring_sessions_student_teacher ON recurring_sessions(student_id, teacher_id);

CREATE INDEX IF NOT EXISTS idx_teacher_availability_teacher_id ON teacher_availability(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_availability_day_time ON teacher_availability(day_of_week, start_time, end_time);

CREATE INDEX IF NOT EXISTS idx_teacher_absences_teacher_id ON teacher_absences(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_absences_date_range ON teacher_absences(start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_holidays_date ON holidays(date);
CREATE INDEX IF NOT EXISTS idx_holidays_user_id ON holidays(user_id);

CREATE INDEX IF NOT EXISTS idx_services_user_id ON services(user_id);
CREATE INDEX IF NOT EXISTS idx_services_active ON services(is_active);

-- =====================================================
-- TRIGGERS PARA UPDATE_AT
-- =====================================================

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Aplicar triggers
CREATE TRIGGER update_recurring_sessions_updated_at 
    BEFORE UPDATE ON recurring_sessions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- INSERIR DADOS INICIAIS (OPCIONAL)
-- =====================================================

-- Inserir alguns feriados nacionais brasileiros padrão
INSERT INTO holidays (name, date, is_national, description, user_id) 
SELECT 
    'Ano Novo', '2025-01-01', true, 'Confraternização Universal', auth.uid()
WHERE auth.uid() IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO holidays (name, date, is_national, description, user_id) 
SELECT 
    'Tiradentes', '2025-04-21', true, 'Dia de Tiradentes', auth.uid()
WHERE auth.uid() IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO holidays (name, date, is_national, description, user_id) 
SELECT 
    'Dia do Trabalhador', '2025-05-01', true, 'Dia do Trabalhador', auth.uid()
WHERE auth.uid() IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO holidays (name, date, is_national, description, user_id) 
SELECT 
    'Independência do Brasil', '2025-09-07', true, 'Independência do Brasil', auth.uid()
WHERE auth.uid() IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO holidays (name, date, is_national, description, user_id) 
SELECT 
    'Nossa Senhora Aparecida', '2025-10-12', true, 'Dia de Nossa Senhora Aparecida', auth.uid()
WHERE auth.uid() IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO holidays (name, date, is_national, description, user_id) 
SELECT 
    'Finados', '2025-11-02', true, 'Dia de Finados', auth.uid()
WHERE auth.uid() IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO holidays (name, date, is_national, description, user_id) 
SELECT 
    'Proclamação da República', '2025-11-15', true, 'Proclamação da República', auth.uid()
WHERE auth.uid() IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO holidays (name, date, is_national, description, user_id) 
SELECT 
    'Natal', '2025-12-25', true, 'Natal', auth.uid()
WHERE auth.uid() IS NOT NULL
ON CONFLICT DO NOTHING;

-- Inserir serviços padrão
INSERT INTO services (name, description, duration_minutes, price, user_id) 
SELECT 
    'Personal Training', 'Aula de Personal Training individual', 60, 100.00, auth.uid()
WHERE auth.uid() IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO services (name, description, duration_minutes, price, user_id) 
SELECT 
    'Avaliação Física', 'Avaliação física completa', 90, 150.00, auth.uid()
WHERE auth.uid() IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO services (name, description, duration_minutes, price, user_id) 
SELECT 
    'Consulta Nutricional', 'Consulta com nutricionista', 45, 120.00, auth.uid()
WHERE auth.uid() IS NOT NULL
ON CONFLICT DO NOTHING;

COMMENT ON TABLE recurring_sessions IS 'Sessões de treino recorrentes com regras RRule';
COMMENT ON TABLE teacher_availability IS 'Disponibilidade semanal dos professores';
COMMENT ON TABLE teacher_absences IS 'Ausências e indisponibilidades dos professores';
COMMENT ON TABLE holidays IS 'Feriados nacionais e personalizados';
COMMENT ON TABLE services IS 'Serviços oferecidos (Personal, Avaliação, etc.)';
