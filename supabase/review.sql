-- R.E.E M&E review comments (already applied to project joy-review).
create table if not exists public.ree_review_comments (
  id text primary key,
  data jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.ree_review_comments enable row level security;
create policy "ree guest read"   on public.ree_review_comments for select to anon using (true);
create policy "ree guest insert" on public.ree_review_comments for insert to anon with check (true);
create policy "ree guest update" on public.ree_review_comments for update to anon using (true) with check (true);
create policy "ree guest delete" on public.ree_review_comments for delete to anon using (true);
