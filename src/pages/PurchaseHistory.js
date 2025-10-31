// src/pages/PurchaseHistory.jsx
import React, { useState, useEffect } from "react";
import api from "../api";
import { FaArrowDown } from "react-icons/fa";

// Custom hook for media queries (mobile-first detection)
const useMediaQuery = (query) => {
    const [matches, setMatches] = useState(false);
    useEffect(() => {
        const media = window.matchMedia(query);
        setMatches(media.matches);
        const listener = () => setMatches(media.matches);
        media.addEventListener('change', listener);
        return () => media.removeEventListener('change', listener);
    }, [query]);
    return matches;
};

export default function PurchaseHistory() {
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const invoicesPerPage = 10; // For handling large data

    useEffect(() => {
        fetchInvoices();
    }, []);

    const fetchInvoices = async () => {
        try {
            setLoading(true);
            const res = await api.get("/user/orders");
            setInvoices(res.data);
        } catch (err) {
            console.error("Failed to fetch invoices", err);
            setError("Failed to load purchase history. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const downloadInvoice = async (orderId, invoiceNumber) => {
        try {
            const res = await api.get(`/subscription/download-invoice/${orderId}`, { responseType: "blob" });

            const url = window.URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
            const link = document.createElement("a");
            link.href = url;
            link.setAttribute("download", `Invoice_${invoiceNumber}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error("Failed to download invoice", err);
            alert("Failed to download invoice. Please try again.");
        }
    };

    const getIndianTime = () =>
        new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" });

    // Pagination logic
    const indexOfLastInvoice = currentPage * invoicesPerPage;
    const indexOfFirstInvoice = indexOfLastInvoice - invoicesPerPage;
    const currentInvoices = invoices.slice(indexOfFirstInvoice, indexOfLastInvoice);
    const totalPages = Math.ceil(invoices.length / invoicesPerPage);

    // Detect mobile screens
    const isMobile = useMediaQuery('(max-width: 767px)');

    // Render invoices as cards on mobile
    const renderInvoiceCards = () => (
        <div className="space-y-4">
            {currentInvoices.map((inv) => {
                const now = new Date(getIndianTime());
                const isActive = new Date(inv.planEndDate) >= now;

                return (
                    <div key={inv.id} className={`bg-white border border-gray-300 rounded-lg p-4 shadow-sm ${isActive ? "bg-green-50" : ""}`}>
                        <div className="space-y-1 text-sm">
                            <p><strong>Invoice Number:</strong> {inv.invoiceNumber}</p>
                            <p><strong>Plan Name:</strong> {inv.planName} {isActive && <span className="px-2 py-0.5 bg-green-600 text-white text-xs rounded-full ml-2">Active</span>}</p>
                            <p><strong>Duration (Days):</strong> {inv.planDuration}</p>
                            <p><strong>Amount:</strong> ₹ {inv.amount.toFixed(2)}</p>
                            <p><strong>Payment Date:</strong> {new Date(inv.paymentDate).toLocaleString("en-IN", {
                                timeZone: "Asia/Kolkata",
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                            })}</p>
                        </div>
                        <div className="flex justify-center mt-3">
                            <button
                                onClick={() => downloadInvoice(inv.razorpayOrderId, inv.invoiceNumber)}
                                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-2"
                            >
                                <FaArrowDown /> Download
                            </button>
                        </div>
                    </div>
                );
            })}
            {invoices.length === 0 && (
                <p className="text-center text-gray-500 py-6 italic">No purchase history found.</p>
            )}
        </div>
    );

    if (loading) return <div className="p-6 min-h-screen max-w-6xl mx-auto text-center">Loading...</div>;
    if (error) return <div className="p-6 min-h-screen max-w-6xl mx-auto text-center text-red-500">{error}</div>;

    return (
        <div className="p-4 sm:p-6 min-h-screen max-w-6xl mx-auto">
            <h1 className="text-xl sm:text-2xl font-bold mb-6">Purchase History</h1>

            {isMobile ? renderInvoiceCards() : (
                <div className="overflow-x-auto bg-white rounded shadow-md">
                    <table className="min-w-full border-collapse border border-gray-200">
                        <thead>
                            <tr className="bg-[#152342FF] text-white">
                                <th className="px-4 py-2 border">Invoice Number</th>
                                <th className="px-4 py-2 border">Plan Name</th>
                                <th className="px-4 py-2 border">Duration (Days)</th>
                                <th className="px-4 py-2 border">Amount</th>
                                <th className="px-4 py-2 border">Payment Date</th>
                                <th className="px-4 py-2 border">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {currentInvoices.length > 0 ? (
                                currentInvoices.map((inv) => {
                                    const now = new Date(getIndianTime());
                                    const isActive = new Date(inv.planEndDate) >= now;

                                    return (
                                        <tr
                                            key={inv.id}
                                            className={`hover:bg-gray-50 ${isActive ? "bg-green-100 font-semibold" : ""}`}
                                        >
                                            <td className="px-4 py-2 border text-center">{inv.invoiceNumber}</td>
                                            <td className="px-4 py-2 border text-center">
                                                <div className="flex justify-center items-center gap-2">
                                                    {inv.planName}
                                                    {isActive && (
                                                        <span className="px-2 py-0.5 bg-green-600 text-white text-xs rounded-full">
                                                            Active
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-2 border text-center">{inv.planDuration}</td>
                                            <td className="px-4 py-2 border text-center">₹ {inv.amount.toFixed(2)}</td>
                                            <td className="px-4 py-2 border text-center">
                                                {new Date(inv.paymentDate).toLocaleString("en-IN", {
                                                    timeZone: "Asia/Kolkata",
                                                    day: "2-digit",
                                                    month: "short",
                                                    year: "numeric",
                                                    hour: "2-digit",
                                                    minute: "2-digit",
                                                })}
                                            </td>
                                            <td className="px-4 py-2 border text-center">
                                                <div className="flex justify-center">
                                                    <button
                                                        onClick={() =>
                                                            downloadInvoice(inv.razorpayOrderId, inv.invoiceNumber)
                                                        }
                                                        className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                                                    >
                                                        <FaArrowDown />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={6} className="px-4 py-6 text-center text-gray-500">
                                        No purchase history found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex justify-center items-center mt-4 gap-2">
                    <button
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage((prev) => prev - 1)}
                        className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
                    >
                        Prev
                    </button>
                    <span>
                        Page {currentPage} of {totalPages}
                    </span>
                    <button
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage((prev) => prev + 1)}
                        className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
                    >
                        Next
                    </button>
                </div>
            )}
        </div>
    );
}
