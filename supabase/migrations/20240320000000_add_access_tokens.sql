-- Add access token columns to profiles table
alter table public.profiles
add column notion_access_token text null,
add column notion_refresh_token text null,
add column notion_token_expires_at timestamp with time zone null,
add column twitter_access_token text null,
add column twitter_refresh_token text null,
add column twitter_token_expires_at timestamp with time zone null;

-- Add indexes for potential token lookups
-- Partial indexes only on non-null values for better performance
create index idx_profiles_notion_token on public.profiles(notion_access_token) where notion_access_token is not null;
create index idx_profiles_notion_refresh on public.profiles(notion_refresh_token) where notion_refresh_token is not null;
create index idx_profiles_notion_expiry on public.profiles(notion_token_expires_at) where notion_token_expires_at is not null;
create index idx_profiles_twitter_token on public.profiles(twitter_access_token) where twitter_access_token is not null;
create index idx_profiles_twitter_refresh on public.profiles(twitter_refresh_token) where twitter_refresh_token is not null;
create index idx_profiles_twitter_expiry on public.profiles(twitter_token_expires_at) where twitter_token_expires_at is not null;

-- Update RLS policies to ensure tokens are protected
create policy "Users can only see their own access tokens"
  on public.profiles
  for select
  using (
    auth.uid() = id
  );

-- Add comments for documentation
comment on column public.profiles.notion_access_token is 'Optional: Stores the Notion access token for the user';
comment on column public.profiles.notion_refresh_token is 'Optional: Stores the Notion refresh token for token renewal';
comment on column public.profiles.notion_token_expires_at is 'Optional: Timestamp when the Notion access token expires';
comment on column public.profiles.twitter_access_token is 'Optional: Stores the Twitter access token for the user';
comment on column public.profiles.twitter_refresh_token is 'Optional: Stores the Twitter refresh token for token renewal';
comment on column public.profiles.twitter_token_expires_at is 'Optional: Timestamp when the Twitter access token expires'; 