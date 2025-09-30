// src/pages/UserModules.jsx
import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../api";
import { FaRegCopy, FaCheck } from "react-icons/fa";

export default function UserModules() {
    const { id } = useParams();
    const [modules, setModules] = useState([]);
    const [companyName, setCompanyName] = useState("");
    const [customerName, setCustomerName] = useState("");
    const [selectedModule, setSelectedModule] = useState(null);
    const [formOpen, setFormOpen] = useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [copied, setCopied] = useState(false);
    const [copiedQuery, setCopiedQuery] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(formData.sqlQuery);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleCopyQuery = () => {
        navigator.clipboard.writeText(selectedModule.sqlQuery);
        setCopiedQuery(true);
        setTimeout(() => setCopiedQuery(false), 2000);
    };
    
    const [messages, setMessages] = useState({ type: "", text: "", visible: false });
    const [moduleToDelete, setModuleToDelete] = useState(null);
    const [formError, setFormError] = useState("");
    const [formSuccess, setFormSuccess] = useState("");

    const [formData, setFormData] = useState({
        id: 0,
        title: "",
        sqlQuery: "",
        visualizationType: "table",
    });

    const [results, setResults] = useState([]);

    useEffect(() => {
        loadUserAndModules();
    }, [id]);

    const showMessages = (type, text) => {
        setMessages({ type, text, visible: true });
        setTimeout(() => {
            setMessages({ type: "", text: "", visible: false });
        }, 3000);
    };

    const loadUserAndModules = async () => {
        try {
            const modulesRes = await api.get(`/admin/user/${id}/queries`);
            const normalizedModules = (modulesRes.data || []).map((m) => ({
                id: m.userQueryId,
                title: m.userTitle || "Untitled Module",
                sqlQuery: m.userQueryText || "",
                visualizationType: m.visualizationType || "table",
            }));
            setModules(normalizedModules);

            const userRes = await api.get(`/admin/users`);
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
        try {
            await api.delete(`/admin/delete-query/${moduleToDelete.id}`);
            showMessages("success", "Module deleted successfully");
            await loadUserAndModules();
            if (selectedModule?.id === moduleToDelete.id) {
                setSelectedModule(null);
            }
        } catch (err) {
            showMessages("error", err.response?.data?.message || "Failed to delete module");
        } finally {
            setDeleteModalOpen(false);
            setModuleToDelete(null);
        }
    };

    const handleExecute = async () => {
        if (!formData.sqlQuery.trim()) {
            setFormError("Query cannot be empty");
            setFormSuccess("");
            return;
        }
        setFormError("");
        setFormSuccess("");
        try {
            const res = await api.post(
                `/admin/execute-user-query/${id}`,
                { SqlQuery: formData.sqlQuery },
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
        }
    };

    const handleSave = async () => {
        if (!formData.sqlQuery.trim()) {
            setFormError("Query cannot be empty");
            setFormSuccess("");
            return;
        }
        setFormError("");
        setFormSuccess("");
        try {
            const execRes = await api.post(
                `/admin/execute-user-query/${id}`,
                { SqlQuery: formData.sqlQuery },
                { headers: { "Content-Type": "application/json" } }
            );

            if (!execRes.data?.success) {
                setFormError(execRes.data?.message || "Query validation failed");
                return;
            }

            const payload = {
                userQueryId: formData.id,
                userTitle: formData.title,
                userQueryText: formData.sqlQuery,
                visualizationType: formData.visualizationType,
            };

            const saveRes = await api.post(
                `/admin/save-user-query/${id}`,
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
        }
    };

    const handleEdit = (m) => {
        setFormData({
            id: m.id || 0,
            title: m.title || "",
            sqlQuery: m.sqlQuery || "",
            visualizationType: m.visualizationType || "table",
        });
        setFormOpen(true);
        setSelectedModule(null);
        setResults([]);
        setFormError("");
        setFormSuccess("");
    };

    const handleAddNew = () => {
        setFormData({ id: 0, title: "", sqlQuery: "", visualizationType: "table" });
        setFormOpen(true);
        setSelectedModule(null);
        setResults([]);
        setFormError("");
        setFormSuccess("");
    };

    return (
        <div className="min-h-screen flex flex-col bg-gradient-to-r from-indigo-50 to-blue-100">
            {/* Header */}
            <header className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white p-6 shadow-lg flex flex-col sm:flex-row justify-between gap-4">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold">📊 Modules for {companyName}</h1>
                    {customerName && <p className="text-sm sm:text-xl px-1 text-indigo-100 mt-1">Customer: {customerName}</p>}
                </div>
                <Link
                    to="/admin/users"
                    className="px-4 py-2 bg-white text-indigo-700 rounded-lg font-semibold hover:bg-gray-100 flex items-center justify-center"
                >
                    ⬅ Back to Users
                </Link>
            </header>

            {messages.text && (
                <div
                    className={`p-3 text-center text-sm sm:text-base transition-opacity duration-500 ${messages.type === "success"
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                        } ${messages.visible ? "opacity-100" : "opacity-0"}`}
                >
                    {messages.text}
                </div>
            )}

            {/* Content */}
            <div className="flex flex-1 flex-col lg:flex-row">
                {/* Sidebar */}
                <aside className="w-full lg:w-96 bg-white shadow-xl p-6 border-r flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg sm:text-xl font-bold">Module List</h2>
                        <button
                            onClick={handleAddNew}
                            className="px-3 py-1 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                        >
                            ＋ Add
                        </button>
                    </div>

                    {/* Scrollable list */}
                    <ul className="space-y-3 flex-1 overflow-y-auto max-h-[60vh] pr-2">
                        {modules.length === 0 && (
                            <li className="text-gray-500 italic">No modules defined for this user.</li>
                        )}
                        {modules.map((m) => (
                            <li
                                key={m.id}
                                onClick={() => handleSelect(m)}
                                className={`p-5 rounded-xl bg-gradient-to-r from-indigo-100 to-blue-100 shadow transition cursor-pointer ${selectedModule?.id === m.id ? "border-4 border-indigo-400" : ""
                                    }`}
                            >
                                <div className="font-bold text-lg sm:text-xl text-gray-900">
                                    {m.title || "Untitled Module"}
                                </div>

                                <div className="text-sm sm:text-base text-gray-800 mt-2">
                                    Visualization:{" "}
                                    <span className="font-semibold text-indigo-700">
                                        {m.visualizationType.charAt(0).toUpperCase() +
                                            m.visualizationType.slice(1)}
                                    </span>
                                </div>

                                <div
                                    className="flex flex-wrap gap-3 mt-3 text-sm sm:text-md"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    {/* <button
                                        onClick={() => handleExecute(m)}
                                        className="px-3 py-1.5 sm:px-4 sm:py-2 bg-green-100 text-green-700 font-medium rounded-lg hover:bg-green-200"
                                    >
                                        ▶ Run
                                    </button> */}
                                    <button
                                        onClick={() => handleEdit(m)}
                                        className="px-3 py-1.5 sm:px-4 sm:py-2 bg-yellow-100 text-yellow-700 font-medium rounded-lg hover:bg-yellow-200"
                                    >
                                        ✎ Edit
                                    </button>
                                    <button
                                        onClick={() => {
                                            setModuleToDelete(m);
                                            setDeleteModalOpen(true);
                                        }}
                                        className="px-3 py-1.5 sm:px-4 sm:py-2 bg-red-100 text-red-700 font-medium rounded-lg hover:bg-red-200"
                                    >
                                        🗑 Delete
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                    {modules.length > 0 && (
                        <>
                            <hr className="my-3 border-black" />
                            <div className="mt-2 text-xl text-center font-bold">
                                Total Modules: {modules.length}
                            </div>
                        </>
                    )}
                </aside>

                {/* Main Content */}
                <main className="flex-1 p-4 sm:p-6 lg:p-10 overflow-y-auto">
                    {formOpen ? (
                        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-md">
                            <h2 className="text-lg font-bold mb-4">
                                {formData.id ? "Edit Module" : "Add Module"}
                            </h2>

                            {formError && (
                                <div className="p-2 bg-red-100 text-red-700 rounded text-sm mb-2">
                                    {formError}
                                </div>
                            )}
                            {formSuccess && (
                                <div className="p-2 bg-green-100 text-green-700 rounded text-sm mb-2">
                                    {formSuccess}
                                </div>
                            )}

                            <div className="pt-2 space-y-4">
                                <input
                                    type="text"
                                    placeholder="Module Title"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    className="w-full p-2 border rounded"
                                />
                                <div className="relative w-full">
                                    <textarea
                                        rows="6"
                                        placeholder="SQL Query"
                                        value={formData.sqlQuery}
                                        onChange={(e) => setFormData({ ...formData, sqlQuery: e.target.value })}
                                        className="w-full p-2 border rounded font-mono text-sm resize-none"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleCopy}
                                        className="absolute top-2 right-2 p-1 text-blue-600 hover:text-blue-800 transition-colors"
                                        title={copied ? "Copied!" : "Copy SQL query"}
                                    >
                                        {copied ? <FaCheck className="text-blue-600" /> : <FaRegCopy />}
                                    </button>
                                </div>
                                <select
                                    value={formData.visualizationType}
                                    onChange={(e) =>
                                        setFormData({ ...formData, visualizationType: e.target.value })
                                    }
                                    className="w-full p-2 border rounded"
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
                            </div>

                            <div className="flex flex-col sm:flex-row justify-between gap-3 mt-4">
                                <button
                                    onClick={handleExecute}
                                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                                >
                                    ▶ Execute
                                </button>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setFormOpen(false)}
                                        className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSave}
                                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                                    >
                                        Save
                                    </button>
                                </div>
                            </div>

                            {results?.length > 0 && (
                                <div className="overflow-auto mt-6 border rounded text-xs sm:text-sm">
                                    <table className="w-full border-collapse">
                                        <thead className="bg-gray-100">
                                            <tr>
                                                {Object.keys(results[0] || {}).map((col) => (
                                                    <th key={col} className="px-3 py-2 border">
                                                        {col}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {results.map((row, i) => (
                                                <tr key={i} className="odd:bg-white even:bg-gray-50">
                                                    {Object.keys(row).map((col) => (
                                                        <td key={col} className="px-3 py-2 border">
                                                            {row[col]}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    ) : selectedModule ? (
                        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-md max-w-4xl mx-auto relative">
                            <h2 className="text-lg sm:text-2xl font-bold mb-4">{selectedModule.title}</h2>

                            <p className="mb-2 text-gray-700 text-sm sm:text-base flex items-start gap-2">
                                <strong>Query:</strong>
                                <code className="break-all">{selectedModule.sqlQuery}</code>

                                {/* Copy button */}
                                <button
                                    type="button"
                                    onClick={handleCopyQuery}
                                    className="ml-2 p-1 text-blue-600 hover:text-blue-800 transition-colors"
                                    title={copiedQuery ? "Copied!" : "Copy SQL query"}
                                >
                                    {copiedQuery ? <FaCheck className="text-blue-600" /> : <FaRegCopy />}
                                </button>
                            </p>

                            <p className="mb-2 text-gray-700 text-sm sm:text-base">
                                <strong>Visualization:</strong> {selectedModule.visualizationType.charAt(0).toUpperCase() +
                                    selectedModule.visualizationType.slice(1)}
                            </p>
                            <div
                                className="flex flex-wrap gap-3 mt-3 text-sm sm:text-lg"
                            >
                                <button
                                    onClick={() => handleEdit(selectedModule)}
                                    className="px-3 py-1.5 sm:px-4 sm:py-2 bg-yellow-100 text-yellow-700 font-medium rounded-lg hover:bg-yellow-200"
                                >
                                    ✎ Edit
                                </button>
                                <button
                                    onClick={() => {
                                        setModuleToDelete(selectedModule);
                                        setDeleteModalOpen(true);
                                    }}
                                    className="px-3 py-1.5 sm:px-4 sm:py-2 bg-red-100 text-red-700 font-medium rounded-lg hover:bg-red-200"
                                >
                                    🗑 Delete
                                </button>
                            </div>
                        </div>

                    ) : (
                        <div className="flex items-center justify-center text-gray-500 text-sm sm:text-lg">
                            Select a module from the module list to view details.
                        </div>
                    )}
                </main>
            </div>

            {/* Delete Modal */}
            {deleteModalOpen && (
                <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6">
                        <h4 className="text-lg font-semibold mb-4">Confirm Delete</h4>
                        <p className="text-sm sm:text-md mb-6">
                            Are you sure you want to delete the module "{moduleToDelete?.title}"?
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setDeleteModalOpen(false)}
                                className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteConfirm}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                            >
                                Yes, Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
