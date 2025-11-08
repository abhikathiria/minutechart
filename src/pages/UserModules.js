// // src/pages/UserModules.jsx
// import React, { useState, useEffect } from "react";
// import { useParams, Link } from "react-router-dom";
// import api from "../api";
// import { FaRegCopy, FaCheck } from "react-icons/fa";

// export default function UserModules() {
//     const { id } = useParams();
//     const [modules, setModules] = useState([]);
//     const [companyName, setCompanyName] = useState("");
//     const [customerName, setCustomerName] = useState("");
//     const [selectedModule, setSelectedModule] = useState(null);
//     const [formOpen, setFormOpen] = useState(false);
//     const [deleteModalOpen, setDeleteModalOpen] = useState(false);
//     const [copied, setCopied] = useState(false);
//     const [copiedQuery, setCopiedQuery] = useState(false);
//     const [users, setUsers] = useState([]);
//     const [targetUser, setTargetUser] = useState("");
//     const [showUserList, setShowUserList] = useState(false);
//     const [duplicates, setDuplicates] = useState([]);
//     const [selectedModules, setSelectedModules] = useState([]);
//     const [currentUserId, setCurrentUserId] = useState(id);

//     // --- New State for Suggestions Module ---
//     const [suggestions, setSuggestions] = useState([]);
//     const [suggestionLoading, setSuggestionLoading] = useState(false);
//     const [suggestionDetails, setSuggestionDetails] = useState(null);
//     const [suggestionError, setSuggestionError] = useState("");
//     // Note: adminResponseText state is removed as it's now part of suggestionDetails
//     const [actionToConfirm, setActionToConfirm] = useState(null); // 'create' or 'reject'
//     // ----------------------------------------

//     const [messages, setMessages] = useState({ type: "", text: "", visible: false });
//     const [moduleToDelete, setModuleToDelete] = useState(null);
//     const [formError, setFormError] = useState("");
//     const [formSuccess, setFormSuccess] = useState("");

//     const [formData, setFormData] = useState({
//         id: 0,
//         title: "",
//         sqlQuery: "",
//         visualizationType: "table",
//         isApprovalModule: false,
//         approvalUpdateQuery: "",
//         approvalIdColumn: "",
//     });

//     const [results, setResults] = useState([]);

//     // Combined useEffect for initial load and ID changes
//     useEffect(() => {
//         setCurrentUserId(id);
//         loadUserAndModules();
//         loadUserSuggestions(); // Load suggestions on mount/ID change
//     }, [id]);

//     const handleCopy = () => {
//         navigator.clipboard.writeText(formData.sqlQuery);
//         setCopied(true);
//         setTimeout(() => setCopied(false), 2000);
//     };

//     const handleCopyQuery = () => {
//         navigator.clipboard.writeText(selectedModule.sqlQuery);
//         setCopiedQuery(true);
//         setTimeout(() => setCopiedQuery(false), 2000);
//     };

//     const showMessages = (type, text) => {
//         setMessages({ type, text, visible: true });
//         setTimeout(() => {
//             setMessages({ type: "", text: "", visible: false });
//         }, 3000);
//     };

//     const formatDate = (dateStr) => {
//         if (!dateStr) return "N/A";
//         const date = new Date(dateStr);

//         const day = String(date.getDate()).padStart(2, "0");
//         const month = String(date.getMonth() + 1).padStart(2, "0");
//         const year = date.getFullYear();

//         const hours = String(date.getHours()).padStart(2, "0");
//         const minutes = String(date.getMinutes()).padStart(2, "0");
//         const seconds = String(date.getSeconds()).padStart(2, "0");

//         return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
//     };

//     const loadUserAndModules = async () => {
//         try {
//             const modulesRes = await api.get(`/admin/user/${id}/queries`);
//             const normalizedModules = (modulesRes.data || []).map((m) => ({
//                 id: m.userQueryId,
//                 title: m.userTitle || "Untitled Module",
//                 sqlQuery: m.userQueryText || "",
//                 visualizationType: m.visualizationType || "table",
//                 createdAt: m.userQueryCreatedAtTime,
//                 updatedAt: m.userQueryLastUpdated,
//                 hideQuery: m.hideQuery || false,
//                 isApprovalModule: m.isApprovalModule || false,
//                 approvalUpdateQuery: m.approvalUpdateQuery || "",
//                 approvalIdColumn: m.approvalIdColumn || "",
//             }));
//             setModules(normalizedModules);

//             const userRes = await api.get(`/admin/users`);
//             const activeUsers = (userRes.data || []).filter((u) => u.accountStatus === "Active");
//             setUsers(activeUsers);

//             const user = (userRes.data || []).find((u) => u.id === id);
//             if (user) {
//                 setCompanyName(user.companyName || "Unknown Company");
//                 setCustomerName(user.customerName || "");
//             } else {
//                 setCompanyName("Unknown Company");
//                 setCustomerName("");
//             }
//         } catch (err) {
//             console.error("Failed to load user/modules", err);
//             setModules([]);
//             setCompanyName("Unknown Company");
//             setCustomerName("");
//         }
//     };

//     // --- New Function to Load Suggestions ---
//     const loadUserSuggestions = async () => {
//         setSuggestionLoading(true);
//         setSuggestionError("");
//         try {
//             const res = await api.get(`/admin/user/${id}/suggestions`);

//             const normalizedSuggestions = (res.data || []).map((s) => ({
//                 id: s.id,
//                 title: s.suggestionText ? s.suggestionText.substring(0, 50) + '...' : "Untitled Suggestion",
//                 description: s.suggestionText || "",
//                 submittedAt: s.createdAt,
//                 status: s.status || "Pending",
//                 adminResponse: s.adminResponse || "", // ADDED: Pull adminResponse from API
//             }));

//             setSuggestions(normalizedSuggestions);
            
//             // If suggestionDetails is open, update its content (for live updates)
//             if (suggestionDetails) {
//                  const updatedDetails = normalizedSuggestions.find(s => s.id === suggestionDetails.id);
//                  if (updatedDetails) {
//                     setSuggestionDetails(updatedDetails);
//                  }
//             }

//         } catch (err) {
//             console.error("Failed to load user suggestions", err);
//             setSuggestionError(err.response?.data?.message || "Failed to load suggestions.");
//         } finally {
//             setSuggestionLoading(false);
//         }
//     };
//     // ----------------------------------------

//     const handleSelect = (m) => {
//         setSelectedModule(m);
//         setFormOpen(false);
//         setResults([]);
//         setFormError("");
//         setFormSuccess("");
//         setSuggestionDetails(null); // Deselect suggestion when a module is selected
//     };

//     // --- New Function to Handle Suggestion Selection ---
//     const handleSelectSuggestion = (s) => {
//         // Set suggestionDetails including the current adminResponse
//         setSuggestionDetails(s);
//         setFormOpen(false); // Close module form if open
//         setSelectedModule(null); // Deselect any selected module
//         setResults([]);
//     };
//     // --------------------------------------------------

//     const handleDeleteConfirm = async () => {
//         try {
//             await api.delete(`/admin/delete-query/${moduleToDelete.id}`);
//             showMessages("success", "Module deleted successfully");
//             await loadUserAndModules();
//             if (selectedModule?.id === moduleToDelete.id) {
//                 setSelectedModule(null);
//             }
//         } catch (err) {
//             showMessages("error", err.response?.data?.message || "Failed to delete module");
//         } finally {
//             setDeleteModalOpen(false);
//             setModuleToDelete(null);
//         }
//     };

//     // --- Core Action: Use AdminResponse from suggestionDetails state ---
//     const handleSuggestionAction = async (action) => {
//         // Get the current AdminResponse text from the state
//         const adminResponse = suggestionDetails.adminResponse || "";

//         let endpoint = "";
//         let successMessage = "";
//         let payload = { AdminResponse: adminResponse };

//         if (action === 'create') {
//             endpoint = `/admin/mark-created/${suggestionDetails.id}`;
//             successMessage = `Suggestion marked as Created successfully.`;
//         } else if (action === 'reject') {
//             // Check for required AdminResponse for rejection
//             if (!adminResponse.trim()) {
//                 showMessages("error", "Rejection reason (AdminResponse) is required.");
//                 setActionToConfirm(null); // Close confirmation modal
//                 return;
//             }
//             endpoint = `/admin/reject-suggestion/${suggestionDetails.id}`;
//             successMessage = `Suggestion rejected successfully.`;
//         } else {
//             return; // Safety exit
//         }

//         try {
//             const res = await api.post(endpoint, payload);

//             if (res.status === 200 || res.status === 201) {
//                 showMessages("success", successMessage);
                
//                 // Immediately update the status before reloading for a "live" feel
//                 setSuggestionDetails(prev => ({ ...prev, status: action === 'create' ? 'Created' : 'Rejected' }));
                
//                 // Reload data shortly after to ensure full sync
//                 setTimeout(() => loadUserSuggestions(), 500);
                
//                 setActionToConfirm(null);
//                 // We leave setSuggestionDetails open so the admin can see the result, but close the modal
//             } else {
//                 showMessages("error", res.data?.message || `Failed to update suggestion status.`);
//                 setActionToConfirm(null);
//             }
//         } catch (err) {
//             console.error("Error executing suggestion action", err);
//             showMessages("error", err.response?.data?.message || "Error processing suggestion action.");
//             setActionToConfirm(null);
//         }
//     };

//     // --- Helper to open the confirmation modal/dialog (No text prefill needed) ---
//     const openActionConfirmation = (action) => {
//         setActionToConfirm(action);
//     };

//     // Handler for editing the Admin Response text field
//     const handleAdminResponseChange = (e) => {
//         setSuggestionDetails(prev => ({
//             ...prev,
//             adminResponse: e.target.value
//         }));
//     };

//     const handleExecute = async () => {
//         if (!formData.sqlQuery.trim()) {
//             setFormError("Query cannot be empty");
//             setFormSuccess("");
//             return;
//         }
//         setFormError("");
//         setFormSuccess("");
//         try {
//             const res = await api.post(
//                 `/admin/execute-user-query/${id}`,
//                 { SqlQuery: formData.sqlQuery },
//                 { headers: { "Content-Type": "application/json" } }
//             );

//             if (res.data?.success) {
//                 setResults(res.data.data || []);
//                 setFormSuccess("Query executed successfully");
//             } else {
//                 setResults([]);
//                 setFormError(res.data?.message || "Error executing query");
//             }
//         } catch (err) {
//             console.error(err);
//             setResults([]);
//             setFormError(err.response?.data?.message || err.message || "Error executing query");
//         }
//     };

//     const handleSave = async () => {
//         if (!formData.sqlQuery.trim()) {
//             setFormError("Query cannot be empty");
//             setFormSuccess("");
//             return;
//         }
//         setFormError("");
//         setFormSuccess("");
//         try {
//             const execRes = await api.post(
//                 `/admin/execute-user-query/${id}`,
//                 { SqlQuery: formData.sqlQuery },
//                 { headers: { "Content-Type": "application/json" } }
//             );

//             if (!execRes.data?.success) {
//                 setFormError(execRes.data?.message || "Query validation failed");
//                 return;
//             }

//             const payload = {
//                 userQueryId: formData.id,
//                 userTitle: formData.title,
//                 userQueryText: formData.sqlQuery,
//                 visualizationType: formData.visualizationType,
//                 isApprovalModule: formData.isApprovalModule,
//                 approvalUpdateQuery: formData.approvalUpdateQuery,
//                 approvalIdColumn: formData.approvalIdColumn,
//             };

//             const saveRes = await api.post(
//                 `/admin/save-user-query/${id}`,
//                 payload,
//                 { headers: { "Content-Type": "application/json" } }
//             );

//             if (saveRes.data?.success) {
//                 setFormSuccess("Module saved successfully");
//                 setFormOpen(false);
//                 setResults(execRes.data.data || []);
//                 loadUserAndModules();
//             } else {
//                 setFormError(saveRes.data?.message || "Failed to save module");
//             }
//         } catch (err) {
//             console.error(err);
//             setFormError(err.response?.data?.message || err.message || "Failed to save module");
//         }
//     };

//     const handleEdit = (m) => {
//         setFormData({
//             id: m.id || 0,
//             title: m.title || "",
//             sqlQuery: m.sqlQuery || "",
//             visualizationType: m.visualizationType || "table",
//             isApprovalModule: m.isApprovalModule || false,
//             approvalUpdateQuery: m.approvalUpdateQuery || "",
//             approvalIdColumn: m.approvalIdColumn || "",
//         });
//         setFormOpen(true);
//         setSelectedModule(null);
//         setSuggestionDetails(null); // Close suggestion details
//         setResults([]);
//         setFormError("");
//         setFormSuccess("");
//     };

//     const handleAddNew = () => {
//         setFormData({ id: 0, title: "", sqlQuery: "", visualizationType: "table" });
//         setFormOpen(true);
//         setSelectedModule(null);
//         setSuggestionDetails(null); // Close suggestion details
//         setResults([]);
//         setFormError("");
//         setFormSuccess("");
//     };

//     const handleTransferCheck = async () => {
//         const res = await api.post("/admin/transfer-modules", {
//             sourceUserId: currentUserId,
//             targetUserId: targetUser,
//             moduleIds: selectedModules,
//             action: "check"
//         });

//         if (res.data.duplicates?.length) {
//             setDuplicates(res.data.duplicates);
//         } else {
//             alert("Modules transferred successfully!");
//             setShowUserList(false);
//         }
//     };

//     const handleDuplicateAction = async (action) => {
//         const res = await api.post("/admin/transfer-modules", {
//             sourceUserId: currentUserId,
//             targetUserId: targetUser,
//             moduleIds: selectedModules,
//             action
//         });

//         alert(res.data.message);
//         setDuplicates([]);
//         setShowUserList(false);
//     };

//     const toggleHideModule = async (module) => {
//         try {
//             const res = await api.post(`/admin/hide-query/${module.id}`, {
//                 HideQuery: !module.hideQuery,
//             });
//             if (res.data?.success) {
//                 showMessages(
//                     "success",
//                     module.hideQuery
//                         ? `Module "${module.title}" is now visible.`
//                         : `Module "${module.title}" is now hidden.`
//                 );
//                 loadUserAndModules();
//             } else {
//                 showMessages("error", res.data?.message || "Failed to update visibility");
//             }
//         } catch (err) {
//             console.error(err);
//             showMessages("error", err.response?.data?.message || "Failed to toggle visibility");
//         }
//     };


//     return (
//         <div className="min-h-screen flex flex-col bg-gradient-to-r from-indigo-50 to-blue-100">
//             {/* Header */}
//             <header className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white p-6 shadow-lg flex flex-col sm:flex-row justify-between gap-4">
//                 <div>
//                     <h1 className="text-xl sm:text-2xl font-bold">📊 Modules for {companyName}</h1>
//                     {customerName && <p className="text-sm sm:text-xl px-1 text-indigo-100 mt-1">Customer: {customerName}</p>}
//                 </div>
//                 <Link
//                     to="/admin/users"
//                     state={{ keepFilters: true }}
//                     className="px-4 py-2 bg-white text-indigo-700 rounded-lg font-semibold hover:bg-gray-100 flex items-center justify-center"
//                 >
//                     ⬅ Back to Users
//                 </Link>
//             </header>

//             {messages.text && (
//                 <div
//                     className={`p-3 text-center text-sm sm:text-base transition-opacity duration-500 ${messages.type === "success"
//                         ? "bg-green-100 text-green-800"
//                         : "bg-red-100 text-red-800"
//                         } ${messages.visible ? "opacity-100" : "opacity-0"}`}
//                 >
//                     {messages.text}
//                 </div>
//             )}

//             {/* Content */}
//             <div className="flex flex-1 flex-col lg:flex-row">
//                 {/* Sidebar - Module List */}
//                 <aside className="w-full lg:w-96 bg-white shadow-xl p-6 border-r flex flex-col">
//                     <div className="flex flex-col gap-3 mb-4">
//                         <div className="flex justify-between items-center">
//                             <h2 className="text-lg sm:text-xl font-bold">Module List</h2>
//                             <div className="flex gap-2">
//                                 <button
//                                     onClick={handleAddNew}
//                                     className="px-3 py-1 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
//                                 >
//                                     ＋ Add
//                                 </button>
//                                 <button
//                                     disabled={selectedModules.length === 0}
//                                     onClick={() => setShowUserList(true)}
//                                     className="px-4 py-1.5 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
//                                 >
//                                     Transfer
//                                 </button>
//                             </div>
//                         </div>

//                         {/* ✅ Select All */}
//                         {modules.length > 0 && (
//                             <div className="flex items-center gap-2">
//                                 <input
//                                     type="checkbox"
//                                     checked={selectedModules.length === modules.length}
//                                     onChange={(e) => {
//                                         if (e.target.checked) {
//                                             setSelectedModules(modules.map((m) => m.id));
//                                         } else {
//                                             setSelectedModules([]);
//                                         }
//                                     }}
//                                     className="w-4 h-4 accent-indigo-600"
//                                 />
//                                 <label className="text-sm sm:text-base font-medium text-gray-700">
//                                     Select All Modules
//                                 </label>
//                             </div>
//                         )}
//                     </div>

//                     {/* Scrollable list */}
//                     <ul className="space-y-3 flex-1 overflow-y-auto max-h-[60vh] pr-2">
//                         {modules.length === 0 && (
//                             <li className="text-gray-500 italic">No modules defined for this user.</li>
//                         )}
//                         {modules.map((m) => (
//                             <li
//                                 key={m.id}
//                                 className={`p-5 rounded-xl shadow transition ${selectedModules.includes(m.id)
//                                     ? "border-4 border-indigo-400"
//                                     : "cursor-pointer"
//                                     } ${m.hideQuery ? "opacity-50 grayscale" : "bg-gradient-to-r from-indigo-100 to-blue-100"}`}
//                             >
//                                 <div className="flex justify-between items-center">
//                                     <input
//                                         type="checkbox"
//                                         checked={selectedModules.includes(m.id)}
//                                         onChange={(e) => {
//                                             if (e.target.checked) {
//                                                 setSelectedModules([...selectedModules, m.id]);
//                                             } else {
//                                                 setSelectedModules(selectedModules.filter((mid) => mid !== m.id));
//                                             }
//                                         }}
//                                         className="w-4 h-4 accent-indigo-600"
//                                     />
//                                     <div
//                                         onClick={() => handleSelect(m)}
//                                         className="flex-1 ml-3 cursor-pointer"
//                                     >
//                                         <div className="font-bold text-lg sm:text-xl text-gray-900">
//                                             {m.title || "Untitled Module"}
//                                         </div>
//                                         <div className="text-sm sm:text-base text-gray-800 mt-2">
//                                             Visualization:{" "}
//                                             <span className="font-semibold text-indigo-700">
//                                                 {m.visualizationType.charAt(0).toUpperCase() +
//                                                     m.visualizationType.slice(1)}
//                                             </span>
//                                         </div>
//                                     </div>
//                                 </div>

//                                 <div
//                                     className="flex flex-wrap gap-3 mt-3 text-sm sm:text-md"
//                                     onClick={(e) => e.stopPropagation()}
//                                 >
//                                     <button
//                                         onClick={() => handleEdit(m)}
//                                         className="px-3 py-1.5 sm:px-4 sm:py-2 bg-yellow-100 text-yellow-700 font-medium rounded-lg hover:bg-yellow-200"
//                                     >
//                                         ✎ Edit
//                                     </button>
//                                     <button
//                                         onClick={() => toggleHideModule(m)}
//                                         className={`px-3 py-1.5 sm:px-4 sm:py-2 font-medium rounded-lg ${m.hideQuery
//                                             ? "bg-gray-200 text-gray-700 hover:bg-gray-300"
//                                             : "bg-purple-100 text-purple-700 hover:bg-purple-200"
//                                             }`}
//                                     >
//                                         {m.hideQuery ? "👁 Show" : "🙈 Hide"}
//                                     </button>
//                                     <button
//                                         onClick={() => {
//                                             setModuleToDelete(m);
//                                             setDeleteModalOpen(true);
//                                         }}
//                                         className="px-3 py-1.5 sm:px-4 sm:py-2 bg-red-100 text-red-700 font-medium rounded-lg hover:bg-red-200"
//                                     >
//                                         🗑 Delete
//                                     </button>
//                                 </div>
//                                 <div className="mt-2 text-xs text-gray-600 space-y-1">
//                                     <div className="flex">
//                                         <span className="w-14 font-bold">Created:</span>
//                                         <span>{formatDate(m.createdAt)}</span>
//                                     </div>
//                                     <div className="flex">
//                                         <span className="w-14 font-bold">Updated:</span>
//                                         <span>{formatDate(m.updatedAt)}</span>
//                                     </div>
//                                 </div>
//                             </li>
//                         ))}
//                     </ul>
//                     {modules.length > 0 && (
//                         <>
//                             <hr className="my-3 border-black" />
//                             <div className="mt-2 text-xl text-center font-bold">
//                                 Total Modules: {modules.length}
//                             </div>
//                         </>
//                     )}
//                 </aside>

//                 {/* Main Content Area: Suggestions and Module Form/Details */}
//                 <main className="flex-1 p-4 sm:p-6 lg:p-10 overflow-y-auto">
//                     {/* ------------------------------------- */}
//                     {/* --- Module Form / Details Section --- */}
//                     {/* ------------------------------------- */}
//                     {formOpen ? (
//                         <div className="bg-white p-4 sm:p-6 rounded-xl shadow-md mb-8">
//                             <h2 className="text-lg font-bold mb-4">
//                                 {formData.id ? "Edit Module" : "Add Module"}
//                             </h2>

//                             {formError && (
//                                 <div className="p-2 bg-red-100 text-red-700 rounded text-sm mb-2">
//                                     {formError}
//                                 </div>
//                             )}
//                             {formSuccess && (
//                                 <div className="p-2 bg-green-100 text-green-700 rounded text-sm mb-2">
//                                     {formSuccess}
//                                 </div>
//                             )}

//                             <div className="pt-2 space-y-4">
//                                 <input
//                                     type="text"
//                                     placeholder="Module Title"
//                                     value={formData.title}
//                                     onChange={(e) => setFormData({ ...formData, title: e.target.value })}
//                                     className="w-full p-2 border rounded"
//                                 />
//                                 <div className="relative w-full">
//                                     <textarea
//                                         rows="6"
//                                         placeholder="SQL Query"
//                                         value={formData.sqlQuery}
//                                         onChange={(e) => setFormData({ ...formData, sqlQuery: e.target.value })}
//                                         className="w-full p-2 border rounded font-mono text-sm resize-none"
//                                     />
//                                     <button
//                                         type="button"
//                                         onClick={handleCopy}
//                                         className="absolute top-2 right-2 p-1 text-blue-600 hover:text-blue-800 transition-colors"
//                                         title={copied ? "Copied!" : "Copy SQL query"}
//                                     >
//                                         {copied ? <FaCheck className="text-blue-600" /> : <FaRegCopy />}
//                                     </button>
//                                 </div>
//                                 <div className="pt-2 space-y-4">

//                                     <select
//                                         value={formData.visualizationType}
//                                         onChange={(e) =>
//                                             setFormData({ ...formData, visualizationType: e.target.value })
//                                         }
//                                         className="w-full p-2 border rounded"
//                                     >
//                                         <option value="table">Table</option>
//                                         <option value="bar">Bar Chart</option>
//                                         <option value="pie">Pie Chart</option>
//                                         <option value="area">Area Chart</option>
//                                         <option value="line">Line Chart</option>
//                                         <option value="kpi">KPI Card</option>
//                                         <option value="heatmap">Heat Map</option>
//                                         <option value="map">Map</option>
//                                     </select>
//                                 </div>
//                                 <div className="flex items-center gap-2 mt-4">
//                                     <input
//                                         type="checkbox"
//                                         checked={formData.isApprovalModule}
//                                         onChange={(e) => setFormData({ ...formData, isApprovalModule: e.target.checked })}
//                                         className="w-4 h-4 accent-indigo-600"
//                                     />
//                                     <label className="text-sm font-medium text-gray-700">Enable Approval Module</label>
//                                 </div>
//                                 {formData.isApprovalModule && (
//                                     <div className="space-y-2 mt-2">
//                                         <input
//                                             type="text"
//                                             placeholder="Approval Update Query (e.g., UPDATE tablename SET status = 'approved' WHERE IDColumnName = @id)"
//                                             value={formData.approvalUpdateQuery}
//                                             onChange={(e) => setFormData({ ...formData, approvalUpdateQuery: e.target.value })}
//                                             className="w-full p-2 border rounded"
//                                         />
//                                         <input
//                                             type="text"
//                                             placeholder="IDColumnName (e.g., id)"
//                                             value={formData.approvalIdColumn}
//                                             onChange={(e) => setFormData({ ...formData, approvalIdColumn: e.target.value })}
//                                             className="w-full p-2 border rounded"
//                                         />
//                                     </div>
//                                 )}
//                             </div>

//                             <div className="flex flex-col sm:flex-row justify-between gap-3 mt-4">
//                                 <button
//                                     onClick={handleExecute}
//                                     className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
//                                 >
//                                     ▶ Execute
//                                 </button>
//                                 <div className="flex gap-3">
//                                     <button
//                                         onClick={() => setFormOpen(false)}
//                                         className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
//                                     >
//                                         Cancel
//                                     </button>
//                                     <button
//                                         onClick={handleSave}
//                                         className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
//                                     >
//                                         Save
//                                     </button>
//                                 </div>
//                             </div>

//                             {results?.length > 0 && (
//                                 <div className="overflow-auto mt-6 border rounded text-xs sm:text-sm">
//                                     <table className="w-full border-collapse">
//                                         <thead className="bg-gray-100">
//                                             <tr>
//                                                 {Object.keys(results[0] || {}).map((col) => (
//                                                     <th key={col} className="px-3 py-2 border">
//                                                         {col}
//                                                     </th>
//                                                 ))}
//                                             </tr>
//                                         </thead>
//                                         <tbody>
//                                             {results.map((row, i) => (
//                                                 <tr key={i} className="odd:bg-white even:bg-gray-50">
//                                                     {Object.keys(row).map((col) => (
//                                                         <td key={col} className="px-3 py-2 border">
//                                                             {row[col]}
//                                                         </td>
//                                                     ))}
//                                                 </tr>
//                                             ))}
//                                         </tbody>
//                                     </table>
//                                 </div>
//                             )}
//                         </div>
//                     ) : selectedModule ? (
//                         <div className="bg-white p-4 sm:p-6 rounded-xl shadow-md max-w-4xl mx-auto relative">
//                             <h2 className="text-lg sm:text-2xl font-bold mb-4">{selectedModule.title}</h2>

//                             <p className="mb-2 text-gray-700 text-sm sm:text-base flex items-start gap-2">
//                                 <strong>Query:</strong>
//                                 <code className="break-all">{selectedModule.sqlQuery}</code>

//                                 {/* Copy button */}
//                                 <button
//                                     type="button"
//                                     onClick={handleCopyQuery}
//                                     className="ml-2 p-1 text-blue-600 hover:text-blue-800 transition-colors"
//                                     title={copiedQuery ? "Copied!" : "Copy SQL query"}
//                                 >
//                                     {copiedQuery ? <FaCheck className="text-blue-600" /> : <FaRegCopy />}
//                                 </button>
//                             </p>

//                             <p className="mb-2 text-gray-700 text-sm sm:text-base">
//                                 <strong>Visualization:</strong> {selectedModule.visualizationType.charAt(0).toUpperCase() +
//                                     selectedModule.visualizationType.slice(1)}
//                             </p>
//                             <div
//                                 className="flex flex-wrap gap-3 mt-3 text-sm sm:text-lg"
//                             >
//                                 <button
//                                     onClick={() => handleEdit(selectedModule)}
//                                     className="px-3 py-1.5 sm:px-4 sm:py-2 bg-yellow-100 text-yellow-700 font-medium rounded-lg hover:bg-yellow-200"
//                                 >
//                                     ✎ Edit
//                                 </button>
//                                 <button
//                                     onClick={() => {
//                                         setModuleToDelete(selectedModule);
//                                         setDeleteModalOpen(true);
//                                     }}
//                                     className="px-3 py-1.5 sm:px-4 sm:py-2 bg-red-100 text-red-700 font-medium rounded-lg hover:bg-red-200"
//                                 >
//                                     🗑 Delete
//                                 </button>
//                             </div>
//                         </div>

//                     ) : suggestionDetails ? (
//                         <div className="flex items-center justify-center text-gray-500 text-sm sm:text-lg">
//                             Suggestion details are being viewed above.
//                         </div>
//                     ) : (
//                         <div className="flex items-center justify-center text-gray-500 text-sm sm:text-lg">
//                             Select a module from the list to view details or click a suggestion to manage it.
//                         </div>
//                     )}
//                     {/* ------------------------------------- */}
//                     {/* --- 💡 Customer Suggestions Section --- */}
//                     {/* ------------------------------------- */}
//                     <div className="bg-white p-4 sm:p-6 rounded-xl shadow-md mt-8">
//                         <h2 className="text-xl sm:text-2xl font-bold text-indigo-700 mb-4 border-b pb-2">
//                             💡 Customer Suggestions ({suggestions.length})
//                         </h2>

//                         {suggestionError && (
//                             <div className="p-2 bg-red-100 text-red-700 rounded text-sm mb-2">{suggestionError}</div>
//                         )}

//                         {suggestionLoading ? (
//                             <p className="text-center py-4 text-gray-500">Loading suggestions...</p>
//                         ) : suggestionDetails ? (
//                             // --- Suggestion Details View (Admin Functionality) ---
//                             <div className="space-y-4">
//                                 <button
//                                     onClick={() => setSuggestionDetails(null)}
//                                     className="text-blue-600 hover:text-blue-800 text-sm mb-3 flex items-center gap-1"
//                                 >
//                                     ⬅ Back to List
//                                 </button>
//                                 <h4 className="text-xl font-bold">{suggestionDetails.title}</h4>
//                                 <p className="text-sm text-gray-600">
//                                     Submitted: {formatDate(suggestionDetails.submittedAt)} | Status:
//                                     <span className={`font-semibold 
//                                         ${suggestionDetails.status === 'Pending' ? 'text-orange-500' :
//                                             suggestionDetails.status === 'Created' ? 'text-green-600' : 'text-red-600'}`}>
//                                         {suggestionDetails.status}
//                                     </span>
//                                 </p>
//                                 {/* Using description which is mapped from SuggestionText */}
//                                 <p className="whitespace-pre-wrap border p-3 rounded bg-gray-50">{suggestionDetails.description}</p>

//                                 {/* Admin Response field - NOW EDITABLE */}
//                                 <div className="pt-2">
//                                     <label className="block text-sm font-medium text-gray-700 mb-1">Admin Response</label>
//                                     <textarea
//                                         rows="3"
//                                         placeholder="Enter admin notes or final response here..."
//                                         value={suggestionDetails.adminResponse || ''}
//                                         onChange={handleAdminResponseChange} // BIND TO EDIT HANDLER
//                                         className={`w-full p-2 border rounded resize-none ${suggestionDetails.status === 'Pending' ? 'bg-white' : 'bg-gray-100'}`}
//                                         disabled={suggestionDetails.status !== 'Pending'} // Disable if already acted upon
//                                     />
//                                 </div>

//                                 {/* ACTION BUTTONS */}
//                                 {suggestionDetails.status === 'Pending' ? (
//                                     <div className="flex gap-3 pt-2 border-t">
//                                         {/* Button to Mark as Created (Green) */}
//                                         <button
//                                             onClick={() => openActionConfirmation('create')}
//                                             className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
//                                         >
//                                             ✔ Mark as Created
//                                         </button>
//                                         {/* Button to Reject (Red) */}
//                                         <button
//                                             onClick={() => openActionConfirmation('reject')}
//                                             className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
//                                         >
//                                             ✖ Reject
//                                         </button>
//                                     </div>
//                                 ) : (
//                                     <p className={`text-sm font-medium pt-2 
//                                         ${suggestionDetails.status === 'Created' ? 'text-green-700' : 'text-red-700'}`}>
//                                         This suggestion has been marked as {suggestionDetails.status}.
//                                     </p>
//                                 )}
//                             </div>
//                         ) : suggestions.length > 0 ? (
//                             // --- Suggestions List View ---
//                             <ul className="space-y-3 max-h-[50vh] overflow-y-auto pr-2">
//                                 {suggestions.map((s) => (
//                                     <li
//                                         key={s.id}
//                                         className={`p-4 rounded-lg shadow transition cursor-pointer border 
//                                         ${s.status === 'Pending' ? 'bg-orange-50 hover:bg-orange-100 border-orange-300' :
//                                             s.status === 'Created' ? 'bg-green-50 hover:bg-green-100 border-green-300' : 'bg-red-50 hover:bg-red-100 border-red-300'}`}
//                                         onClick={() => handleSelectSuggestion(s)}
//                                     >
//                                         <div className="font-bold text-gray-900 flex justify-between items-center">
//                                             <span>{s.title}</span>
//                                             <span className={`text-xs font-semibold px-2 py-0.5 rounded-full 
//                                             ${s.status === 'Pending' ? 'bg-orange-200 text-orange-800' :
//                                                 s.status === 'Created' ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`
//                                             }>
//                                                 {s.status}
//                                             </span>
//                                         </div>
//                                         <p className="text-sm text-gray-700 mt-1 truncate">{s.description}</p>
//                                     </li>
//                                 ))}
//                             </ul>
//                         ) : (
//                             <p className="text-center py-4 text-gray-500">No suggestions recorded for this user.</p>
//                         )}
//                     </div>          
//                 </main>
//             </div>

//             {/* Delete Module Modal */}
//             {deleteModalOpen && (
//                 <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 p-4">
//                     <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6">
//                         <h4 className="text-lg font-semibold mb-4">Confirm Delete</h4>
//                         <p className="text-sm sm:text-md mb-6">
//                             Are you sure you want to delete the module "{moduleToDelete?.title}"?
//                         </p>
//                         <div className="flex justify-end gap-3">
//                             <button
//                                 onClick={() => setDeleteModalOpen(false)}
//                                 className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
//                             >
//                                 Cancel
//                             </button>
//                             <button
//                                 onClick={handleDeleteConfirm}
//                                 className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
//                             >
//                                 Yes, Delete
//                             </button>
//                         </div>
//                     </div>
//                 </div>
//             )}
//             {/* Transfer User List Modal */}
//             {showUserList && (
//                 <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50 p-4">
//                     <div className="bg-white rounded-xl p-6 w-full max-w-md">
//                         <h3 className="text-lg font-bold mb-4">Select Target User</h3>
//                         <select
//                             className="w-full border rounded-lg p-2 mb-4"
//                             value={targetUser}
//                             onChange={(e) => setTargetUser(e.target.value)}
//                         >
//                             <option value="">Select a user</option>
//                             {users.map((u) => (
//                                 <option key={u.id} value={u.id}>{u.companyName}</option>
//                             ))}
//                         </select>
//                         <div className="flex justify-end gap-3">
//                             <button onClick={() => setShowUserList(false)} className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">Cancel</button>
//                             <button onClick={handleTransferCheck} className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">Transfer</button>
//                         </div>
//                     </div>
//                 </div>
//             )}
//             {/* Duplicate Transfer Modal */}
//             {duplicates.length > 0 && (
//                 <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50 p-4">
//                     <div className="bg-white rounded-xl p-6 max-w-lg w-full">
//                         <h3 className="text-lg font-bold mb-4">Duplicate Modules Found</h3>
//                         <p className="text-gray-700 mb-3">These modules already exist in target user:</p>
//                         <ul className="mb-4 text-sm text-gray-600 list-disc list-inside">
//                             {duplicates.map((d) => <li key={d.userQueryId}>{d.userTitle}</li>)}
//                         </ul>
//                         <div className="flex justify-end gap-3 flex-wrap">
//                             <button onClick={() => handleDuplicateAction("cancel")} className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">Cancel</button>
//                             <button onClick={() => handleDuplicateAction("ignore")} className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">Ignore Duplicates</button>
//                             <button onClick={() => handleDuplicateAction("replace")} className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600">Replace Existing</button>
//                         </div>
//                     </div>
//                 </div>
//             )}
//             {/* Suggestion Action Confirmation Modal (Simplified) */}
//             {actionToConfirm && (
//                 <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 p-4">
//                     <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6">
//                         <h4 className="text-lg font-semibold mb-4">
//                             {actionToConfirm === 'reject' ? "Confirm Rejection" : "Confirm Module Creation"}
//                         </h4>
//                         <p className="text-sm sm:text-md mb-6">
//                             {actionToConfirm === 'reject'
//                                 ? `Are you sure you want to mark this suggestion as 'Rejected'? A reason is expected in the Admin Response box.`
//                                 : `Are you sure you want to mark this suggestion as 'Created'?`}
                            
//                             {/* Warning if no rejection reason is provided */}
//                             {actionToConfirm === 'reject' && (!suggestionDetails?.adminResponse || !suggestionDetails.adminResponse.trim()) && (
//                                 <span className="block mt-2 text-red-600 font-semibold">⚠️ Warning: The Admin Response field is currently empty.</span>
//                             )}
//                         </p>

//                         <div className="flex justify-end gap-3">
//                             <button
//                                 onClick={() => setActionToConfirm(null)}
//                                 className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
//                             >
//                                 Cancel
//                             </button>
//                             <button
//                                 onClick={() => handleSuggestionAction(actionToConfirm)}
//                                 className={`px-4 py-2 text-white rounded-lg 
//                                 ${actionToConfirm === 'reject' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
//                             >
//                                 {actionToConfirm === 'reject' ? "Yes, Reject" : "Yes, Mark Created"}
//                             </button>
//                         </div>
//                     </div>
//                 </div>
//             )}
//         </div>
//     );
// }

import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../api";
import { FaRegCopy, FaCheck, FaCog, FaUsers, FaTrashAlt, FaPlus, FaChevronDown, FaChevronUp } from "react-icons/fa";

export default function UserModules() {
    const { id } = useParams();
    const [modules, setModules] = useState([]);
    const [companyName, setCompanyName] = useState("");
    const [customerName, setCustomerName, ] = useState("");
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

    // --- New State for Suggestions Module ---
    const [suggestions, setSuggestions] = useState([]);
    const [suggestionLoading, setSuggestionLoading] = useState(false);
    const [suggestionDetails, setSuggestionDetails] = useState(null);
    const [suggestionError, setSuggestionError] = useState("");
    const [actionToConfirm, setActionToConfirm] = useState(null); // 'create' or 'reject'
    const [suggestionsOpen, setSuggestionsOpen] = useState(true); // New state for collapse
    // ----------------------------------------

    const [messages, setMessages] = useState({ type: "", text: "", visible: false });
    const [moduleToDelete, setModuleToDelete] = useState(null);
    const [formError, setFormError] = useState("");
    const [formSuccess, setFormSuccess] = useState("");

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

    // Combined useEffect for initial load and ID changes
    useEffect(() => {
        setCurrentUserId(id);
        loadUserAndModules();
        loadUserSuggestions(); // Load suggestions on mount/ID change
    }, [id]);

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

        return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
    };

    const loadUserAndModules = async () => {
        try {
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
        }
    };

    // --- New Function to Load Suggestions ---
    const loadUserSuggestions = async () => {
        setSuggestionLoading(true);
        setSuggestionError("");
        try {
            const res = await api.get(`/admin/user/${id}/suggestions`);

            const normalizedSuggestions = (res.data || []).map((s) => ({
                id: s.id,
                title: s.suggestionText ? s.suggestionText.substring(0, 50) + '...' : "Untitled Suggestion",
                description: s.suggestionText || "",
                submittedAt: s.createdAt,
                status: s.status || "Pending",
                adminResponse: s.adminResponse || "", // ADDED: Pull adminResponse from API
            }));

            setSuggestions(normalizedSuggestions);
            
            // If suggestionDetails is open, update its content (for live updates)
            if (suggestionDetails) {
                 const updatedDetails = normalizedSuggestions.find(s => s.id === suggestionDetails.id);
                 if (updatedDetails) {
                   setSuggestionDetails(updatedDetails);
                 }
            }

        } catch (err) {
            console.error("Failed to load user suggestions", err);
            setSuggestionError(err.response?.data?.message || "Failed to load suggestions.");
        } finally {
            setSuggestionLoading(false);
        }
    };
    // ----------------------------------------

    const handleSelect = (m) => {
        setSelectedModule(m);
        setFormOpen(false);
        setResults([]);
        setFormError("");
        setFormSuccess("");
        setSuggestionDetails(null); // Deselect suggestion when a module is selected
    };

    // --- New Function to Handle Suggestion Selection ---
    const handleSelectSuggestion = (s) => {
        // Set suggestionDetails including the current adminResponse
        setSuggestionDetails(s);
        setFormOpen(false); // Close module form if open
        setSelectedModule(null); // Deselect any selected module
        setResults([]);
        setSuggestionsOpen(true); // Ensure suggestions are open when one is selected
    };
    // --------------------------------------------------

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

    // --- Core Action: Use AdminResponse from suggestionDetails state ---
    const handleSuggestionAction = async (action) => {
        // Get the current AdminResponse text from the state
        const adminResponse = suggestionDetails.adminResponse || "";

        let endpoint = "";
        let successMessage = "";
        let payload = { AdminResponse: adminResponse };

        if (action === 'create') {
            endpoint = `/admin/mark-created/${suggestionDetails.id}`;
            successMessage = `Suggestion marked as Created successfully.`;
        } else if (action === 'reject') {
            // Check for required AdminResponse for rejection
            if (!adminResponse.trim()) {
                showMessages("error", "Rejection reason (AdminResponse) is required.");
                setActionToConfirm(null); // Close confirmation modal
                return;
            }
            endpoint = `/admin/reject-suggestion/${suggestionDetails.id}`;
            successMessage = `Suggestion rejected successfully.`;
        } else {
            return; // Safety exit
        }

        try {
            const res = await api.post(endpoint, payload);

            if (res.status === 200 || res.status === 201) {
                showMessages("success", successMessage);
                
                // Immediately update the status before reloading for a "live" feel
                setSuggestionDetails(prev => ({ ...prev, status: action === 'create' ? 'Created' : 'Rejected' }));
                
                // Reload data shortly after to ensure full sync
                setTimeout(() => loadUserSuggestions(), 500);
                
                setActionToConfirm(null);
                // We leave setSuggestionDetails open so the admin can see the result, but close the modal
            } else {
                showMessages("error", res.data?.message || `Failed to update suggestion status.`);
                setActionToConfirm(null);
            }
        } catch (err) {
            console.error("Error executing suggestion action", err);
            showMessages("error", err.response?.data?.message || "Error processing suggestion action.");
            setActionToConfirm(null);
        }
    };

    // --- Helper to open the confirmation modal/dialog (No text prefill needed) ---
    const openActionConfirmation = (action) => {
        setActionToConfirm(action);
    };

    // Handler for editing the Admin Response text field
    const handleAdminResponseChange = (e) => {
        setSuggestionDetails(prev => ({
            ...prev,
            adminResponse: e.target.value
        }));
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
            isApprovalModule: m.isApprovalModule || false,
            approvalUpdateQuery: m.approvalUpdateQuery || "",
            approvalIdColumn: m.approvalIdColumn || "",
        });
        setFormOpen(true);
        setSelectedModule(null);
        setSuggestionDetails(null); // Close suggestion details
        setResults([]);
        setFormError("");
        setFormSuccess("");
    };

    const handleAddNew = () => {
        setFormData({ id: 0, title: "", sqlQuery: "", visualizationType: "table" });
        setFormOpen(true);
        setSelectedModule(null);
        setSuggestionDetails(null); // Close suggestion details
        setResults([]);
        setFormError("");
        setFormSuccess("");
    };

    const handleTransferCheck = async () => {
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
        }
    };

    const handleDuplicateAction = async (action) => {
        const res = await api.post("/admin/transfer-modules", {
            sourceUserId: currentUserId,
            targetUserId: targetUser,
            moduleIds: selectedModules,
            action
        });

        showMessages("success", res.data.message); // Using showMessages for consistency
        setDuplicates([]);
        setShowUserList(false);
        loadUserAndModules(); // Reload modules list after transfer
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


    return (
        <div className="min-h-screen flex flex-col bg-gray-50 font-sans">
            {/* Header & Breadcrumb */}
            <header className="bg-white p-4 sm:p-6 border-b shadow-sm">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 max-w-7xl mx-auto">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-800 flex items-center gap-2">
                            <FaCog className="text-indigo-600" /> User Modules: <span className="text-indigo-600">{companyName}</span>
                        </h1>
                        {customerName && <p className="text-sm sm:text-lg text-gray-500 mt-1 ml-8">Customer ID: {customerName}</p>}
                    </div>
                    <Link
                        to="/admin/users"
                        state={{ keepFilters: true }}
                        className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg font-semibold hover:bg-indigo-200 transition-colors flex items-center gap-1 text-sm"
                    >
                        <FaUsers className="text-indigo-500" /> Back to Users
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
                            <h2 className="text-xl font-bold text-gray-700">Assigned Modules ({modules.length})</h2>
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

                        {/* Select All / Batch Actions */}
                        <div className="flex items-center gap-3 mb-4 p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                            <input
                                type="checkbox"
                                checked={selectedModules.length === modules.length && modules.length > 0}
                                onChange={(e) => {
                                    if (e.target.checked) {
                                        setSelectedModules(modules.map((m) => m.id));
                                    } else {
                                        setSelectedModules([]);
                                    }
                                }}
                                className="w-4 h-4 accent-indigo-600"
                            />
                            <label className="text-sm font-medium text-indigo-800">
                                Select All Modules
                            </label>
                        </div>

                        {/* Scrollable Module List */}
                        <ul className="space-y-4 flex-1 overflow-y-auto max-h-[75vh] pr-2 -mr-2">
                            {modules.length === 0 ? (
                                <p className="text-center p-8 text-gray-500 bg-gray-100 rounded-lg italic">No modules defined for this user. Add a new one above.</p>
                            ) : (
                                modules.map((m) => (
                                    <li
                                        key={m.id}
                                        className={`p-4 rounded-xl shadow-md transition-all border ${selectedModules.includes(m.id)
                                            ? "border-4 border-indigo-500 bg-indigo-50"
                                            : "border-gray-200 hover:shadow-lg bg-white"
                                            } ${m.hideQuery ? "opacity-60 grayscale" : ""}`}
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
                                                <div className="text-xs text-gray-500 mt-1">
                                                    Type: <span className="font-semibold text-blue-700">{m.visualizationType.toUpperCase()}</span> | 
                                                    Created: {formatDate(m.createdAt).substring(0, 10)}
                                                </div>
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
                                                onClick={() => toggleHideModule(m)}
                                                className={`px-3 py-1 font-medium rounded-lg text-xs transition-colors ${m.hideQuery
                                                    ? "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                                    : "bg-purple-100 text-purple-700 hover:bg-purple-200"
                                                    }`}
                                            >
                                                {m.hideQuery ? "👁 Show" : "🙈 Hide"}
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
                    {/* --- 💡 Customer Suggestions Section --- */}
                    <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
                        <div 
                            className="flex justify-between items-center mb-4 border-b pb-2 cursor-pointer"
                            onClick={() => setSuggestionsOpen(!suggestionsOpen)} // Toggle logic here
                        >
                            <h2 className="text-xl font-bold text-green-700 flex items-center gap-2">
                                <FaPlus className="text-green-600" /> Suggestions ({suggestions.length})
                            </h2>
                            {suggestionsOpen ? (
                                <FaChevronUp className="text-gray-500 transition-transform" />
                            ) : (
                                <FaChevronDown className="text-gray-500 transition-transform" />
                            )}
                        </div>

                        {/* Suggestions Content (Conditionally Rendered) */}
                        {suggestionsOpen && (
                            <>
                                {suggestionError && (
                                    <div className="p-3 bg-red-100 text-red-700 rounded text-sm mb-3 border border-red-300">{suggestionError}</div>
                                )}

                                {suggestionLoading ? (
                                    <p className="text-center py-6 text-gray-500">Loading suggestions...</p>
                                ) : suggestionDetails ? (
                                    // --- Suggestion Details View (Admin Functionality) ---
                                    <div className="space-y-4">
                                        <button
                                            onClick={() => setSuggestionDetails(null)}
                                            className="text-blue-600 hover:text-blue-800 text-sm mb-3 flex items-center gap-1 font-medium"
                                        >
                                            ⬅ Back to List
                                        </button>
                                        <h4 className="text-lg font-bold text-gray-800">{suggestionDetails.title}</h4>
                                        <p className="text-xs text-gray-500">
                                            Submitted: {formatDate(suggestionDetails.submittedAt)} | Status:
                                            <span className={`ml-1 font-bold ${suggestionDetails.status === 'Pending' ? 'text-orange-500' :
                                                suggestionDetails.status === 'Created' ? 'text-green-600' : 'text-red-600'}`}>
                                                {suggestionDetails.status}
                                            </span>
                                        </p>
                                        
                                        <div className="border p-3 rounded-lg bg-gray-50">
                                            <label className="block text-xs font-semibold uppercase mb-1 text-gray-600">Suggestion Details</label>
                                            <p className="whitespace-pre-wrap text-sm text-gray-800">{suggestionDetails.description}</p>
                                        </div>

                                        {/* Admin Response field - NOW EDITABLE */}
                                        <div className="pt-2">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Admin Response</label>
                                            <textarea
                                                rows="3"
                                                placeholder="Enter admin notes or final response here..."
                                                value={suggestionDetails.adminResponse || ''}
                                                onChange={handleAdminResponseChange}
                                                className={`w-full p-2 border rounded resize-none text-sm transition-colors ${suggestionDetails.status === 'Pending' ? 'bg-white border-indigo-300' : 'bg-gray-100 border-gray-200'}`}
                                                disabled={suggestionDetails.status !== 'Pending'}
                                            />
                                        </div>

                                        {/* ACTION BUTTONS */}
                                        {suggestionDetails.status === 'Pending' ? (
                                            <div className="flex gap-3 pt-3 border-t">
                                                <button
                                                    onClick={() => openActionConfirmation('create')}
                                                    className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium flex-1"
                                                >
                                                    ✔ Mark Created
                                                </button>
                                                <button
                                                    onClick={() => openActionConfirmation('reject')}
                                                    className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium flex-1"
                                                >
                                                    ✖ Reject
                                                </button>
                                            </div>
                                        ) : (
                                            <p className={`text-sm font-medium pt-2 text-center p-2 rounded 
                                                ${suggestionDetails.status === 'Created' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                Action completed: {suggestionDetails.status}.
                                            </p>
                                        )}
                                    </div>
                                ) : suggestions.length > 0 ? (
                                    // --- Suggestions List View ---
                                    <ul className="space-y-3 max-h-80 overflow-y-auto pr-2 -mr-2">
                                        {suggestions.map((s) => (
                                            <li
                                                key={s.id}
                                                className={`p-3 rounded-lg shadow-sm transition border cursor-pointer 
                                                ${s.status === 'Pending' ? 'bg-orange-50 hover:bg-orange-100 border-orange-200' :
                                                    s.status === 'Created' ? 'bg-green-50 hover:bg-green-100 border-green-200' : 'bg-red-50 hover:bg-red-100 border-red-200'}`}
                                                onClick={() => handleSelectSuggestion(s)}
                                            >
                                                <div className="font-semibold text-gray-800 flex justify-between items-center">
                                                    <span>{s.title}</span>
                                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full 
                                                        ${s.status === 'Pending' ? 'bg-orange-200 text-orange-800' :
                                                            s.status === 'Created' ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`
                                                    }>
                                                        {s.status}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-gray-600 mt-1 truncate">{s.description}</p>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-center py-6 text-gray-500 italic">No new suggestions for this user.</p>
                                )}
                            </>
                        )}
                    </div>

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
                                        value={formData.sqlQuery}
                                        onChange={(e) => setFormData({ ...formData, sqlQuery: e.target.value })}
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
                                
                                {/* Approval Module Checkbox */}
                                <div className="flex items-center gap-2 mt-4 p-2 bg-gray-50 rounded border">
                                    <input
                                        type="checkbox"
                                        checked={formData.isApprovalModule}
                                        onChange={(e) => setFormData({ ...formData, isApprovalModule: e.target.checked })}
                                        className="w-4 h-4 accent-indigo-600"
                                    />
                                    <label className="text-sm font-medium text-gray-700">Enable Approval Module</label>
                                </div>
                                {formData.isApprovalModule && (
                                    <div className="space-y-2 mt-2 p-2 border border-yellow-300 bg-yellow-50 rounded">
                                        <input type="text" placeholder="Approval Update Query" value={formData.approvalUpdateQuery} onChange={(e) => setFormData({ ...formData, approvalUpdateQuery: e.target.value })} className="w-full p-2 border rounded text-xs" />
                                        <input type="text" placeholder="ID Column Name" value={formData.approvalIdColumn} onChange={(e) => setFormData({ ...formData, approvalIdColumn: e.target.value })} className="w-full p-2 border rounded text-xs" />
                                    </div>
                                )}
                                
                                {/* Form Actions */}
                                <div className="flex justify-end gap-3 pt-3 border-t">
                                    <button onClick={() => setFormOpen(false)} className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors text-sm">
                                        Cancel
                                    </button>
                                    <button onClick={handleExecute} className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm">
                                        ▶ Test Run
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
                                        <code className="block text-xs sm:text-sm font-mono break-all bg-gray-100 p-2 rounded">{selectedModule.sqlQuery}</code>
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
                                {selectedModule.isApprovalModule && (
                                    <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-300 text-sm">
                                        <p className="font-bold text-yellow-800 mb-1">Approval Module Config:</p>
                                        <p className="text-xs break-all">Update Query: {selectedModule.approvalUpdateQuery}</p>
                                        <p className="text-xs break-all">ID Column: {selectedModule.approvalIdColumn}</p>
                                    </div>
                                )}
                                
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
                        <h4 className="text-xl font-bold text-red-700 mb-4 flex items-center gap-2"><FaTrashAlt className="text-red-500"/> Confirm Deletion</h4>
                        <p className="text-gray-700 mb-6">
                            Are you sure you want to permanently delete the module: <br/>
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
            
            {/* Transfer User List Modal */}
            {showUserList && (
                <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl border-t-4 border-blue-500">
                        <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2"><FaUsers className="text-blue-500"/> Transfer Modules</h3>
                        <p className="text-sm text-gray-600 mb-3">Transfer {selectedModules.length} selected module(s) from current user to:</p>
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
                                Check for Duplicates
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
                        <ul className="mb-5 p-3 bg-yellow-50 rounded border border-yellow-200 max-h-40 overflow-y-auto text-sm">
                            {duplicates.map((d) => <li key={d.userQueryId} className="flex items-center gap-2"><FaRegCopy className="text-yellow-600"/> {d.userTitle}</li>)}
                        </ul>
                        <div className="flex justify-end gap-3 flex-wrap">
                            <button onClick={() => handleDuplicateAction("cancel")} className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors text-sm">Cancel Transfer</button>
                            <button onClick={() => handleDuplicateAction("ignore")} className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors text-sm">Keep Both (Rename)</button>
                            <button onClick={() => handleDuplicateAction("replace")} className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm">Replace Existing</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Suggestion Action Confirmation Modal */}
            {actionToConfirm && (
                <div className="fixed inset-0 flex items-center justify-center bg-black/60 z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 border-t-4 border-indigo-500">
                        <h4 className="text-xl font-bold mb-3 text-gray-800">
                            Confirm Action: {actionToConfirm === 'reject' ? "Reject" : "Create Module"}
                        </h4>
                        <p className="text-sm text-gray-600 mb-4">
                            Confirm you want to mark suggestion ID **{suggestionDetails?.id}** as **{actionToConfirm === 'reject' ? 'Rejected' : 'Created'}** for user **{companyName}**.
                        </p>

                        {actionToConfirm === 'reject' && (!suggestionDetails?.adminResponse || !suggestionDetails.adminResponse.trim()) && (
                            <div className="p-3 mb-4 bg-red-100 text-red-800 rounded-lg text-sm border border-red-300">
                                ⚠️ **Warning:** The Admin Response text is empty. Rejection without a reason is generally discouraged.
                            </div>
                        )}

                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setActionToConfirm(null)}
                                className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleSuggestionAction(actionToConfirm)}
                                className={`px-4 py-2 text-white rounded-lg transition-colors font-medium ${actionToConfirm === 'reject' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
                            >
                                {actionToConfirm === 'reject' ? "Yes, Reject" : "Yes, Finalize"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}