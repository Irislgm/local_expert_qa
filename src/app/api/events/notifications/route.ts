import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 获取事件通知列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('event_id');

    const supabase = getSupabaseClient();
    let query = supabase
      .from('event_notifications')
      .select('*')
      .order('created_at', { ascending: true });

    if (eventId) query = query.eq('event_id', parseInt(eventId));

    const { data: notifications, error } = await query;
    if (error) throw error;

    // 获取接收人信息
    const recipientIds = [...new Set(notifications?.filter((n: { recipient_id: number }) => n.recipient_id).map((n: { recipient_id: number }) => n.recipient_id))];
    let contactsMap: Record<number, { id: number; name: string }> = {};
    
    if (recipientIds.length > 0) {
      const { data: contacts } = await supabase
        .from('contacts')
        .select('id, name')
        .in('id', recipientIds);
      contacts?.forEach((c: { id: number; name: string }) => { contactsMap[c.id] = c; });
    }

    const notificationsWithRecipients = notifications?.map((n: { recipient_id: number }) => ({
      ...n,
      recipient: n.recipient_id ? contactsMap[n.recipient_id] || null : null,
    }));

    return NextResponse.json(notificationsWithRecipients);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// 创建通知
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('event_notifications')
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

// 更新通知状态
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('event_notifications')
      .update(updateData)
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
