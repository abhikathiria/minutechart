import React, { useState, useEffect, useRef, useCallback } from "react";
import api from "../api";
import { FaGripVertical, FaSave } from "react-icons/fa";
import { Reorder, AnimatePresence, motion } from "framer-motion";
import { toast } from "react-hot-toast";

export default function InvoiceSettingsPage() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [logoPreview, setLogoPreview] = useState("");
  const [signaturePreview, setSignaturePreview] = useState("");
  const [fabBottom, setFabBottom] = useState(24);
  const fabRef = useRef(null);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      const res = await api.get("/admin/invoicesettings");
      setSettings(res.data);
      setLogoPreview(
        res.data?.companyLogoPath?.startsWith("http")
          ? res.data.companyLogoPath
          : api.defaults.baseURL + res.data?.companyLogoPath
      );
      setSignaturePreview(
        res.data?.ownerSignaturePath?.startsWith("http")
          ? res.data.ownerSignaturePath
          : api.defaults.baseURL + res.data?.ownerSignaturePath
      );
    } catch (err) {
      console.error("Failed to load settings", err);
      toast.error("Failed to load invoice settings");
    } finally {
      setLoading(false);
      requestAnimationFrame(adjustFabForFooter);
    }
  }

  async function handleFileUpload(e, type) {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await api.post(
        `/admin/invoicesettings/upload-image?type=${type}`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      const fullUrl = res.data.path.startsWith("http")
        ? res.data.path
        : api.defaults.baseURL + res.data.path;
      if (type === "logo") {
        setLogoPreview(fullUrl);
        setSettings((prev) => ({ ...prev, companyLogoPath: fullUrl }));
      }
      if (type === "signature") {
        setSignaturePreview(fullUrl);
        setSettings((prev) => ({ ...prev, ownerSignaturePath: fullUrl }));
      }
    } catch (err) {
      console.error("File upload failed", err);
      toast.error("Image upload failed");
    }
  }

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setSettings((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  function handleColumnChange(idx, field, value) {
    setSettings((prev) => {
      const cols = [...prev.columns];
      cols[idx][field] = value;
      return { ...prev, columns: cols };
    });
  }

  async function saveSettings() {
    try {
      await api.post("/admin/invoicesettings/save", settings);
      toast.success("Invoice settings saved successfully!");
    } catch (err) {
      console.error("Save failed", err);
      toast.error("Failed to save invoice settings");
    }
  }

  const adjustFabForFooter = useCallback(() => {
    const margin = 24;
    let computed = margin;
    const footer = document.getElementById("app-footer") || document.querySelector("footer");
    if (!footer) {
      setFabBottom(computed);
      return;
    }
    const rect = footer.getBoundingClientRect();
    const winH = window.innerHeight || document.documentElement.clientHeight;
    if (rect.top < winH) {
      const overlap = Math.max(0, winH - rect.top);
      computed = overlap + margin + 12;
    }
    setFabBottom(computed);
  }, []);

  useEffect(() => {
    adjustFabForFooter();
    window.addEventListener("scroll", adjustFabForFooter, { passive: true });
    window.addEventListener("resize", adjustFabForFooter);
    const ro = new ResizeObserver(adjustFabForFooter);
    const footerEl = document.getElementById("app-footer") || document.querySelector("footer");
    if (footerEl) ro.observe(footerEl);
    return () => {
      window.removeEventListener("scroll", adjustFabForFooter);
      window.removeEventListener("resize", adjustFabForFooter);
      ro.disconnect();
    };
  }, [adjustFabForFooter]);

  if (loading) {
    return <div className="p-6 text-gray-500">Loading settings...</div>;
  }

  return (
    <div className="relative min-h-screen">
      {/* Background gradient + soft radial overlay */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-blue-100 to-purple-50">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(147,51,234,0.05),transparent)]" />
      </div>

      <div className="max-w-5xl mx-auto px-4 md:px-6 lg:px-8 pb-32">
        {/* Hero / Banner Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="overflow-hidden shadow-lg mb-10"
        >
          <div className="mt-4 bg-gradient-to-r from-blue-600 to-purple-600 p-8 rounded-2xl">
            <h1 className="text-4xl font-bold text-white">⚙️ Invoice Settings</h1>
            <p className="text-white/80 mt-2">
              Manage your invoice look, bank details, columns, and display settings.
            </p>
          </div>
        </motion.div>

        <div className="space-y-8">
          {/* Section: Company Info */}
          <SectionCard title="🏢 Company Information">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Logo Upload */}
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">Company Logo</label>
                <div className="w-36 h-36 bg-gradient-to-br from-white to-indigo-50 rounded-lg border border-indigo-200 flex items-center justify-center overflow-hidden shadow">
                  {logoPreview ? (
                    <img src={logoPreview} alt="logo" className="object-contain w-full h-full" />
                  ) : (
                    <span className="text-gray-400">No logo</span>
                  )}
                </div>
                <input
                  type="file"
                  onChange={(e) => handleFileUpload(e, "logo")}
                  className="mt-2 text-sm"
                />
                <p className="text-xs text-orange-500 mt-1">Recommended 300×80 px, PNG / SVG</p>
              </div>

              <div className="space-y-4">
                <Input label="Company Name" name="companyName" value={settings.companyName} onChange={handleChange} />
                <Input label="GST Number" name="gstNumber" value={settings.gstNumber} onChange={handleChange} />
              </div>

              <div className="md:col-span-2">
                <Textarea
                  label="Company Address"
                  name="companyAddress"
                  value={settings.companyAddress}
                  onChange={handleChange}
                  className="h-20"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:col-span-2">
                <Input label="Phone" name="companyPhone" value={settings.companyPhone} onChange={handleChange} />
                <Input label="Email" name="companyEmail" value={settings.companyEmail} onChange={handleChange} />
                <Input label="Website" name="companyWebsite" value={settings.companyWebsite} onChange={handleChange} />
              </div>
            </div>
          </SectionCard>

          {/* Section: Owner Info */}
          <SectionCard title="👤 Owner / Signature">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input label="Owner Name" name="ownerName" value={settings.ownerName} onChange={handleChange} />
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">Owner Signature</label>
                <div className="w-48 h-20 bg-gradient-to-br from-white to-indigo-50 rounded-lg border border-indigo-200 flex items-center justify-center overflow-hidden shadow">
                  {signaturePreview ? (
                    <img src={signaturePreview} alt="signature" className="object-contain w-full h-full" />
                  ) : (
                    <span className="text-gray-400">No signature</span>
                  )}
                </div>
                <input
                  type="file"
                  onChange={(e) => handleFileUpload(e, "signature")}
                  className="mt-2 text-sm"
                />
                <p className="text-xs text-orange-500 mt-1">Transparent PNG recommended</p>
              </div>
            </div>
          </SectionCard>

          {/* Section: Bank Details */}
          <SectionCard title="🏦 Bank Details">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input label="Payable To" name="payableTo" value={settings.payableTo} onChange={handleChange} />
              <Input label="Bank Name" name="bankName" value={settings.bankName} onChange={handleChange} />
              <Input label="Branch" name="branchName" value={settings.branchName} onChange={handleChange} />
              <Input label="Account No." name="bankAccountNumber" value={settings.bankAccountNumber} onChange={handleChange} />
              <Input label="IFSC Code" name="ifsc" value={settings.ifsc} onChange={handleChange} />
              <Textarea
                label="Other Details"
                name="otherDetails"
                value={settings.otherDetails}
                onChange={handleChange}
                className="h-20"
              />
            </div>
          </SectionCard>

          {/* Section: Tax Details */}
          <SectionCard title="💰 Tax Details">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                type="number"
                label="CGST %"
                name="cgstPercent"
                value={settings.cgstPercent}
                onChange={handleChange}
              />
              <Input
                type="number"
                label="SGST %"
                name="sgstPercent"
                value={settings.sgstPercent}
                onChange={handleChange}
              />
            </div>
          </SectionCard>

          {/* Section: Terms & Conditions */}
          <SectionCard title="📜 Terms & Conditions">
            <Textarea
              label=""
              name="termsAndConditions"
              value={settings.termsAndConditions || ""}
              onChange={handleChange}
              placeholder="Enter terms & conditions..."
              className="h-32"
            />
          </SectionCard>

          {/* Display Options */}
          <SectionCard title="🔧 Display Options">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {["showGst", "showBankDetails", "showWebsite", "showSignature", "showTermsAndConditions"].map((flag) => (
                <label key={flag} className="flex items-center gap-2 text-gray-800 font-medium">
                  <input
                    type="checkbox"
                    name={flag}
                    checked={!!settings[flag]}
                    onChange={handleChange}
                    className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-indigo-400"
                  />
                  {flag.replace(/([A-Z])/g, " $1")}
                </label>
              ))}
            </div>
          </SectionCard>

          {/* Invoice Columns */}
          <SectionCard title="📊 Invoice Columns">
            <Reorder.Group
              axis="y"
              values={settings.columns}
              onReorder={(newOrder) => {
                const updated = newOrder.map((c, idx) => ({ ...c, order: idx }));
                setSettings((prev) => ({ ...prev, columns: updated }));
              }}
              className="flex flex-col gap-3"
            >
              <AnimatePresence>
                {settings.columns.map((col) => (
                  <Reorder.Item
                    key={col.id ?? col.columnKey}
                    value={col}
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="flex items-center gap-3 p-3 bg-gradient-to-br from-white to-indigo-50 rounded-lg border border-indigo-200 shadow hover:shadow-lg transition"
                  >
                    <span className="cursor-grab text-gray-500">
                      <FaGripVertical />
                    </span>
                    <input
                      type="checkbox"
                      checked={col.isVisible}
                      onChange={(e) =>
                        handleColumnChange(
                          settings.columns.findIndex((c) => c === col),
                          "isVisible",
                          e.target.checked
                        )
                      }
                      className="w-4 h-4 text-purple-600"
                    />
                    <input
                      type="text"
                      value={col.columnName}
                      onChange={(e) =>
                        handleColumnChange(
                          settings.columns.findIndex((c) => c === col),
                          "columnName",
                          e.target.value
                        )
                      }
                      placeholder="Column Name"
                      className="flex-1 p-2 rounded focus:ring-2 focus:ring-orange-400 focus:border-transparent transition border border-gray-300 bg-white/90"
                    />
                    <input
                      type="text"
                      value={col.columnKey}
                      readOnly
                      className="w-40 px-2 py-1 text-sm text-gray-600 bg-gray-100 border border-gray-300 rounded cursor-not-allowed"
                    />
                  </Reorder.Item>
                ))}
              </AnimatePresence>
            </Reorder.Group>
          </SectionCard>
        </div>
      </div>

      <motion.button
        ref={fabRef}
        onClick={saveSettings}
        whileHover={{ scale: 1.1, boxShadow: "0 0 25px rgba(255,153,0,0.7)" }}
        whileTap={{ scale: 0.95 }}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
        style={{ bottom: fabBottom, right: 24 }}
        className="fixed z-50 p-5 rounded-full shadow-xl text-white
                   bg-gradient-to-br from-blue-600 to-purple-600
                   focus:outline-none focus:ring-4 focus:ring-orange-300"
      >
        <FaSave size={22} />
      </motion.button>
    </div>
  );
}

/* —— Helper components —— */

function SectionCard({ title, children }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 15 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.4 }}
      className="p-6 mb-8 bg-white/90 backdrop-blur rounded-2xl shadow-lg border-l-4 border-orange-400"
    >
      <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
        {/* <span className="w-3 h-3 rounded-full bg-gradient-to-r from-blue-600 to-purple-600" /> */}
        {title}
      </h2>
      <div className="space-y-4">{children}</div>
    </motion.section>
  );
}

function Input({ label, name, value, onChange, type = "text", className = "" }) {
  return (
    <div className={className}>
      {label && <label className="block text-sm font-semibold text-gray-800 mb-1">{label}</label>}
      <input
        type={type}
        name={name}
        value={value ?? ""}
        onChange={onChange}
        className="w-full rounded-lg px-3 py-2 bg-indigo-50 border border-indigo-200
                   focus:border-orange-400 focus:ring-2 focus:ring-orange-300 transition"
      />
    </div>
  );
}

function Textarea({ label, name, value, onChange, className = "", ...props }) {
  return (
    <div className={className}>
      {label && <label className="block text-sm font-semibold text-gray-800 mb-1">{label}</label>}
      <textarea
        name={name}
        value={value ?? ""}
        onChange={onChange}
        className="w-full rounded-lg px-3 py-2 bg-indigo-50 border border-indigo-200
                   focus:border-orange-400 focus:ring-2 focus:ring-orange-300 transition"
        {...props}
      />
    </div>
  );
}
