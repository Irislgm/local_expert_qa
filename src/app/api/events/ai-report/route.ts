import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 获取AI复盘报告
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('event_id');

    if (!eventId) {
      return NextResponse.json({ error: 'event_id is required' }, { status: 400 });
    }

    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('event_ai_reports')
      .select('*')
      .eq('event_id', parseInt(eventId))
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found

    return NextResponse.json(data || null);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// 生成AI复盘报告（模拟）
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { event_id } = body;
    const supabase = getSupabaseClient();

    // 获取事件信息用于生成报告
    const { data: event } = await supabase
      .from('events')
      .select('*, plan:emergency_plans(name)')
      .eq('id', event_id)
      .single();

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // 获取节点进度
    const { data: progress } = await supabase
      .from('event_node_progress')
      .select('*')
      .eq('event_id', event_id)
      .order('created_at', { ascending: true });

    // 生成模拟AI报告
    const report = {
      event_id,
      summary: `${event.title}事件已处理完成。该事件于${new Date(event.started_at).toLocaleString('zh-CN')}触发，持续约${Math.round((new Date(event.resolved_at || new Date()).getTime() - new Date(event.started_at).getTime()) / 60000)}分钟。`,
      timeline: progress?.map((p: { node_name: string; status: string; started_at: string; completed_at: string }) => 
        `${p.started_at ? new Date(p.started_at).toLocaleTimeString('zh-CN') : '--'} ${p.node_name} - ${p.status === 'completed' ? '已完成' : p.status}`
      ).join('\n') || '暂无时间线数据',
      analysis: `本次事件响应流程符合预案要求。从触发到处置完成，各环节衔接紧密。建议关注以下方面：\n1. 响应时间是否达标\n2. 人员到位情况\n3. 设备运行状态`,
      suggestions: `1. 建议定期演练该类型预案\n2. 建议检查相关设备状态\n3. 建议完善应急响应流程`,
      generated_at: new Date().toISOString(),
    };

    // 保存报告
    const { data, error } = await supabase
      .from('event_ai_reports')
      .insert(report)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
