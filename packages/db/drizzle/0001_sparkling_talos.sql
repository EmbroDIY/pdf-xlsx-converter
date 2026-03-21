ALTER TABLE "agent_task_runs" ADD COLUMN "file_url" text;--> statement-breakpoint
ALTER TABLE "agent_task_runs" ADD COLUMN "progress_pct" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "agent_task_runs" ADD COLUMN "progress_message" text;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "model_name" text;