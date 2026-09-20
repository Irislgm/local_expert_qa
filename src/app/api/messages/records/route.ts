import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const channel = searchParams.get('channel');
  const page = Number(searchParams.get('page') || '1');
  const pageSize = Number(searchParams.get('page_size') || '20');

  const client = getSupabaseClient();

  let query = client
    .from('message_records')
    .select('id, template_id, contact_id, channel, title, content, status, sent_at, delivered_at, error_message, created_at, message_templates(name), contacts(name)');

  if (status) query = query.eq('status', status);
  if (channel) query = query.eq('channel', channel);

  query = query.order('created_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data, total: count });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const client = getSupabaseClient();

  const { data, error } = await client
    .from('message_records')
    .insert({
      template_id: body.template_id || null,
      contact_id: body.contact_id || null,
      channel: body.channel,
      title: body.title || null,
      content: body.content,
      status: body.status || 'pending',
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const client = getSupabaseClient();

  const updateData: Record<string, unknown> = {
    status: body.status,
  };

  if (body.status === 'sent') {
    updateData.sent_at = new Date().toISOString();
  }
  if (body.status === 'delivered') {
    updateData.delivered_at = new Date().toISOString();
  }
  if (body.error_message) {
    updateData.error_message = body.error_message;
  }

  const { data, error } = await client
    .from('message_records')
    .update(updateData)
    .eq('id', body.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const client = getSupabaseClient();
  const { error } = await client.from('message_records').delete().eq('id', Number(id));
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
