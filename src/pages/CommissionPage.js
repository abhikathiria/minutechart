import React, { useState, useEffect } from "react";
import api from "../api";
import { toast } from "react-hot-toast";

// Lucide Icons (matching homepage)
import {
    Calculator,
    FileText,
    Wallet,
    Loader2,
    Check,
    X,
    CircleDollarSign,
} from "lucide-react";

function CommissionPage() {
    const [admins, setAdmins] = useState([]);
    const [selectedAdmin, setSelectedAdmin] = useState("");
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");

    const [loading, setLoading] = useState(false);
    const [preview, setPreview] = useState(null);
    const [bills, setBills] = useState([]);
    const [selectedItems, setSelectedItems] = useState({});

    // Fetch admins
    useEffect(() => {
        api.get("/commission/admins")
            .then(res => setAdmins(res.data))
            .catch(() => toast.error("Failed to load admins"));
    }, []);

    // Load bills
    const loadBills = () => {
        api.get("/commission/bills")
            .then(res => setBills(res.data))
            .catch(() => toast.error("Failed to load bills"));
    };
    useEffect(() => {
        loadBills();
    }, []);

    // Calculate commission
    const calculateCommission = () => {
        if (!selectedAdmin || !fromDate || !toDate) {
            toast.error("Please select admin and date range");
            return;
        }

        setLoading(true);
        api.get("/commission/calculate", {
            params: {
                adminId: selectedAdmin,
                from: fromDate,
                to: toDate,
            }
        })
            .then((res) => {
                setPreview(res.data);

                const map = {};
                (res.data.items || []).forEach(item => {
                    map[item.purchaseId] = true;
                });
                setSelectedItems(map);

                toast.success("Commission calculated");
            })
            .catch(() => toast.error("Calculation failed"))
            .finally(() => setLoading(false));
    };

    // Toggle single item
    const toggleItem = (purchaseId) => {
        setSelectedItems(prev => ({ ...prev, [purchaseId]: !prev[purchaseId] }));
    };

    // Toggle all items
    const toggleAll = (value) => {
        if (!preview) return;
        const map = {};
        preview.items.forEach(item => (map[item.purchaseId] = value));
        setSelectedItems(map);
    };

    // Compute selected total
    const getSelectedTotal = () => {
        if (!preview) return 0;
        return preview.items
            .filter(i => selectedItems[i.purchaseId])
            .reduce((s, x) => s + Number(x.commissionAmount), 0);
    };

    // Create bill
    const createBill = () => {
        if (!preview) {
            toast.error("No commission preview available");
            return;
        }

        const included = preview.items
            .filter(i => selectedItems[i.purchaseId])
            .map(i => i.purchaseId);

        if (included.length === 0) {
            toast.error("No items selected");
            return;
        }

        setLoading(true);

        api.post("/commission/create", {
            adminId: selectedAdmin,
            fromDate,
            toDate,
            includedPurchaseIds: included
        })
            .then(() => {
                toast.success("Bill created");
                setPreview(null);
                setSelectedItems({});
                loadBills();
            })
            .catch(() => toast.error("Failed to create bill"))
            .finally(() => setLoading(false));
    };

    // Mark bill paid
    const markPaid = (id) => {
        api.put(`/commission/pay/${id}`)
            .then(() => {
                toast.success("Bill marked as Paid");
                loadBills();
            })
            .catch(() => toast.error("Payment update failed"));
    };

    // Approve bill (if needed)
    const approveBill = () => {};

    return (
        <div className="min-h-screen bg-[#0b0d10] p-6 text-white">
            {/* PAGE HEADER */}
            <h1 className="text-3xl font-extrabold mb-8 flex items-center gap-3 bg-gradient-to-r from-teal-400 to-indigo-400 text-transparent bg-clip-text">
                <CircleDollarSign className="w-8 h-8 text-teal-300" />
                Commission Management
            </h1>

            {/* ============================ */}
            {/*   CALCULATOR PANEL (GLASS)  */}
            {/* ============================ */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-2xl shadow-xl mb-8">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-indigo-300">
                    <Calculator className="w-6 h-6" />
                    Calculate Commission
                </h2>

                <div className="grid sm:grid-cols-3 gap-4">
                    <select
                        className="p-3 rounded-xl bg-white/10 border border-white/20 text-white focus:ring-2 focus:ring-indigo-400 outline-none"
                        value={selectedAdmin}
                        onChange={(e) => setSelectedAdmin(e.target.value)}
                    >
                        <option value="" className="text-black">Select Admin</option>
                        {admins.map(a => (
                            <option key={a.id} value={a.id} className="text-black">
                                {a.name} ({a.commissionPercentage}%)
                            </option>
                        ))}
                    </select>

                    <input
                        type="date"
                        className="p-3 rounded-xl bg-white/10 border border-white/20 text-white focus:ring-2 focus:ring-indigo-400 outline-none"
                        value={fromDate}
                        onChange={(e) => setFromDate(e.target.value)}
                    />

                    <input
                        type="date"
                        className="p-3 rounded-xl bg-white/10 border border-white/20 text-white focus:ring-2 focus:ring-indigo-400 outline-none"
                        value={toDate}
                        onChange={(e) => setToDate(e.target.value)}
                    />
                </div>

                <button
                    className="mt-5 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-500 text-white rounded-xl font-semibold hover:scale-[1.03] transition flex items-center gap-2 w-fit shadow-lg"
                    onClick={calculateCommission}
                >
                    {loading ? <Loader2 className="animate-spin" /> : <Calculator />}
                    Calculate
                </button>
            </div>

            {/* ============================ */}
            {/*     COMMISSION PREVIEW       */}
            {/* ============================ */}
            {preview && (
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-2xl shadow-xl mb-8">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-indigo-300">
                        <FileText className="w-6 h-6" />
                        Commission Preview
                    </h2>

                    <div className="flex items-center justify-between mb-4 text-sm text-gray-300">
                        <div>
                            <button
                                className="underline mr-2 hover:text-teal-300"
                                onClick={() => toggleAll(true)}
                            >
                                Select all
                            </button>
                            <button
                                className="underline hover:text-pink-300"
                                onClick={() => toggleAll(false)}
                            >
                                Deselect all
                            </button>
                        </div>

                        <div>
                            Admin: <strong className="text-teal-300">{preview.adminName}</strong> |
                            Period: {new Date(preview.fromDate).toLocaleDateString()} –{" "}
                            {new Date(preview.toDate).toLocaleDateString()}
                        </div>
                    </div>

                    {/* PREMIUM GLASS TABLE */}
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm border border-white/10 rounded-xl overflow-hidden backdrop-blur-xl">
                            <thead className="bg-white/10 text-indigo-300">
                                <tr>
                                    {["Select", "User", "Plan", "Amount (₹)", "%", "Commission (₹)", "Date"].map((h) => (
                                        <th key={h} className="p-3 text-left">{h}</th>
                                    ))}
                                </tr>
                            </thead>

                            <tbody className="bg-white/5">
                                {preview.items.map(item => (
                                    <tr key={item.purchaseId} className="border-b border-white/10 hover:bg-white/10 transition">
                                        <td className="p-3">
                                            <input
                                                type="checkbox"
                                                checked={!!selectedItems[item.purchaseId]}
                                                onChange={() => toggleItem(item.purchaseId)}
                                            />
                                        </td>

                                        <td className="p-3">{item.userName}</td>
                                        <td className="p-3">{item.planName}</td>
                                        <td className="p-3">{item.amount}</td>
                                        <td className="p-3">{item.commissionPercentage}%</td>
                                        <td className="p-3 text-green-400 font-bold">{item.commissionAmount}</td>
                                        <td className="p-3">
                                            {new Date(item.purchasedOn).toLocaleDateString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="mt-5 text-xl font-bold">
                        Total Commission:
                        <span className="text-green-400 ml-2">
                            ₹{getSelectedTotal().toFixed(2)}
                        </span>
                    </div>

                    <button
                        onClick={createBill}
                        className="mt-5 px-6 py-3 bg-gradient-to-r from-green-600 to-teal-500 text-white rounded-xl font-semibold hover:scale-[1.03] transition shadow-lg"
                    >
                        Create Bill
                    </button>
                </div>
            )}

            {/* ============================ */}
            {/*        ALL BILLS TABLE        */}
            {/* ============================ */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-2xl shadow-xl">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-indigo-300">
                    <FileText className="w-6 h-6" />
                    All Bills
                </h2>

                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm border border-white/10 rounded-xl overflow-hidden backdrop-blur-xl">
                        <thead className="bg-white/10 text-indigo-300">
                            <tr>
                                {["Bill ID", "Admin", "Period", "Amount", "Status", "Actions"].map(h => (
                                    <th key={h} className="p-3 text-left">{h}</th>
                                ))}
                            </tr>
                        </thead>

                        <tbody className="bg-white/5">
                            {bills.map(bill => (
                                <tr key={bill.billId} className="border-b border-white/10 hover:bg-white/10 transition">
                                    <td className="p-3">{bill.billId}</td>
                                    <td className="p-3">{bill.adminName}</td>
                                    <td className="p-3">
                                        {new Date(bill.fromDate).toLocaleDateString()} –{" "}
                                        {new Date(bill.toDate).toLocaleDateString()}
                                    </td>
                                    <td className="p-3 text-green-400 font-bold">₹{bill.totalCommission}</td>
                                    <td className="p-3">{bill.status}</td>

                                    <td className="p-3 flex gap-3">
                                        {bill.status === "ApprovedByAdmin" && (
                                            <button
                                                onClick={() => markPaid(bill.billId)}
                                                className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                                            >
                                                Mark Paid
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {bills.length === 0 && (
                        <p className="text-center text-gray-400 py-4">No bills found</p>
                    )}
                </div>
            </div>
        </div>
    );
}

export default CommissionPage;
