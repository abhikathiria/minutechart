import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import {
  FaBuilding,
  FaFileInvoiceDollar,
  FaIdBadge,
  FaSave,
  FaSpinner,
} from "react-icons/fa";
import { motion } from "framer-motion";

export default function MyProfile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    async function loadMyProfile() {
      try {
        const res = await api.get("/account/my-profile");
        setProfile(res.data);
      } catch (err) {
        setError("Failed to load profile. Please ensure you are logged in.");
      } finally {
        setLoading(false);
      }
    }

    loadMyProfile();
  }, []);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await api.put("/account/save-profile", {
        companyName: profile.companyName,
        customerName: profile.customerName,
        gst: profile.customerGST,
      });
      setSuccess("Profile updated successfully.");
    } catch (err) {
      setError("Failed to save changes. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-purple-50 to-indigo-50">
        <div className="text-lg text-gray-700 animate-pulse">Loading Your Profile...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-red-50 text-red-700 p-6 rounded-xl shadow-lg">
        <p className="text-center font-semibold">{error}</p>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 py-12 px-4 sm:px-6">
      <motion.div
        className="max-w-3xl mx-auto"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl shadow-lg text-white p-6 sm:p-8 mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">My Profile</h1>
            <p className="text-base opacity-90 mt-1">Update your company and customer details below.</p>
          </div>
          <Link
            to="/dashboard"
            className="px-6 py-2 bg-white text-indigo-700 rounded-xl font-semibold hover:bg-gray-100 transition shadow-md flex items-center gap-2"
          >
            ⬅ Dashboard
          </Link>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Summary Header */}
          <div className="bg-gradient-to-br from-indigo-500 to-purple-500 text-white p-6 sm:p-8 flex items-center gap-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white/20 flex items-center justify-center text-3xl sm:text-4xl font-extrabold border-4 border-white/50">
              {profile.companyName?.[0]?.toUpperCase() || "C"}
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold mb-0 leading-tight">{profile.companyName || "Your Company"}</h2>
              <p className="text-sm text-white/80">Company Profile</p>
            </div>
          </div>

          {/* Editable Form */}
          <div className="p-6 sm:p-8 space-y-6">
            {success && <p className="text-green-600 font-medium">{success}</p>}
            {error && <p className="text-red-600 font-medium">{error}</p>}

            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-1 flex items-center gap-2">
                <FaBuilding /> Company Name
              </label>
              <input
                type="text"
                className="w-full border rounded-lg p-3 text-gray-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                value={profile.companyName || ""}
                onChange={(e) => setProfile({ ...profile, companyName: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-1 flex items-center gap-2">
                <FaIdBadge /> Customer Name
              </label>
              <input
                type="text"
                className="w-full border rounded-lg p-3 text-gray-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                value={profile.customerName || ""}
                onChange={(e) => setProfile({ ...profile, customerName: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-1 flex items-center gap-2">
                <FaFileInvoiceDollar /> GST Number
              </label>
              <input
                type="text"
                className="w-full border rounded-lg p-3 text-gray-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                value={profile.customerGST || ""}
                onChange={(e) => setProfile({ ...profile, customerGST: e.target.value })}
              />
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-indigo-700 transition disabled:opacity-60"
              >
                {saving ? <FaSpinner className="animate-spin" /> : <FaSave />}
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
