-- 月次生活費（収入項目）
create table monthly_income_items (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  year int not null,
  month int not null,
  category text not null,
  amount numeric not null default 0,
  created_at timestamptz default now()
);
alter table monthly_income_items enable row level security;
create policy "自分のデータのみ" on monthly_income_items
  for all using (auth.uid() = user_id);

-- 月次生活費（支払い項目）
create table monthly_expense_items (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  year int not null,
  month int not null,
  category text not null,
  amount numeric not null default 0,
  created_at timestamptz default now()
);
alter table monthly_expense_items enable row level security;
create policy "自分のデータのみ" on monthly_expense_items
  for all using (auth.uid() = user_id);

-- 長期資産推移
create table asset_tracking (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  year int not null,
  month int not null,
  age int,
  stock_monthly numeric default 0,
  stock_bonus numeric default 0,
  stock_pension numeric default 0,
  stock_plan numeric default 0,
  stock_actual numeric,
  cash_monthly numeric default 0,
  cash_bonus numeric default 0,
  cash_plan numeric default 0,
  cash_actual numeric,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, year, month)
);
alter table asset_tracking enable row level security;
create policy "自分のデータのみ" on asset_tracking
  for all using (auth.uid() = user_id);

-- 賞与記録
create table bonus_records (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  year int not null,
  season text not null,
  total_amount numeric not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table bonus_records enable row level security;
create policy "自分のデータのみ" on bonus_records
  for all using (auth.uid() = user_id);

-- 賞与使い道明細
create table bonus_items (
  id uuid default gen_random_uuid() primary key,
  bonus_id uuid references bonus_records(id) on delete cascade not null,
  category text not null,
  amount numeric not null default 0,
  memo text,
  created_at timestamptz default now()
);
alter table bonus_items enable row level security;
create policy "自分のデータのみ" on bonus_items
  for all using (
    exists (
      select 1 from bonus_records
      where bonus_records.id = bonus_items.bonus_id
      and bonus_records.user_id = auth.uid()
    )
  );
