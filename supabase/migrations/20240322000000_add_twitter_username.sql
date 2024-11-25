-- Add twitter_username column to profiles table
alter table public.profiles
add column twitter_username text null;

-- Add index for twitter username lookups
create index idx_profiles_twitter_username on public.profiles(twitter_username) where twitter_username is not null;

-- Update RLS policies to allow reading twitter_username
create policy "Anyone can read twitter usernames"
  on public.profiles
  for select
  using (true);

-- Add documentation comment
comment on column public.profiles.twitter_username is 'Optional: Stores the Twitter username of the user'; 