// src/pages/ModuleSuggestionsHistory.jsx

import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { FaArrowLeft, FaLightbulb, FaCheck, FaTimes, FaHourglassHalf, FaCommentDots } from "react-icons/fa";
import { List, Loader2, RefreshCcw } from 'lucide-react'; 
import api from "../api";

export default function ModuleSuggestionsHistory() {
    const [history, setHistory] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const loadHistory = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            // This calls the endpoint we designed for the User Controller: /user/module-suggestions-history
            const res = await api.get("/user/module-suggestions-history"); 
            setHistory(res.data || []);
        } catch (err) {
            console.error("Failed to load suggestion history", err);
            setError(err.response?.data?.message || "Failed to load suggestion history. Please try again.");
            setHistory([]);
        } finally {
            setIsLoading(false);
        }
    }, []);
    
    useEffect(() => {
        loadHistory();
    }, [loadHistory]);

    // Helper function to render status chips (Kept as is)
    const renderStatusChip = (status) => {
        switch (status) {
            case 'Created':
                return (
                    <span className="flex items-center gap-1 px-3 py-1 text-xs font-semibold text-green-700 bg-green-100 rounded-full">
                        <FaCheck className="w-3 h-3" /> Created
                    </span>
                );
            case 'Pending':
                return (
                    <span className="flex items-center gap-1 px-3 py-1 text-xs font-semibold text-yellow-700 bg-yellow-100 rounded-full">
                        <FaHourglassHalf className="w-3 h-3" /> Pending
                    </span>
                );
            case 'Rejected':
                return (
                    <span className="flex items-center gap-1 px-3 py-1 text-xs font-semibold text-red-700 bg-red-100 rounded-full">
                        <FaTimes className="w-3 h-3" /> Rejected
                    </span>
                );
            default:
                return (
                    <span className="flex items-center gap-1 px-3 py-1 text-xs font-semibold text-gray-700 bg-gray-100 rounded-full">
                        Unknown
                    </span>
                );
        }
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

    return (
        <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
            {/* Header */}
            <div className="max-w-4xl mx-auto mb-8 bg-white p-6 rounded-xl shadow-lg border-t-4 border-teal-500">
                <div className="flex justify-between items-center mb-4">
                    <h1 className="text-3xl font-extrabold text-gray-900 flex items-center gap-2">
                        <FaLightbulb className="w-7 h-7 text-yellow-600"/> My Module Suggestions
                    </h1>
                    <Link
                        to="/dashboard"
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition shadow-md flex items-center gap-2 text-sm"
                    >
                        <FaArrowLeft className="w-3 h-3"/> Back to Dashboard
                    </Link>
                </div>
                <p className="text-gray-600">
                    Review the status of the module ideas you have submitted to the administrator.
                </p>
                <button 
                    onClick={loadHistory}
                    disabled={isLoading}
                    className="mt-4 px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition disabled:bg-indigo-300 flex items-center gap-2"
                >
                    {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin"/>
                    ) : (
                        <RefreshCcw className="w-4 h-4"/>
                    )}
                    {isLoading ? 'Loading...' : 'Refresh List'}
                </button>
            </div>

            {/* Error Display */}
            {error && (
                <div className="max-w-4xl mx-auto p-4 bg-red-100 text-red-800 rounded-lg mb-6 shadow-sm">
                    **Error:** {error}
                </div>
            )}

            {/* Content Area */}
            <div className="max-w-4xl mx-auto space-y-4">
                {isLoading && !error && history.length === 0 ? (
                    <div className="text-center p-10 bg-white rounded-xl shadow-md">
                        <Loader2 className="w-6 h-6 text-indigo-600 animate-spin mx-auto mb-4"/>
                        <p className="text-lg text-gray-700">Loading Suggestions...</p>
                    </div>
                ) : history.length === 0 ? (
                    <div className="text-center p-10 bg-white rounded-xl shadow-md border-t-4 border-yellow-500">
                        <List className="w-8 h-8 text-yellow-500 mx-auto mb-4"/>
                        <p className="text-lg font-semibold text-gray-800">No Suggestions Submitted</p>
                        <p className="text-gray-500">Use the suggestion feature to let us know what modules you need!</p>
                    </div>
                ) : (
                    history.map((s) => (
                        <div 
                            key={s.id} 
                            className="bg-white p-5 rounded-xl shadow-md flex flex-col items-start border-l-4 border-gray-200 hover:shadow-lg transition duration-200"
                            style={{ 
                                borderLeftColor: s.status === 'Created' ? '#10B981' : s.status === 'Pending' ? '#F59E0B' : '#EF4444' 
                            }}
                        >
                            <div className="w-full flex justify-between items-start">
                                <div className="flex-1 min-w-0 pr-4">
                                    <p className="text-lg font-bold text-gray-800 leading-snug">
                                        {s.suggestionText}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Submitted: {formatDate(s.createdAt)}
                                    </p>
                                </div>
                                <div className="flex-shrink-0">
                                    {renderStatusChip(s.status)}
                                </div>
                            </div>

                            {/* ADMIN RESPONSE / FEEDBACK SECTION (NEWLY ADDED) */}
                            {s.adminResponse && (s.status === 'Rejected' || s.status === 'Created') && (
                                <div 
                                    className={`mt-4 w-full p-3 rounded-lg text-sm flex items-start gap-2 ${
                                        s.status === 'Rejected' ? 'bg-red-50 text-red-800 border border-red-200' : 'bg-green-50 text-green-800 border border-green-200'
                                    }`}
                                >
                                    <FaCommentDots className="w-4 h-4 mt-0.5 flex-shrink-0"/>
                                    <div>
                                        <p className="font-semibold">Admin Response ({s.status}):</p>
                                        <p className="mt-0.5">{s.adminResponse}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}