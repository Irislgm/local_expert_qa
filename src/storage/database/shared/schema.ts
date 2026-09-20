import { pgTable, serial, timestamp, varchar, text, integer, boolean, index } from "drizzle-orm/pg-core"

export const healthCheck = pgTable("health_check", {
	id: serial().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

// ============ 迭代1: 基础管理闭环 ============

// 部门表
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

// 通讯录/联系人表
export const contacts = pgTable(
  "contacts",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 100 }).notNull(),
    phone: varchar("phone", { length: 20 }),
    email: varchar("email", { length: 255 }),
    department_id: integer("department_id").references(() => departments.id),
    position: varchar("position", { length: 100 }),
    role: varchar("role", { length: 50 }).notNull().default("staff"), // admin, manager, staff
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

// 消息模板表
export const message_templates = pgTable(
  "message_templates",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 200 }).notNull(),
    category: varchar("category", { length: 50 }).notNull().default("notification"), // notification, alert, emergency
    channel: varchar("channel", { length: 50 }).notNull().default("sms"), // sms, email, wechat, phone
    title_template: varchar("title_template", { length: 500 }),
    content_template: text("content_template").notNull(),
    variables: text("variables"), // JSON string of variable definitions
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

// 消息记录表
export const message_records = pgTable(
  "message_records",
  {
    id: serial("id").primaryKey(),
    template_id: integer("template_id").references(() => message_templates.id),
    contact_id: integer("contact_id").references(() => contacts.id),
    channel: varchar("channel", { length: 50 }).notNull(),
    title: varchar("title", { length: 500 }),
    content: text("content").notNull(),
    status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, sent, delivered, failed
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

// 工单表
export const work_orders = pgTable(
  "work_orders",
  {
    id: serial("id").primaryKey(),
    order_no: varchar("order_no", { length: 50 }),
    title: varchar("title", { length: 300 }).notNull(),
    description: text("description"),
    type: varchar("type", { length: 50 }).notNull().default("fault"), // fault, request, complaint, suggestion
    priority: varchar("priority", { length: 20 }).notNull().default("medium"), // low, medium, high, urgent
    status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, processing, resolved, closed
    source: varchar("source", { length: 50 }).notNull().default("manual"), // manual, system, phone, wechat
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

// 工单操作日志表
export const work_order_logs = pgTable(
  "work_order_logs",
  {
    id: serial("id").primaryKey(),
    work_order_id: integer("work_order_id").notNull().references(() => work_orders.id),
    action: varchar("action", { length: 50 }).notNull(), // created, assigned, status_changed, commented, resolved, closed
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
