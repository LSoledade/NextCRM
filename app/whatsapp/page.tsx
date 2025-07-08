'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/Layout/AppLayout';

const CHATWOOT_URL = 'https://evolution-chatwoot.okkagk.easypanel.host/app/accounts/1/inboxes/1';

export default function WhatsappPage() {
  const router = useRouter();
  const effectRan = React.useRef(false);

  useEffect(() => {
    if (effectRan.current === false) {
      window.open(CHATWOOT_URL, '_blank');
      router.back();

      return () => {
        effectRan.current = true;
      };
    }
  }, [router]);

  return (
    <AppLayout>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100%',
        width: '100%',
      }}>
        <p style={{ fontSize: '1.2rem', color: '#888' }}>
          Abrindo o chat em uma nova aba...
        </p>
      </div>
    </AppLayout>
  );
}
