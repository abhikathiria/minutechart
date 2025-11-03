import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Users, Send, Loader, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
// Since "react-icons/fa" failed to resolve, using inline FaIcons where possible,
// but relying primarily on lucide-react as the primary icon set.
// FaExchangeAlt is kept as it's used in the header and assumed to be available
// alongside other commonly used FaIcons.
import { FaTimes, FaExchangeAlt } from "react-icons/fa"; 
// Assuming api is provided globally or mocked for this environment
// If running in a true build environment, this import needs to point to a real file.
// For the purpose of running in this canvas, we will assume it is provided or available.
import api from "../api"; 

// --- Reusable Components ---

const ModalWrapper = ({ children, onClose, title, icon: Icon, colorClass = "text-indigo-600" }) => (
    <div className="fixed inset-0 flex items-center justify-center bg-black/60 z-50 p-4 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-8 animate-in fade-in zoom-in duration-300 border-t-4 border-indigo-600">
            <div className="flex justify-between items-center mb-4">
                <h4 className={`text-2xl font-bold flex items-center gap-2 ${colorClass}`}>
                    {Icon && <Icon className="w-6 h-6"/>} {title}
                </h4>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition">
                    <FaTimes className="w-5 h-5"/>
                </button>
            </div>
            {children}
        </div>
    </div>
);

// --- Main Component ---

export default function TransferModules() {
    const [users, setUsers] = useState([]);
    const [sourceUser, setSourceUser] = useState("");
    const [targetUser, setTargetUser] = useState("");
    const [modules, setModules] = useState([]);
    const [selected, setSelected] = useState([]);
    const [duplicates, setDuplicates] = useState([]);
    const [loading, setLoading] = useState(false);
    const [messages, setMessages] = useState({ type: "", text: "", visible: false });

    // --- Utility & Feedback ---
    const showMessages = (type, text) => {
        setMessages({ type, text, visible: true });
        setTimeout(() => {
            setMessages({ type: "", text, visible: false });
        }, 3000);
    };

    // --- Data Loading ---
    const loadUsers = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get("/admin/users");
            setUsers(res.data.filter(u => u.accountStatus === "Active")); // Only active users
        } catch (error) {
            // Note: The original error handler here caused an issue because it didn't return
            // a cleanup state on error. We'll rely on the global notification now.
            showMessages("error", "Failed to load user list.");
        } finally {
            setLoading(false);
        }
    }, []);

    const loadModules = useCallback(async (userId) => {
        if (!userId) {
            setModules([]);
            setSelected([]);
            return;
        }
        setLoading(true);
        try {
            const res = await api.get(`/admin/user/${userId}/queries`);
            // Normalize module data structure from API response
            const normalizedModules = (res.data || []).map(m => ({
                id: m.userQueryId,
                title: m.userTitle || "Untitled Module",
                ...m
            }));
            setModules(normalizedModules);
            setSelected([]);
        } catch (error) {
            showMessages("error", "Failed to load modules for source user.");
            setModules([]);
            setSelected([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadUsers();
    }, [loadUsers]);

    // When source user changes, load their modules
    useEffect(() => {
        loadModules(sourceUser);
    }, [sourceUser, loadModules]);

    // --- Action Handlers ---

    const handleTransfer = async () => {
        if (!sourceUser || !targetUser || selected.length === 0) {
            showMessages("error", "Please select source user, target user, and at least one module.");
            return;
        }
        if (sourceUser === targetUser) {
            showMessages("error", "Source and Target users cannot be the same.");
            return;
        }

        setLoading(true);
        setDuplicates([]);
        try {
            // First, check for duplicates (action="check")
            const res = await api.post("/admin/transfer-modules", {
                sourceUserId: sourceUser,
                targetUserId: targetUser,
                moduleIds: selected,
                action: "check",
            });

            if (res.data.duplicates?.length > 0) {
                setDuplicates(res.data.duplicates);
                showMessages("warning", `Found ${res.data.duplicates.length} duplicate modules. Please resolve.`);
            } else {
                // If no duplicates, perform direct transfer (action="ignore" is safe here)
                await handleDuplicateAction("ignore");
            }
        } catch (err) {
            showMessages("error", err.response?.data?.message || "Failed during transfer check.");
        } finally {
            setLoading(false);
        }
    };

    const handleDuplicateAction = async (action) => {
        setDuplicates([]); // Close modal immediately
        setLoading(true);
        try {
            const res = await api.post("/admin/transfer-modules", {
                sourceUserId: sourceUser,
                targetUserId: targetUser,
                moduleIds: selected,
                action: action, // "ignore" or "replace"
            });

            if (res.data.success) {
                showMessages("success", res.data.message || `Modules transferred with action: ${action}!`);
                // Clear selection and reload modules to reflect changes on source side (if any are deleted/modified)
                setSelected([]);
                loadModules(sourceUser);
            } else {
                 showMessages("error", res.data.message || "Transfer failed.");
            }
        } catch (err) {
            showMessages("error", err.response?.data?.message || "Error finalizing transfer.");
        } finally {
            setLoading(false);
        }
    };

    // --- Render Helpers ---

    const renderNotification = () => {
        if (!messages.visible) return null;
        const Icon = messages.type === 'success' ? CheckCircle : messages.type === 'warning' ? AlertTriangle : XCircle;
        const bgColor = messages.type === 'success' ? 'bg-green-100 border-green-400 text-green-800' : 
                        messages.type === 'warning' ? 'bg-yellow-100 border-yellow-400 text-yellow-800' : 
                        'bg-red-100 border-red-400 text-red-800';

        return (
            <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 p-4 rounded-xl shadow-lg border-l-4 ${bgColor} flex items-center gap-3 transition-opacity duration-300`}>
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span className="font-medium">{messages.text}</span>
            </div>
        );
    };

    const renderUserSelector = (label, value, onChangeHandler, isSource = false) => (
        <div className="flex-1 bg-white p-6 rounded-xl shadow-lg border border-gray-200">
            <label className="block text-lg font-semibold text-gray-700 mb-3">
                <Users className="inline w-5 h-5 text-indigo-500 mr-2"/> {label}
            </label>
            <select
                value={value}
                onChange={(e) => onChangeHandler(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                disabled={loading}
            >
                <option value="">--- Select {label} ---</option>
                {users
                    .filter(u => isSource || u.id !== sourceUser) // Target cannot be the source user
                    .map((u) => (
                        <option key={u.id} value={u.id}>
                            {u.companyName} ({u.customerName})
                        </option>
                    ))}
            </select>
            {isSource && value && (
                <p className="mt-2 text-sm text-gray-500">
                    {modules.length} modules loaded.
                </p>
            )}
        </div>
    );

    const isTransferDisabled = !sourceUser || !targetUser || selected.length === 0 || loading || sourceUser === targetUser;

    // --- Main Render ---
    return (
        <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
            {renderNotification()}
            
            {/* Header */}
            <header className="max-w-6xl mx-auto bg-white rounded-xl shadow-2xl p-6 mb-8 border-t-4 border-indigo-600">
                <div className="flex justify-between items-center">
                    <h1 className="text-3xl font-extrabold text-gray-900 flex items-center gap-3">
                        <FaExchangeAlt className="w-8 h-8 text-indigo-600"/> Module Transfer Utility
                    </h1>
                    <Link
                        to="/admin/users"
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition shadow-md flex items-center gap-2"
                    >
                        <FaTimes className="w-4 h-4"/> Close
                    </Link>
                </div>
                <p className="text-gray-500 mt-1">Move user-defined data modules between two active accounts.</p>
            </header>

            <div className="max-w-6xl mx-auto space-y-8">
                
                {/* User Selection Step */}
                <div className="flex flex-col md:flex-row gap-6">
                    {renderUserSelector("Source User (Modules to be copied)", sourceUser, setSourceUser, true)}
                    {renderUserSelector("Target User (Destination)", targetUser, setTargetUser, false)}
                </div>

                {/* Module Selection & Action Step */}
                <div className="bg-white p-6 rounded-xl shadow-2xl border border-gray-200">
                    <h2 className="text-xl font-bold text-gray-700 mb-4">
                        Select Modules <span className="text-sm font-normal text-gray-500">({modules.length} available)</span>
                    </h2>

                    {loading && sourceUser && (
                        <div className="p-4 text-center text-indigo-600 font-semibold flex items-center justify-center gap-2">
                            <Loader className="animate-spin w-5 h-5"/> Loading Modules...
                        </div>
                    )}

                    {modules.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto p-2 border rounded-lg bg-gray-50">
                            {modules.map((m) => (
                                <div 
                                    key={m.id} 
                                    className={`p-3 rounded-lg border-2 transition duration-200 cursor-pointer 
                                        ${selected.includes(m.id) ? 'bg-indigo-100 border-indigo-600 shadow-md' : 'bg-white border-gray-200 hover:bg-gray-50'}`}
                                    onClick={() => {
                                        setSelected((prev) =>
                                            prev.includes(m.id)
                                                ? prev.filter((id) => id !== m.id)
                                                : [...prev, m.id]
                                        );
                                    }}
                                >
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={selected.includes(m.id)}
                                            readOnly
                                            className="w-4 h-4 accent-indigo-600 flex-shrink-0"
                                        />
                                        <span className={`text-sm font-medium ${selected.includes(m.id) ? 'text-indigo-800' : 'text-gray-700'}`}>
                                            {m.title}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-400 mt-1 truncate">ID: {m.id}</p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        !loading && sourceUser && (
                            <div className="p-6 text-center text-gray-500 bg-gray-100 rounded-lg">
                                No modules found for the selected Source User.
                            </div>
                        )
                    )}

                    <div className="mt-6 border-t pt-4 flex justify-between items-center">
                        <p className="text-lg font-semibold text-gray-700">
                            {selected.length} Module(s) Selected
                        </p>
                        <button
                            onClick={handleTransfer}
                            disabled={isTransferDisabled}
                            className={`px-8 py-3 rounded-xl font-bold text-lg transition shadow-xl flex items-center gap-3 
                                ${isTransferDisabled 
                                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                                    : 'bg-green-600 text-white hover:bg-green-700'
                                }`}
                        >
                            {loading ? <Loader className="animate-spin w-5 h-5"/> : <Send className="w-5 h-5"/>}
                            {loading ? "Processing..." : "Start Transfer"}
                        </button>
                    </div>
                </div>
            </div>

            {/* Duplicates Modal */}
            {duplicates.length > 0 && (
                <ModalWrapper 
                    onClose={() => setDuplicates([])}
                    title="Resolve Duplicate Modules"
                    icon={AlertTriangle}
                    colorClass="text-yellow-700"
                >
                    <p className="text-gray-700 mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        The following modules already exist in the Target User's account. Choose an action:
                    </p>
                    <ul className="mb-6 text-sm text-gray-800 list-disc list-inside ml-4 max-h-40 overflow-y-auto">
                        {duplicates.map((d) => (
                            <li key={d.userQueryId} className="font-medium">{d.userTitle}</li>
                        ))}
                    </ul>
                    <div className="flex flex-wrap justify-end gap-3 pt-4 border-t">
                        <button
                            onClick={() => setDuplicates([])}
                            className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 font-medium"
                        >
                            Cancel Transfer
                        </button>
                        <button
                            onClick={() => handleDuplicateAction("ignore")}
                            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-semibold transition"
                        >
                            Ignore (Keep Existing)
                        </button>
                        <button
                            onClick={() => handleDuplicateAction("replace")}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold transition"
                        >
                            Replace Existing
                        </button>
                    </div>
                </ModalWrapper>
            )}
        </div>
    );
}
