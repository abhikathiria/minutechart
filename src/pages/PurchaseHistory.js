// src/pages/PurchaseHistory.jsx
import React, { useState, useEffect } from "react";
import api from "../api";

export default function PurchaseHistory() {
  const [invoices, setInvoices] = useState([]);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      const res = await api.get("/user/orders");
      setInvoices(res.data);
    } catch (err) {
      console.error("Failed to fetch invoices", err);
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
    }
  };

  const getIndianTime = () =>
    new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" });

  return (
    <div className="p-6 min-h-screen max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Purchase History</h1>

      <div className="overflow-x-auto bg-white rounded shadow-md">
        <table className="min-w-full border-collapse border border-gray-200">
          <thead>
            <tr className="bg-gray-100 text-left">
              <th className="px-4 py-2 border">Invoice #</th>
              <th className="px-4 py-2 border">Plan Name</th>
              <th className="px-4 py-2 border">Duration (Days)</th>
              <th className="px-4 py-2 border">Amount (₹)</th>
              <th className="px-4 py-2 border">Currency</th>
              <th className="px-4 py-2 border">Payment Date</th>
              <th className="px-4 py-2 border">Actions</th>
            </tr>
          </thead>
          <tbody>
            {invoices.length > 0 ? (
              invoices.map((inv) => {
                const now = new Date(getIndianTime());
                const isActive = new Date(inv.planEndDate) >= now;

                return (
                  <tr
                    key={inv.id}
                    className={`hover:bg-gray-50 ${isActive ? "bg-green-100 font-semibold" : ""
                      }`}
                  >
                    <td className="px-4 py-2 border">{inv.invoiceNumber}</td>
                    <td className="px-4 py-2 border flex items-center gap-2">
                      {inv.planName}
                      {isActive && (
                        <span className="px-2 py-0.5 bg-green-600 text-white text-xs rounded-full">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 border">{inv.planDuration}</td>
                    <td className="px-4 py-2 border">{inv.amount.toFixed(2)}</td>
                    <td className="px-4 py-2 border">{inv.currency}</td>
                    <td className="px-4 py-2 border">
                      {new Date(inv.paymentDate).toLocaleString("en-IN", {
                        timeZone: "Asia/Kolkata",
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-2 border">
                      <button
                        onClick={() =>
                          downloadInvoice(inv.razorpayOrderId, inv.invoiceNumber)
                        }
                        className="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700"
                      >
                        Download PDF
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-gray-500">
                  No purchase history found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
