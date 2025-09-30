import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { FaDatabase, FaServer, FaUser, FaKey, FaClock } from "react-icons/fa";
import api from "../api";

export default function Profile() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    serverName: "",
    databaseName: "",
    dbUsername: "",
    dbPassword: "",
    refreshTime: 60000,
  });

  const [companyName, setCompanyName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [tables, setTables] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      if (!id) {
        setError("No user selected.");
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const userRes = await api.get("/admin/users");
        const users = userRes.data;
        const targetUser = users.find((u) => u.id === id);
        if (targetUser) {
          setCompanyName(targetUser.companyName || "");
        }

        const profileRes = await api.get(`/admin/user/${id}/profile`);
        const data = profileRes.data;

        setForm({
          companyName: data.companyName || targetUser.companyName || "",
          serverName: data.serverName || "",
          databaseName: data.databaseName || "",
          dbUsername: data.dbUsername || "",
          dbPassword: "",
          refreshTime: data.refreshTime ?? 60000,
        });
      } catch (err) {
        setError("Failed to load profile: " + (err.response?.data?.message || err.message));
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [id]);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);
    setError(null);
    setTables(null);
    setSaving(true);

    try {
      const payload = {
        companyName: form.companyName,
        serverName: form.serverName,
        databaseName: form.databaseName,
        dbUsername: form.dbUsername,
        dbPassword: form.dbPassword,
        refreshTime: Number(form.refreshTime) || 60000,
      };

      const res = await api.post(`/admin/user/${id}/profile`, payload);
      const body = res.data;

      setMessage(body?.message ?? "Profile saved successfully.");
      if (Array.isArray(body?.tables)) {
        setTables(body.tables);
      }
      setForm((prev) => ({ ...prev, dbPassword: "" }));

      setTimeout(() => {
        navigate("/admin/users");
      }, 1500);
    } catch (err) {
      const body = err.response?.data;
      const details = body?.details ? ` — ${body.details}` : "";
      setError(`${body?.message ?? "Error saving profile"}${details}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100">
        <div className="animate-pulse text-gray-600">Loading profile…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 py-12 px-4">
      {/* Top header */}
      <div className="max-w-4xl mx-auto bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl shadow-lg text-white p-6 mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Profile Setup</h1>
          <p className="text-sm opacity-90">Database settings for {companyName}</p>
        </div>
        <Link
          to="/admin/users"
          className="px-4 py-2 bg-white text-indigo-700 rounded-lg font-semibold hover:bg-gray-100 transition"
        >
          ⬅ Back to Users
        </Link>
      </div>
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden grid grid-cols-1 md:grid-cols-3">
        {/* Left Profile Panel */}
        <div className="bg-gradient-to-br from-indigo-600 to-purple-600 text-white p-6 flex flex-col justify-center items-center">
          <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center text-3xl font-bold mb-4">
            {companyName?.[0] || "C"}
          </div>
          <h2 className="text-lg font-semibold">{companyName || "Company"}</h2>
          <p className="text-sm text-white/80">Database Connection Profile</p>
        </div>

        {/* Right Form */}
        <div className="md:col-span-2 p-8">
          {message && (
            <div className="mb-4 text-green-800 bg-green-100 p-3 rounded-lg border border-green-200">
              {message}
            </div>
          )}
          {error && (
            <div className="mb-4 text-red-800 bg-red-100 p-3 rounded-lg border border-red-200">
              {error}
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-5">
            {/* Server */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                <FaServer /> Server / Host
              </label>
              <input
                name="serverName"
                value={form.serverName}
                onChange={onChange}
                required
                placeholder="192.168.1.10,1433 or server\\instance"
                className="w-full border rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            {/* Database */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                <FaDatabase /> Database Name
              </label>
              <input
                name="databaseName"
                value={form.databaseName}
                onChange={onChange}
                required
                placeholder="Client database name"
                className="w-full border rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            {/* Username */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                <FaUser /> DB Username
              </label>
              <input
                name="dbUsername"
                value={form.dbUsername}
                onChange={onChange}
                required
                placeholder="DB username"
                className="w-full border rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            {/* Password */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                <FaKey /> DB Password
              </label>
              <div className="relative">
                <input
                  name="dbPassword"
                  type={showPassword ? "text" : "password"}
                  value={form.dbPassword}
                  onChange={onChange}
                  placeholder="DB password"
                  className="w-full border rounded-xl px-4 py-2 pr-16 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-4 top-2 text-sm text-indigo-600 hover:underline"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {/* Refresh Time */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                <FaClock /> Refresh Time (ms)
              </label>
              <input
                name="refreshTime"
                type="number"
                min="60000"
                value={form.refreshTime}
                onChange={onChange}
                className="w-full border rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
              <p className="text-xs text-gray-500 mt-1">
                Minimum recommended 60000 (60 seconds).
              </p>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="bg-indigo-600 hover:bg-indigo-700 transition text-white px-6 py-2 rounded-xl font-semibold shadow"
            >
              {saving ? "Saving…" : "Save & Test Connection"}
            </button>
          </form>

          {tables?.length > 0 && (
            <div className="mt-8">
              <h3 className="font-semibold mb-3 text-gray-800">
                Sample Tables
              </h3>
              <div className="flex flex-wrap gap-2">
                {tables.map((t, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-sm font-medium"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
