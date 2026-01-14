import React, { useState, useEffect, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../../api";
import { FaRegCopy, FaCheck, FaCog, FaUsers, FaTrashAlt, FaPlus, FaChevronDown, FaChevronUp, FaSearch, FaArrowLeft } from "react-icons/fa";

export default function ProcurementsRequirementsModules() {
    const { id } = useParams();
    const [modules, setModules] = useState([]);
    const [companyName, setCompanyName] = useState("");
    const [customerName, setCustomerName,] = useState("");
    const [selectedModule, setSelectedModule] = useState(null);
    const [formOpen, setFormOpen] = useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [copied, setCopied] = useState(false);
    const [copiedQuery, setCopiedQuery] = useState(false);
    const [users, setUsers] = useState([]);
    const [targetUser, setTargetUser] = useState("");
    const [showUserList, setShowUserList] = useState(false);
    const [duplicates, setDuplicates] = useState([]);
    const [selectedModules, setSelectedModules] = useState([]);
    const [currentUserId, setCurrentUserId] = useState(id);
    const [batchDeleteModalOpen, setBatchDeleteModalOpen] = useState(false);
    const [loadingList, setLoadingList] = useState(false);
    const [saving, setSaving] = useState(false);
    const [executing, setExecuting] = useState(false);
    const [transferLoading, setTransferLoading] = useState(false);
    const [batchActionLoading, setBatchActionLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);

    // --- New State for Search ---
    const [searchTerm, setSearchTerm] = useState("");
    // --------------------------

    const [messages, setMessages] = useState({ type: "", text: "", visible: false });
    const [moduleToDelete, setModuleToDelete] = useState(null);
    const [formError, setFormError] = useState("");
    const [formSuccess, setFormSuccess] = useState("");

    const [formData, setFormData] = useState({
        id: 0,
        title: "",
        queryText: "",
        visualizationType: "table",
        primaryKeyColumn: "",
        insertQuery: "",
        updateQuery: ""
    });

    const [results, setResults] = useState([]);

    // Combined useEffect for initial load and ID changes
    useEffect(() => {
        setCurrentUserId(id);
        loadUserAndModules();
    }, [id]);

    // --- New Memoized Filtered List ---
    const filteredModules = useMemo(() => {
        if (!searchTerm) return modules;
        const lowerCaseSearch = searchTerm.toLowerCase();
        return modules.filter(module =>
            module.title.toLowerCase().includes(lowerCaseSearch) ||
            module.queryText.toLowerCase().includes(lowerCaseSearch)
        );
    }, [modules, searchTerm]);

    const totalModules = filteredModules.length;
    const shownModules = totalModules;

    const handleCopy = () => {
        navigator.clipboard.writeText(formData.queryText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleCopyQuery = () => {
        navigator.clipboard.writeText(selectedModule.queryText);
        setCopiedQuery(true);
        setTimeout(() => setCopiedQuery(false), 2000);
    };

    const showMessages = (type, text) => {
        setMessages({ type, text, visible: true });
        setTimeout(() => {
            setMessages({ type: "", text: "", visible: false });
        }, 3000);
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return "N/A";
        const date = new Date(dateStr);

        const day = String(date.getDate()).padStart(2, "0");
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const year = date.getFullYear();

        const hours = String(date.getHours()).padStart(2, "0");
        const minutes = String(date.getMinutes()).padStart(2, "0");
        const seconds = String(date.getSeconds()).padStart(2, "0");

        // Short format for list display
        return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
    };

    // Helper for short date format
    const formatShortDate = (dateStr) => {
        if (!dateStr) return "N/A";
        const date = new Date(dateStr);
        const day = String(date.getDate()).padStart(2, "0");
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    };

    const loadUserAndModules = async () => {
        setLoadingList(true);
        try {
            const modulesRes = await api.get(`/catalogs/user/${id}/queries`);
            const normalizedModules = (modulesRes.data || []).map((m) => ({
                id: m.id,
                title: m.title || "Untitled Module",
                queryText: m.queryText || "",
                visualizationType: m.visualizationType || "table",

                // ✅ NEW
                primaryKeyColumn: m.primaryKeyColumn || "",
                insertQuery: m.insertQuery || "",
                updateQuery: m.updateQuery || "",

                createdAt: m.queryCreatedAtTime,
                updatedAt: m.queryLastUpdated,
            }));
            setModules(normalizedModules);

            const userRes = await api.get(`/admin/users`);
            const activeUsers = (userRes.data || []).filter((u) => u.accountStatus === "Active");
            setUsers(activeUsers);

            const user = (userRes.data || []).find((u) => u.id === id);
            if (user) {
                setCompanyName(user.companyName || "Unknown Company");
                setCustomerName(user.customerName || "");
            } else {
                setCompanyName("Unknown Company");
                setCustomerName("");
            }
        } catch (err) {
            console.error("Failed to load user/modules", err);
            setModules([]);
            setCompanyName("Unknown Company");
            setCustomerName("");
        } finally {
            setLoadingList(false);
        }
    };

    const handleSelect = (m) => {
        setSelectedModule(m);
        setFormOpen(false);
        setResults([]);
        setFormError("");
        setFormSuccess("");
    };


    const handleDeleteConfirm = async () => {
        setActionLoading(true);
        try {
            await api.delete(`/catalogs/delete-query/${moduleToDelete.id}`);
            showMessages("success", "Module deleted successfully");
            await loadUserAndModules();
            if (selectedModule?.id === moduleToDelete.id) {
                setSelectedModule(null);
            }
        } catch (err) {
            showMessages("error", err.response?.data?.message || "Failed to delete module");
        } finally {
            setActionLoading(false);
            setDeleteModalOpen(false);
            setModuleToDelete(null);
        }
    };

    const handleExecute = async () => {
        if (!formData.queryText.trim()) {
            setFormError("Query cannot be empty");
            setFormSuccess("");
            return;
        }
        setExecuting(true);
        setFormError("");
        setFormSuccess("");
        try {
            const res = await api.post(
                `/catalogs/execute-user-query/${id}`,
                { QueryText: formData.queryText },
                { headers: { "Content-Type": "application/json" } }
            );

            if (res.data?.success) {
                setResults(res.data.data || []);
                setFormSuccess("Query executed successfully");
            } else {
                setResults([]);
                setFormError(res.data?.message || "Error executing query");
            }
        } catch (err) {
            console.error(err);
            setResults([]);
            setFormError(err.response?.data?.message || err.message || "Error executing query");
        } finally {
            setExecuting(false);
        }
    };

    const handleSave = async () => {
        if (!formData.queryText.trim()) {
            setFormError("Query cannot be empty");
            setFormSuccess("");
            return;
        }
        setSaving(true);
        setFormError("");
        setFormSuccess("");
        try {
            const execRes = await api.post(
                `/catalogs/execute-user-query/${id}`,
                { QueryText: formData.queryText },
                { headers: { "Content-Type": "application/json" } }
            );

            if (!execRes.data?.success) {
                setFormError(execRes.data?.message || "Query validation failed");
                return;
            }

            const payload = {
                id: formData.id,
                title: formData.title,
                queryText: formData.queryText,
                visualizationType: formData.visualizationType,

                // ✅ NEW
                primaryKeyColumn: formData.primaryKeyColumn,
                insertQuery: formData.insertQuery,
                updateQuery: formData.updateQuery
            };

            const saveRes = await api.post(
                `/catalogs/save-user-query/${id}`,
                payload,
                { headers: { "Content-Type": "application/json" } }
            );

            if (saveRes.data?.success) {
                setFormSuccess("Module saved successfully");
                setFormOpen(false);
                setResults(execRes.data.data || []);
                loadUserAndModules();
            } else {
                setFormError(saveRes.data?.message || "Failed to save module");
            }
        } catch (err) {
            console.error(err);
            setFormError(err.response?.data?.message || err.message || "Failed to save module");
        } finally {
            setSaving(false);
        }
    };

    const handleEdit = (m) => {
        setFormData({
            id: m.id || 0,
            title: m.title || "",
            queryText: m.queryText || "",
            visualizationType: m.visualizationType || "table",

            primaryKeyColumn: m.primaryKeyColumn || "",
            insertQuery: m.insertQuery || "",
            updateQuery: m.updateQuery || ""
        });
        setFormOpen(true);
        setSelectedModule(null);
    };


    const handleAddNew = () => {
        setFormData({ id: 0, title: "", queryText: "", visualizationType: "table" });
        setFormOpen(true);
        setSelectedModule(null);
        setResults([]);
        setFormError("");
        setFormSuccess("");
    };

    const handleTransferCheck = async () => {
        setTransferLoading(true);
        try {
            const res = await api.post("/catalogs/transfer-modules", {
                sourceUserId: currentUserId,
                targetUserId: targetUser,
                moduleIds: selectedModules,
                action: "check"
            });

            // DUPLICATES FOUND
            if (res.data.duplicates?.length > 0) {
                setDuplicates(res.data.duplicates);
                return;
            }

            // SAFE TRANSFER (no duplicates, capacity ok)
            showMessages("success", "Modules transferred successfully!");
            setShowUserList(false);
            loadUserAndModules();
        } catch (err) {
            showMessages("error", err.response?.data?.message || "Transfer check failed");
        } finally {
            setTransferLoading(false);
        }
    };


    const handleDuplicateAction = async (action) => {
        setTransferLoading(true);
        try {
            const res = await api.post("/catalogs/transfer-modules", {
                sourceUserId: currentUserId,
                targetUserId: targetUser,
                moduleIds: selectedModules,
                action
            });

            if (!res.data.success) {
                showMessages("error", res.data.message || "Transfer failed");
                return;
            }

            showMessages("success", res.data.message);
            setDuplicates([]);
            setShowUserList(false);
            loadUserAndModules();
        } catch (err) {
            showMessages("error", err.response?.data?.message || "Transfer failed");
        } finally {
            setTransferLoading(false);
        }
    };

    // 🔴 Batch Delete
    const handleBatchDelete = async () => {
        if (selectedModules.length === 0) return;
        setBatchActionLoading(true);

        const failures = [];

        for (const id of selectedModules) {
            try {
                await api.delete(`/catalogs/delete-query/${id}`);
            } catch (err) {
                failures.push(id);
            }
        }

        if (failures.length === 0) {
            showMessages("success", "Selected modules deleted");
        } else {
            showMessages("error", `${failures.length} deletes failed`);
        }

        setBatchActionLoading(false);
        setBatchDeleteModalOpen(false);
        setSelectedModules([]);
        loadUserAndModules();
    };


    return (
        <div className="min-h-screen flex flex-col bg-gray-50 font-sans">
            {(loadingList ||
                saving ||
                executing ||
                transferLoading ||
                batchActionLoading ||
                actionLoading) && (
                    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-[60]">
                        <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-indigo-500"></div>
                    </div>
                )}

            {/* Header & Breadcrumb */}
            <header className="bg-white p-4 sm:p-6 border-b shadow-sm">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 max-w-7xl mx-auto">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-800 flex items-center gap-2">
                            <FaCog className="text-indigo-600" /> Procurements Requirements Modules for <span className="text-indigo-600">{companyName}</span>
                        </h1>
                        {customerName && <p className="text-sm sm:text-lg text-gray-500 mt-1 ml-8">Customer Name: {customerName}</p>}
                    </div>
                    <Link
                        to={`/erp/${id}/procurements`}
                        state={{ keepFilters: true }}
                        className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg font-semibold hover:bg-indigo-200 transition-colors flex items-center gap-1 text-sm"
                    >
                        <FaArrowLeft className="text-indigo-500" /> Back to Procurements
                    </Link>
                </div>
            </header>

            {/* Global Messages */}
            {messages.text && (
                <div
                    className={`p-3 text-center text-sm transition-opacity duration-500 z-40 ${messages.type === "success"
                        ? "bg-green-100 text-green-800 border-b-2 border-green-400"
                        : "bg-red-100 text-red-800 border-b-2 border-red-400"
                        } ${messages.visible ? "opacity-100" : "opacity-0"}`}
                >
                    {messages.text}
                </div>
            )}

            {/* Content Area: Split into two main columns (33.3% / 66.7% for lg screens) */}
            <div className="flex flex-1 flex-col lg:flex-row max-w-7xl mx-auto w-full p-4 sm:p-6 gap-6">
                {/* Left Column: Module List & Management (33.3%) */}
                <section className="flex-1 lg:w-4/12 flex flex-col space-y-6">
                    {/* --- Module List Content --- */}
                    <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 flex flex-col">
                        <div className="flex justify-between items-center mb-4 border-b pb-3">
                            <h2 className="text-xl font-bold text-gray-700">Assigned Modules ({filteredModules.length})</h2>
                            <div className="flex gap-3">
                                <button
                                    onClick={handleAddNew}
                                    className="px-3 py-1.5 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center gap-1 text-sm"
                                >
                                    <FaPlus /> New Module
                                </button>
                                <button
                                    disabled={selectedModules.length === 0}
                                    onClick={() => setShowUserList(true)}
                                    className="px-4 py-1.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm"
                                >
                                    Transfer ({selectedModules.length})
                                </button>
                            </div>
                        </div>

                        {/* --- NEW: Search Bar --- */}
                        <div className="relative mb-4">
                            <input
                                type="text"
                                placeholder="Search modules by title or query..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full p-2 pl-10 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                            />
                            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        </div>
                        {/* ------------------------- */}


                        {/* Select All + Batch Actions */}
                        <div className="space-y-3 mb-4">

                            {/* Select All Row */}
                            <div className="flex items-center gap-3 p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                                <input
                                    type="checkbox"
                                    checked={selectedModules.length === filteredModules.length && filteredModules.length > 0}
                                    onChange={(e) => {
                                        if (e.target.checked) {
                                            setSelectedModules(filteredModules.map((m) => m.id));
                                        } else {
                                            setSelectedModules([]);
                                        }
                                    }}
                                    className="w-4 h-4 accent-indigo-600"
                                />
                                <label className="text-sm font-medium text-indigo-800">
                                    Select All Modules ({filteredModules.length})
                                </label>
                            </div>

                            {/* Batch Actions (only visible when one or more modules are selected) */}
                            {selectedModules.length > 0 && (
                                <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">

                                    <button
                                        onClick={() => setBatchDeleteModalOpen(true)}
                                        className="px-3 py-1.5 bg-red-100 text-red-700 rounded-md text-sm font-medium"
                                    >
                                        🗑 Delete Selected
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Scrollable Module List */}
                        <ul className="space-y-4 flex-1 overflow-y-auto max-h-[75vh] pr-2 -mr-2">
                            {filteredModules.length === 0 ? (
                                <p className="text-center p-8 text-gray-500 bg-gray-100 rounded-lg italic">
                                    {searchTerm ? "No modules match your search." : "No modules defined for this user. Add a new one above."}
                                </p>
                            ) : (
                                filteredModules.map((m) => (
                                    <li
                                        key={m.id}
                                        className={`p-4 rounded-xl shadow-md transition-all border ${selectedModules.includes(m.id)
                                            ? "border-4 border-indigo-500 bg-indigo-50"
                                            : "border-gray-200 hover:shadow-lg bg-white"
                                            }`}
                                    >
                                        <div className="flex justify-between items-start">
                                            {/* Module Info Click Target */}
                                            <div
                                                onClick={() => handleSelect(m)}
                                                className="flex-1 ml-2 cursor-pointer min-w-0"
                                            >
                                                <div className="font-bold text-lg text-gray-900 truncate">
                                                    {m.title || "Untitled Module"}
                                                </div>

                                                {/* --- MODIFIED: Date/Type in single horizontal line --- */}
                                                <div className="text-xs text-gray-500 mt-1 flex whitespace-nowrap">
                                                    <span>
                                                        Type: <span className="font-semibold text-blue-700">{m.visualizationType.toUpperCase()}</span>
                                                    </span>
                                                    <span className="px-1 text-gray-400">|</span>
                                                    <span>
                                                        Created: <span className="font-medium">{formatShortDate(m.createdAt)}</span>
                                                    </span>
                                                    <span className="px-1 text-gray-400">|</span>
                                                    <span>
                                                        Updated: <span className="font-medium">{formatShortDate(m.updatedAt)}</span>
                                                    </span>
                                                </div>
                                                {/* ---------------------------------------------------- */}
                                            </div>

                                            {/* Checkbox for Batch Transfer */}
                                            <input
                                                type="checkbox"
                                                checked={selectedModules.includes(m.id)}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setSelectedModules([...selectedModules, m.id]);
                                                    } else {
                                                        setSelectedModules(selectedModules.filter((mid) => mid !== m.id));
                                                    }
                                                }}
                                                onClick={(e) => e.stopPropagation()} // Prevent triggering handleSelect
                                                className="w-4 h-4 accent-indigo-600 ml-4 mt-1"
                                            />
                                        </div>

                                        {/* Action Buttons */}
                                        <div
                                            className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-100"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <button
                                                onClick={() => handleEdit(m)}
                                                className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 text-xs font-medium transition-colors"
                                            >
                                                ✎ Edit
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setModuleToDelete(m);
                                                    setDeleteModalOpen(true);
                                                }}
                                                className="px-3 py-1 bg-red-100 text-red-700 font-medium rounded-lg hover:bg-red-200 text-xs transition-colors"
                                            >
                                                🗑 Delete
                                            </button>
                                        </div>
                                    </li>
                                ))
                            )}
                        </ul>
                    </div>
                </section>

                {/* Right Column: Action Panel (Suggestions / Form / Details) (66.7%) */}
                <aside className="lg:w-8/12 flex flex-col space-y-6">

                    {/* --- Module Form/Details Panel --- */}
                    <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
                        <h2 className="text-xl font-bold text-indigo-700 mb-4 border-b pb-2 flex items-center gap-2">
                            <FaCog className="text-indigo-600" /> {formOpen ? (formData.id ? "Edit Module" : "Add Module") : (selectedModule ? "Module Details" : "Action Panel")}
                        </h2>

                        {/* --- Form View --- */}
                        {formOpen ? (
                            <div className="space-y-4">
                                {formError && (
                                    <div className="p-3 bg-red-100 text-red-700 rounded text-sm border border-red-300">
                                        {formError}
                                    </div>
                                )}
                                {formSuccess && (
                                    <div className="p-3 bg-green-100 text-green-700 rounded text-sm border border-green-300">
                                        {formSuccess}
                                    </div>
                                )}

                                {/* Form Fields */}
                                <input
                                    type="text"
                                    placeholder="Module Title"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    className="w-full p-2 border border-gray-300 rounded focus:ring-indigo-500 focus:border-indigo-500"
                                />
                                <div className="relative">
                                    <textarea
                                        rows="5"
                                        placeholder="SQL Query"
                                        value={formData.queryText}
                                        onChange={(e) => setFormData({ ...formData, queryText: e.target.value })}
                                        className="w-full p-2 border border-gray-300 rounded font-mono text-sm resize-none focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleCopy}
                                        className="absolute top-2 right-2 p-1 text-indigo-600 hover:text-indigo-800 transition-colors text-lg"
                                        title={copied ? "Copied!" : "Copy SQL query"}
                                    >
                                        {copied ? <FaCheck /> : <FaRegCopy />}
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 gap-4 pt-3 border-t">
                                    <h4 className="font-semibold text-indigo-700 text-sm">
                                        Editable Table Settings
                                    </h4>

                                    <input
                                        type="text"
                                        placeholder="Primary Key Column (e.g. ProductId)"
                                        value={formData.primaryKeyColumn}
                                        onChange={(e) =>
                                            setFormData({ ...formData, primaryKeyColumn: e.target.value })
                                        }
                                        className="w-full p-2 border border-gray-300 rounded focus:ring-indigo-500"
                                    />

                                    <textarea
                                        rows={4}
                                        placeholder="INSERT Query (use @ColumnName parameters)"
                                        value={formData.insertQuery}
                                        onChange={(e) =>
                                            setFormData({ ...formData, insertQuery: e.target.value })
                                        }
                                        className="w-full p-2 border border-gray-300 rounded font-mono text-sm"
                                    />

                                    <textarea
                                        rows={4}
                                        placeholder="UPDATE Query (must include WHERE using primary key)"
                                        value={formData.updateQuery}
                                        onChange={(e) =>
                                            setFormData({ ...formData, updateQuery: e.target.value })
                                        }
                                        className="w-full p-2 border border-gray-300 rounded font-mono text-sm"
                                    />
                                </div>
                                <select
                                    value={formData.visualizationType}
                                    onChange={(e) => setFormData({ ...formData, visualizationType: e.target.value })}
                                    className="w-full p-2 border border-gray-300 rounded focus:ring-indigo-500 focus:border-indigo-500"
                                >
                                    <option value="table">Table</option>
                                    <option value="bar">Bar Chart</option>
                                    <option value="pie">Pie Chart</option>
                                    <option value="area">Area Chart</option>
                                    <option value="line">Line Chart</option>
                                    <option value="kpi">KPI Card</option>
                                    <option value="heatmap">Heat Map</option>
                                    <option value="map">Map</option>
                                </select>

                                {/* Form Actions */}
                                <div className="flex justify-end gap-3 pt-3 border-t">
                                    <button onClick={() => setFormOpen(false)} className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors text-sm">
                                        Cancel
                                    </button>
                                    <button onClick={handleExecute} className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm">
                                        Test Run
                                    </button>
                                    <button onClick={handleSave} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-semibold">
                                        {formData.id ? "Update Module" : "Create Module"}
                                    </button>
                                </div>

                                {/* Execution Results */}
                                {results?.length > 0 && (
                                    <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200 max-h-60 overflow-auto">
                                        <h4 className="font-semibold text-sm mb-2">Query Results ({results.length} rows):</h4>
                                        <table className="w-full border-collapse text-xs">
                                            <thead className="sticky top-0 bg-blue-100">
                                                <tr>
                                                    {Object.keys(results[0] || {}).map((col) => (
                                                        <th key={col} className="px-2 py-1 border text-left font-medium">{col}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {results.map((row, i) => (
                                                    <tr key={i} className="odd:bg-white even:bg-blue-50">
                                                        {Object.keys(row).map((col) => (
                                                            <td key={col} className="px-2 py-1 border truncate max-w-[100px]">{row[col]}</td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        ) : selectedModule ? (
                            // --- Module Details View (Read-Only) ---
                            <div className="space-y-4">
                                <p className="text-sm text-gray-500">
                                    Last Updated: {formatDate(selectedModule.updatedAt)}
                                </p>

                                <div className="border p-3 rounded-lg bg-gray-50">
                                    <label className="block text-xs font-semibold uppercase mb-1 text-gray-600">SQL Query</label>
                                    <div className="relative">
                                        <code className="block text-xs sm:text-sm font-mono break-all bg-gray-100 p-2 rounded">{selectedModule.queryText}</code>
                                        <button
                                            type="button"
                                            onClick={handleCopyQuery}
                                            className="absolute top-1 right-1 p-1 text-indigo-600 hover:text-indigo-800 transition-colors text-sm"
                                            title={copiedQuery ? "Copied!" : "Copy SQL query"}
                                        >
                                            {copiedQuery ? <FaCheck /> : <FaRegCopy />}
                                        </button>
                                    </div>
                                </div>

                                <p className="text-gray-700 text-sm">
                                    <strong>Visualization:</strong> {selectedModule.visualizationType.charAt(0).toUpperCase() + selectedModule.visualizationType.slice(1)}
                                </p>

                                <div className="flex gap-3 pt-3 border-t">
                                    <button
                                        onClick={() => handleEdit(selectedModule)}
                                        className="px-4 py-2 bg-yellow-100 text-yellow-700 font-medium rounded-lg hover:bg-yellow-200 transition-colors text-sm flex-1"
                                    >
                                        ✎ Edit
                                    </button>
                                    <button
                                        onClick={() => {
                                            setModuleToDelete(selectedModule);
                                            setDeleteModalOpen(true);
                                        }}
                                        className="px-4 py-2 bg-red-100 text-red-700 font-medium rounded-lg hover:bg-red-200 transition-colors text-sm flex-1"
                                    >
                                        🗑 Delete
                                    </button>
                                </div>
                            </div>
                        ) : (
                            // --- Default State ---
                            <div className="flex flex-col items-center justify-center text-center p-8 bg-gray-50 rounded-lg border border-dashed border-gray-300 h-40">
                                <p className="text-gray-500 mb-2">
                                    Select a module from the list to view/edit its details, or click a suggestion to manage it.
                                </p>
                                <button
                                    onClick={handleAddNew}
                                    className="text-indigo-600 hover:text-indigo-800 font-medium text-sm flex items-center gap-1 mt-2"
                                >
                                    <FaPlus /> Create a New Module
                                </button>
                            </div>
                        )}
                    </div>
                </aside>
            </div>

            {/* --- Modals --- */}

            {/* Delete Module Modal */}
            {deleteModalOpen && (
                <div className="fixed inset-0 flex items-center justify-center bg-black/60 z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 border-t-4 border-red-500">
                        <h4 className="text-xl font-bold text-red-700 mb-4 flex items-center gap-2"><FaTrashAlt className="text-red-500" /> Confirm Deletion</h4>
                        <p className="text-gray-700 mb-6">
                            Are you sure you want to permanently delete the module: <br />
                            <strong className="text-lg block mt-2 text-gray-900">"{moduleToDelete?.title}"</strong>
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setDeleteModalOpen(false)}
                                className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteConfirm}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                            >
                                Yes, Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {batchDeleteModalOpen && (
                <div className="fixed inset-0 flex items-center justify-center bg-black/60 z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 border-t-4 border-red-500">
                        <h4 className="text-xl font-bold text-red-700 mb-4 flex items-center gap-2">
                            <FaTrashAlt className="text-red-500" /> Delete Selected Modules
                        </h4>

                        <p className="text-gray-700 mb-6">
                            Are you sure you want to delete <strong>{selectedModules.length}</strong> modules?
                            This action cannot be undone.
                        </p>

                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setBatchDeleteModalOpen(false)}
                                className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleBatchDelete}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                            >
                                Yes, Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}


            {/* Transfer User List Modal */}
            {showUserList && (
                <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl border-t-4 border-blue-500">
                        <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2"><FaUsers className="text-blue-500" /> Transfer Modules</h3>
                        <p className="text-sm text-gray-600 mb-3">Transfer {selectedModules.length} selected module(s) from current user to:</p>
                        {messages.type === "error" && (
                            <p className="text-red-600 text-sm mt-2">{messages.text}</p>
                        )}
                        <select
                            className="w-full border-2 border-gray-300 rounded-lg p-3 mb-6 text-base focus:ring-blue-500 focus:border-blue-500"
                            value={targetUser}
                            onChange={(e) => setTargetUser(e.target.value)}
                        >
                            <option value="">Select a target user...</option>
                            {users.map((u) => (
                                <option key={u.id} value={u.id} disabled={u.id === id}>
                                    {u.companyName} {u.id === id && "(This User)"}
                                </option>
                            ))}
                        </select>
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setShowUserList(false)} className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors">Cancel</button>
                            <button
                                onClick={handleTransferCheck}
                                disabled={!targetUser}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
                            >
                                Transfer
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Duplicate Transfer Modal */}
            {duplicates.length > 0 && (
                <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl p-6 max-w-lg w-full shadow-2xl border-t-4 border-yellow-500">
                        <h3 className="text-xl font-bold mb-3 text-yellow-700">⚠️ Module Transfer Conflict</h3>
                        <p className="text-gray-700 mb-3">The following module(s) already exist in the target user's list and must be resolved:</p>
                        {messages.type === "error" && (
                            <p className="text-red-600 text-sm mt-2">{messages.text}</p>
                        )}
                        <ul className="mb-5 p-3 bg-yellow-50 rounded border border-yellow-200 max-h-40 overflow-y-auto text-sm">
                            {duplicates.map((d) => <li key={d.id} className="flex items-center gap-2"><FaRegCopy className="text-yellow-600" /> {d.title}</li>)}
                        </ul>
                        <div className="flex justify-end gap-3 flex-wrap">
                            <button onClick={() => handleDuplicateAction("cancel")} className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors text-sm">Cancel Transfer</button>
                            <button onClick={() => handleDuplicateAction("ignore")} className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors text-sm">Ignore Duplicates</button>
                            <button onClick={() => handleDuplicateAction("replace")} className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm">Replace Existing</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}