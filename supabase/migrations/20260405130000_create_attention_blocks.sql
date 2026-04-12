CREATE TABLE attention_blocks (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  start_time timestamptz NOT NULL,
  end_time timestamptz,
  state text NOT NULL,
  source text,
  session_id uuid,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);
