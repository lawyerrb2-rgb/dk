import React, { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { supabase } from "../supabaseClient";

const PIE_COLORS = ["#1C9AB3", "#3FB6CB", "#7CD3E0", "#127D93", "#E8853A"];

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
function monthStr() {
  return todayStr().slice(0, 7);
}

export default function Dashboard() {
  const [sales, setSales] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
      sixMonthsAgo.setDate(1);
      const fromDate = sixMonthsAgo.toISOString().slice(0, 10);

      const [{ data: s }, { data: e }] = await Promise.all([
        supabase.from("sales").select("sale_date, total_amount, total_cost, branch_id, branches(name)").gte("sale_date", fromDate),
        supabase.from("expenses").select("expense_date, amount, branch_id").gte("expense_date", fromDate),
      ]);
      setSales(s || []);
      setExpenses(e || []);
      setLoading(false);
    }
    load();
  }, []);

  const thisMonth = monthStr();

  const kpis = useMemo(() => {
    const monthSales = sales.filter((r) => r.sale_date.slice(0, 7) === thisMonth);
    const monthExpenses = expenses.filter((r) => r.expense_date.slice(0, 7) === thisMonth);
    const totalAllTime = sales.reduce((s, r) => s + Number(r.total_amount || 0), 0);
    const monthAmount = monthSales.reduce((s, r) => s + Number(r.total_amount || 0), 0);
    const monthCost = monthSales.reduce((s, r) => s + Number(r.total_cost || 0), 0);
    const monthExpenseTotal = monthExpenses.reduce((s, r) => s + Number(r.amount || 0), 0);
    const monthProfit = monthAmount - monthCost - monthExpenseTotal;
    return { totalAllTime, monthAmount, monthExpenseTotal, monthProfit };
  }, [sales, expenses, thisMonth]);

  const byBranch = useMemo(() => {
    const map = {};
    sales.forEach((r) => {
      const name = r.branches?.name || "ไม่ระบุ";
      map[name] = (map[name] || 0) + Number(r.total_amount || 0);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [sales]);

  const byMonth = useMemo(() => {
    const map = {};
    sales.forEach((r) => {
      const m = r.sale_date.slice(0, 7);
      map[m] = (map[m] || 0) + Number(r.total_amount || 0);
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, ยอดขาย]) => ({ month, ยอดขาย }));
  }, [sales]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink-900">ภาพรวมธุรกิจ</h1>
        <p className="text-sm text-ink-700/60">สรุปยอดขายและค่าใช้จ่ายทั้งหมด</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="ยอดขายรวมทั้งหมด (6 เดือนล่าสุด)" value={kpis.totalAllTime} color="text-ink-900" />
        <Kpi label="ยอดขายเดือนนี้" value={kpis.monthAmount} color="text-frost-600" />
        <Kpi label="ค่าใช้จ่ายเดือนนี้" value={kpis.monthExpenseTotal} color="text-clay-600" />
        <Kpi label="กำไรสุทธิเดือนนี้ (โดยประมาณ)" value={kpis.monthProfit} color="text-frost-700" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="font-medium text-sm text-ink-900 mb-4">ยอดขายรายเดือน</h2>
          <div style={{ width: "100%", height: 260 }}>
            <ResponsiveContainer>
              <LineChart data={byMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E4EEF1" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v) => v.toLocaleString() + " บาท"} />
                <Line type="monotone" dataKey="ยอดขาย" stroke="#127D93" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-5">
          <h2 className="font-medium text-sm text-ink-900 mb-4">สัดส่วนยอดขายแต่ละสาขา</h2>
          <div style={{ width: "100%", height: 260 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={byBranch} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={(d) => d.name}>
                  {byBranch.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => v.toLocaleString() + " บาท"} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="card p-5">
        <h2 className="font-medium text-sm text-ink-900 mb-4">ยอดขายตามสาขา (บาท)</h2>
        <div style={{ width: "100%", height: 280 }}>
          <ResponsiveContainer>
            <BarChart data={byBranch}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E4EEF1" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v) => v.toLocaleString() + " บาท"} />
              <Bar dataKey="value" fill="#1C9AB3" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {loading && <p className="text-sm text-ink-700/50">กำลังโหลดข้อมูล...</p>}
    </div>
  );
}

function Kpi({ label, value, color }) {
  return (
    <div className="card p-5">
      <div className="text-xs text-ink-700/50 mb-1">{label}</div>
      <div className={`text-2xl font-semibold ${color}`}>
        {Number(value).toLocaleString(undefined, { minimumFractionDigits: 2 })}
      </div>
      <div className="text-[11px] text-ink-700/40 mt-1">บาท</div>
    </div>
  );
}
