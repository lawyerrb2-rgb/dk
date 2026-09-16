import React, { useState } from "react";
import { supabase } from "../supabaseClient";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) setError("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-ink-950 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🧊</div>
          <h1 className="text-white text-xl font-semibold">ระบบจัดการยอดขายน้ำแข็ง</h1>
          <p className="text-frost-200 text-sm mt-1">เข้าสู่ระบบเพื่อเริ่มใช้งาน</p>
        </div>
        <form onSubmit={handleLogin} className="card p-6 space-y-4">
          <div>
            <label className="field-label">อีเมล</label>
            <input
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div>
            <label className="field-label">รหัสผ่าน</label>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <p className="text-sm text-clay-600">{error}</p>}
          <button className="btn btn-primary w-full justify-center" disabled={loading}>
            {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
          </button>
          <p className="text-xs text-ink-700/60 text-center pt-1">
            ยังไม่มีบัญชี? ให้ผู้ดูแลระบบสร้างผู้ใช้ให้ใน Supabase Auth
          </p>
        </form>
      </div>
    </div>
  );
}
