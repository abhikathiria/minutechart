// src/pages/MyAdminProfile.jsx
import React, { useEffect, useState } from "react";
import api from "../api";
import {
    FaBuilding,
    FaIdBadge,
    FaSave,
    FaSpinner
} from "react-icons/fa";
import { User, Briefcase, FileText, Key, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "react-hot-toast";

/* ---------------- THEME (UNCHANGED) ---------------- */
const NEW_THEME = {
    mainBg: "#0B2447",
};

/* ---------------- MAIN COMPONENT ---------------- */
export default function MyAdminProfile() {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [uploadingLogo, setUploadingLogo] = useState(false);

    /* -------- Load Admin Profile -------- */
    const loadProfile = async () => {
        try {
            const me = await api.get("/account/me");
            const adminId = me.data.id;

            const res = await api.get(`/admin/admin/${adminId}/profile`);
            setProfile(res.data);
        } catch {
            toast.error("Failed to load admin profile");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadProfile();
    }, []);

    /* -------- Photo Upload -------- */
    const handlePhotoUpload = async (file) => {
        if (!file) return;
        setUploadingPhoto(true);

        try {
            const fd = new FormData();
            fd.append("file", file);

            const res = await api.post("/account/upload-profile-photo", fd);
            setProfile(p => ({ ...p, profilePhotoUrl: res.data.newUrl }));
            toast.success("Profile photo updated");
        } catch {
            toast.error("Photo upload failed");
        } finally {
            setUploadingPhoto(false);
        }
    };

    /* -------- Logo Upload -------- */
    const handleLogoUpload = async (file) => {
        if (!file) return;
        setUploadingLogo(true);

        try {
            const fd = new FormData();
            fd.append("file", file);

            const res = await api.post("/account/upload-company-logo", fd);
            setProfile(p => ({ ...p, companyLogoUrl: res.data.newUrl }));
            toast.success("Company logo updated");
        } catch {
            toast.error("Logo upload failed");
        } finally {
            setUploadingLogo(false);
        }
    };

    /* -------- Save Admin Profile -------- */
    const handleSave = async () => {
        setSaving(true);
        try {
            await api.post(`/admin/admin/${profile.id}/profile`, {
                companyName: profile.companyName,
                adminName: profile.adminName,
                gst: profile.gst,
                commissionPercentage:
                    profile.commissionPercentage === ""
                        ? null
                        : Number(profile.commissionPercentage),
            });

            toast.success("Admin profile saved");
        } catch {
            toast.error("Failed to save profile");
        } finally {
            setSaving(false);
        }
    };

    /* -------- Loading -------- */
    if (loading) {
        return (
            <div
                style={{ background: NEW_THEME.mainBg }}
                className="min-h-screen flex items-center justify-center"
            >
                <div className="flex items-center gap-2 bg-gray-800 text-white p-6 rounded-xl">
                    <Loader2 className="animate-spin w-6 h-6 text-blue-400" />
                    Loading Admin Profile...
                </div>
            </div>
        );
    }

    if (!profile) return null;

    /* ---------------- RENDER ---------------- */
    return (
        <div
            style={{ background: NEW_THEME.mainBg }}
            className="min-h-screen py-10 px-6 text-white"
        >
            <motion.div
                className="max-w-5xl mx-auto"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
            >
                {/* HEADER */}
                <div className="bg-white text-black rounded-xl shadow-xl p-6 mb-8 border-l-4 border-blue-600">
                    <h1 className="text-3xl font-extrabold text-blue-600 flex items-center gap-3">
                        <User /> My Admin Profile
                    </h1>
                    <p className="text-gray-600 mt-2">
                        Manage your admin account information
                    </p>
                </div>

                {/* PROFILE CARD */}
                <div className="bg-white text-black rounded-2xl shadow-xl p-8 space-y-6">

                    {/* PHOTO */}
                    <div className="flex items-center gap-6">
                        <label className="relative cursor-pointer group">
                            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-600 overflow-hidden">
                                {profile.profilePhotoUrl ? (
                                    <img
                                        src={profile.profilePhotoUrl}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <Briefcase />
                                )}
                            </div>

                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs rounded-full">
                                {uploadingPhoto ? "Uploading..." : "Change"}
                            </div>

                            <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => handlePhotoUpload(e.target.files[0])}
                                disabled={uploadingPhoto}
                            />
                        </label>

                        <div>
                            <h2 className="text-xl font-bold">{profile.companyName}</h2>
                            <p className="text-sm text-gray-500">
                                Admin Code: <span className="font-mono text-blue-600">{profile.adminCode}</span>
                            </p>
                        </div>
                    </div>

                    {/* FORM */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Input label="Company Name" icon={FaBuilding}
                            value={profile.companyName}
                            onChange={v => setProfile({ ...profile, companyName: v })}
                        />

                        <Input label="Admin Name" icon={FaIdBadge}
                            value={profile.adminName}
                            onChange={v => setProfile({ ...profile, adminName: v })}
                        />

                        <Input label="GST" icon={FileText}
                            value={profile.gst}
                            onChange={v => setProfile({ ...profile, gst: v })}
                        />

                        <Input label="Commission %" icon={Key}
                            type="number"
                            value={profile.commissionPercentage ?? ""}
                            onChange={v => setProfile({ ...profile, commissionPercentage: v })}
                            readOnly
                        />
                    </div>

                    {/* LOGO */}
                    <div>
                        <label className="block font-semibold mb-2">Company Logo</label>
                        <label className="cursor-pointer inline-block">
                            <div className="border rounded-lg p-3 bg-gray-100">
                                {profile.companyLogoUrl
                                    ? <img src={profile.companyLogoUrl} className="h-12" />
                                    : "Upload Logo"}
                            </div>
                            <input
                                type="file"
                                className="hidden"
                                accept="image/*"
                                onChange={(e) => handleLogoUpload(e.target.files[0])}
                                disabled={uploadingLogo}
                            />
                        </label>
                    </div>

                    {/* SAVE */}
                    <div className="flex justify-end pt-4">
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2"
                        >
                            {saving ? <FaSpinner className="animate-spin" /> : <FaSave />}
                            Save Changes
                        </button>
                    </div>

                </div>
            </motion.div>
        </div>
    );
}

/* -------- Small Input Component -------- */
function Input({
    label,
    icon: Icon,
    value,
    onChange,
    type = "text",
    readOnly = false
}) {
    return (
        <div>
            <label className="block text-sm font-semibold text-gray-600 mb-2 flex items-center gap-2">
                <Icon className="text-blue-600" /> {label}
            </label>

            <input
                type={type}
                value={value ?? ""}
                readOnly={readOnly}
                onChange={readOnly ? undefined : (e) => onChange(e.target.value)}
                className={`
          w-full rounded-lg p-3 border
          ${readOnly
                        ? "bg-gray-200 text-gray-600 cursor-not-allowed select-none"
                        : "bg-gray-100 text-black border-gray-300 focus:ring-2 focus:ring-blue-500"}
        `}
                tabIndex={readOnly ? -1 : 0}
            />
        </div>
    );
}
