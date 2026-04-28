-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles (extends Supabase auth.users)
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  name text,
  avatar_url text,
  balance numeric(15,2) not null default 100000.00,
  created_at timestamptz default now()
);
alter table public.profiles enable row level security;
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name)
  values (new.id, new.raw_user_meta_data->>'name');
  return new;
end;
$$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Watchlists
create table public.watchlists (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  created_at timestamptz default now()
);
alter table public.watchlists enable row level security;
create policy "Users manage own watchlists" on public.watchlists using (auth.uid() = user_id);

-- Watchlist Items
create table public.watchlist_items (
  id uuid default uuid_generate_v4() primary key,
  watchlist_id uuid references public.watchlists(id) on delete cascade not null,
  symbol text not null,
  name text,
  added_at timestamptz default now(),
  unique(watchlist_id, symbol)
);
alter table public.watchlist_items enable row level security;
create policy "Users manage own watchlist items" on public.watchlist_items
  using (exists (select 1 from public.watchlists where id = watchlist_id and user_id = auth.uid()));

-- Holdings (portfolio positions)
create table public.holdings (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  symbol text not null,
  name text,
  shares numeric(15,6) not null default 0,
  avg_cost numeric(15,4) not null default 0,
  created_at timestamptz default now(),
  unique(user_id, symbol)
);
alter table public.holdings enable row level security;
create policy "Users manage own holdings" on public.holdings using (auth.uid() = user_id);

-- Transactions
create table public.transactions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  symbol text not null,
  type text not null check (type in ('BUY', 'SELL')),
  shares numeric(15,6) not null,
  price numeric(15,4) not null,
  total numeric(15,2) not null,
  created_at timestamptz default now()
);
alter table public.transactions enable row level security;
create policy "Users view own transactions" on public.transactions using (auth.uid() = user_id);

-- Alerts
create table public.alerts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  symbol text not null,
  type text not null check (type in ('PRICE_ABOVE', 'PRICE_BELOW', 'PERCENT_CHANGE', 'VOLUME_SPIKE')),
  threshold numeric(15,4) not null,
  triggered boolean default false,
  created_at timestamptz default now()
);
alter table public.alerts enable row level security;
create policy "Users manage own alerts" on public.alerts using (auth.uid() = user_id);

-- Indexes
create index idx_watchlists_user_id on public.watchlists(user_id);
create index idx_watchlist_items_watchlist_id on public.watchlist_items(watchlist_id);
create index idx_holdings_user_id on public.holdings(user_id);
create index idx_transactions_user_id on public.transactions(user_id);
create index idx_transactions_symbol on public.transactions(symbol);
create index idx_alerts_user_id on public.alerts(user_id);
create index idx_alerts_symbol on public.alerts(symbol);
