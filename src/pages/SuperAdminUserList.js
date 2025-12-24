// src/pages/SuperAdminUserList.jsx
import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import api from "../api";
import {
    FaSearch, FaLock, FaUnlock, FaDatabase, FaChartPie, FaReceipt, FaSortUp,
    FaSortDown, FaSort, FaFileExport, FaUserShield, FaUserCircle, FaArrowRight,
    FaUsers, FaClipboardCheck, FaUserTag, FaBars, FaTimes
} from "react-icons/fa";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { toast } from 'react-hot-toast';
import { Loader2 } from "lucide-react";

// --- Custom Components (Reused) ---
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
            className={`px-3 py-1 rounded-full text-xs font-semibold border ${colors[status] || defaultColor} whitespace-nowrap`}
        >
            {status}
        </span>
    );
};

// Subscription Tooltip/Badge Renderer
const SubscriptionDetails = ({ user }) => {
    const status = user.subscriptionStatus || "None";
    const isTrial = status === "Trial" || user.trialDaysLeft > 0;
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
            </span>
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-gray-900 text-white text-xs rounded-lg px-4 py-2 shadow-xl whitespace-nowrap z-20 transition duration-300">
                <div className="flex flex-col text-left">
                    <span className="text-sm font-bold mb-1">{statusText} Status</span>
                    <span><span className="font-semibold text-green-400">Start:</span> {formattedStartDate}</span>
                    <span><span className="font-semibold text-red-400">End:</span> {formattedEndDate}</span>
                    {isTrial && user.trialDaysLeft > 0 && (
                        <span className="mt-1 text-yellow-300 font-bold">({user.trialDaysLeft} days left)</span>
                    )}
                </div>
                <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
            </div>
        </div>
    );
};


// Admin/User Role Badge
const RoleBadge = ({ role }) => {
    const isUser = role === "User";
    const colors = {
        User: "bg-blue-100 text-blue-700 border-blue-200",
        Admin: "bg-red-100 text-red-700 border-red-200",
    };
    return (
        <span
            className={`px-3 py-1 rounded-full text-xs font-semibold border ${colors[role] || colors.User} whitespace-nowrap`}
        >
            {isUser ? <FaUserCircle className="inline mr-1" /> : <FaUserShield className="inline mr-1" />}
            {role}
        </span>
    );
};

// --- Main SuperAdminUserList Component ---

function SuperAdminUserList({ isViewerSuperAdmin }) {
    const [users, setUsers] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [sortBy, setSortBy] = useState("createdAt");
    const [sortOrder, setSortOrder] = useState("desc");
    const [loading, setLoading] = useState(true);

    const [userColumnFilters, setUserColumnFilters] = useState({
        companyName: "",
        customerName: "",
        assignedAdminName: "",
        phoneNumber: "",
        email: "",
        accountStatus: "",
        subscriptionStatus: ""
    });

    const [adminColumnFilters, setAdminColumnFilters] = useState({
        adminName: "",
        phoneNumber: "",
        email: "",
        commissionPercentage: "",
        accountStatus: "",
        subscriptionStatus: ""
    });


    // Tab Control
    const [activeTab, setActiveTab] = useState('User');

    // Admin list state for assignment dropdown
    const [availableAdmins, setAvailableAdmins] = useState([]);
    const [selectedAdminIdMap, setSelectedAdminIdMap] = useState({});
    const [adminUserCounts, setAdminUserCounts] = useState({});
    const [selectedAdminId, setSelectedAdminId] = useState("");

    // 🎯 MODAL STATES
    const [commission, setCommission] = useState(10);
    const [showPromoteModal, setShowPromoteModal] = useState(false);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [userToActOn, setUserToActOn] = useState(null); // User object for the modal
    const [adminToAssign, setAdminToAssign] = useState(""); // Selected Admin ID inside the dropdown

    // Filter states
    const location = useLocation();

    // Helper to get initial value, checking for persistence and setting defaults
    const getInitialFilter = (key, defaultUser, defaultAdmin) => {
        if (location.state?.keepFilters) {
            return localStorage.getItem(key) || (key.includes("User") ? defaultUser : defaultAdmin);
        }
        localStorage.removeItem(key);
        return key.includes("User") ? defaultUser : defaultAdmin;
    };

    // 1. User Tab Account Status Filter (Default: Pending)
    const [userAccountStatusFilter, setUserAccountStatusFilter] = useState(() =>
        getInitialFilter("saUserAccountStatusFilter", "Pending", "All")
    );
    // 2. Admin Tab Account Status Filter (Default: All)
    const [adminAccountStatusFilter, setAdminAccountStatusFilter] = useState(() =>
        getInitialFilter("saAdminAccountStatusFilter", "Pending", "All")
    );

    // 3. User Tab Subscription Status Filter (Default: All)
    const [userSubscriptionStatusFilter, setUserSubscriptionStatusFilter] = useState(() =>
        getInitialFilter("saUserSubscriptionStatusFilter", "All", "All")
    );
    // 4. Admin Tab Subscription Status Filter (Default: All)
    const [adminSubscriptionStatusFilter, setAdminSubscriptionStatusFilter] = useState(() =>
        getInitialFilter("saAdminSubscriptionStatusFilter", "All", "All")
    );


    // Persistence Effects: Save changes to respective storage keys
    useEffect(() => {
        localStorage.setItem("saUserAccountStatusFilter", userAccountStatusFilter);
    }, [userAccountStatusFilter]);

    useEffect(() => {
        localStorage.setItem("saAdminAccountStatusFilter", adminAccountStatusFilter);
    }, [adminAccountStatusFilter]);

    useEffect(() => {
        localStorage.setItem("saUserSubscriptionStatusFilter", userSubscriptionStatusFilter);
    }, [userSubscriptionStatusFilter]);

    useEffect(() => {
        localStorage.setItem("saAdminSubscriptionStatusFilter", adminSubscriptionStatusFilter);
    }, [adminSubscriptionStatusFilter]);

    // Active Filter Variables: Select the appropriate filter based on the active tab
    const accountStatusFilter = activeTab === 'User' ? userAccountStatusFilter : adminAccountStatusFilter;
    const subscriptionStatusFilter = activeTab === 'User' ? userSubscriptionStatusFilter : adminSubscriptionStatusFilter;

    // Function to handle changes in the account filter dropdown
    const handleAccountStatusChange = (value) => {
        setCurrentPage(1);
        if (activeTab === 'User') {
            setUserAccountStatusFilter(value);
        } else {
            setAdminAccountStatusFilter(value);
        }
    };

    // Function to handle changes in the subscription filter dropdown
    const handleSubscriptionStatusChange = (value) => {
        setCurrentPage(1);
        if (activeTab === 'User') {
            setUserSubscriptionStatusFilter(value);
        } else {
            setAdminSubscriptionStatusFilter(value);
        }
    };


    const [selectedUser, setSelectedUser] = useState(null);
    const [purchases, setPurchases] = useState([]);
    const [showPurchases, setShowPurchases] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const usersPerPage = 10;
    const [expandedRows, setExpandedRows] = useState({});

    // --- Core Data Fetch ---
    const fetchUserData = () => {
        setLoading(true);
        api.get("/superadmin/userlist")
            .then((res) => {
                const allUsers = res.data;
                const admins = allUsers.filter(u => u.userRole === "Admin");

                // ⭐ ADD assignedAdminName TO EVERY USER
                const enrichedUsers = allUsers.map(user => {
                    const admin = admins.find(a => a.id === user.assignedAdminId);

                    return {
                        ...user,
                        assignedAdminName: admin
                            ? admin.adminName || admin.customerName || "Unassigned"
                            : "Unassigned"
                    };
                });

                setUsers(enrichedUsers);
                setAvailableAdmins(admins);

                // Admin → User count map
                const counts = {};
                admins.forEach(admin => {
                    counts[admin.id] = enrichedUsers.filter(u => u.assignedAdminId === admin.id).length;
                });
                setAdminUserCounts(counts);
            })
            .catch((err) => {
                console.error("Error fetching SuperAdmin list:", err);
                toast.error("Failed to load user list.");
                setUsers([]);
            })
            .finally(() => setLoading(false));
    }
    useEffect(() => {
        fetchUserData();
    }, []);

    // --- Action Handler Implementations ---

    const handlePromoteToAdmin = (userId) => {
        const user = users.find(u => u.id === userId);
        if (user) {
            setUserToActOn(user);
            setShowPromoteModal(true);
        }
    };

    const confirmPromote = () => {
        const userId = userToActOn.id;

        setShowPromoteModal(false);

        api.post(`/superadmin/promote-to-admin/${userId}`, {
            commissionPercentage: Number(commission) || 10
        })
            .then(() => {
                toast.success("User promoted to Admin!");

                setUsers(prev =>
                    prev.map(u =>
                        u.id === userId
                            ? {
                                ...u,
                                userRole: "Admin",
                                accountStatus: "Active",
                                assignedAdminId: null,
                                commissionPercentage: Number(commission) || 10
                            }
                            : u
                    )
                );
            })
            .catch(() => toast.error("Promotion failed."));
    };

    const handleAssignAdminClick = (userId) => {
        const user = users.find(u => u.id === userId);
        if (user) {
            setUserToActOn(user);
            // Pre-select the existing admin or the one chosen in the map
            setAdminToAssign(user.assignedAdminId || selectedAdminIdMap[userId] || "");
            setShowAssignModal(true);
        }
    };

    const confirmAssign = () => {
        const userId = userToActOn.id;
        const adminId = adminToAssign;

        if (!adminId) {
            toast.error("Please select an Admin to assign.");
            return;
        }

        setShowAssignModal(false); // Close modal

        api.post(`/superadmin/assign-user/${userId}/to-admin/${adminId}`)
            .then(() => {
                toast.success("User successfully assigned.");
                const newAdmin = availableAdmins.find(a => a.id === adminId);
                const assignedName = newAdmin ? (newAdmin.adminName || newAdmin.customerName) : 'Assigned Admin';

                // Update local state with new assignedAdminId
                setUsers(prev => prev.map(u =>
                    u.id === userId ? { ...u, assignedAdminId: adminId, assignedAdminName: assignedName } : u
                ));
                // Clear the selection for this user in the map
                setSelectedAdminIdMap(prev => {
                    const newState = { ...prev };
                    delete newState[userId];
                    return newState;
                });
            })
            .catch(err => toast.error("Assignment failed."));
    };

    const handleAdminSelectChange = (userId, adminId) => {
        setSelectedAdminIdMap(prev => ({
            ...prev,
            [userId]: adminId
        }));
    };

    const handleAssignAdmin = (userId) => {
        if (!selectedAdminId) {
            toast.error("Please select an Admin to assign.");
            return;
        }
        if (!window.confirm(`CONFIRM: Assign user ${userId} to Admin ID: ${selectedAdminId}?`)) return;

        api.post(`/superadmin/assign-user/${userId}/to-admin/${selectedAdminId}`)
            .then(() => {
                toast.success("User successfully assigned.");
                // Update local state with new AssignedAdminId
                setUsers(prev => prev.map(u => u.Id === userId ? { ...u, AssignedAdminId: selectedAdminId } : u));
                setSelectedAdminId(""); // Reset dropdown
            })
            .catch(err => toast.error("Assignment failed."));
    };

    // Deactivate/Reactivate handlers remain similar but simplified since they use window.confirm
    const handleDeactivate = (id) => {
        api.post(`/admin/user/${id}/deactivate`).then(() => {
            setUsers((prev) =>
                prev.map((user) =>
                    user.id === id ? { ...user, accountStatus: "Blocked" } : user
                )
            );
            toast.success("User account blocked.");
        });
    };

    const handleReactivate = (id) => {
        api.post(`/admin/user/${id}/reactivate`).then(() => {
            setUsers((prev) =>
                prev.map((user) =>
                    user.id === id ? { ...user, accountStatus: "Active" } : user
                )
            );
            toast.success("User account reactivated.");
        });
    };

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
                setSelectedUser(id);
                setShowPurchases(true);
            });
    };

    const handleExportTable = () => {
        const dataToExport = filteredUsers.map(user => ({
            "Company Name": user.companyName,
            "Customer Name": user.customerName,
            "Admin Name": user.adminName,
            "Email": user.email,
            "Role": user.userRole,
            "Assigned Admin": user.assignedAdminId ? (availableAdmins.find(a => a.id === user.assignedAdminId)?.adminName || user.assignedAdminId) : "None",
            "Account Status": user.accountStatus,
            "Subscription Status": user.subscriptionStatus,
            "Phone Number": user.phoneNumber,
            "Subscription Plan": user.subscriptionPlan || "N/A",
        }));
        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "SuperAdminUsers");
        const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
        const blob = new Blob([wbout], { type: "application/octet-stream" });
        saveAs(blob, "superadmin_users.xlsx");
    };

    // --- Filtering, Sorting, and Pagination (omitted filters use activeTab logic) ---
    const usersInActiveTab = users.filter(u => u.userRole === activeTab);

    const filteredUsers = usersInActiveTab
        .filter((user) => {
            if (!user) return false;

            const searchFields = [
                user.companyName, user.customerName, user.adminName, user.email
            ].map(s => s?.toLowerCase() ?? "");

            const matchesSearch = searchFields.some(s => s.includes(searchTerm.toLowerCase()));

            let matchesColumns = true;

            if (activeTab === "User") {
                matchesColumns =
                    (user.companyName ?? "").toLowerCase().includes((userColumnFilters.companyName ?? "").toLowerCase()) &&
                    (user.customerName ?? "").toLowerCase().includes((userColumnFilters.customerName ?? "").toLowerCase()) &&
                    (user.assignedAdminName ?? "").toLowerCase().includes((userColumnFilters.assignedAdminName ?? "").toLowerCase()) &&
                    (user.phoneNumber ?? "").toLowerCase().includes((userColumnFilters.phoneNumber ?? "").toLowerCase()) &&
                    (user.email ?? "").toLowerCase().includes((userColumnFilters.email ?? "").toLowerCase()) &&
                    (user.accountStatus ?? "").toLowerCase().includes((userColumnFilters.accountStatus ?? "").toLowerCase()) &&
                    (user.subscriptionStatus ?? "").toLowerCase().includes((userColumnFilters.subscriptionStatus ?? "").toLowerCase());
            }

            if (activeTab === "Admin") {
                matchesColumns =
                    (user.adminName ?? "").toLowerCase().includes((adminColumnFilters.adminName ?? "").toLowerCase()) &&
                    (user.phoneNumber ?? "").toLowerCase().includes((adminColumnFilters.phoneNumber ?? "").toLowerCase()) &&
                    (user.email ?? "").toLowerCase().includes((adminColumnFilters.email ?? "").toLowerCase()) &&
                    String(user.commissionPercentage ?? "")
                        .toLowerCase()
                        .includes(
                            String(adminColumnFilters.commissionPercentage ?? "").toLowerCase()
                        ) &&
                    (user.accountStatus ?? "").toLowerCase().includes((adminColumnFilters.accountStatus ?? "").toLowerCase()) &&
                    (user.subscriptionStatus ?? "").toLowerCase().includes((adminColumnFilters.subscriptionStatus ?? "").toLowerCase());
            }

            const matchesAccountStatus = accountStatusFilter === "All" || user.accountStatus === accountStatusFilter;
            const matchesSubscriptionStatus = subscriptionStatusFilter === "All" || user.subscriptionStatus === subscriptionStatusFilter;

            return matchesSearch && matchesColumns && matchesAccountStatus && matchesSubscriptionStatus;
        })
        .sort((a, b) => {
            const aVal = a[sortBy];
            const bVal = b[sortBy];

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

    // Helper to find Admin Name for display
    const getAdminName = (adminId) => {
        const admin = availableAdmins.find(a => a.id === adminId);
        return admin ? (admin.adminName || admin.customerName || `Admin #${adminId.substring(0, 4)}`) : 'Unassigned';
    };

    // Dynamic Headers based on activeTab
    const baseHeaders = ["email", "phoneNumber", "accountStatus", "subscriptionStatus"];
    const userDisplayCols = ["companyName", "customerName", "assignedAdminId"];
    const adminDisplayCols = ["adminName", "commissionPercentage"];

    const dynamicHeaders = activeTab === 'User' ? userDisplayCols : adminDisplayCols;

    // --- Custom Modal Components (Defined inside the main component scope to access state/handlers) ---

    const PromoteModal = ({ user, commission, setCommission, onConfirm, onClose }) => (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 border-t-4 border-red-600">
                <div className="flex justify-between items-center mb-4">
                    <h4 className="text-xl font-bold text-red-700 flex items-center gap-2">
                        <FaUserShield /> Confirm Promotion
                    </h4>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800">
                        <FaTimes />
                    </button>
                </div>

                <p className="text-gray-700 mb-4">
                    Promote <strong>{user?.customerName || user?.companyName}</strong> to Admin?
                </p>

                {/* Commission input */}
                <div className="mb-6">
                    <label className="text-sm font-semibold text-gray-700 block mb-1">
                        Commission Percentage
                    </label>
                    <input
                        type="number"
                        min="1"
                        max="100"
                        value={commission}
                        onChange={(e) => setCommission(e.target.value)}
                        className="w-full p-2 border rounded-lg text-sm"
                    />
                    <p className="text-xs text-gray-500 mt-1">Default is 10%</p>
                </div>

                <div className="flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                    >
                        Yes, Promote
                    </button>
                </div>
            </div>
        </div>
    );

    const AssignModal = ({ user, adminId, setAdminId, availableAdmins, onConfirm, onClose }) => {
        const adminName = availableAdmins.find(a => a.id === adminId)?.adminName || "No Admin Selected";
        return (
            <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 border-t-4 border-cyan-600">
                    <div className="flex justify-between items-center mb-4">
                        <h4 className="text-xl font-bold text-cyan-700 flex items-center gap-2"><FaUserTag /> Assign Admin</h4>
                        <button onClick={onClose} className="text-gray-500 hover:text-gray-800"><FaTimes /></button>
                    </div>
                    <p className="text-gray-700 mb-4">
                        Assign <strong>{user?.customerName || user?.companyName}</strong> to a managing Admin. Current status: <strong>{user?.assignedAdminId ? `Assigned to ${getAdminName(user.assignedAdminId)}` : 'Unassigned'}</strong>.
                    </p>

                    <select
                        className="w-full p-3 border border-gray-300 rounded-lg text-sm mb-6 bg-white focus:ring-cyan-500"
                        value={adminId}
                        onChange={(e) => setAdminId(e.target.value)}
                    >
                        <option value="">{user?.assignedAdminId ? 'Select New Admin (Re-assign)' : 'Select Admin'}</option>
                        {availableAdmins.map(admin => (
                            <option key={admin.id} value={admin.id}>
                                {admin.adminName || admin.customerName}
                            </option>
                        ))}
                    </select>

                    <div className="flex justify-end gap-3">
                        <button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors font-medium">
                            Cancel
                        </button>
                        <button
                            onClick={onConfirm}
                            disabled={!adminId}
                            className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors font-medium disabled:bg-gray-400"
                        >
                            Confirm Assignment
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    // --- Render ---

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-lg text-white flex items-center gap-2 p-6 bg-red-800 rounded-2xl shadow-lg">
                    <Loader2 className="animate-spin w-6 h-6" /> Loading Users...
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 px-4 sm:px-6 lg:px-8 py-8">
            <div className="max-w-8xl mx-auto bg-white shadow-2xl rounded-2xl border border-gray-200 overflow-hidden">

                {/* Header and Filters Section */}
                <header className="bg-red-800 p-6 flex flex-col gap-4">
                    <h2 className="text-3xl font-extrabold text-white flex items-center gap-3">
                        <FaUserShield className="w-8 h-8" /> Central User Management
                    </h2>

                    {/* Filters and Actions */}
                    <div className="flex flex-wrap gap-3 pt-2 items-center justify-between">
                        {/* Filter Selects */}
                        <div className="flex flex-wrap gap-3">
                            <select
                                className="py-2 px-4 border border-white/50 rounded-lg text-black text-sm focus:ring-red-400 focus:border-red-400 transition cursor-pointer"
                                value={accountStatusFilter}
                                onChange={(e) => handleAccountStatusChange(e.target.value)}
                            >
                                <option value="All" className="text-gray-800">Account Status: All</option>
                                <option value="Active" className="text-gray-800">Account Status: Active</option>
                                <option value="Blocked" className="text-gray-800">Account Status: Blocked</option>
                                <option value="Pending" className="text-gray-800">Account Status: Pending</option>
                            </select>

                            <select
                                className="py-2 px-4 border border-white/50 rounded-lg text-black text-sm focus:ring-red-400 focus:border-red-400 transition cursor-pointer"
                                value={subscriptionStatusFilter}
                                onChange={(e) => handleSubscriptionStatusChange(e.target.value)}
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
                            title="Export current filtered data to Excel"
                        >
                            <FaFileExport /> Export ({filteredUsers.length})
                        </button>
                    </div>
                </header>

                {/* -------------------- TAB NAVIGATION -------------------- */}
                <div className="flex border-b border-gray-200 bg-gray-50">
                    <button
                        className={`flex-1 py-4 text-lg font-semibold transition flex items-center justify-center gap-2 ${activeTab === 'User' ? 'border-b-4 border-red-600 text-red-700 bg-white' : 'text-gray-600 hover:bg-gray-100'}`}
                        onClick={() => { setActiveTab('User'); setCurrentPage(1); }}
                    >
                        <FaUsers className="w-5 h-5" /> Customers <span className="text-sm font-normal text-gray-500">({users.filter(u => u.userRole === 'User').length})</span>
                    </button>
                    <button
                        className={`flex-1 py-4 text-lg font-semibold transition flex items-center justify-center gap-2 ${activeTab === 'Admin' ? 'border-b-4 border-red-600 text-red-700 bg-white' : 'text-gray-600 hover:bg-gray-100'}`}
                        onClick={() => { setActiveTab('Admin'); setCurrentPage(1); }}
                    >
                        <FaUserShield className="w-5 h-5" /> Admins
                        <span className="text-sm bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-normal">
                            {users.filter(u => u.userRole === 'Admin').length}
                        </span>
                    </button>
                </div>
                {/* -------------------- END TAB NAVIGATION -------------------- */}


                {/* Data Display Content */}
                <div className="p-4 sm:p-6">
                    <p className="text-lg font-bold text-gray-800 mb-4">
                        Showing {currentUsers.length} of {filteredUsers.length} total filtered {activeTab}{filteredUsers.length !== 1 ? 's' : ''}.
                    </p>

                    {/* Table View (Desktop/Tablet) */}
                    <div className="hidden sm:block overflow-x-auto border rounded-xl shadow-lg">
                        <table className="min-w-full text-sm divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr className="text-left text-xs text-gray-600 uppercase tracking-wider">
                                    <th className="p-4 w-10">#</th>
                                    {/* Dynamic Headers */}
                                    {dynamicHeaders.map((col) => (
                                        <th key={col} className="p-4 cursor-pointer whitespace-nowrap" onClick={() => { setSortBy(col); setSortOrder(sortOrder === "asc" ? "desc" : "asc"); }}>
                                            <div className="flex items-center gap-1 font-semibold text-gray-700">
                                                {/* Special label for Admin Tab/User Column */}
                                                {col === 'adminName' && activeTab === 'Admin' ? (
                                                    <>Admin Name <span className="text-indigo-500">(<FaUsers className="inline text-xs" /> Assigned)</span></>
                                                ) : (
                                                    capitalize(col === 'assignedAdminId' ? 'Assigned Admin' : col)
                                                )}
                                                {sortBy === col ? (sortOrder === "asc" ? <FaSortUp className="text-red-600" /> : <FaSortDown className="text-red-600" />) : (<FaSort className="text-gray-400 text-xs" />)}
                                            </div>
                                        </th>
                                    ))}
                                    {/* Standard Headers */}
                                    {baseHeaders.map((col) => (
                                        <th key={col} className="p-4 cursor-pointer whitespace-nowrap" onClick={() => { setSortBy(col); setSortOrder(sortOrder === "asc" ? "desc" : "asc"); }}>
                                            <div className="flex items-center gap-1 font-semibold text-gray-700">{capitalize(col)} {sortBy === col ? (sortOrder === "asc" ? <FaSortUp className="text-red-600" /> : <FaSortDown className="text-red-600" />) : (<FaSort className="text-gray-400 text-xs" />)}</div>
                                        </th>
                                    ))}

                                    <th className="p-4 text-center w-52 font-semibold text-gray-700">Actions</th>
                                </tr>
                                {/* FILTER INPUT ROW */}
                                <tr className="bg-white border-b">
                                    <th></th>

                                    {/* USER TAB FILTERS */}
                                    {activeTab === "User" &&
                                        <>
                                            <th className="p-2">
                                                <input
                                                    value={userColumnFilters.companyName}
                                                    onChange={(e) =>
                                                        setUserColumnFilters({ ...userColumnFilters, companyName: e.target.value })
                                                    }
                                                    className="w-full px-2 py-1 border rounded"
                                                    placeholder="Search..."
                                                />
                                            </th>
                                            <th className="p-2">
                                                <input
                                                    value={userColumnFilters.customerName}
                                                    onChange={(e) =>
                                                        setUserColumnFilters({ ...userColumnFilters, customerName: e.target.value })
                                                    }
                                                    className="w-full px-2 py-1 border rounded"
                                                    placeholder="Search..."
                                                />
                                            </th>
                                            <th className="p-2">
                                                <input
                                                    value={userColumnFilters.assignedAdminName}
                                                    onChange={(e) =>
                                                        setUserColumnFilters({ ...userColumnFilters, assignedAdminName: e.target.value })
                                                    }
                                                    className="w-full px-2 py-1 border rounded"
                                                    placeholder="Search..."
                                                />
                                            </th>
                                        </>
                                    }

                                    {/* ADMIN TAB FILTERS */}
                                    {activeTab === "Admin" && (
                                        <>
                                            {/* Admin Name */}
                                            <th className="p-2">
                                                <input
                                                    value={adminColumnFilters.adminName}
                                                    onChange={(e) =>
                                                        setAdminColumnFilters({
                                                            ...adminColumnFilters,
                                                            adminName: e.target.value
                                                        })
                                                    }
                                                    className="w-full px-2 py-1 border rounded"
                                                    placeholder="Admin name"
                                                />
                                            </th>

                                            {/* Commission Percentage */}
                                            <th className="p-2">
                                                <input
                                                    value={adminColumnFilters.commissionPercentage}
                                                    onChange={(e) =>
                                                        setAdminColumnFilters({
                                                            ...adminColumnFilters,
                                                            commissionPercentage: e.target.value
                                                        })
                                                    }
                                                    className="w-full px-2 py-1 border rounded"
                                                    placeholder="Commission %"
                                                />
                                            </th>
                                        </>
                                    )}

                                    {/* SHARED FILTERS: email / phone / accountStatus / subscriptionStatus */}
                                    <th className="p-2">
                                        <input
                                            value={activeTab === "User" ? userColumnFilters.email : adminColumnFilters.email}
                                            onChange={(e) =>
                                                activeTab === "User"
                                                    ? setUserColumnFilters({ ...userColumnFilters, email: e.target.value })
                                                    : setAdminColumnFilters({ ...adminColumnFilters, email: e.target.value })
                                            }
                                            className="w-full px-2 py-1 border rounded"
                                            placeholder="Search..."
                                        />
                                    </th>

                                    <th className="p-2">
                                        <input
                                            value={activeTab === "User" ? userColumnFilters.phoneNumber : adminColumnFilters.phoneNumber}
                                            onChange={(e) =>
                                                activeTab === "User"
                                                    ? setUserColumnFilters({ ...userColumnFilters, phoneNumber: e.target.value })
                                                    : setAdminColumnFilters({ ...adminColumnFilters, phoneNumber: e.target.value })
                                            }
                                            className="w-full px-2 py-1 border rounded"
                                            placeholder="Search..."
                                        />
                                    </th>

                                    <th className="p-2">
                                        <input
                                            value={activeTab === "User" ? userColumnFilters.accountStatus : adminColumnFilters.accountStatus}
                                            onChange={(e) =>
                                                activeTab === "User"
                                                    ? setUserColumnFilters({ ...userColumnFilters, accountStatus: e.target.value })
                                                    : setAdminColumnFilters({ ...adminColumnFilters, accountStatus: e.target.value })
                                            }
                                            className="w-full px-2 py-1 border rounded"
                                            placeholder="Search..."
                                        />
                                    </th>

                                    <th className="p-2">
                                        <input
                                            value={
                                                activeTab === "User"
                                                    ? userColumnFilters.subscriptionStatus
                                                    : adminColumnFilters.subscriptionStatus
                                            }
                                            onChange={(e) =>
                                                activeTab === "User"
                                                    ? setUserColumnFilters({ ...userColumnFilters, subscriptionStatus: e.target.value })
                                                    : setAdminColumnFilters({ ...adminColumnFilters, subscriptionStatus: e.target.value })
                                            }
                                            className="w-full px-2 py-1 border rounded"
                                            placeholder="Search..."
                                        />
                                    </th>

                                    <th></th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {currentUsers.map((user, index) => {
                                    const isPendingUser = user.userRole === 'User' && user.accountStatus === 'Pending';
                                    const isUnassignedUser = user.assignedAdminId === null;
                                    const currentAdminSelection = selectedAdminIdMap[user.id] || "";

                                    return (
                                        <tr key={user.id} className="hover:bg-red-50 transition">
                                            <td className="p-4 font-medium text-center text-gray-700">{indexOfFirstUser + index + 1}</td>

                                            {/* Dynamic Data Columns */}
                                            {dynamicHeaders.map(col => (
                                                <td key={col} className="p-4 text-gray-700">
                                                    {col === 'assignedAdminId'
                                                        ? <span className={`font-semibold ${user.assignedAdminId ? 'text-indigo-600' : 'text-gray-500'}`}>{getAdminName(user.assignedAdminId)}</span>
                                                        : user[col] || 'N/A'}
                                                    {activeTab === 'Admin' && col === 'adminName' && (
                                                        <div className="text-xs text-indigo-600 font-bold mt-1">
                                                            ({adminUserCounts[user.id] || 0} Users Assigned)
                                                        </div>
                                                    )}
                                                </td>
                                            ))}

                                            {/* Standard Data Columns */}
                                            <td className="p-4 text-gray-700 truncate max-w-xs">{user.email}</td>
                                            <td className="p-4 text-gray-700 whitespace-nowrap">{user.phoneNumber || 'N/A'}</td>
                                            <td className="p-4 text-center">
                                                <StatusBadge status={user.accountStatus} />
                                            </td>
                                            <td className="p-4 text-center">
                                                <SubscriptionDetails user={user} />
                                            </td>

                                            {/* Actions */}
                                            <td className="p-4">
                                                <div className="flex flex-col gap-2 items-center min-w-max">
                                                    {activeTab === "Admin" ? (
                                                        <>
                                                            {user.accountStatus !== "Pending" && (
                                                                <>
                                                                    {/* Group: Profile/Setup/Purchases */}
                                                                    <div className="flex flex-wrap gap-1 justify-center w-full">
                                                                        <Link to={`/adminprofile/${user.id}`} state={{ keepFilters: true }} className="p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition shadow-md" title="DB Setup">
                                                                            <FaDatabase className="w-4 h-4" />
                                                                        </Link>
                                                                    </div>

                                                                    {/* Group: Status Toggles */}
                                                                    {user.accountStatus === "Active" ? (
                                                                        <button onClick={() => handleDeactivate(user.id)} className="px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-xs font-medium w-full flex items-center justify-center gap-1 shadow-md">
                                                                            <FaLock /> Block Account
                                                                        </button>
                                                                    ) : (user.accountStatus === "Blocked" && (
                                                                        <button onClick={() => handleReactivate(user.id)} className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-xs font-medium w-full flex items-center justify-center gap-1 shadow-md">
                                                                            <FaUnlock /> Reactivate
                                                                        </button>
                                                                    ))}
                                                                </>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <>

                                                            {/* SUPER ADMIN ACTIONS for PENDING USERS */}
                                                            {isPendingUser && isUnassignedUser && (
                                                                <button
                                                                    onClick={() => handlePromoteToAdmin(user.id)}
                                                                    className="px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-xs font-medium w-full flex items-center justify-center gap-1 shadow-md"
                                                                    title="Promote to Admin"
                                                                >
                                                                    <FaUserShield /> Promote to Admin
                                                                </button>
                                                            )}

                                                            {isPendingUser && (
                                                                <button
                                                                    onClick={() => handleAssignAdminClick(user.id)}
                                                                    className="px-3 py-1 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition text-xs font-medium w-full flex items-center justify-center gap-1 shadow-md"
                                                                    title={user.assignedAdminId ? "Re-assign Admin" : "Assign Admin"}
                                                                >
                                                                    <FaUserTag className="w-3 h-3" />
                                                                    {user.assignedAdminId ? 'Re-assign Admin' : 'Assign Admin'}
                                                                </button>
                                                            )}

                                                            {/* STANDARD ACTIONS for ACTIVE/BLOCKED USERS */}
                                                            {user.accountStatus !== "Pending" && (
                                                                <>
                                                                    {/* Group: Profile/Setup/Purchases */}
                                                                    <div className="flex flex-wrap gap-1 justify-center w-full">
                                                                        <Link to={`/profile/${user.id}`} state={{ keepFilters: true }} className="p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition shadow-md" title="DB Setup">
                                                                            <FaDatabase className="w-4 h-4" />
                                                                        </Link>
                                                                        <Link to={`/user/${user.id}/tools`} state={{ keepFilters: true }} className="p-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition shadow-md" title="Set Modules">
                                                                            <FaChartPie className="w-4 h-4" />
                                                                        </Link>
                                                                        <button onClick={() => handleShowPurchases(user.id)} className="p-1.5 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition shadow-md" title="View Purchases">
                                                                            <FaReceipt className="w-4 h-4" />
                                                                        </button>
                                                                    </div>

                                                                    {/* Group: Status Toggles */}
                                                                    {user.accountStatus === "Active" ? (
                                                                        <button onClick={() => handleDeactivate(user.id)} className="px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-xs font-medium w-full flex items-center justify-center gap-1 shadow-md">
                                                                            <FaLock /> Block Account
                                                                        </button>
                                                                    ) : (user.accountStatus === "Blocked" && (
                                                                        <button onClick={() => handleReactivate(user.id)} className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-xs font-medium w-full flex items-center justify-center gap-1 shadow-md">
                                                                            <FaUnlock /> Reactivate
                                                                        </button>
                                                                    ))}
                                                                </>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {filteredUsers.length === 0 && (
                                    <tr>
                                        <td colSpan={10} className="text-center text-gray-500 py-6 italic text-lg bg-gray-50">
                                            <FaSearch className="inline mr-2" /> No {activeTab}s match the current search or filters.
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
                                        {activeTab === "User" ? (
                                            <>
                                                <p className="font-bold text-gray-900 text-lg">
                                                    {user.companyName || "—"}
                                                </p>
                                                <p className="text-sm text-gray-600">
                                                    {user.customerName || "—"}
                                                </p>
                                            </>
                                        ) : (
                                            <>
                                                <p className="font-bold text-gray-900 text-lg">
                                                    {user.adminName || user.customerName || "Admin"}
                                                </p>
                                                <p className="text-sm text-gray-600">
                                                    {user.email}
                                                </p>
                                                <p className="px-2 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-700 w-fit mt-1">
                                                    {adminUserCounts[user.id] || 0} Users Assigned
                                                </p>
                                            </>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <RoleBadge role={user.userRole} />
                                        {expandedRows[user.id] ? (
                                            <FaTimes className="text-red-500 w-5 h-5" />
                                        ) : (
                                            <FaBars className="text-red-500 w-5 h-5" />
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

                                        {/* MOBILE ACTION BUTTONS */}
                                        <div className="pt-3 border-t border-gray-100 flex flex-col gap-2">

                                            {/** 👇 Correct property names everywhere */}
                                            {(() => {
                                                const isPendingUser = user.userRole === "User" && user.accountStatus === "Pending";
                                                const isUnassigned = user.assignedAdminId === null;

                                                const isActive = user.accountStatus === "Active";
                                                const isBlocked = user.accountStatus === "Blocked";

                                                const hasAdmins = availableAdmins.length > 0;

                                                return (
                                                    <>
                                                        {/* --- 1. Promote User → Admin (same condition as desktop) --- */}
                                                        {isPendingUser && isUnassigned && (
                                                            <button
                                                                onClick={() => handlePromoteToAdmin(user.id)}
                                                                className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-xs font-medium w-full flex items-center justify-center gap-1"
                                                            >
                                                                <FaUserShield /> Promote to Admin
                                                            </button>
                                                        )}

                                                        {/* --- 2. Assign/Reassign Admin (same as desktop) --- */}
                                                        {isPendingUser && hasAdmins && (
                                                            <button
                                                                onClick={() => handleAssignAdminClick(user.id)}
                                                                className="px-3 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition text-xs font-medium w-full flex items-center justify-center gap-1"
                                                            >
                                                                <FaUserTag />
                                                                {user.assignedAdminId ? "Re-assign Admin" : "Assign Admin"}
                                                            </button>
                                                        )}

                                                        {/* --- 3. Desktop-equivalent action buttons (DB Setup, Tools, Purchases) --- */}
                                                        {(user.accountStatus !== "Pending") && (
                                                            <>
                                                                <div className="flex flex-col gap-1 mt-1">

                                                                    <Link
                                                                        to={`/profile/${user.id}`}
                                                                        state={{ keepFilters: true }}
                                                                        className="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-xs font-medium flex items-center justify-center gap-1"
                                                                    >
                                                                        <FaDatabase /> DB Setup
                                                                    </Link>

                                                                    <Link
                                                                        to={`/user/${user.id}/tools`}
                                                                        state={{ keepFilters: true }}
                                                                        className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-xs font-medium flex items-center justify-center gap-1"
                                                                    >
                                                                        <FaChartPie /> Module Setup
                                                                    </Link>

                                                                    <button
                                                                        onClick={() => handleShowPurchases(user.id)}
                                                                        className="px-3 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition text-xs font-medium flex items-center justify-center gap-1"
                                                                    >
                                                                        <FaReceipt /> View Purchases
                                                                    </button>
                                                                </div>
                                                            </>
                                                        )}

                                                        {/* --- 4. Block / Reactivate (exact desktop logic) --- */}
                                                        {isActive && (
                                                            <button
                                                                onClick={() => handleDeactivate(user.id)}
                                                                className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-xs font-medium w-full flex items-center justify-center gap-1"
                                                            >
                                                                <FaLock /> Block Account
                                                            </button>
                                                        )}

                                                        {isBlocked && (
                                                            <button
                                                                onClick={() => handleReactivate(user.id)}
                                                                className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-xs font-medium w-full flex items-center justify-center gap-1"
                                                            >
                                                                <FaUnlock /> Reactivate
                                                            </button>
                                                        )}
                                                    </>
                                                );
                                            })()}
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
                                className="px-4 py-2 bg-indigo-600 text-white rounded-lg disabled:opacity-50 disabled:bg-gray-400 hover:bg-indigo-700 transition text-sm font-medium shadow-md"
                            >
                                Previous
                            </button>
                            <span className="text-sm font-medium text-gray-700">
                                Page {currentPage} of {totalPages}
                            </span>
                            <button
                                disabled={currentPage === totalPages}
                                onClick={() => setCurrentPage((prev) => prev + 1)}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-lg disabled:opacity-50 disabled:bg-gray-400 hover:bg-indigo-700 transition text-sm font-medium shadow-md"
                            >
                                Next
                            </button>
                        </div>
                    )}
                </div>

                {/* Purchases Modal */}
                {showPurchases && (
                    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm mt-4">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-[95vw] sm:max-w-4xl 
                        p-4 sm:p-6 border-t-4 border-yellow-600 max-h-[90vh] overflow-y-auto">
                            <h3 className="text-2xl font-bold mb-4 text-gray-800 flex items-center gap-2">
                                <FaReceipt className="text-yellow-600" /> Purchase History
                            </h3>
                            {/* <p className="text-sm text-gray-500 mb-4">Showing all purchases for User ID: {selectedUser}</p> */}

                            {purchases.length > 0 ? (
                                <div className="overflow-x-auto border rounded-lg shadow-inner w-full max-w-full">
                                    <table className="min-w-full text-sm divide-y divide-gray-200">
                                        <thead className="bg-gray-50 whitespace-normal sm:whitespace-nowrap">
                                            <tr>
                                                <th className="p-3 text-left font-semibold text-gray-700">Invoice #</th>
                                                <th className="p-3 text-left font-semibold text-gray-700">Plan Name</th>
                                                <th className="p-3 text-center font-semibold text-gray-700">Price (₹)</th>
                                                <th className="p-3 text-center font-semibold text-gray-700">Status</th>
                                                <th className="p-3 text-center font-semibold text-gray-700">Start Date</th>
                                                <th className="p-3 text-center font-semibold text-gray-700">End Date</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                            {purchases.map((p, i) => (
                                                <tr key={i} className="hover:bg-yellow-50">
                                                    <td className="p-3 font-mono text-xs text-gray-600">{p.invoiceNumber}</td>
                                                    <td className="p-3 font-medium text-gray-800">{p.planName}</td>
                                                    <td className="p-3 text-center font-bold text-green-700">₹{p.price}</td>
                                                    <td className="p-3 text-center">
                                                        <StatusBadge status={p.status} isSubscription />
                                                    </td>
                                                    <td className="p-3 text-center text-gray-700">{new Date(p.startDate).toLocaleDateString("en-GB")}</td>
                                                    <td className="p-3 text-center text-gray-700">{new Date(p.endDate).toLocaleDateString("en-GB")}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <p className="text-center text-gray-500 p-6 border border-dashed rounded-lg bg-gray-50">
                                    <FaClipboardCheck className="inline mr-2 text-xl" /> No purchase history found for this user.
                                </p>
                            )}
                            <div className="flex justify-end mt-6">
                                <button
                                    onClick={() => setShowPurchases(false)}
                                    className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition font-medium shadow-lg"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- CUSTOM MODALS --- */}
                {showPromoteModal && userToActOn && (
                    <PromoteModal
                        user={userToActOn}
                        commission={commission}
                        setCommission={setCommission}
                        onConfirm={confirmPromote}
                        onClose={() => setShowPromoteModal(false)}
                    />
                )}

                {showAssignModal && userToActOn && (
                    <AssignModal
                        user={userToActOn}
                        adminId={adminToAssign}
                        setAdminId={setAdminToAssign}
                        availableAdmins={availableAdmins}
                        onConfirm={confirmAssign}
                        onClose={() => setShowAssignModal(false)}
                    />
                )}
                {/* --- END CUSTOM MODALS --- */}
            </div >
        </div>
    );
}

export default SuperAdminUserList;