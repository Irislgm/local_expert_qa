import { NextRequest, NextResponse } from 'next/server';
import { getDbClient } from '@/storage/database/db-client';

// 获取触发规则
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const planId = searchParams.get('plan_id');

    const db = getDbClient();
    let query = db
      .from('emergency_plan_triggers')
      .select('*')
      .order('created_at', { ascending: false });

    if (planId) query = query.eq('plan_id', parseInt(planId));

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// 创建/更新触发规则
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const db = getDbClient();

    const { data, error } = await db
      .from('emergency_plan_triggers')
      .insert(body)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;
    const db = getDbClient();

    const { data, error } = await db
      .from('emergency_plan_triggers')
      .update({ ...updateData, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const db = getDbClient();

    const { error } = await db
      .from('emergency_plan_triggers')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
