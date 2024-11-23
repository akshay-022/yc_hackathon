 -- Migration: Create scraped_content table
-- Purpose: Store content scraped from Twitter, Notion, and YouTube for each user.
-- Affected tables: scraped_content
-- Special considerations: Ensure Row Level Security (RLS) is enabled.

create table public.scraped_content (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id),
  source text not null check (source in ('twitter', 'notion', 'youtube')),
  content jsonb not null,
  created_at timestamp with time zone default now() not null
);

comment on table public.scraped_content is 'Stores content scraped from Twitter, Notion, and YouTube for each user.';

-- Enable Row Level Security (RLS) on the table
alter table public.scraped_content enable row level security;

-- RLS Policy for select
create policy select_scraped_content on public.scraped_content
  for select
  using (auth.uid() = user_id);

-- RLS Policy for insert
create policy insert_scraped_content on public.scraped_content
  for insert
  with check (auth.uid() = user_id);

-- RLS Policy for update
create policy update_scraped_content on public.scraped_content
  for update
  using (auth.uid() = user_id);

-- RLS Policy for delete
create policy delete_scraped_content on public.scraped_content
  for delete
  using (auth.uid() = user_id);

-- Grant usage to authenticated users
grant select, insert, update, delete on public.scraped_content to authenticated; 