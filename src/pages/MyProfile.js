// src/pages/MyProfile.jsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import {
  FaBuilding,
  FaFileInvoiceDollar,
  FaPhone,
  FaIdBadge,
  FaSave,
  FaSpinner,
  FaCalendarAlt,
  FaHistory,
  FaChevronDown,
  FaChevronUp,
} from "react-icons/fa";
import { CheckCircle2, TrendingUp, IndianRupee, Clock, User, Briefcase, FileText } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-hot-toast";

// --- Active Subscription Component (Redesigned) ---
const ActiveSubscriptionBlock = ({ status, onRefresh }) => {
  const [showHistory, setShowHistory] = useState(false);

  // No Active Subscription State
  if (!status || !status.hasActivePlan || status.totalDaysRemaining <= 0) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="p-6 bg-red-900/40 border border-red-600/50 text-red-300 rounded-xl shadow-lg flex flex-col items-center justify-center text-center space-y-4 h-full min-h-[200px]"
      >
        <Clock className="w-8 h-8 text-red-400" />
        <p className="font-bold text-xl">No Active Subscription</p>
        <p className="text-sm">Please view plans to continue using our services.</p>
        <Link
          to="/subscription/buy"
          className="px-6 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-500 transition shadow-xl mt-4"
        >
          View Plans
        </Link>
      </motion.div>
    );
  }

  const { activePlans, totalDaysRemaining } = status;

  // Data Filtering for History
  const allPlans = activePlans || [];
  const activePlansFiltered = allPlans.filter(p => p.remainingDays > 0);
  const now = new Date().getTime();
  const futurePlans = allPlans.filter(p => new Date(p.subscriptionStart).getTime() > now);
  const expiredPlans = allPlans.filter(p => p.remainingDays <= 0 && new Date(p.subscriptionEnd).getTime() < now);
  const historyCount = expiredPlans.length + futurePlans.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-blue-500/50 overflow-hidden"
    >
      {/* Summary Header */}
      <div className="bg-blue-600/90 text-white p-6 flex flex-col items-start justify-between">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="w-6 h-6" />
          <h2 className="text-xl font-extrabold tracking-wide">Active Subscription</h2>
        </div>
        <div className="mt-4 bg-white text-gray-900 px-4 py-2 rounded-lg shadow-md">
          <span className="text-xl font-extrabold">Total Days Remaining: {totalDaysRemaining}</span>
        </div>
      </div>

      {/* List of Active Plans */}
      <div className="p-6">
        <h3 className="text-lg font-semibold text-gray-300 mb-3 border-b border-gray-700 pb-2">Currently Active Plans ({activePlansFiltered.length})</h3>
        <div className="max-h-64 overflow-y-auto pr-2 custom-scrollbar space-y-3">
          {activePlansFiltered
            .sort((a, b) => new Date(a.subscriptionEnd) - new Date(b.subscriptionEnd))
            .map((plan, idx) => {
              const total = plan.totalDays;
              const remaining = plan.remainingDays;
              const percentElapsed = Math.min((1 - (remaining / total)) * 100, 100);

              return (
                <div key={idx} className="p-3 rounded-lg bg-gray-900/50 shadow-inner border border-blue-600/30">
                  <div className="flex justify-between items-center text-sm font-semibold text-white">
                    <span className="flex items-center gap-2 text-blue-300">
                      <TrendingUp className="w-4 h-4" /> <span className="font-bold">{plan.name}</span>
                    </span>
                    <span className="text-right text-base">{remaining} {remaining === 1 ? "day" : "days"} left</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <FaCalendarAlt size={10} className="text-blue-400" /> Ends: {new Date(plan.subscriptionEnd).toLocaleDateString()}
                    </span>
                    <span className="text-blue-400 font-medium">Progress:</span>
                  </p>
                  <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all duration-1000"
                      style={{ width: `${percentElapsed}%` }}
                    />
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* History Toggle */}
      <div className="p-6 border-t border-gray-700">
        <button
          onClick={() => setShowHistory(p => !p)}
          className="w-full p-3 bg-gray-700 rounded-xl text-white font-semibold flex justify-between items-center hover:bg-gray-700/80 transition shadow-md"
        >
          <span className="flex items-center gap-2">
            <FaHistory size={16} className="text-blue-300" /> Purchase History ({historyCount} records)
          </span>
          {showHistory ? <FaChevronUp size={12} /> : <FaChevronDown size={12} />}
        </button>

        <AnimatePresence>
          {showHistory && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="mt-3 p-4 bg-gray-900/70 border border-gray-700 rounded-xl shadow-inner space-y-3 max-h-64 overflow-y-auto custom-scrollbar"
            >
              {futurePlans.length > 0 && (
                <div className="border-b border-gray-700 pb-2">
                  <h4 className="font-bold text-sm text-indigo-400 mb-1">Future Plans ({futurePlans.length})</h4>
                  {futurePlans.map((p, idx) => <p key={idx} className="text-xs text-gray-400">Starts {new Date(p.subscriptionStart).toLocaleDateString()} - <span className="font-semibold text-white">{p.name}</span></p>)}
                </div>
              )}
              {expiredPlans.length > 0 && (
                <div>
                  <h4 className="font-bold text-sm text-red-400 mb-1">Expired Plans ({expiredPlans.length})</h4>
                  {expiredPlans.map((p, idx) => <p key={idx} className="text-xs text-gray-400">Ended {new Date(p.subscriptionEnd).toLocaleDateString()} - <span className="font-semibold text-white">{p.name}</span></p>)}
                </div>
              )}
              {historyCount === 0 && <p className="text-sm text-gray-500">No expired or future purchase records found.</p>}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="p-4 border-t border-gray-700 bg-gray-900/50">
        <button
          onClick={onRefresh}
          className="text-xs text-gray-400 hover:text-blue-300 transition flex items-center mx-auto font-medium"
        >
          <Clock className="w-3 h-3 mr-1" /> Refresh Subscription Status
        </button>
      </div>
    </motion.div>
  );
};

// --- Main Component (Redesigned) ---
export default function MyProfile() {
  const [profile, setProfile] = useState(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [photoFile, setPhotoFile] = useState(null); // New state for holding the selected file
  const [uploadingPhoto, setUploadingPhoto] = useState(false); // New state for upload status

  // NEW FUNCTION: Handle File Selection
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhotoFile(file);
      // Optional: Automatically trigger upload, or wait for a new "Upload Photo" button click
      handlePhotoUpload(file);
    }
  };

  // NEW FUNCTION: Handle Photo Upload (Requires C# Backend Endpoint)
  const handlePhotoUpload = async (file) => {
    if (!file) return;

    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append("file", file); // Must match the name expected by the C# controller action

      // *** A NEW BACKEND ENDPOINT IS REQUIRED HERE ***
      const response = await api.post("/account/upload-profile-photo", formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // Assume the backend returns the new photo URL
      setProfile(prev => ({
        ...prev,
        profilePhotoUrl: response.data.newUrl // Update the displayed photo immediately
      }));
      setPhotoFile(null);
      toast.success("Photo uploaded successfully!");

    } catch (err) {
      console.error("Photo upload failed:", err);
      toast.error("Failed to upload photo.");
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Function to load both profile and subscription status
  const loadData = async () => {
    setLoading(true);
    try {
      // Fetch Profile
      const profileRes = await api.get("/account/my-profile");
      setProfile(profileRes.data);

      // Fetch Subscription Status
      await loadSubscriptionStatus();

    } catch (err) {
      setError("Failed to load profile. Please ensure you are logged in.");
      toast.error("Failed to load profile data.");
    } finally {
      setLoading(false);
    }
  };

  const loadSubscriptionStatus = async () => {
    setLoadingStatus(true);
    try {
      const subRes = await api.get("/user/subscription-status");
      setSubscriptionStatus(subRes.data);
    } catch (err) {
      console.error("Failed to fetch subscription status", err);
      setSubscriptionStatus({ hasActivePlan: false, activePlans: [], totalDaysRemaining: 0 });
    } finally {
      setLoadingStatus(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await api.put("/account/save-profile", {
        companyName: profile.companyName,
        customerName: profile.customerName,
        phoneNumber: profile.phoneNumber,
        gst: profile.customerGST,
      });
      setSuccess("Profile updated successfully.");
      toast.success("Profile saved!");
    } catch (err) {
      setError("Failed to save changes. Please try again.");
      toast.error("Failed to save profile.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0d1117]">
        <div className="text-xl text-blue-400 font-medium flex items-center gap-2">
          <FaSpinner className="animate-spin w-6 h-6" /> Loading Your Profile...
        </div>
      </div>
    );
  }

  if (error && !profile) { // If initial profile load fails entirely
    return (
      <div className="flex items-center justify-center min-h-screen bg-red-900/40 text-red-400 p-6">
        <p className="text-center font-semibold text-lg">{error}</p>
      </div>
    );
  }

  if (!profile) return null; // Should not happen with current logic but good guard

  return (
    <div className="min-h-screen bg-[#0d1117] text-white py-10 px-4 sm:px-6 lg:px-8">
      <motion.div
        className="max-w-7xl mx-auto"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header */}
        <div className="bg-gray-800 rounded-xl shadow-2xl shadow-gray-900/50 p-6 sm:p-8 mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-l-4 border-blue-600">
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold flex items-center gap-3 text-blue-400">
              <User className="w-8 h-8" /> Account & Billing
            </h1>
            <p className="text-base text-gray-400 mt-2">Manage your profile details and monitor your subscription status.</p>
          </div>
          <Link
            to="/dashboard"
            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition shadow-lg flex items-center gap-2 whitespace-nowrap"
          >
            Dashboard ➔
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Column 2: Profile Edit Form (Takes 2/3) */}
          <div className="lg:col-span-2">
            <h2 className="text-xl font-bold mb-4 text-blue-300 border-b border-gray-700 pb-2">Profile Details</h2>
            <div className="bg-gray-800 rounded-2xl shadow-2xl overflow-hidden border border-gray-700">

              {/* Summary Header - Enhanced */}
              <div className="bg-gray-900 text-white p-6 sm:p-8 flex items-center gap-4 border-b border-gray-700">
                <label htmlFor="photo-upload" className="relative cursor-pointer group">
                  {/* The visible profile photo / initial block */}
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-blue-600 flex items-center justify-center text-xl sm:text-2xl font-extrabold text-white shadow-xl overflow-hidden transition duration-300 transform group-hover:scale-105">
                    {profile.profilePhotoUrl ? (
                      <img
                        src={profile.profilePhotoUrl}
                        alt={`${profile.companyName}'s profile`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      profile.companyName?.[0]?.toUpperCase() || <Briefcase />
                    )}
                  </div>

                  {/* Overlay for interaction */}
                  <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    {uploadingPhoto ? (
                      <FaSpinner className="animate-spin w-6 h-6 text-white" />
                    ) : (
                      <span className="text-white text-xs font-semibold text-center">
                        Upload Photo
                      </span>
                    )}
                  </div>

                  {/* Hidden file input */}
                  <input
                    id="photo-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                    disabled={uploadingPhoto}
                  />
                </label>
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold leading-tight">{profile.companyName || "Your Company"}</h2>
                  <p className="text-sm text-gray-400">Account: <span className="font-mono text-blue-300">{profile.email}</span></p>
                  <p className="text-sm text-gray-400">Code: <span className="font-mono text-blue-300">{profile.customerCode}</span></p>
                </div>
              </div>

              {/* Editable Form */}
              <div className="p-6 sm:p-8 space-y-6">
                {(success || error) && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-3 rounded-lg font-medium ${success ? "bg-green-900/50 text-green-400" : "bg-red-900/50 text-red-400"}`}
                  >
                    {success || error}
                  </motion.p>
                )}

                {/* Form Fields Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Company Name */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2 flex items-center gap-2">
                      <FaBuilding className="text-blue-400" /> Company Name
                    </label>
                    <input
                      type="text"
                      className="w-full border border-gray-700 bg-gray-900 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none transition"
                      value={profile.companyName || ""}
                      onChange={(e) => setProfile({ ...profile, companyName: e.target.value })}
                      placeholder="Enter your company name"
                    />
                  </div>

                  {/* Customer Name */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2 flex items-center gap-2">
                      <FaIdBadge className="text-blue-400" /> Customer Name
                    </label>
                    <input
                      type="text"
                      className="w-full border border-gray-700 bg-gray-900 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none transition"
                      value={profile.customerName || ""}
                      onChange={(e) => setProfile({ ...profile, customerName: e.target.value })}
                      placeholder="Enter your full name"
                    />
                  </div>

                  {/* Contact Number */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2 flex items-center gap-2">
                      <FaPhone className="text-blue-400" /> Contact Number
                    </label>
                    <input
                      type="tel"
                      className="w-full border border-gray-700 bg-gray-900 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none transition"
                      value={profile.phoneNumber || ""}
                      onChange={(e) => setProfile({ ...profile, phoneNumber: e.target.value })}
                      placeholder="Enter your contanct number"
                    />
                  </div>

                  {/* GST Number */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-400" /> GST Number (Optional)
                    </label>
                    <input
                      type="text"
                      className="w-full border border-gray-700 bg-gray-900 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none transition"
                      value={profile.customerGST || ""}
                      onChange={(e) => setProfile({ ...profile, customerGST: e.target.value })}
                      placeholder="Enter your GSTIN"
                    />
                    <p className="text-xs text-gray-500 mt-1">This detail is used for invoicing and tax purposes.</p>
                  </div>
                </div>

                {/* Save Button */}
                <div className="flex justify-end pt-6 border-t border-gray-700 mt-6">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 transition disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-blue-600/40 transform hover:scale-[1.01] active:scale-95"
                  >
                    {saving ? <FaSpinner className="animate-spin" /> : <FaSave />}
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Column 1: Active Subscription Status (Takes 1/3) */}
          <div className="lg:col-span-1">
            <h2 className="text-xl font-bold mb-4 text-blue-300 border-b border-gray-700 pb-2">Subscription</h2>
            <div className="min-h-[250px]"> {/* Ensures min height for better layout stability */}
              {loadingStatus ? (
                <div className="p-6 bg-gray-800/70 rounded-xl shadow-md flex items-center justify-center h-full min-h-[200px]">
                  <FaSpinner className="animate-spin w-8 h-8 text-blue-400" />
                </div>
              ) : (
                <ActiveSubscriptionBlock status={subscriptionStatus} onRefresh={loadSubscriptionStatus} />
              )}
            </div>
          </div>


        </div>
      </motion.div>
    </div>
  );
}