-- Migration: Create conversations and messages tables
-- This migration creates tables to store conversations and chat messages.
-- The messages table includes a foreign key to the conversations table.
-- Row Level Security (RLS) is enabled to ensure secure access.

-- Create conversations table
create table public.conversations (
  id bigint generated always as identity primary key,
  created_at timestamp default now()
);

comment on table public.conversations is 'Stores conversation metadata.';

-- Create messages table
create table public.messages (
  id bigint generated always as identity primary key,
  conversation_id bigint references public.conversations(id) on delete cascade,
  content text not null,
  created_at timestamp default now()
);

comment on table public.messages is 'Stores chat messages sent by users, associated with a conversation.';

-- Enable Row Level Security (RLS) on the messages table
alter table public.messages enable row level security;

-- RLS Policy: Allow all users to insert messages
create policy "allow_insert_for_all" on public.messages
  for insert
  to public
  with check (true);

-- RLS Policy: Allow all users to select messages
create policy "allow_select_for_all" on public.messages
  for select
  to public
  using (true);

-- RLS Policy: Allow all users to update their own messages
create policy "allow_update_for_all" on public.messages
  for update
  to public
  using (true);

-- RLS Policy: Allow all users to delete their own messages
create policy "allow_delete_for_all" on public.messages
  for delete
  to public
  using (true);