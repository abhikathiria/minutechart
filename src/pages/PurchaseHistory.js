// // src/pages/PurchaseHistory.jsx
// import React, { useState, useEffect } from "react";
// import api from "../api";
// import { FaArrowDown } from "react-icons/fa";

// // Custom hook for media queries (mobile-first detection)
// const useMediaQuery = (query) => {
//     const [matches, setMatches] = useState(false);
//     useEffect(() => {
//         const media = window.matchMedia(query);
//         setMatches(media.matches);
//         const listener = () => setMatches(media.matches);
//         media.addEventListener('change', listener);
//         return () => media.removeEventListener('change', listener);
//     }, [query]);
//     return matches;
// };

// export default function PurchaseHistory() {
//     const [invoices, setInvoices] = useState([]);
//     const [loading, setLoading] = useState(true);
//     const [error, setError] = useState(null);
//     const [currentPage, setCurrentPage] = useState(1);
//     const invoicesPerPage = 10; // For handling large data

//     useEffect(() => {
//         fetchInvoices();
//     }, []);

//     const fetchInvoices = async () => {
//         try {
//             setLoading(true);
//             const res = await api.get("/user/orders");
//             setInvoices(res.data);
//         } catch (err) {
//             console.error("Failed to fetch invoices", err);
//             setError("Failed to load purchase history. Please try again.");
//         } finally {
//             setLoading(false);
//         }
//     };

//     const downloadInvoice = async (orderId, invoiceNumber) => {
//         try {
//             const res = await api.get(`/subscription/download-invoice/${orderId}`, { responseType: "blob" });

//             const url = window.URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
//             const link = document.createElement("a");
//             link.href = url;
//             link.setAttribute("download", `Invoice_${invoiceNumber}.pdf`);
//             document.body.appendChild(link);
//             link.click();
//             link.remove();
//             window.URL.revokeObjectURL(url);
//         } catch (err) {
//             console.error("Failed to download invoice", err);
//             alert("Failed to download invoice. Please try again.");
//         }
//     };

//     const getIndianTime = () =>
//         new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" });

//     // Pagination logic
//     const indexOfLastInvoice = currentPage * invoicesPerPage;
//     const indexOfFirstInvoice = indexOfLastInvoice - invoicesPerPage;
//     const currentInvoices = invoices.slice(indexOfFirstInvoice, indexOfLastInvoice);
//     const totalPages = Math.ceil(invoices.length / invoicesPerPage);

//     // Detect mobile screens
//     const isMobile = useMediaQuery('(max-width: 767px)');

//     // Render invoices as cards on mobile
//     const renderInvoiceCards = () => (
//         <div className="space-y-4">
//             {currentInvoices.map((inv) => {
//                 const now = new Date(getIndianTime());
//                 const isActive = new Date(inv.planEndDate) >= now;

//                 return (
//                     <div key={inv.id} className={`bg-white border border-gray-300 rounded-lg p-4 shadow-sm ${isActive ? "bg-green-50" : ""}`}>
//                         <div className="space-y-1 text-sm">
//                             <p><strong>Invoice Number:</strong> {inv.invoiceNumber}</p>
//                             <p><strong>Plan Name:</strong> {inv.planName} {isActive && <span className="px-2 py-0.5 bg-green-600 text-white text-xs rounded-full ml-2">Active</span>}</p>
//                             <p><strong>Duration (Days):</strong> {inv.planDuration}</p>
//                             <p><strong>Amount:</strong> ₹ {inv.amount.toFixed(2)}</p>
//                             <p><strong>Payment Date:</strong> {new Date(inv.paymentDate).toLocaleString("en-IN", {
//                                 timeZone: "Asia/Kolkata",
//                                 day: "2-digit",
//                                 month: "short",
//                                 year: "numeric",
//                                 hour: "2-digit",
//                                 minute: "2-digit",
//                             })}</p>
//                         </div>
//                         <div className="flex justify-center mt-3">
//                             <button
//                                 onClick={() => downloadInvoice(inv.razorpayOrderId, inv.invoiceNumber)}
//                                 className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-2"
//                             >
//                                 <FaArrowDown /> Download
//                             </button>
//                         </div>
//                     </div>
//                 );
//             })}
//             {invoices.length === 0 && (
//                 <p className="text-center text-gray-500 py-6 italic">No purchase history found.</p>
//             )}
//         </div>
//     );

//     if (loading) {
//         return (
//             <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-purple-50 to-indigo-50">
//                 <div className="text-lg text-gray-700 animate-pulse">Loading Purchase History...</div>
//             </div>
//         );
//     }
//     if (error) return <div className="p-6 min-h-screen max-w-6xl mx-auto text-center text-red-500">{error}</div>;

//     return (
//         <div className="p-4 sm:p-6 min-h-screen max-w-6xl mx-auto">
//             <h1 className="text-xl sm:text-2xl font-bold mb-6">Purchase History</h1>

//             {isMobile ? renderInvoiceCards() : (
//                 <div className="overflow-x-auto bg-white rounded shadow-md">
//                     <table className="min-w-full border-collapse border border-gray-200">
//                         <thead>
//                             <tr className="bg-[#152342FF] text-white">
//                                 <th className="px-4 py-2 border">Invoice Number</th>
//                                 <th className="px-4 py-2 border">Plan Name</th>
//                                 <th className="px-4 py-2 border">Duration (Days)</th>
//                                 <th className="px-4 py-2 border">Amount</th>
//                                 <th className="px-4 py-2 border">Payment Date</th>
//                                 <th className="px-4 py-2 border">Actions</th>
//                             </tr>
//                         </thead>
//                         <tbody>
//                             {currentInvoices.length > 0 ? (
//                                 currentInvoices.map((inv) => {
//                                     const now = new Date(getIndianTime());
//                                     const isActive = new Date(inv.planEndDate) >= now;

//                                     return (
//                                         <tr
//                                             key={inv.id}
//                                             className={`hover:bg-gray-50 ${isActive ? "bg-green-100 font-semibold" : ""}`}
//                                         >
//                                             <td className="px-4 py-2 border text-center">{inv.invoiceNumber}</td>
//                                             <td className="px-4 py-2 border text-center">
//                                                 <div className="flex justify-center items-center gap-2">
//                                                     {inv.planName}
//                                                     {isActive && (
//                                                         <span className="px-2 py-0.5 bg-green-600 text-white text-xs rounded-full">
//                                                             Active
//                                                         </span>
//                                                     )}
//                                                 </div>
//                                             </td>
//                                             <td className="px-4 py-2 border text-center">{inv.planDuration}</td>
//                                             <td className="px-4 py-2 border text-center">₹ {inv.amount.toFixed(2)}</td>
//                                             <td className="px-4 py-2 border text-center">
//                                                 {new Date(inv.paymentDate).toLocaleString("en-IN", {
//                                                     timeZone: "Asia/Kolkata",
//                                                     day: "2-digit",
//                                                     month: "short",
//                                                     year: "numeric",
//                                                     hour: "2-digit",
//                                                     minute: "2-digit",
//                                                 })}
//                                             </td>
//                                             <td className="px-4 py-2 border text-center">
//                                                 <div className="flex justify-center">
//                                                     <button
//                                                         onClick={() =>
//                                                             downloadInvoice(inv.razorpayOrderId, inv.invoiceNumber)
//                                                         }
//                                                         className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
//                                                     >
//                                                         <FaArrowDown />
//                                                     </button>
//                                                 </div>
//                                             </td>
//                                         </tr>
//                                     );
//                                 })
//                             ) : (
//                                 <tr>
//                                     <td colSpan={6} className="px-4 py-6 text-center text-gray-500">
//                                         No purchase history found.
//                                     </td>
//                                 </tr>
//                             )}
//                         </tbody>
//                     </table>
//                 </div>
//             )}

//             {/* Pagination Controls */}
//             {totalPages > 1 && (
//                 <div className="flex justify-center items-center mt-4 gap-2">
//                     <button
//                         disabled={currentPage === 1}
//                         onClick={() => setCurrentPage((prev) => prev - 1)}
//                         className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
//                     >
//                         Prev
//                     </button>
//                     <span>
//                         Page {currentPage} of {totalPages}
//                     </span>
//                     <button
//                         disabled={currentPage === totalPages}
//                         onClick={() => setCurrentPage((prev) => prev + 1)}
//                         className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
//                     >
//                         Next
//                     </button>
//                 </div>
//             )}
//         </div>
//     );
// }



// src/pages/PurchaseHistory.jsx
import React, { useState, useEffect, useCallback } from "react";
import api from "../api";
import { FaDownload, FaFileInvoiceDollar, FaCheckCircle, FaTimesCircle, FaArrowLeft, FaArrowRight } from "react-icons/fa";
import { Loader2 } from "lucide-react";

// Custom hook for media queries (mobile-first detection) - Kept intact
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

    // Time Utility
    const getIndianTime = useCallback(() => 
        new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }), []);
    
    // Date Formatter
    const formatPaymentDate = (dateStr) => {
        if (!dateStr) return "N/A";
        return new Date(dateStr).toLocaleString("en-IN", {
            timeZone: "Asia/Kolkata",
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    // --- Fetch Logic (Kept Intact) ---
    const fetchInvoices = async () => {
        try {
            setLoading(true);
            const res = await api.get("/user/orders");
            // Reverse the order so the newest purchase is always first
            setInvoices((res.data || []).reverse()); 
        } catch (err) {
            console.error("Failed to fetch invoices", err);
            setError("Failed to load purchase history. Please ensure you are logged in.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInvoices();
    }, []);

    const downloadInvoice = async (orderId, invoiceNumber) => {
        // Simple client-side download check to prevent duplicate clicks
        const buttonId = `download-${orderId}`;
        const button = document.getElementById(buttonId);
        if (button) button.disabled = true;

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
            alert("Failed to download invoice. Please check the network or contact support.");
        } finally {
            if (button) button.disabled = false;
        }
    };

    // --- Pagination Logic (Kept Intact) ---
    const indexOfLastInvoice = currentPage * invoicesPerPage;
    const indexOfFirstInvoice = indexOfLastInvoice - invoicesPerPage;
    const currentInvoices = invoices.slice(indexOfFirstInvoice, indexOfLastInvoice);
    const totalPages = Math.ceil(invoices.length / invoicesPerPage);
    const isMobile = useMediaQuery('(max-width: 767px)');

    // --- Conditional Render Functions ---

    // Renders the mobile card view
    const renderInvoiceCards = () => (
        <div className="space-y-4">
            {currentInvoices.map((inv) => {
                const now = new Date(getIndianTime());
                const isActive = new Date(inv.planEndDate) >= now;
                const statusColor = isActive ? "border-green-500" : "border-gray-400";

                return (
                    <div 
                        key={inv.id} 
                        className={`bg-white rounded-xl p-5 shadow-lg border-l-4 ${statusColor} transition hover:shadow-xl`}
                    >
                        <div className="flex justify-between items-start mb-3 border-b pb-2">
                            <h3 className="text-lg font-bold text-gray-800">
                                Invoice # {inv.invoiceNumber}
                            </h3>
                            <span className={`px-3 py-1 text-xs font-semibold rounded-full ${isActive ? "bg-green-600 text-white" : "bg-red-100 text-red-700"}`}>
                                {isActive ? "ACTIVE" : "EXPIRED"}
                            </span>
                        </div>
                        
                        <div className="space-y-2 text-sm text-gray-700">
                            <p className="flex justify-between">
                                <strong className="text-gray-500">Plan:</strong> 
                                <span className="font-medium text-indigo-700">{inv.planName}</span>
                            </p>
                            <p className="flex justify-between">
                                <strong className="text-gray-500">Duration:</strong> 
                                <span>{inv.planDuration} Days</span>
                            </p>
                            <p className="flex justify-between">
                                <strong className="text-gray-500">Amount:</strong> 
                                <span className="text-xl font-bold text-green-700">₹ {inv.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                            </p>
                            <p className="flex justify-between">
                                <strong className="text-gray-500">Payment Date:</strong> 
                                <span>{formatPaymentDate(inv.paymentDate)}</span>
                            </p>
                        </div>

                        <div className="mt-4 pt-4 border-t border-gray-100 flex justify-center">
                            <button
                                id={`download-${inv.razorpayOrderId}`}
                                onClick={() => downloadInvoice(inv.razorpayOrderId, inv.invoiceNumber)}
                                className="w-full sm:w-auto px-6 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition flex items-center justify-center gap-2 shadow-md"
                            >
                                <FaDownload /> Download Invoice
                            </button>
                        </div>
                    </div>
                );
            })}
            {invoices.length === 0 && (
                <p className="text-center text-gray-500 py-12 italic text-lg bg-white rounded-xl shadow-md">No purchase history found.</p>
            )}
        </div>
    );

    // Renders the desktop table view
    const renderInvoiceTable = () => (
        <div className="overflow-x-auto bg-white rounded-xl shadow-2xl border border-gray-200">
            <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-indigo-700 text-white">
                    <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold tracking-wider rounded-tl-xl">Invoice Number</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold tracking-wider">Plan Details</th>
                        <th className="px-4 py-3 text-center text-sm font-semibold tracking-wider">Duration</th>
                        <th className="px-4 py-3 text-center text-sm font-semibold tracking-wider">Amount (₹)</th>
                        <th className="px-4 py-3 text-center text-sm font-semibold tracking-wider">Payment Date</th>
                        <th className="px-4 py-3 text-center text-sm font-semibold tracking-wider rounded-tr-xl">Actions</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {currentInvoices.length > 0 ? (
                        currentInvoices.map((inv, index) => {
                            const now = new Date(getIndianTime());
                            const isActive = new Date(inv.planEndDate) >= now;
                            const rowClass = index % 2 === 0 ? "bg-white" : "bg-gray-50";

                            return (
                                <tr
                                    key={inv.id}
                                    className={`${rowClass} hover:bg-indigo-50 transition ${isActive ? "shadow-inner border-l-4 border-green-500" : ""}`}
                                >
                                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{inv.invoiceNumber}</td>
                                    <td className="px-4 py-3 text-sm font-medium text-indigo-700">
                                        <div className="flex items-center gap-2">
                                            {inv.planName}
                                            {isActive ? (
                                                <span className="px-2 py-0.5 bg-green-600 text-white text-xs rounded-full flex items-center gap-1">
                                                    <FaCheckCircle className="w-3 h-3"/> Active
                                                </span>
                                            ) : (
                                                <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full flex items-center gap-1">
                                                    <FaTimesCircle className="w-3 h-3"/> Expired
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-center text-sm text-gray-500">{inv.planDuration} Days</td>
                                    <td className="px-4 py-3 text-center text-lg font-bold text-green-700">
                                        ₹ {inv.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="px-4 py-3 text-center text-sm text-gray-700">
                                        {formatPaymentDate(inv.paymentDate)}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <button
                                            id={`download-${inv.razorpayOrderId}`}
                                            onClick={() =>
                                                downloadInvoice(inv.razorpayOrderId, inv.invoiceNumber)
                                            }
                                            className="px-3 py-1.5 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition shadow-md text-sm flex items-center justify-center mx-auto"
                                            title="Download PDF"
                                        >
                                            <FaDownload className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            );
                        })
                    ) : (
                        <tr>
                            <td colSpan={6} className="px-4 py-12 text-center text-gray-500 text-lg">
                                No purchase history found.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );

    // --- Main Render ---
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-xl text-indigo-600 font-semibold flex items-center gap-3 p-6 bg-white rounded-xl shadow-lg">
                    <Loader2 className="animate-spin w-6 h-6"/> Loading Purchase History...
                </div>
            </div>
        );
    }
    if (error) return <div className="p-10 min-h-screen max-w-6xl mx-auto text-center text-2xl font-semibold text-red-600 bg-red-50 rounded-xl shadow-md">{error}</div>;

    return (
        <div className="p-4 sm:p-8 min-h-screen bg-gray-100">
            <div className="max-w-6xl mx-auto">
                
                {/* Header Section */}
                <header className="flex items-center gap-4 mb-8 pb-3 border-b-2 border-indigo-200">
                    <FaFileInvoiceDollar className="w-8 h-8 text-indigo-600"/>
                    <h1 className="text-3xl font-extrabold text-gray-900">
                        Subscription & Purchase History
                    </h1>
                </header>

                {/* Invoice Display */}
                {isMobile ? renderInvoiceCards() : renderInvoiceTable()}

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="flex justify-center items-center mt-8 gap-4 p-4 bg-white rounded-xl shadow-md">
                        <button
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage((prev) => prev - 1)}
                            className="px-4 py-2 bg-indigo-500 text-white rounded-lg disabled:opacity-50 disabled:bg-gray-400 hover:bg-indigo-600 transition flex items-center gap-2 font-medium"
                        >
                            <FaArrowLeft className="w-3 h-3"/> Previous
                        </button>
                        <span className="text-lg font-semibold text-gray-700">
                            Page {currentPage} of {totalPages}
                        </span>
                        <button
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage((prev) => prev + 1)}
                            className="px-4 py-2 bg-indigo-500 text-white rounded-lg disabled:opacity-50 disabled:bg-gray-400 hover:bg-indigo-600 transition flex items-center gap-2 font-medium"
                        >
                            Next <FaArrowRight className="w-3 h-3"/>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}