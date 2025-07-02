import WhatsappDebugMonitor from '@/components/Whatsapp/WhatsappDebugMonitor';

export default function WhatsappDebugPage() {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">WhatsApp Debug Monitor</h1>
        <p className="text-muted-foreground mt-2">
          Monitor mensagens WhatsApp em tempo real e visualize logs de debug
        </p>
      </div>
      
      <WhatsappDebugMonitor />
    </div>
  );
}
