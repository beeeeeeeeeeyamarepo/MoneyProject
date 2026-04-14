-- 銀行口座・現金
create table bank_accounts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  balance numeric not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table bank_accounts enable row level security;
create policy "自分のデータのみ" on bank_accounts
  for all using (auth.uid() = user_id);

-- 投資
create table investments (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  type text not null default '株式',
  purchase_value numeric not null default 0,
  current_value numeric not null default 0,
  memo text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table investments enable row level security;
create policy "自分のデータのみ" on investments
  for all using (auth.uid() = user_id);

-- 収入記録
create table income_records (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  year int not null,
  month int not null,
  salary numeric not null default 0,
  bonus numeric not null default 0,
  other numeric not null default 0,
  savings_goal numeric not null default 0,
  memo text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table income_records enable row level security;
create policy "自分のデータのみ" on income_records
  for all using (auth.uid() = user_id);
