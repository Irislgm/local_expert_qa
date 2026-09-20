import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 获取事件详情（包含节点进度、任务、通知、AI报告）
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('event_id');

    if (!eventId) {
      return NextResponse.json({ error: 'event_id is required' }, { status: 400 });
    }

    const supabase = getSupabaseClient();

    // 获取事件基本信息
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('id', parseInt(eventId))
      .single();

    if (eventError) throw eventError;

    // 获取关联的预案信息
    let plan = null;
    if (event?.plan_id) {
      const { data: planData } = await supabase
        .from('emergency_plans')
        .select('id, name, category')
        .eq('id', event.plan_id)
        .single();
      plan = planData;
    }

    // 获取创建人信息
    let creator = null;
    if (event?.created_by) {
      const { data: creatorData } = await supabase
        .from('contacts')
        .select('id, name')
        .eq('id', event.created_by)
        .single();
      creator = creatorData;
    }

    // 获取节点进度
    const { data: progress } = await supabase
      .from('event_node_progress')
      .select('*')
      .eq('event_id', parseInt(eventId))
      .order('created_at', { ascending: true });

    // 获取任务列表
    const { data: tasks } = await supabase
      .from('event_tasks')
      .select('*')
      .eq('event_id', parseInt(eventId))
      .order('created_at', { ascending: true });

    // 获取通知列表
    const { data: notifications } = await supabase
      .from('event_notifications')
      .select('*')
      .eq('event_id', parseInt(eventId))
      .order('created_at', { ascending: true });

    // 获取AI复盘报告
    const { data: aiReport } = await supabase
      .from('event_ai_reports')
      .select('*')
      .eq('event_id', parseInt(eventId))
      .single();

    // 获取相关联系人信息
    const assigneeIds = [...new Set(tasks?.filter((t: { assignee_id: number }) => t.assignee_id).map((t: { assignee_id: number }) => t.assignee_id))];
    const recipientIds = [...new Set(notifications?.filter((n: { recipient_id: number }) => n.recipient_id).map((n: { recipient_id: number }) => n.recipient_id))];
    const operatorIds = [...new Set(progress?.filter((p: { operator_id: number }) => p.operator_id).map((p: { operator_id: number }) => p.operator_id))];
    
    const allContactIds = [...new Set([...assigneeIds, ...recipientIds, ...operatorIds])];
    let contactsMap: Record<number, { id: number; name: string }> = {};
    
    if (allContactIds.length > 0) {
      const { data: contacts } = await supabase
        .from('contacts')
        .select('id, name')
        .in('id', allContactIds);
      contacts?.forEach((c: { id: number; name: string }) => { contactsMap[c.id] = c; });
    }

    // 附加联系人信息
    const tasksWithAssignees = tasks?.map((t: { assignee_id: number }) => ({
      ...t,
      assignee: t.assignee_id ? contactsMap[t.assignee_id] || null : null,
    }));

    const notificationsWithRecipients = notifications?.map((n: { recipient_id: number }) => ({
      ...n,
      recipient: n.recipient_id ? contactsMap[n.recipient_id] || null : null,
    }));

    const progressWithOperators = progress?.map((p: { operator_id: number }) => ({
      ...p,
      operator: p.operator_id ? contactsMap[p.operator_id] || null : null,
    }));

    return NextResponse.json({
      event: { ...event, plan, creator },
      progress: progressWithOperators || [],
      tasks: tasksWithAssignees || [],
      notifications: notificationsWithRecipients || [],
      ai_report: aiReport || null,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
