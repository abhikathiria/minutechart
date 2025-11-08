// src/pages/UserModules.jsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { FaRegCopy, FaCheck, FaTimes, FaPencilAlt, FaTrashAlt, FaEye, FaEyeSlash, FaPlus, FaArrowLeft } from "react-icons/fa";
import { List, Send, LayoutList, TrendingUp, Users, Loader2 } from "lucide-react"; 
import api from "../api";

// --- Reusable Components (For better structure) ---

const ModalWrapper = ({ children, onClose, title, icon: Icon, colorClass = "text-indigo-600" }) => (
    <div className="fixed inset-0 flex items-center justify-center bg-black/60 z-50 p-4 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-8 animate-in fade-in zoom-in duration-300 border-t-4 border-indigo-600">
            <div className="flex justify-between items-center mb-4">
                <h4 className={`text-xl font-bold flex items-center gap-2 ${colorClass}`}>
                    {Icon && <Icon className="w-5 h-5"/>} {title}
                </h4>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition">
                    <FaTimes className="w-5 h-5"/>
                </button>
            </div>
            {children}
        </div>
    </div>
);

export default function UserModules() {
    const { id } = useParams();
    // --- State Initialization ---
    const [modules, setModules] = useState([]);
    const [companyName, setCompanyName] = useState("");
    const [customerName, setCustomerName] = useState("");
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
    const [isExecuting, setIsExecuting] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isModulesLoading, setIsModulesLoading] = useState(true);

    // Ref for the main content area to handle scrolling
    const mainContentRef = useRef(null); 

    // Notification State
    const [messages, setMessages] = useState({ type: "", text: "", visible: false });
    const [moduleToDelete, setModuleToDelete] = useState(null);
    const [formError, setFormError] = useState("");
    const [formSuccess, setFormSuccess] = useState("");

    // Form Data State
    const [formData, setFormData] = useState({
        id: 0,
        title: "",
        sqlQuery: "",
        visualizationType: "table",
        isApprovalModule: false,
        approvalUpdateQuery: "",
        approvalIdColumn: "",
    });

    const [results, setResults] = useState([]);

    // --- Utility & Handlers ---

    // Function to handle auto-scrolling
    const scrollToMainContent = () => {
        if (mainContentRef.current) {
            mainContentRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    const showMessages = (type, text) => {
        setMessages({ type, text, visible: true });
        setTimeout(() => {
            setMessages({ type: "", text: "", visible: false });
        }, 3000);
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return "N/A";
        try {
            const date = new Date(dateStr);
            return date.toLocaleDateString('en-GB') + ' ' + date.toLocaleTimeString('en-GB');
        } catch {
            return "Invalid Date";
        }
    };
    
    const handleCopy = (query, setter) => {
        navigator.clipboard.writeText(query);
        setter(true);
        setTimeout(() => setter(false), 2000);
    };

    const handleCopyQueryDetail = () => {
        if (selectedModule) {
            handleCopy(selectedModule.sqlQuery, setCopiedQuery);
        }
    };
    
    const handleCopyFormQuery = () => {
        handleCopy(formData.sqlQuery, setCopied);
    };

    const loadUserAndModules = useCallback(async () => {
        setIsModulesLoading(true);
        try {
            // 1. Fetch Modules
            const modulesRes = await api.get(`/admin/user/${id}/queries`);
            const normalizedModules = (modulesRes.data || []).map((m) => ({
                id: m.userQueryId,
                title: m.userTitle || "Untitled Module",
                sqlQuery: m.userQueryText || "",
                visualizationType: m.visualizationType || "table",
                createdAt: m.userQueryCreatedAtTime,
                updatedAt: m.userQueryLastUpdated,
                hideQuery: m.hideQuery || false,
                isApprovalModule: m.isApprovalModule || false,
                approvalUpdateQuery: m.approvalUpdateQuery || "",
                approvalIdColumn: m.approvalIdColumn || "",
            }));
            setModules(normalizedModules);

            // 2. Fetch Users to get Company/Customer Name
            const userRes = await api.get(`/admin/users`);
            const allUsers = userRes.data || [];
            const activeUsers = allUsers.filter((u) => u.accountStatus === "Active");
            setUsers(activeUsers);

            const user = allUsers.find((u) => u.id === id);
            if (user) {
                setCompanyName(user.companyName || "Unknown Company");
                setCustomerName(user.customerName || "");
            } else {
                setCompanyName("Unknown Company");
                setCustomerName("");
            }
        } catch (err) {
            console.error("Failed to load user/modules", err);
            showMessages("error", "Failed to load user data or modules.");
        } finally {
            setIsModulesLoading(false);
        }
    }, [id]);

    useEffect(() => {
        setCurrentUserId(id);
        loadUserAndModules();
    }, [id, loadUserAndModules]);

    const handleSelect = (m) => {
        setSelectedModule(m);
        setFormOpen(false);
        setResults([]);
        setFormError("");
        setFormSuccess("");
        scrollToMainContent(); // <<< ADDED SCROLLING
    };

    const handleEdit = (m) => {
        setFormData({
            id: m.id || 0,
            title: m.title || "",
            sqlQuery: m.sqlQuery || "",
            visualizationType: m.visualizationType || "table",
            isApprovalModule: m.isApprovalModule || false,
            approvalUpdateQuery: m.approvalUpdateQuery || "",
            approvalIdColumn: m.approvalIdColumn || "",
        });
        setFormOpen(true);
        setSelectedModule(null);
        setResults([]);
        setFormError("");
        setFormSuccess("");
        scrollToMainContent(); // <<< ADDED SCROLLING
    };

    const handleAddNew = () => {
        setFormData({ 
            id: 0, 
            title: "", 
            sqlQuery: "", 
            visualizationType: "table",
            isApprovalModule: false,
            approvalUpdateQuery: "",
            approvalIdColumn: "",
        });
        setFormOpen(true);
        setSelectedModule(null);
        setResults([]);
        setFormError("");
        setFormSuccess("");
        scrollToMainContent(); // <<< ADDED SCROLLING
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

    const toggleHideModule = async (module) => {
        try {
            const res = await api.post(`/admin/hide-query/${module.id}`, {
                HideQuery: !module.hideQuery,
            });
            if (res.data?.success) {
                showMessages(
                    "success",
                    module.hideQuery
                        ? `Module "${module.title}" is now visible.`
                        : `Module "${module.title}" is now hidden.`
                );
                loadUserAndModules();
            } else {
                showMessages("error", res.data?.message || "Failed to update visibility");
            }
        } catch (err) {
            console.error(err);
            showMessages("error", err.response?.data?.message || "Failed to toggle visibility");
        }
    };
    
    // --- Execution and Saving Logic ---

    const handleExecute = async () => {
        if (!formData.sqlQuery.trim()) {
            setFormError("Query cannot be empty");
            setFormSuccess("");
            return;
        }
        setFormError("");
        setFormSuccess("");
        setIsExecuting(true);
        try {
            const res = await api.post(
                `/admin/execute-user-query/${id}`,
                { SqlQuery: formData.sqlQuery },
                { headers: { "Content-Type": "application/json" } }
            );

            if (res.data?.success) {
                setResults(res.data.data || []);
                setFormSuccess(`Query executed successfully. ${res.data.data?.length || 0} rows returned.`);
            } else {
                setResults([]);
                setFormError(res.data?.message || "Error executing query. Check your SQL syntax.");
            }
        } catch (err) {
            console.error(err);
            setResults([]);
            setFormError(err.response?.data?.message || err.message || "Error executing query");
        } finally {
            setIsExecuting(false);
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
        setIsSaving(true);
        
        try {
            // 1. Execute query for validation/preview (client-side validation check)
            const execRes = await api.post(
                `/admin/execute-user-query/${id}`,
                { SqlQuery: formData.sqlQuery },
                { headers: { "Content-Type": "application/json" } }
            );

            if (!execRes.data?.success) {
                setFormError(execRes.data?.message || "Query validation failed. Cannot save module.");
                setIsSaving(false);
                return;
            }

            // 2. Prepare payload and save
            const payload = {
                userQueryId: formData.id,
                userTitle: formData.title,
                userQueryText: formData.sqlQuery,
                visualizationType: formData.visualizationType,
                isApprovalModule: formData.isApprovalModule,
                approvalUpdateQuery: formData.approvalUpdateQuery,
                approvalIdColumn: formData.approvalIdColumn,
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
                // Instead of full reload, update modules state directly if it's a new module (id=0)
                if (formData.id === 0) {
                    // For new module, we must load all data again to get the new ID, or we can update the structure for simplicity.
                    // Since the backend likely assigns an ID on creation, re-fetching is often simplest for a new item.
                    loadUserAndModules(); 
                } else {
                    // For an edit, update the specific module in the state to avoid a full list reload/flicker
                    setModules(prevModules => 
                        prevModules.map(m => 
                            m.id === formData.id 
                                ? { ...m, title: formData.title, visualizationType: formData.visualizationType, isApprovalModule: formData.isApprovalModule, approvalUpdateQuery: formData.approvalUpdateQuery, approvalIdColumn: formData.approvalIdColumn, updatedAt: new Date().toISOString() }
                                : m
                            )
                        );
                        // Also update selectedModule view state if it was the one edited
                        setSelectedModule(prevSelected => 
                            prevSelected && prevSelected.id === formData.id
                                ? { ...prevSelected, title: formData.title, visualizationType: formData.visualizationType, isApprovalModule: formData.isApprovalModule, approvalUpdateQuery: formData.approvalUpdateQuery, approvalIdColumn: formData.approvalIdColumn, updatedAt: new Date().toISOString() }
                                : prevSelected
                        );
                    }
                } else {
                setFormError(saveRes.data?.message || "Failed to save module");
            }
        } catch (err) {
            console.error(err);
            setFormError(err.response?.data?.message || err.message || "Failed to save module");
        } finally {
            setIsSaving(false);
        }
    };

    // --- Module Transfer Logic (Kept Intact) ---
    const handleTransferCheck = async () => {
        if (!targetUser) {
            showMessages("error", "Please select a target user.");
            return;
        }
        try {
            const res = await api.post("/admin/transfer-modules", {
                sourceUserId: currentUserId,
                targetUserId: targetUser,
                moduleIds: selectedModules,
                action: "check"
            });

            if (res.data.duplicates?.length) {
                setDuplicates(res.data.duplicates);
            } else {
                showMessages("success", "Modules transferred successfully!");
                setShowUserList(false);
                setSelectedModules([]); // Clear selection after successful transfer
            }
        } catch (err) {
            showMessages("error", err.response?.data?.message || "Failed during transfer check.");
            setShowUserList(false);
        }
    };

    const handleDuplicateAction = async (action) => {
        try {
            const res = await api.post("/admin/transfer-modules", {
                sourceUserId: currentUserId,
                targetUserId: targetUser,
                moduleIds: selectedModules,
                action
            });

            showMessages("success", res.data.message);
            setDuplicates([]);
            setShowUserList(false);
            setSelectedModules([]); // Clear selection after successful action
        } catch (err) {
            showMessages("error", err.response?.data?.message || "Failed to finalize transfer.");
        }
    };


    // --- Render Components (Redesigned) ---

    const ModuleListItem = ({ m }) => (
        <li
            key={m.id}
            className={`p-4 rounded-xl shadow-lg transition duration-300 border-2 ${selectedModules.includes(m.id)
                ? "border-blue-500 ring-4 ring-blue-200 bg-blue-50"
                : "border-gray-200 hover:shadow-xl cursor-pointer bg-white"
                } ${m.hideQuery ? "opacity-60 grayscale" : "opacity-100"}`}
        >
            <div className="flex items-start gap-3">
                <input
                    type="checkbox"
                    checked={selectedModules.includes(m.id)}
                    onChange={(e) => {
                        e.stopPropagation();
                        if (e.target.checked) {
                            setSelectedModules([...selectedModules, m.id]);
                        } else {
                            setSelectedModules(selectedModules.filter((mid) => mid !== m.id));
                        }
                    }}
                    className="w-5 h-5 mt-1 accent-blue-600 flex-shrink-0"
                />
                <div
                    onClick={() => handleSelect(m)}
                    className="flex-1 min-w-0"
                >
                    <div className="font-bold text-lg text-gray-800 truncate">
                        {m.title || "Untitled Module"}
                    </div>
                    <div className="text-xs sm:text-sm text-gray-500 mt-1 flex items-center gap-2">
                        <List className="w-3 h-3 text-indigo-500"/> 
                        Type: <span className="font-semibold text-indigo-700 capitalize">{m.visualizationType}</span>
                        {m.isApprovalModule && <span className="bg-red-500 text-white px-2 py-0.5 rounded-full text-xs font-bold">APPROVAL</span>}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                        Updated: {formatDate(m.updatedAt)}
                    </div>
                </div>
            </div>

            <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-100">
                <button
                    onClick={(e) => { e.stopPropagation(); handleEdit(m); }}
                    className="flex items-center gap-1 px-3 py-1 text-sm bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition"
                    title="Edit Module"
                >
                    <FaPencilAlt className="w-3 h-3"/> Edit
                </button>
                <button
                    onClick={(e) => { e.stopPropagation(); toggleHideModule(m); }}
                    className={`flex items-center gap-1 px-3 py-1 text-sm font-medium rounded-lg transition ${m.hideQuery
                        ? "bg-green-500 text-white hover:bg-green-600"
                        : "bg-purple-500 text-white hover:bg-purple-600"
                        }`}
                    title={m.hideQuery ? "Show Module" : "Hide Module"}
                >
                    {m.hideQuery ? <FaEye className="w-3 h-3"/> : <FaEyeSlash className="w-3 h-3"/>} {m.hideQuery ? "Show" : "Hide"}
                </button>
                <button
                    onClick={(e) => { e.stopPropagation(); setModuleToDelete(m); setDeleteModalOpen(true); }}
                    className="flex items-center gap-1 px-3 py-1 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition"
                    title="Delete Module"
                >
                    <FaTrashAlt className="w-3 h-3"/> Delete
                </button>
            </div>
        </li>
    );

    const renderForm = () => (
        <div className="bg-white p-6 lg:p-8 rounded-xl shadow-2xl border-t-4 border-indigo-500">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-2">
                {formData.id ? "Edit Module" : "Add New Module"}
            </h2>

            {(formError || formSuccess) && (
                <div className={`p-3 rounded-lg mb-4 ${formError ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}`}>
                    {formError || formSuccess}
                </div>
            )}

            <div className="space-y-5">
                {/* Title and Visualization */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Module Title</label>
                        <input
                            type="text"
                            placeholder="Descriptive title for the module"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                            <LayoutList className="w-4 h-4 text-indigo-500" /> Visualization Type
                        </label>
                        <select
                            value={formData.visualizationType}
                            onChange={(e) => setFormData({ ...formData, visualizationType: e.target.value })}
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                        >
                            {["table", "bar", "pie", "area", "line", "kpi", "heatmap", "map"].map(type => (
                                <option key={type} value={type} className="capitalize">{type.charAt(0).toUpperCase() + type.slice(1)}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* SQL Query Input */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-indigo-500" /> SQL Query
                    </label>
                    <div className="relative w-full">
                        <textarea
                            rows="6"
                            placeholder="SELECT * FROM your_table WHERE 1=1 LIMIT 10"
                            value={formData.sqlQuery}
                            onChange={(e) => setFormData({ ...formData, sqlQuery: e.target.value })}
                            className="w-full p-3 border border-gray-300 rounded-xl font-mono text-sm resize-y focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition bg-gray-50"
                        />
                        <button
                            type="button"
                            onClick={handleCopyFormQuery}
                            className="absolute top-3 right-3 p-2 text-blue-600 bg-white/80 hover:bg-gray-100 rounded-full transition shadow"
                            title={copied ? "Copied!" : "Copy SQL query"}
                        >
                            {copied ? <FaCheck className="text-blue-600" /> : <FaRegCopy />}
                        </button>
                    </div>
                </div>
                
                {/* Approval Module Checkbox */}
                <div className="flex items-center gap-3 p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                    <input
                        type="checkbox"
                        checked={formData.isApprovalModule}
                        onChange={(e) => setFormData({ ...formData, isApprovalModule: e.target.checked })}
                        className="w-5 h-5 accent-indigo-600"
                    />
                    <label className="text-sm font-semibold text-indigo-800">Enable as Approval Workflow Module</label>
                </div>

                {/* Approval Fields (Conditionally Rendered) */}
                {formData.isApprovalModule && (
                    <div className="space-y-3 p-4 border border-yellow-300 bg-yellow-50 rounded-lg">
                        <h4 className="font-semibold text-yellow-800">Approval Configuration</h4>
                        <input
                            type="text"
                            placeholder="Approval Update Query (e.g., UPDATE tablename SET status = 'approved' WHERE IDColumnName = @id)"
                            value={formData.approvalUpdateQuery}
                            onChange={(e) => setFormData({ ...formData, approvalUpdateQuery: e.target.value })}
                            className="w-full p-2 border rounded-lg"
                        />
                        <input
                            type="text"
                            placeholder="ID Column Name (e.g., record_id)"
                            value={formData.approvalIdColumn}
                            onChange={(e) => setFormData({ ...formData, approvalIdColumn: e.target.value })}
                            className="w-full p-2 border rounded-lg"
                        />
                    </div>
                )}


                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row justify-between gap-3 pt-4 border-t">
                    <button
                        onClick={handleExecute}
                        type="button"
                        disabled={isExecuting || isSaving}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition shadow disabled:opacity-50"
                    >
                        {isExecuting ? 'Executing...' : 'Execute & Preview'}
                    </button>
                    <div className="flex gap-3">
                        <button
                            onClick={() => {
                                setFormOpen(false);
                                setSelectedModule(modules.length > 0 ? modules[0] : null); 
                            }}
                            type="button"
                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                            disabled={isSaving}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            type="button"
                            disabled={isSaving || isExecuting}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition shadow-md disabled:bg-indigo-300"
                        >
                            {isSaving ? 'Saving...' : 'Save'}
                        </button>
                    </div>
                </div>
            </div>
            
            {/* Results Table Preview */}
            {results?.length > 0 && (
                <div className="mt-8 border p-4 rounded-xl bg-gray-50">
                    <h3 className="font-bold text-lg mb-3 text-gray-700">Execution Results Preview</h3>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-300 text-xs">
                            <thead className="bg-gray-200 sticky top-0">
                                <tr>
                                    {Object.keys(results[0] || {}).map((col) => (
                                        <th key={col} className="px-4 py-2 text-left font-bold text-gray-700 whitespace-nowrap">
                                            {col}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {results.slice(0, 5).map((row, i) => ( // Show top 5 for preview
                                    <tr key={i} className="odd:bg-white even:bg-gray-100 hover:bg-blue-50 transition">
                                        {Object.keys(row).map((col) => (
                                            <td key={col} className="px-4 py-2 border-b border-gray-200">
                                                {String(row[col])}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {results.length > 5 && <p className="text-center text-sm text-gray-500 mt-2">...Showing top 5 of {results.length} rows.</p>}
                    </div>
                </div>
            )}
        </div>
    );

    const renderModuleDetails = () => (
        <div className="bg-white p-6 lg:p-8 rounded-xl shadow-2xl border-t-4 border-indigo-500 relative">
            <div className="absolute top-4 right-4 flex gap-2">
                <button
                    onClick={() => handleEdit(selectedModule)}
                    className="p-2 bg-yellow-100 text-yellow-700 rounded-full hover:bg-yellow-200 shadow-md transition"
                    title="Edit"
                >
                    <FaPencilAlt className="w-4 h-4"/>
                </button>
                <button
                    onClick={() => {
                        setModuleToDelete(selectedModule);
                        setDeleteModalOpen(true);
                    }}
                    className="p-2 bg-red-100 text-red-700 rounded-full hover:bg-red-200 shadow-md transition"
                    title="Delete"
                >
                    <FaTrashAlt className="w-4 h-4"/>
                </button>
            </div>
            <h2 className="text-3xl font-extrabold text-gray-900 mb-2">{selectedModule.title}</h2>
            <p className="text-sm font-mono text-gray-600 mb-4 break-all">ID: {selectedModule.id}</p>

            <div className="space-y-4 border-b pb-4 mb-4">
                <p className="text-md text-gray-700">
                    <strong>Visualization:</strong> <span className="font-bold text-indigo-600">{selectedModule.visualizationType.charAt(0).toUpperCase() + selectedModule.visualizationType.slice(1)}</span>
                </p>
                {selectedModule.isApprovalModule && (
                    <p className="text-sm font-semibold text-red-600 bg-red-50 p-2 rounded">
                        This is an Approval Module.
                    </p>
                )}
            </div>
            
            <h3 className="font-semibold text-lg text-gray-800 mb-2">SQL Query:</h3>
            <div className="relative bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6">
                <code className="block whitespace-pre-wrap font-mono text-sm text-gray-700">{selectedModule.sqlQuery}</code>
                <button
                    type="button"
                    onClick={handleCopyQueryDetail}
                    className="absolute top-2 right-2 p-2 text-blue-600 bg-white rounded-full hover:bg-gray-100 transition shadow"
                    title={copiedQuery ? "Copied!" : "Copy SQL query"}
                >
                    {copiedQuery ? <FaCheck /> : <FaRegCopy />}
                </button>
            </div>
            
            <button
                onClick={() => handleEdit(selectedModule)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
            >
                Continue Editing Module
            </button>
        </div>
    );


    return (
        <div className="min-h-screen flex flex-col bg-gray-50 font-sans">
            {/* Header */}
            <header className="bg-white shadow-xl p-4 sm:p-6 border-b-4 border-indigo-500 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">
                            <List className="inline w-6 h-6 text-indigo-600 mr-2"/> Module Manager
                        </h1>
                        <p className="text-md text-gray-500 mt-1">
                            Managing Queries for: <span className="font-semibold text-indigo-700">{companyName}</span> 
                            {customerName && <span className="ml-3 text-sm bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">{customerName}</span>}
                        </p>
                    </div>
                    <Link
                        to="/admin/users"
                        state={{ keepFilters: true }}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition shadow-md flex items-center gap-2 text-sm"
                    >
                        <FaArrowLeft className="w-3 h-3"/> Back to Users
                    </Link>
                </div>
            </header>

            {/* Global Message Banner */}
            {messages.text && (
                <div className={`p-3 text-center text-sm transition-opacity duration-500 ${messages.visible ? "opacity-100" : "opacity-0"} ${messages.type === "success"
                    ? "bg-green-100 text-green-800 border-b-2 border-green-400"
                    : "bg-red-100 text-red-800 border-b-2 border-red-400"
                    } font-medium`}>
                    {messages.text}
                </div>
            )}

            {/* Content Layout */}
            <div className="flex flex-1 flex-col lg:flex-row max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8 gap-8">
                
                {/* LEFT: Module List Sidebar (Takes full width on mobile) */}
                <aside className="lg:w-96 w-full bg-white rounded-xl shadow-2xl p-5 flex flex-col border border-gray-200">
                    <div className="flex justify-between items-center mb-4 border-b pb-3">
                        <h2 className="text-xl font-bold text-gray-800">Available Modules ({modules.length})</h2>
                        <div className="flex gap-2">
                            <button
                                onClick={handleAddNew}
                                className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium transition shadow-md flex items-center gap-1"
                                title="Add New Module"
                            >
                                <FaPlus className="w-3 h-3"/> Add
                            </button>
                            <button
                                disabled={selectedModules.length === 0}
                                onClick={() => setShowUserList(true)}
                                className="px-3 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 text-sm font-medium transition shadow-md flex items-center gap-1"
                                title="Transfer Selected Modules"
                            >
                                <Send className="w-3 h-3"/> Transfer ({selectedModules.length})
                            </button>
                        </div>
                    </div>

                    {/* Select All */}
                    {modules.length > 0 && (
                        <div className="flex items-center gap-2 mb-3 p-2 bg-gray-50 rounded-lg border">
                            <input
                                type="checkbox"
                                checked={selectedModules.length > 0 && selectedModules.length === modules.length}
                                onChange={(e) => {
                                    setSelectedModules(e.target.checked ? modules.map((m) => m.id) : []);
                                }}
                                className="w-4 h-4 accent-blue-600"
                            />
                            <label className="text-sm font-medium text-gray-700">
                                Select All
                            </label>
                        </div>
                    )}

                    {/* Loader for Module List */}
                    {isModulesLoading && (
                        <div className="flex items-center justify-center p-8 text-indigo-600 font-medium">
                            <Loader2 className="w-5 h-5 animate-spin mr-2"/> Loading Modules...
                        </div>
                    )}

                    {/* Scrollable list */}
                    {!isModulesLoading && (
                        <ul className="space-y-4 flex-1 overflow-y-auto max-h-[70vh] lg:max-h-[80vh] pr-2">
                            {modules.length === 0 ? (
                                <li className="text-gray-500 italic p-4 bg-white rounded-lg shadow-inner">No modules found. Click 'Add' to create one.</li>
                            ) : (
                                modules.map((m) => <ModuleListItem key={m.id} m={m} />)
                            )}
                        </ul>
                    )}
                </aside>

                {/* RIGHT: Main Content Area (Form or Details) */}
                <main ref={mainContentRef} className="flex-1 min-w-0">
                    {formOpen ? renderForm() : selectedModule ? renderModuleDetails() : (
                        <div className="bg-white p-10 rounded-xl shadow-2xl border-t-4 border-green-500 text-center h-full flex flex-col items-center justify-center">
                            <LayoutList className="w-16 h-16 text-green-500 mb-4"/>
                            <h3 className="text-xl font-semibold text-gray-800 mb-2">Select a Module</h3>
                            <p className="text-gray-500">Click on any module in the list on the left to view its details, or click the **Add** button to create a new one.</p>
                        </div>
                    )}
                </main>
            </div>

            {/* --- Modals --- */}
            
            {/* Delete Modal */}
            {deleteModalOpen && moduleToDelete && (
                <ModalWrapper 
                    onClose={() => setDeleteModalOpen(false)}
                    title="Confirm Deletion"
                    icon={FaTrashAlt}
                    colorClass="text-red-600"
                >
                    <p className="text-gray-700 mb-6">
                        Are you sure you want to permanently delete the module: <strong className="text-gray-900">{moduleToDelete.title}</strong>? This action cannot be undone.
                    </p>
                    <div className="flex justify-end gap-3">
                        <button
                            onClick={() => setDeleteModalOpen(false)}
                            className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleDeleteConfirm}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-semibold"
                        >
                            Yes, Delete Permanently
                        </button>
                    </div>
                </ModalWrapper>
            )}
            
            {/* Transfer User List Modal */}
            {showUserList && (
                <ModalWrapper onClose={() => setShowUserList(false)} title="Select Target User" icon={Users}>
                    <p className="text-gray-600 mb-3">Transfer {selectedModules.length} module(s) from **{companyName}** to:</p>
                    <select
                        className="w-full border-2 border-gray-300 rounded-lg p-3 mb-4 focus:ring-blue-500 focus:border-blue-500 transition"
                        value={targetUser}
                        onChange={(e) => setTargetUser(e.target.value)}
                    >
                        <option value="">--- Select Target User ---</option>
                        {users
                            .filter(u => u.id !== currentUserId) // Don't allow transfer to self
                            .map((u) => (
                            <option key={u.id} value={u.id}>{u.companyName} ({u.customerName})</option>
                        ))}
                    </select>
                    <div className="flex justify-end gap-3">
                        <button onClick={() => setShowUserList(false)} className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">Cancel</button>
                        <button 
                            onClick={handleTransferCheck} 
                            disabled={!targetUser}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-300 transition font-semibold"
                        >
                            Check for Duplicates
                        </button>
                    </div>
                </ModalWrapper>
            )}

            {/* Duplicates Modal */}
            {duplicates.length > 0 && (
                <ModalWrapper 
                    onClose={() => setDuplicates([])} 
                    title="Resolve Duplicate Modules" 
                    icon={TrendingUp}
                    colorClass="text-yellow-700"
                >
                    <p className="text-gray-700 mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        The following modules already exist for the target user. Choose how to proceed:
                    </p>
                    <ul className="mb-6 text-sm text-gray-800 list-disc list-inside ml-4 max-h-40 overflow-y-auto">
                        {duplicates.map((d) => <li key={d.userQueryId} className="font-medium">{d.userTitle}</li>)}
                    </ul>
                    <div className="flex justify-end gap-3 flex-wrap pt-4 border-t">
                        <button onClick={() => setDuplicates([])} className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">Cancel Transfer</button>
                        <button onClick={() => handleDuplicateAction("ignore")} className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition">Ignore Duplicates</button>
                        <button onClick={() => handleDuplicateAction("replace")} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition">Replace Existing</button>
                    </div>
                </ModalWrapper>
            )}
        </div>
    );
}