import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export default function Settings({ company, onSaved }) {
  const [form, setForm] = useState({
    company_name: "",
    address: "",
    phone: "",
    tax_id: "",
    vat_percent: "0",
    logo_url: "",
  });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");

  useEffect(() => {
    if (company) {
      setForm({
        company_name: company.company_name || "",
        address: company.address || "",
        phone: company.phone || "",
        tax_id: company.tax_id || "",
        vat_percent: String(company.vat_percent ?? "0"),
        logo_url: company.logo_url || "",
      });
    }
  }, [company]);

  async function handleLogoUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `logo-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("company-assets").upload(path, file, {
      cacheControl: "3600",
      upsert: true,
    });
    if (!error) {
      const { data } = supabase.storage.from("company-assets").getPublicUrl(path);
      setForm((f) => ({ ...f, logo_url: data.publicUrl }));
    } else {
      alert("อัปโหลดโลโก้ไม่สำเร็จ: " + error.message);
    }
    setUploading(false);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    const payload = {
      company_name: form.company_name,
      address: form.address,
      phone: form.phone,
      tax_id: form.tax_id,
      vat_percent: Number(form.vat_percent) || 0,
      logo_url: form.logo_url,
    };
    if (company?.id) {
      await supabase.from("company_settings").update(payload).eq("id", company.id);
    } else {
      await supabase.from("company_settings").insert(payload);
    }
    setSaving(false);
    setSavedMsg("บันทึกข้อมูลบริษัทแล้ว");
    setTimeout(() => setSavedMsg(""), 2500);
    onSaved && onSaved();
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold text-ink-900">ตั้งค่าบริษัท</h1>
        <p className="text-sm text-ink-700/60">ข้อมูลนี้จะแสดงบนใบเสนอราคา ใบวางบิล และใบเสร็จรับเงิน</p>
      </div>

      <form onSubmit={handleSave} className="card p-5 space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-lg border border-ink-800/10 bg-frost-50 flex items-center justify-center overflow-hidden">
            {form.logo_url ? <img src={form.logo_url} alt="logo" className="w-full h-full object-cover" /> : "🧊"}
          </div>
          <div>
            <label className="btn btn-ghost cursor-pointer">
              {uploading ? "กำลังอัปโหลด..." : "อัปโหลดโลโก้"}
              <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={uploading} />
            </label>
            <p className="text-[11px] text-ink-700/40 mt-1">แนะนำไฟล์ PNG/JPG พื้นหลังโปร่งใส</p>
          </div>
        </div>

        <div>
          <label className="field-label">ชื่อบริษัท/ร้าน *</label>
          <input className="input" value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} required />
        </div>
        <div>
          <label className="field-label">ที่อยู่</label>
          <textarea className="input" rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="field-label">เบอร์โทร</label>
            <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div>
            <label className="field-label">เลขผู้เสียภาษี</label>
            <input className="input" value={form.tax_id} onChange={(e) => setForm({ ...form, tax_id: e.target.value })} />
          </div>
        </div>
        <div>
          <label className="field-label">อัตราภาษีมูลค่าเพิ่ม (VAT %) สำหรับออกเอกสาร</label>
          <input type="number" step="0.01" className="input max-w-[160px]" value={form.vat_percent} onChange={(e) => setForm({ ...form, vat_percent: e.target.value })} />
        </div>
        <div className="flex items-center gap-3 pt-1">
          <button className="btn btn-primary" disabled={saving}>{saving ? "กำลังบันทึก..." : "บันทึก"}</button>
          {savedMsg && <span className="text-sm text-frost-600">{savedMsg}</span>}
        </div>
      </form>
    </div>
  );
}
