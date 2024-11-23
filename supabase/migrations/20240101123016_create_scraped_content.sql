-- Enable vector extension if not already enabled
create extension if not exists vector;

-- Create scraped_content table with vector support
create table public.scraped_content (
    id bigserial primary key,
    user_id uuid not null references auth.users (id) on delete cascade,
    scrape_source text not null check (scrape_source in ('twitter', 'notion', 'youtube')),
    content text not null,
    embeddings vector(512),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

comment on table public.scraped_content is 'Stores scraped content and embeddings from various sources.';

-- Enable Row Level Security (RLS)
alter table public.scraped_content enable row level security;

-- RLS Policies for authenticated users
create policy "Users can view their own content"
    on public.scraped_content for select
    using (auth.uid() = user_id);

create policy "Users can insert their own content"
    on public.scraped_content for insert
    with check (auth.uid() = user_id);

create policy "Users can update their own content"
    on public.scraped_content for update
    using (auth.uid() = user_id);

create policy "Users can delete their own content"
    on public.scraped_content for delete
    using (auth.uid() = user_id);

-- RLS Policy for service role (backend access)
create policy "Service role has full access"
    on public.scraped_content
    as permissive
    for all
    to service_role
    using (true)
    with check (true);

-- Create indexes for better performance
create index idx_scraped_content_user_id on public.scraped_content(user_id);
create index idx_scraped_content_source on public.scraped_content(scrape_source);
create index idx_scraped_content_embeddings on public.scraped_content using ivfflat (embeddings vector_cosine_ops);

-- Grant permissions
grant usage on schema public to anon, authenticated, service_role;
grant all on public.scraped_content to authenticated;
grant all on public.scraped_content to service_role;
grant usage, select on sequence scraped_content_id_seq to authenticated;
grant usage, select on sequence scraped_content_id_seq to service_role; 