-- Create profiles table to store additional user information without RLS

create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  email text unique not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create indexes
create index profiles_username_idx on profiles (username);
create index profiles_email_idx on profiles (email);

-- Set up Realtime
alter publication supabase_realtime add table profiles;

-- Grant necessary permissions
grant usage on schema public to anon, authenticated, service_role;
grant all on public.profiles to anon, authenticated, service_role;