-- Cria tabela para gerenciar status de conexão do WhatsApp
CREATE TABLE IF NOT EXISTS public.whatsapp_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('connecting', 'qr_ready', 'connected', 'disconnected', 'error')),
    qr_code TEXT,
    whatsapp_user JSONB, -- Dados do usuário conectado no WhatsApp
    phone_number TEXT,
    connected_at TIMESTAMPTZ,
    disconnected_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id) -- Um usuário pode ter apenas uma conexão por vez
);

-- Adicionar à publicação do realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_connections;

-- Habilitar REPLICA IDENTITY para o realtime
ALTER TABLE public.whatsapp_connections REPLICA IDENTITY FULL;

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_whatsapp_connections_user_id ON public.whatsapp_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_connections_status ON public.whatsapp_connections(status);

-- Habilitar RLS
ALTER TABLE public.whatsapp_connections ENABLE ROW LEVEL SECURITY;

-- Política RLS: Usuários só podem ver e gerenciar suas próprias conexões
DROP POLICY IF EXISTS "Usuários podem gerenciar suas próprias conexões WhatsApp" ON public.whatsapp_connections;
CREATE POLICY "Usuários podem gerenciar suas próprias conexões WhatsApp"
  ON public.whatsapp_connections
  FOR ALL 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Função para atualizar o updated_at automaticamente
CREATE OR REPLACE FUNCTION public.update_whatsapp_connections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS trigger_whatsapp_connections_updated_at ON public.whatsapp_connections;
CREATE TRIGGER trigger_whatsapp_connections_updated_at
    BEFORE UPDATE ON public.whatsapp_connections
    FOR EACH ROW
    EXECUTE FUNCTION public.update_whatsapp_connections_updated_at();
