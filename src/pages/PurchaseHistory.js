// // src/pages/PurchaseHistory.jsx
// import React, { useState, useEffect, useCallback } from "react";
// import api from "../api";
// import {
//   FaDownload,
//   FaFileInvoiceDollar,
//   FaCheckCircle,
//   FaTimesCircle,
//   FaArrowLeft,
//   FaArrowRight,
// } from "react-icons/fa";
// import { Loader2 } from "lucide-react";

// // Custom hook for media queries (mobile-first detection) - Kept intact
// const useMediaQuery = (query) => {
//   const [matches, setMatches] = useState(false);
//   useEffect(() => {
//     const media = window.matchMedia(query);
//     setMatches(media.matches);
//     const listener = () => setMatches(media.matches);
//     media.addEventListener("change", listener);
//     return () => media.removeEventListener("change", listener);
//   }, [query]);
//   return matches;
// };

// export default function PurchaseHistory() {
//   const [invoices, setInvoices] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);
//   const [currentPage, setCurrentPage] = useState(1);
//   const invoicesPerPage = 10; // For handling large data

//   // Time Utility
//   const getIndianTime = useCallback(
//     () => new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
//     []
//   );

//   // Date Formatter (keeps India timezone)
//   const formatPaymentDate = (dateStr) => {
//     if (!dateStr) return "N/A";
//     try {
//       return new Date(dateStr).toLocaleString("en-IN", {
//         timeZone: "Asia/Kolkata",
//         day: "2-digit",
//         month: "short",
//         year: "numeric",
//         hour: "2-digit",
//         minute: "2-digit",
//       });
//     } catch {
//       return dateStr;
//     }
//   };

//   // --- Fetch Logic (Kept Intact) ---
//   const fetchInvoices = async () => {
//     try {
//       setLoading(true);
//       const res = await api.get("/user/orders");
//       // Reverse the order so the newest purchase is always first
//       setInvoices((res.data || []).reverse());
//     } catch (err) {
//       console.error("Failed to fetch invoices", err);
//       setError("Failed to load purchase history. Please ensure you are logged in.");
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     fetchInvoices();
//   }, []);

//   const downloadInvoice = async (orderId, invoiceNumber) => {
//     // Simple client-side download check to prevent duplicate clicks
//     const buttonId = `download-${orderId}`;
//     const button = document.getElementById(buttonId);
//     if (button) button.disabled = true;

//     try {
//       const res = await api.get(`/subscription/download-invoice/${orderId}`, { responseType: "blob" });

//       const url = window.URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
//       const link = document.createElement("a");
//       link.href = url;
//       link.setAttribute("download", `Invoice_${invoiceNumber}.pdf`);
//       document.body.appendChild(link);
//       link.click();
//       link.remove();
//       window.URL.revokeObjectURL(url);
//     } catch (err) {
//       console.error("Failed to download invoice", err);
//       // keep UX-friendly message
//       alert("Failed to download invoice. Please check the network or contact support.");
//     } finally {
//       if (button) button.disabled = false;
//     }
//   };

//   // --- Pagination Logic (Kept Intact) ---
//   const indexOfLastInvoice = currentPage * invoicesPerPage;
//   const indexOfFirstInvoice = indexOfLastInvoice - invoicesPerPage;
//   const currentInvoices = invoices.slice(indexOfFirstInvoice, indexOfLastInvoice);
//   const totalPages = Math.ceil(invoices.length / invoicesPerPage);
//   const isMobile = useMediaQuery("(max-width: 767px)");

//   // --- Conditional Render Functions (Styled for glass + mixed text) ---

//   // Renders the mobile card view (glass style)
//   const renderInvoiceCards = () => (
//     <div className="space-y-4">
//       {currentInvoices.map((inv) => {
//         const now = new Date(getIndianTime());
//         const isActive = new Date(inv.planEndDate) >= now;
//         const statusColor = isActive ? "border-teal-400" : "border-rose-300";

//         return (
//           <div
//             key={inv.id}
//             className={`bg-white/6 backdrop-blur-md border ${statusColor} rounded-2xl p-5 shadow-lg transition hover:shadow-2xl`}
//             style={{ borderLeftWidth: "4px" }}
//             role="article"
//             aria-label={`Invoice ${inv.invoiceNumber}`}
//           >
//             <div className="flex justify-between items-start mb-3 border-b border-white/10 pb-2">
//               <h3 className="text-lg font-bold text-white">{`Invoice # ${inv.invoiceNumber}`}</h3>
//               <span
//                 className={`px-3 py-1 text-xs font-semibold rounded-full ${isActive ? "bg-teal-500 text-black" : "bg-rose-100 text-rose-700"
//                   }`}
//               >
//                 {isActive ? "ACTIVE" : "EXPIRED"}
//               </span>
//             </div>

//             <div className="space-y-2 text-sm text-slate-200">
//               <p className="flex justify-between">
//                 <strong className="text-slate-300">Plan:</strong>
//                 <span className="font-medium text-indigo-300">{inv.planName}</span>
//               </p>
//               <p className="flex justify-between">
//                 <strong className="text-slate-300">Duration:</strong>
//                 <span>{inv.planDuration} Days</span>
//               </p>
//               <p className="flex justify-between">
//                 <strong className="text-slate-300">Amount:</strong>
//                 <span className="text-xl font-bold text-emerald-300">
//                   ₹ {Number(inv.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
//                 </span>
//               </p>
//               <p className="flex justify-between">
//                 <strong className="text-slate-300">Payment Date:</strong>
//                 <span>{formatPaymentDate(inv.paymentDate)}</span>
//               </p>
//             </div>

//             <div className="mt-4 pt-4 border-t border-white/6 flex justify-center">
//               <button
//                 id={`download-${inv.razorpayOrderId}`}
//                 onClick={() => downloadInvoice(inv.razorpayOrderId, inv.invoiceNumber)}
//                 className="w-full sm:w-auto px-6 py-2 bg-gradient-to-r from-teal-400 to-indigo-500 text-black rounded-lg font-semibold hover:opacity-95 transition flex items-center justify-center gap-2 shadow"
//               >
//                 <FaDownload /> Download Invoice
//               </button>
//             </div>
//           </div>
//         );
//       })}
//       {invoices.length === 0 && (
//         <p className="text-center text-slate-400 py-12 italic text-lg bg-white/6 rounded-2xl shadow-md">No purchase history found.</p>
//       )}
//     </div>
//   );

//   // Renders the desktop table view (glass style)
//   const renderInvoiceTable = () => (
//     <div className="overflow-x-auto rounded-2xl shadow-2xl border border-white/8 bg-white/6 backdrop-blur-md">
//       <table className="min-w-full divide-y divide-white/8">
//         <thead className="bg-gradient-to-r from-indigo-700/80 to-teal-600/70 text-white">
//           <tr>
//             <th className="px-4 py-3 text-left text-sm font-semibold tracking-wider">Invoice Number</th>
//             <th className="px-4 py-3 text-left text-sm font-semibold tracking-wider">Plan Details</th>
//             <th className="px-4 py-3 text-center text-sm font-semibold tracking-wider">Duration</th>
//             <th className="px-4 py-3 text-center text-sm font-semibold tracking-wider">Amount (₹)</th>
//             <th className="px-4 py-3 text-center text-sm font-semibold tracking-wider">Payment Date</th>
//             <th className="px-4 py-3 text-center text-sm font-semibold tracking-wider">Actions</th>
//           </tr>
//         </thead>
//         <tbody className="divide-y divide-white/8">
//           {currentInvoices.length > 0 ? (
//             currentInvoices.map((inv, index) => {
//               const now = new Date(getIndianTime());
//               const isActive = new Date(inv.planEndDate) >= now;
//               const rowBg = index % 2 === 0 ? "bg-white/5" : "bg-white/3";

//               return (
//                 <tr
//                   key={inv.id}
//                   className={`${rowBg} hover:bg-white/8 transition`}
//                   aria-label={`Invoice row ${inv.invoiceNumber}`}
//                 >
//                   <td className="px-4 py-4 text-sm font-medium text-white">{inv.invoiceNumber}</td>
//                   <td className="px-4 py-4 text-sm font-medium text-indigo-200">
//                     <div className="flex items-center gap-2">
//                       <span>{inv.planName}</span>
//                       {isActive ? (
//                         <span className="px-2 py-0.5 bg-teal-400 text-black text-xs rounded-full flex items-center gap-1">
//                           <FaCheckCircle className="w-3 h-3" /> Active
//                         </span>
//                       ) : (
//                         <span className="px-2 py-0.5 bg-rose-100 text-rose-700 text-xs rounded-full flex items-center gap-1">
//                           <FaTimesCircle className="w-3 h-3" /> Expired
//                         </span>
//                       )}
//                     </div>
//                   </td>
//                   <td className="px-4 py-4 text-center text-sm text-slate-200">{inv.planDuration} Days</td>
//                   <td className="px-4 py-4 text-center text-lg font-bold text-emerald-300">
//                     ₹ {Number(inv.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
//                   </td>
//                   <td className="px-4 py-4 text-center text-sm text-slate-200">{formatPaymentDate(inv.paymentDate)}</td>
//                   <td className="px-4 py-4 text-center">
//                     <button
//                       id={`download-${inv.razorpayOrderId}`}
//                       onClick={() => downloadInvoice(inv.razorpayOrderId, inv.invoiceNumber)}
//                       className="px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-teal-400 text-black rounded-lg hover:opacity-95 shadow text-sm flex items-center justify-center mx-auto"
//                       title="Download PDF"
//                       aria-label={`Download invoice ${inv.invoiceNumber}`}
//                     >
//                       <FaDownload className="w-4 h-4" />
//                     </button>
//                   </td>
//                 </tr>
//               );
//             })
//           ) : (
//             <tr>
//               <td colSpan={6} className="px-4 py-12 text-center text-slate-400 text-lg">
//                 No purchase history found.
//               </td>
//             </tr>
//           )}
//         </tbody>
//       </table>
//     </div>
//   );

//   // --- Main Render ---
//   if (loading) {
//     return (
//       <div className="min-h-screen flex items-center justify-center bg-[#071016] text-white p-6">
//         <div className="text-lg text-white/70 flex items-center gap-3 p-6 bg-white/5 rounded-2xl shadow-lg">
//           <Loader2 className="animate-spin w-6 h-6" /> Loading Purchase History...
//         </div>
//       </div>
//     );
//   }

//   if (error) {
//     return (
//       <div className="p-10 min-h-screen max-w-6xl mx-auto text-center">
//         <div className="bg-rose-900/20 border border-rose-700 rounded-2xl p-8 shadow-lg">
//           <p className="text-2xl font-semibold text-rose-300">{error}</p>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="p-4 sm:p-8 min-h-screen bg-[#071016] text-white">
//       <div className="max-w-6xl mx-auto">
//         {/* Header Section */}
//         <header className="flex items-center gap-4 mb-8 pb-3 border-b border-white/8">
//           <div className="p-3 rounded-lg bg-gradient-to-br from-indigo-700 to-teal-400 text-black shadow">
//             <FaFileInvoiceDollar className="w-6 h-6" />
//           </div>
//           <h1 className="text-3xl font-extrabold text-white">Subscription & Purchase History</h1>
//         </header>

//         {/* Invoice Display */}
//         <section className="mb-6">
//           {isMobile ? renderInvoiceCards() : renderInvoiceTable()}
//         </section>

//         {/* Pagination Controls */}
//         {totalPages > 1 && (
//           <div className="flex justify-center items-center mt-8 gap-4 p-4 bg-white/6 rounded-2xl shadow-md border border-white/8">
//             <button
//               disabled={currentPage === 1}
//               onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
//               className="px-4 py-2 bg-indigo-600 text-black rounded-lg disabled:opacity-50 hover:opacity-95 transition flex items-center gap-2 font-medium"
//               aria-label="Previous page"
//             >
//               <FaArrowLeft className="w-3 h-3" /> Previous
//             </button>

//             <span className="text-lg font-semibold text-slate-100">
//               Page {currentPage} of {totalPages}
//             </span>

//             <button
//               disabled={currentPage === totalPages}
//               onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
//               className="px-4 py-2 bg-indigo-600 text-black rounded-lg disabled:opacity-50 hover:opacity-95 transition flex items-center gap-2 font-medium"
//               aria-label="Next page"
//             >
//               Next <FaArrowRight className="w-3 h-3" />
//             </button>
//           </div>
//         )}
//       </div>

//       {/* float animations */}
//       <style>{`
//         @keyframes float {
//           0% { transform: translateY(0px); }
//           50% { transform: translateY(-10px); }
//           100% { transform: translateY(0px); }
//         }
//         .animate-[float_9s_linear_infinite] { animation: float 9s linear infinite; }
//         .animate-[float_11s_linear_infinite] { animation: float 11s linear infinite; }
//       `}</style>
//     </div>
//   );
// }


// src/pages/PurchaseHistory.jsx
import React, { useState, useEffect, useCallback } from "react";
import api from "../api";
import {
  FaDownload,
  FaFileInvoiceDollar,
  FaCheckCircle,
  FaTimesCircle,
  FaArrowLeft,
  FaArrowRight,
} from "react-icons/fa";
import { Loader2 } from "lucide-react";

// Custom hook for media queries (mobile-first detection) - Kept intact
const useMediaQuery = (query) => {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const media = window.matchMedia(query);
    setMatches(media.matches);
    const listener = () => setMatches(media.matches);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
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
  const getIndianTime = useCallback(
    () => new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
    []
  );

  // Date Formatter (keeps India timezone)
  const formatPaymentDate = (dateStr) => {
    if (!dateStr) return "N/A";
    try {
      return new Date(dateStr).toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  // --- Fetch Logic (Kept Intact) ---
  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const res = await api.get("/user/invoices");

      const plan = (res.data.planinvoices || []).map(x => ({
        ...x,
        type: "plan"
      }));

      const addon = (res.data.addoninvoices || []).map(x => ({
        ...x,
        type: "addon"
      }));

      // Merge & sort by paymentDate
      const all = [...plan, ...addon].sort(
        (a, b) => new Date(b.paymentDate) - new Date(a.paymentDate)
      );

      setInvoices(all);
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
      const res = await api.get(`/plan/download-invoice/${orderId}`, { responseType: "blob" });

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
      // keep UX-friendly message
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
  const isMobile = useMediaQuery("(max-width: 767px)");

  // --- Conditional Render Functions (Styled for glass + mixed text) ---

  // Renders the mobile card view (glass style)
  const renderInvoiceCards = () => (
    <div className="space-y-4">
      {currentInvoices.map((inv) => {
        const now = new Date(getIndianTime());
        const isActive = new Date(inv.planEndDate) >= now;
        const statusColor = isActive ? "border-teal-400" : "border-rose-300";

        return (
          <div
            key={inv.id}
            className={`bg-white/6 backdrop-blur-md border ${statusColor} rounded-2xl p-5 shadow-lg transition hover:shadow-2xl`}
            style={{ borderLeftWidth: "4px" }}
            role="article"
            aria-label={`Invoice ${inv.invoiceNumber}`}
          >
            <div className="flex justify-between items-start mb-3 border-b border-white/10 pb-2">
              <h3 className="text-lg font-bold text-white">
                {inv.invoiceNumber}
                <div className="text-xs text-white/40 mt-1">{inv.type === "plan" ? "Plan Invoice" : "Add-on Invoice"}</div>
              </h3>

              {renderStatus(inv)}
            </div>

            <div className="space-y-2 text-sm text-slate-200">
              {inv.type === "plan" ? (
                <>
                  <p className="flex justify-between">
                    <strong>Plan:</strong> {inv.planName}
                  </p>
                  <p className="flex justify-between">
                    <strong>Duration:</strong> {inv.billingCycle?.charAt(0).toUpperCase() + inv.billingCycle?.slice(1)}
                  </p>
                </>
              ) : (
                <>
                  <p className="flex justify-between">
                    <strong>Dashboards:</strong> +{inv.dashboards}
                  </p>
                  <p className="flex justify-between">
                    <strong>Duration:</strong>
                    {inv.startDate?.slice(0, 10)} → {inv.endDate?.slice(0, 10)}
                  </p>
                </>
              )}

              <p className="flex justify-between">
                <strong>Amount:</strong>
                <span className="text-xl font-bold text-emerald-300">
                  ₹ {Number(inv.netAmount ?? inv.amount).toLocaleString("en-IN")}
                </span>
              </p>

              {inv.prorationCredit > 0 && (
                <p className="text-amber-300 text-xs">
                  Proration credit applied: ₹{inv.prorationCredit}
                </p>
              )}

              <p className="flex justify-between">
                <strong>Payment Date:</strong> {formatPaymentDate(inv.paymentDate)}
              </p>
            </div>

            <div className="mt-4 pt-4 border-t border-white/6 flex justify-center">
              <button
                id={`download-${inv.razorpayOrderId}`}
                onClick={() => downloadInvoice(inv.razorpayOrderId, inv.invoiceNumber)}
                className="w-full sm:w-auto px-6 py-2 bg-gradient-to-r from-teal-400 to-indigo-500 text-black rounded-lg font-semibold hover:opacity-95 transition flex items-center justify-center gap-2 shadow"
              >
                <FaDownload /> Download Invoice
              </button>
            </div>
          </div>
        );
      })}
      {invoices.length === 0 && (
        <p className="text-center text-slate-400 py-12 italic text-lg bg-white/6 rounded-2xl shadow-md">No purchase history found.</p>
      )}
    </div>
  );

  const renderStatus = (inv) => {
    const now = new Date();
    let isActive = false;

    if (inv.type === "plan") {
      isActive = inv.planEndDate && new Date(inv.planEndDate) >= now;
    } else {
      isActive = inv.endDate && new Date(inv.endDate) >= now;
    }

    if (inv.status !== "Paid") {
      return (
        <span className="px-2 py-1 text-xs rounded-full bg-rose-200 text-rose-700 font-semibold">
          {inv.status}
        </span>
      );
    }

    return (
      <span className={`px-2 py-1 text-xs rounded-full font-semibold 
      ${isActive ? "bg-teal-400 text-black" : "bg-gray-300 text-gray-700"}`}>
        {isActive ? "ACTIVE" : "EXPIRED"}
      </span>
    );
  };


  // Renders the desktop table view (glass style)
  const renderInvoiceTable = () => (
    <div className="overflow-x-auto rounded-2xl shadow-2xl border border-white/8 bg-white/6 backdrop-blur-md">
      <table className="min-w-full divide-y divide-white/8">
        <thead className="bg-gradient-to-r from-indigo-700/80 to-teal-600/70 text-white">
          <tr>
            <th className="px-4 py-3 text-left text-sm font-semibold tracking-wider">Invoice Number</th>
            <th className="px-4 py-3 text-left text-sm font-semibold tracking-wider">Plan Details</th>
            <th className="px-4 py-3 text-center text-sm font-semibold tracking-wider">Duration</th>
            <th className="px-4 py-3 text-center text-sm font-semibold tracking-wider">Amount (₹)</th>
            <th className="px-4 py-3 text-center text-sm font-semibold tracking-wider">Payment Date</th>
            <th className="px-4 py-3 text-center text-sm font-semibold tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/8">
          {currentInvoices.length > 0 ? (
            currentInvoices.map((inv, index) => {
              const now = new Date(getIndianTime());
              const isActive = new Date(inv.planEndDate) >= now;
              const rowBg = index % 2 === 0 ? "bg-white/5" : "bg-white/3";

              return (
                <tr key={inv.id} className="bg-white/5 hover:bg-white/10 transition">

                  {/* Invoice Number */}
                  <td className="px-4 py-4 text-white font-semibold">
                    {inv.invoiceNumber}
                    <div className="mt-1 text-xs text-white/40">{inv.type === "plan" ? "Plan Invoice" : "Add-on Invoice"}</div>
                  </td>

                  {/* Plan or Add-on Name */}
                  <td className="px-4 py-4 text-indigo-200 font-medium">
                    {inv.type === "plan" ? inv.planName : `+${inv.dashboards} Dashboards`}
                    <div className="mt-1">{renderStatus(inv)}</div>
                  </td>

                  {/* Duration */}
                  <td className="px-4 py-4 text-center text-slate-200">
                    {inv.type === "plan"
                      ? `${inv.billingCycle?.charAt(0).toUpperCase() + inv.billingCycle?.slice(1)}`
                      : `${inv.startDate?.slice(0, 10)} → ${inv.endDate?.slice(0, 10)}`
                    }
                  </td>

                  {/* Amount */}
                  <td className="px-4 py-4 text-center text-emerald-300 font-bold">
                    ₹ {Number(inv.netAmount ?? inv.amount).toLocaleString("en-IN")}
                    {inv.prorationCredit > 0 && (
                      <div className="text-xs text-amber-300 mt-1">
                        (Proration credit: ₹{inv.prorationCredit})
                      </div>
                    )}
                  </td>

                  {/* Payment Date */}
                  <td className="px-4 py-4 text-center text-slate-200">
                    {formatPaymentDate(inv.paymentDate)}
                  </td>

                  {/* Download */}
                  <td className="px-4 py-4 text-center">
                    <button
                      id={`download-${inv.razorpayOrderId}`}
                      onClick={() => downloadInvoice(inv.razorpayOrderId, inv.invoiceNumber)}
                      className="px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-teal-400 text-black rounded-lg shadow hover:opacity-90 text-sm flex items-center justify-center mx-auto"
                    >
                      <FaDownload className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan={6} className="px-4 py-12 text-center text-slate-400 text-lg">
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
      <div className="min-h-screen flex items-center justify-center bg-[#071016] text-white p-6">
        <div className="text-lg text-white/70 flex items-center gap-3 p-6 bg-white/5 rounded-2xl shadow-lg">
          <Loader2 className="animate-spin w-6 h-6" /> Loading Purchase History...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-10 min-h-screen max-w-6xl mx-auto text-center">
        <div className="bg-rose-900/20 border border-rose-700 rounded-2xl p-8 shadow-lg">
          <p className="text-2xl font-semibold text-rose-300">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 min-h-screen bg-[#071016] text-white">
      <div className="max-w-6xl mx-auto">
        {/* Header Section */}
        <header className="flex items-center gap-4 mb-8 pb-3 border-b border-white/8">
          <div className="p-3 rounded-lg bg-gradient-to-br from-indigo-700 to-teal-400 text-black shadow">
            <FaFileInvoiceDollar className="w-6 h-6" />
          </div>
          <h1 className="text-3xl font-extrabold text-white">Subscription & Purchase History</h1>
        </header>

        {/* Invoice Display */}
        <section className="mb-6">
          {isMobile ? renderInvoiceCards() : renderInvoiceTable()}
        </section>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center mt-8 gap-4 p-4 bg-white/6 rounded-2xl shadow-md border border-white/8">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              className="px-4 py-2 bg-indigo-600 text-black rounded-lg disabled:opacity-50 hover:opacity-95 transition flex items-center gap-2 font-medium"
              aria-label="Previous page"
            >
              <FaArrowLeft className="w-3 h-3" /> Previous
            </button>

            <span className="text-lg font-semibold text-slate-100">
              Page {currentPage} of {totalPages}
            </span>

            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              className="px-4 py-2 bg-indigo-600 text-black rounded-lg disabled:opacity-50 hover:opacity-95 transition flex items-center gap-2 font-medium"
              aria-label="Next page"
            >
              Next <FaArrowRight className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      {/* float animations */}
      <style>{`
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
          100% { transform: translateY(0px); }
        }
        .animate-[float_9s_linear_infinite] { animation: float 9s linear infinite; }
        .animate-[float_11s_linear_infinite] { animation: float 11s linear infinite; }
      `}</style>
    </div>
  );
}
