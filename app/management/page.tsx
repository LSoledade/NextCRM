'use client';

import AppLayout from '@/components/Layout/AppLayout';
import { ManagementDashboard } from '@/components/Management/ManagementDashboard';

export default function ManagementPage() {
  return (
    <AppLayout>
      <ManagementDashboard />
    </AppLayout>
  );
}