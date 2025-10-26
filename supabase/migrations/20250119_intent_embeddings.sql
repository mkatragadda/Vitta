-- Enable pgvector extension
create extension if not exists vector;

-- Intent embeddings table
create table if not exists intent_embeddings (
  id uuid primary key default uuid_generate_v4(),
  intent_id text not null,
  intent_name text not null,
  example_query text not null,
  embedding vector(1536),
  created_at timestamp with time zone default now()
);

-- Create index for fast similarity search using cosine distance
create index if not exists intent_embeddings_embedding_idx
  on intent_embeddings
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- Function to find similar intents using cosine similarity
create or replace function match_intents (
  query_embedding vector(1536),
  match_threshold float default 0.7,
  match_count int default 5
)
returns table (
  intent_id text,
  intent_name text,
  example_query text,
  similarity float
)
language sql stable
as $$
  select
    intent_id,
    intent_name,
    example_query,
    1 - (embedding <=> query_embedding) as similarity
  from intent_embeddings
  where 1 - (embedding <=> query_embedding) > match_threshold
  order by similarity desc
  limit match_count;
$$;

-- Create intent logs table for analytics
create table if not exists intent_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id),
  query text not null,
  matched_intent text,
  similarity_score float,
  detection_method text, -- 'vector', 'gpt', 'fallback'
  created_at timestamp with time zone default now()
);

-- Index for analytics queries
create index if not exists intent_logs_user_id_idx on intent_logs(user_id);
create index if not exists intent_logs_created_at_idx on intent_logs(created_at);

-- Comment for documentation
comment on table intent_embeddings is 'Stores vector embeddings of example queries for each intent';
comment on table intent_logs is 'Logs all intent detection results for analytics and improvement';
