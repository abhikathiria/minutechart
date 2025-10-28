import React, { useEffect, useState } from "react";
import api from "../api";
import { motion } from "framer-motion";
import { toast } from "react-hot-toast";
import { FaTrash, FaSave, FaSearch, FaSort, FaFilter, FaChevronLeft, FaChevronRight } from "react-icons/fa";

export default function ComplaintsManagement() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [updates, setUpdates] = useState({ status: "", adminResponse: "", attachments: [] });
  const [query, setQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");
  const [page, setPage] = useState(1);
  const [zoomedImage, setZoomedImage] = useState(null);
  const [saving, setSaving] = useState(false);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchAll();
  }, []);

  async function fetchAll() {
    try {
      setLoading(true);
      const res = await api.get("/complaints/all", { withCredentials: true });
      setComplaints(res.data || []);
    } catch (err) {
      console.error("Failed to load complaints", err);
      toast.error("Failed to load complaints");
    } finally {
      setLoading(false);
    }
  }

  const filteredAndSorted = complaints
    .filter((c) => {
      const matchesQuery = !query || [c.title, c.description, c.userName, c.status, c.customerCode].some((field) =>
        field?.toLowerCase().includes(query.toLowerCase())
      );
      const matchesStatus = !filterStatus || c.status === filterStatus;
      const matchesCategory = !filterCategory || c.category === filterCategory;
      return matchesQuery && matchesStatus && matchesCategory;
    })
    .sort((a, b) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];
      if (sortOrder === "asc") return aVal > bVal ? 1 : -1;
      return aVal < bVal ? 1 : -1;
    });

  const paginated = filteredAndSorted.slice((page - 1) * itemsPerPage, page * itemsPerPage);
  const totalPages = Math.ceil(filteredAndSorted.length / itemsPerPage);

  function openDetails(c) {
    setSelected(c);
    setUpdates({ status: c.status || "Open", adminResponse: c.adminResponse || "", attachments: [] });
  }

  async function handleSaveUpdate() {
    if (!selected) return;
    setSaving(true);
    try {
      const fd = new FormData();
      if (updates.status) fd.append("status", updates.status);
      if (updates.adminResponse !== undefined) fd.append("adminResponse", updates.adminResponse);
      (updates.attachments || []).forEach((f) => fd.append("adminAttachments", f));

      await api.put(`/complaints/${selected.id}`, fd, {
        withCredentials: true,
        headers: { "Content-Type": "multipart/form-data" }
      });

      toast.success("Complaint updated");
      setSelected(null);
      setUpdates({ status: "", adminResponse: "", attachments: [] });
      fetchAll();
    } catch (err) {
      console.error("Update failed", err);
      toast.error("Failed to update complaint");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this complaint? This action cannot be undone.")) return;
    try {
      await api.delete(`/complaints/${id}`, { withCredentials: true });
      toast.success("Complaint deleted");
      fetchAll();
    } catch (err) {
      console.error("Delete failed", err);
      toast.error("Failed to delete complaint");
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
      <div className="max-w-7xl mx-auto">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-3xl font-bold text-gray-900">🔧 Complaints Management</h1>
          <p className="text-gray-600 mt-2">View, update status, attach admin files, or delete complaints.</p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Search, Filters, and List */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-2 bg-white p-6 rounded-lg shadow-lg"
          >
            {/* Search and Filters */}
            <div className="mb-6 space-y-4">
              <div className="flex gap-4">
                <div className="relative flex-1">
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search by title, user, status, customer code..."
                    className="w-full p-3 pl-10 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <FaSearch className="absolute left-3 top-3.5 text-gray-400" />
                </div>
                <button onClick={fetchAll} className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  Refresh
                </button>
              </div>
              <div className="flex gap-4">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Statuses</option>
                  <option value="Open">Open</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Closed">Closed</option>
                </select>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Categories</option>
                  <option value="Technical">Technical</option>
                  <option value="Billing">Billing</option>
                  <option value="General">General</option>
                </select>
              </div>
            </div>

            {/* Table (Desktop) */}
            <div className="hidden lg:block">
              <table className="w-full table-auto border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="p-3 text-left cursor-pointer" onClick={() => { setSortBy("title"); setSortOrder(sortOrder === "asc" ? "desc" : "asc"); }}>
                      Title <FaSort className="inline ml-1" />
                    </th>
                    <th className="p-3 text-left cursor-pointer" onClick={() => { setSortBy("userName"); setSortOrder(sortOrder === "asc" ? "desc" : "asc"); }}>
                      User <FaSort className="inline ml-1" />
                    </th>
                    <th className="p-3 text-left">Customer Code</th>
                    <th className="p-3 text-left cursor-pointer" onClick={() => { setSortBy("status"); setSortOrder(sortOrder === "asc" ? "desc" : "asc"); }}>
                      Status <FaSort className="inline ml-1" />
                    </th>
                    <th className="p-3 text-left cursor-pointer" onClick={() => { setSortBy("createdAt"); setSortOrder(sortOrder === "asc" ? "desc" : "asc"); }}>
                      Created <FaSort className="inline ml-1" />
                    </th>
                    <th className="p-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="6" className="p-3 text-center">Loading...</td></tr>
                  ) : paginated.length === 0 ? (
                    <tr><td colSpan="6" className="p-3 text-center">No complaints found.</td></tr>
                  ) : (
                    paginated.map((c) => (
                      <tr key={c.id} className="border-t hover:bg-gray-50 cursor-pointer" onClick={() => openDetails(c)}>
                        <td className="p-3">{c.title}</td>
                        <td className="p-3">{c.userName}</td>
                        <td className="p-3">{c.customerCode}</td>
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            c.status === "Open" ? "bg-yellow-100 text-yellow-800" :
                            c.status === "In Progress" ? "bg-blue-100 text-blue-800" :
                            c.status === "Resolved" ? "bg-green-100 text-green-800" :
                            "bg-gray-100 text-gray-800"
                          }`}>
                            {c.status}
                          </span>
                        </td>
                        <td className="p-3">{new Date(c.createdAt).toLocaleDateString()}</td>
                        <td className="p-3 text-center">
                          <button onClick={(e) => { e.stopPropagation(); handleDelete(c.id); }} className="text-red-600 hover:text-red-800">
                            <FaTrash />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Cards (Mobile) */}
            <div className="lg:hidden space-y-4">
              {loading ? (
                <p className="text-center">Loading...</p>
              ) : paginated.length === 0 ? (
                <p className="text-center">No complaints found.</p>
              ) : (
                paginated.map((c) => (
                  <div key={c.id} className="border p-4 rounded-lg shadow-sm cursor-pointer hover:bg-gray-50" onClick={() => openDetails(c)}>
                    <h3 className="font-bold">{c.title}</h3>
                    <p className="text-sm text-gray-600">{c.userName} • {c.customerCode}</p>
                    <p className="text-sm text-gray-500">Status: {c.status} • {new Date(c.createdAt).toLocaleDateString()}</p>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(c.id); }} className="mt-2 text-red-600 hover:text-red-800">
                      <FaTrash /> Delete
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-6 flex justify-center gap-2">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="px-3 py-2 border rounded-lg disabled:opacity-50"
                >
                  <FaChevronLeft />
                </button>
                <span className="px-3 py-2">Page {page} of {totalPages}</span>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-2 border rounded-lg disabled:opacity-50"
                >
                  <FaChevronRight />
                </button>
              </div>
            )}
          </motion.div>

          {/* Right: Details and Update */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white p-6 rounded-lg shadow-lg"
          >
            {!selected ? (
              <p className="text-gray-500">Select a complaint to view details and actions.</p>
            ) : (
              <>
                <h3 className="text-xl font-bold mb-4">{selected.title}</h3>
                <p className="text-sm text-gray-600 mb-2">{selected.description}</p>
                <p className="text-sm text-gray-500 mb-2">User: {selected.userName} ({selected.userEmail})</p>
                <p className="text-sm text-gray-500 mb-2">Customer Code: {selected.customerCode}</p>
                <p className="text-sm text-gray-400 mb-4">Created: {new Date(selected.createdAt).toLocaleString()}</p>

                {renderAttachments(selected.userAttachmentUrls, "User Attachments")}

                <div className="border-t mt-6 pt-4">
                  <h4 className="font-semibold mb-2">Update Complaint</h4>
                  <div className="space-y-4">
                    <select
                      value={updates.status}
                      onChange={(e) => setUpdates({ ...updates, status: e.target.value })}
                      className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Open">Open</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Resolved">Resolved</option>
                      <option value="Closed">Closed</option>
                    </select>
                    <textarea
                      value={updates.adminResponse}
                      onChange={(e) => setUpdates({ ...updates, adminResponse: e.target.value })}
                      placeholder="Admin Response"
                      className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 h-24"
                    />
                    <div>
                      <label className="block text-sm font-medium mb-2">Admin Attachments</label>
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={(e) => setUpdates({ ...updates, attachments: Array.from(e.target.files) })}
                        className="w-full"
                      />
                      {updates.attachments.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {updates.attachments.map((f, i) => (
                            <img
                              key={i}
                              src={URL.createObjectURL(f)}
                              alt={`admin-preview-${i}`}
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
                        onClick={handleSaveUpdate}
                        disabled={saving}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                      >
                        <FaSave /> {saving ? "Saving..." : "Save"}
                      </motion.button>
                      <button
                        onClick={() => {
                          setSelected(null);
                          setUpdates({ status: "", adminResponse: "", attachments: [] });
                        }}
                        className="px-4 py-2 border rounded-lg"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </div>

                {selected.adminAttachmentUrls && renderAttachments(selected.adminAttachmentUrls, "Admin Attachments")}
              </>
            )}
          </motion.div>
        </div>

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
