-- Migration: Create conversations and messages tables
-- This migration creates tables to store conversations and chat messages.
-- The messages table includes a foreign key to the conversations table.
-- Row Level Security (RLS) is enabled to ensure secure access.

-- Create conversations table
create table public.conversations (
  id bigint generated always as identity primary key,
  title text not null default 'New Conversation',
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

comment on table public.conversations is 'Stores conversation metadata including title and optional user association.';

-- Create messages table
create table public.messages (
  id bigint generated always as identity primary key,
  conversation_id bigint references public.conversations(id) on delete cascade,
  content text not null,
  is_bot boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

comment on table public.messages is 'Stores chat messages sent by users, associated with a conversation.';

-- Enable RLS for both tables
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

-- RLS Policies for conversations
-- Authenticated users can manage their conversations
create policy "Authenticated users can manage their conversations"
  on public.conversations
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() or user_id is null);

-- Anonymous users can create and view public conversations
create policy "Anonymous users can create and view public conversations"
  on public.conversations
  for all
  to anon
  using (user_id is null)
  with check (user_id is null);

-- RLS Policies for messages
-- Authenticated users can manage messages in their conversations
create policy "Authenticated users can manage messages in their conversations"
  on public.messages
  for all
  to authenticated
  using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id
      and (c.user_id = auth.uid() or c.user_id is null)
    )
  )
  with check (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id
      and (c.user_id = auth.uid() or c.user_id is null)
    )
  );

-- Anonymous users can manage messages in public conversations
create policy "Anonymous users can manage messages in public conversations"
  on public.messages
  for all
  to anon
  using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id
      and c.user_id is null
    )
  )
  with check (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id
      and c.user_id is null
    )
  );

-- Service role policies
create policy "Service role has full access to conversations"
  on public.conversations
  for all
  to service_role
  using (true)
  with check (true);

create policy "Service role has full access to messages"
  on public.messages
  for all
  to service_role
  using (true)
  with check (true);

-- Create indexes
create index idx_conversations_user_id on public.conversations(user_id);
create index idx_messages_conversation_id on public.messages(conversation_id);

-- Grant necessary permissions
grant usage on schema public to anon, authenticated, service_role;
grant all on public.conversations to anon, authenticated, service_role;
grant all on public.messages to anon, authenticated, service_role;
grant usage on all sequences in schema public to anon, authenticated, service_role;

-- Add specific sequence grants
grant usage, select on sequence conversations_id_seq to anon, authenticated, service_role;
grant usage, select on sequence messages_id_seq to anon, authenticated, service_role; 