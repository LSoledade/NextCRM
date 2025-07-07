// app/api/whatsapp/instance/route.ts
import { NextRequest, NextResponse } from 'next/server';
import {
  checkInstanceStatus,
  fetchQRCode,
  reconnectInstance,
  // TODO: Add a disconnectInstance function to evolution-http.service.ts if needed
  // disconnectInstance,
} from '@/lib/evolution-http.service';
import { createClient } from '@/utils/supabase/server';
import { createServiceClient } from '@/utils/supabase/service';

const INSTANCE_NAME = process.env.WHATSAPP_INSTANCE_NAME || process.env.EVOLUTION_INSTANCE_NAME || 'Leonardo';

// Helper function to update connection status in Supabase
// This function might be better placed in a shared utility or service if used elsewhere
async function updateSupabaseConnectionStatus(
  status: 'connecting' | 'qr_ready' | 'connected' | 'disconnected' | 'error',
  details: {
    qrCode?: string | null;
    profile?: any | null; // Profile from evolution API
    errorMessage?: string | null;
    userId?: string; // Optional: if we want to associate with a specific user
  } = {}
) {
  try {
    const supabase = createServiceClient(); // Use service client for backend updates
    const connectionData: any = {
      instance_name: INSTANCE_NAME, // Assuming a single, named instance for now
      status: status,
      qr_code: details.qrCode,
      whatsapp_user: details.profile, // Store profile info if connected
      last_event_at: new Date().toISOString(),
      error_message: details.errorMessage,
      updated_at: new Date().toISOString(),
    };

    if (status === 'connected') {
      connectionData.last_connected_at = new Date().toISOString();
      connectionData.qr_code = null; // Clear QR code when connected
      connectionData.error_message = null; // Clear error on successful connection
    } else if (status === 'disconnected') {
      connectionData.qr_code = null; // Clear QR code
    } else if (status === 'qr_ready' && !details.qrCode) {
      console.warn('updateSupabaseConnectionStatus called with qr_ready but no QR code provided.');
    }

    // If a user ID is provided, we can link the connection to a user.
    // For a global instance, user_id might be null or a system user.
    // The current 'whatsapp_connections' table uses (user_id, instance_name) as PK.
    // This needs clarification: Is there one global instance, or per-user instances?
    // For now, assuming a global instance, we might need a way to identify it,
    // or the table schema might need adjustment if user_id is not always relevant here.
    // Let's assume we fetch the user_id from an authenticated session for now if applicable,
    // or handle cases where it might be a system-wide instance.

    // The original `connection/route.ts` used `onConflict: 'user_id,instance_name'`.
    // If this is a global instance status, we might need a fixed user_id or adapt the table.
    // For simplicity, let's assume a single row for the instance, identified by INSTANCE_NAME.
    // This implies the table `whatsapp_connections` should primarily use `instance_name` as a unique key
    // or have a known `user_id` for the system instance.

    // Fetching the first user's ID as a placeholder for now, as per previous logic.
    // This should be replaced with a proper system user ID or instance management strategy.
    let userIdToUpsert = details.userId;
    if (!userIdToUpsert) {
        const { data: firstUser, error: userError } = await supabase
        .from('users')
        .select('id')
        .limit(1)
        .single();
        if (firstUser && !userError) {
            userIdToUpsert = firstUser.id;
        } else {
            console.error("No user found to associate with instance, or error fetching user:", userError?.message);
            // If no user, we cannot upsert with the current table structure if user_id is part of PK and NOT NULL.
            // This part needs careful consideration based on the DB schema.
            // For now, let's proceed assuming a user_id will be found or is not strictly needed for a global entry.
            // If `whatsapp_connections` has `user_id` as part of PK, this will fail without it.
            // Let's assume for now it's okay if user_id is null, or we should handle this more gracefully.
        }
    }

    // If user_id is part of the primary key and cannot be null, this needs a default system user_id.
    // The original table in migrations seems to be:
    // CREATE TABLE whatsapp_connections ( id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), user_id uuid REFERENCES users(id), ... )
    // So, `user_id` might be nullable or there's a specific user for the connection.
    // The `connection/route.ts` used `onConflict: 'user_id,instance_name'`.
    // This implies `user_id` and `instance_name` together are unique.

    if (!userIdToUpsert) {
        console.warn(`Cannot update Supabase connection status for instance ${INSTANCE_NAME} without a user_id. The table structure requires it for the upsert conflict resolution.`);
        // Attempting upsert on instance_name only if user_id is not available.
        // This might require a different onConflict strategy or table schema.
        // For now, we try to update based on instance_name if no user_id.
         const { error } = await supabase
          .from('whatsapp_connections')
          .update(connectionData)
          .eq('instance_name', INSTANCE_NAME);
        if (error) console.error(`Error updating connection status by instance_name for ${INSTANCE_NAME}:`, error);
        else console.log(`Connection status updated for ${INSTANCE_NAME} (no user_id) to: ${status}`);
        return;
    }

    connectionData.user_id = userIdToUpsert;

    const { error } = await supabase
      .from('whatsapp_connections')
      .upsert(connectionData, {
        onConflict: 'instance_name', // Use instance_name as the unique key for upsert
      });

    if (error) {
      console.error(`Error updating Supabase connection status for ${INSTANCE_NAME} (user: ${userIdToUpsert}):`, error);
    } else {
      console.log(`Supabase connection status updated for ${INSTANCE_NAME} (user: ${userIdToUpsert}) to: ${status}`);
    }
  } catch (dbError) {
    console.error('Database error updating connection status:', dbError);
  }
}


export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const instanceStatus = await checkInstanceStatus(INSTANCE_NAME);

    if (!instanceStatus.exists) {
      await updateSupabaseConnectionStatus('disconnected', { userId: user.id, errorMessage: 'Instância não encontrada.' });
      return NextResponse.json({
        status: 'disconnected',
        message: 'Instância não encontrada ou não configurada corretamente.'
      }, { status: 404 });
    }

    if (instanceStatus.connected) {
      await updateSupabaseConnectionStatus('connected', { userId: user.id, profile: instanceStatus.profile });
      return NextResponse.json({
        status: 'connected',
        message: 'Instância conectada.',
        profile: instanceStatus.profile,
      });
    } else {
      // Instance exists but not connected, try to get QR code
      const qrResult = await fetchQRCode(INSTANCE_NAME);
      if (qrResult.qrCode) {
        await updateSupabaseConnectionStatus('qr_ready', { userId: user.id, qrCode: qrResult.qrCode });
        return NextResponse.json({
          status: 'qr_ready',
          message: 'Instância pronta para escanear QR Code.',
          qrCode: qrResult.qrCode,
          pairingCode: qrResult.pairingCode,
        });
      } else if (qrResult.error === 'Instance already connected') {
        // Should have been caught by instanceStatus.connected, but as a fallback
         await updateSupabaseConnectionStatus('connected', { userId: user.id, profile: instanceStatus.profile });
        return NextResponse.json({
            status: 'connected',
            message: 'Instância conectada.',
            profile: instanceStatus.profile, // Might need to fetch profile again
        });
      } else {
        // Not connected, no QR code, possibly an error state or needs explicit connect action
        await updateSupabaseConnectionStatus('disconnected', { userId: user.id, errorMessage: qrResult.error || 'Falha ao obter QR Code. Tente conectar.' });
        return NextResponse.json({
          status: 'disconnected',
          message: qrResult.error || 'Falha ao obter QR Code. A instância pode precisar ser iniciada ou está em um estado de erro.',
          error: qrResult.error
        });
      }
    }
  } catch (error: any) {
    console.error('[API /instance GET] Erro:', error);
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    await updateSupabaseConnectionStatus('error', { userId: user?.id, errorMessage: error.message });
    return NextResponse.json({
        status: 'error',
        error: error.message || 'Erro ao verificar status da instância.'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { action } = await request.json();

    if (!action) {
      return NextResponse.json({ error: 'Ação não especificada' }, { status: 400 });
    }

    switch (action) {
      case 'connect': // Equivalent to getting QR code or starting connection
        await updateSupabaseConnectionStatus('connecting', { userId: user.id });
        const qrResult = await fetchQRCode(INSTANCE_NAME);
        if (qrResult.qrCode) {
          await updateSupabaseConnectionStatus('qr_ready', { userId: user.id, qrCode: qrResult.qrCode });
          return NextResponse.json({
            success: true,
            status: 'qr_ready',
            message: 'QR Code pronto para escaneamento.',
            qrCode: qrResult.qrCode,
            pairingCode: qrResult.pairingCode,
          });
        } else {
          await updateSupabaseConnectionStatus('error', { userId: user.id, errorMessage: qrResult.error || 'Falha ao iniciar conexão.' });
          return NextResponse.json({
            success: false,
            status: 'error',
            message: qrResult.error || 'Não foi possível obter o QR Code. Verifique a instância.',
            error: qrResult.error
          }, { status: 500 });
        }

      case 'reconnect':
        await updateSupabaseConnectionStatus('connecting', { userId: user.id, errorMessage: "Tentando reconectar..." });
        // `reconnectInstance` in evolution-http.service.ts already handles logout then fetchQRCode
        const reconnectResult = await reconnectInstance(INSTANCE_NAME);
        if (reconnectResult.qrCode) {
          await updateSupabaseConnectionStatus('qr_ready', { userId: user.id, qrCode: reconnectResult.qrCode });
          return NextResponse.json({
            success: true,
            status: 'qr_ready',
            message: 'QR Code para reconexão gerado.',
            qrCode: reconnectResult.qrCode,
            pairingCode: reconnectResult.pairingCode,
          });
        } else if (reconnectResult.error === 'Instance already connected') {
           const currentStatus = await checkInstanceStatus(INSTANCE_NAME);
           await updateSupabaseConnectionStatus('connected', { userId: user.id, profile: currentStatus.profile });
           return NextResponse.json({
            success: true,
            status: 'connected',
            message: 'Instância já está conectada.',
            profile: currentStatus.profile,
          });
        }
        else {
          await updateSupabaseConnectionStatus('error', { userId: user.id, errorMessage: reconnectResult.error || 'Falha ao reconectar.' });
          return NextResponse.json({
            success: false,
            status: 'error',
            message: reconnectResult.error || 'Falha ao reconectar a instância.',
            error: reconnectResult.error
          }, { status: 500 });
        }

      case 'disconnect':
        // Evolution API might not have a persistent "disconnect" for the instance itself,
        // rather it's about the phone's connection to WhatsApp Web.
        // Logging out the instance is more like a reset.
        // For a "disconnect" action from UI, we might just update our DB status
        // and expect the webhook to confirm. Or, if `logout` is intended:
        // const logoutResult = await evolutionService.logoutInstance(INSTANCE_NAME);
        // For now, simply mark as disconnected in our DB.
        // The `evolution-http.service.ts` has `delete('/instance/logout/${instanceName}')` in `reconnectInstance`.
        // We might need a separate `disconnectInstance` or `logoutInstance` function.
        // Let's assume for now, disconnect means clearing local state and relying on webhook for actual status.
        // However, the old connection/route.ts called `delete('/instance/logout/${instanceName}')` for 'reset'.
        // A true "disconnect" might just be a client-side state update, or if it means "logout":
        console.log(`Attempting to logout instance ${INSTANCE_NAME} as part of disconnect action.`);
        const logoutResponse = await httpClient.delete(`/instance/logout/${INSTANCE_NAME}`);
        if (logoutResponse.success) {
            await updateSupabaseConnectionStatus('disconnected', { userId: user.id, errorMessage: "Desconectado pelo usuário." });
            return NextResponse.json({
                success: true,
                status: 'disconnected',
                message: 'Instância desconectada (logout solicitado).',
            });
        } else {
            // Even if logout fails, update our status to disconnected if that's the user's intent.
            await updateSupabaseConnectionStatus('disconnected', { userId: user.id, errorMessage: "Tentativa de logout falhou, mas marcado como desconectado." });
            console.warn(`Logout attempt for instance ${INSTANCE_NAME} failed or API returned error, but marking as disconnected. Error: ${logoutResponse.error}`);
            return NextResponse.json({
                success: false, // Or true if we consider the primary action (marking as disconnected) successful
                status: 'disconnected', // Reflects the intended state
                message: `Tentativa de logout da instância falhou (Erro: ${logoutResponse.error}). Status local atualizado para desconectado.`,
                error: logoutResponse.error
            });
        }

      default:
        return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('[API /instance POST] Erro:', error);
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    await updateSupabaseConnectionStatus('error', { userId: user?.id, errorMessage: error.message });
    return NextResponse.json({
        success: false,
        status: 'error',
        error: error.message || 'Erro ao processar ação na instância.'
    }, { status: 500 });
  }
}

// Re-export httpClient from evolution-http.service to use it here for disconnect.
// This indicates that `disconnectInstance` should probably be a formal part of `evolution-http.service.ts`.
import { httpClient } from '@/lib/evolution-http.service';
