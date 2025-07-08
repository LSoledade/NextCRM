'use client';

import React from 'react';
import AppLayout from '@/components/Layout/AppLayout';

// URL direta para a caixa de entrada específica
const CHATWOOT_URL = 'https://evolution-chatwoot.okkagk.easypanel.host/app/accounts/1/inboxes/1';

export default function WhatsappPage() {
  return (
    <AppLayout>
      {/* Container Flexbox para gerenciar o layout */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        overflow: 'hidden'
      }}>
        <iframe
          src={CHATWOOT_URL}
          title="Chatwoot – WhatsApp"
          style={{
            width: '100%',
            height: '100%', // Ocupa 100% do container
            border: 'none',
            borderRadius: '0.75rem',
          }}
          // Permissões para o Chatwoot funcionar corretamente
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
        />
      </div>
    </AppLayout>
  );
}