"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { formatPaise } from "@/lib/format";

const PIE_COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#06b6d4", "#a855f7"];

const rupees = (paise: number) => `₹${Math.round(paise / 100).toLocaleString("en-IN")}`;

// ---- Daily sales trend (area) ----------------------------------------------
export function SalesTrendChart({ data }: { data: { label: string; sales_paise: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
        <XAxis dataKey="label" fontSize={12} tickLine={false} axisLine={false} />
        <YAxis tickFormatter={rupees} fontSize={12} tickLine={false} axisLine={false} width={60} />
        <Tooltip formatter={(v: number) => formatPaise(v)} />
        <Area type="monotone" dataKey="sales_paise" name="Sales" stroke="#6366f1" fill="url(#salesFill)" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ---- Monthly revenue (bar) -------------------------------------------------
export function RevenueBarChart({ data }: { data: { label: string; revenue_paise: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
        <XAxis dataKey="label" fontSize={12} tickLine={false} axisLine={false} />
        <YAxis tickFormatter={rupees} fontSize={12} tickLine={false} axisLine={false} width={60} />
        <Tooltip formatter={(v: number) => formatPaise(v)} />
        <Bar dataKey="revenue_paise" name="Revenue" fill="#22c55e" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ---- Expense breakdown (pie) -----------------------------------------------
export function ExpensePieChart({ data }: { data: { name: string; value_paise: number }[] }) {
  if (!data.length) {
    return <p className="py-12 text-center text-sm text-muted-foreground">No expenses recorded.</p>;
  }
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value_paise"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={90}
          label={(e) => e.name}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(v: number) => formatPaise(v)} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}

// ---- Top products (horizontal bar) -----------------------------------------
export function TopProductsChart({ data }: { data: { name: string; qty: number }[] }) {
  if (!data.length) {
    return <p className="py-12 text-center text-sm text-muted-foreground">No sales yet.</p>;
  }
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
        <XAxis type="number" fontSize={12} tickLine={false} axisLine={false} />
        <YAxis type="category" dataKey="name" width={120} fontSize={12} tickLine={false} axisLine={false} />
        <Tooltip />
        <Bar dataKey="qty" name="Units sold" fill="#6366f1" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
