-- Migration to create documents and scraped_content tables without RLS

-- Enable vector extension if not already enabled
create extension if not exists vector;

-- Create documents table
create table public.documents (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users (id) on delete cascade,
    scrape_source text not null check (scrape_source in ('twitter', 'notion', 'youtube', 'user')),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

comment on table public.documents is 'Stores metadata about documents associated with users.';

-- Create scraped_content table
create table public.scraped_content (
    id bigserial primary key,
    document_id uuid not null references public.documents (id) on delete cascade,
    content text not null,
    embeddings vector(512),
    chunk_index int not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

comment on table public.scraped_content is 'Stores chunks and embeddings of documents.';

-- Create indexes for better performance
create index idx_documents_user_id on public.documents(user_id);
create index idx_scraped_content_document_id on public.scraped_content(document_id);
create index idx_scraped_content_embeddings on public.scraped_content using ivfflat (embeddings vector_cosine_ops);

-- Grant permissions
grant usage on schema public to anon, authenticated, service_role;
grant all on public.documents to anon, authenticated, service_role;
grant all on public.scraped_content to anon, authenticated, service_role;
grant usage, select on sequence scraped_content_id_seq to anon, authenticated, service_role; 