-- Create profiles table to store additional user information
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  email text unique not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.profiles enable row level security;

-- Create policies
create policy "Public profiles are viewable by everyone."
  on profiles for select
  using ( true );

create policy "Users can insert their own profile."
  on profiles for insert
  with check ( auth.uid() = id );

create policy "Users can update own profile."
  on profiles for update
  using ( auth.uid() = id );

-- Create indexes
create index profiles_username_idx on profiles (username);
create index profiles_email_idx on profiles (email);

-- Set up Realtime
alter publication supabase_realtime add table profiles; 

-- Enable inserts for authenticated users
create policy "Enable insert for authenticated users only"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

-- Enable viewing profiles
create policy "Profiles are viewable by everyone"
on public.profiles
for select
using (true);

-- Enable updates for users on their own profiles
create policy "Users can update their own profile"
on public.profiles
for update
using (auth.uid() = id);

-- Grant necessary permissions
grant usage on schema public to anon, authenticated;
grant all on public.profiles to anon, authenticated;