"use client";

import { FormEvent, useEffect, useState } from "react";

type UserRow = {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    email: "",
    name: "",
    password: "Demo123!",
    role: "TL",
  });

  async function load() {
    const res = await fetch("/api/admin/users");
    const body = await res.json();
    if (!res.ok) {
      setError(body.error || "Failed to load users");
      return;
    }
    setUsers(body.users);
  }

  useEffect(() => {
    void load();
  }, []);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const body = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(body.error || "Create failed");
      return;
    }
    setMessage(`Created ${body.user.email}`);
    setForm({ email: "", name: "", password: "Demo123!", role: "TL" });
    await load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Users</h1>
        <p className="text-sm text-muted">ADMIN only — create TL / QA logins</p>
      </div>

      <form
        onSubmit={onCreate}
        className="grid gap-3 rounded-xl border border-line bg-panel p-4 md:grid-cols-2"
      >
        <h2 className="md:col-span-2 text-sm font-semibold uppercase text-muted">
          Create user
        </h2>
        <input
          required
          placeholder="Email"
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className="rounded-lg border border-line bg-[#12181f] px-3 py-2"
        />
        <input
          required
          placeholder="Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="rounded-lg border border-line bg-[#12181f] px-3 py-2"
        />
        <input
          required
          placeholder="Password"
          type="password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          className="rounded-lg border border-line bg-[#12181f] px-3 py-2"
        />
        <select
          value={form.role}
          onChange={(e) => setForm({ ...form, role: e.target.value })}
          className="rounded-lg border border-line bg-[#12181f] px-3 py-2"
        >
          <option value="TL">TL</option>
          <option value="QA">QA</option>
          <option value="ADMIN">ADMIN</option>
        </select>
        <button
          type="submit"
          disabled={busy}
          className="md:col-span-2 rounded-lg bg-accent py-2 font-semibold text-[#041018]"
        >
          {busy ? "Creating…" : "Create user"}
        </button>
        {error && <p className="md:col-span-2 text-sm text-fail">{error}</p>}
        {message && <p className="md:col-span-2 text-sm text-pass">{message}</p>}
      </form>

      <div className="overflow-hidden rounded-xl border border-line bg-panel">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line text-xs uppercase text-muted">
            <tr>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Created</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-line/60">
                <td className="px-4 py-3">{u.email}</td>
                <td className="px-4 py-3 text-muted">{u.name}</td>
                <td className="px-4 py-3">{u.role}</td>
                <td className="px-4 py-3 text-muted">
                  {new Date(u.createdAt).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
