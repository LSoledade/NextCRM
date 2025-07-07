import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';

// Interface for the data returned by the /api/whatsapp/instance GET endpoint
export interface WhatsAppInstanceData {
  status: 'connecting' | 'connected' | 'disconnected' | 'error' | 'qr_ready';
  message?: string;
  qrCode?: string | null;
  pairingCode?: string | null;
  profile?: {
    name?: string;
    number?: string;
  } | null;
  error?: string | null; // Error message from the API
}

// Interface for the hook's return, which might slightly differ from API response
export interface WhatsAppConnectionState {
  status: 'connecting' | 'connected' | 'disconnected' | 'error' | 'qr_ready';
  qrCode?: string | null;
  pairingCode?: string | null;
  profileName?: string | null;
  phoneNumber?: string | null;
  errorMessage?: string | null; // User-facing error message
  rawError?: string | null; // Actual error from API if any
}

const WHATSAPP_INSTANCE_QUERY_KEY = 'whatsappInstanceStatus';

async function fetchInstanceStatus(): Promise<WhatsAppInstanceData> {
  const response = await fetch('/api/whatsapp/instance');
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Falha ao buscar status da conexão.' }));
    throw new Error(errorData.error || `Erro HTTP ${response.status}`);
  }
  return response.json();
}

async function performInstanceAction(action: 'connect' | 'reconnect' | 'disconnect'): Promise<any> {
  const response = await fetch('/api/whatsapp/instance', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action }),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: `Falha ao executar ação: ${action}`}));
    throw new Error(errorData.error || `Erro HTTP ${response.status} ao executar ${action}`);
  }
  return response.json();
}

export function useWhatsAppConnection() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const statusQuery = useQuery<WhatsAppInstanceData, Error, WhatsAppConnectionState>({
    queryKey: [WHATSAPP_INSTANCE_QUERY_KEY, user?.id],
    queryFn: fetchInstanceStatus,
    enabled: !!user?.id, // Only run query if user is logged in
    refetchInterval: 30000, // Poll every 30 seconds
    // staleTime: 15000, // Consider data fresh for 15 seconds
    select: (data): WhatsAppConnectionState => {
      // Map API data to the desired hook state
      return {
        status: data.status, // API status should now align more closely
        qrCode: data.qrCode,
        pairingCode: data.pairingCode,
        profileName: data.profile?.name,
        phoneNumber: data.profile?.number,
        errorMessage: data.message, // `message` from API can serve as errorMessage
        rawError: data.error,
      };
    },
  });

  const handleMutationSuccess = () => {
    // When an action is successful, invalidate the status query to refetch immediately
    queryClient.invalidateQueries({ queryKey: [WHATSAPP_INSTANCE_QUERY_KEY, user?.id] });
    // Optionally, can also optimistically update the cache if the mutation response gives enough info
  };

  const connectMutation = useMutation({
    mutationFn: () => performInstanceAction('connect'),
    onSuccess: handleMutationSuccess,
  });

  const reconnectMutation = useMutation({
    mutationFn: () => performInstanceAction('reconnect'),
    onSuccess: handleMutationSuccess,
  });

  const disconnectMutation = useMutation({
    mutationFn: () => performInstanceAction('disconnect'),
    onSuccess: handleMutationSuccess,
  });

  return {
    // Query results for connection status
    connectionState: statusQuery.data, // This will be of type WhatsAppConnectionState
    isLoadingStatus: statusQuery.isLoading,
    isFetchingStatus: statusQuery.isFetching,
    statusError: statusQuery.error,
    refetchStatus: statusQuery.refetch,

    // Mutations for actions
    connect: connectMutation.mutateAsync,
    isConnecting: connectMutation.isPending,
    connectError: connectMutation.error,

    reconnect: reconnectMutation.mutateAsync,
    isReconnecting: reconnectMutation.isPending,
    reconnectError: reconnectMutation.error,

    disconnect: disconnectMutation.mutateAsync,
    isDisconnecting: disconnectMutation.isPending,
    disconnectError: disconnectMutation.error,
  };
}