import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

const CATEGORIES = ["เบิกเงินสด", "ค่าน้ำมัน", "ค่าแรง", "ค่าไฟ", "ค่าซ่อมบำรุง", "ค่าน้ำแข็ง(ซื้อเข้า)", "อื่นๆ"];

const emptyForm = {
  expense_date: todayStr(),
  branch_id: "",
  category: CATEGORIES[0],
  description: "",
  amount: "",
  paid_to: "",
};

export default function Expenses() {
  const [rows, setRows] = useState([]);
  const [branches, setBranches] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(todayStr().slice(0, 7));
  const [branchFilter, setBranchFilter] = useState("");

  async function loadBranches() {
    const { data } = await supabase.from("branches").select("id,name").order("name");
    setBranches(data || []);
  }

  async function loadExpenses() {
    setLoading(true);
    const start = `${month}-01`;
    const endDate = new Date(month + "-01");
    endDate.setMonth(endDate.getMonth() + 1);
    const end = endDate.toISOString().slice(0, 10);

    let query = supabase
      .from("expenses")
      .select("*, branches(name)")
      .gte("expense_date", start)
      .lt("expense_date", end)
      .order("expense_date", { ascending: false });

    if (branchFilter) query = query.eq("branch_id", branchFilter);

    const { data } = await query;
    setRows(data || []);
    setLoading(false);
  }

  useEffect(() => { loadBranches(); }, []);
  useEffect(() => { loadExpenses(); /* eslint-disable-next-line */ }, [month, branchFilter]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.amount) return;
    const payload = {
      expense_date: form.expense_date,
      branch_id: form.branch_id || null,
      category: form.category,
      description: form.description,
      amount: Number(form.amount) || 0,
      paid_to: form.paid_to,
    };
    if (editingId) {
      await supabase.from("expenses").update(payload).eq("id", editingId);
    } else {
      await supabase.from("expenses").insert(payload);
    }
    setForm(emptyForm);
    setEditingId(null);
    loadExpenses();
  }

  function startEdit(row) {
    setEditingId(row.id);
    setForm({
      expense_date: row.expense_date,
      branch_id: row.branch_id || "",
      category: row.category,
      description: row.description || "",
      amount: String(row.amount),
      paid_to: row.paid_to || "",
    });
  }

  async function remove(id) {
    if (!confirm("ยืนยันการลบรายการนี้?")) return;
    await supabase.from("expenses").delete().eq("id", id);
    loadExpenses();
  }

  const total = useMemo(() => rows.reduce((s, r) => s + Number(r.amount || 0), 0), [rows]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink-900">รายการเบิกเงิน / ค่าใช้จ่าย</h1>
        <p className="text-sm text-ink-700/60">บันทึกค่าใช้จ่ายและเงินเบิกของแต่ละสาขา</p>
      </div>

      <form onSubmit={handleSubmit} className="card p-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <div>
          <label className="field-label">วันที่</label>
          <input type="date" className="input" value={form.expense_date} onChange={(e) => setForm({ ...form, expense_date: e.target.value })} required />
        </div>
        <div>
          <label className="field-label">สาขา</label>
          <select className="input" value={form.branch_id} onChange={(e) => setForm({ ...form, branch_id: e.target.value })}>
            <option value="">— ไม่ระบุ —</option>
            {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <div>
          <label className="field-label">หมวดหมู่</label>
          <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="field-label">จ่ายให้ / เบิกให้</label>
          <input className="input" value={form.paid_to} onChange={(e) => setForm({ ...form, paid_to: e.target.value })} />
        </div>
        <div>
          <label className="field-label">จำนวนเงิน *</label>
          <input type="number" step="0.01" className="input" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
        </div>
        <div className="flex items-end gap-2">
          <button className="btn btn-primary">{editingId ? "บันทึกการแก้ไข" : "+ เพิ่มรายการ"}</button>
        </div>
        <div className="sm:col-span-3 lg:col-span-6">
          <label className="field-label">รายละเอียด</label>
          <input className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        {editingId && (
          <div>
            <button type="button" className="btn btn-ghost" onClick={() => { setEditingId(null); setForm(emptyForm); }}>ยกเลิก</button>
          </div>
        )}
      </form>

      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="field-label">เดือน</label>
          <input type="month" className="input" value={month} onChange={(e) => setMonth(e.target.value)} />
        </div>
        <div>
          <label className="field-label">สาขา</label>
          <select className="input" value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)}>
            <option value="">ทุกสาขา</option>
            {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <div className="flex-1" />
        <div className="text-right">
          <div className="text-[11px] text-ink-700/50">รวมค่าใช้จ่ายเดือนนี้</div>
          <div className="font-semibold text-clay-600">{total.toLocaleString(undefined, { minimumFractionDigits: 2 })} บาท</div>
        </div>
      </div>

      <div className="card scrollbox">
        <table className="data-table">
          <thead>
            <tr>
              <th>วันที่</th>
              <th>สาขา</th>
              <th>หมวดหมู่</th>
              <th>รายละเอียด</th>
              <th>จ่ายให้</th>
              <th>จำนวนเงิน</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={7} className="text-center text-ink-700/50 py-6">กำลังโหลด...</td></tr>}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={7} className="text-center text-ink-700/50 py-6">ไม่มีรายการในเดือนนี้</td></tr>
            )}
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{r.expense_date}</td>
                <td>{r.branches?.name || "-"}</td>
                <td>{r.category}</td>
                <td className="text-ink-700/70">{r.description}</td>
                <td>{r.paid_to}</td>
                <td className="font-medium text-clay-600">{Number(r.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                <td className="text-right whitespace-nowrap">
                  <button className="btn btn-ghost !px-2 !py-1 mr-1" onClick={() => startEdit(r)}>แก้ไข</button>
                  <button className="btn btn-danger !px-2 !py-1" onClick={() => remove(r.id)}>ลบ</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
