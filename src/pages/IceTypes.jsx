import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

const empty = { name: "", unit: "ถุง", default_price: "", cost_price: "" };

export default function IceTypes() {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("ice_types").select("*").order("created_at");
    setRows(data || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
    const payload = {
      name: form.name,
      unit: form.unit,
      default_price: Number(form.default_price) || 0,
      cost_price: Number(form.cost_price) || 0,
    };
    if (editingId) {
      await supabase.from("ice_types").update(payload).eq("id", editingId);
    } else {
      await supabase.from("ice_types").insert(payload);
    }
    setForm(empty);
    setEditingId(null);
    load();
  }

  function startEdit(row) {
    setEditingId(row.id);
    setForm({
      name: row.name,
      unit: row.unit,
      default_price: row.default_price,
      cost_price: row.cost_price,
    });
  }

  async function remove(id) {
    if (!confirm("ยืนยันการลบประเภทน้ำแข็งนี้?")) return;
    await supabase.from("ice_types").delete().eq("id", id);
    load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink-900">ประเภทน้ำแข็ง &amp; ราคา</h1>
        <p className="text-sm text-ink-700/60">เช่น น้ำแข็งหลอดใหญ่ หลอดเล็ก โม่แช่ พร้อมราคาขาย/ต้นทุนมาตรฐาน</p>
      </div>

      <form onSubmit={handleSubmit} className="card p-4 grid gap-3 sm:grid-cols-4">
        <div>
          <label className="field-label">ชื่อประเภท *</label>
          <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </div>
        <div>
          <label className="field-label">หน่วยนับ</label>
          <input className="input" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
        </div>
        <div>
          <label className="field-label">ราคาขาย/หน่วย</label>
          <input type="number" step="0.01" className="input" value={form.default_price} onChange={(e) => setForm({ ...form, default_price: e.target.value })} />
        </div>
        <div>
          <label className="field-label">ราคาต้นทุน/หน่วย</label>
          <input type="number" step="0.01" className="input" value={form.cost_price} onChange={(e) => setForm({ ...form, cost_price: e.target.value })} />
        </div>
        <div className="sm:col-span-4 flex gap-2">
          <button className="btn btn-primary">{editingId ? "บันทึกการแก้ไข" : "+ เพิ่มประเภทน้ำแข็ง"}</button>
          {editingId && (
            <button type="button" className="btn btn-ghost" onClick={() => { setEditingId(null); setForm(empty); }}>
              ยกเลิก
            </button>
          )}
        </div>
      </form>

      <div className="card scrollbox">
        <table className="data-table">
          <thead>
            <tr>
              <th>ชื่อประเภท</th>
              <th>หน่วยนับ</th>
              <th>ราคาขาย</th>
              <th>ราคาต้นทุน</th>
              <th>กำไร/หน่วย</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={6} className="text-center text-ink-700/50 py-6">กำลังโหลด...</td></tr>}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={6} className="text-center text-ink-700/50 py-6">ยังไม่มีข้อมูล</td></tr>
            )}
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="font-medium">{r.name}</td>
                <td>{r.unit}</td>
                <td>{Number(r.default_price).toLocaleString()} บาท</td>
                <td>{Number(r.cost_price).toLocaleString()} บาท</td>
                <td className="text-frost-600">{(Number(r.default_price) - Number(r.cost_price)).toLocaleString()} บาท</td>
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
