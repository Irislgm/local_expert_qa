import { NextRequest, NextResponse } from 'next/server';
import { getDbClient } from '@/storage/database/db-client';

// 获取事件任务列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('event_id');

    const db = getDbClient();
    let query = db
      .from('event_tasks')
      .select('*')
      .order('created_at', { ascending: true });

    if (eventId) query = query.eq('event_id', parseInt(eventId));

    const { data: tasks, error } = await query;
    if (error) throw error;

    // 获取负责人信息
    const assigneeIds = [...new Set(tasks?.filter((t: { assignee_id: number }) => t.assignee_id).map((t: { assignee_id: number }) => t.assignee_id))];
    let contactsMap: Record<number, { id: number; name: string }> = {};
    
    if (assigneeIds.length > 0) {
      const { data: contacts } = await db
        .from('contacts')
        .select('id, name')
        .in('id', assigneeIds);
      contacts?.forEach((c: { id: number; name: string }) => { contactsMap[c.id] = c; });
    }

    const tasksWithAssignees = tasks?.map((t: { assignee_id: number }) => ({
      ...t,
      assignee: t.assignee_id ? contactsMap[t.assignee_id] || null : null,
    }));

    return NextResponse.json(tasksWithAssignees);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// 创建任务
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const db = getDbClient();

    const { data, error } = await db
      .from('event_tasks')
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

// 更新任务状态
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;
    const db = getDbClient();

    // 如果状态改为 completed，自动设置完成时间
    if (updateData.status === 'completed') {
      updateData.completed_at = new Date().toISOString();
    }

    const { data, error } = await db
      .from('event_tasks')
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
