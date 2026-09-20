import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const countOnly = searchParams.get('count') === 'true';
  const category = searchParams.get('category');
  const channel = searchParams.get('channel');
  const page = Number(searchParams.get('page') || '1');
  const pageSize = Number(searchParams.get('page_size') || '20');

  const client = getSupabaseClient();

  if (countOnly) {
    let query = client.from('message_templates').select('*', { count: 'exact', head: true });
    if (category) query = query.eq('category', category);
    if (channel) query = query.eq('channel', channel);
    const { count, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ count: count || 0 });
  }

  let query = client
    .from('message_templates')
    .select('id, name, category, channel, title_template, content_template, variables, is_active, created_at, updated_at');

  if (category) query = query.eq('category', category);
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
    .from('message_templates')
    .insert({
      name: body.name,
      category: body.category || 'notification',
      channel: body.channel || 'sms',
      title_template: body.title_template || null,
      content_template: body.content_template,
      variables: body.variables ? JSON.stringify(body.variables) : null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const client = getSupabaseClient();

  const { data, error } = await client
    .from('message_templates')
    .update({
      name: body.name,
      category: body.category,
      channel: body.channel,
      title_template: body.title_template || null,
      content_template: body.content_template,
      variables: body.variables ? JSON.stringify(body.variables) : null,
      is_active: body.is_active,
      updated_at: new Date().toISOString(),
    })
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
  const { error } = await client.from('message_templates').delete().eq('id', Number(id));
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
