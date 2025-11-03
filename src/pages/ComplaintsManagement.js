import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { toast } from "react-hot-toast";
import { FaTrash, FaSave, FaSearch, FaSort, FaFilter, FaChevronLeft, FaChevronRight, FaRegFileImage, FaTag, FaUser, FaClock, FaCalendarAlt, FaReply, FaSpinner, FaPaperPlane, FaCheckCircle, FaExclamationTriangle, FaTimesCircle, FaFileInvoiceDollar } from "react-icons/fa";
import api from "../api";
import { Loader2 } from "lucide-react";

// --- Helper Component: Status Badge ---
const StatusBadge = ({ status }) => {
    const base = "px-3 py-1 rounded-full text-xs font-semibold uppercase flex items-center gap-1";
    switch (status) {
        case "Resolved":
            return <span className={`${base} bg-green-100 text-green-700`}><FaCheckCircle size={10} /> {status}</span>;
        case "Pending":
        case "Open":
            return <span className={`${base} bg-yellow-100 text-yellow-800`}><FaExclamationTriangle size={10} /> {status}</span>;
        case "In Progress":
            return <span className={`${base} bg-blue-100 text-blue-800`}><FaSpinner size={10} className="animate-spin"/> {status}</span>;
        case "Closed":
            return <span className={`${base} bg-gray-100 text-gray-600`}><FaTimesCircle size={10} /> {status}</span>;
        default:
            return <span className={`${base} bg-gray-100 text-gray-500`}>{status}</span>;
    }
};

// --- Helper Component: Attachment Renderer ---
const renderAttachments = (urls, label, setZoomedImage) => (
    <div className="mt-3">
        <p className="text-xs font-medium text-gray-600 mb-1">{label}:</p>
        <div className="flex flex-wrap gap-2">
            {!urls || urls.length === 0 ? (
                <p className="text-gray-400 text-xs">None</p>
            ) : (
                urls.map((u, i) => (
                    <div
                        key={i}
                        className="w-14 h-14 bg-gray-100 rounded-lg shadow-md cursor-pointer hover:shadow-lg transition flex items-center justify-center overflow-hidden"
                        onClick={() => setZoomedImage(u)}
                        title="Click to zoom"
                    >
                         <FaRegFileImage className="text-gray-400 text-2xl"/>
                        {/* If you are serving images correctly, you'd use <img> here: */}
                        {/* <img src={u} alt={`${label} ${i + 1}`} className="w-full h-full object-cover" /> */}
                    </div>
                ))
            )}
        </div>
    </div>
);


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
            setPage(1); // Reset pagination on refresh
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
            // Find the updated complaint and replace it in the state for instant UI refresh
            setComplaints(prev => prev.map(comp => comp.id === selected.id ? { ...comp, status: updates.status, adminResponse: updates.adminResponse } : comp));
            setSelected(null);
            setUpdates({ status: "", adminResponse: "", attachments: [] });
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
            setComplaints(prev => prev.filter(c => c.id !== id));
            if (selected?.id === id) setSelected(null);
        } catch (err) {
            console.error("Delete failed", err);
            toast.error("Failed to delete complaint");
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                
                {/* Hero */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-10 p-6 bg-white/70 backdrop-blur-sm rounded-xl shadow-lg border-b-4 border-indigo-500"
                >
                    <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 flex items-center justify-center gap-3">
                        <FaFileInvoiceDollar className="text-indigo-600"/> Complaints Management
                    </h1>
                    <p className="text-lg text-gray-600 mt-2">Centralized administrative panel for viewing and resolving user issues.</p>
                </motion.div>

                {/* Main Content Area: Side-by-Side on Desktop, Stacked on Mobile */}
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                    
                    {/* Left/Main Panel: List (3/5 width on desktop) */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="lg:col-span-3 bg-white p-6 sm:p-8 rounded-2xl shadow-2xl border border-gray-100"
                    >
                        {/* Search and Filters */}
                        <div className="mb-6 space-y-4">
                            <div className="flex flex-col sm:flex-row gap-4">
                                <div className="relative flex-1">
                                    <input
                                        value={query}
                                        onChange={(e) => {setQuery(e.target.value); setPage(1);}}
                                        placeholder="Search by title, user, status, customer code..."
                                        className="w-full p-3 pl-10 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-800"
                                    />
                                    <FaSearch className="absolute left-3 top-3.5 text-gray-400" />
                                </div>
                                <button onClick={fetchAll} className="px-4 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition flex-shrink-0">
                                    Refresh
                                </button>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-4">
                                <select
                                    value={filterStatus}
                                    onChange={(e) => {setFilterStatus(e.target.value); setPage(1);}}
                                    className="flex-1 p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 text-gray-700 bg-white"
                                >
                                    <option value="">All Statuses</option>
                                    <option value="Open">Open</option>
                                    <option value="In Progress">In Progress</option>
                                    <option value="Resolved">Resolved</option>
                                    <option value="Closed">Closed</option>
                                </select>
                                <select
                                    value={filterCategory}
                                    onChange={(e) => {setFilterCategory(e.target.value); setPage(1);}}
                                    className="flex-1 p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 text-gray-700 bg-white"
                                >
                                    <option value="">All Categories</option>
                                    <option value="Technical">Technical</option>
                                    <option value="Billing">Billing</option>
                                    <option value="General">General</option>
                                </select>
                                <select
                                     value={sortOrder}
                                     onChange={(e) => setSortOrder(e.target.value)}
                                     className="flex-1 p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 text-gray-700 bg-white"
                                >
                                    <option value="desc">Date: Newest First</option>
                                    <option value="asc">Date: Oldest First</option>
                                </select>
                            </div>
                        </div>

                        {/* Complaint List Area */}
                        <h2 className="text-xl font-bold mb-4 text-gray-800">
                            Tickets ({filteredAndSorted.length})
                        </h2>

                        {loading ? (
                            <div className="p-10 text-center text-gray-500 flex items-center justify-center gap-2">
                                <Loader2 className="animate-spin w-5 h-5"/> Loading tickets...
                            </div>
                        ) : paginated.length === 0 ? (
                             <p className="text-lg text-gray-500 italic p-6 text-center border-2 border-dashed rounded-xl">
                                No complaints match your current filters.
                            </p>
                        ) : (
                            <>
                                {/* Table (Desktop) */}
                                <div className="hidden lg:block overflow-x-auto">
                                    <table className="min-w-full table-auto border-collapse text-sm">
                                        <thead>
                                            <tr className="bg-gray-100 uppercase text-gray-600">
                                                <th className="p-3 text-left">Title</th>
                                                <th className="p-3 text-left">User</th>
                                                <th className="p-3 text-left">Code</th>
                                                <th className="p-3 text-left">Category</th>
                                                <th className="p-3 text-left">Status</th>
                                                <th className="p-3 text-left">Created</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {paginated.map((c) => (
                                                <tr 
                                                    key={c.id} 
                                                    className={`border-t cursor-pointer ${selected?.id === c.id ? 'bg-indigo-50 border-indigo-400' : 'hover:bg-gray-50'}`} 
                                                    onClick={() => openDetails(c)}
                                                >
                                                    <td className="p-3 font-medium truncate max-w-[150px]">{c.title}</td>
                                                    <td className="p-3">{c.userName}</td>
                                                    <td className="p-3 text-gray-500">{c.customerCode}</td>
                                                    <td className="p-3 text-xs text-gray-500">{c.category || 'N/A'}</td>
                                                    <td className="p-3"><StatusBadge status={c.status} /></td>
                                                    <td className="p-3 text-gray-500">{new Date(c.createdAt).toLocaleDateString()}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Cards (Mobile) */}
                                <div className="lg:hidden space-y-4">
                                    {paginated.map((c) => (
                                        <div 
                                            key={c.id} 
                                            className={`border p-4 rounded-xl shadow-md cursor-pointer ${selected?.id === c.id ? 'bg-indigo-100 border-indigo-400' : 'bg-white hover:bg-gray-50'}`}
                                            onClick={() => openDetails(c)}
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <h3 className="font-bold text-lg text-indigo-700 truncate max-w-[70%]">{c.title}</h3>
                                                <StatusBadge status={c.status} />
                                            </div>
                                            <p className="text-sm text-gray-600 mb-1">User: {c.userName} ({c.customerCode})</p>
                                            <p className="text-xs text-gray-500 flex items-center gap-2">
                                                <FaCalendarAlt size={10} className="text-gray-400"/> {new Date(c.createdAt).toLocaleDateString()}
                                            </p>
                                            <div className="flex justify-end mt-3">
                                                <button onClick={(e) => { e.stopPropagation(); handleDelete(c.id); }} className="text-red-600 hover:text-red-800 text-sm flex items-center gap-1 p-1 rounded">
                                                    <FaTrash size={12} /> Delete
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                        
                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="mt-8 flex justify-center gap-2 text-sm">
                                <button
                                    onClick={() => setPage(Math.max(1, page - 1))}
                                    disabled={page === 1}
                                    className="px-4 py-2 border rounded-xl disabled:opacity-50 bg-gray-50 hover:bg-gray-100"
                                >
                                    <FaChevronLeft />
                                </button>
                                <span className="px-4 py-2 font-medium text-gray-700">Page {page} of {totalPages}</span>
                                <button
                                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                                    disabled={page === totalPages}
                                    className="px-4 py-2 border rounded-xl disabled:opacity-50 bg-gray-50 hover:bg-gray-100"
                                >
                                    <FaChevronRight />
                                </button>
                            </div>
                        )}
                    </motion.div>

                    {/* Right Panel: Details and Update (2/5 width on desktop) */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="lg:col-span-2 bg-white p-6 sm:p-8 rounded-2xl shadow-2xl border border-gray-100 sticky top-4 h-fit"
                    >
                        {!selected ? (
                            <div className="p-10 text-center text-gray-500 italic border-2 border-dashed rounded-xl">
                                Select a ticket from the list to view details and update its status.
                            </div>
                        ) : (
                            <>
                                <h3 className="text-2xl font-bold mb-2 text-gray-900">{selected.title}</h3>
                                <div className="flex flex-wrap gap-2 mb-4">
                                    <StatusBadge status={selected.status} />
                                    <span className="px-3 py-1 rounded-full text-xs bg-gray-100 text-gray-600 flex items-center gap-1"><FaTag size={10}/> {selected.category || 'N/A'}</span>
                                </div>

                                <div className="space-y-3 text-sm border-b pb-4 mb-4">
                                    <p className="text-gray-700">{selected.description}</p>
                                    <p className="text-gray-600 flex items-center gap-2"><FaUser size={12}/> User: {selected.userName} ({selected.customerCode})</p>
                                    <p className="text-gray-500 flex items-center gap-2"><FaCalendarAlt size={12}/> Created: {new Date(selected.createdAt).toLocaleString()}</p>
                                </div>
                                
                                {renderAttachments(selected.userAttachmentUrls, "Customer Attachments", setZoomedImage)}
                                
                                {/* Admin Actions Section */}
                                <div className="border-t mt-6 pt-4 space-y-4">
                                    <h4 className="font-bold text-lg text-indigo-700">Admin Actions</h4>
                                    
                                    <select
                                        value={updates.status}
                                        onChange={(e) => setUpdates({ ...updates, status: e.target.value })}
                                        className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 text-gray-700 bg-white"
                                    >
                                        <option value="Open">Open</option>
                                        <option value="In Progress">In Progress</option>
                                        <option value="Resolved">Resolved</option>
                                        <option value="Closed">Closed</option>
                                    </select>
                                    
                                    <textarea
                                        value={updates.adminResponse}
                                        onChange={(e) => setUpdates({ ...updates, adminResponse: e.target.value })}
                                        placeholder="Admin Response / Notes"
                                        className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 h-28 resize-none text-gray-800"
                                    />
                                    
                                    <div>
                                        <label className="block text-sm font-medium mb-2 text-gray-700">Upload Admin Attachments</label>
                                        <input
                                            type="file"
                                            multiple
                                            accept="image/*"
                                            onChange={(e) => setUpdates({ ...updates, attachments: Array.from(e.target.files) })}
                                            className="w-full text-sm p-2 border border-gray-300 rounded-lg bg-gray-50"
                                        />
                                        {/* Display attached file names if needed, or rely on file input feedback */}
                                    </div>

                                    {selected.adminAttachmentUrls && renderAttachments(selected.adminAttachmentUrls, "Previous Admin Attachments", setZoomedImage)}

                                    <div className="flex gap-3 pt-2">
                                        <motion.button
                                            whileTap={{ scale: 0.95 }}
                                            onClick={handleSaveUpdate}
                                            disabled={saving}
                                            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-60 shadow-md"
                                        >
                                            <FaSave /> {saving ? "Saving..." : "Save Update"}
                                        </motion.button>
                                        <button
                                            onClick={() => {
                                                setSelected(null);
                                                setUpdates({ status: "", adminResponse: "", attachments: [] });
                                            }}
                                            className="px-4 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition font-medium"
                                        >
                                            Close
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </motion.div>
                </div>

                {/* Zoom Modal */}
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
                            onClick={(e) => e.stopPropagation()}
                        />
                    </motion.div>
                )}
            </div>
        </div>
    );
}