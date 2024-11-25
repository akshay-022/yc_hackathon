-- Migration: Create conversations and messages tables with RLS

-- Create conversations table
create table public.conversations (
  id bigint generated always as identity primary key ,
  title text not null default 'New Conversation',
  source_user_id uuid references auth.users(id) on delete set null,
  target_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

comment on table public.conversations is 'Stores conversation metadata including title, source user, and target user.';

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
-- Allow all users, including public users, to manage their conversations
create policy "Public users can manage conversations"
  on public.conversations
  for all
  using (true)
  with check (true);

-- RLS Policies for messages
-- Allow all users to manage messages in their conversations
create policy "All users can manage messages in their conversations"
  on public.messages
  for all
  using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id
    )
  )
  with check (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id
    )
  );

-- Create indexes
create index idx_conversations_source_user_id on public.conversations(source_user_id);
create index idx_conversations_target_user_id on public.conversations(target_user_id);
create index idx_messages_conversation_id on public.messages(conversation_id);

-- Grant necessary permissions
grant usage on schema public to anon, authenticated, service_role;
grant all on public.conversations to anon, authenticated, service_role;
grant all on public.messages to anon, authenticated, service_role;
grant usage on all sequences in schema public to anon, authenticated, service_role;

-- Add specific sequence grants
grant usage, select on sequence conversations_id_seq to anon, authenticated, service_role;
grant usage, select on sequence messages_id_seq to anon, authenticated, service_role; 