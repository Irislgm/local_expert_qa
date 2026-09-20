import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 获取预案节点列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const planId = searchParams.get('plan_id');

    const supabase = getSupabaseClient();
    let query = supabase
      .from('emergency_plan_nodes')
      .select('*')
      .order('node_order', { ascending: true });

    if (planId) query = query.eq('plan_id', parseInt(planId));

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// 批量保存预案节点（用于节点编排）
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { plan_id, nodes } = body;
    const supabase = getSupabaseClient();

    // 先删除旧节点
    await supabase.from('emergency_plan_nodes').delete().eq('plan_id', plan_id);

    // 插入新节点
    const nodesWithPlanId = nodes.map((node: { node_type: string; node_name: string; node_order: number; config?: object }, index: number) => ({
      plan_id,
      node_type: node.node_type,
      node_name: node.node_name,
      node_order: node.node_order ?? index,
      config: node.config || {},
    }));

    const { data, error } = await supabase
      .from('emergency_plan_nodes')
      .insert(nodesWithPlanId)
      .select();

    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
