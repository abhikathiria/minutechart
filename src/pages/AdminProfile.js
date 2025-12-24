import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { FaUser, FaKey, FaArrowLeft, FaIndustry } from "react-icons/fa";
import { Loader, Loader2, Save, CheckCircle, XCircle } from "lucide-react";
import api from "../api";

// --- Helper Component ---
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
  info = ""
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
      className={`w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${readOnly ? "bg-gray-100 text-gray-600" : "bg-white"
        }`}
    />
    {info && <p className="text-xs text-gray-500 mt-1">{info}</p>}
  </div>
);

export default function AdminProfile() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    companyName: "",
    adminName: "",
    gst: "",
    adminCode: "",
    commissionPercentage: ""
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const returnPath = "/superadmin/user-management";

  useEffect(() => {
    async function loadProfile() {
      try {
        const userRes = await api.get("/admin/users");
        const targetUser = userRes.data.find(u => u.id === id);

        if (!targetUser) {
          setError("Admin not found");
          return;
        }

        const profileRes = await api.get(`/admin/admin/${id}/profile`);
        const data = profileRes.data;

        setForm({
          companyName: data.companyName || targetUser.companyName || "",
          adminName: data.adminName || targetUser.adminName || "",
          gst: data.gst || "",
          adminCode: data.adminCode || "",
          commissionPercentage:
            data.commissionPercentage !== null &&
              data.commissionPercentage !== undefined
              ? String(data.commissionPercentage)
              : ""
        });
      } catch (err) {
        setError(
          err.response?.data?.message || "Failed to load admin profile"
        );
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [id]);

  const onChange = e => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const onSubmit = async e => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const payload = {
        companyName: form.companyName,
        adminName: form.adminName,
        gst: form.gst,
        commissionPercentage:
          form.commissionPercentage === ""
            ? null
            : Number(form.commissionPercentage)
      };

      const res = await api.post(
        `/admin/admin/${id}/profile`,
        payload,
        { withCredentials: true }
      );

      setMessage(res.data?.message || "Profile saved successfully");

      setTimeout(() => {
        navigate(returnPath, { state: { keepFilters: true } });
      }, 1200);
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to save admin profile"
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex items-center gap-2 p-6 bg-[#0a2345] text-white rounded-xl">
          <Loader2 className="animate-spin w-6 h-6" />
          Loading Admin Profile...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6 lg:p-10">
      <div className="max-w-6xl mx-auto">
        {/* Header Section */}
        <header className="bg-white rounded-xl shadow-2xl p-6 mb-8 border-t-4 border-indigo-500">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-extrabold text-gray-800">
                <span className="text-indigo-600">Admin</span> Profile
                Setup
              </h1>
              <p className="text-lg text-gray-500 mt-1">
                Configure details for{" "}
                <span className="font-semibold text-indigo-700">
                  {form.adminName || "Admin"}
                </span>
              </p>
            </div>
            <Link
              // 🎯 FIX 3: Use the dynamic return path
              to={returnPath}
              state={{ keepFilters: true }}
              className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition shadow-md"
            >
              <FaArrowLeft className="w-4 h-4" /> Back
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
                    {form.adminName?.[0]?.toUpperCase() || "A"}
                  </div>
                )}
              </div>

              <h2 className="text-xl font-bold text-gray-800 break-words">
                {form.adminName || "Admin Name"}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Admin Code:{" "}
                <span className="font-mono text-indigo-700 text-sm break-all">
                  {form.adminCode || "N/A"}
                </span>
              </p>
              <p className="text-sm text-gray-500 mt-2 italic">
                {form.adminCode
                  ? "Admin Code generated based on initial details."
                  : "Admin Code will be generated on first save."}
              </p>
            </div>

            {/* Profile Status */}
            <div className="bg-white rounded-xl shadow-xl p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2 border-b pb-2">
                Profile Status
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
                  Save the form to submit the profile details.
                </p>
              )}
            </div>
          </div>

          {/* Right Panel */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-2xl p-8 border border-gray-200">
            <h3 className="text-2xl font-bold text-gray-700 mb-6 border-b pb-2">
              Admin Details
            </h3>

            <form onSubmit={onSubmit} className="space-y-6">
              {/* Admin Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 border-b pb-6">
                <InputGroup
                  label="Company Name"
                  name="companyName"
                  value={form.companyName}
                  onChange={onChange}
                  icon={FaIndustry}
                  required
                />
                <InputGroup
                  label="Admin Name"
                  name="adminName"
                  value={form.adminName}
                  onChange={onChange}
                  icon={FaUser}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 border-b pb-6">
                <InputGroup
                  label="Commission Percentage"
                  name="commissionPercentage"
                  type="number"
                  value={form.commissionPercentage}
                  onChange={onChange}
                  icon={FaKey}
                  placeholder="e.g. 5"
                />
                <InputGroup
                  label="GST"
                  name="gst"
                  value={form.gst}
                  onChange={onChange}
                  icon={FaKey}
                />
              </div>

              <InputGroup
                label="Admin Code"
                name="adminCode"
                value={form.adminCode}
                icon={FaUser}
                readOnly
                info="This value is read-only and generated server-side."
              />

              {/* Submit */}
              <button
                type="submit"
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 transition text-white px-6 py-3 rounded-lg font-bold text-lg shadow-lg hover:shadow-xl disabled:bg-gray-400 disabled:cursor-not-allowed mt-8"
              >
                {saving ? (
                  <>
                    <Loader className="animate-spin w-5 h-5" /> Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" /> Save Profile
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