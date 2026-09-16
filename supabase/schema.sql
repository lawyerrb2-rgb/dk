-- =========================================================
-- ICEBIZ: ระบบบันทึกยอดขายน้ำแข็ง — Supabase schema
-- รันไฟล์นี้ทั้งหมดใน Supabase SQL editor (Project > SQL Editor > New query)
-- =========================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------
-- 1) ข้อมูลตั้งค่าบริษัท / โลโก้
-- ---------------------------------------------------------
create table if not exists company_settings (
  id uuid primary key default gen_random_uuid(),
  company_name text not null default 'ร้านน้ำแข็งของฉัน',
  address text default '',
  phone text default '',
  tax_id text default '',
  logo_url text,
  vat_percent numeric(5,2) not null default 0,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------
-- 2) สาขา
-- ---------------------------------------------------------
create table if not exists branches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text default '',
  phone text default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------
-- 3) ร้านค้า/ลูกค้า
-- ---------------------------------------------------------
create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,               -- ชื่อร้าน/ลูกค้า
  contact_name text default '',
  phone text default '',
  address text default '',
  tax_id text default '',
  branch_id uuid references branches(id) on delete set null, -- สาขาประจำของลูกค้า (ถ้ามี)
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------
-- 4) ประเภทน้ำแข็ง + ราคา
-- ---------------------------------------------------------
create table if not exists ice_types (
  id uuid primary key default gen_random_uuid(),
  name text not null,                -- เช่น หลอดใหญ่, หลอดเล็ก, โม่แช่
  unit text not null default 'ถุง',   -- หน่วยนับ
  default_price numeric(12,2) not null default 0,  -- ราคาขายมาตรฐาน
  cost_price numeric(12,2) not null default 0,      -- ราคาต้นทุน/ราคาซื้อ
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------
-- 5) รายการขาย (บันทึกซื้อขายรายวัน)
-- ---------------------------------------------------------
create table if not exists sales (
  id uuid primary key default gen_random_uuid(),
  sale_date date not null default current_date,
  branch_id uuid not null references branches(id) on delete restrict,
  customer_id uuid references customers(id) on delete set null,
  ice_type_id uuid not null references ice_types(id) on delete restrict,
  quantity numeric(12,2) not null default 0,
  unit_price numeric(12,2) not null default 0,      -- ราคาขายต่อหน่วย ณ วันที่ขาย
  unit_cost numeric(12,2) not null default 0,       -- ต้นทุนต่อหน่วย ณ วันที่ขาย
  total_amount numeric(14,2) generated always as (quantity * unit_price) stored,
  total_cost numeric(14,2) generated always as (quantity * unit_cost) stored,
  note text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_sales_date on sales(sale_date);
create index if not exists idx_sales_branch on sales(branch_id);

-- ---------------------------------------------------------
-- 6) รายการเบิกเงิน / ค่าใช้จ่าย
-- ---------------------------------------------------------
create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  expense_date date not null default current_date,
  branch_id uuid references branches(id) on delete set null,
  category text not null default 'ทั่วไป',   -- เช่น ค่าน้ำมัน, ค่าแรง, ค่าไฟ, เบิกเงินสด
  description text default '',
  amount numeric(14,2) not null default 0,
  paid_to text default '',                    -- จ่ายให้ใคร / เบิกให้ใคร
  created_at timestamptz not null default now()
);

create index if not exists idx_expenses_date on expenses(expense_date);
create index if not exists idx_expenses_branch on expenses(branch_id);

-- ---------------------------------------------------------
-- 7) เลขที่เอกสาร (นับรันตามประเภท+ปี แบบแก้ไขเองได้)
-- ---------------------------------------------------------
create table if not exists doc_sequences (
  doc_type text not null,        -- 'quotation' | 'invoice' | 'receipt'
  year int not null,
  last_number int not null default 0,
  prefix text not null default '',
  primary key (doc_type, year)
);

-- ---------------------------------------------------------
-- 8) เอกสาร: ใบเสนอราคา / ใบวางบิล-แจ้งหนี้ / ใบเสร็จรับเงิน
-- ---------------------------------------------------------
create table if not exists sales_documents (
  id uuid primary key default gen_random_uuid(),
  doc_type text not null check (doc_type in ('quotation','invoice','receipt')),
  doc_number text not null,             -- เลขที่เอกสาร (auto หรือกรอกเองได้)
  doc_date date not null default current_date,
  due_date date,
  branch_id uuid references branches(id) on delete set null,
  customer_id uuid references customers(id) on delete set null,
  customer_snapshot jsonb not null default '{}'::jsonb,  -- เก็บชื่อ/ที่อยู่ลูกค้า ณ วันที่ออกเอกสาร
  items jsonb not null default '[]'::jsonb,  -- [{description, quantity, unit, unit_price, amount}]
  subtotal numeric(14,2) not null default 0,
  discount numeric(14,2) not null default 0,
  vat_percent numeric(5,2) not null default 0,
  vat_amount numeric(14,2) not null default 0,
  grand_total numeric(14,2) not null default 0,
  note text default '',
  ref_doc_number text default '',    -- อ้างอิงเลขที่เอกสารก่อนหน้า เช่น ใบเสร็จอ้างใบวางบิล
  status text not null default 'draft', -- draft, issued, paid, void
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (doc_type, doc_number)
);

create index if not exists idx_documents_type_date on sales_documents(doc_type, doc_date);

-- ---------------------------------------------------------
-- ฟังก์ชัน: ขอเลขที่เอกสารถัดไป (ใช้แบบ preview ในหน้าเว็บ; ผู้ใช้ยังแก้เองได้ก่อนบันทึก)
-- prefix ตัวอย่าง: QT, IV, RC
-- คืนค่าเช่น QT-2026-0001
-- ---------------------------------------------------------
create or replace function next_doc_number(p_doc_type text, p_prefix text)
returns text
language plpgsql
as $$
declare
  v_year int := extract(year from now())::int;
  v_next int;
begin
  insert into doc_sequences(doc_type, year, last_number, prefix)
  values (p_doc_type, v_year, 1, p_prefix)
  on conflict (doc_type, year)
  do update set last_number = doc_sequences.last_number + 1
  returning last_number into v_next;

  return p_prefix || '-' || v_year::text || '-' || lpad(v_next::text, 4, '0');
end;
$$;

-- ---------------------------------------------------------
-- Trigger: อัปเดต updated_at อัตโนมัติ
-- ---------------------------------------------------------
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_sales_updated on sales;
create trigger trg_sales_updated before update on sales
for each row execute function set_updated_at();

drop trigger if exists trg_documents_updated on sales_documents;
create trigger trg_documents_updated before update on sales_documents
for each row execute function set_updated_at();

-- ---------------------------------------------------------
-- Storage bucket สำหรับโลโก้บริษัท
-- ---------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('company-assets', 'company-assets', true)
on conflict (id) do nothing;

-- ---------------------------------------------------------
-- Row Level Security
-- หมายเหตุ: ตัวอย่างนี้เปิดให้ "ผู้ที่ล็อกอินแล้ว" (authenticated) อ่าน/เขียนได้ทุกตาราง
-- เหมาะสำหรับทีมงานภายในที่ทุกคนมีบัญชี Supabase Auth เดียวกัน
-- ถ้าต้องการเปิดสาธารณะ (ไม่ต้องล็อกอิน) ให้เปลี่ยน 'authenticated' เป็น 'anon, authenticated'
-- ---------------------------------------------------------
alter table company_settings enable row level security;
alter table branches enable row level security;
alter table customers enable row level security;
alter table ice_types enable row level security;
alter table sales enable row level security;
alter table expenses enable row level security;
alter table sales_documents enable row level security;
alter table doc_sequences enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['company_settings','branches','customers','ice_types','sales','expenses','sales_documents','doc_sequences']
  loop
    execute format('drop policy if exists "allow_all_authenticated" on %I;', t);
    execute format(
      'create policy "allow_all_authenticated" on %I for all to authenticated using (true) with check (true);',
      t
    );
  end loop;
end $$;

-- Storage policy: ให้ authenticated อัปโหลด/อ่านโลโก้ได้ และให้ทุกคนอ่านไฟล์ public bucket ได้
drop policy if exists "company_assets_read" on storage.objects;
create policy "company_assets_read" on storage.objects
for select using (bucket_id = 'company-assets');

drop policy if exists "company_assets_write" on storage.objects;
create policy "company_assets_write" on storage.objects
for insert to authenticated with check (bucket_id = 'company-assets');

drop policy if exists "company_assets_update" on storage.objects;
create policy "company_assets_update" on storage.objects
for update to authenticated using (bucket_id = 'company-assets');

-- ---------------------------------------------------------
-- ข้อมูลตัวอย่างเริ่มต้น (ลบทิ้งได้)
-- ---------------------------------------------------------
insert into company_settings (company_name, vat_percent) 
select 'ร้านน้ำแข็งของฉัน', 7
where not exists (select 1 from company_settings);

insert into ice_types (name, unit, default_price, cost_price)
select * from (values
  ('น้ำแข็งหลอดใหญ่', 'ถุง', 25, 15),
  ('น้ำแข็งหลอดเล็ก', 'ถุง', 20, 12),
  ('น้ำแข็งโม่แช่', 'กระสอบ', 45, 30)
) as v(name, unit, default_price, cost_price)
where not exists (select 1 from ice_types);
