-- Permitir email como opcional na tabela leads para contatos do WhatsApp
-- Isso é necessário porque mensagens recebidas via WhatsApp podem não ter email

-- Remover constraint NOT NULL do campo email
ALTER TABLE leads 
ALTER COLUMN email DROP NOT NULL;

-- Adicionar constraint para garantir que pelo menos phone ou email estejam preenchidos
ALTER TABLE leads 
ADD CONSTRAINT leads_contact_info_check 
CHECK (
  (email IS NOT NULL AND email != '') OR 
  (phone IS NOT NULL AND phone != '')
);

-- Comentário para documentar a mudança
COMMENT ON COLUMN leads.email IS 'Email do lead (opcional se phone estiver preenchido)';
COMMENT ON COLUMN leads.phone IS 'Telefone do lead (opcional se email estiver preenchido)';
COMMENT ON CONSTRAINT leads_contact_info_check ON leads IS 'Garante que pelo menos email ou telefone estejam preenchidos';
