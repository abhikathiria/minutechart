import React, { useState, useEffect } from "react";
import api from "../api";
import { motion } from "framer-motion";
import { toast } from "react-hot-toast";
import { FaSave, FaPaperPlane, FaLock, FaGlobe, FaEnvelope, FaUser } from "react-icons/fa"; // Added icons

// --- Reusable Components (Enhanced Styles) ---

function AnimatedSection({ title, children }) {
    return (
        <motion.section
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.35 }}
            className="p-6 sm:p-8 mb-8 bg-white/90 backdrop-blur rounded-2xl shadow-xl border-l-4 border-purple-400" // Changed border color for consistency
        >
            <h3 className="text-2xl font-bold text-gray-900 mb-6">{title}</h3>
            {children}
        </motion.section>
    );
}

function Input({ label, type = "text", value, onChange, placeholder, icon: Icon = null }) {
    return (
        <div className="relative">
            {label && (
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                    {label}
                </label>
            )}
            {Icon && <Icon className="absolute left-3 top-9 text-gray-400 w-4 h-4" />}
            <input
                type={type}
                value={value ?? ""}
                onChange={onChange}
                placeholder={placeholder}
                className={`w-full rounded-xl px-4 py-3 bg-white border border-gray-300
                           focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                           transition shadow-sm text-gray-800 ${Icon ? 'pl-10' : ''}`}
            />
        </div>
    );
}

// --- Main Component ---

export default function EmailSettings() {
    const [settings, setSettings] = useState({
        smtpHost: "",
        smtpPort: 587,
        smtpUser: "",
        smtpPassword: "",
        fromEmail: "",
        enableSsl: true,
    });
    const [testEmail, setTestEmail] = useState("");

    useEffect(() => {
        loadSettings();
    }, []);

    async function loadSettings() {
        try {
            const res = await api.get("/admin/emailsettings");
            if (res.data) setSettings((prev) => ({ ...prev, ...res.data }));
        } catch (err) {
            console.error("Failed to load email settings", err);
            toast.error("Failed to load email settings");
        }
    }

    async function saveSettings(e) {
        e.preventDefault();
        try {
            await api.post("/admin/emailsettings/save", settings);
            toast.success("Email settings saved successfully!");
        } catch (err) {
            console.error("Save failed", err);
            toast.error("Failed to save email settings");
        }
    }

    async function sendTestEmail(e) {
        e.preventDefault();
        if (!testEmail) {
            toast.error("Please enter a recipient email address.");
            return;
        }
        try {
            await api.post("/admin/emailsettings/test", JSON.stringify(testEmail), { // Ensuring testEmail is wrapped as JSON body
                headers: { "Content-Type": "application/json" },
            });
            toast.success("Test email sent to " + testEmail);
        } catch (err) {
            console.error("Test email failed", err);
            toast.error("Failed to send test email. Check your SMTP settings.");
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto pb-10">
                
                {/* Hero / Banner Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="overflow-hidden shadow-2xl mb-10"
                >
                    <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 sm:p-8 rounded-2xl">
                        <h1 className="text-3xl md:text-4xl font-extrabold text-white">
                            📧 Email Service Configuration
                        </h1>
                        <p className="text-white/80 mt-2">
                            Configure your SMTP credentials for system notifications (registration, password reset, etc.).
                        </p>
                    </div>
                </motion.div>

                {/* Section: SMTP Configuration */}
                <AnimatedSection title="⚙️ SMTP Configuration">
                    <form onSubmit={saveSettings} className="space-y-6">
                        
                        {/* Host and Port (Two Columns) */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Input
                                label="SMTP Host"
                                placeholder="e.g., smtp.gmail.com"
                                value={settings.smtpHost}
                                onChange={(e) =>
                                    setSettings({ ...settings, smtpHost: e.target.value })
                                }
                                icon={FaGlobe}
                            />
                            <Input
                                label="Port"
                                type="number"
                                placeholder="e.g., 587 or 465"
                                value={settings.smtpPort}
                                onChange={(e) =>
                                    setSettings({ ...settings, smtpPort: Number(e.target.value) })
                                }
                            />
                        </div>
                        
                        {/* User and Password (Two Columns) */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Input
                                label="SMTP Username"
                                placeholder="Full email address or username"
                                value={settings.smtpUser}
                                onChange={(e) =>
                                    setSettings({ ...settings, smtpUser: e.target.value })
                                }
                                icon={FaUser}
                            />
                            <Input
                                label="SMTP Password"
                                type="password"
                                placeholder="Application/Email password"
                                value={settings.smtpPassword}
                                onChange={(e) =>
                                    setSettings({ ...settings, smtpPassword: e.target.value })
                                }
                                icon={FaLock}
                            />
                        </div>
                        
                        {/* From Email */}
                        <Input
                            label="From Email"
                            type="email"
                            placeholder="The email address sent from (e.g., notifications@yourdomain.com)"
                            value={settings.fromEmail}
                            onChange={(e) =>
                                setSettings({ ...settings, fromEmail: e.target.value })
                            }
                            icon={FaEnvelope}
                        />

                        <label className="flex items-center gap-2 text-gray-700 font-medium">
                            <input
                                type="checkbox"
                                checked={settings.enableSsl}
                                onChange={(e) =>
                                    setSettings({ ...settings, enableSsl: e.target.checked })
                                }
                                className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-indigo-500"
                            />
                            Enable SSL (Recommended for security)
                        </label>

                        <button
                            type="submit"
                            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl 
                                       bg-gradient-to-r from-blue-600 to-purple-600 
                                       text-white font-bold shadow-lg hover:shadow-xl transform transition hover:scale-[1.01]"
                        >
                            <FaSave /> Save Settings
                        </button>
                    </form>
                </AnimatedSection>

                {/* Section: Test Email */}
                <AnimatedSection title="✉️ Send Test Email">
                    <form onSubmit={sendTestEmail} className="flex flex-col sm:flex-row gap-4">
                        <input
                            type="email"
                            value={testEmail}
                            onChange={(e) => setTestEmail(e.target.value)}
                            placeholder="Recipient Email Address"
                            required
                            className="flex-1 rounded-xl px-4 py-3 bg-white border border-gray-300
                                       focus:ring-2 focus:ring-green-400 focus:border-green-500 transition shadow-sm text-gray-800"
                        />
                        <button
                            type="submit"
                            className="inline-flex items-center justify-center sm:w-auto w-full gap-2 px-6 py-3 rounded-xl 
                                       bg-gradient-to-r from-green-600 to-emerald-700 
                                       text-white font-bold shadow-lg hover:shadow-xl transform transition hover:scale-[1.01]"
                        >
                            <FaPaperPlane /> Send Test
                        </button>
                    </form>
                </AnimatedSection>
            </div>
        </div>
    );
}