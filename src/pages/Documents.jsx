import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { DOC_TYPES, emptyItem, calcTotals, formatMoney } from "../utils/docTypes";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function emptyForm(company) {
  return {
    doc_type: "quotation",
    doc_number: "",
    doc_date: todayStr(),
    due_date: "",
    branch_id: "",
    customer_id: "",
    items: [emptyItem()],
    discount: "0",
    vat_percent: String(company?.vat_percent ?? 0),
    note: "",
    ref_doc_number: "",
    status: "draft",
  };
}

export default function Documents({ company }) {
  const [docs, setDocs] = useState([]);
  const [branches, setBranches] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [filterType, setFilterType] = useState("");
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm(company));

  async function loadMasters() {
    const [{ data: br }, { data: cu }] = await Promise.all([
      supabase.from("branches").select("id,name").order("name"),
      supabase.from("customers").select("id,name,contact_name,phone,address,tax_id").order("name"),
    ]);
    setBranches(br || []);
    setCustomers(cu || []);
  }

  async function loadDocs() {
    setLoading(true);
    let q = supabase.from("sales_documents").select("*, branches(name)").order("doc_date", { ascending: false }).order("created_at", { ascending: false });
    if (filterType) q = q.eq("doc_type", filterType);
    const { data } = await q;
    setDocs(data || []);
    setLoading(false);
  }

  useEffect(() => { loadMasters(); }, []);
  useEffect(() => { loadDocs(); /* eslint-disable-next-line */ }, [filterType]);

  function openNew() {
    setEditingId(null);
    setForm(emptyForm(company));
    setEditorOpen(true);
  }

  function openEdit(doc) {
    setEditingId(doc.id);
    setForm({
      doc_type: doc.doc_type,
      doc_number: doc.doc_number,
      doc_date: doc.doc_date,
      due_date: doc.due_date || "",
      branch_id: doc.branch_id || "",
      customer_id: doc.customer_id || "",
      items: doc.items?.length ? doc.items : [emptyItem()],
      discount: String(doc.discount ?? 0),
      vat_percent: String(doc.vat_percent ?? 0),
      note: doc.note || "",
      ref_doc_number: doc.ref_doc_number || "",
      status: doc.status || "draft",
    });
    setEditorOpen(true);
  }

  async function generateNumber() {
    const prefix = DOC_TYPES[form.doc_type].prefix;
    const { data, error } = await supabase.rpc("next_doc_number", { p_doc_type: form.doc_type, p_prefix: prefix });
    if (!error && data) setForm((f) => ({ ...f, doc_number: data }));
  }

  function updateItem(idx, patch) {
    setForm((f) => {
      const items = f.items.map((it, i) => (i === idx ? { ...it, ...patch } : it));
      return { ...f, items };
    });
  }
  function addItem() {
    setForm((f) => ({ ...f, items: [...f.items, emptyItem()] }));
  }
  function removeItem(idx) {
    setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));
  }

  const totals = useMemo(() => calcTotals(form.items, form.discount, form.vat_percent), [form.items, form.discount, form.vat_percent]);

  async function handleSave(e) {
    e.preventDefault();
    if (!form.doc_number.trim()) {
      alert("กรุณาระบุเลขที่เอกสาร (กดปุ่ม 'ขอเลขที่อัตโนมัติ' หรือกรอกเอง)");
      return;
    }
    const customer = customers.find((c) => c.id === form.customer_id);
    const payload = {
      doc_type: form.doc_type,
      doc_number: form.doc_number,
      doc_date: form.doc_date,
      due_date: form.due_date || null,
      branch_id: form.branch_id || null,
      customer_id: form.customer_id || null,
      customer_snapshot: customer
        ? { name: customer.name, contact_name: customer.contact_name, phone: customer.phone, address: customer.address, tax_id: customer.tax_id }
        : {},
      items: form.items.map((it) => ({
        description: it.description,
        quantity: Number(it.quantity) || 0,
        unit: it.unit,
        unit_price: Number(it.unit_price) || 0,
        amount: (Number(it.quantity) || 0) * (Number(it.unit_price) || 0),
      })),
      subtotal: totals.subtotal,
      discount: Number(form.discount) || 0,
      vat_percent: Number(form.vat_percent) || 0,
      vat_amount: totals.vatAmount,
      grand_total: totals.grandTotal,
      note: form.note,
      ref_doc_number: form.ref_doc_number,
      status: form.status,
    };
    let error;
    if (editingId) {
      ({ error } = await supabase.from("sales_documents").update(payload).eq("id", editingId));
    } else {
      ({ error } = await supabase.from("sales_documents").insert(payload));
    }
    if (error) {
      alert("บันทึกไม่สำเร็จ: " + error.message);
      return;
    }
    setEditorOpen(false);
    loadDocs();
  }

  async function remove(id) {
    if (!confirm("ยืนยันการลบเอกสารนี้?")) return;
    await supabase.from("sales_documents").delete().eq("id", id);
    loadDocs();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-ink-900">ใบเสนอราคา / ใบวางบิล / ใบเสร็จรับเงิน</h1>
          <p className="text-sm text-ink-700/60">ออกเอกสารพร้อมเลขที่กำกับ พิมพ์หรือบันทึกเป็น PDF ได้</p>
        </div>
        <button className="btn btn-primary" onClick={openNew}>+ สร้างเอกสารใหม่</button>
      </div>

      <div className="flex gap-2">
        <FilterPill active={filterType === ""} onClick={() => setFilterType("")}>ทั้งหมด</FilterPill>
        {Object.entries(DOC_TYPES).map(([key, v]) => (
          <FilterPill key={key} active={filterType === key} onClick={() => setFilterType(key)}>{v.label}</FilterPill>
        ))}
      </div>

      <div className="card scrollbox">
        <table className="data-table">
          <thead>
            <tr>
              <th>เลขที่เอกสาร</th>
              <th>ประเภท</th>
              <th>วันที่</th>
              <th>สาขา</th>
              <th>ยอดรวม</th>
              <th>สถานะ</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={7} className="text-center text-ink-700/50 py-6">กำลังโหลด...</td></tr>}
            {!loading && docs.length === 0 && (
              <tr><td colSpan={7} className="text-center text-ink-700/50 py-6">ยังไม่มีเอกสาร</td></tr>
            )}
            {docs.map((d) => (
              <tr key={d.id}>
                <td className="font-medium">{d.doc_number}</td>
                <td><span className={`text-xs px-2 py-1 rounded-full ${DOC_TYPES[d.doc_type]?.color}`}>{DOC_TYPES[d.doc_type]?.label}</span></td>
                <td>{d.doc_date}</td>
                <td>{d.branches?.name || "-"}</td>
                <td className="font-medium">{formatMoney(d.grand_total)}</td>
                <td>{d.status}</td>
                <td className="text-right whitespace-nowrap">
                  <Link to={`/print/${d.id}`} target="_blank" className="btn btn-ghost !px-2 !py-1 mr-1">พิมพ์/PDF</Link>
                  <button className="btn btn-ghost !px-2 !py-1 mr-1" onClick={() => openEdit(d)}>แก้ไข</button>
                  <button className="btn btn-danger !px-2 !py-1" onClick={() => remove(d.id)}>ลบ</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editorOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-start lg:items-center justify-center p-4 overflow-y-auto">
          <div className="card w-full max-w-3xl p-5 my-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-ink-900">{editingId ? "แก้ไขเอกสาร" : "สร้างเอกสารใหม่"}</h2>
              <button className="text-ink-700/50 hover:text-ink-900" onClick={() => setEditorOpen(false)}>✕</button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="field-label">ประเภทเอกสาร</label>
                  <select className="input" value={form.doc_type} onChange={(e) => setForm({ ...form, doc_type: e.target.value })}>
                    {Object.entries(DOC_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="field-label">เลขที่เอกสาร *</label>
                  <div className="flex gap-1">
                    <input className="input" value={form.doc_number} onChange={(e) => setForm({ ...form, doc_number: e.target.value })} placeholder="เช่น QT-2026-0001" />
                    <button type="button" className="btn btn-ghost whitespace-nowrap" onClick={generateNumber}>ขอเลขอัตโนมัติ</button>
                  </div>
                </div>
                <div>
                  <label className="field-label">วันที่ออกเอกสาร</label>
                  <input type="date" className="input" value={form.doc_date} onChange={(e) => setForm({ ...form, doc_date: e.target.value })} />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="field-label">สาขา</label>
                  <select className="input" value={form.branch_id} onChange={(e) => setForm({ ...form, branch_id: e.target.value })}>
                    <option value="">— ไม่ระบุ —</option>
                    {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="field-label">ลูกค้า</label>
                  <select className="input" value={form.customer_id} onChange={(e) => setForm({ ...form, customer_id: e.target.value })}>
                    <option value="">— ไม่ระบุ —</option>
                    {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="field-label">วันครบกำหนด (ถ้ามี)</label>
                  <input type="date" className="input" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="field-label mb-0">รายการ</label>
                  <button type="button" className="btn btn-ghost !py-1 !px-2 text-xs" onClick={addItem}>+ เพิ่มรายการ</button>
                </div>
                <div className="space-y-2">
                  {form.items.map((it, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                      <input className="input col-span-5" placeholder="รายละเอียด" value={it.description} onChange={(e) => updateItem(idx, { description: e.target.value })} />
                      <input type="number" step="0.01" className="input col-span-2" placeholder="จำนวน" value={it.quantity} onChange={(e) => updateItem(idx, { quantity: e.target.value })} />
                      <input className="input col-span-2" placeholder="หน่วย" value={it.unit} onChange={(e) => updateItem(idx, { unit: e.target.value })} />
                      <input type="number" step="0.01" className="input col-span-2" placeholder="ราคา/หน่วย" value={it.unit_price} onChange={(e) => updateItem(idx, { unit_price: e.target.value })} />
                      <button type="button" className="btn btn-danger col-span-1 !px-2" onClick={() => removeItem(idx)}>✕</button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="field-label">ส่วนลด (บาท)</label>
                  <input type="number" step="0.01" className="input" value={form.discount} onChange={(e) => setForm({ ...form, discount: e.target.value })} />
                </div>
                <div>
                  <label className="field-label">VAT (%)</label>
                  <input type="number" step="0.01" className="input" value={form.vat_percent} onChange={(e) => setForm({ ...form, vat_percent: e.target.value })} />
                </div>
                <div>
                  <label className="field-label">สถานะ</label>
                  <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                    <option value="draft">ร่าง (draft)</option>
                    <option value="issued">ออกแล้ว (issued)</option>
                    <option value="paid">ชำระแล้ว (paid)</option>
                    <option value="void">ยกเลิก (void)</option>
                  </select>
                </div>
              </div>

              {form.doc_type === "receipt" && (
                <div>
                  <label className="field-label">อ้างอิงเลขที่เอกสาร (เช่น เลขที่ใบวางบิล)</label>
                  <input className="input" value={form.ref_doc_number} onChange={(e) => setForm({ ...form, ref_doc_number: e.target.value })} />
                </div>
              )}

              <div>
                <label className="field-label">หมายเหตุ</label>
                <textarea className="input" rows={2} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
              </div>

              <div className="flex justify-end gap-6 text-sm border-t border-ink-800/10 pt-3">
                <div>ยอดก่อนภาษี: <b>{formatMoney(totals.subtotal - form.discount)}</b></div>
                <div>ภาษี: <b>{formatMoney(totals.vatAmount)}</b></div>
                <div className="text-frost-600">รวมสุทธิ: <b>{formatMoney(totals.grandTotal)}</b></div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" className="btn btn-ghost" onClick={() => setEditorOpen(false)}>ยกเลิก</button>
                <button className="btn btn-primary">{editingId ? "บันทึกการแก้ไข" : "บันทึกเอกสาร"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterPill({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`text-xs px-3 py-1.5 rounded-full border ${
        active ? "bg-frost-600 text-white border-frost-600" : "border-ink-800/10 text-ink-700/70 hover:bg-ink-800/5"
      }`}
    >
      {children}
    </button>
  );
}
