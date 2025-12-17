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
import { CheckCircle2, TrendingUp, Loader2, Clock, User, Briefcase, FileText } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-hot-toast";

// --- NEW THEME DEFINITION (Dark/Blue for background) ---
const NEW_THEME = {
  // Main Background: Dark Blue (Base color for the new wavy design)
  mainBg: "#0B2447", 
  // Card Background: Semi-transparent Dark Blue
  cardBg: "rgba(18, 30, 50, 0.8)", 
  // Primary Text Color: White
  textPrimary: "#FFFFFF",
  // Secondary Text Color: Gray
  textSecondary: "#A0AEC0",
  // Accent Color: Mid Blue (for buttons/highlights)
  accent: "#2B6CB0",
  // Input Background: Very Dark Blue
  inputBg: "#1F2937", 
  // Input Border
  inputBorder: "#4B5563",
};


// --- Active Subscription Component (MODIFIED to use WHITE Background) ---
const ActiveSubscriptionBlock = ({ status, onRefresh }) => {
  const [showHistory, setShowHistory] = useState(false);

  const hasActive = status?.hasActivePlan && status?.activePlanDaysRemaining > 0;
  const active = status?.activePlan;
  const next = status?.nextPlanned;

  if (!hasActive) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        // White Card, Dark Text (Fallback)
        className="p-6 bg-white border border-red-300 text-red-700 rounded-xl shadow-lg flex flex-col items-center justify-center text-center space-y-4 h-full min-h-[200px]"
      >
        <Clock className="w-8 h-8 text-red-500" />
        <p className="font-bold text-xl">No Active Subscription</p>
        <p className="text-sm">Please view plans to continue using our services.</p>
        <Link
          to="/pricing"
          className="px-6 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-500 transition shadow-xl mt-4"
        >
          View Plans
        </Link>
      </motion.div>
    );
  }

  // Convert dates
  const startDate = new Date(active.subscriptionStart);
  const endDate = new Date(active.subscriptionEnd);
  const activePlanDaysRemaining = status.activePlanDaysRemaining;

  const now = new Date();

  const totalDays = activePlanDaysRemaining +
    Math.max(Math.ceil((now - startDate) / 86400000), 0);

  const percentElapsed = Math.min(
    ((totalDays - activePlanDaysRemaining) / totalDays) * 100,
    100
  );


  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      // MODIFICATION 1: Main card background is white
      className="bg-white rounded-2xl shadow-2xl border border-blue-500/50 overflow-hidden text-black"
    >
      {/* Summary Header */}
      <div className="bg-blue-600/90 text-white p-6 flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="w-6 h-6" />
          <h2 className="text-xl font-extrabold">Active Subscription</h2>
        </div>

        <div className="bg-white text-gray-900 px-4 py-2 rounded-lg shadow-md">
          <span className="text-xl font-extrabold">
            Total Days Remaining: {activePlanDaysRemaining}
          </span>
        </div>
      </div>

      {/* Current Plan (Text is black/dark gray for white background) */}
      <div className="p-6 space-y-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-3 border-b border-gray-200 pb-2">
          Current Plan
        </h3>

        <div className="p-3 rounded-lg bg-gray-100 shadow-inner border border-blue-100">
          <div className="flex justify-between items-center text-sm font-semibold text-gray-800">
            <span className="flex items-center gap-2 text-blue-600">
              <TrendingUp className="w-4 h-4" />
              <span className="font-bold">{active.name}</span>
            </span>
            <span className="text-right text-base">
              {activePlanDaysRemaining} {activePlanDaysRemaining === 1 ? "day" : "days"} left
            </span>
          </div>

          <p className="text-xs text-gray-500 mt-1 flex justify-between">
            <span className="flex items-center gap-1">
              <FaCalendarAlt size={10} className="text-blue-500" />
              Ends: {endDate.toLocaleDateString('en-GB')}
            </span>
            <span className="text-blue-600 font-medium">Progress:</span>
          </p>

          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-1000"
              style={{ width: `${percentElapsed}%` }}
            />
          </div>
        </div>

        {/* FUTURE PLAN IF ANY */}
        {next && (
          <div>
            <h3 className="text-sm font-semibold text-gray-800 mt-4">
              Upcoming Plan
            </h3>
            <div className="text-xs text-gray-500 mt-1">
              Starts {new Date(next.subscriptionStart).toLocaleDateString('en-GB')} –{" "}
              <span className="font-semibold text-gray-800">{next.name}</span>
            </div>
          </div>
        )}
      </div>

      {/* Refresh */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <button
          onClick={onRefresh}
          className="text-md text-gray-500 hover:text-blue-600 transition flex items-center mx-auto font-medium"
        >
          <Clock className="w-3 h-3 mr-1" /> Refresh Subscription Status
        </button>
      </div>
    </motion.div>
  );
};

// --- Main Component (Redesigned with custom background) ---
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
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // NEW FUNCTION: Handle File Selection
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhotoFile(file);
      // Optional: Automatically trigger upload, or wait for a new "Upload Photo" button click
      handlePhotoUpload(file);
    }
  };

  const handleLogoChange = async (file) => {
    if (!file) return;
    setUploadingLogo(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await api.post("/account/upload-company-logo", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setProfile(prev => ({
        ...prev,
        companyLogoUrl: res.data.newUrl,
      }));

      toast.success("Company logo updated!");
    } catch (err) {
      toast.error("Failed to upload logo.");
    } finally {
      setUploadingLogo(false);
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
      setSubscriptionStatus({ hasActivePlan: false, activePlans: [], activePlanDaysRemaining: 0 });
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
      <div 
        // Background change for loading state
        style={{ background: NEW_THEME.mainBg }}
        className="min-h-screen flex items-center justify-center"
      >
        <div className="text-lg text-white flex items-center gap-2 p-6 bg-gray-800 rounded-2xl shadow-lg">
          <Loader2 className="animate-spin w-6 h-6 text-blue-400" /> Loading Profile...
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
    <div 
        // -----------------------------------------------------------
        // 1. MAIN CONTAINER: Set the base color and enable relative positioning
        // -----------------------------------------------------------
        style={{ background: NEW_THEME.mainBg }} 
        className="min-h-screen text-white py-10 px-4 sm:px-6 lg:px-8 relative overflow-hidden"
    >
        {/* -----------------------------------------------------------
        // 2. NEW BACKGROUND OVERLAY (To simulate the wavy design)
        // ----------------------------------------------------------- */}
        <style jsx="true">{`
          .profile-bg-overlay::before {
            content: '';
            position: absolute;
            top: -20vh; /* Start higher up */
            left: 0;
            width: 100%;
            height: 120vh; /* Cover full height */
            background: linear-gradient(180deg, rgba(43, 108, 176, 0.5) 0%, rgba(11, 36, 71, 0.7) 100%);
            mask-image: url('data:image/svg+xml;utf8,<svg viewBox="0 0 1000 1000" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g1" x1="0%" y1="0%" x2="0%" y2="100%"><stop stop-color="%231E40AF" offset="0%"/><stop stop-color="%232B6CB0" offset="100%"/></linearGradient><linearGradient id="g2" x1="0%" y1="0%" x2="0%" y2="100%"><stop stop-color="%231F4D9C" offset="0%"/><stop stop-color="%232563EB" offset="100%"/></linearGradient></defs><path d="M 0 0 V 1000 H 1000 V 0 H 0 Z" fill="url(%23g1)"/><path d="M 0 0 C 150 150, 350 100, 500 200 C 650 300, 850 250, 1000 400 V 1000 H 0 Z" fill="url(%23g2)" opacity="0.4"/><circle cx="100" cy="800" r="150" fill="%232563EB" opacity="0.3"/><circle cx="850" cy="150" r="120" fill="%23FFFFFF" opacity="0.6"/><circle cx="500" cy="600" r="80" fill="%234A90E2" opacity="0.4"/></svg>');
            mask-size: cover;
            mask-repeat: no-repeat;
            z-index: 10;
          }
        `}</style>
        
        {/* The overlay DIV to apply the CSS defined above */}
        <div className="profile-bg-overlay absolute inset-0 z-10 pointer-events-none"></div>


      <motion.div
        className="max-w-7xl mx-auto relative z-20" // Higher Z-index to float over the background
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header (Account & Billing) - REMAINS WHITE as per previous instruction */}
        <div 
          className="bg-white rounded-xl shadow-2xl p-6 sm:p-8 mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-l-4 border-blue-600"
        >
          <div className="text-black"> 
            <h1 className="text-3xl sm:text-4xl font-extrabold flex items-center gap-3 text-blue-600">
              <User className="w-8 h-8" /> Account & Billing
            </h1>
            <p className="text-base text-gray-600 mt-2">Manage your profile details and monitor your subscription status.</p>
          </div>
          {/* <Link
            to="/dashboard"
            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition shadow-lg flex items-center gap-2 whitespace-nowrap"
          >
            Dashboard ➔
          </Link> */}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Column 2: Profile Edit Form (Takes 2/3) */}
          <div className="lg:col-span-2">
            <h2 className="text-xl font-bold mb-4 text-white border-b border-gray-700 pb-2">Profile Details</h2>
            
            {/* MODIFICATION 2: Profile Details Card set to White background */}
            <div 
                style={{ background: '#FFFFFF' }} // White Background
                className="rounded-2xl shadow-xl overflow-hidden border border-gray-200 text-black" // Text set to black
            >

              {/* Summary Header - Enhanced (Internal card header) */}
              <div className="bg-gray-50 text-black p-6 sm:p-8 flex items-center gap-4 border-b border-gray-200">
                <label htmlFor="photo-upload" className="relative cursor-pointer group">
                  {/* The visible profile photo / initial block */}
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-blue-100 flex items-center justify-center text-xl sm:text-2xl font-extrabold text-blue-600 shadow-xl overflow-hidden transition duration-300 transform group-hover:scale-105">
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
                  <p className="text-sm text-gray-500">Account: <span className="font-mono text-blue-600">{profile.email}</span></p>
                  <p className="text-sm text-gray-500">Code: <span className="font-mono text-blue-600">{profile.customerCode}</span></p>
                </div>
              </div>

              {/* Editable Form */}
              <div className="p-6 sm:p-8 space-y-6">
                {(success || error) && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-3 rounded-lg font-medium ${success ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
                  >
                    {success || error}
                  </motion.p>
                )}

                {/* Form Fields Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Company Name + Logo Side by Side */}
                  <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6 items-start">

                    {/* Company Name */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-gray-600 mb-2 flex items-center gap-2">
                        <FaBuilding className="text-blue-600" /> Company Name
                      </label>
                      <input
                        type="text"
                        // Input Style: Light background, dark text
                        className="w-full border border-gray-300 bg-gray-100 rounded-lg p-3 text-black 
                        focus:ring-2 focus:ring-blue-500 outline-none transition"
                        value={profile.companyName || ""}
                        onChange={(e) => setProfile({ ...profile, companyName: e.target.value })}
                        placeholder="Enter your company name"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-600 mb-2 flex items-center gap-2">
                        <FaBuilding className="text-blue-600" /> Company Logo
                      </label>
                      <label
                        htmlFor="company-logo-upload-form-section"
                        className="relative cursor-pointer group flex flex-col items-center justify-center 
								bg-gray-100 
								border border-gray-300 rounded-lg shadow-md 
								h-20 w-full overflow-hidden transition hover:scale-[1.02]"
                      >
                        {profile.companyLogoUrl ? (
                          <img
                            src={profile.companyLogoUrl}
                            alt="company logo"
                            className="object-contain w-full h-full p-2"
                          />
                        ) : (
                          <div className="text-gray-500 flex flex-col items-center text-sm">
                            <FaBuilding className="text-blue-500 mb-1 text-xl" />
                            Upload Logo
                          </div>
                        )}

                        {/* Hover Overlay */}
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 
								flex items-center justify-center text-white text-xs font-semibold 
								transition">
                          {uploadingLogo ? (
                            <FaSpinner className="animate-spin w-6 h-6" />
                          ) : (
                            "Click to Upload"
                          )}
                        </div>

                        <input
                          id="company-logo-upload-form-section"
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleLogoChange(e.target.files[0])}
                          className="hidden"
                          disabled={uploadingLogo}
                        />
                      </label>
                    </div>
                  </div>

                  {/* Customer Name */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-600 mb-2 flex items-center gap-2">
                      <FaIdBadge className="text-blue-600" /> Customer Name
                    </label>
                    <input
                      type="text"
                      // Input Style: Light background, dark text
                      className="w-full border border-gray-300 bg-gray-100 rounded-lg p-3 text-black focus:ring-2 focus:ring-blue-500 outline-none transition"
                      value={profile.customerName || ""}
                      onChange={(e) => setProfile({ ...profile, customerName: e.target.value })}
                      placeholder="Enter your full name"
                    />
                  </div>

                  {/* Contact Number */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-600 mb-2 flex items-center gap-2">
                      <FaPhone className="text-blue-600" /> Contact Number
                    </label>
                    <input
                      type="tel"
                      // Input Style: Light background, dark text
                      className="w-full border border-gray-300 bg-gray-100 rounded-lg p-3 text-black focus:ring-2 focus:ring-blue-500 outline-none transition"
                      value={profile.phoneNumber || ""}
                      onChange={(e) => setProfile({ ...profile, phoneNumber: e.target.value })}
                      placeholder="Enter your contanct number"
                    />
                  </div>

                  {/* GST Number */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-600 mb-2 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-600" /> GST Number (Optional)
                    </label>
                    <input
                      type="text"
                      // Input Style: Light background, dark text
                      className="w-full border border-gray-300 bg-gray-100 rounded-lg p-3 text-black focus:ring-2 focus:ring-blue-500 outline-none transition"
                      value={profile.customerGST || ""}
                      onChange={(e) => setProfile({ ...profile, customerGST: e.target.value })}
                      placeholder="Enter your GSTIN"
                    />
                    <p className="text-xs text-gray-500 mt-1">This detail is used for invoicing and tax purposes.</p>
                  </div>
                </div>

                {/* Save Button */}
                <div className="flex justify-end pt-6 border-t border-gray-200 mt-6">
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
            <h2 className="text-xl font-bold mb-4 text-white border-b border-gray-700 pb-2">Subscription</h2>
            <div className="min-h-[250px]"> {/* Ensures min height for better layout stability */}
              {loadingStatus ? (
                // Loading card background set to white
                <div className="p-6 bg-white rounded-xl shadow-md flex items-center justify-center h-full min-h-[200px]">
                  <FaSpinner className="animate-spin w-8 h-8 text-blue-600" />
                </div>
              ) : (
                // ActiveSubscriptionBlock now has white background inside its component
                <ActiveSubscriptionBlock status={subscriptionStatus} onRefresh={loadSubscriptionStatus} />
              )}
            </div>
          </div>


        </div>
      </motion.div>
    </div>
  );
}