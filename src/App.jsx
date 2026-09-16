import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { supabase } from "./supabaseClient";
import Sidebar from "./components/Sidebar";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Sales from "./pages/Sales";
import Expenses from "./pages/Expenses";
import Reports from "./pages/Reports";
import Documents from "./pages/Documents";
import PrintDocument from "./pages/PrintDocument";
import Customers from "./pages/Customers";
import Branches from "./pages/Branches";
import IceTypes from "./pages/IceTypes";
import Settings from "./pages/Settings";

export default function App() {
  const [session, setSession] = useState(undefined); // undefined = loading
  const [company, setCompany] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function loadCompany() {
    const { data } = await supabase.from("company_settings").select("*").limit(1).maybeSingle();
    setCompany(data || null);
  }

  useEffect(() => {
    if (session) loadCompany();
  }, [session]);

  if (session === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center text-ink-700">
        กำลังโหลด...
      </div>
    );
  }

  if (!session) return <Login />;

  return <AuthedApp company={company} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} loadCompany={loadCompany} />;
}

function AuthedApp({ company, sidebarOpen, setSidebarOpen, loadCompany }) {
  const location = useLocation();
  const isPrintRoute = location.pathname.startsWith("/print/");

  if (isPrintRoute) {
    return (
      <Routes>
        <Route path="/print/:id" element={<PrintDocument company={company} />} />
      </Routes>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar
        companyName={company?.company_name}
        logoUrl={company?.logo_url}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-ink-800/10 sticky top-0 z-20">
          <button className="btn btn-ghost !px-2 !py-1.5" onClick={() => setSidebarOpen(true)}>
            ☰
          </button>
          <span className="font-medium text-sm">{company?.company_name || "ระบบน้ำแข็ง"}</span>
        </header>
        <main className="flex-1 p-4 lg:p-8 max-w-[1400px] w-full mx-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/sales" element={<Sales />} />
            <Route path="/expenses" element={<Expenses />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/documents" element={<Documents company={company} />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/branches" element={<Branches />} />
            <Route path="/ice-types" element={<IceTypes />} />
            <Route path="/settings" element={<Settings company={company} onSaved={loadCompany} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
