import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import { FaDatabase, FaServer, FaUser, FaKey, FaClock, FaBuilding } from "react-icons/fa";

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
                setError("Failed to load profile.");
            } finally {
                setLoading(false);
            }
        }

        loadMyProfile();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100">
                <div className="animate-pulse text-gray-600">Loading your profile…</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-red-50 text-red-700">
                {error}
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 py-12 px-4">
            {/* Header */}
            <div className="max-w-4xl mx-auto bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl shadow-lg text-white p-6 mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">My Profile</h1>
                    <p className="text-sm opacity-90">Your saved database connection details</p>
                </div>
                <Link
                    to="/"
                    className="px-4 py-2 bg-white text-indigo-700 rounded-lg font-semibold hover:bg-gray-100 transition"
                >
                    ⬅ Back to Home
                </Link>
            </div>
            <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden grid grid-cols-1 md:grid-cols-3">
                {/* Left Panel */}
                <div className="bg-gradient-to-br from-indigo-600 to-purple-600 text-white p-6 flex flex-col justify-center items-center">
                    <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center text-3xl font-bold mb-4">
                        {profile.companyName?.[0] || "C"}
                    </div>
                    <h2 className="text-lg font-semibold">{profile.companyName}</h2>
                    <p className="text-sm text-white/80">Database Connection Profile</p>
                </div>

                {/* Right Panel */}
                <div className="md:col-span-2 p-8 space-y-5">
                    {/* Reusable info row */}
                    {[
                        { label: "Company Name", value: profile.companyName, icon: <FaBuilding /> },
                        { label: "Server Name", value: profile.serverName, icon: <FaServer /> },
                        { label: "Database Name", value: profile.databaseName, icon: <FaDatabase /> },
                        { label: "DB Username", value: profile.dbUsername, icon: <FaUser /> },
                        { label: "DB Password", value: profile.dbPassword, icon: <FaKey /> },
                        { label: "Refresh Time", value: profile.refreshTime, icon: <FaClock /> },
                    ].map((item, i) => (
                        <div
                            key={i}
                            className="flex items-center gap-3 bg-gray-50 border rounded-xl px-4 py-3"
                        >
                            <div className="text-indigo-600 text-lg">{item.icon}</div>
                            <div>
                                <div className="text-xs uppercase tracking-wide text-gray-500">{item.label}</div>
                                <div className="text-gray-800 font-medium">{item.value}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
