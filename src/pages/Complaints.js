// src/pages/Complaints.jsx
import React, { useState, useEffect, useCallback } from "react";
import api from "../api";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-hot-toast";
import {
  FaPaperPlane,
  FaUser,
  FaCalendarAlt,
  FaTag,
  FaCheckCircle,
  FaExclamationTriangle,
  FaTimesCircle,
  FaReply,
  FaRegFileImage,
} from "react-icons/fa";
import { Loader2 } from "lucide-react"; // spinner

// --- Complaints page (Dark glassmorphic / neon accents)
// All original logic preserved. Visuals updated to match dark glass style.

export default function Complaints() {
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "",
    attachments: [],
  });
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [zoomedImage, setZoomedImage] = useState(null);
  const [showMyComplaints, setShowMyComplaints] = useState(true);

  useEffect(() => {
    fetchComplaints();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    fd.append("category", form.category || "General");
    (form.attachments || []).forEach((f) => fd.append("attachments", f));

    try {
      await api.post("/complaints/submit", fd, {
        withCredentials: true,
        headers: { "Content-Type": "multipart/form-data" },
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
    const files = Array.from(e.target.files || []);
    if (files.length > 5) {
      toast.error("Maximum 5 attachments allowed.");
      setForm({ ...form, attachments: files.slice(0, 5) });
    } else {
      setForm({ ...form, attachments: files });
    }
  };

  const StatusBadge = ({ status }) => {
    const base =
      "px-3 py-1 rounded-full text-xs font-semibold uppercase flex items-center gap-2 backdrop-blur-sm";
    switch (status) {
      case "Resolved":
        return (
          <span className={`${base} bg-emerald-900/40 text-emerald-200 border border-emerald-700/30`}>
            <FaCheckCircle className="w-3 h-3" /> {status}
          </span>
        );
      case "Pending":
        return (
          <span className={`${base} bg-amber-900/30 text-amber-200 border border-amber-700/30`}>
            <FaExclamationTriangle className="w-3 h-3" /> {status}
          </span>
        );
      case "Closed":
        return (
          <span className={`${base} bg-slate-900/30 text-slate-300 border border-slate-700/20`}>
            <FaTimesCircle className="w-3 h-3" /> {status}
          </span>
        );
      case "Processing":
        return (
          <span className={`${base} bg-sky-900/30 text-sky-200 border border-sky-700/30`}>
            <FaPaperPlane className="w-3 h-3" /> {status}
          </span>
        );
      default:
        return <span className={`${base} bg-gray-800/30 text-gray-200`}>{status}</span>;
    }
  };

  const renderAttachments = (urls, label) => (
    <div className="mt-3">
      <p className="text-xs font-medium text-slate-300 mb-2">{label}:</p>
      <div className="flex flex-wrap gap-2">
        {!urls || urls.length === 0 ? (
          <p className="text-gray-400 text-xs">None</p>
        ) : (
          urls.map((u, i) => (
            <div
              key={i}
              className="w-14 h-14 bg-white/6 rounded-lg shadow-sm cursor-pointer hover:shadow-md transition flex items-center justify-center overflow-hidden border border-white/6"
              onClick={() => setZoomedImage(u)}
              title="Click to zoom"
              role="button"
            >
              <FaRegFileImage className="text-slate-300 text-2xl" />
              {/* If attachments are full URLs to images, consider swapping the icon for an <img> */}
            </div>
          ))
        )}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#061018] text-white p-6">
        <div className="text-lg text-white flex items-center gap-2 p-6 bg-[#0a2345] rounded-2xl shadow-lg">
          <Loader2 className="animate-spin w-6 h-6" /> Loading Complaints...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#051018] text-white py-10 px-4 sm:px-6 lg:px-8">
      {/* Background neon/glow blobs */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -left-40 -top-40 w-[40rem] h-[40rem] rounded-full bg-indigo-700/20 blur-[140px] animate-[float_9s_linear_infinite]" />
        <div className="absolute -right-40 -bottom-40 w-[48rem] h-[48rem] rounded-full bg-teal-600/18 blur-[160px] animate-[float_11s_linear_infinite]" />
      </div>

      <motion.div className="max-w-7xl mx-auto" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
        {/* Header */}
        <div className="text-center mb-10 p-6 bg-white/5 backdrop-blur-sm rounded-2xl shadow-lg border border-white/6">
          <h1 className="text-4xl font-extrabold text-white flex items-center justify-center gap-3">
            <FaPaperPlane className="text-indigo-300" /> Customer Support & Complaints
          </h1>
          <p className="text-slate-300 mt-2">Submit and track the status of your issues and feedback.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Left Column - Form */}
          <div className="lg:col-span-2">
            <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.45 }} className="bg-white/5 backdrop-blur-md border border-white/8 rounded-2xl p-6 sm:p-8 shadow-2xl sticky top-6">
              <h2 className="text-2xl font-bold mb-4 text-white">Submit a New Ticket</h2>
              <form onSubmit={handleSubmit} className="space-y-5">
                <InputDark
                  label="Title (Max 100 characters)"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  maxLength={100}
                />

                <SelectDark
                  label="Category"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  options={[
                    { value: "", label: "Select Category" },
                    { value: "Technical", label: "Technical (Bugs/Errors)" },
                    { value: "Billing", label: "Billing/Subscription" },
                    { value: "General", label: "General Feedback" },
                  ]}
                />

                <TextareaDark label="Detailed Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />

                <div>
                  <label className="block text-sm font-medium mb-2 text-slate-300">Attachments (Max 5 images)</label>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleFileChange}
                    className="w-full text-sm p-2 border border-white/8 rounded-lg bg-white/6 text-white"
                  />
                  {form.attachments && form.attachments.length > 0 && (
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
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={submitting}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-teal-400 text-black rounded-xl font-bold hover:opacity-95 disabled:opacity-60 transition shadow"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="animate-spin w-5 h-5" /> Submitting...
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
                    className="px-4 py-3 border border-white/8 rounded-xl text-slate-200 hover:bg-white/6 transition font-medium"
                  >
                    Reset
                  </button>
                </div>
              </form>
            </motion.div>
          </div>

          {/* Right Column - Complaints List */}
          <div className="lg:col-span-3">
            {showMyComplaints && (
              <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.45, delay: 0.05 }} className="bg-white/5 backdrop-blur-md border border-white/8 rounded-2xl p-6 sm:p-8 shadow-2xl">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-white">My Submitted Tickets ({complaints.length})</h2>
                  <div className="text-sm text-slate-300">Manage and view responses</div>
                </div>

                {complaints.length === 0 ? (
                  <div className="p-6 text-center text-slate-300 italic border-2 border-dashed rounded-xl bg-white/3">
                    No complaints submitted yet. Use the form on the left to start a new ticket.
                  </div>
                ) : (
                  <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2">
                    {complaints.map((c) => (
                      <div key={c.id} className="border border-white/8 p-5 rounded-xl shadow-md bg-white/6 transition hover:shadow-lg">
                        <div className="flex justify-between items-start">
                          <h3 className="font-bold text-lg text-indigo-200 pr-3">{c.title}</h3>
                          <StatusBadge status={c.status} />
                        </div>

                        <p className="text-sm text-slate-300 mt-2 max-h-16 overflow-hidden">{c.description}</p>

                        <div className="text-xs text-slate-400 border-t pt-3 border-white/6 mt-3 space-y-1">
                          <p className="flex items-center gap-2">
                            <FaTag className="w-3 h-3" /> Category: <span className="font-medium text-slate-200">{c.category || "N/A"}</span>
                          </p>
                          <p className="flex items-center gap-2">
                            <FaCalendarAlt className="w-3 h-3" /> Date: <span className="text-slate-200">{new Date(c.createdAt).toLocaleDateString()}</span>
                          </p>
                        </div>

                        {c.adminResponse && (
                          <div className="p-3 bg-sky-900/20 border-l-4 border-sky-700/30 rounded-lg text-sm text-sky-200 mt-3">
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
              className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4"
              onClick={() => setZoomedImage(null)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              <img src={zoomedImage} alt="Zoomed" className="max-w-full max-h-full object-contain cursor-zoom-out rounded" onClick={(e) => e.stopPropagation()} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* small float keyframes */}
      <style>{`
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
          100% { transform: translateY(0px); }
        }
        .animate-[float_9s_linear_infinite] { animation: float 9s linear infinite; }
        .animate-[float_11s_linear_infinite] { animation: float 11s linear infinite; }
      `}</style>
    </div>
  );
}

/* -------------------------
   Dark-themed form controls
   ------------------------- */

function InputDark({ label, value, onChange, maxLength = 255 }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-2 text-slate-300">{label}</label>
      <input
        value={value}
        onChange={onChange}
        maxLength={maxLength}
        className="w-full p-3 border border-white/8 rounded-xl bg-white/6 text-white placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500/30 outline-none transition"
      />
    </div>
  );
}

function TextareaDark({ label, value, onChange }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-2 text-slate-300">{label}</label>
      <textarea
        value={value}
        onChange={onChange}
        className="w-full p-3 border border-white/8 rounded-xl bg-white/6 text-white placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500/30 outline-none transition h-28 resize-none"
      />
    </div>
  );
}

function SelectDark({ label, options, value, onChange }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-2 text-slate-300">{label}</label>
      <select
        value={value}
        onChange={onChange}
        className="w-full p-3 border border-white/8 rounded-xl bg-white/6 text-white focus:ring-2 focus:ring-indigo-500/30 outline-none transition"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-[#051018] text-white">
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
