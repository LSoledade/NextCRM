import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabase/admin';
import crypto from 'crypto';

export async function POST(request: Request) {

  // 1. Verify HMAC Signature (optional)
  const chatwootWebhookSecret = process.env.CHATWOOT_WEBHOOK_SECRET;
  const signature = request.headers.get('x-chatwoot-hmac-sha256');
  const body = await request.text();

  // Se há uma chave secreta configurada, validar HMAC
  if (chatwootWebhookSecret && signature) {
    const hmac = crypto.createHmac('sha256', chatwootWebhookSecret);
    const digest = hmac.update(body).digest('hex');

    if (digest !== signature) {
      console.error('Invalid HMAC signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
    console.log('✅ HMAC signature validated');
  } else if (chatwootWebhookSecret && !signature) {
    console.error('HMAC secret configured but no signature provided');
    return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
  } else {
    console.log('⚠️ HMAC validation skipped (no secret configured)');
  }

  // 2. Parse the payload
  const payload = JSON.parse(body);
  const { event, name, email, phone_number, custom_attributes } = payload;

  // 3. Process only contact_created and contact_updated events
  if (event !== 'contact_created' && event !== 'contact_updated') {
    return NextResponse.json({ message: `Event ${event} not processed.` }, { status: 200 });
  }

  if (!email && !phone_number) {
    return NextResponse.json({ error: 'Email or phone number is required.' }, { status: 400 });
  }

  try {
    // 4. Check if lead exists
    let query = supabaseAdmin.from('leads').select('id').or(`email.eq.${email},phone.eq.${phone_number}`);
    const { data: existingLead, error: queryError } = await query.maybeSingle();

    if (queryError) {
      console.error('Error querying for existing lead:', queryError);
      throw queryError;
    }

    const leadData = {
      name: name,
      email: email,
      phone: phone_number,
      source: 'Chatwoot',
      tags: custom_attributes?.tags || [],
      company: custom_attributes?.company_name || null,
      user_id: process.env.DEFAULT_USER_ID_FOR_LEADS || null,
    };

    // 5. Upsert logic
    if (existingLead) {
      // Update existing lead
      const { data, error } = await supabaseAdmin
        .from('leads')
        .update(leadData)
        .eq('id', existingLead.id)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ message: 'Lead updated successfully', lead: data });
    } else {
      // Create new lead
      const { data, error } = await supabaseAdmin
        .from('leads')
        .insert([{ ...leadData, status: 'New' }])
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ message: 'Lead created successfully', lead: data }, { status: 201 });
    }
  } catch (error: any) {
    console.error('Error processing webhook:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}