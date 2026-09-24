import { pgTable, serial, timestamp, varchar, text, integer, boolean, index, jsonb, numeric, uuid } from "drizzle-orm/pg-core"

export const healthCheck = pgTable("health_check", {
	id: serial().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

// ============ 基础表 ============

export const departments = pgTable(
  "departments",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 100 }).notNull(),
    parent_id: integer("parent_id"),
    sort_order: integer("sort_order").notNull().default(0),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("departments_parent_id_idx").on(table.parent_id),
    index("departments_sort_order_idx").on(table.sort_order),
  ]
);

export const contacts = pgTable(
  "contacts",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 100 }).notNull(),
    phone: varchar("phone", { length: 20 }),
    email: varchar("email", { length: 255 }),
    department_id: integer("department_id").references(() => departments.id),
    position: varchar("position", { length: 100 }),
    role: varchar("role", { length: 50 }).notNull().default("staff"),
    avatar_url: text("avatar_url"),
    is_active: boolean("is_active").default(true).notNull(),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("contacts_department_id_idx").on(table.department_id),
    index("contacts_name_idx").on(table.name),
    index("contacts_is_active_idx").on(table.is_active),
  ]
);

export const messageTemplates = pgTable(
  "message_templates",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 200 }).notNull(),
    category: varchar("category", { length: 50 }).notNull().default("notification"),
    channel: varchar("channel", { length: 50 }).notNull().default("sms"),
    title_template: varchar("title_template", { length: 500 }),
    content_template: text("content_template").notNull(),
    variables: text("variables"),
    is_active: boolean("is_active").default(true).notNull(),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("message_templates_category_idx").on(table.category),
    index("message_templates_channel_idx").on(table.channel),
    index("message_templates_is_active_idx").on(table.is_active),
  ]
);

export const messageRecords = pgTable(
  "message_records",
  {
    id: serial("id").primaryKey(),
    template_id: integer("template_id").references(() => messageTemplates.id),
    contact_id: integer("contact_id").references(() => contacts.id),
    channel: varchar("channel", { length: 50 }).notNull(),
    title: varchar("title", { length: 500 }),
    content: text("content").notNull(),
    status: varchar("status", { length: 20 }).notNull().default("pending"),
    sent_at: timestamp("sent_at", { withTimezone: true }),
    delivered_at: timestamp("delivered_at", { withTimezone: true }),
    error_message: text("error_message"),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("message_records_template_id_idx").on(table.template_id),
    index("message_records_contact_id_idx").on(table.contact_id),
    index("message_records_status_idx").on(table.status),
    index("message_records_created_at_idx").on(table.created_at),
  ]
);

export const workOrders = pgTable(
  "work_orders",
  {
    id: serial("id").primaryKey(),
    order_no: varchar("order_no", { length: 50 }),
    title: varchar("title", { length: 300 }).notNull(),
    description: text("description"),
    type: varchar("type", { length: 50 }).notNull().default("fault"),
    priority: varchar("priority", { length: 20 }).notNull().default("medium"),
    status: varchar("status", { length: 20 }).notNull().default("pending"),
    source: varchar("source", { length: 50 }).notNull().default("manual"),
    creator_id: integer("creator_id").references(() => contacts.id),
    assignee_id: integer("assignee_id").references(() => contacts.id),
    location: varchar("location", { length: 300 }),
    expected_resolve_at: timestamp("expected_resolve_at", { withTimezone: true }),
    resolved_at: timestamp("resolved_at", { withTimezone: true }),
    closed_at: timestamp("closed_at", { withTimezone: true }),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("work_orders_order_no_idx").on(table.order_no),
    index("work_orders_status_idx").on(table.status),
    index("work_orders_priority_idx").on(table.priority),
    index("work_orders_type_idx").on(table.type),
    index("work_orders_creator_id_idx").on(table.creator_id),
    index("work_orders_assignee_id_idx").on(table.assignee_id),
    index("work_orders_created_at_idx").on(table.created_at),
  ]
);

export const workOrderLogs = pgTable(
  "work_order_logs",
  {
    id: serial("id").primaryKey(),
    work_order_id: integer("work_order_id").notNull().references(() => workOrders.id),
    action: varchar("action", { length: 50 }).notNull(),
    operator_id: integer("operator_id").references(() => contacts.id),
    from_status: varchar("from_status", { length: 20 }),
    to_status: varchar("to_status", { length: 20 }),
    comment: text("comment"),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("work_order_logs_work_order_id_idx").on(table.work_order_id),
    index("work_order_logs_created_at_idx").on(table.created_at),
  ]
);

// ============ 设备管理 ============

export const deviceSources = pgTable(
  "device_sources",
  {
    id: serial("id").primaryKey(),
    name: varchar("name").notNull(),
    db_type: varchar("db_type").notNull().default("postgres"),
    host: varchar("host"),
    port: integer("port").default(5432),
    database_name: varchar("database_name"),
    username: varchar("username"),
    password: text("password"),
    status: varchar("status").default("inactive"),
    last_connected_at: timestamp("last_connected_at", { withTimezone: true }),
    config_json: jsonb("config_json").default({}),
    created_by: integer("created_by").references(() => contacts.id),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("device_sources_status_idx").on(table.status),
  ]
);

export const devices = pgTable(
  "devices",
  {
    id: serial("id").primaryKey(),
    source_id: integer("source_id").references(() => deviceSources.id),
    device_code: varchar("device_code"),
    device_name: varchar("device_name").notNull(),
    device_type: varchar("device_type").default("sensor"),
    location: varchar("location"),
    status: varchar("status").default("online"),
    description: text("description"),
    created_by: integer("created_by").references(() => contacts.id),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("devices_source_id_idx").on(table.source_id),
    index("devices_status_idx").on(table.status),
  ]
);

export const deviceTelemetry = pgTable(
  "device_telemetry",
  {
    id: serial("id").primaryKey(),
    device_id: integer("device_id").notNull().references(() => devices.id),
    metric_key: varchar("metric_key").notNull(),
    metric_value: numeric("metric_value"),
    metric_unit: varchar("metric_unit"),
    status: varchar("status").default("normal"),
    collected_at: timestamp("collected_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("device_telemetry_device_id_idx").on(table.device_id),
    index("device_telemetry_collected_at_idx").on(table.collected_at),
  ]
);

export const metricMappings = pgTable(
  "metric_mappings",
  {
    id: serial("id").primaryKey(),
    device_source_id: integer("device_source_id").notNull().references(() => deviceSources.id),
    device_id: integer("device_id").references(() => devices.id),
    source_metric: varchar("source_metric").notNull(),
    source_table: varchar("source_table"),
    metric_name: varchar("metric_name").notNull(),
    metric_unit: varchar("metric_unit"),
    metric_type: varchar("metric_type").default("value"),
    transform_rule: text("transform_rule"),
    alarm_threshold: numeric("alarm_threshold"),
    alarm_operator: varchar("alarm_operator").default(">"),
    is_active: boolean("is_active").default(true).notNull(),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("metric_mappings_device_source_id_idx").on(table.device_source_id),
    index("metric_mappings_device_id_idx").on(table.device_id),
  ]
);

// ============ 应急预案 ============

export const emergencyPlans = pgTable(
  "emergency_plans",
  {
    id: serial("id").primaryKey(),
    name: varchar("name").notNull(),
    description: text("description"),
    category: varchar("category").notNull().default("fire"),
    level: varchar("level").default("medium"),
    status: varchar("status").default("draft"),
    created_by: integer("created_by").references(() => contacts.id),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("emergency_plans_category_idx").on(table.category),
    index("emergency_plans_status_idx").on(table.status),
  ]
);

export const emergencyPlanNodes = pgTable(
  "emergency_plan_nodes",
  {
    id: serial("id").primaryKey(),
    plan_id: integer("plan_id").notNull().references(() => emergencyPlans.id),
    node_type: varchar("node_type").notNull(),
    node_name: varchar("node_name").notNull(),
    node_order: integer("node_order").notNull().default(0),
    config: jsonb("config").default({}),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("emergency_plan_nodes_plan_id_idx").on(table.plan_id),
  ]
);

export const emergencyPlanTriggers = pgTable(
  "emergency_plan_triggers",
  {
    id: serial("id").primaryKey(),
    plan_id: integer("plan_id").notNull().references(() => emergencyPlans.id),
    metric_type: varchar("metric_type").notNull(),
    threshold: numeric("threshold").notNull(),
    operator: varchar("operator").default(">"),
    duration_seconds: integer("duration_seconds").default(0),
    is_active: boolean("is_active").default(true).notNull(),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("emergency_plan_triggers_plan_id_idx").on(table.plan_id),
  ]
);

// ============ 事件管理 ============

export const events = pgTable(
  "events",
  {
    id: serial("id").primaryKey(),
    event_no: varchar("event_no"),
    plan_id: integer("plan_id").references(() => emergencyPlans.id),
    title: varchar("title").notNull(),
    description: text("description"),
    level: varchar("level").default("medium"),
    status: varchar("status").default("active"),
    location: varchar("location"),
    trigger_type: varchar("trigger_type").default("auto"),
    started_at: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
    resolved_at: timestamp("resolved_at", { withTimezone: true }),
    closed_at: timestamp("closed_at", { withTimezone: true }),
    created_by: integer("created_by").references(() => contacts.id),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("events_event_no_idx").on(table.event_no),
    index("events_status_idx").on(table.status),
    index("events_plan_id_idx").on(table.plan_id),
  ]
);

export const eventNodeProgress = pgTable(
  "event_node_progress",
  {
    id: serial("id").primaryKey(),
    event_id: integer("event_id").notNull().references(() => events.id),
    node_id: integer("node_id").references(() => emergencyPlanNodes.id),
    node_type: varchar("node_type").notNull(),
    node_name: varchar("node_name"),
    status: varchar("status").default("pending"),
    started_at: timestamp("started_at", { withTimezone: true }),
    completed_at: timestamp("completed_at", { withTimezone: true }),
    operator_id: integer("operator_id").references(() => contacts.id),
    remark: text("remark"),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("event_node_progress_event_id_idx").on(table.event_id),
  ]
);

export const eventNotifications = pgTable(
  "event_notifications",
  {
    id: serial("id").primaryKey(),
    event_id: integer("event_id").notNull().references(() => events.id),
    node_id: integer("node_id").references(() => emergencyPlanNodes.id),
    channel: varchar("channel").notNull(),
    title: varchar("title"),
    content: text("content"),
    recipient_id: integer("recipient_id").references(() => contacts.id),
    status: varchar("status").default("pending"),
    sent_at: timestamp("sent_at", { withTimezone: true }),
    delivered_at: timestamp("delivered_at", { withTimezone: true }),
    error_message: text("error_message"),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("event_notifications_event_id_idx").on(table.event_id),
  ]
);

export const eventTasks = pgTable(
  "event_tasks",
  {
    id: serial("id").primaryKey(),
    event_id: integer("event_id").notNull().references(() => events.id),
    node_id: integer("node_id").references(() => emergencyPlanNodes.id),
    title: varchar("title").notNull(),
    description: text("description"),
    assignee_id: integer("assignee_id").references(() => contacts.id),
    status: varchar("status").default("pending"),
    priority: varchar("priority").default("medium"),
    due_at: timestamp("due_at", { withTimezone: true }),
    completed_at: timestamp("completed_at", { withTimezone: true }),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("event_tasks_event_id_idx").on(table.event_id),
    index("event_tasks_assignee_id_idx").on(table.assignee_id),
  ]
);

export const eventAiReports = pgTable(
  "event_ai_reports",
  {
    id: serial("id").primaryKey(),
    event_id: integer("event_id").notNull().references(() => events.id),
    summary: text("summary"),
    timeline: text("timeline"),
    analysis: text("analysis"),
    suggestions: text("suggestions"),
    generated_at: timestamp("generated_at", { withTimezone: true }).defaultNow().notNull(),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("event_ai_reports_event_id_idx").on(table.event_id),
  ]
);

// ============ 知识库 ============

export const knowledgeBases = pgTable(
  "knowledge_bases",
  {
    id: serial("id").primaryKey(),
    name: varchar("name").notNull(),
    description: text("description"),
    category: varchar("category").default("fire_safety"),
    document_count: integer("document_count").default(0),
    chunk_count: integer("chunk_count").default(0),
    status: varchar("status").default("active"),
    created_by: integer("created_by").references(() => contacts.id),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("knowledge_bases_category_idx").on(table.category),
    index("knowledge_bases_status_idx").on(table.status),
  ]
);

export const knowledgeDocuments = pgTable(
  "knowledge_documents",
  {
    id: serial("id").primaryKey(),
    knowledge_base_id: integer("knowledge_base_id").notNull().references(() => knowledgeBases.id),
    title: varchar("title").notNull(),
    content: text("content").notNull(),
    source_type: varchar("source_type").default("text"),
    source_url: varchar("source_url"),
    word_count: integer("word_count").default(0),
    chunk_count: integer("chunk_count").default(0),
    status: varchar("status").default("processed"),
    created_by: integer("created_by").references(() => contacts.id),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("knowledge_documents_knowledge_base_id_idx").on(table.knowledge_base_id),
    index("knowledge_documents_status_idx").on(table.status),
  ]
);

export const knowledgeChunks = pgTable(
  "knowledge_chunks",
  {
    id: serial("id").primaryKey(),
    document_id: integer("document_id").notNull().references(() => knowledgeDocuments.id),
    chunk_index: integer("chunk_index").notNull(),
    content: text("content").notNull(),
    embedding: text("embedding").notNull(),
    token_count: integer("token_count").default(0),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("knowledge_chunks_document_id_idx").on(table.document_id),
  ]
);

// ============ 对话 ============

export const conversations = pgTable(
  "conversations",
  {
    id: serial("id").primaryKey(),
    title: varchar("title"),
    user_id: integer("user_id").references(() => contacts.id),
    knowledge_base_id: integer("knowledge_base_id").references(() => knowledgeBases.id),
    message_count: integer("message_count").default(0),
    status: varchar("status").default("active"),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("conversations_user_id_idx").on(table.user_id),
    index("conversations_knowledge_base_id_idx").on(table.knowledge_base_id),
  ]
);

export const conversationMessages = pgTable(
  "conversation_messages",
  {
    id: serial("id").primaryKey(),
    conversation_id: integer("conversation_id").notNull().references(() => conversations.id),
    role: varchar("role").notNull(),
    content: text("content").notNull(),
    metadata: jsonb("metadata").default({}),
    token_count: integer("token_count").default(0),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("conversation_messages_conversation_id_idx").on(table.conversation_id),
  ]
);

// ============ Dashboard ============

export const dashboardConfigs = pgTable(
  "dashboard_configs",
  {
    id: serial("id").primaryKey(),
    name: varchar("name").notNull(),
    description: text("description"),
    layout: jsonb("layout").default([]),
    is_default: boolean("is_default").default(false).notNull(),
    is_active: boolean("is_active").default(true).notNull(),
    created_by: integer("created_by").references(() => contacts.id),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("dashboard_configs_is_active_idx").on(table.is_active),
  ]
);