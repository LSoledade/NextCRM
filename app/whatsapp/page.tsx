'use client';

import React from 'react';
import AppLayout from '@/components/Layout/AppLayout';

// URL da sua instância do Chatwoot
const CHATWOOT_URL = "https://evolution-chatwoot.okkagk.easypanel.host";

export default function WhatsappPage() {
  return (
    <AppLayout>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        overflow: 'hidden' // Garante que o iframe preencha o container
      }}>
        <iframe
          src={CHATWOOT_URL}
          title="Chatwoot"
          style={{
            width: '100%',
            height: '100%',
            border: 'none', // Remove a borda do iframe
            borderRadius: '0.75rem' // Opcional: para manter as bordas arredondadas do card
          }}
          // Permissões importantes para o Chatwoot funcionar corretamente
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
        />
      </div>
    </AppLayout>
  );
}