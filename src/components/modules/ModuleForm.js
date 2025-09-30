import React, { useState, useEffect } from "react";
import api from "../../api";


export default function ModuleForm({ query, onSave, onExecute, onCancel, onDelete, message }) {
    const [form, setForm] = useState({
        userQueryId: 0,
        userTitle: "",
        userQueryText: "",
        visualizationType: "table",
    });
    const [localError, setLocalError] = useState("");
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    useEffect(() => {
        if (query) {
            setForm({
                userQueryId: query.userQueryId || 0,
                userTitle: query.userTitle || "",
                userQueryText: query.userQueryText || "",
                visualizationType: query.visualizationType || "table",
            });
            setLocalError("");
        }
    }, [query]);

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
        setLocalError("");
    };

    // shared validation
    const validateQuery = (requireSelect = false) => {
        if (!form.userQueryText.trim()) {
            setLocalError("Query cannot be empty");
            return false;
        }
        if (requireSelect && !form.userQueryText.trim().toUpperCase().startsWith("SELECT")) {
            setLocalError("Only SELECT queries are allowed");
            return false;
        }
        return true;
    };

    const handleSave = async () => {
        if (!validateQuery(true)) return;

        try {
            // step 1: validate by executing on backend
            const res = await api.post("/dashboard/execute-query", {
                sql: form.userQueryText,
            });

            const result = res.data;
            if (!result.success) {
                setLocalError(result.message || "Query validation failed");
                return; // ⬅️ important: stop here, don’t save
            }

            // step 2: if execution passed, save query
            const payload = {
                UserQueryId: form.userQueryId,
                UserTitle: form.userTitle,
                UserQueryText: form.userQueryText,
                VisualizationType: form.visualizationType,
            };
            onSave(payload);

        } catch (err) {
            setLocalError(
                err.response?.data?.message ||
                err.message ||
                "Something went wrong while validating the query"
            );
        }
    };

    const handleExecute = () => {
        if (!validateQuery(true)) return;
        onExecute(form.userQueryText);
    };

    const confirmDelete = () => {
        setShowDeleteModal(true);
    };

    const handleDeleteConfirmed = () => {
        setShowDeleteModal(false);
        onDelete(form.userQueryId);
    };

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6">
                <h3 className="text-xl font-bold mb-4">
                    {form.userQueryId ? "Edit Module" : "New Module"}
                </h3>

                <label className="block mb-3">
                    <span className="text-sm font-medium text-gray-600">Title</span>
                    <input
                        type="text"
                        name="userTitle"
                        value={form.userTitle}
                        onChange={handleChange}
                        className="w-full p-2 mt-1 border rounded-md focus:ring-2 focus:ring-blue-400"
                    />
                </label>

                <label className="block mb-3">
                    <span className="text-sm font-medium text-gray-600">SQL Query</span>
                    <textarea
                        name="userQueryText"
                        value={form.userQueryText}
                        onChange={handleChange}
                        rows="4"
                        className="w-full p-2 mt-1 border rounded-md font-mono focus:ring-2 focus:ring-blue-400"
                    />
                </label>

                <label className="block mb-4">
                    <span className="text-sm font-medium text-gray-600">Visualization</span>
                    <select
                        name="visualizationType"
                        value={form.visualizationType}
                        onChange={handleChange}
                        className="w-full p-2 mt-1 border rounded-md focus:ring-2 focus:ring-blue-400"
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
                </label>

                {/* Action buttons */}
                <div className="flex justify-end gap-3">
                    <button onClick={onCancel} className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">
                        Cancel
                    </button>
                    <button onClick={handleExecute} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                        Execute
                    </button>
                    <button onClick={handleSave} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                        Save
                    </button>
                    {form.userQueryId !== 0 && (
                        <button
                            onClick={confirmDelete}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                        >
                            Delete
                        </button>
                    )}
                </div>

                {/* Inline errors or backend messages */}
                {(localError || message) && (
                    <p
                        className={`mt-3 text-sm font-medium ${localError ? "text-red-600" :
                            message?.toLowerCase().includes("success") ? "text-green-600" : "text-red-600"
                            }`}
                    >
                        {localError || message}
                    </p>
                )}
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-60">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6">
                        <h4 className="text-lg font-semibold mb-4">Confirm Delete</h4>
                        <p className="text-md mb-6">
                            Are you sure you want to delete this module?
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setShowDeleteModal(false)}
                                className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
                            >
                                No
                            </button>
                            <button
                                onClick={handleDeleteConfirmed}
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
