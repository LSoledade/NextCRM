/**
 * Optimized Webhook Processor for Evolution API
 * Handles incoming webhook events with improved message persistence and error handling
 */

import { createServiceClient } from '@/utils/supabase/service';

// Type definitions for webhook events
interface WebhookEvent {
  event: string;
  instance: string;
  data: any;
  destination?: string;
  date_time?: string;
}

interface WhatsAppMessage {
  key: {
    id: string;
    remoteJid: string;
    fromMe?: boolean;
    participant?: string;
  };
  message?: any;
  messageTimestamp?: number;
  pushName?: string;
  notifyName?: string;
  status?: string;
}

interface ProcessedMessage {
  messageId: string;
  fromJid: string;
  timestamp: Date;
  messageContent: string;
  messageType: string;
  mediaUrl?: string;
  mimeType?: string;
  isFromLead: boolean;
}

/**
 * Main webhook processor function
 */
export async function processWebhookEvent(webhookData: WebhookEvent): Promise<void> {
  try {
    console.log('📥 ===== PROCESSING WEBHOOK EVENT =====');
    console.log('📥 Event:', webhookData.event);
    console.log('📥 Instance:', webhookData.instance);
    console.log('📥 Data:', JSON.stringify(webhookData, null, 2));
    console.log('📥 ====================================');

    // Process different types of events
    switch (webhookData.event) {
      case 'QRCODE_UPDATED':
        await handleQRCodeUpdate(webhookData);
        break;

      case 'CONNECTION_UPDATE':
        await handleConnectionUpdate(webhookData);
        break;

      case 'MESSAGES_UPSERT':
        await handleMessagesUpsert(webhookData);
        break;

      case 'MESSAGES_UPDATE':
      case 'messages.update':
        await handleMessagesUpdate(webhookData);
        break;

      case 'SEND_MESSAGE':
        await handleSendMessage(webhookData);
        break;

      case 'CHATS_UPSERT':
      case 'chats.upsert':
        await handleChatsUpsert(webhookData);
        break;

      case 'CONTACTS_UPSERT':
        await handleContactsUpsert(webhookData);
        break;

      case 'APPLICATION_STARTUP':
        console.log('🚀 Application started');
        break;

      case 'PRESENCE_UPDATE':
        console.log('👁️ Presence status updated');
        break;

      case 'MESSAGES_DELETE':
        await handleMessagesDelete(webhookData);
        break;

      default:
        console.log(`⚠️ Unhandled event: ${webhookData.event}`);
        console.log('⚠️ Event data:', JSON.stringify(webhookData, null, 2));
        break;
    }

  } catch (error: any) {
    console.error('❌ Error processing webhook:', error.message);
    console.error('❌ Stack trace:', error.stack);
    throw error;
  }
}

/**
 * Handle QR code updates
 */
async function handleQRCodeUpdate(webhookData: WebhookEvent): Promise<void> {
  console.log('📱 QR Code updated');
  
  try {
    const supabase = createServiceClient();
    const qrCode = webhookData.data?.qrCode || webhookData.data?.code;
    
    if (qrCode) {
      // Update or create WhatsApp connection record
      await supabase
        .from('whatsapp_connections')
        .upsert({
          instance_name: webhookData.instance,
          status: 'connecting',
          qr_code: qrCode,
          updated_at: new Date()
        }, {
          onConflict: 'instance_name'
        });
      
      console.log('✅ QR code saved to database');
    }
  } catch (error: any) {
    console.error('❌ Error handling QR code update:', error.message);
  }
}

/**
 * Handle connection status updates
 */
async function handleConnectionUpdate(webhookData: WebhookEvent): Promise<void> {
  console.log('🔗 Connection status updated:', webhookData.data?.state);
  
  try {
    const supabase = createServiceClient();
    const state = webhookData.data?.state;
    
    if (state) {
      const status = state === 'open' ? 'connected' : 'disconnected';
      
      // Update connection status
      await supabase
        .from('whatsapp_connections')
        .upsert({
          instance_name: webhookData.instance,
          status: status,
          last_connected_at: status === 'connected' ? new Date() : undefined,
          whatsapp_user: webhookData.data?.user || null,
          updated_at: new Date()
        }, {
          onConflict: 'instance_name'
        });
      
      console.log(`✅ Connection status updated to: ${status}`);
    }
  } catch (error: any) {
    console.error('❌ Error handling connection update:', error.message);
  }
}

/**
 * Handle incoming messages
 */
async function handleMessagesUpsert(webhookData: WebhookEvent): Promise<void> {
  console.log('📨 Processing incoming messages');
  
  try {
    if (webhookData.data?.messages && Array.isArray(webhookData.data.messages)) {
      console.log(`📨 Processing ${webhookData.data.messages.length} messages`);
      
      for (const message of webhookData.data.messages) {
        await processIncomingMessage(message, webhookData.instance);
      }
    } else {
      console.warn('⚠️ MESSAGES_UPSERT without valid messages array:', {
        hasData: !!webhookData.data,
        hasMessages: !!webhookData.data?.messages,
        messagesIsArray: Array.isArray(webhookData.data?.messages),
        messagesLength: webhookData.data?.messages?.length || 0
      });
    }
  } catch (error: any) {
    console.error('❌ Error handling messages upsert:', error.message);
  }
}

/**
 * Handle message updates (read receipts, delivery status)
 */
async function handleMessagesUpdate(webhookData: WebhookEvent): Promise<void> {
  console.log('📝 Processing message updates');
  
  try {
    if (webhookData.data && Array.isArray(webhookData.data)) {
      for (const updateData of webhookData.data) {
        console.log('📝 Message update:', {
          messageId: updateData.key?.id,
          from: updateData.key?.remoteJid,
          status: updateData.update?.status,
          timestamp: updateData.update?.statusTimestamp
        });
        
        // Update message status in database
        if (updateData.key?.id && updateData.update?.status) {
          const supabase = createServiceClient();
          
          await supabase
            .from('whatsapp_messages')
            .update({
              message_status: updateData.update.status,
              status_timestamp: updateData.update.statusTimestamp ? 
                new Date(updateData.update.statusTimestamp * 1000) : null,
              updated_at: new Date()
            })
            .eq('message_id', updateData.key.id);
        }
      }
    }
  } catch (error: any) {
    console.error('❌ Error handling message updates:', error.message);
  }
}

/**
 * Handle sent message confirmations
 */
async function handleSendMessage(webhookData: WebhookEvent): Promise<void> {
  console.log('📤 Message send confirmation received');
  
  try {
    const messageData = webhookData.data;
    if (messageData?.key?.id) {
      const supabase = createServiceClient();
      
      // Update message with delivery confirmation
      await supabase
        .from('whatsapp_messages')
        .update({
          message_status: 'sent',
          sent_timestamp: new Date(),
          updated_at: new Date()
        })
        .eq('message_id', messageData.key.id);
      
      console.log('✅ Send confirmation processed');
    }
  } catch (error: any) {
    console.error('❌ Error handling send message:', error.message);
  }
}

/**
 * Handle chat updates
 */
async function handleChatsUpsert(webhookData: WebhookEvent): Promise<void> {
  console.log('💬 Processing chat updates');
  
  try {
    if (webhookData.data && Array.isArray(webhookData.data)) {
      for (const chatData of webhookData.data) {
        console.log('💬 Chat update:', {
          id: chatData.id,
          name: chatData.name,
          unreadCount: chatData.unreadCount,
          lastMessageTimestamp: chatData.conversationTimestamp
        });
        
        // Here you could update chat metadata if needed
        // For now, we'll just log the information
      }
    }
  } catch (error: any) {
    console.error('❌ Error handling chats upsert:', error.message);
  }
}

/**
 * Handle contact updates
 */
async function handleContactsUpsert(webhookData: WebhookEvent): Promise<void> {
  console.log('👥 Processing contact updates');
  
  try {
    if (webhookData.data && Array.isArray(webhookData.data)) {
      for (const contactData of webhookData.data) {
        console.log('👥 Contact update:', {
          id: contactData.id,
          name: contactData.name || contactData.pushName,
          number: contactData.number
        });
        
        // Update lead information if contact exists
        if (contactData.id && contactData.name) {
          await updateLeadFromContact(contactData);
        }
      }
    }
  } catch (error: any) {
    console.error('❌ Error handling contacts upsert:', error.message);
  }
}

/**
 * Handle message deletions
 */
async function handleMessagesDelete(webhookData: WebhookEvent): Promise<void> {
  console.log('🗑️ Processing message deletions');
  
  try {
    if (webhookData.data && Array.isArray(webhookData.data)) {
      const supabase = createServiceClient();
      
      for (const deleteData of webhookData.data) {
        if (deleteData.key?.id) {
          await supabase
            .from('whatsapp_messages')
            .update({
              deleted_at: new Date(),
              message_content: '[Mensagem deletada]',
              updated_at: new Date()
            })
            .eq('message_id', deleteData.key.id);
          
          console.log('🗑️ Message marked as deleted:', deleteData.key.id);
        }
      }
    }
  } catch (error: any) {
    console.error('❌ Error handling message deletions:', error.message);
  }
}

/**
 * Process individual incoming message
 */
async function processIncomingMessage(message: WhatsAppMessage, instanceName: string): Promise<void> {
  try {
    console.log('📨 ===== PROCESSING INDIVIDUAL MESSAGE =====');
    console.log('📨 Full message data:');
    console.log(JSON.stringify(message, null, 2));
    console.log('📨 =========================================');
    
    console.log('📨 Processing incoming message:', {
      messageId: message.key?.id,
      from: message.key?.remoteJid,
      timestamp: message.messageTimestamp,
      messageType: message.message ? Object.keys(message.message)[0] : 'unknown',
      pushName: message.pushName,
      notifyName: message.notifyName,
      fromMe: message.key?.fromMe
    });

    // Skip messages from the bot itself
    if (message.key?.fromMe) {
      console.log('📨 Skipping message from bot itself');
      return;
    }

    // Skip status messages
    if (message.key?.remoteJid?.includes('status@broadcast')) {
      console.log('📄 Skipping status message');
      return;
    }

    // Validate required fields
    if (!message.key?.remoteJid || !message.key?.id) {
      console.warn('⚠️ Message missing required fields, skipping');
      return;
    }

    // Extract and process message information
    const processedMessage = extractMessageData(message);
    
    if (!processedMessage) {
      console.warn('⚠️ Could not extract message data');
      return;
    }

    // Find or create lead
    const { leadId, userId } = await findOrCreateLead(processedMessage.fromJid, message);
    
    if (!leadId || !userId) {
      console.warn('⚠️ Could not find or create lead for message');
      return;
    }

    // Save message to database
    await saveMessageToDatabase(processedMessage, leadId, userId);
    
    console.log('✅ Message processed successfully');

  } catch (error: any) {
    console.error('❌ Error processing individual message:', error.message);
    console.error('📋 Message payload:', JSON.stringify(message, null, 2));
  }
}

/**
 * Extract message data from WhatsApp message object
 */
function extractMessageData(message: WhatsAppMessage): ProcessedMessage | null {
  try {
    const messageId = message.key?.id;
    const fromJid = message.key?.remoteJid;
    const timestamp = message.messageTimestamp ? new Date(message.messageTimestamp * 1000) : new Date();
    
    if (!messageId || !fromJid) {
      return null;
    }

    let messageContent = '';
    let messageType = 'text';
    let mediaUrl: string | undefined;
    let mimeType: string | undefined;

    if (message.message) {
      if (message.message.conversation) {
        messageContent = message.message.conversation;
        messageType = 'text';
      } else if (message.message.extendedTextMessage) {
        messageContent = message.message.extendedTextMessage.text;
        messageType = 'text';
      } else if (message.message.imageMessage) {
        messageContent = message.message.imageMessage.caption || '[Imagem]';
        messageType = 'image';
        mimeType = message.message.imageMessage.mimetype;
      } else if (message.message.videoMessage) {
        messageContent = message.message.videoMessage.caption || '[Vídeo]';
        messageType = 'video';
        mimeType = message.message.videoMessage.mimetype;
      } else if (message.message.audioMessage) {
        messageContent = '[Áudio]';
        messageType = 'audio';
        mimeType = message.message.audioMessage.mimetype;
      } else if (message.message.documentMessage) {
        messageContent = message.message.documentMessage.fileName || '[Documento]';
        messageType = 'document';
        mimeType = message.message.documentMessage.mimetype;
      } else if (message.message.stickerMessage) {
        messageContent = '[Sticker]';
        messageType = 'sticker';
        mimeType = message.message.stickerMessage.mimetype;
      } else {
        // Try to extract content from other message types
        const messageKeys = Object.keys(message.message);
        const firstKey = messageKeys[0];
        if (firstKey && message.message[firstKey]) {
          messageContent = message.message[firstKey].text || 
                          message.message[firstKey].caption || 
                          `[${firstKey.replace('Message', '')}]`;
          messageType = firstKey.replace('Message', '');
        }
      }
    }

    console.log('📝 Extracted message content:', {
      type: messageType,
      content: messageContent.substring(0, 100) + (messageContent.length > 100 ? '...' : ''),
      hasMedia: !!mediaUrl,
      contentLength: messageContent.length
    });

    return {
      messageId,
      fromJid,
      timestamp,
      messageContent,
      messageType,
      mediaUrl,
      mimeType,
      isFromLead: true
    };

  } catch (error: any) {
    console.error('❌ Error extracting message data:', error.message);
    return null;
  }
}

/**
 * Find existing lead or create new one
 */
async function findOrCreateLead(fromJid: string, message: WhatsAppMessage): Promise<{ leadId: string | null; userId: string | null }> {
  try {
    const supabase = createServiceClient();
    
    // Extract phone number from JID
    const phone = extractPhoneFromJid(fromJid);
    
    if (!phone) {
      console.error('❌ Could not extract phone from JID:', fromJid);
      return { leadId: null, userId: null };
    }

    console.log('📞 Phone extracted:', phone);
    
    // Try different phone variations
    const phoneVariations = generatePhoneVariations(phone);
    console.log('🔍 Trying phone variations:', phoneVariations);
    
    // Look for existing lead
    for (const phoneVar of phoneVariations) {
      console.log(`🔍 Searching for lead with phone: ${phoneVar}`);
      
      const { data: lead, error: leadError } = await supabase
        .from('leads')
        .select('id, phone, user_id, name')
        .eq('phone', phoneVar)
        .maybeSingle();
        
      if (lead && !leadError) {
        console.log('✅ Existing lead found:', { leadId: lead.id, userId: lead.user_id, phone: phoneVar, name: lead.name });
        return { leadId: lead.id, userId: lead.user_id };
      }
    }
    
    // No existing lead found, create new one
    console.log('📱 No existing lead found, creating new one...');
    
    // Extract contact name
    let contactName = extractContactName(message, phone);
    
    // Find first active user to assign the lead
    const { data: firstUser, error: userError } = await supabase
      .from('users')
      .select('id')
      .limit(1)
      .single();
      
    if (!firstUser || userError) {
      console.error('❌ Could not find user to assign lead:', userError);
      return { leadId: null, userId: null };
    }

    const userId = firstUser.id;
    
    console.log('🆕 Creating new lead:', {
      phone,
      name: contactName,
      userId
    });
    
    // Create new lead
    const { data: newLead, error: newLeadError } = await supabase
      .from('leads')
      .insert({
        phone,
        name: contactName,
        status: 'New',
        source: 'whatsapp',
        user_id: userId
      })
      .select('id')
      .single();
      
    if (newLead && !newLeadError) {
      console.log('✅ New lead created:', { leadId: newLead.id, userId, phone, name: contactName });
      return { leadId: newLead.id, userId };
    } else {
      console.error('❌ Error creating new lead:', newLeadError);
      return { leadId: null, userId: null };
    }

  } catch (error: any) {
    console.error('❌ Error finding/creating lead:', error.message);
    return { leadId: null, userId: null };
  }
}

/**
 * Extract phone number from WhatsApp JID
 */
function extractPhoneFromJid(jid: string): string | null {
  // Format: 5511999999999@s.whatsapp.net
  const phoneMatch = jid.match(/^(\d{10,15})@/);
  if (phoneMatch) {
    return phoneMatch[1];
  }
  
  // Fallback: try to extract any phone number pattern
  const phoneMatch2 = jid.match(/(\d{10,15})/);
  if (phoneMatch2) {
    return phoneMatch2[1];
  }
  
  return null;
}

/**
 * Generate phone number variations for matching
 */
function generatePhoneVariations(phone: string): string[] {
  const variations = [
    phone,
    phone.replace(/^55/, ''), // Remove Brazil country code
    '55' + phone.replace(/^55/, ''), // Add Brazil country code
    phone.replace(/^(\d{2})(\d{8,9})$/, '$1$2'), // Basic format
    phone.replace(/^(\d{2})(\d{1})(\d{8})$/, '$1$2$3'), // With 9th digit
  ];
  
  // Remove duplicates
  return variations.filter((value, index, arr) => arr.indexOf(value) === index);
}

/**
 * Extract contact name from message
 */
function extractContactName(message: WhatsAppMessage, phone: string): string {
  let contactName = null;
  
  if (message.pushName && message.pushName.trim()) {
    contactName = message.pushName.trim();
  } else if (message.notifyName && message.notifyName.trim()) {
    contactName = message.notifyName.trim();
  } else if (message.key?.participant) {
    contactName = message.key.participant;
  }
  
  // If no name found or name is same as phone, use default
  if (!contactName || contactName === phone) {
    contactName = `WhatsApp ${phone}`;
  }
  
  return contactName;
}

/**
 * Save message to database
 */
async function saveMessageToDatabase(processedMessage: ProcessedMessage, leadId: string, userId: string): Promise<void> {
  try {
    const supabase = createServiceClient();
    
    console.log('💾 Saving message to database:', { 
      leadId, 
      userId, 
      messageType: processedMessage.messageType, 
      contentLength: processedMessage.messageContent.length,
      timestamp: processedMessage.timestamp.toISOString()
    });
    
    const messageData = {
      lead_id: leadId,
      user_id: userId,
      sender_jid: processedMessage.fromJid,
      message_content: processedMessage.messageContent,
      message_type: processedMessage.messageType,
      message_timestamp: processedMessage.timestamp,
      message_id: processedMessage.messageId,
      is_from_lead: processedMessage.isFromLead,
      media_url: processedMessage.mediaUrl,
      mime_type: processedMessage.mimeType,
      created_at: new Date()
    };
    
    const { error: dbError } = await supabase
      .from('whatsapp_messages')
      .insert(messageData);
      
    if (dbError) {
      console.error('❌ Error saving message to database:', dbError);
      console.error('📋 Message data:', messageData);
      throw dbError;
    } else {
      console.log('✅ Message saved to database successfully');
      console.log('📊 Saved message stats:', {
        leadId,
        messageType: processedMessage.messageType,
        contentPreview: processedMessage.messageContent.substring(0, 50) + '...',
        timestamp: processedMessage.timestamp.toISOString()
      });
    }

  } catch (error: any) {
    console.error('❌ Error saving message to database:', error.message);
    throw error;
  }
}

/**
 * Update lead information from contact data
 */
async function updateLeadFromContact(contactData: any): Promise<void> {
  try {
    const supabase = createServiceClient();
    const phone = extractPhoneFromJid(contactData.id);
    
    if (!phone || !contactData.name) {
      return;
    }
    
    const phoneVariations = generatePhoneVariations(phone);
    
    // Update lead name if found
    for (const phoneVar of phoneVariations) {
      const { error } = await supabase
        .from('leads')
        .update({
          name: contactData.name,
          updated_at: new Date()
        })
        .eq('phone', phoneVar)
        .eq('name', `WhatsApp ${phoneVar}`); // Only update if name is still default
      
      if (!error) {
        console.log('✅ Lead name updated from contact:', { phone: phoneVar, name: contactData.name });
        break;
      }
    }
    
  } catch (error: any) {
    console.error('❌ Error updating lead from contact:', error.message);
  }
}