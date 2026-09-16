import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

const emptyForm = {
  sale_date: todayStr(),
  branch_id: "",
  customer_id: "",
  ice_type_id: "",
  quantity: "1",
  unit_price: "0",
  unit_cost: "0",
  note: "",
};

export default function Sales() {
  const [rows, setRows] = useState([]);
  const [branches, setBranches] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [iceTypes, setIceTypes] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);

  const [month, setMonth] = useState(todayStr().slice(0, 7)); // YYYY-MM
  const [branchFilter, setBranchFilter] = useState("");

  async function loadMasters() {
    const [{ data: br }, { data: cu }, { data: it }] = await Promise.all([
      supabase.from("branches").select("id,name").eq("is_active", true).order("name"),
      supabase.from("customers").select("id,name").order("name"),
      supabase.from("ice_types").select("id,name,unit,default_price,cost_price").eq("is_active", true).order("name"),
    ]);
    setBranches(br || []);
    setCustomers(cu || []);
    setIceTypes(it || []);
  }

  async function loadSales() {
    setLoading(true);
    const start = `${month}-01`;
    const endDate = new Date(month + "-01");
    endDate.setMonth(endDate.getMonth() + 1);
    const end = endDate.toISOString().slice(0, 10);

    let query = supabase
      .from("sales")
      .select("*, branches(name), customers(name), ice_types(name, unit)")
      .gte("sale_date", start)
      .lt("sale_date", end)
      .order("sale_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (branchFilter) query = query.eq("branch_id", branchFilter);

    const { data } = await query;
    setRows(data || []);
    setLoading(false);
  }

  useEffect(() => {
    loadMasters();
  }, []);

  useEffect(() => {
    loadSales();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, branchFilter]);

  function onIceTypeChange(id) {
    const it = iceTypes.find((t) => t.id === id);
    setForm((f) => ({
      ...f,
      ice_type_id: id,
      unit_price: it ? String(it.default_price) : f.unit_price,
      unit_cost: it ? String(it.cost_price) : f.unit_cost,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.branch_id || !form.ice_type_id) return;
    const payload = {
      sale_date: form.sale_date,
      branch_id: form.branch_id,
      customer_id: form.customer_id || null,
      ice_type_id: form.ice_type_id,
      quantity: Number(form.quantity) || 0,
      unit_price: Number(form.unit_price) || 0,
      unit_cost: Number(form.unit_cost) || 0,
      note: form.note,
    };
    if (editingId) {
      await supabase.from("sales").update(payload).eq("id", editingId);
    } else {
      await supabase.from("sales").insert(payload);
    }
    setForm({ ...emptyForm, branch_id: form.branch_id });
    setEditingId(null);
    loadSales();
  }

  function startEdit(row) {
    setEditingId(row.id);
    setForm({
      sale_date: row.sale_date,
      branch_id: row.branch_id,
      customer_id: row.customer_id || "",
      ice_type_id: row.ice_type_id,
      quantity: String(row.quantity),
      unit_price: String(row.unit_price),
      unit_cost: String(row.unit_cost),
      note: row.note || "",
    });
  }

  async function remove(id) {
    if (!confirm("ยืนยันการลบรายการขายนี้?")) return;
    await supabase.from("sales").delete().eq("id", id);
    loadSales();
  }

  const totals = useMemo(() => {
    const amount = rows.reduce((s, r) => s + Number(r.total_amount || 0), 0);
    const cost = rows.reduce((s, r) => s + Number(r.total_cost || 0), 0);
    return { amount, cost, profit: amount - cost, count: rows.length };
  }, [rows]);

  const lineTotal = (Number(form.quantity) || 0) * (Number(form.unit_price) || 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink-900">บันทึกการขายน้ำแข็ง</h1>
        <p className="text-sm text-ink-700/60">กรอกรายการขายประจำวัน แก้ไข/ลบรายการที่ผ่านมาได้</p>
      </div>

      <form onSubmit={handleSubmit} className="card p-4 space-y-3">
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <div>
            <label className="field-label">วันที่ขาย</label>
            <input type="date" className="input" value={form.sale_date} onChange={(e) => setForm({ ...form, sale_date: e.target.value })} required />
          </div>
          <div>
            <label className="field-label">สาขา *</label>
            <select className="input" value={form.branch_id} onChange={(e) => setForm({ ...form, branch_id: e.target.value })} required>
              <option value="">เลือกสาขา</option>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <label className="field-label">ลูกค้า/ร้านค้า</label>
            <select className="input" value={form.customer_id} onChange={(e) => setForm({ ...form, customer_id: e.target.value })}>
              <option value="">— ขายหน้าร้าน/ไม่ระบุ —</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="field-label">ประเภทน้ำแข็ง *</label>
            <select className="input" value={form.ice_type_id} onChange={(e) => onIceTypeChange(e.target.value)} required>
              <option value="">เลือกประเภท</option>
              {iceTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <label className="field-label">จำนวน</label>
            <input type="number" step="0.01" className="input" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
          </div>
          <div>
            <label className="field-label">ราคาขาย/หน่วย</label>
            <input type="number" step="0.01" className="input" value={form.unit_price} onChange={(e) => setForm({ ...form, unit_price: e.target.value })} />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <div>
            <label className="field-label">ต้นทุน/หน่วย</label>
            <input type="number" step="0.01" className="input" value={form.unit_cost} onChange={(e) => setForm({ ...form, unit_cost: e.target.value })} />
          </div>
          <div className="lg:col-span-2">
            <label className="field-label">หมายเหตุ</label>
            <input className="input" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </div>
          <div className="lg:col-span-1 flex flex-col justify-end">
            <label className="field-label">ยอดรวม</label>
            <div className="input bg-frost-50 font-semibold text-frost-600 border-frost-200">
              {lineTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })} บาท
            </div>
          </div>
          <div className="lg:col-span-2 flex items-end gap-2">
            <button className="btn btn-primary">{editingId ? "บันทึกการแก้ไข" : "+ บันทึกการขาย"}</button>
            {editingId && (
              <button type="button" className="btn btn-ghost" onClick={() => { setEditingId(null); setForm(emptyForm); }}>
                ยกเลิก
              </button>
            )}
          </div>
        </div>
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
        <div className="flex gap-4 text-sm">
          <Stat label="รายการ" value={totals.count} />
          <Stat label="ยอดขาย" value={totals.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} suffix="บาท" />
          <Stat label="กำไร" value={totals.profit.toLocaleString(undefined, { minimumFractionDigits: 2 })} suffix="บาท" highlight />
        </div>
      </div>

      <div className="card scrollbox">
        <table className="data-table">
          <thead>
            <tr>
              <th>วันที่</th>
              <th>สาขา</th>
              <th>ลูกค้า</th>
              <th>ประเภทน้ำแข็ง</th>
              <th>จำนวน</th>
              <th>ราคา/หน่วย</th>
              <th>ยอดรวม</th>
              <th>หมายเหตุ</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={9} className="text-center text-ink-700/50 py-6">กำลังโหลด...</td></tr>}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={9} className="text-center text-ink-700/50 py-6">ไม่มีรายการในเดือนนี้</td></tr>
            )}
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{r.sale_date}</td>
                <td>{r.branches?.name}</td>
                <td>{r.customers?.name || <span className="text-ink-700/40">ไม่ระบุ</span>}</td>
                <td>{r.ice_types?.name}</td>
                <td>{r.quantity} {r.ice_types?.unit}</td>
                <td>{Number(r.unit_price).toLocaleString()}</td>
                <td className="font-medium">{Number(r.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                <td className="text-ink-700/60">{r.note}</td>
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

function Stat({ label, value, suffix, highlight }) {
  return (
    <div className="text-right">
      <div className="text-[11px] text-ink-700/50">{label}</div>
      <div className={`font-semibold ${highlight ? "text-frost-600" : "text-ink-900"}`}>
        {value} {suffix}
      </div>
    </div>
  );
}
