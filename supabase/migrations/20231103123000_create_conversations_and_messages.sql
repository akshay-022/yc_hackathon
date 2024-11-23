-- Migration: Create conversations and messages tables without RLS

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