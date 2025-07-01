// Test component to check if the infinite loop is fixed
'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function WhatsAppConnectionTest() {
  console.log('WhatsAppConnectionTest rendering...');

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>WhatsApp Connection Test</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          This is a simple test component to verify the infinite loop is fixed.
        </p>
      </CardContent>
    </Card>
  );
}
