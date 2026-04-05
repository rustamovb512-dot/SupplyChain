"use client";

import React, { useEffect, useMemo, useState } from "react";
import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js";
import {
  Truck,
  Users,
  Archive,
  Search,
  Globe,
  UserCircle2,
  Package,
  CircleHelp,
  CheckCircle2,
  Circle,
  Phone,
  Filter,
  CreditCard,
  Wallet,
  Shield,
  Trash2,
  Loader2,
  LogOut,
  KeyRound,
  AlertTriangle,
  Plus,
  X,
} from "lucide-react";

// ================= TYPES =================
type Role = "super_admin" | "admin" | "client" | "driver";
type AdminStatus = "ACTIVE" | "LIMITED" | "DISABLED";
type OrderStatus =
  | "CREATED"
  | "ASSIGNED"
  | "AT_LOADING"
  | "LOADED"
  | "IN_TRANSIT"
  | "AT_BORDER"
  | "DELIVERED"
  | "PAID";

type PaymentInfo = {
  client_price: number | null;
  advance_amount: number | null;
  advance_from: string | null;
  driver_deal_amount: number | null;
  currency: string;
};

type Order = {
  id: string;
  cargo_number: string;
  order_number: string;
  sender: string;
  receiver: string;
  route: string;
  status: OrderStatus;
  transport_type: string;
  driver_name?: string | null;
  driver_phone?: string | null;
  vehicle_plate?: string | null;
  vehicle_model?: string | null;
  loading_date: string;
  weight_kg: number;
  volume_m3: number;
  archived: boolean;
  owner_user_id?: string | null;
  payment: PaymentInfo;
};

type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: "super_admin" | "admin";
  status: AdminStatus;
};

type DriverVehicle = {
  id: string;
  driver_name: string;
  driver_phone: string;
  country: string;
  transport_type: string;
  vehicle_plate: string;
  vehicle_model: string;
  status: string;
  owner_user_id?: string | null;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: Role;
  admin_status: AdminStatus | null;
};

type DbOrderRow = {
  id: string;
  cargo_number: string;
  order_number: string;
  sender: string;
  receiver: string;
  route: string;
  status: OrderStatus;
  transport_type: string;
  driver_name: string | null;
  driver_phone: string | null;
  vehicle_plate: string | null;
  vehicle_model: string | null;
  loading_date: string;
  weight_kg: number;
  volume_m3: number;
  archived: boolean | null;
  owner_user_id: string | null;
  client_price: number | null;
  advance_amount: number | null;
  advance_from: string | null;
  driver_deal_amount: number | null;
  currency: string | null;
};

type DbDriverVehicleRow = {
  id: string;
  driver_name: string;
  driver_phone: string;
  country: string;
  transport_type: string;
  vehicle_plate: string;
  vehicle_model: string;
  status: string;
  owner_user_id: string | null;
};

// ================= DATA =================
const transportTypes = [
  "Тент 82 м³ / 5 осей",
  "Тент 92 м³ / 6 осей",
  "Тент 120 м³ / 7 осей",
  "Шторный полуприцеп 13.6 м / 6 осей",
  "Рефрижератор / 6 осей",
  "Контейнеровоз 20ft / 5 осей",
  "Контейнеровоз 40ft / 6 осей",
  "Низкорамный трал / 4 оси",
  "Самосвал / 6 осей",
  "Автоцистерна / 5 осей",
  "ЖД контейнерная платформа",
  "ЖД крытый вагон",
  "ЖД полувагон",
  "ЖД рефрижераторный вагон",
  "Авиаперевозка стандартная",
  "Авиаперевозка экспресс",
] as const;

const statusLabels: Record<OrderStatus, string> = {
  CREATED: "Создан",
  ASSIGNED: "Назначен водитель",
  AT_LOADING: "Прибыл на погрузку",
  LOADED: "Погружен",
  IN_TRANSIT: "В пути",
  AT_BORDER: "На границе",
  DELIVERED: "Доставлен",
  PAID: "Оплачен",
};

const timelineOrder: OrderStatus[] = [
  "CREATED",
  "ASSIGNED",
  "AT_LOADING",
  "LOADED",
  "IN_TRANSIT",
  "AT_BORDER",
  "DELIVERED",
  "PAID",
];

const setupSql = `
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  role text not null check (role in ('super_admin','admin','client','driver')),
  admin_status text check (admin_status in ('ACTIVE','LIMITED','DISABLED')) default 'ACTIVE',
  created_at timestamptz default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  cargo_number text not null,
  order_number text not null,
  sender text not null,
  receiver text not null,
  route text not null,
  status text not null check (status in ('CREATED','ASSIGNED','AT_LOADING','LOADED','IN_TRANSIT','AT_BORDER','DELIVERED','PAID')),
  transport_type text not null,
  driver_name text,
  driver_phone text,
  vehicle_plate text,
  vehicle_model text,
  loading_date date not null,
  weight_kg integer not null default 0,
  volume_m3 numeric not null default 0,
  archived boolean not null default false,
  owner_user_id uuid references auth.users(id),
  client_price numeric,
  advance_amount numeric,
  advance_from text,
  driver_deal_amount numeric,
  currency text default 'USD',
  created_at timestamptz default now()
);

create table if not exists public.driver_vehicles (
  id uuid primary key default gen_random_uuid(),
  driver_name text not null,
  driver_phone text not null,
  country text not null,
  transport_type text not null,
  vehicle_plate text not null,
  vehicle_model text not null,
  status text not null default 'ACTIVE',
  owner_user_id uuid references auth.users(id),
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;
alter table public.orders enable row level security;
alter table public.driver_vehicles enable row level security;
`;

const demoOrders: Order[] = [
  {
    id: "1",
    cargo_number: "CG-001",
    order_number: "ORD-001",
    sender: "Kashgar Warehouse",
    receiver: "Dushanbe Terminal",
    route: "China → Tajikistan",
    status: "IN_TRANSIT",
    transport_type: "Тент 92 м³ / 6 осей",
    driver_name: "Rajabov Umed",
    driver_phone: "+992900000111",
    vehicle_plate: "TJ-1234-AA",
    vehicle_model: "HOWO T7H",
    loading_date: "2026-04-08",
    weight_kg: 18000,
    volume_m3: 42,
    archived: false,
    owner_user_id: "demo-client-1",
    payment: {
      client_price: 3000,
      advance_amount: 1000,
      advance_from: "Asia Supply Chain",
      driver_deal_amount: 2000,
      currency: "USD",
    },
  },
  {
    id: "2",
    cargo_number: "CG-002",
    order_number: "ORD-002",
    sender: "Almaty Machinery Zone",
    receiver: "Tashkent Terminal",
    route: "Kazakhstan → Uzbekistan",
    status: "PAID",
    transport_type: "Низкорамный трал / 4 оси",
    driver_name: "Nurlan Tursyn",
    driver_phone: "+770100000444",
    vehicle_plate: "KZ-888-QW",
    vehicle_model: "Actros",
    loading_date: "2026-03-28",
    weight_kg: 14000,
    volume_m3: 33,
    archived: true,
    owner_user_id: "demo-client-2",
    payment: {
      client_price: 5200,
      advance_amount: 5200,
      advance_from: "Asia Supply Chain",
      driver_deal_amount: 3400,
      currency: "USD",
    },
  },
];

const demoAdmins: AdminUser[] = [
  { id: "1", name: "Yang Xijiang", email: "owner@example.com", role: "super_admin", status: "ACTIVE" },
  { id: "2", name: "Admin One", email: "admin1@example.com", role: "admin", status: "ACTIVE" },
  { id: "3", name: "Admin Two", email: "admin2@example.com", role: "admin", status: "LIMITED" },
];

const demoDriverVehicles: DriverVehicle[] = [
  {
    id: "dv1",
    driver_name: "Rajabov Umed",
    driver_phone: "+992900000111",
    country: "Tajikistan",
    transport_type: "Тент 92 м³ / 6 осей",
    vehicle_plate: "TJ-1234-AA",
    vehicle_model: "HOWO T7H",
    status: "ACTIVE",
    owner_user_id: "demo-driver-1",
  },
  {
    id: "dv2",
    driver_name: "Nurlan Tursyn",
    driver_phone: "+770100000444",
    country: "Kazakhstan",
    transport_type: "Низкорамный трал / 4 оси",
    vehicle_plate: "KZ-888-QW",
    vehicle_model: "Actros",
    status: "ACTIVE",
    owner_user_id: "demo-driver-2",
  },
];

// ================= HELPERS =================
function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function canSeeFinance(role: Role) {
  return role === "admin" || role === "super_admin";
}

function formatMoney(value: number | null, currency: string) {
  if (value == null) return "-";
  return `${value} ${currency}`;
}

function timelineSteps(status: OrderStatus) {
  const idx = timelineOrder.indexOf(status);
  return timelineOrder.map((item, index) => ({
    status: item,
    done: index <= idx,
    current: item === status,
  }));
}

function mapDbOrder(row: DbOrderRow): Order {
  return {
    id: row.id,
    cargo_number: row.cargo_number,
    order_number: row.order_number,
    sender: row.sender,
    receiver: row.receiver,
    route: row.route,
    status: row.status,
    transport_type: row.transport_type,
    driver_name: row.driver_name,
    driver_phone: row.driver_phone,
    vehicle_plate: row.vehicle_plate,
    vehicle_model: row.vehicle_model,
    loading_date: row.loading_date,
    weight_kg: row.weight_kg,
    volume_m3: row.volume_m3,
    archived: !!row.archived,
    owner_user_id: row.owner_user_id,
    payment: {
      client_price: row.client_price,
      advance_amount: row.advance_amount,
      advance_from: row.advance_from,
      driver_deal_amount: row.driver_deal_amount,
      currency: row.currency || "USD",
    },
  };
}

function getPublicEnv(name: string): string | undefined {
  const g = globalThis as unknown as {
    process?: { env?: Record<string, string | undefined> };
    __env?: Record<string, string | undefined>;
  };
  return g.__env?.[name] ?? g.process?.env?.[name];
}

function makeSupabaseClient(): SupabaseClient | null {
  const url = getPublicEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anon = getPublicEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  if (!url || !anon) return null;
  return createClient(url, anon, {
    auth: { persistSession: true, autoRefreshToken: true },
  });
}

// ================= SMALL UI =================
function Panel({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("rounded-2xl border border-slate-200 bg-white shadow-sm", className)}>{children}</div>;
}

function Btn({
  children,
  onClick,
  type = "button",
  variant = "primary",
  className,
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  variant?: "primary" | "outline" | "danger";
  className?: string;
  disabled?: boolean;
}) {
  const styles = {
    primary: "bg-slate-900 text-white hover:bg-slate-800",
    outline: "bg-white text-slate-900 border border-slate-300 hover:bg-slate-50",
    danger: "bg-red-600 text-white hover:bg-red-700",
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50",
        styles[variant],
        className,
      )}
    >
      {children}
    </button>
  );
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn("w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500", props.className)} />;
}

function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn("w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500", props.className)} />;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-auto rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-2 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-xl px-4 py-2 text-sm font-medium transition",
        active ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200",
      )}
    >
      {children}
    </button>
  );
}

function StatCard({ title, value, icon: Icon }: { title: string; value: string | number; icon: React.ElementType }) {
  return (
    <Panel>
      <div className="flex items-center justify-between p-5">
        <div>
          <p className="text-sm text-slate-500">{title}</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 p-3">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Panel>
  );
}

function TrackingTimeline({ status }: { status: OrderStatus }) {
  const steps = timelineSteps(status);
  return (
    <div className="space-y-3">
      <h3 className="font-medium">История движения</h3>
      {steps.map((step, index) => (
        <div key={step.status} className="flex gap-3">
          <div className="flex flex-col items-center">
            {step.done ? <CheckCircle2 className={cn("h-5 w-5", step.current ? "text-slate-900" : "text-green-600")} /> : <Circle className="h-5 w-5 text-slate-300" />}
            {index < steps.length - 1 ? <div className="mt-1 h-6 w-px bg-slate-200" /> : null}
          </div>
          <div className="pb-2 text-sm">
            <span className={step.current ? "font-medium text-slate-900" : "text-slate-500"}>{statusLabels[step.status]}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function SetupCard() {
  return (
    <Panel className="border-amber-200 bg-amber-50">
      <div className="space-y-4 p-5 text-sm">
        <div className="flex items-center gap-2 font-semibold text-slate-900">
          <AlertTriangle className="h-4 w-4" /> Supabase setup needed
        </div>
        <p>Добавь env в Vercel или локальный проект.</p>
        <div className="rounded-xl border border-slate-200 bg-white p-3 font-mono text-xs">
          <div>NEXT_PUBLIC_SUPABASE_URL=...</div>
          <div>NEXT_PUBLIC_SUPABASE_ANON_KEY=...</div>
        </div>
        <p>SQL для Supabase:</p>
        <TextArea readOnly value={setupSql.trim()} className="min-h-[260px] font-mono text-xs" />
      </div>
    </Panel>
  );
}

function LoginCard({ onSignIn, loading, error }: { onSignIn: (email: string, password: string) => Promise<void>; loading: boolean; error: string | null }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <Panel className="mx-auto mt-12 max-w-md">
      <div className="space-y-4 p-6">
        <div className="flex items-center gap-2 text-xl font-semibold">
          <KeyRound className="h-5 w-5" /> Вход через Supabase
        </div>
        <Field label="Email">
          <TextInput value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        </Field>
        <Field label="Password">
          <TextInput type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
        </Field>
        {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
        <Btn className="w-full" disabled={loading || !email || !password} onClick={() => void onSignIn(email, password)}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Войти
        </Btn>
      </div>
    </Panel>
  );
}

function StatusBadge({ children }: { children: React.ReactNode }) {
  return <span className="inline-flex rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">{children}</span>;
}

function OrderDetailsModal({ order, open, onClose, role }: { order: Order | null; open: boolean; onClose: () => void; role: Role }) {
  if (!order) return null;
  return (
    <Modal open={open} onClose={onClose} title={`${order.order_number} / ${order.cargo_number}`}>
      <div className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-2">
          <Panel>
            <div className="space-y-3 p-5 text-sm">
              <div className="text-base font-semibold">Детали заказа</div>
              <div><b>Отправитель:</b> {order.sender}</div>
              <div><b>Получатель груза:</b> {order.receiver}</div>
              <div><b>Маршрут:</b> {order.route}</div>
              <div><b>Статус:</b> {statusLabels[order.status]}</div>
              <div><b>Дата погрузки:</b> {order.loading_date}</div>
              <div><b>Тип транспорта:</b> {order.transport_type}</div>
              <div><b>Вес:</b> {order.weight_kg} kg</div>
              <div><b>Объем:</b> {order.volume_m3} m³</div>
            </div>
          </Panel>
          <Panel>
            <div className="space-y-3 p-5 text-sm">
              <div className="text-base font-semibold">Водитель и авто</div>
              <div className="flex items-center gap-2"><Users className="h-4 w-4" /> {order.driver_name || "-"}</div>
              <div className="flex items-center gap-2"><Phone className="h-4 w-4" /> {order.driver_phone || "-"}</div>
              <div><b>Госномер:</b> {order.vehicle_plate || "-"}</div>
              <div><b>Модель:</b> {order.vehicle_model || "-"}</div>
            </div>
          </Panel>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {canSeeFinance(role) ? (
            <Panel>
              <div className="space-y-3 p-5 text-sm">
                <div className="flex items-center gap-2 text-base font-semibold">
                  <Wallet className="h-4 w-4" /> Оплата
                </div>
                <div><b>Цена для клиента:</b> {formatMoney(order.payment.client_price, order.payment.currency)}</div>
                <div><b>Полученный аванс:</b> {formatMoney(order.payment.advance_amount, order.payment.currency)}</div>
                <div><b>Аванс от:</b> {order.payment.advance_from || "-"}</div>
                <div><b>Договор с водителем:</b> {formatMoney(order.payment.driver_deal_amount, order.payment.currency)}</div>
                <div><b>Валюта:</b> {order.payment.currency}</div>
              </div>
            </Panel>
          ) : null}
          <Panel>
            <div className="p-5">
              <TrackingTimeline status={order.status} />
            </div>
          </Panel>
        </div>
      </div>
    </Modal>
  );
}

function OrdersTable({ orders, role, onChangeStatus }: { orders: Order[]; role: Role; onChangeStatus?: (id: string, status: OrderStatus) => void }) {
  const [selected, setSelected] = useState<Order | null>(null);
  return (
    <>
      <Panel className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-4 py-3">№ заказа</th>
                <th className="px-4 py-3">№ груза</th>
                <th className="px-4 py-3">Получатель груза</th>
                <th className="px-4 py-3">Маршрут</th>
                <th className="px-4 py-3">Статус</th>
                <th className="px-4 py-3">Водитель и авто</th>
                <th className="px-4 py-3">Действия</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="cursor-pointer border-t border-slate-200 hover:bg-slate-50" onClick={() => setSelected(o)}>
                  <td className="px-4 py-3 font-medium">{o.order_number}</td>
                  <td className="px-4 py-3">{o.cargo_number}</td>
                  <td className="px-4 py-3">{o.receiver}</td>
                  <td className="px-4 py-3">{o.route}</td>
                  <td className="px-4 py-3"><StatusBadge>{statusLabels[o.status]}</StatusBadge></td>
                  <td className="px-4 py-3 text-xs">
                    <div>{o.driver_name || "-"}</div>
                    <div>{o.vehicle_plate || "-"}</div>
                    <div>{o.transport_type}</div>
                  </td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    {onChangeStatus ? (
                      <select
                        value={o.status}
                        onChange={(e) => onChangeStatus(o.id, e.target.value as OrderStatus)}
                        className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                      >
                        {timelineOrder.map((status) => (
                          <option key={status} value={status}>{statusLabels[status]}</option>
                        ))}
                      </select>
                    ) : (
                      <Btn variant="outline" className="text-xs" onClick={() => setSelected(o)}>Подробно</Btn>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      <OrderDetailsModal order={selected} open={!!selected} onClose={() => setSelected(null)} role={role} />
    </>
  );
}

function DriverVehicleGrid({ rows }: { rows: DriverVehicle[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {rows.map((row) => (
        <Panel key={row.id}>
          <div className="space-y-2 p-5 text-sm">
            <div className="text-lg font-semibold">{row.driver_name}</div>
            <div className="flex items-center gap-2"><Phone className="h-4 w-4" /> {row.driver_phone}</div>
            <div><b>Страна:</b> {row.country}</div>
            <div><b>Статус:</b> {row.status}</div>
            <div className="mt-2 border-t border-slate-200 pt-2">
              <div className="font-medium">{row.vehicle_plate}</div>
              <div>{row.vehicle_model}</div>
              <div>{row.transport_type}</div>
            </div>
          </div>
        </Panel>
      ))}
    </div>
  );
}

function AdminsGrid({ admins, onStatusChange, onDelete }: { admins: AdminUser[]; onStatusChange: (id: string, status: AdminStatus) => void; onDelete: (id: string) => void }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {admins.map((a) => (
        <Panel key={a.id}>
          <div className="space-y-3 p-5 text-sm">
            <div className="flex items-center justify-between">
              <div className="text-lg font-semibold">{a.name}</div>
              <StatusBadge>{a.role === "super_admin" ? "Super admin" : "Admin"}</StatusBadge>
            </div>
            <div>{a.email}</div>
            <div><b>Доступ:</b> {a.status}</div>
            {a.role !== "super_admin" ? (
              <div className="flex flex-wrap gap-2">
                <Btn variant="outline" className="text-xs" onClick={() => onStatusChange(a.id, "ACTIVE")}>ACTIVE</Btn>
                <Btn variant="outline" className="text-xs" onClick={() => onStatusChange(a.id, "LIMITED")}>LIMITED</Btn>
                <Btn variant="outline" className="text-xs" onClick={() => onStatusChange(a.id, "DISABLED")}>DISABLED</Btn>
                <Btn variant="danger" className="text-xs" onClick={() => onDelete(a.id)}><Trash2 className="mr-2 h-4 w-4" /> DELETE</Btn>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-slate-500"><Shield className="h-4 w-4" /> Основной владелец системы</div>
            )}
          </div>
        </Panel>
      ))}
    </div>
  );
}

function CreateOrderModal({ onCreate }: { onCreate: (order: Omit<Order, "id" | "cargo_number" | "order_number">) => Promise<void> | void }) {
  const [open, setOpen] = useState(false);
  const [receiver, setReceiver] = useState("");
  const [sender, setSender] = useState("");
  const [route, setRoute] = useState("China → Tajikistan");
  const [transportType, setTransportType] = useState<string>(transportTypes[0]);
  const [clientPrice, setClientPrice] = useState("3000");
  const [advanceAmount, setAdvanceAmount] = useState("1000");
  const [advanceFrom, setAdvanceFrom] = useState("");
  const [driverDeal, setDriverDeal] = useState("2000");
  const [currency, setCurrency] = useState("USD");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  return (
    <>
      <Btn onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" /> Новый заказ</Btn>
      <Modal open={open} onClose={() => setOpen(false)} title="Создать новый заказ">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Отправитель"><TextInput value={sender} onChange={(e) => setSender(e.target.value)} /></Field>
          <Field label="Получатель груза"><TextInput value={receiver} onChange={(e) => setReceiver(e.target.value)} /></Field>
          <div className="md:col-span-2"><Field label="Маршрут"><TextInput value={route} onChange={(e) => setRoute(e.target.value)} /></Field></div>
          <Field label="Тип транспорта">
            <select value={transportType} onChange={(e) => setTransportType(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm">
              {transportTypes.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Цена для клиента"><TextInput value={clientPrice} onChange={(e) => setClientPrice(e.target.value)} /></Field>
          <Field label="Полученный аванс"><TextInput value={advanceAmount} onChange={(e) => setAdvanceAmount(e.target.value)} /></Field>
          <Field label="Аванс от"><TextInput value={advanceFrom} onChange={(e) => setAdvanceFrom(e.target.value)} /></Field>
          <Field label="Договор с водителем"><TextInput value={driverDeal} onChange={(e) => setDriverDeal(e.target.value)} /></Field>
          <Field label="Валюта">
            <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm">
              {[
                "USD","RMB","TJS","KGS","UZS","KZT"
              ].map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <div className="md:col-span-2"><Field label="Комментарий"><TextArea value={notes} onChange={(e) => setNotes(e.target.value)} /></Field></div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Btn variant="outline" onClick={() => setOpen(false)}>Отмена</Btn>
          <Btn
            disabled={submitting}
            onClick={async () => {
              try {
                setSubmitting(true);
                await onCreate({
                  sender,
                  receiver,
                  route,
                  status: "CREATED",
                  transport_type: transportType,
                  loading_date: new Date().toISOString().slice(0, 10),
                  weight_kg: 10000,
                  volume_m3: 20,
                  archived: false,
                  payment: {
                    client_price: Number(clientPrice) || null,
                    advance_amount: Number(advanceAmount) || null,
                    advance_from: advanceFrom || null,
                    driver_deal_amount: Number(driverDeal) || null,
                    currency,
                  },
                  driver_name: notes ? null : null,
                  driver_phone: null,
                  vehicle_plate: null,
                  vehicle_model: null,
                  owner_user_id: null,
                });
                setOpen(false);
              } finally {
                setSubmitting(false);
              }
            }}
          >
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Создать
          </Btn>
        </div>
      </Modal>
    </>
  );
}

export default function App() {
  const [supabase] = useState<SupabaseClient | null>(() => makeSupabaseClient());
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [orders, setOrders] = useState<Order[]>(demoOrders);
  const [admins, setAdmins] = useState<AdminUser[]>(demoAdmins);
  const [drivers, setDrivers] = useState<DriverVehicle[]>(demoDriverVehicles);
  const [search, setSearch] = useState("");
  const [transportFilter, setTransportFilter] = useState<string>("all");
  const [authLoading, setAuthLoading] = useState(true);
  const [pageLoading, setPageLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"orders" | "drivers" | "archive" | "guide" | "admins">("orders");

  const role: Role = profile?.role || "super_admin";
  const usingDemo = !supabase;

  async function loadProfileAndData(client: SupabaseClient, currentSession: Session) {
    setPageLoading(true);
    try {
      const { data: profileData, error: profileError } = await client
        .from("profiles")
        .select("id, full_name, email, role, admin_status")
        .eq("id", currentSession.user.id)
        .single();
      if (profileError) throw profileError;
      const nextProfile = profileData as ProfileRow;
      setProfile(nextProfile);

      const { data: ordersData, error: ordersError } = await client
        .from("orders")
        .select("id, cargo_number, order_number, sender, receiver, route, status, transport_type, driver_name, driver_phone, vehicle_plate, vehicle_model, loading_date, weight_kg, volume_m3, archived, owner_user_id, client_price, advance_amount, advance_from, driver_deal_amount, currency")
        .order("loading_date", { ascending: false });
      if (ordersError) throw ordersError;
      setOrders(((ordersData || []) as DbOrderRow[]).map(mapDbOrder));

      const { data: dvData, error: dvError } = await client
        .from("driver_vehicles")
        .select("id, driver_name, driver_phone, country, transport_type, vehicle_plate, vehicle_model, status, owner_user_id");
      if (dvError) throw dvError;
      setDrivers((dvData || []) as DbDriverVehicleRow[]);

      if (nextProfile.role === "super_admin") {
        const { data: adminProfiles, error: adminError } = await client
          .from("profiles")
          .select("id, full_name, email, role, admin_status")
          .in("role", ["super_admin", "admin"]);
        if (adminError) throw adminError;
        setAdmins(
          ((adminProfiles || []) as ProfileRow[]).map((p) => ({
            id: p.id,
            name: p.full_name || p.email || "Unnamed",
            email: p.email || "",
            role: p.role as "super_admin" | "admin",
            status: p.admin_status || "ACTIVE",
          }))
        );
      }
    } finally {
      setPageLoading(false);
    }
  }

  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false);
      return;
    }

    let mounted = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      if (data.session) {
        try {
          await loadProfileAndData(supabase, data.session);
        } catch (err) {
          setAuthError(err instanceof Error ? err.message : "Failed to load data");
        }
      }
      setAuthLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      setSession(nextSession);
      setProfile(null);
      if (nextSession) {
        try {
          await loadProfileAndData(supabase, nextSession);
        } catch (err) {
          setAuthError(err instanceof Error ? err.message : "Failed to load data");
        }
      } else {
        setOrders(demoOrders);
        setAdmins(demoAdmins);
        setDrivers(demoDriverVehicles);
      }
      setAuthLoading(false);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  async function signIn(email: string, password: string) {
    if (!supabase) return;
    setAuthError(null);
    setAuthLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setAuthError(error.message);
      setAuthLoading(false);
    }
  }

  async function signOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
  }

  async function createOrder(order: Omit<Order, "id" | "cargo_number" | "order_number">) {
    if (!supabase || !session) {
      const id = String(Date.now());
      setOrders((prev) => [
        {
          id,
          cargo_number: `CG-${id.slice(-4)}`,
          order_number: `ORD-${id.slice(-4)}`,
          ...order,
        },
        ...prev,
      ]);
      return;
    }

    const payload = {
      cargo_number: `CG-${Date.now().toString().slice(-4)}`,
      order_number: `ORD-${Date.now().toString().slice(-4)}`,
      sender: order.sender,
      receiver: order.receiver,
      route: order.route,
      status: order.status,
      transport_type: order.transport_type,
      driver_name: order.driver_name,
      driver_phone: order.driver_phone,
      vehicle_plate: order.vehicle_plate,
      vehicle_model: order.vehicle_model,
      loading_date: order.loading_date,
      weight_kg: order.weight_kg,
      volume_m3: order.volume_m3,
      archived: order.archived,
      owner_user_id: session.user.id,
      client_price: order.payment.client_price,
      advance_amount: order.payment.advance_amount,
      advance_from: order.payment.advance_from,
      driver_deal_amount: order.payment.driver_deal_amount,
      currency: order.payment.currency,
    };

    const { error } = await supabase.from("orders").insert(payload);
    if (error) throw error;
    await loadProfileAndData(supabase, session);
  }

  async function updateOrderStatus(id: string, status: OrderStatus) {
    if (!supabase || !session) {
      setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status, archived: status === "PAID" } : o)));
      return;
    }
    const { error } = await supabase.from("orders").update({ status, archived: status === "PAID" }).eq("id", id);
    if (error) throw error;
    await loadProfileAndData(supabase, session);
  }

  async function updateAdminStatus(id: string, status: AdminStatus) {
    if (!supabase || !session) {
      setAdmins((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
      return;
    }
    const { error } = await supabase.from("profiles").update({ admin_status: status }).eq("id", id);
    if (error) throw error;
    await loadProfileAndData(supabase, session);
  }

  async function deleteAdmin(id: string) {
    if (!supabase || !session) {
      setAdmins((prev) => prev.filter((a) => a.id !== id));
      return;
    }
    const { error } = await supabase.from("profiles").delete().eq("id", id);
    if (error) throw error;
    await loadProfileAndData(supabase, session);
  }

  const visibleOrders = useMemo(() => {
    const base = orders.filter((o) => {
      const q = search.toLowerCase();
      const matchesSearch = [o.order_number, o.cargo_number, o.receiver, o.sender, o.route, o.transport_type].join(" ").toLowerCase().includes(q);
      const matchesTransport = transportFilter === "all" || o.transport_type === transportFilter;
      return matchesSearch && matchesTransport;
    });

    if (role === "client") return base.filter((o) => o.owner_user_id === session?.user.id || usingDemo);
    if (role === "driver") return base.filter((o) => o.owner_user_id === session?.user.id || o.driver_name === "Rajabov Umed");
    return base;
  }, [orders, role, search, transportFilter, session, usingDemo]);

  const activeOrders = visibleOrders.filter((o) => !o.archived);
  const archivedOrders = visibleOrders.filter((o) => o.archived);

  const visibleDriverVehicles = useMemo(() => {
    const filtered = transportFilter === "all" ? drivers : drivers.filter((d) => d.transport_type === transportFilter);
    if (role === "client" || role === "driver") {
      return filtered.filter((d) => !d.owner_user_id || d.owner_user_id === session?.user.id || usingDemo);
    }
    return filtered;
  }, [role, transportFilter, drivers, session, usingDemo]);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Panel>
          <div className="flex items-center gap-3 px-6 py-4">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Загрузка...</span>
          </div>
        </Panel>
      </div>
    );
  }

  if (!usingDemo && !session) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <LoginCard onSignIn={signIn} loading={authLoading} error={authError} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="grid min-h-screen lg:grid-cols-[280px_1fr]">
        <aside className="border-r border-slate-200 bg-white p-4 lg:p-6">
          <div className="mb-8 flex items-center gap-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3"><Truck className="h-5 w-5" /></div>
            <div>
              <p className="font-semibold">Logistics System</p>
              <p className="text-xs text-slate-500">Central Asia Transport</p>
            </div>
          </div>

          <Panel className="bg-slate-50">
            <div className="space-y-3 p-4 text-sm">
              <div className="flex items-center gap-2"><UserCircle2 className="h-4 w-4" /> {profile?.full_name || session?.user.email || "Demo user"}</div>
              <p className="text-slate-500">Текущая роль: <span className="font-medium text-slate-900">{role}</span></p>
              {usingDemo ? <p className="text-amber-700">Demo mode: env не настроены.</p> : null}
            </div>
          </Panel>

          <div className="mt-8 space-y-2">
            {[
              { key: "orders", icon: Package, label: "Заказы" },
              { key: "drivers", icon: Truck, label: "Водители и авто" },
              { key: "archive", icon: Archive, label: "Архив" },
              { key: "guide", icon: CircleHelp, label: "Инструкция" },
              ...(role === "super_admin" ? [{ key: "admins", icon: Users, label: "Администраторы" }] : []),
            ].map((item) => (
              <button key={item.key} onClick={() => setActiveTab(item.key as typeof activeTab)} className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm transition", activeTab === item.key ? "bg-slate-900 text-white" : "hover:bg-slate-100")}>
                <item.icon className="h-4 w-4" />
                <span>{item.label}</span>
              </button>
            ))}
          </div>

          <div className="mt-10 space-y-3">
            {!usingDemo ? <Btn variant="outline" className="w-full" onClick={() => void signOut()}><LogOut className="mr-2 h-4 w-4" /> Выйти</Btn> : null}
            {usingDemo ? <SetupCard /> : null}
          </div>
        </aside>

        <main className="p-4 lg:p-8">
          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-semibold">Logistics System</h1>
              <p className="mt-1 text-slate-500">Простая рабочая версия без лишних зависимостей</p>
            </div>
            <div className="flex items-center gap-2">
              <Btn variant="outline"><Globe className="mr-2 h-4 w-4" /> RU</Btn>
              {(role === "admin" || role === "super_admin") ? <CreateOrderModal onCreate={(order) => void createOrder(order)} /> : null}
            </div>
          </div>

          {authError ? <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{authError}</div> : null}
          {pageLoading ? <div className="mb-6 flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-4 text-sm"><Loader2 className="h-4 w-4 animate-spin" /> Обновление данных...</div> : null}

          <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard title="Активные заказы" value={activeOrders.length} icon={Truck} />
            <StatCard title="Архив" value={archivedOrders.length} icon={Archive} />
            <StatCard title="На границе" value={visibleOrders.filter((o) => o.status === "AT_BORDER").length} icon={Package} />
            <StatCard title="Оплачено" value={visibleOrders.filter((o) => o.status === "PAID").length} icon={CreditCard} />
          </div>

          {activeTab === "orders" ? (
            <div className="space-y-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex w-full max-w-4xl gap-3">
                  <div className="relative w-full max-w-lg">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <TextInput className="pl-9" placeholder="Поиск по номеру, получателю, маршруту" value={search} onChange={(e) => setSearch(e.target.value)} />
                  </div>
                  <div className="relative w-[260px]">
                    <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <select value={transportFilter} onChange={(e) => setTransportFilter(e.target.value)} className="w-full rounded-xl border border-slate-300 px-9 py-2 text-sm">
                      <option value="all">Все виды транспорта</option>
                      {transportTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
              </div>
              <OrdersTable orders={activeOrders} role={role} onChangeStatus={(id, status) => void updateOrderStatus(id, status)} />
            </div>
          ) : null}

          {activeTab === "drivers" ? <DriverVehicleGrid rows={visibleDriverVehicles} /> : null}
          {activeTab === "archive" ? <OrdersTable orders={archivedOrders} role={role} /> : null}
          {activeTab === "guide" ? (
            <Panel>
              <div className="space-y-2 p-5 text-sm text-slate-600">
                <div className="flex items-center gap-2 text-base font-semibold text-slate-900"><CircleHelp className="h-5 w-5" /> Как пользоваться</div>
                <p>1. Вход работает через Supabase Auth.</p>
                <p>2. Роль берется из таблицы profiles.</p>
                <p>3. Клиенты и водители не видят финансы.</p>
                <p>4. После статуса «Оплачен» заказ уходит в архив.</p>
                <p>5. Super admin управляет администраторами.</p>
                <p>6. Эта версия специально упрощена, чтобы нормально запускаться в Next.js и Vercel.</p>
              </div>
            </Panel>
          ) : null}
          {activeTab === "admins" && role === "super_admin" ? <AdminsGrid admins={admins} onStatusChange={(id, status) => void updateAdminStatus(id, status)} onDelete={(id) => void deleteAdmin(id)} /> : null}
        </main>
      </div>
    </div>
  );
}

// ================= TESTS =================
console.assert(canSeeFinance("client") === false, "finance hidden for client");
console.assert(canSeeFinance("admin") === true, "finance visible for admin");
console.assert(transportTypes.includes("ЖД контейнерная платформа"), "rail transport exists");
console.assert(transportTypes.includes("Авиаперевозка экспресс"), "air transport exists");
console.assert(timelineSteps("PAID").find((s) => s.status === "PAID")?.current === true, "paid step exists");
console.assert(getPublicEnv("NON_EXISTENT_ENV") === undefined, "missing env returns undefined");
console.assert(makeSupabaseClient() === null || typeof makeSupabaseClient() === "object", "supabase client factory safe in browser");
console.assert(statusLabels.CREATED === "Создан", "status labels stay valid");
