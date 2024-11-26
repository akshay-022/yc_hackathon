-- Enable RLS
alter table public.conversations enable row level security;

-- Drop existing policies if they exist
drop policy if exists "Users can view own conversations" on conversations;
drop policy if exists "Users can insert own conversations" on conversations;

-- Create policy to allow viewing conversations where user is the target
create policy "Users can view conversations as target"
    on conversations for select
    using (
        auth.uid() = target_user_id::uuid
        OR 
        source_user_id is null
    );

-- Create policy to allow insertion with null source_user_id or own id
create policy "Users can insert conversations"
    on conversations for insert
    with check (
        auth.uid() = source_user_id::uuid
        OR 
        source_user_id is null
    );

