import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link, useLocation } from "react-router-dom";
import {
  FaDatabase,
  FaServer,
  FaUser,
  FaKey,
  FaClock,
  FaEye,
  FaEyeSlash,
  FaArrowLeft,
  FaIndustry,
} from "react-icons/fa";
import { Loader, Loader2, Save, CheckCircle, XCircle } from "lucide-react";
import api from "../api";

// --- Helper Component for Input Fields ---
const InputGroup = ({
  label,
  name,
  value,
  onChange,
  icon: Icon,
  placeholder,
  required,
  readOnly,
  type = "text",
  info = "",
  ...props
}) => (
  <div>
    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
      <Icon className="w-4 h-4 text-indigo-500" /> {label}
      {required && <span className="text-red-500 text-xs">*</span>}
    </label>
    <input
      name={name}
      type={type}
      value={value}
      onChange={onChange}
      required={required}
      readOnly={readOnly}
      placeholder={placeholder}
      className={`w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none transition duration-150 ${readOnly ? "bg-gray-100 text-gray-600" : "bg-white"
        }`}
      {...props}
    />
    {info && <p className="text-xs text-gray-500 mt-1">{info}</p>}
  </div>
);

// --- Main Component ---
export default function Profile() {
  const { id } = useParams();
  const navigate = useNavigate();

  // State initialization
  const [form, setForm] = useState({
    companyName: "",
    customerName: "",
    shortName: "",
    customerGST: "",
    customerCode: "",
    serverName: "",
    databaseName: "",
    dbUsername: "",
    dbPassword: "",
    refreshTime: 60000,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [tables, setTables] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  const [returnPath, setReturnPath] = useState("/admin/users");

  // --- Data Loading Effect ---
  useEffect(() => {
    async function loadProfile() {
      if (!id) {
        setError("No user selected.");
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // Fetch current viewer's role (Viewer is the logged-in user)
        const viewerRes = await api.get("/account/me");
        const viewerRoles = viewerRes.data?.roles || [];

        // 🎯 FIX 1: Determine the correct return path based on the viewer's role
        if (viewerRoles.includes("SuperAdmin")) {
          setReturnPath("/superadmin/user-management");
        } else {
          setReturnPath("/admin/users");
        }

        // Fetch list of users (to get target user details)
        const userRes = await api.get("/admin/users");
        const users = userRes.data;
        // Use user.id (lowercase) based on confirmed JSON structure
        const targetUser = users.find((u) => u.id === id);

        if (!targetUser) {
          setError("Target user not found.");
          setLoading(false);
          return;
        }

        // Fetch user profile settings
        const profileRes = await api.get(`/admin/user/${id}/profile`);
        const data = profileRes.data;

        setForm({
          companyName: data.companyName || targetUser.companyName || "",
          customerName: data.customerName || targetUser.customerName || "",
          shortName: data.shortName || "",
          customerGST: data.customerGST || "",
          profilePhotoUrl: data.profilePhotoUrl || "",
          customerCode: data.customerCode || targetUser.customerCode || "",
          serverName: data.serverName || "",
          databaseName: data.databaseName || "",
          dbUsername: data.dbUsername || "",
          dbPassword: "",
          refreshTime: data.refreshTime ?? 60000,
        });
      } catch (err) {
        setError(
          "Failed to load profile: " +
          (err.response?.data?.message || err.message)
        );
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [id]);

  // --- Input Change Handler ---
  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // --- Form Submission Handler ---
  const onSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);
    setError(null);
    setTables(null);
    setSaving(true);

    try {
      const payload = {
        companyName: form.companyName,
        customerName: form.customerName,
        shortName: form.shortName,
        customerGST: form.customerGST,
        serverName: form.serverName,
        databaseName: form.databaseName,
        dbUsername: form.dbUsername,
        dbPassword: form.dbPassword,
        refreshTime: Number(form.refreshTime) || 60000,
      };

      const res = await api.post(`/admin/user/${id}/profile`, payload, {
        withCredentials: true,
      });
      const body = res.data;

      setMessage(
        body?.message ?? "Profile saved successfully. Connection validated!"
      );
      if (Array.isArray(body?.tables)) {
        setTables(body.tables);
      }

      // Clear password field after save
      setForm((prev) => ({ ...prev, dbPassword: "" }));

      // Redirect after success
      setTimeout(() => {
        navigate(returnPath, { state: { keepFilters: true } });
      }, 1500);
    } catch (err) {
      const body = err.response?.data;
      const details = body?.details ? ` — ${body.details}` : "";
      setError(
        `${body?.message ?? "Error saving profile or connecting to DB"}${details}`
      );
    } finally {
      setSaving(false);
    }
  };

  // --- Loading State Render ---
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-lg text-white flex items-center gap-2 p-6 bg-[#0a2345] rounded-2xl shadow-lg">
          <Loader2 className="animate-spin w-6 h-6" /> Loading User Database Profile...
        </div>
      </div>
    );
  }

  // --- Main Component Render ---
  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6 lg:p-10">
      <div className="max-w-6xl mx-auto">
        {/* Header Section */}
        <header className="bg-white rounded-xl shadow-2xl p-6 mb-8 border-t-4 border-indigo-500">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-extrabold text-gray-800">
                <span className="text-indigo-600">Database</span> Connection
                Setup
              </h1>
              <p className="text-lg text-gray-500 mt-1">
                Configure connectivity for{" "}
                <span className="font-semibold text-indigo-700">
                  {form.companyName || "User"}
                </span>
              </p>
            </div>
            <Link
              // 🎯 FIX 3: Use the dynamic return path
              to={returnPath}
              state={{ keepFilters: true }}
              className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition shadow-md"
            >
              <FaArrowLeft className="w-4 h-4" /> Back to Users
            </Link>
          </div>
        </header>

        {/* Main Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Panel */}
          <div className="lg:col-span-1 space-y-6">
            {/* User Info */}
            <div className="bg-white rounded-xl shadow-xl p-6 border border-gray-200 text-center">
              <div className="w-24 h-24 mx-auto rounded-full overflow-hidden bg-gray-200 border-4 border-indigo-300 shadow-inner">
                {form.profilePhotoUrl ? (
                  <img
                    src={form.profilePhotoUrl}
                    alt="Profile"
                    className="w-full h-full object-cover"
                    onError={(e) => (e.target.style.display = "none")} // fallback if broken
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-indigo-600 text-4xl font-bold">
                    {form.companyName?.[0]?.toUpperCase() || "C"}
                  </div>
                )}
              </div>

              <h2 className="text-xl font-bold text-gray-800 break-words">
                {form.companyName || "Company Name"}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Customer Code:{" "}
                <span className="font-mono text-indigo-700 text-sm break-all">
                  {form.customerCode || "N/A"}
                </span>
              </p>
              <p className="text-sm text-gray-500 mt-2 italic">
                {form.customerCode
                  ? "Customer Code generated based on initial details."
                  : "Customer Code will be generated on first save."}
              </p>
            </div>

            {/* Connection Status */}
            <div className="bg-white rounded-xl shadow-xl p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2 border-b pb-2">
                Connection Status
              </h3>

              {message && (
                <div className="text-green-700 bg-green-50 p-3 rounded-lg border border-green-200 flex items-center gap-2 font-medium mb-3">
                  <CheckCircle className="w-5 h-5 flex-shrink-0" />
                  <span className="text-sm">{message}</span>
                </div>
              )}

              {error && (
                <div className="text-red-700 bg-red-50 p-3 rounded-lg border border-red-200 flex items-start gap-2 font-medium mb-3">
                  <XCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <span className="text-sm break-words">{error}</span>
                </div>
              )}

              {!message && !error && (
                <p className="text-sm text-gray-500 italic">
                  Save the form to test the database connection and view status
                  here.
                </p>
              )}

              {tables?.length > 0 && (
                <div className="mt-4 border-t pt-4">
                  <h4 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <FaDatabase className="w-4 h-4 text-indigo-500" /> Found
                    Sample Tables
                  </h4>
                  <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-1 bg-gray-50 rounded-lg">
                    {tables.map((t, i) => (
                      <span
                        key={i}
                        className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium whitespace-nowrap"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Panel */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-2xl p-8 border border-gray-200">
            <h3 className="text-2xl font-bold text-gray-700 mb-6 border-b pb-2">
              Connection & Customer Details
            </h3>

            <form onSubmit={onSubmit} className="space-y-6">
              {/* Customer Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 border-b pb-6">
                <InputGroup
                  label="Company Name"
                  name="companyName"
                  value={form.companyName}
                  onChange={onChange}
                  icon={FaIndustry}
                  placeholder="Company Name"
                  required
                  info="This name is used for logging and Customer Code generation."
                />
                <InputGroup
                  label="Customer Name"
                  name="customerName"
                  value={form.customerName}
                  onChange={onChange}
                  icon={FaUser}
                  placeholder="Customer Name"
                  required
                  info="This name is used for Customer Code generation."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 border-b pb-6">
                <InputGroup
                  label="Short Name (SQL Key)"
                  name="shortName"
                  value={form.shortName}
                  onChange={onChange}
                  icon={FaKey}
                  placeholder="e.g. MCMSL"
                  info="Used in SQL queries as {{SHORTNAME}}."
                />

                <InputGroup
                  label="Customer GST"
                  name="customerGST"
                  value={form.customerGST}
                  onChange={onChange}
                  icon={FaKey}
                  placeholder="Customer GST"
                />
              </div>

              <InputGroup
                label="Customer Code"
                name="customerCode"
                value={form.customerCode}
                icon={FaUser}
                readOnly
                info="This value is read-only and generated server-side."
              />


              {/* Server Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 border-b pb-6">
                <InputGroup
                  label="Server / Host"
                  name="serverName"
                  value={form.serverName}
                  onChange={onChange}
                  icon={FaServer}
                  required
                  placeholder="e.g., 192.168.1.10:1433 or server\\instance"
                />
                <InputGroup
                  label="Database Name"
                  name="databaseName"
                  value={form.databaseName}
                  onChange={onChange}
                  icon={FaDatabase}
                  required
                  placeholder="Client database name"
                />
              </div>

              {/* DB Auth */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 border-b pb-6">
                <InputGroup
                  label="DB Username"
                  name="dbUsername"
                  value={form.dbUsername}
                  onChange={onChange}
                  icon={FaUser}
                  required
                  placeholder="Database connection username"
                />

                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                    <FaKey className="w-4 h-4 text-indigo-500" /> DB Password
                    <span className="text-xs text-gray-40">
                      (required only if DB details change)
                    </span>
                  </label>
                  <div className="relative">
                    <input
                      name="dbPassword"
                      type={showPassword ? "text" : "password"}
                      value={form.dbPassword}
                      onChange={onChange}
                      // required
                      placeholder="DB password"
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-0 top-0 h-full px-3 text-gray-400 hover:text-indigo-600 transition flex items-center"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 transition text-white px-6 py-3 rounded-lg font-bold text-lg shadow-lg hover:shadow-xl disabled:bg-gray-400 disabled:cursor-not-allowed mt-8"
              >
                {saving ? (
                  <>
                    <Loader className="animate-spin w-5 h-5" /> Saving & Testing...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" /> Save & Test Connection
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
