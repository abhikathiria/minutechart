import React, { useState, useEffect, useCallback } from "react";
import api from "../api";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-hot-toast";
import { FaPaperPlane, FaUser, FaCalendarAlt, FaTag, FaCheckCircle, FaExclamationTriangle, FaTimesCircle, FaReply, FaRegFileImage } from "react-icons/fa";
import { Loader2 } from "lucide-react"; // Using lucide-react for cleaner loading spinner

// --- Helper Components (Defined below the main function) ---

export default function Complaints() {
    const [form, setForm] = useState({
        title: "",
        description: "",
        category: "",
        attachments: []
    });
    const [complaints, setComplaints] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [zoomedImage, setZoomedImage] = useState(null);
    const [showMyComplaints, setShowMyComplaints] = useState(true);

    useEffect(() => {
        fetchComplaints();
    }, []);

    async function fetchComplaints() {
        try {
            const res = await api.get("/complaints/my-complaints", { withCredentials: true });
            setComplaints(res.data || []);
        } catch (err) {
            console.error("Error loading complaints", err);
            toast.error("Failed to load your complaints");
        } finally {
            setLoading(false);
        }
    }

    async function handleSubmit(e) {
        e.preventDefault();
        if (!form.title || !form.description) {
            toast.error("Please fill title and description");
            return;
        }

        setSubmitting(true);
        const fd = new FormData();
        fd.append("title", form.title);
        fd.append("description", form.description);
        fd.append("category", form.category || 'General'); // Ensure a default category is set
        (form.attachments || []).forEach((f) => fd.append("attachments", f));

        try {
            await api.post("/complaints/submit", fd, {
                withCredentials: true,
                headers: { "Content-Type": "multipart/form-data" }
            });
            toast.success("Complaint submitted!");
            setForm({ title: "", description: "", category: "", attachments: [] });
            fetchComplaints();
            setShowMyComplaints(true);
        } catch (err) {
            console.error("Submit failed", err);
            toast.error("Failed to submit complaint");
        } finally {
            setSubmitting(false);
        }
    }

    const handleFileChange = (e) => {
        // Prevent adding too many files if performance is a concern
        const files = Array.from(e.target.files);
        if (files.length > 5) {
            toast.error("Maximum 5 attachments allowed.");
            setForm({ ...form, attachments: files.slice(0, 5) });
        } else {
            setForm({ ...form, attachments: files });
        }
    }

    const StatusBadge = ({ status }) => {
        const base = "px-3 py-1 rounded-full text-xs font-semibold uppercase flex items-center gap-1";
        switch (status) {
            case "Resolved":
                return <span className={`${base} bg-green-100 text-green-700`}><FaCheckCircle size={10} /> {status}</span>;
            case "Pending":
                return <span className={`${base} bg-yellow-100 text-yellow-700`}><FaExclamationTriangle size={10} /> {status}</span>;
            case "Closed":
                return <span className={`${base} bg-gray-100 text-gray-600`}><FaTimesCircle size={10} /> {status}</span>;
            case "Processing":
                return <span className={`${base} bg-blue-100 text-blue-700`}><FaPaperPlane size={10} /> {status}</span>;
            default:
                return <span className={`${base} bg-gray-100 text-gray-500`}>{status}</span>;
        }
    };

    const renderAttachments = (urls, label) => (
        <div className="mt-3">
            <p className="text-xs font-medium text-gray-700 mb-1">{label}:</p>
            <div className="flex flex-wrap gap-2">
                {!urls || urls.length === 0 ? (
                    <p className="text-gray-500 text-xs">None</p>
                ) : (
                    urls.map((u, i) => (
                        <div
                            key={i}
                            className="w-14 h-14 bg-gray-100 rounded-lg shadow-md cursor-pointer hover:shadow-lg transition flex items-center justify-center overflow-hidden"
                            onClick={() => setZoomedImage(u)}
                            title="Click to zoom"
                        >
                             <FaRegFileImage className="text-gray-400 text-2xl"/>
                            {/* NOTE: You might use an actual image tag here if serving full URLs */}
                            {/* <img src={u} alt={`${label} ${i + 1}`} className="w-full h-full object-cover" /> */}
                        </div>
                    ))
                )}
            </div>
        </div>
    );

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-purple-50 to-indigo-50">
                <div className="text-lg text-gray-700 animate-pulse flex items-center gap-2">
                    <Loader2 className="animate-spin w-5 h-5"/> Loading Complaints...
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-8 px-4 sm:px-6 lg:px-8">
            <motion.div 
                className="max-w-7xl mx-auto"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                {/* Header */}
                <div className="text-center mb-10 p-6 bg-white/70 backdrop-blur-sm rounded-xl shadow-lg border-b-4 border-indigo-500">
                    <h1 className="text-4xl font-extrabold text-gray-900 flex items-center justify-center gap-3">
                        <FaPaperPlane className="text-indigo-600"/> Customer Support & Complaints
                    </h1>
                    <p className="text-lg text-gray-600 mt-2">Submit and track the status of your issues and feedback.</p>
                </div>

                {/* Main Content Area: Side-by-Side on Desktop, Stacked on Mobile */}
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                    
                    {/* Left Column: Submit Form (2/5 width on desktop) */}
                    <div className="lg:col-span-2">
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.5 }}
                            className="bg-white p-6 sm:p-8 rounded-2xl shadow-2xl border border-gray-100 sticky top-4"
                        >
                            <h2 className="text-2xl font-bold mb-6 text-gray-800">Submit a New Ticket</h2>
                            <form onSubmit={handleSubmit} className="space-y-5">
                                
                                <Input label="Title (Max 100 characters)" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength={100} />
                                
                                <Select
                                    label="Category"
                                    value={form.category}
                                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                                    options={[
                                        { value: "", label: "Select Category" },
                                        { value: "Technical", label: "Technical (Bugs/Errors)" },
                                        { value: "Billing", label: "Billing/Subscription" },
                                        { value: "General", label: "General Feedback" }
                                    ]}
                                />
                                
                                <Textarea label="Detailed Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                                
                                <div>
                                    <label className="block text-sm font-medium mb-2 text-gray-700">Attachments (Max 5 images)</label>
                                    <input
                                        type="file"
                                        multiple
                                        accept="image/*"
                                        onChange={handleFileChange}
                                        className="w-full text-sm p-2 border border-gray-300 rounded-lg bg-gray-50"
                                    />
                                    {form.attachments.length > 0 && (
                                        <div className="mt-3 flex flex-wrap gap-2">
                                            {form.attachments.map((f, i) => (
                                                <img
                                                    key={i}
                                                    src={URL.createObjectURL(f)}
                                                    alt={`preview-${i}`}
                                                    className="w-16 h-16 object-cover rounded-lg shadow-md cursor-pointer hover:shadow-lg"
                                                    onClick={() => setZoomedImage(URL.createObjectURL(f))}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>
                                
                                <div className="flex gap-4 pt-2">
                                    <motion.button
                                        whileTap={{ scale: 0.95 }}
                                        type="submit"
                                        disabled={submitting}
                                        className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-60 transition shadow-md"
                                    >
                                        {submitting ? (
                                            <>
                                                <Loader2 className="animate-spin w-5 h-5"/> Submitting...
                                            </>
                                        ) : (
                                            <>
                                                <FaPaperPlane /> Submit Ticket
                                            </>
                                        )}
                                    </motion.button>
                                    <button
                                        type="button"
                                        onClick={() => setForm({ title: "", description: "", category: "", attachments: [] })}
                                        className="px-4 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition font-medium"
                                    >
                                        Reset
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>

                    {/* Right Column: Complaints List (3/5 width on desktop) */}
                    <div className="lg:col-span-3">
                        {showMyComplaints && (
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.5, delay: 0.1 }}
                                className="bg-white p-6 sm:p-8 rounded-2xl shadow-2xl border border-gray-100"
                            >
                                <h2 className="text-2xl font-bold mb-6 text-gray-800">My Submitted Tickets ({complaints.length})</h2>
                                
                                {complaints.length === 0 ? (
                                    <p className="text-lg text-gray-500 italic p-4 text-center border-2 border-dashed rounded-xl">
                                        No complaints submitted yet. Use the form on the left to start a new ticket.
                                    </p>
                                ) : (
                                    // Complaint Grid - Scales from 1 column on small to 2 columns on tablet+
                                    <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2">
                                        {complaints.map((c) => (
                                            <div key={c.id} className="border border-gray-200 p-5 rounded-xl shadow-md space-y-3 bg-gray-50 transition hover:shadow-lg">
                                                <div className="flex justify-between items-start">
                                                    <h3 className="font-bold text-lg text-indigo-700 pr-4">{c.title}</h3>
                                                    <StatusBadge status={c.status} />
                                                </div>
                                                
                                                <p className="text-sm text-gray-700 max-h-16 overflow-hidden text-ellipsis">
                                                    {c.description}
                                                </p>
                                                
                                                <div className="text-xs text-gray-500 border-t pt-2 border-gray-100">
                                                    <p className="flex items-center gap-2">
                                                        <FaTag size={10}/> Category: <span className="font-medium text-gray-700">{c.category || 'N/A'}</span>
                                                    </p>
                                                    <p className="flex items-center gap-2">
                                                        <FaCalendarAlt size={10}/> Date: {new Date(c.createdAt).toLocaleDateString()}
                                                    </p>
                                                </div>

                                                {c.adminResponse && (
                                                    <div className="p-3 bg-blue-50 border-l-4 border-blue-400 rounded-lg text-sm text-blue-800">
                                                        <FaReply className="inline mr-2" /> 
                                                        <span className="font-semibold">Admin Response:</span> {c.adminResponse}
                                                    </div>
                                                )}

                                                {renderAttachments(c.userAttachmentUrls, "Your Attachments")}
                                                {c.adminAttachmentUrls && renderAttachments(c.adminAttachmentUrls, "Admin Attachments")}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </div>
                </div>

                {/* Zoom Modal */}
                <AnimatePresence>
                    {zoomedImage && (
                        <motion.div 
                            className="fixed inset-0 bg-black bg-opacity-85 flex items-center justify-center z-50 p-4" 
                            onClick={() => setZoomedImage(null)}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.3 }}
                        >
                            <img 
                                src={zoomedImage} 
                                alt="Zoomed" 
                                className="max-w-full max-h-full object-contain cursor-zoom-out" 
                                onClick={(e) => e.stopPropagation()} // Prevent click from closing modal
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
}

// --- Reusable Input/Select Components (Enhanced Styles) ---

function Input({ label, value, onChange, maxLength = 255 }) {
    return (
        <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">{label}</label>
            <input 
                value={value} 
                onChange={onChange} 
                maxLength={maxLength}
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition outline-none text-gray-800" 
            />
        </div>
    );
}

function Textarea({ label, value, onChange }) {
    return (
        <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">{label}</label>
            <textarea 
                value={value} 
                onChange={onChange} 
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition outline-none h-24 resize-none text-gray-800" 
            />
        </div>
    );
}

function Select({ label, options, value, onChange }) {
    return (
        <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">{label}</label>
            <select 
                value={value} 
                onChange={onChange} 
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition bg-white text-gray-800"
            >
                {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
        </div>
    );
}