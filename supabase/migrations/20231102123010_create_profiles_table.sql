-- Create profiles table to store additional user information with RLS

create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  email text unique not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.profiles enable row level security;

-- RLS Policies for profiles
-- Allow authenticated users to select their own profiles
create policy "Users can view their own profiles"
  on public.profiles
  for select
  using (auth.uid() = id);

-- Allow authenticated users to insert their own profiles
create policy "Users can insert their own profiles"
  on public.profiles
  for insert
  with check (auth.uid() = id);

-- Allow authenticated users to update their own profiles
create policy "Users can update their own profiles"
  on public.profiles
  for update
  using (auth.uid() = id);

-- Allow authenticated users to delete their own profiles
create policy "Users can delete their own profiles"
  on public.profiles
  for delete
  using (auth.uid() = id);

-- Create indexes
create index profiles_username_idx on profiles (username);
create index profiles_email_idx on profiles (email);

-- Set up Realtime
alter publication supabase_realtime add table profiles;

-- Grant necessary permissions
grant usage on schema public to anon, authenticated, service_role;
grant all on public.profiles to authenticated, service_role;