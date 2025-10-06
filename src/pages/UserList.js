import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import { FaSearch, FaPlus, FaLock, FaUnlock, FaDatabase } from "react-icons/fa";

function UserList() {
    const [users, setUsers] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [accountStatusFilter, setAccountStatusFilter] = useState("All");
    const [subscriptionStatusFilter, setSubscriptionStatusFilter] = useState("All");
    const [selectedUser, setSelectedUser] = useState(null);
    const [modules, setModules] = useState([]);
    const [showModules, setShowModules] = useState(false);
    const [purchases, setPurchases] = useState([]);
    const [showPurchases, setShowPurchases] = useState(false);

    const handleShowPurchases = (id) => {
        api.get(`/admin/user/${id}/purchases`)
            .then((res) => {
                setPurchases(res.data);
                setSelectedUser(id);
                setShowPurchases(true);
            })
            .catch((err) => {
                console.error("Error fetching purchases:", err);
                setPurchases([]);
                setShowPurchases(true);
            });
    };


    const handleShowModules = (id) => {
        api.get(`/admin/user/${id}/queries`)
            .then((res) => {
                setModules(res.data);
                setSelectedUser(id);
                setShowModules(true);
            })
            .catch((err) => {
                console.error("Error fetching modules:", err);
                setModules([]);
                setShowModules(true);
            });
    };

    useEffect(() => {
        api
            .get("/admin/users")
            .then((res) => setUsers(res.data))
            .catch((err) => {
                console.error("Error fetching users:", err);
                setUsers([]);
            });
    }, []);

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

    const filteredUsers = users
        .filter((user) => {
            const matchesSearch =
                user.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                user.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                user.email.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesAccountStatus =
                accountStatusFilter === "All" || user.accountStatus === accountStatusFilter;

            // Subscription status filter
            const matchesSubscriptionStatus =
                subscriptionStatusFilter === "All" || user.subscriptionStatus === subscriptionStatusFilter;


            return matchesSearch && matchesAccountStatus && matchesSubscriptionStatus;
        })
        .sort((a, b) => {
            if (a.accountStatus === "Pending" && b.accountStatus !== "Pending")
                return -1;
            if (b.accountStatus === "Pending" && a.accountStatus !== "Pending")
                return 1;
            return a.id - b.id;
        });

    const StatusBadge = ({ status }) => {
        const colors = {
            Active: "bg-green-100 text-green-700",
            Blocked: "bg-red-100 text-red-700",
            Pending: "bg-yellow-100 text-yellow-700",
        };
        return (
            <span
                className={`px-2 py-1 rounded-full text-sm font-semibold ${colors[status] || "bg-gray-100 text-gray-700"
                    }`}
            >
                {status}
            </span>
        );
    };

    return (
        <div className="min-h-screen bg-gray-50 px-4 sm:px-6 lg:px-8 py-8">
            <div className="max-w-7xl mx-auto bg-white shadow-lg rounded-2xl overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <h2 className="text-2xl font-bold text-white">User Settings</h2>
                    <div className="flex gap-2 w-full sm:w-auto">
                        <div className="relative flex-1 sm:flex-initial">
                            <FaSearch className="absolute left-3 top-3 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search company, customer, or email"
                                className="pl-9 pr-3 py-2 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-400"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <select
                            value={accountStatusFilter}
                            onChange={(e) => setAccountStatusFilter(e.target.value)}
                        >
                            <option value="All">All Accounts</option>
                            <option value="Active">Active</option>
                            <option value="Blocked">Blocked</option>
                            <option value="Pending">Pending</option>
                        </select>

                        <select
                            value={subscriptionStatusFilter}
                            onChange={(e) => setSubscriptionStatusFilter(e.target.value)}
                        >
                            <option value="All">All Subscriptions</option>
                            <option value="Trial">Trial</option>
                            <option value="Active">Active</option>
                            <option value="Expired">Expired</option>
                            <option value="None">None</option>
                        </select>
                    </div>
                </div>

                {/* Table */}
                <div className="p-6 overflow-x-auto">
                    <p className="mb-3 text-md text-gray-800">
                        Showing {filteredUsers.length}{" "}
                        {filteredUsers.length === 1 ? "user" : "users"}
                    </p>
                    <table className="min-w-full text-md border border-gray-500 overflow-hidden">
                        <thead>
                            <tr className="bg-gray-100 text-left text-lg font-semibold">
                                <th className="p-3 border-r border-gray-500">#</th>
                                <th className="p-3 border-r border-gray-500">Company</th>
                                <th className="p-3 border-r border-gray-500">Customer</th>
                                <th className="p-3 border-r border-gray-500">Phone</th>
                                <th className="p-3 border-r border-gray-500">Email</th>
                                <th className="p-3 border-r border-gray-500">Account</th>
                                <th className="p-3 border-r border-gray-500">Trial</th>
                                <th className="p-3 border-r border-gray-500">Subscription</th>
                                <th className="p-3 border-r border-gray-500 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.map((user, index) => (
                                <tr
                                    key={user.id}
                                    className="hover:bg-gray-50 border-t border-gray-500 transition"
                                >
                                    <td className="p-3 border-r border-gray-500">{index + 1}</td>
                                    <td className="p-3 border-r border-gray-500 font-medium text-gray-900">
                                        {user.companyName}
                                    </td>
                                    <td className="p-3 border-r border-gray-500 whitespace-nowrap">{user.customerName}</td>
                                    <td className="p-3 border-r border-gray-500 whitespace-nowrap">{user.phoneNumber}</td>
                                    <td className="p-3 border-r border-gray-500">{user.email}</td>
                                    <td className="p-3 border-r border-gray-500">
                                        <StatusBadge status={user.accountStatus} />
                                    </td>
                                    <td className="p-3 border-r border-gray-500 relative group whitespace-nowrap">
                                        {user.trialDaysLeft > 0 ? (
                                            <div className="inline-block relative">
                                                <span className="px-2 py-1 rounded-full text-sm font-semibold bg-blue-100 text-blue-700 cursor-pointer">
                                                    Trial ({user.trialDaysLeft} day{user.trialDaysLeft > 1 ? "s" : ""} left)
                                                </span>

                                                {/* Tooltip */}
                                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg whitespace-nowrap z-10">
                                                    <div className="flex flex-col text-left">
                                                        <span>
                                                            <span className="font-semibold text-green-400">Start:</span>{" "}
                                                            {user.trialStartDate
                                                                ? new Date(user.trialStartDate).toLocaleDateString("en-GB")
                                                                : "—"}
                                                        </span>
                                                        <span>
                                                            <span className="font-semibold text-red-400">End:</span>{" "}
                                                            {user.trialEndDate
                                                                ? new Date(user.trialEndDate).toLocaleDateString("en-GB")
                                                                : "—"}
                                                        </span>
                                                    </div>
                                                    {/* Tooltip arrow */}
                                                    <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
                                                </div>
                                            </div>
                                        ) : (
                                            "-"
                                        )}
                                    </td>

                                    <td className="p-3 border-r border-gray-500 relative group text-center">
                                        {user.subscriptionStatus !== "None" ? (
                                            <div className="inline-block relative">
                                                <span
                                                    className={`px-2 py-1 rounded-full text-sm font-semibold cursor-pointer ${user.subscriptionStatus === "Active"
                                                            ? "bg-green-100 text-green-700"
                                                            : user.subscriptionStatus === "Trial"
                                                                ? "bg-blue-100 text-blue-700"
                                                                : "bg-gray-100 text-gray-500"
                                                        }`}
                                                >
                                                    {user.subscriptionStatus}{" "}
                                                    {user.subscriptionPlan ? `(${user.subscriptionPlan})` : ""}
                                                </span>

                                                {/* Custom Tooltip */}
                                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg whitespace-nowrap z-10">
                                                    <div className="flex flex-col text-left">
                                                        <span>
                                                            <span className="font-semibold text-green-400">Start:</span>{" "}
                                                            {user.subscriptionStatus === "Trial"
                                                                ? user.trialStartDate
                                                                    ? new Date(user.trialStartDate).toLocaleDateString("en-GB")
                                                                    : "—"
                                                                : user.subscriptionStartDate
                                                                    ? new Date(user.subscriptionStartDate).toLocaleDateString("en-GB")
                                                                    : "—"}
                                                        </span>
                                                        <span>
                                                            <span className="font-semibold text-red-400">End:</span>{" "}
                                                            {user.subscriptionStatus === "Trial"
                                                                ? user.trialEndDate
                                                                    ? new Date(user.trialEndDate).toLocaleDateString("en-GB")
                                                                    : "—"
                                                                : user.subscriptionEndDate
                                                                    ? new Date(user.subscriptionEndDate).toLocaleDateString("en-GB")
                                                                    : "—"}
                                                        </span>
                                                    </div>
                                                    {/* Tooltip arrow */}
                                                    <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
                                                </div>
                                            </div>
                                        ) : (
                                            "-"
                                        )}
                                    </td>

                                    <td className="p-3 border-r border-gray-500">
                                        <div className="flex flex-wrap gap-2 justify-center">
                                            {user.accountStatus !== "Blocked" && (
                                                <Link
                                                    to={`/profile/${user.id}`}
                                                    className="flex items-center gap-1 bg-indigo-600 text-white px-3 py-1 rounded-full hover:bg-indigo-700 text-md"
                                                >
                                                    <FaDatabase className="text-md" /> DB
                                                </Link>

                                            )}
                                            {user.accountStatus === "Active" && (
                                                <button
                                                    onClick={() => handleDeactivate(user.id)}
                                                    className="flex items-center gap-1 bg-red-500 text-white px-3 py-1 rounded-full hover:bg-red-600 text-md"
                                                >
                                                    <FaLock className="text-md" /> Deactivate
                                                </button>
                                            )}
                                            {user.accountStatus === "Blocked" && (
                                                <button
                                                    onClick={() => handleReactivate(user.id)}
                                                    className="flex items-center gap-1 bg-green-500 text-white px-3 py-1 rounded-full hover:bg-green-600 text-md"
                                                >
                                                    <FaUnlock className="text-md" /> Reactivate
                                                </button>
                                            )}
                                            {user.accountStatus === "Active" && (
                                                <Link
                                                    to={`/user/${user.id}/modules`}
                                                    className="flex items-center gap-1 bg-purple-500 text-white px-3 py-1 rounded-full hover:bg-purple-600 text-md"
                                                >
                                                    <FaDatabase className="text-md" /> Modules
                                                </Link>
                                            )}
                                            {user.accountStatus === "Active" && (
                                                <button
                                                    onClick={() => handleShowPurchases(user.id)}
                                                    className="flex items-center gap-1 bg-yellow-500 text-white px-3 py-1 rounded-full hover:bg-yellow-600 text-md"
                                                >
                                                    🧾 Purchases
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredUsers.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={7}
                                        className="text-center text-gray-500 py-6 italic"
                                    >
                                        No users found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            {
                showPurchases && (
                    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
                        <div className="bg-white rounded-xl shadow-xl p-6 max-w-2xl w-full">
                            <h3 className="text-xl font-bold mb-4">User Purchases</h3>
                            {purchases.length > 0 ? (
                                <table className="min-w-full text-sm border border-gray-300">
                                    <thead className="bg-gray-100 font-semibold">
                                        <tr>
                                            <th className="p-2 border-r">Invoice Number</th>
                                            <th className="p-2 border-r">Plan Name</th>
                                            <th className="p-2 border-r">Start Date</th>
                                            <th className="p-2 border-r">End Date</th>
                                            <th className="p-2 border-r">Status</th>
                                            <th className="p-2 border-r">Price</th>
                                            <th className="p-2">Purchase Date</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {purchases.map((p, i) => (
                                            <tr key={i} className="border border-gray-300 hover:bg-gray-50">
                                                <td className="p-2 border-r text-center">{p.invoiceNumber}</td>
                                                <td className="p-2 border-r text-center">{p.planName}</td>
                                                <td className="p-2 border-r text-center">{new Date(p.startDate).toLocaleDateString("en-GB")}</td>
                                                <td className="p-2 border-r text-center">{new Date(p.endDate).toLocaleDateString("en-GB")}</td>
                                                <td className="p-2 border-r text-center">{p.status}</td>
                                                <td className="p-2 border-r text-center">₹{p.price}</td>
                                                <td className="p-2 text-center">{new Date(p.purchaseDate).toLocaleDateString("en-GB")}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <p>No purchases found</p>
                            )}
                            <div className="flex justify-end mt-4">
                                <button
                                    onClick={() => setShowPurchases(false)}
                                    className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div>
    );
}

export default UserList;
