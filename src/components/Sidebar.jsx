import React from "react";
import { NavLink } from "react-router-dom";
import { supabase } from "../supabaseClient";

const links = [
  { to: "/", label: "ภาพรวม", icon: "📊" },
  { to: "/sales", label: "บันทึกการขาย", icon: "🧊" },
  { to: "/expenses", label: "ค่าใช้จ่าย/เบิกเงิน", icon: "💸" },
  { to: "/reports", label: "รายงานสรุป", icon: "📈" },
  { to: "/documents", label: "ใบเสนอราคา/บิล/ใบเสร็จ", icon: "📄" },
  { to: "/customers", label: "ลูกค้า/ร้านค้า", icon: "🏪" },
  { to: "/branches", label: "สาขา", icon: "🏢" },
  { to: "/ice-types", label: "ประเภทน้ำแข็ง", icon: "🧾" },
  { to: "/settings", label: "ตั้งค่าบริษัท", icon: "⚙️" },
];

export default function Sidebar({ companyName, logoUrl, open, onClose }) {
  return (
    <>
      {open && (
        <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={onClose} />
      )}
      <aside
        className={`fixed lg:static z-40 top-0 left-0 h-full w-64 bg-ink-950 text-frost-100 flex flex-col transition-transform duration-200 ${
          open ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0`}
      >
        <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
          {logoUrl ? (
            <img src={logoUrl} alt="logo" className="w-9 h-9 rounded-md object-cover bg-white" />
          ) : (
            <div className="w-9 h-9 rounded-md bg-frost-500 flex items-center justify-center text-lg">🧊</div>
          )}
          <div className="leading-tight">
            <div className="font-semibold text-sm truncate max-w-[150px]">{companyName || "ระบบน้ำแข็ง"}</div>
            <div className="text-[11px] text-frost-300">ระบบจัดการยอดขาย</div>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto py-3">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-5 py-2.5 text-sm mx-2 rounded-lg mb-0.5 ${
                  isActive
                    ? "bg-frost-600/90 text-white font-medium"
                    : "text-frost-200/90 hover:bg-white/5"
                }`
              }
            >
              <span>{l.icon}</span>
              <span>{l.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-white/10">
          <button
            onClick={() => supabase.auth.signOut()}
            className="btn btn-ghost w-full justify-center !text-frost-100 !border-white/15 hover:!bg-white/5"
          >
            ออกจากระบบ
          </button>
        </div>
      </aside>
    </>
  );
}
