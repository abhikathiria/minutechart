import React, { useEffect, useState } from "react";
import api from "../api";
import { motion } from "framer-motion";
import { FaSave, FaPaperPlane } from "react-icons/fa";
import { toast } from "react-hot-toast";

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
    try {
      await api.post("/admin/emailsettings/test", testEmail, {
        headers: { "Content-Type": "application/json" },
      });
      toast.success("Test email sent to " + testEmail);
    } catch (err) {
      console.error("Test email failed", err);
      toast.error("Failed to send test email");
    }
  }

  return (
    <div className="relative">
      {/* Background */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(147,51,234,0.05),transparent,transparent)]" />
      </div>

      <div className="max-w-4xl mx-auto px-4 md:px-6 lg:px-8 pb-20">
        {/* Hero / Banner Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="overflow-hidden shadow-lg mb-10"
        >
          <div className="mt-4 bg-gradient-to-r from-blue-600 to-purple-600 p-8 rounded-2xl">
            <h1 className="text-3xl md:text-4xl font-extrabold text-white">
              📧 Email Settings
            </h1>
            <p className="text-white/80 mt-2">
              Configure your SMTP settings and test email delivery.
            </p>
          </div>
        </motion.div>

        {/* Settings Form */}
        <AnimatedSection title="⚙️ SMTP Configuration">
          <form onSubmit={saveSettings} className="space-y-4">
            <Input
              label="SMTP Host"
              value={settings.smtpHost}
              onChange={(e) =>
                setSettings({ ...settings, smtpHost: e.target.value })
              }
            />
            <Input
              label="Port"
              type="number"
              value={settings.smtpPort}
              onChange={(e) =>
                setSettings({ ...settings, smtpPort: Number(e.target.value) })
              }
            />
            <Input
              label="SMTP Username"
              value={settings.smtpUser}
              onChange={(e) =>
                setSettings({ ...settings, smtpUser: e.target.value })
              }
            />
            <Input
              label="SMTP Password"
              type="password"
              value={settings.smtpPassword}
              onChange={(e) =>
                setSettings({ ...settings, smtpPassword: e.target.value })
              }
            />
            <Input
              label="From Email"
              type="email"
              value={settings.fromEmail}
              onChange={(e) =>
                setSettings({ ...settings, fromEmail: e.target.value })
              }
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
              Enable SSL
            </label>

            <button
              type="submit"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg 
                         bg-gradient-to-r from-blue-600 to-purple-600 
                         text-white shadow hover:scale-105 transform transition"
            >
              <FaSave /> Save Settings
            </button>
          </form>
        </AnimatedSection>

        {/* Test Email */}
        <AnimatedSection title="✉️ Send Test Email">
          <form onSubmit={sendTestEmail} className="flex flex-col sm:flex-row gap-3">
            <input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="Recipient Email"
              className="flex-1 rounded-lg px-3 py-2 bg-gradient-to-r from-white to-indigo-50 border 
                         focus:ring-2 focus:ring-orange-400 focus:border-blue-400 transition shadow-sm"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg 
                         bg-gradient-to-r from-green-500 to-emerald-600 
                         text-white shadow hover:scale-105 transform transition"
            >
              <FaPaperPlane /> Send Test
            </button>
          </form>
        </AnimatedSection>
      </div>
    </div>
  );
}

/* ---------- Reusable Components ---------- */
function AnimatedSection({ title, children }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.35 }}
      className="p-6 mb-8 bg-white/90 backdrop-blur rounded-2xl shadow-lg border-l-4 border-orange-400"
    >
      <h3 className="text-lg font-bold text-gray-900 mb-4">{title}</h3>
      {children}
    </motion.section>
  );
}

function Input({ label, type = "text", value, onChange }) {
  return (
    <div>
      {label && (
        <label className="block text-sm font-semibold text-gray-700 mb-1">
          {label}
        </label>
      )}
      <input
        type={type}
        value={value ?? ""}
        onChange={onChange}
        className="w-full rounded-lg px-3 py-2 bg-gradient-to-r from-white to-indigo-50 border 
                   focus:ring-2 focus:ring-blue-400 focus:border-orange-400 
                   transition shadow-sm"
      />
    </div>
  );
}
