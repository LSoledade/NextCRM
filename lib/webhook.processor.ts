/**
 * Optimized Webhook Processor for Evolution API
 * Handles incoming webhook events with improved message persistence and error handling
 */

import { createServiceClient } from '@/utils/supabase/service';
import { Database } from '@/types/database'; // Assuming this exists for table types

// Type definitions for webhook events
interface WebhookEvent {
  event: string;
  instance: string;
  data: any;
  destination?: string; // Usually your webhook URL
  date_time?: string;   // Timestamp of the event
  // V2 fields
  sender?: string; // JID of the sender of the event (e.g. the WhatsApp number connected)
  apikey?: string; // API key used by the instance (if configured to be sent)
}

interface BaileysMessageKey {
  id: string;
  remoteJid: string;
  fromMe?: boolean;
  participant?: string; // JID of the participant in a group message
}

// Represents the structure of a message as it comes from Baileys/Evolution API webhook
interface BaileysMessage {
  key: BaileysMessageKey;
  message?: any; // This is the actual Baileys message object (e.g., { conversation: "..." } or { imageMessage: { ... } })
  messageTimestamp?: number | Long; // Can be Long object from Baileys
  pushName?: string; // Sender's profile name
  notifyName?: string; // Sometimes used instead of pushName
  status?: string; // e.g., PENDING, SENT, DELIVERED, READ (often in MESSAGES_UPDATE)

  // V2 fields that might appear at this level or within data.message if data is the message itself
  body?: any; // Could be string for text, or object for media (Evolution API V2 specific)
  type?: string; // e.g., "text", "image", "video" (Evolution API V2 specific)
  mimetype?: string; // (Evolution API V2 specific)
  url?: string; // For media, direct URL from Evolution API (Evolution API V2 specific)
  caption?: string; // (Evolution API V2 specific)
  fileName?: string; // (Evolution API V2 specific)
}


interface ProcessedMessage {
  messageId: string;
  fromJid: string; // Who sent the message (can be user or lead)
  timestamp: Date;
  messageContent: string;
  messageType: string; // e.g., 'text', 'image', 'audio', 'document', 'sticker', 'unknown'
  mediaUrl?: string | null; // URL from webhook if provided, or Supabase URL if re-uploaded later
  mimeType?: string | null;
  isFromLead: boolean; // True if the message is from the contact/lead, false if from CRM user
  messageStatus?: string; // e.g., 'received', 'read', 'sent', 'delivered'
  fileName?: string | null;
  // rawMessage?: any; // Optional: for debugging or future use
}

// Helper to convert potential Long to number, as Baileys often uses Long for timestamps
function toNumber(value: number | Long | undefined | null): number | undefined {
  if (typeof value === 'number') return value;
  if (value && typeof value === 'object' && 'low' in value && 'high' in value && typeof (value as Long).toNumber === 'function') {
    return (value as Long).toNumber();
  }
  return undefined;
}


/**
 * Main webhook processor function
 */
export async function processWebhookEvent(webhookData: WebhookEvent): Promise<void> {
  try {
    // Enhanced initial logging
    console.log(`📥 ===== PROCESSING WEBHOOK EVENT: ${webhookData.event} =====`);
    console.log(`📥 Instance: ${webhookData.instance}, Sender: ${webhookData.sender || 'N/A'}, API Key: ${webhookData.apikey ? '[REDACTED]' : 'N/A'}, Timestamp: ${webhookData.date_time || new Date().toISOString()}`);

    // For development, log the full data. In production, be more selective.
    if (process.env.NODE_ENV === 'development' || process.env.DEBUG_WEBHOOKS === 'true') {
        console.log('📥 Full Webhook Data:', JSON.stringify(webhookData, null, 2));
    }

    switch (webhookData.event) {
      case 'QRCODE_UPDATED':
        await handleQRCodeUpdate(webhookData);
        break;
      case 'CONNECTION_UPDATE':
        await handleConnectionUpdate(webhookData);
        break;
      case 'MESSAGES_UPSERT':
      case 'messages.upsert': // Handle potential variations if Evolution API sends this
        await handleMessagesUpsert(webhookData);
        break;
      case 'MESSAGES_UPDATE':
      case 'messages.update': // Handle potential variations
        await handleMessagesUpdate(webhookData);
        break;
      case 'SEND_MESSAGE': // This might be specific to older versions or certain configs for outgoing message status
        await handleSendMessageConfirmation(webhookData); // Renamed for clarity
        break;
      case 'CHATS_UPSERT':
      case 'chats.upsert':
        await handleChatsUpsert(webhookData);
        break;
      case 'CONTACTS_UPSERT':
      case 'contacts.upsert':
        await handleContactsUpsert(webhookData);
        break;
      case 'APPLICATION_STARTUP':
        console.log(`🚀 Application startup event for instance ${webhookData.instance}. Data: ${JSON.stringify(webhookData.data)}`);
        // Could be used to verify instance is alive after a restart
        break;
      case 'PRESENCE_UPDATE':
        // console.log(`👁️ Presence update for instance ${webhookData.instance}. User: ${webhookData.data?.id}, Presence: ${webhookData.data?.type}`);
        // Example: { "id": "1234567890@s.whatsapp.net", "type": "available" } or { "id": "jid", "presence": "unavailable|available|composing|recording|paused", "t": timestamp }
        // Could update lead's online status if desired. For now, just log.
        if (webhookData.data?.id && webhookData.data?.presence) {
             console.log(`👁️ Presence: ${webhookData.data.id} is ${webhookData.data.presence}`);
        } else {
             console.log(`👁️ Presence update (unknown format): ${JSON.stringify(webhookData.data)}`);
        }
        break;
      case 'MESSAGES_DELETE':
        await handleMessagesDelete(webhookData);
        break;

      // V2 events from documentation (stubs or basic logging)
      case 'GROUP_UPDATE':
        console.log(`🔄 GROUP_UPDATE event for instance ${webhookData.instance}. Data: ${JSON.stringify(webhookData.data)}`);
        // Potentially update group metadata if groups are stored
        break;
      case 'GROUP_PARTICIPANTS_UPDATE':
        console.log(`👥 GROUP_PARTICIPANTS_UPDATE event for instance ${webhookData.instance}. Data: ${JSON.stringify(webhookData.data)}`);
        // Potentially update group participant info
        break;
      case 'NEW_JWT_TOKEN':
        console.log(`🔑 NEW_JWT_TOKEN event for instance ${webhookData.instance}. Token: ${webhookData.data?.token ? '[REDACTED]' : 'N/A'}`);
        // Potentially store new JWT if needed for other operations (securely)
        break;
      case 'CALL':
        console.log(`📞 CALL event for instance ${webhookData.instance}. Data: ${JSON.stringify(webhookData.data)}`);
        // Log call information, potentially create a call log record
        // Example: { "id": "call_id", "from": "sender_jid", "isVideo": false, "isGroup": false, "status": "offer" / "accept" / "reject" / "terminate" }
        break;

      default:
        console.warn(`⚠️ Unhandled event type: "${webhookData.event}" for instance ${webhookData.instance}. Consider adding a handler if this event is important.`);
        console.warn('⚠️ Full unhandled event data:', JSON.stringify(webhookData, null, 2));
        break;
    }
    console.log(`✅ Finished processing webhook event: ${webhookData.event} for instance ${webhookData.instance}`);

  } catch (error: any) {
    console.error(`❌ Fatal error in processWebhookEvent for event ${webhookData.event} (Instance: ${webhookData.instance}):`, error.message);
    if (error.stack) {
      console.error('❌ Stack trace:', error.stack);
    }
    // The route handler (e.g., app/api/whatsapp/webhook/route.ts) should catch this and return a 500.
    // No need to re-throw unless specific higher-level handling is required here.
  }
}


async function handleQRCodeUpdate(webhookData: WebhookEvent): Promise<void> {
  console.log(`📱 QR Code updated event processing for instance ${webhookData.instance}...`);
  try {
    const supabase = createServiceClient();
    // Evolution API V2 might send QR in `data.qrcode` or `data.base64` or `data.code`
    const qrCode = webhookData.data?.qrCode || webhookData.data?.base64 || webhookData.data?.code;
    const instanceName = webhookData.instance;

    if (qrCode) {
      const { error } = await supabase
        .from('whatsapp_connections')
        .upsert({
          instance_name: instanceName,
          status: 'connecting', // QR code means it's trying to connect or needs scanning
          qr_code: qrCode,
          error_message: null, // Clear previous errors
          last_event_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'instance_name', // Assumes instance_name is unique key or part of one
                                      // Ensure this matches your DB schema for whatsapp_connections
        });

      if (error) {
        console.error(`❌ Error saving QR code to database for instance ${instanceName}:`, error);
      } else {
        console.log(`✅ QR code for instance ${instanceName} saved/updated in database.`);
      }
    } else {
      console.warn(`⚠️ QRCODE_UPDATED event for instance ${instanceName} but no QR code found in data. Data: ${JSON.stringify(webhookData.data)}`);
    }
  } catch (error: any) {
    console.error(`❌ Exception in handleQRCodeUpdate for instance ${webhookData.instance}:`, error.message);
  }
}


async function handleConnectionUpdate(webhookData: WebhookEvent): Promise<void> {
  const instanceName = webhookData.instance;
  const state = webhookData.data?.state; // e.g., 'open', 'close', 'connecting'
  console.log(`🔗 Connection status updated event processing for instance ${instanceName}. New state: ${state || 'N/A'}`);
  
  try {
    const supabase = createServiceClient();
    const whatsappUser = webhookData.data?.user; // Contains { id (jid), name (pushName) }

    if (state) {
      let newStatus: Database['public']['Enums']['whatsapp_connection_status'] = 'disconnected';
      if (state === 'open') newStatus = 'connected';
      else if (state === 'connecting') newStatus = 'connecting';
      // TODO: Handle other states if Evolution API sends them, e.g., 'timeout', 'conflict'
      
      const updatePayload: Partial<Database['public']['Tables']['whatsapp_connections']['Row']> = {
        // instance_name is used in onConflict, so it must be part of the type if not already
        // id: generated by db or fetched if exists
        status: newStatus,
        whatsapp_user: whatsappUser || null, // Store user info like JID and push name
        last_event_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (newStatus === 'connected') {
        updatePayload.last_connected_at = new Date().toISOString();
        updatePayload.qr_code = null; // Clear QR code on successful connection
        updatePayload.error_message = null; // Clear previous errors
      } else if (newStatus === 'disconnected') {
        updatePayload.qr_code = null; // Clear QR code if disconnected
        // updatePayload.error_message = webhookData.data?.message || 'Disconnected'; // Optional: store reason
      }
      // 'connecting' state might still have a QR code if it was just scanned

      const { error } = await supabase
        .from('whatsapp_connections')
        .upsert({
            instance_name: instanceName, // Ensure this is part of the upsert payload for onConflict
            ...updatePayload
        } as Database['public']['Tables']['whatsapp_connections']['Insert'], { // Cast to Insert type
          onConflict: 'instance_name', // Ensure this constraint exists and is appropriate
        });

      if (error) {
        console.error(`❌ Error updating connection status to "${newStatus}" for instance ${instanceName}:`, error.message, error.details);
      } else {
        console.log(`✅ Connection status for instance ${instanceName} updated to: ${newStatus}. Connected User: ${whatsappUser?.name || 'N/A'} (JID: ${whatsappUser?.id || 'N/A'})`);
      }
    } else {
      console.warn(`⚠️ CONNECTION_UPDATE event for instance ${instanceName} but no 'state' found in data. Data: ${JSON.stringify(webhookData.data)}`);
    }
  } catch (error: any) {
    console.error(`❌ Exception in handleConnectionUpdate for instance ${instanceName}:`, error.message);
  }
}


async function handleMessagesUpsert(webhookData: WebhookEvent): Promise<void> {
  const instanceName = webhookData.instance;
  console.log(`📨 MESSAGES_UPSERT event processing for instance ${instanceName}.`);
  try {
    // Evolution V2 might send a single message object in `data` or an array in `data.messages`
    // Let's try to normalize this:
    let messagesToProcess: BaileysMessage[] = [];
    if (webhookData.data?.messages && Array.isArray(webhookData.data.messages)) {
        messagesToProcess = webhookData.data.messages;
    } else if (webhookData.data?.key && webhookData.data?.message) { // Single message object directly in data
        messagesToProcess = [webhookData.data as BaileysMessage];
    } else if (Array.isArray(webhookData.data)) { // data itself is an array of messages
        messagesToProcess = webhookData.data as BaileysMessage[];
    }


    if (messagesToProcess.length > 0) {
      console.log(`📨 Found ${messagesToProcess.length} message(s) in upsert event for instance ${instanceName}.`);
      for (const message of messagesToProcess) {
        try {
          // Ensure the message object is valid before processing
          if (!message?.key?.id || !message?.key?.remoteJid) {
            console.warn(`⚠️ Skipping invalid message object in MESSAGES_UPSERT batch (missing key.id or key.remoteJid):`, message);
            continue;
          }
          await processIncomingMessage(message, instanceName);
        } catch (indMsgError: any) {
          console.error(`❌ Error processing one message (ID: ${message?.key?.id}) from MESSAGES_UPSERT batch for instance ${instanceName}:`, indMsgError.message);
          // Optionally log the problematic message object for debugging
          // console.error('Problematic message object:', JSON.stringify(message, null, 2));
        }
      }
    } else {
      console.warn(`⚠️ MESSAGES_UPSERT for instance ${instanceName} but no valid messages found. Raw Data:`, JSON.stringify(webhookData.data, null, 2));
    }
  } catch (error: any) {
    console.error(`❌ Exception in handleMessagesUpsert for instance ${instanceName}:`, error.message);
  }
}


async function handleMessagesUpdate(webhookData: WebhookEvent): Promise<void> {
  const instanceName = webhookData.instance;
  console.log(`📝 MESSAGES_UPDATE event processing for instance ${instanceName}.`);
  try {
    // Evolution API V2 usually sends an array of update objects
    const updates = webhookData.data;
    if (updates && Array.isArray(updates)) {
      console.log(`📝 Found ${updates.length} message update(s) for instance ${instanceName}.`);
      const supabase = createServiceClient();
      for (const updateEntry of updates) {
        const messageKey = updateEntry.key as BaileysMessageKey;
        // `updateEntry.update` contains the fields that changed, e.g., { status: 'READ', ack: 3, t: timestamp }
        // or for reactions { reaction: { text: "👍", key: { ... } } }
        const messageChanges = updateEntry.update;

        if (messageKey?.id && messageChanges) {
          const newStatus = messageChanges.status; // e.g., "DELIVERED", "READ"
          const reaction = messageChanges.reaction; // For reaction updates

          if (newStatus) {
            const messageTimestampNum = toNumber(messageChanges.t || messageChanges.timestamp);

            console.log(`📝 Updating message ${messageKey.id}: status ${newStatus}, ack ${messageChanges.ack}`);
            const { error } = await supabase
              .from('whatsapp_messages')
              .update({
                message_status: String(newStatus).toLowerCase(),
                status_timestamp: messageTimestampNum ? new Date(messageTimestampNum * 1000) : new Date(),
                // raw_status_update: messageChanges, // Optional: store raw update for debugging
                updated_at: new Date().toISOString(),
              })
              .eq('message_id', messageKey.id)
              .eq('is_from_lead', messageKey.fromMe); // Apply status updates only to correct message direction

            if (error) {
              console.error(`❌ Error updating message status for ${messageKey.id} to ${newStatus}:`, error);
            } else {
              console.log(`✅ Message status for ${messageKey.id} updated to ${newStatus}.`);
            }
          } else if (reaction) {
            // Handle reaction updates - this is a more advanced feature
            console.log(`👍 Reaction received for message ${messageKey.id}: ${reaction.text}`);
            // You might want to store reactions in a separate table or update the message itself.
            // For now, just logging.
          } else {
            console.warn(`⚠️ MESSAGES_UPDATE for ${messageKey.id} with no actionable changes (no new status or reaction). Update data:`, messageChanges);
          }
        } else {
          console.warn('⚠️ Invalid message update entry (missing key.id or update data):', updateEntry);
        }
      }
    } else {
      console.warn(`⚠️ MESSAGES_UPDATE for instance ${instanceName} without a valid updates array. Data:`, webhookData.data);
    }
  } catch (error: any) {
    console.error(`❌ Exception in handleMessagesUpdate for instance ${instanceName}:`, error.message);
  }
}

// Renamed from handleSendMessage for clarity, as this is about confirmations of outgoing messages
async function handleSendMessageConfirmation(webhookData: WebhookEvent): Promise<void> {
  const instanceName = webhookData.instance;
  console.log(`📤 SEND_MESSAGE (confirmation) event processing for instance ${instanceName}.`);
  try {
    const messageData = webhookData.data; // This could be the BaileysMessage object or just key/status
    const messageId = messageData?.key?.id || messageData?.id; // Check common places for ID
    const status = messageData?.status; // e.g., "SENT", "DELIVERED" from the event itself

    if (messageId) {
      const supabase = createServiceClient();
      const updatePayload: Partial<Database['public']['Tables']['whatsapp_messages']['Row']> = {
        updated_at: new Date().toISOString(),
      };

      if (status) {
        updatePayload.message_status = String(status).toLowerCase();
      } else if (messageData?.message?.sentMsg) { // Another common pattern for sent confirmation
        updatePayload.message_status = 'sent';
      } else {
        updatePayload.message_status = 'sent'; // Default if no specific status provided
      }
      
      const eventTimestamp = toNumber(messageData.messageTimestamp || messageData.t || messageData.timestamp);
      if (eventTimestamp) {
        updatePayload.sent_timestamp = new Date(eventTimestamp * 1000);
      } else if (updatePayload.message_status === 'sent' && !('sent_timestamp' in updatePayload)) {
         // If no specific timestamp, but it's a sent confirmation, mark current time
        updatePayload.sent_timestamp = new Date();
      }

      const { error } = await supabase
        .from('whatsapp_messages')
        .update(updatePayload)
        .eq('message_id', messageId)
        .eq('is_from_lead', false); // Typically, SEND_MESSAGE confirmations are for messages sent by us

      if (error) {
        console.error(`❌ Error updating sent message confirmation for ${messageId} to status ${updatePayload.message_status}:`, error);
      } else {
        console.log(`✅ Sent message confirmation for ${messageId} processed. Status: ${updatePayload.message_status}.`);
      }
    } else {
      console.warn(`⚠️ SEND_MESSAGE event for instance ${instanceName} but no message ID found. Data:`, JSON.stringify(messageData, null, 2));
    }
  } catch (error: any) {
    console.error(`❌ Exception in handleSendMessageConfirmation for instance ${instanceName}:`, error.message);
  }
}


async function handleChatsUpsert(webhookData: WebhookEvent): Promise<void> {
  const instanceName = webhookData.instance;
  console.log(`💬 CHATS_UPSERT event processing for instance ${instanceName}.`);
  try {
    const chats = webhookData.data;
    if (chats && Array.isArray(chats)) {
      console.log(`💬 Found ${chats.length} chat(s) in upsert event for instance ${instanceName}.`);
      for (const chatData of chats) {
        // Example chatData: { id: "jid", name: "Chat Name", unreadCount: 0, conversationTimestamp: 1678886400 }
        console.log(`💬 Chat data: ID ${chatData.id}, Name ${chatData.name || 'N/A'}, Unread ${chatData.unreadCount || 0}, Timestamp ${toNumber(chatData.conversationTimestamp)}`);
        // Potential actions:
        // - Update local chat metadata if you store chat lists.
        // - Trigger actions based on unread count changes.
        // - Mark chats as archived/pinned if info is available.
      }
    } else {
      console.warn(`⚠️ CHATS_UPSERT for instance ${instanceName} without a valid chats array. Data:`, webhookData.data);
    }
  } catch (error: any) {
    console.error(`❌ Exception in handleChatsUpsert for instance ${instanceName}:`, error.message);
  }
}


async function handleContactsUpsert(webhookData: WebhookEvent): Promise<void> {
  const instanceName = webhookData.instance;
  console.log(`👥 CONTACTS_UPSERT event processing for instance ${instanceName}.`);
  try {
    const contacts = webhookData.data;
    if (contacts && Array.isArray(contacts)) {
      console.log(`👥 Found ${contacts.length} contact(s) in upsert event for instance ${instanceName}.`);
      for (const contactData of contacts) {
        const contactId = contactData.id; // JID
        const name = contactData.name || contactData.verifiedName || contactData.pushName; // Prioritize official name
        console.log(`👥 Contact data: ID ${contactId}, Name: "${name || 'N/A'}", PushName: "${contactData.pushName || 'N/A'}"`);
        
        if (contactId && name) {
          // This function updates the lead's name if it was a default one
          await updateLeadFromContact(contactData);
        }
      }
    } else {
      console.warn(`⚠️ CONTACTS_UPSERT for instance ${instanceName} without a valid contacts array. Data:`, webhookData.data);
    }
  } catch (error: any) {
    console.error(`❌ Exception in handleContactsUpsert for instance ${instanceName}:`, error.message);
  }
}


async function handleMessagesDelete(webhookData: WebhookEvent): Promise<void> {
  const instanceName = webhookData.instance;
  console.log(`🗑️ MESSAGES_DELETE event processing for instance ${instanceName}.`);
  try {
    // Structure can be: { "keys": [BaileysMessageKey, ...], "forEveryone": boolean }
    // Or sometimes just a single key in `data.key` or `data.keys` as a single object
    let keysToDelete: BaileysMessageKey[] = [];
    if (webhookData.data?.keys && Array.isArray(webhookData.data.keys)) {
        keysToDelete = webhookData.data.keys;
    } else if (webhookData.data?.key) { // Single key object
        keysToDelete = [webhookData.data.key];
    }


    if (keysToDelete.length > 0) {
      const supabase = createServiceClient();
      console.log(`🗑️ Found ${keysToDelete.length} message key(s) to mark as deleted for instance ${instanceName}.`);
      for (const key of keysToDelete) {
        if (key?.id) {
          const { error } = await supabase
            .from('whatsapp_messages')
            .update({
              deleted_at: new Date().toISOString(),
              message_content: '[Mensagem apagada]', // Indicate deletion
              message_status: 'deleted', // Custom status for deleted
              updated_at: new Date().toISOString(),
            })
            .eq('message_id', key.id);
          
          if (error) {
            console.error(`❌ Error marking message ${key.id} as deleted:`, error);
          } else {
            console.log(`🗑️ Message ${key.id} marked as deleted.`);
          }
        } else {
            console.warn(`⚠️ Invalid key in MESSAGES_DELETE:`, key);
        }
      }
    } else {
      console.warn(`⚠️ MESSAGES_DELETE for instance ${instanceName} but no valid keys found. Data:`, JSON.stringify(webhookData.data, null, 2));
    }
  } catch (error: any) {
    console.error(`❌ Exception in handleMessagesDelete for instance ${instanceName}:`, error.message);
  }
}


async function processIncomingMessage(message: BaileysMessage, instanceName: string): Promise<void> {
  const messageId = message.key?.id;
  try {
    // More detailed logging at the start of processing this specific message
    if (process.env.NODE_ENV === 'development' || process.env.DEBUG_WEBHOOKS === 'true') {
        console.log(`📨 [${instanceName}] Processing incoming message (ID: ${messageId}):`, JSON.stringify(message, null, 2));
    } else {
        console.log(`📨 [${instanceName}] Processing incoming message (ID: ${messageId}), From: ${message.key?.remoteJid}, Type: ${message.type || (message.message ? Object.keys(message.message)[0] : 'unknown')}`);
    }


    // Skip messages from the bot itself (fromMe is true)
    if (message.key?.fromMe) {
      console.log(`📨 [${instanceName}] Skipping own message (fromMe=true, ID: ${messageId}).`);
      return;
    }

    // Skip status broadcast messages (e.g., "user@s.whatsapp.net/status@broadcast")
    if (message.key?.remoteJid?.endsWith('status@broadcast')) {
      console.log(`📄 [${instanceName}] Skipping status broadcast message (ID: ${messageId}).`);
      return;
    }

    // Validate required fields like remoteJid and message ID
    if (!message.key?.remoteJid || !messageId) {
      console.warn(`⚠️ [${instanceName}] Message missing remoteJid or ID, skipping. Message:`, JSON.stringify(message.key));
      return;
    }

    const processedMessage = extractMessageData(message);
    if (!processedMessage) {
      console.warn(`⚠️ [${instanceName}] Could not extract data from message (ID: ${messageId}).`);
      return;
    }

    const { leadId, userId, isNewLead } = await findOrCreateLead(processedMessage.fromJid, message, instanceName);
    if (!leadId || !userId) {
      console.warn(`⚠️ [${instanceName}] Could not find or create lead for message (ID: ${messageId}, From: ${processedMessage.fromJid}).`);
      return;
    }
    if (isNewLead) {
        console.log(`✨ [${instanceName}] New lead created (ID: ${leadId}) for message (ID: ${messageId}).`);
    }

    await saveMessageToDatabase(processedMessage, leadId, userId, instanceName);
    console.log(`✅ [${instanceName}] Message (ID: ${messageId}) processed and saved successfully for lead ${leadId}.`);

  } catch (error: any) {
    console.error(`❌ Error processing individual message (ID: ${messageId}, Instance: ${instanceName}):`, error.message);
    // To aid debugging, log the problematic message structure if an error occurs
    // console.error('📋 Problematic message payload:', JSON.stringify(message, null, 2));
    // Do not re-throw here if you want the batch processing in handleMessagesUpsert to continue
  }
}


function extractMessageData(message: BaileysMessage): ProcessedMessage | null {
  try {
    const messageId = message.key.id;
    const fromJid = message.key.remoteJid;
    // messageTimestamp can be a number (seconds or ms) or a Long object
    const timestampNum = toNumber(message.messageTimestamp);
    const timestamp = timestampNum ? new Date(timestampNum * 1000) : new Date(); // Assume seconds if number, convert to ms

    if (!messageId || !fromJid) {
      console.error("extractMessageData: messageId or fromJid missing.", message.key);
      return null;
    }

    let messageContent = '';
    let messageType = 'unknown';
    let mediaUrl: string | undefined;
    let mimeType: string | undefined;
    let fileName: string | undefined;

    // Evolution API V2 style: type, body, url, mimetype, fileName, caption are often top-level in `message`
    if (message.type) { // V2 structure often has `type` directly in the message object
        messageType = message.type;
        mimeType = message.mimetype;
        mediaUrl = message.url; // This is the Evolution API's URL to the media
        fileName = message.fileName;

        if (messageType === 'text' || messageType === 'conversation') {
            messageContent = typeof message.body === 'string' ? message.body : JSON.stringify(message.body);
        } else if (message.caption) { // For media types
            messageContent = message.caption;
        } else {
            // Fallback content for media types if no caption
            messageContent = `[${messageType || 'media'}${fileName ? `: ${fileName}` : ''}]`;
        }
    }
    // Baileys style: message content is nested within message.message object
    else if (message.message) {
      const msgObj = message.message;
      if (msgObj.conversation) {
        messageContent = msgObj.conversation;
        messageType = 'text';
      } else if (msgObj.extendedTextMessage?.text) {
        messageContent = msgObj.extendedTextMessage.text;
        messageType = 'text';
      } else if (msgObj.imageMessage) {
        messageContent = msgObj.imageMessage.caption || '[Imagem]';
        messageType = 'image';
        mimeType = msgObj.imageMessage.mimetype;
        mediaUrl = msgObj.imageMessage.url; // Baileys direct URL or path
        fileName = msgObj.imageMessage.fileName;
      } else if (msgObj.videoMessage) {
        messageContent = msgObj.videoMessage.caption || '[Vídeo]';
        messageType = 'video';
        mimeType = msgObj.videoMessage.mimetype;
        mediaUrl = msgObj.videoMessage.url;
        fileName = msgObj.videoMessage.fileName;
      } else if (msgObj.audioMessage) {
        messageContent = '[Áudio]'; // Audio messages typically don't have captions
        messageType = 'audio';
        mimeType = msgObj.audioMessage.mimetype;
        mediaUrl = msgObj.audioMessage.url;
      } else if (msgObj.documentMessage) {
        messageContent = msgObj.documentMessage.title || msgObj.documentMessage.fileName || '[Documento]';
        messageType = 'document';
        mimeType = msgObj.documentMessage.mimetype;
        mediaUrl = msgObj.documentMessage.url;
        fileName = msgObj.documentMessage.fileName;
      } else if (msgObj.stickerMessage) {
        messageContent = '[Sticker]'; // Stickers usually don't have text content
        messageType = 'sticker';
        mimeType = msgObj.stickerMessage.mimetype;
        mediaUrl = msgObj.stickerMessage.url;
      } else if (msgObj.reactionMessage) {
        messageContent = `[Reação: ${msgObj.reactionMessage.text}] para msg ${msgObj.reactionMessage.key?.id}`;
        messageType = 'reaction';
      } else if (msgObj.locationMessage) {
        messageContent = `[Localização: ${msgObj.locationMessage.degreesLatitude}, ${msgObj.locationMessage.degreesLongitude}]`;
        messageType = 'location';
      } else if (msgObj.contactMessage) {
        messageContent = `[Contato: ${msgObj.contactMessage.displayName}]`;
        messageType = 'contact';
      } else if (msgObj.protocolMessage || msgObj.deviceSentMessage || msgObj.ephemeralMessage) {
        // These are often system messages, try to find nested actual message
        // This part can be complex, for now, just log type
        const nestedTypes = Object.keys(msgObj);
        messageType = nestedTypes[0] || 'system';
        messageContent = `[Mensagem de Protocolo/Sistema: ${messageType}]`;
        console.log(`extractMessageData: Found protocol/system type message: ${messageType}`);
      } else {
        // Fallback for other unknown message types
        const messageKeys = Object.keys(msgObj);
        const firstKey = messageKeys[0];
        if (firstKey && msgObj[firstKey]) {
          messageContent = msgObj[firstKey].text || msgObj[firstKey].caption || `[${firstKey.replace('Message', '')}]`;
          messageType = firstKey.replace('Message', '');
        } else {
          messageContent = '[Tipo de mensagem desconhecido]';
          messageType = 'unknown';
        }
      }
    } else if (typeof message.body === 'string' && !message.type) {
        // If only 'body' is present and is a string, assume it's a text message (compatibility)
        messageContent = message.body;
        messageType = 'text';
    }


    // Ensure content is a string
    if (typeof messageContent !== 'string') {
        messageContent = JSON.stringify(messageContent);
    }

    // If mediaUrl is from Evolution, it might need base URL if it's a path
    if (mediaUrl && !mediaUrl.startsWith('http')) {
        const evolutionApiUrl = process.env.EVOLUTION_API_URL?.replace(/\/$/, ''); // Remove trailing slash
        if (evolutionApiUrl) {
            mediaUrl = `${evolutionApiUrl}${mediaUrl.startsWith('/') ? '' : '/'}${mediaUrl}`;
            console.log(`📝 Prefixed media URL: ${mediaUrl}`);
        } else {
            console.warn("⚠️ EVOLUTION_API_URL not set, cannot prefix relative media URL:", mediaUrl);
        }
    }


    console.log(`📝 Extracted: Type='${messageType}', Content='${messageContent.substring(0, 50)}...', MediaURL='${mediaUrl}', Mime='${mimeType}', FileName='${fileName}'`);

    return {
      messageId,
      fromJid,
      timestamp,
      messageContent: messageContent.trim(),
      messageType: messageType.toLowerCase(),
      mediaUrl: mediaUrl || null,
      mimeType: mimeType || null,
      fileName: fileName || null,
      isFromLead: !message.key.fromMe, // fromMe is true if message is from the instance's number
      messageStatus: 'received', // Default status for incoming messages
    };

  } catch (error: any) {
    console.error('❌ Error extracting message data:', error.message, error.stack);
    console.error('Original message object that caused error:', JSON.stringify(message, null, 2));
    return null;
  }
}


async function findOrCreateLead(
    fromJid: string,
    message: BaileysMessage,
    instanceName: string
): Promise<{ leadId: string | null; userId: string | null; isNewLead: boolean }> {
  const defaultReturn = { leadId: null, userId: null, isNewLead: false };
  try {
    const supabase = createServiceClient();
    const phone = extractPhoneFromJid(fromJid);

    if (!phone) {
      console.error(`❌ [${instanceName}] Could not extract phone from JID: ${fromJid}`);
      return defaultReturn;
    }

    // Try different phone variations to find existing lead
    const phoneVariations = generatePhoneVariations(phone);
    for (const phoneVar of phoneVariations) {
      const { data: existingLead, error: leadError } = await supabase
        .from('leads')
        .select('id, user_id, name') // Select fields needed
        .eq('phone', phoneVar)
        // .eq('instance_name', instanceName) // If leads are instance-specific
        .maybeSingle();

      if (leadError) {
        console.error(`❌ [${instanceName}] Error searching for lead with phone ${phoneVar}:`, leadError.message);
        // Potentially continue to try other variations or creation
      }
      if (existingLead) {
        console.log(`✅ [${instanceName}] Existing lead found (ID: ${existingLead.id}, Name: ${existingLead.name}) for phone ${phoneVar}.`);
        return { leadId: existingLead.id, userId: existingLead.user_id, isNewLead: false };
      }
    }

    // No existing lead found, create a new one
    console.log(`📱 [${instanceName}] No existing lead found for phone ${phone} (from JID ${fromJid}). Creating new lead...`);
    const contactName = extractContactName(message, phone);

    // Assign lead to a user. This logic might need to be more sophisticated.
    // For now, find the user associated with the instance, or a default/first user.
    // This assumes 'whatsapp_connections' links instances to users.
    let assignedUserId: string | null = null;
    const { data: instanceConnection, error: instanceError } = await supabase
        .from('whatsapp_connections')
        .select('user_id')
        .eq('instance_name', instanceName)
        .maybeSingle();

    if (instanceError) {
        console.error(`❌ [${instanceName}] Error fetching user for instance:`, instanceError.message);
    }
    if (instanceConnection?.user_id) {
        assignedUserId = instanceConnection.user_id;
    } else {
        // Fallback: assign to the first user found (admin/default)
        const { data: firstUser, error: userError } = await supabase.from('users').select('id').limit(1).single();
        if (userError || !firstUser) {
            console.error(`❌ [${instanceName}] Could not find any user to assign new lead to:`, userError?.message);
            return defaultReturn;
        }
        assignedUserId = firstUser.id;
        console.warn(`⚠️ [${instanceName}] Instance not directly linked to a user. New lead will be assigned to first user found: ${assignedUserId}.`);
    }
    
    if (!assignedUserId) {
        console.error(`❌ [${instanceName}] Failed to determine a user ID for assigning the new lead.`);
        return defaultReturn;
    }


    const { data: newLead, error: newLeadError } = await supabase
      .from('leads')
      .insert({
        phone: phone, // Use the most "canonical" version of the phone number
        name: contactName,
        status: 'New', // Default status for new leads
        source: 'whatsapp',
        user_id: assignedUserId,
        // instance_name: instanceName, // If you want to associate lead with an instance
        last_contact_at: new Date().toISOString(),
      })
      .select('id, user_id')
      .single();

    if (newLeadError) {
      console.error(`❌ [${instanceName}] Error creating new lead for phone ${phone}:`, newLeadError.message, newLeadError.details);
      return defaultReturn;
    }
    if (newLead) {
      console.log(`✅ [${instanceName}] New lead created (ID: ${newLead.id}, Name: ${contactName}) for phone ${phone}, assigned to user ${newLead.user_id}.`);
      return { leadId: newLead.id, userId: newLead.user_id, isNewLead: true };
    }

    return defaultReturn; // Should not be reached if insert is successful

  } catch (error: any) {
    console.error(`❌ [${instanceName}] Exception in findOrCreateLead for JID ${fromJid}:`, error.message);
    return defaultReturn;
  }
}


function extractPhoneFromJid(jid: string): string | null {
  if (!jid || typeof jid !== 'string') return null;
  // Format: 1234567890@s.whatsapp.net (user) or 12345-5678@g.us (group)
  if (jid.includes('@g.us')) return null; // It's a group JID, not a user JID for lead

  const phoneMatch = jid.match(/^(\d{10,17})@/); // Allow longer numbers for international
  return phoneMatch ? phoneMatch[1] : null;
}


function generatePhoneVariations(phone: string): string[] {
  const variations: Set<string> = new Set();
  variations.add(phone);

  // Common international format: remove leading '+' if present
  if (phone.startsWith('+')) {
    variations.add(phone.substring(1));
  }
  
  // Brazil specific: 55 (DDD) (Number)
  if (phone.startsWith('55') && phone.length > 2) {
    const brDDD = phone.substring(2, 4);
    const brNumber = phone.substring(4);
    variations.add(`${brDDD}${brNumber}`); // DDD + Number

    // With 9th digit, common in some BR mobile numbers
    if (brNumber.length === 9 && brNumber.startsWith('9')) {
       // variations.add(`${brDDD}9${brNumber}`); // This seems redundant if brNumber already has 9
    } else if (brNumber.length === 8) {
       // variations.add(`${brDDD}9${brNumber}`); // Add 9th digit if 8 digits
    }
  }

  // Basic E.164 style if it looks like one (e.g. +14155552671)
  // No specific transformation here, just ensure it's included.

  return Array.from(variations);
}


function extractContactName(message: BaileysMessage, phone: string): string {
  // Prefer pushName (often user-set profile name)
  let contactName = message.pushName || message.notifyName;
  
  // If it's a group message, participant might be relevant if pushName is missing for that participant
  if (message.key?.participant && !contactName) {
    // This usually won't happen as pushName is for the sender of this specific message.
    // Participant is more for "who in the group sent this".
    // This logic might be better in a group-specific context.
  }

  // Fallback to a generic name if no pushName/notifyName
  if (!contactName || contactName.trim() === '' || contactName === phone) {
    contactName = `WhatsApp ${phone.substring(phone.length - 4)}`; // e.g., "WhatsApp 1234"
  }
  
  return contactName.trim();
}


async function saveMessageToDatabase(
    processedMessage: ProcessedMessage,
    leadId: string,
    userId: string,
    instanceName: string
): Promise<void> {
  try {
    const supabase = createServiceClient();

    // Idempotency Check: See if this message ID already exists
    const { data: existingMessage, error: checkError } = await supabase
      .from('whatsapp_messages')
      .select('id')
      .eq('message_id', processedMessage.messageId)
      .maybeSingle();

    if (checkError) {
      console.error(`❌ [${instanceName}] Error checking for existing message ${processedMessage.messageId}:`, checkError.message);
      // Decide whether to proceed or throw. For now, let's try to insert.
    }

    if (existingMessage) {
      console.warn(`⚠️ [${instanceName}] Message with ID ${processedMessage.messageId} already exists. Skipping save.`);
      // Optionally, update the existing message if new info is available (e.g., status update within same event)
      // For now, just skipping.
      return;
    }
    
    const messageDataToSave: Database['public']['Tables']['whatsapp_messages']['Insert'] = {
      lead_id: leadId,
      user_id: userId, // The CRM user associated with the lead/instance
      sender_jid: processedMessage.fromJid,
      // recipient_jid: processedMessage.isFromLead ? instanceJid : processedMessage.fromJid, // Requires instance's JID
      message_content: processedMessage.messageContent,
      message_type: processedMessage.messageType,
      message_timestamp: processedMessage.timestamp.toISOString(),
      message_id: processedMessage.messageId,
      is_from_lead: processedMessage.isFromLead,
      media_url: processedMessage.mediaUrl,
      mime_type: processedMessage.mimeType,
      file_name: processedMessage.fileName,
      message_status: processedMessage.messageStatus || (processedMessage.isFromLead ? 'received' : 'unknown'),
      instance_name: instanceName, // Store which instance processed this
      // created_at is default now()
      // raw_message: processedMessage.rawMessage, // If storing raw JSON
    };
    
    console.log(`💾 [${instanceName}] Saving message (ID: ${processedMessage.messageId}) to database for lead ${leadId}. Type: ${messageDataToSave.message_type}`);

    const { error: dbError } = await supabase
      .from('whatsapp_messages')
      .insert(messageDataToSave);

    if (dbError) {
      console.error(`❌ [${instanceName}] Error saving message (ID: ${processedMessage.messageId}) to database:`, dbError.message, dbError.details);
      // console.error('📋 Message data that failed:', JSON.stringify(messageDataToSave, null, 2));
      throw dbError; // Re-throw to be caught by the per-message try/catch in handleMessagesUpsert
    } else {
      console.log(`✅ [${instanceName}] Message (ID: ${processedMessage.messageId}) saved to database successfully for lead ${leadId}.`);
    }

  } catch (error: any) {
    console.error(`❌ [${instanceName}] Exception in saveMessageToDatabase (ID: ${processedMessage.messageId}):`, error.message);
    throw error; // Re-throw
  }
}


async function updateLeadFromContact(contactData: any): Promise<void> {
  const instanceName = contactData.instanceName || 'default'; // Assuming contactData might have instance info
  const contactJid = contactData.id; // This is the JID of the contact
  const newName = contactData.name || contactData.verifiedName || contactData.pushName;

  if (!contactJid || !newName) {
    // console.log(`[${instanceName}] updateLeadFromContact: Missing JID or new name. Data:`, contactData);
    return;
  }

  const phone = extractPhoneFromJid(contactJid);
  if (!phone) {
    // console.log(`[${instanceName}] updateLeadFromContact: Could not extract phone from JID ${contactJid}.`);
    return;
  }

  console.log(`🔄 [${instanceName}] Attempting to update lead name for phone ${phone} to "${newName}" based on contact update.`);
  try {
    const supabase = createServiceClient();
    const phoneVariations = generatePhoneVariations(phone);

    for (const phoneVar of phoneVariations) {
      // Find leads matching the phone number that might have a default name
      const { data: leadsToUpdate, error: findError } = await supabase
        .from('leads')
        .select('id, name')
        .eq('phone', phoneVar)
        // Update if name is default (e.g., "WhatsApp 1234") or if new name is presumably better (e.g. verifiedName)
        // This condition `ilike WhatsApp %` is an example; adjust as needed.
        .ilike('name', `WhatsApp ${phoneVar.substring(phoneVar.length - 4)}%`);

      if (findError) {
        console.error(`❌ [${instanceName}] Error finding leads to update for phone ${phoneVar}:`, findError.message);
        continue;
      }

      if (leadsToUpdate && leadsToUpdate.length > 0) {
        for (const lead of leadsToUpdate) {
          if (lead.name !== newName) { // Only update if different
            const { error: updateError } = await supabase
              .from('leads')
              .update({
                name: newName,
                updated_at: new Date().toISOString(),
              })
              .eq('id', lead.id);

            if (updateError) {
              console.error(`❌ [${instanceName}] Error updating lead ID ${lead.id} (phone ${phoneVar}) to name "${newName}":`, updateError.message);
            } else {
              console.log(`✅ [${instanceName}] Lead ID ${lead.id} (phone ${phoneVar}) name updated to "${newName}".`);
            }
          }
        }
      }
    }
  } catch (error: any) {
    console.error(`❌ [${instanceName}] Exception in updateLeadFromContact for phone ${phone}:`, error.message);
  }
}