import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const countOnly = searchParams.get('count') === 'true';
  const departmentId = searchParams.get('department_id');
  const search = searchParams.get('search');
  const page = Number(searchParams.get('page') || '1');
  const pageSize = Number(searchParams.get('page_size') || '20');

  const client = getSupabaseClient();

  if (countOnly) {
    let query = client.from('contacts').select('*', { count: 'exact', head: true });
    if (departmentId) query = query.eq('department_id', Number(departmentId));
    if (search) query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`);
    const { count, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ count: count || 0 });
  }

  let query = client
    .from('contacts')
    .select('id, name, phone, email, department_id, position, role, is_active, created_at, departments(name)');

  if (departmentId) query = query.eq('department_id', Number(departmentId));
  if (search) query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`);

  query = query
    .order('created_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data, total: count });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const client = getSupabaseClient();

  const { data, error } = await client
    .from('contacts')
    .insert({
      name: body.name,
      phone: body.phone || null,
      email: body.email || null,
      department_id: body.department_id || null,
      position: body.position || null,
      role: body.role || 'staff',
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
    .from('contacts')
    .update({
      name: body.name,
      phone: body.phone || null,
      email: body.email || null,
      department_id: body.department_id || null,
      position: body.position || null,
      role: body.role,
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
  const { error } = await client.from('contacts').delete().eq('id', Number(id));
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
