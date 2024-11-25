-- Migration to create documents and chunks tables with RLS

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

-- Enable RLS on documents table
alter table public.documents enable row level security;

-- Create RLS policies for documents table
create policy "Allow authenticated users to insert documents" 
    on public.documents
    for insert
    with check (true);

create policy "Allow users to select their own documents" 
    on public.documents
    for select
    using (auth.uid() = user_id);

create policy "Allow users to update their own documents" 
    on public.documents
    for update
    using (auth.uid() = user_id);

create policy "Allow users to delete their own documents" 
    on public.documents
    for delete
    using (auth.uid() = user_id);

-- Create chunks table
create table public.chunks (
    id bigserial primary key,
    document_id uuid not null references public.documents (id) on delete cascade,
    content text not null,
    embeddings vector(512),
    chunk_index int not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

comment on table public.chunks is 'Stores chunks and embeddings of documents.';

-- Enable RLS on chunks table
alter table public.chunks enable row level security;

-- Create RLS policies for chunks table
create policy "Allow select on chunks" 
    on public.chunks
    for select
    using (true);

create policy "Restrict insert, update, delete on chunks" 
    on public.chunks
    for all
    using (false);

-- Create indexes for better performance
create index idx_documents_user_id on public.documents(user_id);
create index idx_chunks_document_id on public.chunks(document_id);
create index idx_chunks_embeddings on public.chunks using ivfflat (embeddings vector_cosine_ops);

-- Grant permissions
grant usage on schema public to anon, authenticated, service_role;
grant all on public.documents to authenticated, service_role;
grant all on public.chunks to authenticated, service_role;
grant usage, select on sequence chunks_id_seq to authenticated, service_role; 