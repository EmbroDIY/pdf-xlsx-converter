import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  integer,
  numeric,
} from "drizzle-orm/pg-core";

export const organizations = pgTable("organizations", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const users = pgTable("users", {
  id: uuid("id").primaryKey(), // matches auth.users.id
  email: text("email").notNull(),
  fullName: text("full_name"),
  organizationId: uuid("organization_id").references(() => organizations.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const extractionTemplates = pgTable("extraction_templates", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .references(() => organizations.id)
    .notNull(),
  name: text("name").notNull(),
  headers: jsonb("headers").notNull(), // string[]
  headerMarker: text("header_marker").notNull(),
  stopMarker: text("stop_marker").default(""),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const agentTaskRuns = pgTable("agent_task_runs", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id)
    .notNull(),
  organizationId: uuid("organization_id")
    .references(() => organizations.id)
    .notNull(),
  templateId: uuid("template_id").references(() => extractionTemplates.id),
  fileName: text("file_name").notNull(),
  status: text("status").notNull().default("pending"), // pending | processing | completed | failed
  rowCount: integer("row_count"),
  pageCount: integer("page_count"),
  errorMessage: text("error_message"),
  pdfUrl: text("pdf_url"),
  fileUrl: text("file_url"),
  progressPct: integer("progress_pct").default(0),
  progressMessage: text("progress_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

export const userSettings = pgTable("user_settings", {
  userId: uuid("user_id")
    .references(() => users.id)
    .primaryKey(),
  defaultTemplateId: uuid("default_template_id").references(
    () => extractionTemplates.id
  ),
  llmProvider: text("llm_provider").default("gemini"),
  modelName: text("model_name"),
  creditBalance: integer("credit_balance").default(0).notNull(), // in cents
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Tracks all balance changes: top-ups (Stripe) and usage deductions
export const creditTransactions = pgTable("credit_transactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id)
    .notNull(),
  type: text("type").notNull(), // "topup" | "usage"
  amountCents: integer("amount_cents").notNull(), // positive for topup, negative for usage
  balanceAfter: integer("balance_after").notNull(), // snapshot after this txn
  description: text("description"),
  // Stripe reference for top-ups
  stripeSessionId: text("stripe_session_id"),
  // Usage reference
  runId: uuid("run_id").references(() => agentTaskRuns.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Per-request LLM usage log for cost analysis and margin calculation
export const usageLogs = pgTable("usage_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id)
    .notNull(),
  runId: uuid("run_id").references(() => agentTaskRuns.id),
  provider: text("provider").notNull(), // "gemini" | "ollama"
  model: text("model").notNull(),
  pageCount: integer("page_count").notNull(),
  costCents: integer("cost_cents").notNull(), // what we charge the user
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
