// src/pages/UserList.jsx
import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import api from "../api";
import { FaSearch, FaPlus, FaLock, FaUnlock, FaDatabase, FaChartPie, FaReceipt, FaSortUp, FaSortDown, FaBars, FaTimes, FaSort, FaFileExport } from "react-icons/fa";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

// --- Custom Components ---

// Helper function to capitalize string (for table headers)
const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1).replace(/([A-Z])/g, ' $1');

// Status Badge Helper
const StatusBadge = ({ status, isSubscription = false }) => {
    const colors = {
        Active: "bg-green-100 text-green-700 border-green-200",
        Blocked: "bg-red-100 text-red-700 border-red-200",
        Pending: "bg-yellow-100 text-yellow-700 border-yellow-200",
        Trial: "bg-blue-100 text-blue-700 border-blue-200",
        Expired: "bg-gray-200 text-gray-700 border-gray-300",
        None: "bg-gray-100 text-gray-500 border-gray-200",
    };
    const defaultColor = isSubscription ? colors.None : "bg-gray-100 text-gray-700 border-gray-200";

    return (
        <span
            className={`px-3 py-1 rounded-full text-xs font-semibold border ${colors[status] || defaultColor}`}
        >
            {status}
        </span>
    );
};

// Subscription Tooltip/Badge Renderer
const SubscriptionDetails = ({ user }) => {
    const status = user.subscriptionStatus || "None";
    const isTrial = status === "Trial" || user.trialDaysLeft > 0;

    // Use the actual status string or default to 'None' if null/empty
    const statusText = status === "None" ? "No Plan" : status;
    const badgeClass = {
        Active: "bg-green-100 text-green-700",
        Trial: "bg-blue-100 text-blue-700",
        Expired: "bg-red-100 text-red-700",
        None: "bg-gray-100 text-gray-500",
    }[status] || "bg-gray-100 text-gray-500";

    const startDate = isTrial ? user.trialStartDate : user.subscriptionStartDate;
    const endDate = isTrial ? user.trialEndDate : user.subscriptionEndDate;
    const formattedStartDate = startDate ? new Date(startDate).toLocaleDateString("en-GB") : "—";
    const formattedEndDate = endDate ? new Date(endDate).toLocaleDateString("en-GB") : "—";

    return (
        <div className="inline-block relative group text-center">
            <span
                className={`px-3 py-1 rounded-full text-xs font-semibold cursor-pointer ${badgeClass}`}
            >
                {statusText}
                {user.subscriptionPlan ? ` (${user.subscriptionPlan})` : ''}
            </span>

            {/* Custom Tooltip */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-gray-900 text-white text-xs rounded-lg px-4 py-2 shadow-lg whitespace-nowrap z-20 transition duration-300">
                <div className="flex flex-col text-left">
                    <span className="text-sm font-bold mb-1">{statusText} Status</span>
                    <span><span className="font-semibold text-green-400">Start:</span> {formattedStartDate}</span>
                    <span><span className="font-semibold text-red-400">End:</span> {formattedEndDate}</span>
                    {isTrial && user.trialDaysLeft > 0 && (
                        <span className="mt-1 text-yellow-300 font-bold">({user.trialDaysLeft} days left)</span>
                    )}
                </div>
                {/* Tooltip arrow */}
                <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
            </div>
        </div>
    );
};


function UserList() {
    const [users, setUsers] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const location = useLocation();
    const [sortBy, setSortBy] = useState("createdAt");
    const [sortOrder, setSortOrder] = useState("desc");
    const [loading, setLoading] = useState(true);

    // --- Filter State Logic (Kept Intact) ---

    const [accountStatusFilter, setAccountStatusFilter] = useState(() => {
        if (location.state?.keepFilters) {
            return localStorage.getItem("accountStatusFilter") || "Pending";
        } else {
            localStorage.removeItem("accountStatusFilter");
            return "Pending";
        }
    });
    useEffect(() => {
        localStorage.setItem("accountStatusFilter", accountStatusFilter);
    }, [accountStatusFilter]);

    const [subscriptionStatusFilter, setSubscriptionStatusFilter] = useState(() => {
        if (location.state?.keepFilters) {
            return localStorage.getItem("subscriptionStatusFilter") || "All";
        } else {
            localStorage.removeItem("subscriptionStatusFilter");
            return "All";
        }
    });
    useEffect(() => {
        localStorage.setItem("subscriptionStatusFilter", subscriptionStatusFilter);
    }, [subscriptionStatusFilter]);

    // --- Modal/View State ---
    const [selectedUser, setSelectedUser] = useState(null);
    const [purchases, setPurchases] = useState([]);
    const [showPurchases, setShowPurchases] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const usersPerPage = 10;
    const [expandedRows, setExpandedRows] = useState({}); // State for mobile card expansion

    // --- Core Data Fetch ---

    useEffect(() => {
        setLoading(true);
        api
            .get("/admin/users")
            .then((res) => setUsers(res.data))
            .catch((err) => {
                console.error("Error fetching users:", err);
                setUsers([]);
            })
            .finally(() => setLoading(false));
    }, []);

    // --- Action Handlers (Kept Intact) ---

    const handleDeactivate = (id) => {
        api.post(`/admin/user/${id}/deactivate`).then(() => {
            setUsers((prev) =>
                prev.map((user) =>
                    user.id === id ? { ...user, accountStatus: "Blocked" } : user
                )
            );
        });
    };

    const handleReactivate = (id) => {
        api.post(`/admin/user/${id}/reactivate`).then(() => {
            setUsers((prev) =>
                prev.map((user) =>
                    user.id === id ? { ...user, accountStatus: "Active" } : user
                )
            );
        });
    };

    const handleShowPurchases = (id) => {
        // Set loading/purchases state before API call (omitted for brevity but recommended in production)
        api.get(`/admin/user/${id}/purchases`)
            .then((res) => {
                setPurchases(res.data);
                setSelectedUser(id);
                setShowPurchases(true);
            })
            .catch((err) => {
                console.error("Error fetching purchases:", err);
                setPurchases([]);
                setSelectedUser(id);
                setShowPurchases(true); // Still show modal even on error
            });
    };

    const handleExportTable = () => {
        const table = document.querySelector("table");
        if (!table) return;

        // Simplified data extraction focusing on key fields for export, robustifying the export logic
        const dataToExport = filteredUsers.map(user => ({
            "Company Name": user.companyName,
            "Customer Name": user.customerName,
            "Email": user.email,
            "Phone Number": user.phoneNumber,
            "Account Status": user.accountStatus,
            "Subscription Status": user.subscriptionStatus,
            "Trial Days Left": user.trialDaysLeft,
            "Subscription Plan": user.subscriptionPlan || "N/A",
            "Subscription Start": user.subscriptionStartDate ? new Date(user.subscriptionStartDate).toLocaleDateString("en-GB") : "N/A",
            "Subscription End": user.subscriptionEndDate ? new Date(user.subscriptionEndDate).toLocaleDateString("en-GB") : "N/A",
        }));
        
        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Users");
        const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
        const blob = new Blob([wbout], { type: "application/octet-stream" });
        saveAs(blob, "users.xlsx");
    };


    // --- Filtering, Sorting, and Pagination ---

    const filteredUsers = users
        .filter((user) => {
            const matchesSearch =
                user.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                user.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                user.email.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesAccountStatus =
                accountStatusFilter === "All" || user.accountStatus === accountStatusFilter;

            const matchesSubscriptionStatus =
                subscriptionStatusFilter === "All" || user.subscriptionStatus === subscriptionStatusFilter;

            return matchesSearch && matchesAccountStatus && matchesSubscriptionStatus;
        })
        .sort((a, b) => {
            const aVal = a[sortBy];
            const bVal = b[sortBy];
            
            // Handle nulls/undefined for robust sorting
            const valA = aVal === undefined || aVal === null ? (sortOrder === "asc" ? "" : "zzz") : String(aVal).toLowerCase();
            const valB = bVal === undefined || bVal === null ? (sortOrder === "asc" ? "" : "zzz") : String(bVal).toLowerCase();

            if (valA < valB) return sortOrder === "asc" ? -1 : 1;
            if (valA > valB) return sortOrder === "asc" ? 1 : -1;
            return 0;
        });

    const indexOfLastUser = currentPage * usersPerPage;
    const indexOfFirstUser = indexOfLastUser - usersPerPage;
    const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);
    const totalPages = Math.ceil(filteredUsers.length / usersPerPage);

    const toggleRow = (id) => {
        setExpandedRows((prev) => ({
            ...prev,
            [id]: !prev[id],
        }));
    };

    // --- Render ---

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <p className="text-xl text-indigo-600 font-semibold">Loading Users...</p>
            </div>
        );
    }
    
    return (
        <div className="min-h-screen bg-gray-100 px-4 sm:px-6 lg:px-8 py-8">
            <div className="max-w-7xl mx-auto bg-white shadow-2xl rounded-2xl border border-gray-200 overflow-hidden">
                
                {/* Header and Filters Section */}
                <header className="bg-gradient-to-r from-indigo-700 to-blue-600 p-6 flex flex-col gap-4">
                    <h2 className="text-3xl font-extrabold text-white">Admin User Management</h2>

                    {/* Search Bar */}
                    <div className="relative">
                        <FaSearch className="absolute left-4 top-3 text-white/70 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Search by company, customer, or email..."
                            className="pl-11 pr-4 py-3 w-full rounded-xl border-0 bg-white/10 text-white placeholder-white/70 focus:ring-2 focus:ring-white focus:bg-white/20 transition"
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setCurrentPage(1); // Reset pagination on search
                            }}
                        />
                    </div>

                    {/* Filters and Actions */}
                    <div className="flex flex-wrap gap-3 pt-2 items-center justify-between">
                        <div className="flex flex-wrap gap-3">
                            <select
                                className="py-2 px-4 border border-white/50 rounded-lg bg-transparent text-white text-sm focus:ring-indigo-400 focus:border-indigo-400 transition"
                                value={accountStatusFilter}
                                onChange={(e) => {
                                    setAccountStatusFilter(e.target.value);
                                    setCurrentPage(1);
                                }}
                            >
                                <option value="All" className="text-gray-800">Account Status: All</option>
                                <option value="Active" className="text-gray-800">Account Status: Active</option>
                                <option value="Blocked" className="text-gray-800">Account Status: Blocked</option>
                                <option value="Pending" className="text-gray-800">Account Status: Pending</option>
                            </select>

                            <select
                                className="py-2 px-4 border border-white/50 rounded-lg bg-transparent text-white text-sm focus:ring-indigo-400 focus:border-indigo-400 transition"
                                value={subscriptionStatusFilter}
                                onChange={(e) => {
                                    setSubscriptionStatusFilter(e.target.value);
                                    setCurrentPage(1);
                                }}
                            >
                                <option value="All" className="text-gray-800">Subscription: All</option>
                                <option value="Trial" className="text-gray-800">Subscription: Trial</option>
                                <option value="Active" className="text-gray-800">Subscription: Active</option>
                                <option value="Expired" className="text-gray-800">Subscription: Expired</option>
                                <option value="None" className="text-gray-800">Subscription: None</option>
                            </select>
                        </div>
                        
                        <button
                            onClick={handleExportTable}
                            className="px-4 py-2 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 transition shadow-lg flex items-center gap-2 text-sm"
                            title="Export current table data to Excel"
                        >
                            <FaFileExport /> Export ({filteredUsers.length})
                        </button>
                    </div>
                </header>

                {/* Data Display Content */}
                <div className="p-4 sm:p-6">
                    <p className="text-lg font-bold text-gray-800 mb-4">
                        Showing {currentUsers.length} of {filteredUsers.length} total filtered users.
                    </p>

                    {/* Table View (Desktop/Tablet) */}
                    <div className="hidden sm:block overflow-x-auto border rounded-xl shadow-inner">
                        <table className="min-w-full text-sm divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr className="text-left text-xs text-gray-600 uppercase tracking-wider">
                                    <th className="p-4 w-10">#</th>
                                    {["companyName", "customerName", "phoneNumber", "email"].map((col) => (
                                        <th
                                            key={col}
                                            className="p-4 cursor-pointer whitespace-nowrap"
                                            onClick={() => {
                                                setSortBy(col);
                                                setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                                            }}
                                        >
                                            <div className="flex items-center gap-1">
                                                {capitalize(col)}
                                                {sortBy === col ? (
                                                    sortOrder === "asc" ? <FaSortUp className="text-indigo-600" /> : <FaSortDown className="text-indigo-600" />
                                                ) : (
                                                    <FaSort className="text-gray-400 text-xs" />
                                                )}
                                            </div>
                                        </th>
                                    ))}
                                    <th className="p-4 text-center">Account Status</th>
                                    <th className="p-4 text-center">Subscription Status</th>
                                    <th className="p-4 text-center w-32">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {currentUsers.map((user, index) => (
                                    <tr key={user.id} className="hover:bg-indigo-50 transition">
                                        <td className="p-4 font-medium text-center">{indexOfFirstUser + index + 1}</td>
                                        <td className="p-4 font-semibold text-gray-900">{user.companyName}</td>
                                        <td className="p-4 text-gray-700">{user.customerName}</td>
                                        <td className="p-4 text-gray-700">{user.phoneNumber}</td>
                                        <td className="p-4 text-gray-700 truncate max-w-xs">{user.email}</td>
                                        <td className="p-4 text-center">
                                            <StatusBadge status={user.accountStatus} />
                                        </td>
                                        <td className="p-4 text-center">
                                            <SubscriptionDetails user={user} />
                                        </td>
                                        <td className="p-4">
                                            <div className="flex flex-wrap gap-2 justify-center">
                                                {/* DB Profile Link */}
                                                <Link
                                                    to={`/profile/${user.id}`}
                                                    state={{ keepFilters: true }}
                                                    className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                                                    title="Set Database Profile (D)"
                                                >
                                                    <FaDatabase className="w-4 h-4"/>
                                                </Link>
                                                
                                                {/* Queries Link */}
                                                {user.accountStatus === "Active" && (
                                                    <Link
                                                        to={`/user/${user.id}/modules`}
                                                        state={{ keepFilters: true }}
                                                        className="p-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
                                                        title="Set Queries/Modules (Q)"
                                                    >
                                                        <FaChartPie className="w-4 h-4"/>
                                                    </Link>
                                                )}
                                                
                                                {/* Purchases Button */}
                                                {user.accountStatus === "Active" && (
                                                    <button
                                                        onClick={() => handleShowPurchases(user.id)}
                                                        className="p-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition"
                                                        title="View Purchases (P)"
                                                    >
                                                        <FaReceipt className="w-4 h-4"/>
                                                    </button>
                                                )}

                                                {/* De/Reactivate Button */}
                                                {user.accountStatus === "Active" ? (
                                                    <button
                                                        onClick={() => handleDeactivate(user.id)}
                                                        className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                                                        title="Deactivate Account (A)"
                                                    >
                                                        <FaLock className="w-4 h-4"/>
                                                    </button>
                                                ) : (user.accountStatus === "Blocked" && (
                                                    <button
                                                        onClick={() => handleReactivate(user.id)}
                                                        className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                                                        title="Reactivate Account (A)"
                                                    >
                                                        <FaUnlock className="w-4 h-4"/>
                                                    </button>
                                                ))}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredUsers.length === 0 && (
                                    <tr>
                                        <td colSpan={10} className="text-center text-gray-500 py-6 italic text-lg">
                                            No users match the current search or filters.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Card View (Mobile) */}
                    <div className="block sm:hidden space-y-4">
                        {currentUsers.map((user, index) => (
                            <div
                                key={user.id}
                                className="border border-gray-300 rounded-xl p-4 shadow-md bg-white"
                            >
                                <div
                                    className="flex justify-between items-center cursor-pointer"
                                    onClick={() => toggleRow(user.id)}
                                >
                                    <div className="flex flex-col">
                                        <p className="font-bold text-gray-900 text-lg">{user.companyName}</p>
                                        <p className="text-sm text-gray-600">{user.customerName}</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <StatusBadge status={user.accountStatus} />
                                        {expandedRows[user.id] ? (
                                            <FaTimes className="text-red-500 w-5 h-5" />
                                        ) : (
                                            <FaBars className="text-indigo-500 w-5 h-5" />
                                        )}
                                    </div>
                                </div>

                                {/* Collapsible Details */}
                                {expandedRows[user.id] && (
                                    <div className="mt-4 pt-4 border-t border-gray-200 space-y-3 text-sm">
                                        <div className="flex justify-between items-start">
                                            <span className="font-semibold text-gray-700">Email:</span>
                                            <span className="text-right text-indigo-600 truncate max-w-[60%]">{user.email}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="font-semibold text-gray-700">Subscription:</span>
                                            <div className="text-right">
                                                <SubscriptionDetails user={user} />
                                            </div>
                                        </div>
                                        {user.trialDaysLeft > 0 && (
                                            <div className="flex justify-between items-center">
                                                <span className="font-semibold text-gray-700">Trial Left:</span>
                                                <span className="px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                                                    {user.trialDaysLeft} days
                                                </span>
                                            </div>
                                        )}

                                        {/* Action Buttons Group */}
                                        <div className="pt-3 border-t border-gray-100 flex flex-wrap gap-2 justify-center">
                                            {/* DB, Queries, Purchases */}
                                            <Link
                                                to={`/profile/${user.id}`}
                                                state={{ keepFilters: true }}
                                                className="flex items-center gap-1 bg-indigo-600 text-white px-3 py-1.5 rounded-full hover:bg-indigo-700 text-sm"
                                                title="Set Database"
                                            >
                                                <FaDatabase /> DB Setup
                                            </Link>
                                            <Link
                                                to={`/user/${user.id}/modules`}
                                                state={{ keepFilters: true }}
                                                className="flex items-center gap-1 bg-purple-600 text-white px-3 py-1.5 rounded-full hover:bg-purple-700 text-sm"
                                                title="Set Queries"
                                            >
                                                <FaChartPie /> Queries
                                            </Link>
                                            <button
                                                onClick={() => handleShowPurchases(user.id)}
                                                className="flex items-center gap-1 bg-yellow-600 text-white px-3 py-1.5 rounded-full hover:bg-yellow-700 text-sm"
                                                title="View Purchases"
                                            >
                                                <FaReceipt /> Purchases
                                            </button>

                                            {/* Activate/Deactivate */}
                                            {user.accountStatus === "Active" ? (
                                                <button
                                                    onClick={() => handleDeactivate(user.id)}
                                                    className="flex items-center gap-1 bg-red-600 text-white px-3 py-1.5 rounded-full hover:bg-red-700 text-sm"
                                                    title="Deactivate Account"
                                                >
                                                    <FaLock /> Deactivate
                                                </button>
                                            ) : (user.accountStatus === "Blocked" && (
                                                <button
                                                    onClick={() => handleReactivate(user.id)}
                                                    className="flex items-center gap-1 bg-green-600 text-white px-3 py-1.5 rounded-full hover:bg-green-700 text-sm"
                                                    title="Reactivate Account"
                                                >
                                                    <FaUnlock /> Reactivate
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                        {filteredUsers.length === 0 && !loading && (
                            <p className="text-center text-gray-500 py-6 italic text-lg w-full">
                                No users match the current search or filters.
                            </p>
                        )}
                    </div>

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                        <div className="flex justify-center items-center mt-6 gap-3">
                            <button
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage((prev) => prev - 1)}
                                className="px-4 py-2 bg-indigo-500 text-white rounded-lg disabled:opacity-50 disabled:bg-gray-400 hover:bg-indigo-600 transition text-sm font-medium shadow-md"
                            >
                                Previous
                            </button>
                            <span className="text-sm font-medium text-gray-700">
                                Page {currentPage} of {totalPages}
                            </span>
                            <button
                                disabled={currentPage === totalPages}
                                onClick={() => setCurrentPage((prev) => prev + 1)}
                                className="px-4 py-2 bg-indigo-500 text-white rounded-lg disabled:opacity-50 disabled:bg-gray-400 hover:bg-indigo-600 transition text-sm font-medium shadow-md"
                            >
                                Next
                            </button>
                        </div>
                    )}
                </div>
            </div >

            {/* Purchases Modal (Redesigned for Clarity) */}
            {showPurchases && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl p-6 max-w-full lg:max-w-4xl w-full max-h-[90vh] overflow-y-auto border-t-4 border-yellow-500">
                        <h3 className="text-2xl font-bold mb-4 text-gray-800">
                            Purchases for User ID: {selectedUser}
                        </h3>
                        {purchases.length > 0 ? (
                            <div className="overflow-x-auto border rounded-lg">
                                <table className="min-w-full text-sm divide-y divide-gray-200">
                                    <thead className="bg-gray-50 whitespace-nowrap">
                                        <tr>
                                            <th className="p-3 text-left">Invoice #</th>
                                            <th className="p-3 text-left">Plan Name</th>
                                            <th className="p-3 text-center">Price (₹)</th>
                                            <th className="p-3 text-center">Status</th>
                                            <th className="p-3 text-center">Start Date</th>
                                            <th className="p-3 text-center">End Date</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {purchases.map((p, i) => (
                                            <tr key={i} className="hover:bg-yellow-50">
                                                <td className="p-3 font-mono">{p.invoiceNumber}</td>
                                                <td className="p-3 font-medium">{p.planName}</td>
                                                <td className="p-3 text-center font-semibold text-green-700">₹{p.price}</td>
                                                <td className="p-3 text-center">
                                                    <StatusBadge status={p.status} isSubscription />
                                                </td>
                                                <td className="p-3 text-center">{new Date(p.startDate).toLocaleDateString("en-GB")}</td>
                                                <td className="p-3 text-center">{new Date(p.endDate).toLocaleDateString("en-GB")}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p className="text-center text-gray-500 p-6 border rounded-lg bg-gray-50">
                                No purchase history found for this user.
                            </p>
                        )}
                        <div className="flex justify-end mt-6">
                            <button
                                onClick={() => setShowPurchases(false)}
                                className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition font-medium shadow-md"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
}

export default UserList;