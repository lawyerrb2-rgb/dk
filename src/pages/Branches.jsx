import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

const empty = { name: "", address: "", phone: "" };

export default function Branches() {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("branches").select("*").order("created_at");
    setRows(data || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
    if (editingId) {
      await supabase.from("branches").update(form).eq("id", editingId);
    } else {
      await supabase.from("branches").insert(form);
    }
    setForm(empty);
    setEditingId(null);
    load();
  }

  function startEdit(row) {
    setEditingId(row.id);
    setForm({ name: row.name, address: row.address || "", phone: row.phone || "" });
  }

  async function remove(id) {
    if (!confirm("ยืนยันการลบสาขานี้?")) return;
    await supabase.from("branches").delete().eq("id", id);
    load();
  }

  async function toggleActive(row) {
    await supabase.from("branches").update({ is_active: !row.is_active }).eq("id", row.id);
    load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink-900">สาขา</h1>
        <p className="text-sm text-ink-700/60">จัดการรายชื่อสาขาที่ขายน้ำแข็ง</p>
      </div>

      <form onSubmit={handleSubmit} className="card p-4 grid gap-3 sm:grid-cols-3">
        <div className="sm:col-span-1">
          <label className="field-label">ชื่อสาขา *</label>
          <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </div>
        <div className="sm:col-span-1">
          <label className="field-label">ที่อยู่</label>
          <input className="input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        </div>
        <div className="sm:col-span-1">
          <label className="field-label">เบอร์โทร</label>
          <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </div>
        <div className="sm:col-span-3 flex gap-2">
          <button className="btn btn-primary">{editingId ? "บันทึกการแก้ไข" : "+ เพิ่มสาขา"}</button>
          {editingId && (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setEditingId(null);
                setForm(empty);
              }}
            >
              ยกเลิก
            </button>
          )}
        </div>
      </form>

      <div className="card scrollbox">
        <table className="data-table">
          <thead>
            <tr>
              <th>ชื่อสาขา</th>
              <th>ที่อยู่</th>
              <th>เบอร์โทร</th>
              <th>สถานะ</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={5} className="text-center text-ink-700/50 py-6">กำลังโหลด...</td></tr>
            )}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={5} className="text-center text-ink-700/50 py-6">ยังไม่มีสาขา</td></tr>
            )}
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="font-medium">{r.name}</td>
                <td>{r.address}</td>
                <td>{r.phone}</td>
                <td>
                  <button
                    onClick={() => toggleActive(r)}
                    className={`text-xs px-2 py-1 rounded-full ${
                      r.is_active ? "bg-frost-100 text-frost-600" : "bg-ink-800/5 text-ink-700/50"
                    }`}
                  >
                    {r.is_active ? "ใช้งาน" : "ปิดใช้งาน"}
                  </button>
                </td>
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
