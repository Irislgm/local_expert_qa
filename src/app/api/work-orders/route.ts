import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const countOnly = searchParams.get('count') === 'true';
  const status = searchParams.get('status');
  const priority = searchParams.get('priority');
  const type = searchParams.get('type');
  const search = searchParams.get('search');
  const page = Number(searchParams.get('page') || '1');
  const pageSize = Number(searchParams.get('page_size') || '20');

  const client = getSupabaseClient();

  if (countOnly) {
    let query = client.from('work_orders').select('*', { count: 'exact', head: true });
    if (status) query = query.eq('status', status);
    if (priority) query = query.eq('priority', priority);
    if (type) query = query.eq('type', type);
    const { count, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ count: count || 0 });
  }

  let query = client
    .from('work_orders')
    .select(`
      id, order_no, title, description, type, priority, status, source,
      creator_id, assignee_id, location, expected_resolve_at, resolved_at, closed_at, created_at, updated_at,
      creator:contacts!fk_work_orders_creator(id, name),
      assignee:contacts!fk_work_orders_assignee(id, name)
    `);

  if (status) query = query.eq('status', status);
  if (priority) query = query.eq('priority', priority);
  if (type) query = query.eq('type', type);
  if (search) query = query.or(`title.ilike.%${search}%,order_no.ilike.%${search}%`);

  query = query.order('created_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data, total: count });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const client = getSupabaseClient();

  // Generate order number
  const now = new Date();
  const orderNo = `WO${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;

  const { data, error } = await client
    .from('work_orders')
    .insert({
      order_no: orderNo,
      title: body.title,
      description: body.description || null,
      type: body.type || 'fault',
      priority: body.priority || 'medium',
      status: 'pending',
      source: body.source || 'manual',
      creator_id: body.creator_id || null,
      assignee_id: body.assignee_id || null,
      location: body.location || null,
      expected_resolve_at: body.expected_resolve_at || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Create log entry
  await client.from('work_order_logs').insert({
    work_order_id: data.id,
    action: 'created',
    operator_id: body.creator_id || null,
    comment: body.description || '工单创建',
  });

  return NextResponse.json(data, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const client = getSupabaseClient();

  // Get current status for logging
  const { data: current } = await client
    .from('work_orders')
    .select('status')
    .eq('id', body.id)
    .single();

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (body.title) updateData.title = body.title;
  if (body.description !== undefined) updateData.description = body.description;
  if (body.type) updateData.type = body.type;
  if (body.priority) updateData.priority = body.priority;
  if (body.status) updateData.status = body.status;
  if (body.assignee_id !== undefined) updateData.assignee_id = body.assignee_id;
  if (body.location !== undefined) updateData.location = body.location;
  if (body.expected_resolve_at !== undefined) updateData.expected_resolve_at = body.expected_resolve_at;

  if (body.status === 'resolved') updateData.resolved_at = new Date().toISOString();
  if (body.status === 'closed') updateData.closed_at = new Date().toISOString();

  const { data, error } = await client
    .from('work_orders')
    .update(updateData)
    .eq('id', body.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Log status change
  if (body.status && current && current.status !== body.status) {
    await client.from('work_order_logs').insert({
      work_order_id: body.id,
      action: 'status_changed',
      from_status: current.status,
      to_status: body.status,
      comment: body.comment || `状态从 ${current.status} 变更为 ${body.status}`,
    });
  }

  return NextResponse.json(data);
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const client = getSupabaseClient();
  // Delete logs first
  await client.from('work_order_logs').delete().eq('work_order_id', Number(id));
  const { error } = await client.from('work_orders').delete().eq('id', Number(id));
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
