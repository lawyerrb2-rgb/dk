import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { DOC_TYPES, formatMoney } from "../utils/docTypes";

export default function PrintDocument({ company }) {
  const { id } = useParams();
  const [doc, setDoc] = useState(null);
  const [branch, setBranch] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data } = await supabase.from("sales_documents").select("*, branches(name,address,phone)").eq("id", id).maybeSingle();
      setDoc(data);
      setBranch(data?.branches || null);
      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) return <div className="p-10 text-center text-ink-700/50">กำลังโหลด...</div>;
  if (!doc) return <div className="p-10 text-center text-ink-700/50">ไม่พบเอกสาร</div>;

  const meta = DOC_TYPES[doc.doc_type];
  const cust = doc.customer_snapshot || {};

  return (
    <div className="min-h-screen bg-ink-950/5 py-6 print:bg-white print:py-0">
      <div className="max-w-[210mm] mx-auto mb-4 flex justify-end gap-2 print:hidden px-4">
        <button className="btn btn-primary" onClick={() => window.print()}>🖨️ พิมพ์ / บันทึกเป็น PDF</button>
      </div>

      <div className="doc-page max-w-[210mm] mx-auto bg-white p-10 shadow-panel print:shadow-none">
        <div className="flex items-start justify-between border-b-2 border-ink-900 pb-4 mb-6">
          <div className="flex items-center gap-3">
            {company?.logo_url ? (
              <img src={company.logo_url} alt="logo" className="w-14 h-14 object-cover rounded" />
            ) : (
              <div className="w-14 h-14 rounded bg-frost-100 flex items-center justify-center text-2xl">🧊</div>
            )}
            <div>
              <div className="font-semibold text-lg text-ink-900">{company?.company_name || "ชื่อบริษัท/ร้าน"}</div>
              <div className="text-xs text-ink-700/70 max-w-[280px]">{company?.address}</div>
              <div className="text-xs text-ink-700/70">
                {company?.phone && <>โทร. {company.phone} </>}
                {company?.tax_id && <>เลขผู้เสียภาษี {company.tax_id}</>}
              </div>
              {branch?.name && <div className="text-xs text-frost-600 mt-0.5">สาขา: {branch.name}</div>}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xl font-bold text-ink-900">{meta?.label}</div>
            <div className="text-sm text-ink-700/70 mt-1">เลขที่: <b>{doc.doc_number}</b></div>
            <div className="text-sm text-ink-700/70">วันที่: {doc.doc_date}</div>
            {doc.due_date && <div className="text-sm text-ink-700/70">ครบกำหนด: {doc.due_date}</div>}
            {doc.ref_doc_number && <div className="text-sm text-ink-700/70">อ้างอิง: {doc.ref_doc_number}</div>}
          </div>
        </div>

        <div className="mb-6">
          <div className="text-xs text-ink-700/50 mb-1">ลูกค้า / ร้านค้า</div>
          <div className="font-medium text-ink-900">{cust.name || "-"}</div>
          {cust.contact_name && <div className="text-sm text-ink-700/70">ผู้ติดต่อ: {cust.contact_name}</div>}
          {cust.address && <div className="text-sm text-ink-700/70">{cust.address}</div>}
          <div className="text-sm text-ink-700/70">
            {cust.phone && <>โทร. {cust.phone} </>}
            {cust.tax_id && <>เลขผู้เสียภาษี {cust.tax_id}</>}
          </div>
        </div>

        <table className="w-full text-sm mb-6 border-collapse">
          <thead>
            <tr className="bg-frost-50 text-ink-900">
              <th className="text-left py-2 px-3 border border-ink-800/10">รายการ</th>
              <th className="text-right py-2 px-3 border border-ink-800/10 w-20">จำนวน</th>
              <th className="text-center py-2 px-3 border border-ink-800/10 w-16">หน่วย</th>
              <th className="text-right py-2 px-3 border border-ink-800/10 w-28">ราคา/หน่วย</th>
              <th className="text-right py-2 px-3 border border-ink-800/10 w-28">จำนวนเงิน</th>
            </tr>
          </thead>
          <tbody>
            {(doc.items || []).map((it, i) => (
              <tr key={i}>
                <td className="py-2 px-3 border border-ink-800/10">{it.description}</td>
                <td className="py-2 px-3 border border-ink-800/10 text-right">{it.quantity}</td>
                <td className="py-2 px-3 border border-ink-800/10 text-center">{it.unit}</td>
                <td className="py-2 px-3 border border-ink-800/10 text-right">{formatMoney(it.unit_price)}</td>
                <td className="py-2 px-3 border border-ink-800/10 text-right">{formatMoney(it.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-end">
          <div className="w-64 text-sm space-y-1">
            <div className="flex justify-between"><span className="text-ink-700/60">ยอดรวม</span><span>{formatMoney(doc.subtotal)}</span></div>
            {Number(doc.discount) > 0 && (
              <div className="flex justify-between"><span className="text-ink-700/60">ส่วนลด</span><span>-{formatMoney(doc.discount)}</span></div>
            )}
            <div className="flex justify-between"><span className="text-ink-700/60">ภาษีมูลค่าเพิ่ม ({doc.vat_percent}%)</span><span>{formatMoney(doc.vat_amount)}</span></div>
            <div className="flex justify-between font-bold text-base border-t-2 border-ink-900 pt-2 mt-1">
              <span>รวมสุทธิ</span><span>{formatMoney(doc.grand_total)} บาท</span>
            </div>
          </div>
        </div>

        {doc.note && (
          <div className="mt-6 text-sm">
            <div className="text-ink-700/50 mb-1">หมายเหตุ</div>
            <div className="text-ink-900">{doc.note}</div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-8 mt-16 text-sm text-center">
          <div>
            <div className="border-b border-ink-700/30 h-12" />
            <div className="mt-1 text-ink-700/60">ผู้จัดทำเอกสาร</div>
          </div>
          <div>
            <div className="border-b border-ink-700/30 h-12" />
            <div className="mt-1 text-ink-700/60">
              {doc.doc_type === "receipt" ? "ผู้รับเงิน" : "ผู้อนุมัติ / ลูกค้า"}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          @page { size: A4; margin: 12mm; }
          body { background: white; }
          .doc-page { box-shadow: none !important; padding: 0 !important; }
        }
      `}</style>
    </div>
  );
}
