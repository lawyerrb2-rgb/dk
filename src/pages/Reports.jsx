import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";

function monthStr() {
  return new Date().toISOString().slice(0, 7);
}

export default function Reports() {
  const [month, setMonth] = useState(monthStr());
  const [sales, setSales] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadBranches() {
      const { data } = await supabase.from("branches").select("id,name").order("name");
      setBranches(data || []);
    }
    loadBranches();
  }, []);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const start = `${month}-01`;
      const endDate = new Date(month + "-01");
      endDate.setMonth(endDate.getMonth() + 1);
      const end = endDate.toISOString().slice(0, 10);

      const [{ data: s }, { data: e }] = await Promise.all([
        supabase
          .from("sales")
          .select("sale_date, quantity, total_amount, total_cost, branch_id, branches(name), ice_types(name, unit)")
          .gte("sale_date", start)
          .lt("sale_date", end),
        supabase
          .from("expenses")
          .select("expense_date, amount, branch_id, branches(name), category")
          .gte("expense_date", start)
          .lt("expense_date", end),
      ]);
      setSales(s || []);
      setExpenses(e || []);
      setLoading(false);
    }
    load();
  }, [month]);

  const byBranch = useMemo(() => {
    const map = {};
    branches.forEach((b) => (map[b.name] = { sales: 0, cost: 0, expense: 0 }));
    sales.forEach((r) => {
      const name = r.branches?.name || "ไม่ระบุสาขา";
      map[name] = map[name] || { sales: 0, cost: 0, expense: 0 };
      map[name].sales += Number(r.total_amount || 0);
      map[name].cost += Number(r.total_cost || 0);
    });
    expenses.forEach((r) => {
      const name = r.branches?.name || "ไม่ระบุสาขา";
      map[name] = map[name] || { sales: 0, cost: 0, expense: 0 };
      map[name].expense += Number(r.amount || 0);
    });
    return Object.entries(map).map(([name, v]) => ({
      name,
      sales: v.sales,
      cost: v.cost,
      expense: v.expense,
      profit: v.sales - v.cost - v.expense,
    }));
  }, [sales, expenses, branches]);

  const byIceType = useMemo(() => {
    const map = {};
    sales.forEach((r) => {
      const name = r.ice_types?.name || "ไม่ระบุ";
      const unit = r.ice_types?.unit || "";
      map[name] = map[name] || { qty: 0, amount: 0, unit };
      map[name].qty += Number(r.quantity || 0);
      map[name].amount += Number(r.total_amount || 0);
    });
    return Object.entries(map).map(([name, v]) => ({ name, ...v }));
  }, [sales]);

  const grand = useMemo(() => {
    const sTotal = sales.reduce((s, r) => s + Number(r.total_amount || 0), 0);
    const cTotal = sales.reduce((s, r) => s + Number(r.total_cost || 0), 0);
    const eTotal = expenses.reduce((s, r) => s + Number(r.amount || 0), 0);
    return { sales: sTotal, cost: cTotal, expense: eTotal, profit: sTotal - cTotal - eTotal };
  }, [sales, expenses]);

  function exportCSV() {
    const header = "สาขา,ยอดขาย,ต้นทุน,ค่าใช้จ่าย,กำไร\n";
    const body = byBranch.map((r) => `${r.name},${r.sales},${r.cost},${r.expense},${r.profit}`).join("\n");
    const csv = "\uFEFF" + header + body;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `รายงานสรุป-${month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-ink-900">รายงานสรุป</h1>
          <p className="text-sm text-ink-700/60">สรุปยอดขาย ต้นทุน ค่าใช้จ่าย และกำไรตามสาขา รายเดือน</p>
        </div>
        <div className="flex items-end gap-2">
          <div>
            <label className="field-label">เดือน</label>
            <input type="month" className="input" value={month} onChange={(e) => setMonth(e.target.value)} />
          </div>
          <button className="btn btn-ghost" onClick={exportCSV}>ดาวน์โหลด CSV</button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="ยอดขายรวม" value={grand.sales} color="text-ink-900" />
        <SummaryCard label="ต้นทุนสินค้า" value={grand.cost} color="text-ink-700" />
        <SummaryCard label="ค่าใช้จ่าย/เบิกเงิน" value={grand.expense} color="text-clay-600" />
        <SummaryCard label="กำไรสุทธิ" value={grand.profit} color="text-frost-600" />
      </div>

      <div>
        <h2 className="font-medium text-sm text-ink-900 mb-2">สรุปแยกตามสาขา</h2>
        <div className="card scrollbox">
          <table className="data-table">
            <thead>
              <tr>
                <th>สาขา</th>
                <th>ยอดขาย</th>
                <th>ต้นทุน</th>
                <th>ค่าใช้จ่าย</th>
                <th>กำไร</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={5} className="text-center text-ink-700/50 py-6">กำลังโหลด...</td></tr>}
              {!loading && byBranch.length === 0 && (
                <tr><td colSpan={5} className="text-center text-ink-700/50 py-6">ไม่มีข้อมูล</td></tr>
              )}
              {byBranch.map((r) => (
                <tr key={r.name}>
                  <td className="font-medium">{r.name}</td>
                  <td>{r.sales.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td>{r.cost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td className="text-clay-600">{r.expense.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td className="font-medium text-frost-600">{r.profit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h2 className="font-medium text-sm text-ink-900 mb-2">สรุปแยกตามประเภทน้ำแข็ง</h2>
        <div className="card scrollbox">
          <table className="data-table">
            <thead>
              <tr>
                <th>ประเภท</th>
                <th>จำนวนที่ขาย</th>
                <th>ยอดขาย</th>
              </tr>
            </thead>
            <tbody>
              {!loading && byIceType.length === 0 && (
                <tr><td colSpan={3} className="text-center text-ink-700/50 py-6">ไม่มีข้อมูล</td></tr>
              )}
              {byIceType.map((r) => (
                <tr key={r.name}>
                  <td className="font-medium">{r.name}</td>
                  <td>{r.qty.toLocaleString()} {r.unit}</td>
                  <td>{r.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} บาท</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, color }) {
  return (
    <div className="card p-5">
      <div className="text-xs text-ink-700/50 mb-1">{label}</div>
      <div className={`text-xl font-semibold ${color}`}>
        {Number(value).toLocaleString(undefined, { minimumFractionDigits: 2 })} บาท
      </div>
    </div>
  );
}
