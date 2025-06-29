/*
  # Schema Inicial do FavaleTrainer CRM

  1. Novas Tabelas
    - `users` - Perfis de usuários vinculados ao auth.users
    - `leads` - Leads/prospects do sistema
    - `trainers` - Cadastro de personal trainers
    - `students` - Alunos/clientes convertidos de leads
    - `sessions` - Sessões de treino agendadas/realizadas
    - `tasks` - Sistema de tarefas e follow-ups

  2. Segurança
    - Habilita RLS em todas as tabelas
    - Políticas para usuários acessarem apenas seus dados
    - Políticas especiais para administradores

  3. Funcionalidades
    - UUIDs como chaves primárias
    - Timestamps automáticos
    - Enums para status e prioridades
    - Relacionamentos com foreign keys
*/

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabela de usuários (perfis)
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT auth.uid(),
  username text,
  role text CHECK (role IN ('admin', 'user')) DEFAULT 'user',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Tabela de leads
CREATE TABLE IF NOT EXISTS leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  status text CHECK (status IN ('New', 'Contacted', 'Converted', 'Lost')) DEFAULT 'New',
  tags text[],
  source text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL
);

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Tabela de treinadores
CREATE TABLE IF NOT EXISTS trainers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  specialties text[],
  created_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL
);

ALTER TABLE trainers ENABLE ROW LEVEL SECURITY;

-- Tabela de alunos
CREATE TABLE IF NOT EXISTS students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES leads(id) ON DELETE CASCADE NOT NULL,
  trainer_id uuid REFERENCES trainers(id),
  created_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL
);

ALTER TABLE students ENABLE ROW LEVEL SECURITY;

-- Tabela de sessões
CREATE TABLE IF NOT EXISTS sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  start_time timestamptz NOT NULL,
  end_time timestamptz,
  student_id uuid REFERENCES students(id) ON DELETE CASCADE NOT NULL,
  trainer_id uuid REFERENCES trainers(id) ON DELETE CASCADE NOT NULL,
  status text CHECK (status IN ('Scheduled', 'InProgress', 'Completed', 'Cancelled')) DEFAULT 'Scheduled',
  created_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL
);

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Tabela de tarefas
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  assigned_to_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  related_lead_id uuid REFERENCES leads(id) ON DELETE SET NULL,
  priority text CHECK (priority IN ('Low', 'Medium', 'High', 'Urgent')) DEFAULT 'Medium',
  status text CHECK (status IN ('Todo', 'InProgress', 'Done')) DEFAULT 'Todo',
  due_date timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para users
CREATE POLICY "Users can read own profile"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Políticas RLS para leads
CREATE POLICY "Users can read own leads"
  ON leads
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own leads"
  ON leads
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own leads"
  ON leads
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own leads"
  ON leads
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Políticas RLS para trainers
CREATE POLICY "Users can read own trainers"
  ON trainers
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own trainers"
  ON trainers
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own trainers"
  ON trainers
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own trainers"
  ON trainers
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Políticas RLS para students
CREATE POLICY "Users can read own students"
  ON students
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own students"
  ON students
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own students"
  ON students
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own students"
  ON students
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Políticas RLS para sessions
CREATE POLICY "Users can read own sessions"
  ON sessions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions"
  ON sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
  ON sessions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions"
  ON sessions
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Políticas RLS para tasks
CREATE POLICY "Users can read own tasks"
  ON tasks
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = assigned_to_id);

CREATE POLICY "Users can insert own tasks"
  ON tasks
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tasks"
  ON tasks
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = assigned_to_id);

CREATE POLICY "Users can delete own tasks"
  ON tasks
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para updated_at
CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_leads_user_id ON leads(user_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_trainers_user_id ON trainers(user_id);
CREATE INDEX IF NOT EXISTS idx_students_user_id ON students(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_start_time ON sessions(start_time);
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to_id ON tasks(assigned_to_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);