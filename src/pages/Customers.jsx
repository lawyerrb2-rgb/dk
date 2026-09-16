import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

const empty = { name: "", contact_name: "", phone: "", address: "", tax_id: "", branch_id: "" };

export default function Customers() {
  const [rows, setRows] = useState([]);
  const [branches, setBranches] = useState([]);
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  async function load() {
    setLoading(true);
    const [{ data: custs }, { data: br }] = await Promise.all([
      supabase.from("customers").select("*").order("created_at"),
      supabase.from("branches").select("id, name").order("name"),
    ]);
    setRows(custs || []);
    setBranches(br || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
    const payload = { ...form, branch_id: form.branch_id || null };
    if (editingId) {
      await supabase.from("customers").update(payload).eq("id", editingId);
    } else {
      await supabase.from("customers").insert(payload);
    }
    setForm(empty);
    setEditingId(null);
    load();
  }

  function startEdit(row) {
    setEditingId(row.id);
    setForm({
      name: row.name,
      contact_name: row.contact_name || "",
      phone: row.phone || "",
      address: row.address || "",
      tax_id: row.tax_id || "",
      branch_id: row.branch_id || "",
    });
  }

  async function remove(id) {
    if (!confirm("ยืนยันการลบลูกค้ารายนี้?")) return;
    await supabase.from("customers").delete().eq("id", id);
    load();
  }

  const branchName = (id) => branches.find((b) => b.id === id)?.name || "-";
  const filtered = rows.filter((r) => r.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink-900">ร้านค้า / ลูกค้า</h1>
        <p className="text-sm text-ink-700/60">ข้อมูลลูกค้าที่ซื้อน้ำแข็ง ใช้สำหรับออกเอกสารและบันทึกการขาย</p>
      </div>

      <form onSubmit={handleSubmit} className="card p-4 grid gap-3 sm:grid-cols-3">
        <div>
          <label className="field-label">ชื่อร้าน/ลูกค้า *</label>
          <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </div>
        <div>
          <label className="field-label">ชื่อผู้ติดต่อ</label>
          <input className="input" value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} />
        </div>
        <div>
          <label className="field-label">เบอร์โทร</label>
          <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </div>
        <div className="sm:col-span-2">
          <label className="field-label">ที่อยู่</label>
          <input className="input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        </div>
        <div>
          <label className="field-label">เลขผู้เสียภาษี</label>
          <input className="input" value={form.tax_id} onChange={(e) => setForm({ ...form, tax_id: e.target.value })} />
        </div>
        <div>
          <label className="field-label">สาขาประจำ</label>
          <select className="input" value={form.branch_id} onChange={(e) => setForm({ ...form, branch_id: e.target.value })}>
            <option value="">— ไม่ระบุ —</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-3 flex gap-2">
          <button className="btn btn-primary">{editingId ? "บันทึกการแก้ไข" : "+ เพิ่มลูกค้า"}</button>
          {editingId && (
            <button type="button" className="btn btn-ghost" onClick={() => { setEditingId(null); setForm(empty); }}>
              ยกเลิก
            </button>
          )}
        </div>
      </form>

      <input
        className="input max-w-xs"
        placeholder="ค้นหาชื่อลูกค้า..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="card scrollbox">
        <table className="data-table">
          <thead>
            <tr>
              <th>ชื่อร้าน/ลูกค้า</th>
              <th>ผู้ติดต่อ</th>
              <th>เบอร์โทร</th>
              <th>สาขาประจำ</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={5} className="text-center text-ink-700/50 py-6">กำลังโหลด...</td></tr>}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={5} className="text-center text-ink-700/50 py-6">ไม่พบข้อมูล</td></tr>
            )}
            {filtered.map((r) => (
              <tr key={r.id}>
                <td className="font-medium">{r.name}</td>
                <td>{r.contact_name}</td>
                <td>{r.phone}</td>
                <td>{branchName(r.branch_id)}</td>
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
