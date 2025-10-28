import React, { useState, useEffect } from "react";
import api from "../api";
import { motion } from "framer-motion";
import { toast } from "react-hot-toast";
import { FaPaperPlane, FaUser, FaCalendarAlt } from "react-icons/fa";

export default function Complaints() {
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "",
    attachments: []
  });
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(false);
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
    fd.append("category", form.category);
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

  const renderAttachments = (urls, label) => (
    <div className="mt-3">
      <p className="text-sm font-medium">{label}:</p>
      <div className="flex flex-wrap gap-2 mt-2">
        {!urls || urls.length === 0 ? (
          <p className="text-gray-500">None</p>
        ) : (
          urls.map((u, i) => (
            <img
              key={i}
              src={u}
              alt={`${label} ${i + 1}`}
              className="w-16 h-16 object-cover rounded-lg shadow-md cursor-pointer hover:opacity-80"
              onClick={() => setZoomedImage(u)}
              onError={(e) => (e.target.src = "/placeholder-image.png")}
            />
          ))
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-3xl font-bold text-gray-900">📣 Complaints</h1>
          <p className="text-gray-600 mt-2">Submit an issue or feedback — we'll get back to you.</p>
        </motion.div>

        {/* Submit Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-6 rounded-lg shadow-lg mb-8"
        >
          <h2 className="text-xl font-semibold mb-4">Submit a Complaint</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <Select
              label="Category"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              options={[
                { value: "", label: "Select Category" },
                { value: "Technical", label: "Technical" },
                { value: "Billing", label: "Billing" },
                { value: "General", label: "General" }
              ]}
            />
            <Textarea label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <div>
              <label className="block text-sm font-medium mb-2">Attachments (images)</label>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => setForm({ ...form, attachments: Array.from(e.target.files) })}
                className="w-full"
              />
              {form.attachments.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {form.attachments.map((f, i) => (
                    <img
                      key={i}
                      src={URL.createObjectURL(f)}
                      alt={`preview-${i}`}
                      className="w-16 h-16 object-cover rounded-lg shadow-md cursor-pointer"
                      onClick={() => setZoomedImage(URL.createObjectURL(f))}
                    />
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <motion.button
                whileTap={{ scale: 0.95 }}
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <FaPaperPlane /> {submitting ? "Submitting..." : "Submit"}
              </motion.button>
              <button
                type="button"
                onClick={() => setForm({ title: "", description: "", category: "", attachments: [] })}
                className="px-4 py-3 border rounded-lg"
              >
                Reset
              </button>
            </div>
          </form>
        </motion.div>

        {/* My Complaints */}
        {showMyComplaints && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-6 rounded-lg shadow-lg"
          >
            <h2 className="text-xl font-semibold mb-4">My Complaints</h2>
            {loading ? (
              <p className="text-gray-500">Loading...</p>
            ) : complaints.length === 0 ? (
              <p className="text-gray-500">No complaints yet.</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {complaints.map((c) => (
                  <div key={c.id} className="border p-4 rounded-lg shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <FaUser className="text-blue-600" />
                      <span className="text-sm text-gray-600">Customer Code: {c.customerCode}</span>
                    </div>
                    <h3 className="font-bold">{c.title}</h3>
                    <p className="text-sm text-gray-600">{c.description}</p>
                    <p className="text-sm text-gray-500">Status: {c.status}</p>
                    {c.adminResponse && <p className="text-sm">Admin: {c.adminResponse}</p>}
                    <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                      <FaCalendarAlt />
                      {new Date(c.createdAt).toLocaleString()}
                    </div>
                    {renderAttachments(c.userAttachmentUrls, "Your Attachments")}
                    {renderAttachments(c.adminAttachmentUrls, "Admin Attachments")}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Zoom Modal */}
        {zoomedImage && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50" onClick={() => setZoomedImage(null)}>
            <img src={zoomedImage} alt="Zoomed" className="max-w-full max-h-full object-contain" />
          </div>
        )}
      </div>
    </div>
  );
}

// Reusable Components
function Input({ label, value, onChange }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      <input value={value} onChange={onChange} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500" />
    </div>
  );
}

function Textarea({ label, value, onChange }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      <textarea value={value} onChange={onChange} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 h-24" />
    </div>
  );
}

function Select({ label, options, value, onChange }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      <select value={value} onChange={onChange} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500">
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}