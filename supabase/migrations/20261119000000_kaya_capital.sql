-- Kaya Capital MVP. Run in the Supabase SQL editor as project owner.
create extension if not exists pgcrypto;

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  status text not null default 'lobby' check (status in ('lobby','playing','completed')),
  is_public boolean not null default false,
  shared_screen boolean not null default false,
  host_player_id uuid,
  current_player_id uuid,
  pending_board_index int,
  turn_rolled boolean not null default false,
  round int not null default 0 check (round between 0 and 20),
  winner_player_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 18),
  avatar text not null default '🧑‍💼',
  cash int not null default 1500 check (cash >= 0),
  position int not null default 0 check (position between 0 and 24),
  is_host boolean not null default false,
  ready boolean not null default true,
  session_hash text not null,
  joined_at timestamptz not null default now(),
  unique(room_id,id)
);
create table if not exists public.properties (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  board_index int not null,
  owner_id uuid references public.players(id) on delete set null,
  price int not null,
  group_name text not null,
  unique(room_id,board_index)
);
create table if not exists public.game_events (
  id bigint generated always as identity primary key,
  room_id uuid not null references public.rooms(id) on delete cascade,
  player_id uuid references public.players(id) on delete set null,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create table if not exists public.trades (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  from_player uuid not null references public.players(id),
  to_player uuid not null references public.players(id),
  offer jsonb not null,
  status text not null default 'pending' check(status in ('pending','accepted','declined')),
  created_at timestamptz not null default now()
);
-- Upgrade in-place installations of the original prototype schema.
alter table public.rooms add column if not exists is_public boolean not null default false;
alter table public.rooms add column if not exists shared_screen boolean not null default false;
alter table public.rooms add column if not exists host_player_id uuid;
alter table public.rooms add column if not exists pending_board_index int;
alter table public.rooms add column if not exists turn_rolled boolean not null default false;
alter table public.rooms add column if not exists winner_player_id uuid;
alter table public.rooms add column if not exists updated_at timestamptz not null default now();
alter table public.players add column if not exists ready boolean not null default true;
alter table public.players add column if not exists session_hash text;
update public.players set session_hash=encode(digest(gen_random_bytes(32),'sha256'),'hex') where session_hash is null;
alter table public.players alter column session_hash set not null;
alter table public.properties add column if not exists group_name text;
update public.properties set group_name='Local' where group_name is null;
alter table public.properties alter column group_name set not null;
update public.rooms r set host_player_id=p.id from public.players p where p.room_id=r.id and p.is_host and r.host_player_id is null;
alter table public.rooms alter column round set default 0;
create index if not exists players_room_joined_idx on public.players(room_id,joined_at);
create index if not exists game_events_room_created_idx on public.game_events(room_id,created_at desc);
alter table public.rooms enable row level security;
alter table public.players enable row level security;
alter table public.properties enable row level security;
alter table public.game_events enable row level security;
alter table public.trades enable row level security;
-- No client table policies: all reads and writes go through the validated server API.
revoke all on public.rooms,public.players,public.properties,public.game_events,public.trades from public,anon,authenticated;

create or replace function public.kc_create_room(p_name text,p_avatar text,p_public boolean default false,p_shared boolean default false)
returns jsonb language plpgsql security definer set search_path=public,extensions as $$
declare v_code text; v_room uuid; v_player uuid:=gen_random_uuid(); v_token text:=encode(gen_random_bytes(24),'hex');
begin
 if length(trim(p_name)) not between 1 and 18 then raise exception 'Nickname must be 1–18 characters'; end if;
 loop
   v_code:=upper(substr(encode(gen_random_bytes(5),'hex'),1,6));
   exit when not exists(select 1 from rooms where code=v_code);
 end loop;
 insert into rooms(code,is_public,shared_screen) values(v_code,p_public,p_shared) returning id into v_room;
 insert into players(id,room_id,name,avatar,is_host,session_hash) values(v_player,v_room,trim(p_name),coalesce(nullif(p_avatar,''),'🧑‍💼'),true,encode(digest(v_token,'sha256'),'hex'));
 update rooms set host_player_id=v_player where id=v_room;
 return jsonb_build_object('code',v_code,'playerId',v_player,'token',v_token);
end $$;

create or replace function public.kc_join_room(p_code text,p_name text,p_avatar text,p_public_only boolean default false)
returns jsonb language plpgsql security definer set search_path=public,extensions as $$
declare r rooms%rowtype; v_player uuid:=gen_random_uuid(); v_token text:=encode(gen_random_bytes(24),'hex');
begin
 if length(trim(p_name)) not between 1 and 18 then raise exception 'Nickname must be 1–18 characters'; end if;
 select * into r from rooms where (code=upper(trim(p_code)) or (p_public_only and is_public and status='lobby'))
   and status='lobby' and (not p_public_only or (is_public and (select count(*) from players pl where pl.room_id=rooms.id)<8)) order by created_at limit 1 for update;
 if not found then raise exception 'No open room found'; end if;
 if (select count(*) from players where room_id=r.id)>=8 then raise exception 'This room is full'; end if;
 insert into players(id,room_id,name,avatar,session_hash) values(v_player,r.id,trim(p_name),coalesce(nullif(p_avatar,''),'🧑‍💼'),encode(digest(v_token,'sha256'),'hex'));
 insert into game_events(room_id,player_id,event_type,payload) values(r.id,v_player,'joined',jsonb_build_object('name',trim(p_name)));
 return jsonb_build_object('code',r.code,'playerId',v_player,'token',v_token);
end $$;

create or replace function public.kc_start(p_code text,p_token text)
returns jsonb language plpgsql security definer set search_path=public,extensions as $$
declare r rooms%rowtype; v_count int;
begin
 select * into r from rooms where code=upper(trim(p_code)) for update;
 if not found then raise exception 'Room not found'; end if;
 if not exists(select 1 from players where id=r.host_player_id and room_id=r.id and session_hash=encode(digest(p_token,'sha256'),'hex')) then raise exception 'Only the host can start'; end if;
 select count(*) into v_count from players where room_id=r.id;
 if v_count<2 then raise exception 'At least two players are needed'; end if;
 if r.status<>'lobby' then raise exception 'Game already started'; end if;
 update rooms set status='playing',round=1,turn_rolled=false,current_player_id=(select id from players where room_id=r.id order by joined_at,id limit 1),updated_at=now() where id=r.id;
 insert into game_events(room_id,event_type,payload) values(r.id,'started',jsonb_build_object('round',1));
 return jsonb_build_object('ok',true);
end $$;

create or replace function public.kc_action(p_code text,p_token text,p_action text)
returns jsonb language plpgsql security definer set search_path=public,extensions as $$
declare r rooms%rowtype; p players%rowtype; actor players%rowtype; t properties%rowtype; v_roll int; v_next int; v_space jsonb; v_note text; v_amount int; v_round int; v_winner uuid;
begin
 select * into r from rooms where code=upper(trim(p_code)) for update;
 if not found or r.status<>'playing' then raise exception 'Game is not in progress'; end if;
 select * into actor from players where room_id=r.id and session_hash=encode(digest(p_token,'sha256'),'hex');
 if not found then raise exception 'Invalid room session'; end if;
 if actor.id<>r.current_player_id and not (r.shared_screen and actor.id=r.host_player_id) then raise exception 'It is not your turn'; end if;
 select * into p from players where id=r.current_player_id and room_id=r.id;
 if p_action='roll' then
   if r.turn_rolled then raise exception 'You have already rolled this turn'; end if;
   if r.pending_board_index is not null then raise exception 'Resolve your current space first'; end if;
   update rooms set turn_rolled=true where id=r.id;
   v_roll:=1+floor(random()*6)::int; v_next:=(p.position+v_roll)%25;
   if v_next<p.position then update players set cash=cash+200 where id=p.id; end if;
   update players set position=v_next where id=p.id;
   if v_next in (1,3,5,7,9,10,12,14,15,17,19,20,22) then
     select to_jsonb(b) into v_space from (values
       (1,'Pasar Malam',100,'Local'),(3,'Mamak',120,'Local'),(5,'Petaling Street',180,'KL'),(7,'Bangsar',220,'KL'),(9,'KLCC',450,'KL'),(10,'Penang',280,'North'),(12,'Georgetown',300,'North'),(14,'Jonker Street',260,'Melaka'),(15,'Langkawi',320,'Islands'),(17,'Kota Kinabalu',340,'Sabah'),(19,'Petronas Twin Towers',500,'Icons'),(20,'Merdeka 118',550,'Icons'),(22,'Kuching',360,'Sarawak')
     ) b(idx,name,price,grp) where idx=v_next;
     select * into t from properties where room_id=r.id and board_index=v_next;
     if not found then
       insert into properties(room_id,board_index,price,group_name) values(r.id,v_next,(v_space->>'price')::int,v_space->>'grp');
       update rooms set pending_board_index=v_next where id=r.id;
       v_note:=p.name||' rolled '||v_roll||' and can buy '||(v_space->>'name')||'.';
     elsif t.owner_id is not null and t.owner_id<>p.id then
       v_amount:=least(p.cash,greatest(20,t.price/5));
       update players set cash=greatest(0,cash-v_amount) where id=p.id;
       update players set cash=cash+v_amount where id=t.owner_id;
       v_note:=p.name||' paid RM '||v_amount||' rent.';
     else v_note:=p.name||' rolled '||v_roll||' and visited a friendly property.';
     end if;
   elsif v_next in (2,6,11,13,16,21,23) then
     v_amount:=case floor(random()*4)::int when 0 then 100 when 1 then -120 when 2 then 80 else -80 end;
     if v_amount>0 then update players set cash=cash+v_amount where id=p.id; else update players set cash=greatest(0,cash+v_amount) where id=p.id; end if;
     v_note:=case when v_amount>0 then p.name||' found RM '||v_amount||' in a forgotten e-wallet.' else p.name||' got a surprise bill for RM '||abs(v_amount)||'.' end;
   elsif v_next in (4,8,18) then
     update players set cash=greatest(0,cash-50) where id=p.id; v_note:=p.name||' got caught in a RM 50 roadblock.';
   elsif v_next=24 then
     update players set cash=cash+100 where id=p.id; v_note:=p.name||' closed shop early and earned RM 100.';
   else v_note:=p.name||' passed Mula and collected RM 200.';
   end if;
   insert into game_events(room_id,player_id,event_type,payload) values(r.id,p.id,'roll',jsonb_build_object('roll',v_roll,'position',v_next,'message',v_note));
 elsif p_action='buy' then
   if r.pending_board_index is null then raise exception 'Nothing to buy'; end if;
   select * into t from properties where room_id=r.id and board_index=r.pending_board_index for update;
   if t.owner_id is not null then raise exception 'Property no longer available'; end if;
   if p.cash<t.price then raise exception 'Not enough cash'; end if;
   update players set cash=cash-t.price where id=p.id;
   update properties set owner_id=p.id where id=t.id;
   update rooms set pending_board_index=null where id=r.id;
   insert into game_events(room_id,player_id,event_type,payload) values(r.id,p.id,'bought',jsonb_build_object('boardIndex',t.board_index,'price',t.price));
 elsif p_action in ('end_turn','skip') then
   if not r.turn_rolled then raise exception 'Roll before ending your turn'; end if;
   if r.pending_board_index is not null and p_action='end_turn' then raise exception 'Buy or skip the available property first'; end if;
   select id into v_winner from players where room_id=r.id and (joined_at,id)>(p.joined_at,p.id) order by joined_at,id limit 1;
   if v_winner is null then
     select id into v_winner from players where room_id=r.id order by joined_at,id limit 1;
     v_round:=r.round+1;
     if v_round>20 then
       select pl.id into v_winner from players pl left join (select owner_id,sum(price) value from properties where room_id=r.id group by owner_id) pr on pr.owner_id=pl.id where pl.room_id=r.id order by pl.cash+coalesce(pr.value,0) desc,pl.joined_at,pl.id limit 1;
       update rooms set status='completed',winner_player_id=v_winner,current_player_id=null,round=20,turn_rolled=false,updated_at=now() where id=r.id;
       insert into game_events(room_id,player_id,event_type,payload) values(r.id,v_winner,'completed',jsonb_build_object('winnerId',v_winner));
     else update rooms set current_player_id=v_winner,round=v_round,turn_rolled=false,updated_at=now() where id=r.id; end if;
   else update rooms set current_player_id=v_winner,turn_rolled=false,updated_at=now() where id=r.id; end if;
   update rooms set pending_board_index=null where id=r.id;
   insert into game_events(room_id,player_id,event_type,payload) values(r.id,p.id,'turn_ended',jsonb_build_object('round',r.round));
 else raise exception 'Unknown game action'; end if;
 return jsonb_build_object('ok',true);
end $$;

create or replace function public.kc_trade(p_code text,p_token text,p_target uuid,p_offer jsonb,p_accept boolean default false)
returns jsonb language plpgsql security definer set search_path=public,extensions as $$
declare r rooms%rowtype; p players%rowtype; actor players%rowtype; q players%rowtype; tr trades%rowtype; v_cash int; v_property int; v_request_cash int; v_request_property int;
begin
 select * into r from rooms where code=upper(trim(p_code)) for update;
 if not found or r.status<>'playing' then raise exception 'Trades are available only during a game'; end if;
 select * into actor from players where room_id=r.id and session_hash=encode(digest(p_token,'sha256'),'hex');
 if not found then raise exception 'Invalid room session'; end if;
 if r.shared_screen and actor.id=r.host_player_id then
   select * into p from players where id=r.current_player_id and room_id=r.id;
 else p:=actor; end if;
 if p_target=p.id or not exists(select 1 from players where id=p_target and room_id=r.id) then raise exception 'Invalid trade partner'; end if;
 if p_accept then
   select * into tr from trades where id=(p_offer->>'tradeId')::uuid and room_id=r.id and to_player=p.id and status='pending' for update;
   if not found then raise exception 'Trade offer is no longer available'; end if;
   v_cash:=coalesce((tr.offer->>'cash')::int,0); v_property:=coalesce((tr.offer->>'propertyIndex')::int,-1);
   v_request_cash:=coalesce((tr.offer->>'requestCash')::int,0); v_request_property:=coalesce((tr.offer->>'requestPropertyIndex')::int,-1);
   select * into q from players where id=tr.from_player;
   if v_cash<0 or q.cash<v_cash then raise exception 'Offerer no longer has the offered cash'; end if;
   if v_property>=0 and not exists(select 1 from properties where room_id=r.id and board_index=v_property and owner_id=q.id) then raise exception 'Offered property is no longer owned'; end if;
   if v_request_cash<0 or p.cash<v_request_cash then raise exception 'You no longer have enough cash for this trade'; end if;
   if v_request_property>=0 and not exists(select 1 from properties where room_id=r.id and board_index=v_request_property and owner_id=p.id) then raise exception 'Requested property is no longer yours'; end if;
   update players set cash=cash-v_cash+v_request_cash where id=q.id;
   update players set cash=cash+v_cash-v_request_cash where id=p.id;
   if v_property>=0 then update properties set owner_id=tr.to_player where room_id=r.id and board_index=v_property and owner_id=q.id; end if;
   if v_request_property>=0 then update properties set owner_id=q.id where room_id=r.id and board_index=v_request_property and owner_id=tr.to_player; end if;
   update trades set status='accepted' where id=tr.id;
   insert into game_events(room_id,player_id,event_type,payload) values(r.id,tr.from_player,'trade_accepted',jsonb_build_object('to',tr.to_player));
 else
   v_cash:=coalesce((p_offer->>'cash')::int,0); v_property:=coalesce((p_offer->>'propertyIndex')::int,-1);
   v_request_cash:=coalesce((p_offer->>'requestCash')::int,0); v_request_property:=coalesce((p_offer->>'requestPropertyIndex')::int,-1);
   if v_cash<0 or p.cash<v_cash then raise exception 'You cannot offer more cash than you have'; end if;
   if v_property>=0 and not exists(select 1 from properties where room_id=r.id and board_index=v_property and owner_id=p.id) then raise exception 'You do not own that property'; end if;
   if v_request_cash<0 or not exists(select 1 from players where id=p_target and room_id=r.id and cash>=v_request_cash) then raise exception 'Your trade partner cannot cover the requested cash'; end if;
   if v_request_property>=0 and not exists(select 1 from properties where room_id=r.id and board_index=v_request_property and owner_id=p_target) then raise exception 'Your trade partner does not own the requested property'; end if;
   insert into trades(room_id,from_player,to_player,offer) values(r.id,p.id,p_target,p_offer) returning * into tr;
   insert into game_events(room_id,player_id,event_type,payload) values(r.id,p.id,'trade_offer',jsonb_build_object('to',p_target));
 end if;
 return jsonb_build_object('ok',true);
end $$;
revoke all on function public.kc_create_room(text,text,boolean,boolean),public.kc_join_room(text,text,text,boolean),public.kc_start(text,text),public.kc_action(text,text,text),public.kc_trade(text,text,uuid,jsonb,boolean) from public,anon,authenticated;
grant execute on function public.kc_create_room(text,text,boolean,boolean),public.kc_join_room(text,text,text,boolean),public.kc_start(text,text),public.kc_action(text,text,text),public.kc_trade(text,text,uuid,jsonb,boolean) to service_role;
