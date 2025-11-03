import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import { FaDatabase, FaServer, FaUser, FaKey, FaClock, FaBuilding, FaFileInvoiceDollar, FaIdBadge, FaEye, FaEyeSlash } from "react-icons/fa";
import { motion } from "framer-motion";

// Helper Component for Data Rows
function InfoRow({ label, value, icon, isSensitive = false }) {
    const [showValue, setShowValue] = useState(false);

    const maskedValue = value ? '••••••••' : 'N/A';
    const displayValue = isSensitive && !showValue ? maskedValue : value || 'N/A';

    return (
        <div className="flex items-start gap-4 bg-gray-50 border rounded-xl px-4 py-3 shadow-sm transition hover:shadow-md">
            <div className="text-indigo-600 text-xl pt-1 flex-shrink-0">{icon}</div>
            <div className="flex-grow min-w-0">
                <div className="text-xs uppercase tracking-wider text-gray-500 font-semibold truncate">{label}</div>
                <div className="text-gray-800 font-medium text-base break-words flex items-center justify-between">
                    <span className="truncate">{displayValue}</span>
                    {isSensitive && value && (
                        <button
                            type="button"
                            onClick={() => setShowValue(p => !p)}
                            className="text-gray-400 hover:text-indigo-600 transition ml-3"
                            title={showValue ? "Hide Password" : "Show Password"}
                        >
                            {showValue ? <FaEyeSlash /> : <FaEye />}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function MyProfile() {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

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

    const profileItems = [
        { label: "Company Name", value: profile.companyName, icon: <FaBuilding /> },
        { label: "Customer Name", value: profile.customerName, icon: <FaIdBadge /> },
        { label: "Customer Code", value: profile.customerCode, icon: <FaIdBadge /> },
        { label: "GST Number", value: profile.customerGST, icon: <FaFileInvoiceDollar /> },
        { label: "Refresh Time", value: profile.refreshTime, icon: <FaClock /> },
        { label: "Server Name", value: profile.serverName, icon: <FaServer /> },
        { label: "Database Name", value: profile.databaseName, icon: <FaDatabase /> },
        { label: "DB Username", value: profile.dbUsername, icon: <FaUser /> },
        // { label: "DB Password", value: profile.dbPassword, icon: <FaKey />, isSensitive: true },
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 py-12 px-4 sm:px-6">
            <motion.div 
                className="max-w-4xl mx-auto"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                
                {/* Header (Full Width) */}
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl shadow-lg text-white p-6 sm:p-8 mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold">My Profile</h1>
                        <p className="text-base opacity-90 mt-1">Review your saved database connection and company details.</p>
                    </div>
                    <Link
                        to="/dashboard"
                        className="px-6 py-2 bg-white text-indigo-700 rounded-xl font-semibold hover:bg-gray-100 transition shadow-md flex items-center gap-2"
                    >
                        ⬅ Dashboard
                    </Link>
                </div>
            
                {/* Main Content Card (Centralized Block) */}
                <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
                    
                    {/* Integrated Summary Header (Formerly Left Panel) */}
                    <div className="bg-gradient-to-br from-indigo-500 to-purple-500 text-white p-6 sm:p-8 flex flex-col sm:flex-row items-center sm:items-start gap-4">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white/20 flex items-center justify-center text-3xl sm:text-4xl font-extrabold flex-shrink-0 border-4 border-white/50">
                            {profile.companyName?.[0]?.toUpperCase() || "C"}
                        </div>
                        <div className="text-center sm:text-left pt-1">
                            <h2 className="text-xl sm:text-2xl font-bold mb-0 leading-tight">{profile.companyName || "Your Company"}</h2>
                            <p className="text-sm sm:text-base text-white/80">Associated Company Profile</p>
                        </div>
                    </div>

                    {/* Details Panel (Full Width, Responsive Grid) */}
                    <div className="p-6 sm:p-8">
                        <h3 className="text-xl font-bold text-gray-900 mb-4 border-b pb-2 border-gray-200">Connection Credentials</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {profileItems.map((item, i) => (
                                <InfoRow 
                                    key={i} 
                                    label={item.label} 
                                    value={item.value} 
                                    icon={item.icon} 
                                    isSensitive={item.isSensitive}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}