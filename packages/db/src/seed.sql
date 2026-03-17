-- ============================================================
-- Trigger: auto-create user + organization on auth signup
-- ============================================================

create or replace function public.handle_new_user()
returns trigger as $$
declare
  org_id uuid;
begin
  -- Create a default organization for the new user
  insert into public.organizations (name)
  values (coalesce(new.raw_user_meta_data->>'full_name', new.email) || '''s Organization')
  returning id into org_id;

  -- Create the user record linked to the org
  insert into public.users (id, email, full_name, organization_id)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    org_id
  );

  return new;
end;
$$ language plpgsql security definer;

-- Drop existing trigger if any, then create
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- RLS Policies
-- ============================================================

-- Enable RLS on all tables
alter table public.organizations enable row level security;
alter table public.users enable row level security;
alter table public.extraction_templates enable row level security;
alter table public.agent_task_runs enable row level security;
alter table public.user_settings enable row level security;

-- Helper: get the current user's organization_id
create or replace function public.get_user_org_id()
returns uuid as $$
  select organization_id from public.users where id = auth.uid();
$$ language sql security definer stable;

-- Organizations: users can read their own org
create policy "Users can view own organization"
  on public.organizations for select
  using (id = public.get_user_org_id());

create policy "Users can update own organization"
  on public.organizations for update
  using (id = public.get_user_org_id());

-- Users: can read/update own record
create policy "Users can view own record"
  on public.users for select
  using (id = auth.uid());

create policy "Users can update own record"
  on public.users for update
  using (id = auth.uid());

-- Extraction templates: org-scoped
create policy "Users can view org templates"
  on public.extraction_templates for select
  using (organization_id = public.get_user_org_id());

create policy "Users can insert org templates"
  on public.extraction_templates for insert
  with check (organization_id = public.get_user_org_id());

create policy "Users can update org templates"
  on public.extraction_templates for update
  using (organization_id = public.get_user_org_id());

create policy "Users can delete org templates"
  on public.extraction_templates for delete
  using (organization_id = public.get_user_org_id());

-- Agent task runs: org-scoped
create policy "Users can view org runs"
  on public.agent_task_runs for select
  using (organization_id = public.get_user_org_id());

create policy "Users can insert own runs"
  on public.agent_task_runs for insert
  with check (user_id = auth.uid());

-- User settings: own record only
create policy "Users can view own settings"
  on public.user_settings for select
  using (user_id = auth.uid());

create policy "Users can upsert own settings"
  on public.user_settings for insert
  with check (user_id = auth.uid());

create policy "Users can update own settings"
  on public.user_settings for update
  using (user_id = auth.uid());

-- Credit transactions: own records only (read-only for users, writes via service role)
alter table public.credit_transactions enable row level security;

create policy "Users can view own transactions"
  on public.credit_transactions for select
  using (user_id = auth.uid());

-- Usage logs: own records only (read-only for users)
alter table public.usage_logs enable row level security;

create policy "Users can view own usage"
  on public.usage_logs for select
  using (user_id = auth.uid());
