import React, { useState, useEffect, useRef, useCallback } from "react";
import api from "../api";
import { FaGripVertical, FaSave, FaUser, FaUpload, FaChevronRight, FaPhone, FaEnvelope, FaGlobe, FaIdBadge, FaBuilding, FaDollarSign } from "react-icons/fa";
import { Reorder, AnimatePresence, motion } from "framer-motion";
import { toast } from "react-hot-toast";

// --- Helper Component: Section Card ---
function SectionCard({ title, children }) {
    return (
        <motion.section
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.4 }}
            className="p-4 sm:p-6 mb-8 bg-white/90 backdrop-blur rounded-2xl shadow-xl border-l-4 border-purple-400" // Enhanced styling
        >
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                {title}
            </h2>
            <div className="space-y-4">{children}</div>
        </motion.section>
    );
}

// --- Helper Component: Input (with consistent style) ---
function Input({ label, name, value, onChange, type = "text", className = "", icon: Icon = null, readOnly = false }) {
    return (
        <div className={className}>
            {label && <label className="block text-sm font-semibold text-gray-800 mb-1">{label}</label>}
            <div className="relative">
                {Icon && <Icon className="absolute left-3 top-3.5 text-gray-400 w-4 h-4" />}
                <input
                    type={type}
                    name={name}
                    value={value ?? ""}
                    onChange={onChange}
                    readOnly={readOnly}
                    className={`w-full rounded-xl px-4 py-3 bg-indigo-50 border border-indigo-200 text-gray-900
                               focus:border-purple-500 focus:ring-2 focus:ring-purple-300 transition
                               ${readOnly ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'} ${Icon ? 'pl-11' : 'pl-4'}`}
                />
            </div>
        </div>
    );
}

// --- Helper Component: Textarea (with consistent style) ---
function Textarea({ label, name, value, onChange, className = "", ...props }) {
    return (
        <div className={className}>
            {label && <label className="block text-sm font-semibold text-gray-800 mb-1">{label}</label>}
            <textarea
                name={name}
                value={value ?? ""}
                onChange={onChange}
                className="w-full rounded-xl px-4 py-3 bg-white border border-gray-300 text-gray-900
                           focus:border-purple-500 focus:ring-2 focus:ring-purple-300 transition resize-none"
                {...props}
            />
        </div>
    );
}

// Reusable Save Button Component: Handles FAB (Desktop) vs. Sticky Bar (Mobile)
const SaveButton = ({ onClick, isFab = false, fabBottom = 24 }) => {
    
    // --- Desktop FAB ---
    if (isFab) {
        return (
            <motion.button
                onClick={onClick}
                whileHover={{ scale: 1.1, boxShadow: "0 0 25px rgba(125,51,234,0.7)" }}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 260, damping: 20 }}
                style={{ bottom: fabBottom, right: 24 }}
                className="fixed z-50 p-5 rounded-full shadow-xl text-white
                         bg-gradient-to-br from-indigo-600 to-purple-600
                         focus:outline-none focus:ring-4 focus:ring-purple-300 hidden md:block"
            >
                <FaSave size={22} />
            </motion.button>
        );
    }
    
    // --- Mobile Sticky Save Bar ---
    return (
        <div className="fixed bottom-0 left-0 w-full p-4 bg-white/95 backdrop-blur shadow-2xl z-50 md:hidden">
            <button
                onClick={onClick}
                className="w-full py-3 text-lg font-bold text-white rounded-xl transition 
                           bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-md"
            >
                <FaSave className="inline mr-2" size={18} /> Save Settings
            </button>
        </div>
    );
};


// --- Main Component ---

export default function InvoiceSettingsPage() {
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(true);
    const [logoPreview, setLogoPreview] = useState("");
    const [signaturePreview, setSignaturePreview] = useState("");
    const [fabBottom, setFabBottom] = useState(24);
    
    const logoInputRef = useRef(null);
    const signatureInputRef = useRef(null);


    useEffect(() => {
        loadSettings();
    }, []);

    // --- Loading and Utility Functions ---

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
            toast.success("Image uploaded successfully!");
        } catch (err) {
            console.error("File upload failed", err);
            toast.error("Image upload failed");
        }
    }

    function handleChange(e) {
        const { name, value, type, checked } = e.target;
        let newValue = type === "checkbox" ? checked : value;

        setSettings((prev) => {
            if (name === "igstPercent") {
                const igst = parseFloat(newValue) || 0;
                return {
                    ...prev,
                    igstPercent: igst,
                    cgstPercent: igst / 2,
                    sgstPercent: igst / 2,
                };
            }
            return { ...prev, [name]: newValue };
        });
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

    // --- Final Responsive Render ---

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-5xl mx-auto pb-32">
                
                {/* Hero / Banner Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="overflow-hidden shadow-2xl mb-10"
                >
                    <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 sm:p-8 rounded-2xl">
                        <h1 className="text-3xl md:text-4xl font-extrabold text-white">
                            ⚙️ Invoice Settings
                        </h1>
                        <p className="text-white/80 mt-2">
                            Configure company details, bank info, and invoice layout options.
                        </p>
                    </div>
                </motion.div>

                <div className="space-y-8">
                    
                    {/* Section: Company Info */}
                    <SectionCard title="🏢 Company Information">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            
                            {/* Logo Upload */}
                            <div className="flex flex-col sm:flex-row gap-6 sm:gap-4 items-start sm:items-center md:items-start md:flex-col">
                                <div className="flex-shrink-0">
                                    <label className="block text-sm font-semibold text-gray-800 mb-2">Company Logo</label>
                                    <div className="w-36 h-36 bg-white rounded-xl border border-indigo-200 flex items-center justify-center overflow-hidden shadow-inner">
                                        {logoPreview ? (
                                            <img src={logoPreview} alt="logo" className="object-contain w-full h-full" />
                                        ) : (
                                            <span className="text-gray-400 text-sm">No logo</span>
                                        )}
                                    </div>
                                    <p className="text-xs text-orange-500 mt-1">Recommended 300×80 px, PNG / SVG</p>
                                </div>
                                <div className="flex-grow">
                                    <input
                                        ref={logoInputRef}
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => handleFileUpload(e, "logo")}
                                        className="sr-only" // Hidden native input
                                    />
                                    <button
                                        onClick={() => logoInputRef.current.click()}
                                        className="mt-2 text-sm px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition flex items-center gap-2 shadow-md"
                                    >
                                        <FaUpload /> Upload Logo
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <Input label="Company Name" name="companyName" value={settings.companyName} onChange={handleChange} icon={FaBuilding} />
                                <Input label="GST Number" name="gstNumber" value={settings.gstNumber} onChange={handleChange} icon={FaIdBadge} />
                            </div>

                            <div className="md:col-span-2">
                                <Textarea
                                    label="Company Address"
                                    name="companyAddress"
                                    value={settings.companyAddress}
                                    onChange={handleChange}
                                    className="h-24"
                                />
                            </div>

                            {/* Contact Details Grid (Responsive) */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:col-span-2">
                                <Input label="Phone" name="companyPhone" value={settings.companyPhone} onChange={handleChange} icon={FaPhone} />
                                <Input label="Email" name="companyEmail" value={settings.companyEmail} onChange={handleChange} icon={FaEnvelope} />
                                <Input label="Website" name="companyWebsite" value={settings.companyWebsite} onChange={handleChange} icon={FaGlobe} />
                            </div>
                        </div>
                    </SectionCard>

                    {/* Section: Owner / Signature */}
                    <SectionCard title="👤 Owner / Signature">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Input label="Owner Name" name="ownerName" value={settings.ownerName} onChange={handleChange} icon={FaUser} />
                            
                            {/* Signature Upload */}
                            <div className="flex flex-col sm:flex-row gap-6 sm:gap-4 items-start sm:items-center">
                                <div className="flex-shrink-0">
                                    <label className="block text-sm font-semibold text-gray-800 mb-2">Owner Signature</label>
                                    <div className="w-48 h-20 bg-white rounded-xl border border-indigo-200 flex items-center justify-center overflow-hidden shadow-inner">
                                        {signaturePreview ? (
                                            <img src={signaturePreview} alt="signature" className="object-contain w-full h-full" />
                                        ) : (
                                            <span className="text-gray-400 text-sm">No signature</span>
                                        )}
                                    </div>
                                    <p className="text-xs text-orange-500 mt-1">Transparent PNG recommended</p>
                                </div>
                                <div className="flex-grow">
                                    <input
                                        ref={signatureInputRef}
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => handleFileUpload(e, "signature")}
                                        className="sr-only" // Hidden native input
                                    />
                                    <button
                                        onClick={() => signatureInputRef.current.click()}
                                        className="mt-2 text-sm px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition flex items-center gap-2 shadow-md"
                                    >
                                        <FaUpload /> Upload Signature
                                    </button>
                                </div>
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
                                label="Other Details / Notes"
                                name="otherDetails"
                                value={settings.otherDetails}
                                onChange={handleChange}
                                className="h-24"
                            />
                        </div>
                    </SectionCard>

                    {/* Section: Tax Details */}
                    <SectionCard title="💰 Tax Details">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                            <Input
                                type="number"
                                label="IGST %"
                                name="igstPercent"
                                value={settings.igstPercent}
                                onChange={handleChange}
                                icon={FaDollarSign}
                            />
                            <Input
                                type="number"
                                label="CGST %"
                                value={settings.cgstPercent}
                                readOnly
                                className="opacity-80"
                            />
                            <Input
                                type="number"
                                label="SGST %"
                                value={settings.sgstPercent}
                                readOnly
                                className="opacity-80"
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
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 text-sm sm:text-base">
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
                         <div className="text-sm text-gray-500 mb-4 flex items-center gap-2">
                           <FaChevronRight className="text-orange-400" size={12}/> Drag and drop to reorder. Uncheck to hide the column.
                        </div>
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
                                        className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-3 bg-white rounded-xl border border-indigo-200 shadow hover:shadow-lg transition"
                                    >
                                        <span className="cursor-grab text-gray-500 flex-shrink-0">
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
                                            className="w-4 h-4 text-purple-600 flex-shrink-0"
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
                                            className="flex-1 p-2 rounded-xl focus:ring-2 focus:ring-purple-400 focus:border-transparent transition border border-gray-300 text-sm min-w-0"
                                        />
                                        <input
                                            type="text"
                                            value={col.columnKey}
                                            readOnly
                                            className="w-full sm:w-40 px-2 py-1 text-xs text-gray-600 bg-gray-100 border border-gray-300 rounded-xl cursor-not-allowed text-center"
                                        />
                                    </Reorder.Item>
                                ))}
                            </AnimatePresence>
                        </Reorder.Group>
                    </SectionCard>
                </div>
            </div>

            {/* Desktop FAB */}
            <SaveButton onClick={saveSettings} isFab={true} fabBottom={fabBottom} />

            {/* Mobile Sticky Save Bar */}
            <SaveButton onClick={saveSettings} isFab={false} />
        </div>
    );
}