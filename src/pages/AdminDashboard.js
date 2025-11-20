// import React, { useState, useEffect, useCallback } from 'react';
// import { useParams, useNavigate } from 'react-router-dom';
// import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
// import api from "../api";
// import {
//     FaUser, FaUsers, FaBriefcase, FaMoneyBillWave, FaQuestionCircle,
//     FaFileInvoiceDollar, FaSpinner, FaEnvelopeOpenText, FaTimes, FaLayerGroup, FaTags,
//     FaSignal, FaArrowUp, FaCog, FaRedo, FaHistory, FaExternalLinkAlt
// } from "react-icons/fa";

// // --- CONFIGURATION ---
// const POLLING_INTERVAL_MS = 60000; // Poll every 60 seconds (1 minute)

// // --- 1. DashboardCard Component (Unchanged) ---
// const DashboardCard = ({ title, value, description, icon: Icon, colorClass = 'bg-indigo-500', onClick }) => (
//     <div
//         className={`bg-white dark:bg-gray-800 shadow-xl rounded-2xl p-6 transition duration-300 ease-in-out hover:shadow-2xl hover:scale-[1.02] border-t-4 border-b-4 border-transparent ${onClick ? 'cursor-pointer hover:border-indigo-500' : ''}`}
//         onClick={onClick}
//     >
//         <div className="flex items-start justify-between">
//             <div>
//                 <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{title}</p>
//                 <p className="mt-1 text-3xl font-extrabold text-gray-900 dark:text-white">
//                     {value}
//                 </p>
//             </div>
//             <div className={`p-3 rounded-full ${colorClass} text-white shadow-lg`}>
//                 <Icon className="h-6 w-6" aria-hidden="true" />
//             </div>
//         </div>
//         {description && (
//             <p className="mt-4 text-sm text-gray-400 dark:text-gray-500">{description}</p>
//         )}
//     </div>
// );

// // --- 2. Admin Breakdown Table (SuperAdmin Only) - MODIFIED ---
// const AdminBreakdownTable = ({ breakdownData, onAdminClick }) => {
//     if (!breakdownData || breakdownData.length === 0) return null;

//     const formatRevenue = (value) => `₹${(value || 0)?.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;

//     return (
//         <div className="bg-white dark:bg-gray-800 shadow-xl rounded-2xl p-6 overflow-x-auto mb-8">
//             <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
//                 <FaBriefcase className="w-6 h-6 mr-2 text-yellow-500" />
//                 Admin Performance Breakdown
//             </h2>
//             <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
//                 <thead className="bg-gray-50 dark:bg-gray-700">
//                     <tr>
//                         {['Admin', 'Users', 'Revenue', 'Queries', 'Complaints'].map(header => (
//                             <th key={header} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{header}</th>
//                         ))}
//                     </tr>
//                 </thead>
//                 <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
//                     {breakdownData.map((admin) => (
//                         <tr
//                             key={admin.adminId}
//                             onClick={() => admin.adminId !== 'unassigned' && onAdminClick(admin.adminId)}
//                             className={`transition duration-150 ${admin.adminId !== 'unassigned' ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50' : ''}`}
//                         >
//                             <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-indigo-600 dark:text-indigo-400">
//                                 {admin.adminName}
//                                 {admin.adminId === 'unassigned' && <span className="ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-200">Unassigned</span>}
//                             </td>
//                             <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{admin.totalUsers}</td>
//                             <td className="px-4 py-4 whitespace-nowrap text-sm font-semibold text-green-600 dark:text-green-400">{formatRevenue(admin.totalRevenue)}</td>
//                             <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{admin.totalQueries}</td>
//                             <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{admin.totalComplaints}</td>
//                         </tr>
//                     ))}
//                 </tbody>
//             </table>
//         </div>
//     );
// };

// // --- 3. Activity Logs Component (Unchanged) ---
// const ActivityLogCard = ({ logs }) => {
//     // Truncate logs to ensure only the latest 5 are shown if more are returned
//     const displayLogs = logs?.slice(0, 5) || [];

//     if (displayLogs.length === 0) return (
//         <div className="bg-white dark:bg-gray-800 shadow-xl rounded-2xl p-6 lg:col-span-1">
//             <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
//                 <FaHistory className="w-6 h-6 mr-2 text-indigo-500" /> Latest Activity
//             </h2>
//             <p className="text-gray-500 dark:text-gray-400">No recent activity logs available.</p>
//         </div>
//     );

//     const formatTime = (timestamp) => {
//         const date = new Date(timestamp);
//         return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
//     };

//     return (
//         <div className="bg-white dark:bg-gray-800 shadow-xl rounded-2xl p-6 lg:col-span-1">
//             <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
//                 <FaHistory className="w-6 h-6 mr-2 text-indigo-500" /> Latest Activity
//             </h2>
//             <ul className="divide-y divide-gray-200 dark:divide-gray-700">
//                 {displayLogs.map((log, index) => (
//                     <li key={index} className="py-3 flex justify-between items-center text-sm">
//                         <div className="flex-1 min-w-0">
//                             <p className="font-medium text-gray-900 dark:text-white truncate">{log.description}</p>
//                         </div>
//                         <time className="ml-4 flex-shrink-0 text-gray-400 dark:text-gray-500 text-xs">
//                             {formatTime(log.timestamp)}
//                         </time>
//                     </li>
//                 ))}
//             </ul>
//             <div className="mt-4 text-center">
//                 <a href="/admin/activity-logs" className="text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300">
//                     View All Logs &rarr;
//                 </a>
//             </div>
//         </div>
//     );
// };


// // --- NEW UTILITY COMPONENT: Modal Base ---
// const Modal = ({ title, isOpen, onClose, children }) => {
//     if (!isOpen) return null;
//     return (
//         <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-900 bg-opacity-75 flex items-center justify-center p-4 transition-opacity duration-300">
//             <div className="bg-white dark:bg-gray-800 rounded-xl shadow-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto transform transition-transform duration-300 scale-100">
//                 <div className="p-6 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
//                     <div className="flex justify-between items-center">
//                         <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h3>
//                         <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition">
//                             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
//                         </button>
//                     </div>
//                 </div>
//                 <div className="p-6">
//                     {children}
//                 </div>
//             </div>
//         </div>
//     );
// };

// // --- NEW SUB-BLOCK COMPONENTS ---

// // Sub-component 1: User Status Modal
// const UserStatusModal = ({ adminId, isOpen, onClose, api, formatRevenue }) => {
//     const [statusBreakdown, setStatusBreakdown] = useState(null);
//     const [loading, setLoading] = useState(false);
//     const [activeStatus, setActiveStatus] = useState(null);
//     const [planBreakdown, setPlanBreakdown] = useState(null);

//     const buildApiUrl = (endpoint) => {
//         let url = `/adminDashboard/${endpoint}`;
//         if (adminId) {
//             url += `?targetAdminId=${adminId}`;
//         }
//         return url;
//     };

//     const fetchStatusBreakdown = useCallback(async () => {
//         setLoading(true);
//         setActiveStatus(null);
//         setPlanBreakdown(null);
//         try {
//             const res = await api.get(buildApiUrl(`users/summary`));
//             setStatusBreakdown(res.data.statusBreakdown);
//         } catch (e) {
//             console.error("Failed to fetch user status breakdown:", e);
//         } finally {
//             setLoading(false);
//         }
//     }, [adminId, isOpen]);

//     const fetchPlanBreakdown = useCallback(async (status) => {
//         setLoading(true);
//         setActiveStatus(status);
//         try {
//             // Note: This API endpoint (user-breakdown-by-status) is assumed to be updated in the backend
//             const url = buildApiUrl(`user-breakdown-by-status/${status}`);
//             const res = await api.get(url);
//             setPlanBreakdown(res.data);
//         } catch (e) {
//             console.error("Failed to fetch plan breakdown:", e);
//         } finally {
//             setLoading(false);
//         }
//     }, [adminId]);

//     useEffect(() => {
//         if (isOpen) {
//             fetchStatusBreakdown();
//         }
//     }, [isOpen, fetchStatusBreakdown]);

//     const statusColors = {
//         'Active': 'bg-green-500',
//         'Pending': 'bg-yellow-500',
//         'Blocked': 'bg-red-500',
//     };

//     return (
//         <Modal title="User Account Status Breakdown" isOpen={isOpen} onClose={onClose}>
//             {loading && <p className="text-center text-indigo-500 py-4">Loading...</p>}

//             <div className="grid grid-cols-3 gap-4 mb-6">
//                 {statusBreakdown?.map(item => (
//                     <button
//                         key={item.status}
//                         onClick={() => fetchPlanBreakdown(item.status)}
//                         className={`p-4 rounded-lg text-white font-bold transition duration-150 transform hover:scale-[1.05] ${statusColors[item.status] || 'bg-gray-500'} ${activeStatus === item.status ? 'ring-4 ring-offset-2 ring-indigo-500' : ''}`}
//                     >
//                         {item.status}: {item.count}
//                     </button>
//                 ))}
//             </div>

//             {activeStatus && (
//                 <div className="mt-6 p-4 border rounded-lg dark:border-gray-700">
//                     <h4 className="text-xl font-semibold mb-3 text-indigo-600 dark:text-indigo-400">Plans Breakdown for {activeStatus} Users</h4>
//                     <div className="grid grid-cols-4 gap-4 text-center">
//                         <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-md">
//                             <p className="text-sm text-gray-500 dark:text-gray-400">Trial</p>
//                             <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{planBreakdown?.trialUsers || 0}</p>
//                         </div>
//                         <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-md">
//                             <p className="text-sm text-gray-500 dark:text-gray-400">Active Sub</p>
//                             <p className="text-2xl font-bold text-green-600 dark:text-green-400">{planBreakdown?.activeSubscriptions || 0}</p>
//                         </div>
//                         <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-md">
//                             <p className="text-sm text-gray-500 dark:text-gray-400">Expired Sub</p>
//                             <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{planBreakdown?.expiredSubscriptions || 0}</p>
//                         </div>
//                         <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-md">
//                             <p className="text-sm text-gray-500 dark:text-gray-400">No Plan</p>
//                             <p className="text-2xl font-bold text-red-600 dark:text-red-400">{planBreakdown?.noPlan || 0}</p>
//                         </div>
//                     </div>
//                 </div>
//             )}
//         </Modal>
//     );
// };

// // Sub-component 2: Subscription Status Modal
// const SubscriptionStatusModal = ({ data, isOpen, onClose, formatRevenue }) => {
//     return (
//         <Modal title="Subscription Status Breakdown" isOpen={isOpen} onClose={onClose}>
//             <ul className="space-y-4">
//                 <li className="flex justify-between items-center p-4 rounded-lg bg-gray-100 dark:bg-gray-700 border-l-4 border-gray-500">
//                     <span className="font-medium text-gray-600 dark:text-gray-300">Total Paid Invoices:</span>
//                     <span className="text-2xl font-bold text-gray-700 dark:text-gray-200">{data?.totalSubscriptions || 0}</span>
//                 </li>
//                 <li className="flex justify-between items-center p-4 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 border-l-4 border-indigo-500">
//                     <span className="font-medium text-gray-600 dark:text-gray-300">Active Subscriptions:</span>
//                     <span className="text-2xl font-bold text-indigo-700 dark:text-indigo-400">{data?.activeSubscriptions || 0}</span>
//                 </li>
//                 <li className="flex justify-between items-center p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/30 border-l-4 border-yellow-500">
//                     <span className="font-medium text-gray-600 dark:text-gray-300">Expired Subscriptions:</span>
//                     <span className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">{data?.expiredSubscriptions || 0}</span>
//                 </li>
//                 <li className="flex justify-between items-center p-4 rounded-lg bg-purple-50 dark:bg-purple-900/30 border-l-4 border-purple-500">
//                     <span className="font-medium text-gray-600 dark:text-gray-300">Future Subscriptions (Scheduled):</span>
//                     <span className="text-2xl font-bold text-purple-700 dark:text-purple-400">{data?.futureSubscriptions || 0}</span>
//                 </li>
//             </ul>
//         </Modal>
//     );
// };

// // Sub-component 3: Complaint Status Modal
// const ComplaintStatusModal = ({ data, isOpen, onClose }) => {
//     const breakdown = data?.categoryBreakdown || [];

//     const statusColors = {
//         'Open': 'border-red-500',
//         'In Progress': 'border-yellow-500',
//         'Resolved': 'border-green-500',
//         'Closed': 'border-gray-500',
//     };

//     return (
//         <Modal title="Complaint Status & Category Breakdown" isOpen={isOpen} onClose={onClose}>
//             <div className="grid grid-cols-2 gap-4 mb-6">
//                 {/* Status Pills */}
//                 <div className="col-span-2 grid grid-cols-4 gap-4 text-center">
//                     {['Open', 'In Progress', 'Resolved', 'Closed'].map(status => (
//                         <div key={status} className={`p-3 rounded-lg bg-white dark:bg-gray-700 border-b-4 ${statusColors[status]}`}>
//                             <p className="text-sm text-gray-500 dark:text-gray-400">{status}</p>
//                             <p className="text-xl font-bold text-gray-900 dark:text-white">{data?.[status.toLowerCase().replace(' ', '')] || 0}</p>
//                         </div>
//                     ))}
//                 </div>

//                 {/* Category Table */}
//                 <div className="col-span-2">
//                     <h4 className="text-xl font-semibold mb-3 text-indigo-600 dark:text-indigo-400">Breakdown by Category</h4>
//                     <ul className="space-y-2">
//                         {breakdown.length > 0 ? (
//                             breakdown.map((item, index) => (
//                                 <li key={index} className="flex justify-between items-center p-3 rounded-lg bg-gray-50 dark:bg-gray-700">
//                                     <span className="font-medium text-gray-900 dark:text-white">{item.category}</span>
//                                     <span className="text-lg font-bold text-indigo-700 dark:text-indigo-400">{item.count}</span>
//                                 </li>
//                             ))
//                         ) : (
//                             <p className="text-gray-500">No category breakdown data available.</p>
//                         )}
//                     </ul>
//                 </div>
//             </div>
//         </Modal>
//     );
// };


// // --- MAIN DASHBOARD COMPONENT ---
// const AdminDashboard = () => {
//     const { adminId } = useParams();
//     const navigate = useNavigate();

//     const [data, setData] = useState({});
//     const [latestLogs, setLatestLogs] = useState([]);
//     const [loading, setLoading] = useState(true);
//     const [error, setError] = useState(null);
//     const [isRefreshing, setIsRefreshing] = useState(false);

//     // Modal State
//     const [isUserModalOpen, setIsUserModalOpen] = useState(false);
//     const [isSubModalOpen, setIsSubModalOpen] = useState(false);
//     const [isComplaintModalOpen, setIsComplaintModalOpen] = useState(false);


//     // ... (handleAdminClick and clearAdminFilter remain the same)
//     const handleAdminClick = (id) => {
//         navigate(`/admin/admindashboard/${id}`);
//     };
//     const clearAdminFilter = () => {
//         navigate('/admin/admindashboard');
//     };

//     // Construct base URL and add adminId as a query parameter
//     const buildApiUrl = (endpoint) => {
//         let url = `/adminDashboard/${endpoint}`;
//         if (adminId) {
//             // Use a query string to pass the Admin ID for all endpoints
//             url += `?targetAdminId=${adminId}`;
//         }
//         return url;
//     };

//     const loadLatestLogs = useCallback(async () => {
//         try {
//             const url = buildApiUrl("activitylogs");
//             const separator = url.includes('?') ? '&' : '?';
//             // NOTE: The C# backend was fixed to correctly apply filtering before 'take'
//             const res = await api.get(url + `${separator}take=10`);
//             setLatestLogs(res.data);
//         } catch (err) {
//             console.error("Failed to load latest activity logs", err);
//         }
//     }, [adminId]);

//     const loadAllData = useCallback(async (isInitialLoad = false) => {
//         if (isInitialLoad) setLoading(true);
//         if (!isInitialLoad) setIsRefreshing(true); // Start refreshing status
//         setError(null);

//         try {
//             // Fetch all core summaries concurrently using the dynamic URL
//             const [
//                 userRes, subsRes, revRes, queryRes, topUserRes, complaintRes, adminBreakdownRes
//             ] = await Promise.all([
//                 api.get(buildApiUrl(`users/summary`)),
//                 api.get(buildApiUrl(`subscriptions/summary`)),
//                 api.get(buildApiUrl(`revenue/summary`)),
//                 api.get(buildApiUrl(`queries/summary`)),
//                 api.get(buildApiUrl(`users/top-revenue`)),
//                 api.get(buildApiUrl(`complaints/summary`)),
//                 // FIX: Always fetch admin breakdown to get the adminName for the title lookup
//                 api.get(`/adminDashboard/admin/breakdown`).catch(e => ({ data: null })),
//             ]);

//             setData({
//                 userSummary: userRes.data,
//                 subscriptionSummary: subsRes.data,
//                 revenueSummary: revRes.data,
//                 querySummary: queryRes.data,
//                 topRevenueUsers: topUserRes.data,
//                 complaintSummary: complaintRes.data,
//                 adminBreakdown: adminBreakdownRes.data
//             });
//             await loadLatestLogs();

//         } catch (err) {
//             setError("Failed to fetch core dashboard data. Please check API connectivity.");
//             console.error("Error loading dashboard data:", err);
//         } finally {
//             if (isInitialLoad) setLoading(false);
//             setIsRefreshing(false); // Stop refreshing status
//         }
//     }, [adminId, loadLatestLogs]);

//     useEffect(() => {
//         loadAllData(true);

//         const intervalId = setInterval(() => {
//             loadAllData(false);
//         }, POLLING_INTERVAL_MS);

//         return () => clearInterval(intervalId);
//     }, [loadAllData]);

//     if (loading) {
//         return (
//             <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8 flex items-center justify-center">
//                 <div className="text-center">
//                     <div className="w-16 h-16 border-4 border-t-4 border-indigo-200 border-t-indigo-500 rounded-full animate-spin mx-auto"></div>
//                     <p className="mt-4 text-xl font-semibold text-indigo-500">Loading Dashboard Data...</p>
//                 </div>
//             </div>
//         );
//     }

//     if (error) {
//         return <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8 text-center text-xl font-semibold text-red-500">Error: {error}</div>;
//     }

//     // --- Data Preparation & Formatting ---
//     const { userSummary, revenueSummary, subscriptionSummary, querySummary, complaintSummary, topRevenueUsers, adminBreakdown } = data;

//     const formatRevenue = (value) => `₹${(value || 0)?.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;

//     const totalUsers = userSummary?.totalUsers || 0;
//     const usersOnline = userSummary?.usersOnline || 0;
//     const totalRevenue = revenueSummary?.totalRevenue || 0;
//     const totalQueries = querySummary?.totalQueries || 0;
//     const totalComplaints = complaintSummary?.total || 0;

//     const monthlyRevenueData = revenueSummary?.monthlyRevenue?.slice(-12).map(item => ({
//         ...item,
//         Month: new Date(item.month.split('-').reverse().join('-')).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
//     })) || [];

//     const subscriptionGroupsData = subscriptionSummary?.subscriptionGroups?.map(group => ({
//         name: group.name,
//         value: group.value,
//         color: group.color,
//     })) || [];

//     const topRevenueUsersTable = topRevenueUsers?.map((user, index) => ({
//         id: index + 1,
//         company: user.companyName || 'N/A',
//         revenue: formatRevenue(user.totalRevenue),
//         plans: (user.plans ?? []).join(', '),
//     })) || [];

//     // New: Top Query Users Table
//     const topQueryUsersTable = querySummary?.topUsers?.map((user, index) => ({
//         id: index + 1,
//         company: user.companyName || 'N/A',
//         queries: user.queryCount,
//     })) || [];


//     const selectedAdmin = adminId && adminBreakdown
//         ? adminBreakdown.find(a => a.adminId === adminId)
//         : null;

//     const dashboardTitle = adminId
//         ? `Viewing Dashboard for: ${selectedAdmin?.adminName || adminId}`
//         : '🚀 Admin Dashboard';

//     // --- JSX Rendering ---
//     return (
//         <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6 lg:p-8">

//             {/* --- Modals --- */}
//             <UserStatusModal
//                 adminId={adminId}
//                 isOpen={isUserModalOpen}
//                 onClose={() => setIsUserModalOpen(false)}
//                 api={api}
//                 formatRevenue={formatRevenue}
//             />
//             <SubscriptionStatusModal
//                 data={subscriptionSummary}
//                 isOpen={isSubModalOpen}
//                 onClose={() => setIsSubModalOpen(false)}
//                 formatRevenue={formatRevenue}
//             />
//             <ComplaintStatusModal
//                 data={complaintSummary}
//                 isOpen={isComplaintModalOpen}
//                 onClose={() => setIsComplaintModalOpen(false)}
//             />

//             {/* Conditional Title and Back Button */}
//             <div className="flex justify-between items-center mb-8 border-b border-indigo-200 dark:border-indigo-800 pb-2">
//                 <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white">
//                     {dashboardTitle}
//                 </h1>
//                 
//                 <div className="flex items-center space-x-4">
//                     {/* REFRESH BUTTON (Always visible, manually trigger loadAllData) */}
//                     <button
//                         onClick={() => loadAllData(false)}
//                         disabled={isRefreshing}
//                         className="text-sm font-semibold px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition duration-150 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
//                     >
//                         {isRefreshing ? (
//                             <FaSpinner className="animate-spin mr-2" size={14} />
//                         ) : (
//                             <FaRedo className="mr-2" size={14} />
//                         )}
//                         {isRefreshing ? 'Refreshing...' : 'Refresh Metrics'}
//                     </button>

//                     {/* BACK TO ALL ADMINS BUTTON (Only visible when filtered) */}
//                     {adminId && (
//                         <button
//                             onClick={clearAdminFilter}
//                             className="text-lg font-semibold px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition duration-150"
//                         >
//                             &larr; Back to All Admins
//                         </button>
//                     )}
//                 </div>
//             </div>

//             {/* --- 1. Top Summary Cards (Grid) with Click Handlers --- */}
//             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
//                 <DashboardCard
//                     title="Total Users"
//                     value={totalUsers.toLocaleString()}
//                     description={`Click for Status wise Breakdown`}
//                     icon={FaUsers}
//                     colorClass="bg-indigo-600"
//                     onClick={() => setIsUserModalOpen(true)} // <-- Added click handler
//                 />
//                 <DashboardCard
//                     title="Online Users"
//                     value={usersOnline.toLocaleString()}
//                     description={`Active in the last 5 minutes`}
//                     icon={FaSignal}
//                     colorClass="bg-indigo-600"
//                 />
//                 <DashboardCard
//                     title="Total Revenue"
//                     value={formatRevenue(totalRevenue)}
//                     description={`From ${subscriptionSummary?.totalSubscriptions || 0} subscriptions`}
//                     icon={FaMoneyBillWave}
//                     colorClass="bg-green-600"
//                 />
//                 <DashboardCard
//                     title="Total Queries"
//                     value={totalQueries.toLocaleString()}
//                     description={`${querySummary?.approvalModules || 0} Approval Module${(querySummary?.approvalModules || 0) === 1 ? '' : 's'}`}
//                     icon={FaQuestionCircle}
//                     colorClass="bg-yellow-600"
//                 />
//                 <DashboardCard
//                     title="Total Complaints"
//                     value={totalComplaints.toLocaleString()}
//                     description={`Click for Breakdown by Status & Category`}
//                     icon={FaEnvelopeOpenText}
//                     colorClass="bg-red-600"
//                     onClick={() => setIsComplaintModalOpen(true)} // <-- Added click handler
//                 />
//             </div>

//             {/* --- 2. Admin Breakdown (SuperAdmin Only) --- */}
//             {!adminId && adminBreakdown && (
//                 <>
//                     <AdminBreakdownTable breakdownData={adminBreakdown} onAdminClick={handleAdminClick} />
//                     <hr className="my-8 border-t border-gray-200 dark:border-gray-700" />
//                 </>
//             )}

//             {/* --- 3. Charts and Logs Section --- */}
//             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
//                 {/* Monthly Revenue Bar Chart (2/3 width) */}
//                 <div className="lg:col-span-2 bg-white dark:bg-gray-800 shadow-xl rounded-2xl p-6">
//                     <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Last 12 Months Revenue Trend</h2>
//                     {monthlyRevenueData.length > 0 ? (
//                         <ResponsiveContainer width="100%" height={300}>
//                             <BarChart data={monthlyRevenueData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
//                                 <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" className="dark:stroke-gray-600" />
//                                 <XAxis dataKey="Month" stroke="#6b7280" />
//                                 <YAxis tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`} stroke="#6b7280" />
//                                 <Tooltip
//                                     formatter={(value) => [formatRevenue(value), 'revenue']}
//                                     contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
//                                     labelStyle={{ color: '#ffffff' }}
//                                 />
//                                 <Legend />
//                                 <Bar dataKey="revenue" fill="#6366f1" radius={[4, 4, 0, 0]} />
//                             </BarChart>
//                         </ResponsiveContainer>
//                     ) : (
//                         <p className="text-center text-gray-500 py-12">No revenue data available to display the trend.</p>
//                     )}
//                 </div>

//                 {/* Latest Activity Logs (1/3 width) */}
//                 <ActivityLogCard logs={latestLogs} />
//             </div>

//             <hr className="my-8 border-t border-gray-200 dark:border-gray-700" />

//             {/* --- 4. Tables Section (Revenue Users & Query Users) --- */}
//             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

//                 {/* Top Revenue Users Table (Left - 1/3) */}
//                 <div className="bg-white dark:bg-gray-800 shadow-xl rounded-2xl p-6 overflow-x-auto">
//                     <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Top 10 Revenue Users</h2>
//                     <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
//                         <thead className="bg-gray-50 dark:bg-gray-700">
//                             <tr>
//                                 <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">#</th>
//                                 <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Company</th>
//                                 <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Revenue</th>
//                             </tr>
//                         </thead>
//                         <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
//                             {topRevenueUsersTable.length > 0 ? (
//                                 topRevenueUsersTable.map((user) => (
//                                     <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition duration-150">
//                                         <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{user.id}</td>
//                                         <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{user.company}</td>
//                                         <td className="px-4 py-4 whitespace-nowrap text-sm font-semibold text-green-600 dark:text-green-400">{user.revenue}</td>
//                                     </tr>
//                                 ))
//                             ) : (
//                                 <tr>
//                                     <td colSpan="3" className="px-4 py-4 text-center text-gray-500">No top revenue users found.</td>
//                                 </tr>
//                             )}
//                         </tbody>
//                     </table>
//                 </div>

//                 {/* Top Query Users Table (Middle - 1/3) */}
//                 <div className="bg-white dark:bg-gray-800 shadow-xl rounded-2xl p-6 overflow-x-auto">
//                     <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Top 5 Query Users</h2>
//                     <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
//                         <thead className="bg-gray-50 dark:bg-gray-700">
//                             <tr>
//                                 <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">#</th>
//                                 <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Company</th>
//                                 <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Queries</th>
//                             </tr>
//                         </thead>
//                         <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
//                             {topQueryUsersTable.length > 0 ? (
//                                 topQueryUsersTable.map((user) => (
//                                     <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition duration-150">
//                                         <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{user.id}</td>
//                                         <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{user.company}</td>
//                                         <td className="px-4 py-4 whitespace-nowrap text-sm font-semibold text-yellow-600 dark:text-yellow-400">{user.queries}</td>
//                                     </tr>
//                                 ))
//                             ) : (
//                                 <tr>
//                                     <td colSpan="3" className="px-4 py-4 text-center text-gray-500">No top query users found.</td>
//                                 </tr>
//                             )}
//                         </tbody>
//                     </table>
//                 </div>

//                 {/* Subscription Breakdown (Right - 1/3) */}
//                 <div className="bg-white dark:bg-gray-800 shadow-xl rounded-2xl p-6 flex flex-col items-center">
//                     <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4 text-center">Plan Breakdown</h2>
//                     <div className="w-full h-[300px]">
//                         {subscriptionGroupsData.length > 0 ? (
//                             <ResponsiveContainer width="100%" height="100%">
//                                 <PieChart>
//                                     <Pie
//                                         data={subscriptionGroupsData}
//                                         dataKey="value"
//                                         nameKey="name"
//                                         cx="50%"
//                                         cy="50%"
//                                         outerRadius={80}
//                                         fill="#8884d8"
//                                         labelLine={false}
//                                         label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
//                                     >
//                                         {subscriptionGroupsData.map((entry, index) => (
//                                             <Cell key={`cell-${index}`} fill={entry.color} />
//                                         ))}
//                                     </Pie>
//                                     <Tooltip
//                                         formatter={(value, name, props) => [`${value} Sales`, props.payload.name]}
//                                         contentStyle={{ backgroundColor: '#ffffff', border: 'none', borderRadius: '8px' }}
//                                         labelStyle={{ color: '#ffffff' }}
//                                     />
//                                 </PieChart>
//                             </ResponsiveContainer>
//                         ) : (
//                             <div className="flex items-center justify-center h-full">
//                                 <p className="text-gray-500">No subscription plan data available.</p>
//                             </div>
//                         )}
//                     </div>
//                     <button
//                         onClick={() => setIsSubModalOpen(true)}
//                         className="mt-4 text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 p-2 border border-indigo-200 dark:border-indigo-700 rounded-md"
//                     >
//                         View Full Subscription Status &rarr;
//                     </button>
//                 </div>
//             </div>
//         </div>
//     );
// };

// export default AdminDashboard;

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api";
import { motion, AnimatePresence } from "framer-motion";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  FaUsers,
  FaSignal,
  FaMoneyBillWave,
  FaQuestionCircle,
  FaEnvelopeOpenText,
  FaRedo,
  FaSpinner,
  FaBriefcase,
  FaHistory,
  FaCog,
} from "react-icons/fa";

// ---------------------------------------------
// Theme tokens used across the file
// ---------------------------------------------
const ACCENT_INDIGO = "#6366f1";
const ACCENT_TEAL = "#14b8a6";
const GLASS_BG = "rgba(255,255,255,0.04)"; // subtle glass
const CARD_BORDER = "rgba(255,255,255,0.06)";
const SHADOW = "0 10px 30px rgba(2,6,23,0.6)";

// Polling interval (60s)
const POLL_MS = 60000;

// Small reusable card component with glass style
function GlassCard({ children, onClick, className = "", title, subtitle }) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 300, damping: 22 }}
      onClick={onClick}
      className={`p-5 rounded-2xl border ${className}`}
      style={{
        background: GLASS_BG,
        borderColor: CARD_BORDER,
        boxShadow: SHADOW,
        cursor: onClick ? "pointer" : "default",
      }}
    >
      {title && (
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-sm text-gray-300 uppercase tracking-wider font-semibold">{title}</h3>
            {subtitle && <p className="mt-1 text-xs text-gray-400">{subtitle}</p>}
          </div>
        </div>
      )}
      {children}
    </motion.div>
  );
}

// Modal base (glass)
function Modal({ isOpen, title, onClose, children }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <div
            className="absolute inset-0 bg-black/65"
            onClick={onClose}
            aria-hidden
          />

          <motion.div
            initial={{ scale: 0.98, y: 10 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.98, y: 10 }}
            transition={{ duration: 0.18 }}
            className="relative w-full max-w-4xl rounded-2xl p-6"
            style={{ background: GLASS_BG, border: `1px solid ${CARD_BORDER}`, boxShadow: SHADOW }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">{title}</h3>
              <button
                onClick={onClose}
                className="text-gray-300 hover:text-white transition"
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            <div>{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Tooltip customization for charts (dark tooltip)
function DarkTooltip({ active, payload, label }) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="p-2 text-xs rounded" style={{ background: "rgba(17,24,39,0.95)", color: "#fff" }}>
      <div className="font-semibold">{label}</div>
      {payload.map((p, i) => (
        <div key={i} className="truncate">
          {p.name}: {typeof p.value === 'number' ? `₹ ${p.value.toLocaleString()}` : p.value}
        </div>
      ))}
    </div>
  );
}

// Main AdminDashboard
export default function AdminDashboard() {
  const { adminId } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState({});
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // modal states
  const [openUserModal, setOpenUserModal] = useState(false);
  const [openSubModal, setOpenSubModal] = useState(false);
  const [openComplaintModal, setOpenComplaintModal] = useState(false);

  const buildApi = useCallback((endpoint) => {
    let url = `/adminDashboard/${endpoint}`;
    if (adminId) url += `?targetAdminId=${adminId}`;
    return url;
  }, [adminId]);

  const loadLogs = useCallback(async () => {
    try {
      const url = buildApi("activitylogs") + "&take=10".replace('?&','?');
      const res = await api.get(url);
      setLogs(res.data || []);
    } catch (e) {
      console.error("loadLogs", e);
    }
  }, [buildApi]);

  const loadAll = useCallback(async (initial = false) => {
    if (initial) setLoading(true);
    else setRefreshing(true);
    setError(null);

    try {
      const [userRes, subRes, revRes, queryRes, topRes, compRes, adminBreakdownRes] = await Promise.all([
        api.get(buildApi('users/summary')),
        api.get(buildApi('subscriptions/summary')),
        api.get(buildApi('revenue/summary')),
        api.get(buildApi('queries/summary')),
        api.get(buildApi('users/top-revenue')),
        api.get(buildApi('complaints/summary')),
        api.get('/adminDashboard/admin/breakdown').catch(() => ({ data: null })),
      ]);

      setData({
        userSummary: userRes.data,
        subscriptionSummary: subRes.data,
        revenueSummary: revRes.data,
        querySummary: queryRes.data,
        topRevenueUsers: topRes.data,
        complaintSummary: compRes.data,
        adminBreakdown: adminBreakdownRes.data,
      });

      await loadLogs();
    } catch (err) {
      console.error("loadAll", err);
      setError("Failed to fetch dashboard data.");
    } finally {
      if (initial) setLoading(false);
      setRefreshing(false);
    }
  }, [buildApi, loadLogs]);

  useEffect(() => {
    loadAll(true);
    const id = setInterval(() => loadAll(false), POLL_MS);
    return () => clearInterval(id);
  }, [loadAll]);

  // derived values
  const totalUsers = data.userSummary?.totalUsers || 0;
  const usersOnline = data.userSummary?.usersOnline || 0;
  const totalRevenue = data.revenueSummary?.totalRevenue || 0;
  const totalQueries = data.querySummary?.totalQueries || 0;
  const totalComplaints = data.complaintSummary?.total || 0;

  const monthlyRevenueData = useMemo(() => {
    if (!data.revenueSummary?.monthlyRevenue) return [];
    return data.revenueSummary.monthlyRevenue.slice(-12).map((m) => ({
      ...m,
      Month: new Date(m.month + "-01").toLocaleString('en-US', { month: 'short', year: '2-digit' }),
    }));
  }, [data.revenueSummary]);

  const subscriptionGroups = data.subscriptionSummary?.subscriptionGroups || [];

  const handleAdminClick = (id) => navigate(`/admin/admindashboard/${id}`);
  const clearAdminFilter = () => navigate('/admin/admindashboard');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0b0d10] p-6">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full border-4 border-t-4 border-indigo-700 animate-spin mx-auto" />
          <p className="mt-4 text-indigo-300">Loading dashboard…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0b0d10] p-6">
        <div className="max-w-2xl text-center bg-[rgba(255,255,255,0.03)] p-6 rounded-2xl border" style={{ borderColor: CARD_BORDER }}>
          <h2 className="text-xl font-bold text-white mb-2">Failed to load dashboard</h2>
          <p className="text-gray-300 mb-4">{error}</p>
          <button onClick={() => loadAll(true)} className="px-4 py-2 rounded bg-indigo-600 text-white">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 bg-[#0b0d10] text-white">

      {/* floating background blobs */}
      <div className="absolute inset-0 -z-10 pointer-events-none">
        <div className="absolute -left-40 -top-40 w-[40rem] h-[40rem] rounded-full" style={{ background: 'radial-gradient(circle at 30% 30%, rgba(99,102,241,0.18), transparent 30%)', filter: 'blur(120px)', animation: 'float 10s ease-in-out infinite' }} />
        <div className="absolute -right-40 -bottom-40 w-[50rem] h-[50rem] rounded-full" style={{ background: 'radial-gradient(circle at 70% 70%, rgba(20,184,166,0.12), transparent 30%)', filter: 'blur(140px)', animation: 'float 12s ease-in-out infinite' }} />
      </div>

      <style>{`@keyframes float { 0% { transform: translateY(0) } 50% { transform: translateY(-18px) } 100% { transform: translateY(0) } }`}</style>

      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold">{adminId ? `Dashboard — ${adminId}` : 'Admin Dashboard'}</h1>
            <p className="text-sm text-gray-300 mt-1">Overview of users, revenue, queries and complaints — quick, tidy and live.</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => loadAll(false)}
              disabled={refreshing}
              className="px-4 py-2 rounded-lg bg-[rgba(255,255,255,0.04)] border" style={{ borderColor: CARD_BORDER }}
            >
              {refreshing ? <FaSpinner className="animate-spin mr-2 inline-block" /> : <FaRedo className="mr-2 inline-block" />} {refreshing ? 'Refreshing' : 'Refresh'}
            </button>

            {adminId && (
              <button onClick={clearAdminFilter} className="px-4 py-2 rounded-lg bg-indigo-600 text-white">Back to all admins</button>
            )}
          </div>
        </div>

        {/* Top summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <GlassCard title="Total Users" subtitle="Click to view status" onClick={() => setOpenUserModal(true)}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-extrabold">{totalUsers.toLocaleString()}</div>
                <div className="text-xs text-gray-400 mt-1">All registered accounts</div>
              </div>
              <div className="p-3 rounded-full" style={{ background: ACCENT_INDIGO }}>
                <FaUsers />
              </div>
            </div>
          </GlassCard>

          <GlassCard title="Online Users" subtitle="Last 5 minutes">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-extrabold">{usersOnline.toLocaleString()}</div>
                <div className="text-xs text-gray-400 mt-1">Active right now</div>
              </div>
              <div className="p-3 rounded-full" style={{ background: ACCENT_TEAL }}>
                <FaSignal />
              </div>
            </div>
          </GlassCard>

          <GlassCard title="Total Revenue" subtitle={`From ${data.subscriptionSummary?.totalSubscriptions || 0} invoices` }>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-extrabold">₹ {Number(totalRevenue || 0).toLocaleString()}</div>
                <div className="text-xs text-gray-400 mt-1">All-time</div>
              </div>
              <div className="p-3 rounded-full" style={{ background: '#10b981' }}>
                <FaMoneyBillWave />
              </div>
            </div>
          </GlassCard>

          <GlassCard title="Total Queries" subtitle="Approval modules count">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-extrabold">{totalQueries.toLocaleString()}</div>
                <div className="text-xs text-gray-400 mt-1">Data queries run</div>
              </div>
              <div className="p-3 rounded-full" style={{ background: '#f59e0b' }}>
                <FaQuestionCircle />
              </div>
            </div>
          </GlassCard>

          <GlassCard title="Total Complaints" subtitle="Click for breakdown" onClick={() => setOpenComplaintModal(true)}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-extrabold">{totalComplaints.toLocaleString()}</div>
                <div className="text-xs text-gray-400 mt-1">Open / closed tickets</div>
              </div>
              <div className="p-3 rounded-full" style={{ background: '#ef4444' }}>
                <FaEnvelopeOpenText />
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Charts + activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2">
            <GlassCard title="Last 12 months" subtitle="Revenue trend">
              {monthlyRevenueData.length > 0 ? (
                <div style={{ height: 320 }}>
                  <ResponsiveContainer>
                    <BarChart data={monthlyRevenueData}>
                      <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
                      <XAxis dataKey="Month" stroke="#9CA3AF" />
                      <YAxis stroke="#9CA3AF" tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                      <Tooltip content={<DarkTooltip />} />
                      <Bar dataKey="revenue" fill={ACCENT_INDIGO} radius={[6,6,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-center text-gray-400 py-12">No revenue data available</p>
              )}
            </GlassCard>
          </div>

          <GlassCard title="Recent Activity" subtitle="Latest events" className="h-full">
            {logs.length === 0 ? (
              <p className="text-gray-400 text-sm">No recent activity</p>
            ) : (
              <ul className="space-y-3 max-h-72 overflow-y-auto pr-2">
                {logs.map((l, i) => (
                  <li key={i} className="text-sm text-gray-300 flex justify-between">
                    <div className="truncate pr-4">{l.description}</div>
                    <div className="text-xs text-gray-500">{new Date(l.timestamp).toLocaleTimeString()}</div>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-4 text-right">
              <button onClick={() => navigate('/admin/activity-logs')} className="text-sm text-indigo-300 hover:text-indigo-100">View all &rarr;</button>
            </div>
          </GlassCard>
        </div>

        {/* Tables: top users + subscriptions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <GlassCard title="Top Revenue Users">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-gray-400">
                  <tr>
                    <th className="text-left py-2">#</th>
                    <th className="text-left py-2">Company</th>
                    <th className="text-right py-2">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.topRevenueUsers || []).slice(0,10).map((u, idx) => (
                    <tr key={idx} className="border-t border-[rgba(255,255,255,0.03)]">
                      <td className="py-2 text-gray-200">{idx+1}</td>
                      <td className="py-2 text-gray-200">{u.companyName || '—'}</td>
                      <td className="py-2 text-right text-green-300">₹ {Number(u.totalRevenue || 0).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>

          <GlassCard title="Top Query Users">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-gray-400">
                  <tr>
                    <th className="text-left py-2">#</th>
                    <th className="text-left py-2">Company</th>
                    <th className="text-right py-2">Queries</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.querySummary?.topUsers || []).slice(0,5).map((u,idx) => (
                    <tr key={idx} className="border-t border-[rgba(255,255,255,0.03)]">
                      <td className="py-2 text-gray-200">{idx+1}</td>
                      <td className="py-2 text-gray-200">{u.companyName || '—'}</td>
                      <td className="py-2 text-right text-yellow-300">{u.queryCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>

          <GlassCard title="Plan Breakdown">
            <div style={{ height: 260 }} className="w-full">
              {subscriptionGroups.length > 0 ? (
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={subscriptionGroups} dataKey="value" nameKey="name" outerRadius={80} labelLine={false} label={({ percent }) => `${(percent * 100).toFixed(0)}%`}>
                      {subscriptionGroups.map((g, i) => (
                        <Cell key={i} fill={g.color || (i % 2 ? ACCENT_TEAL : ACCENT_INDIGO)} />
                      ))}
                    </Pie>
                    <Tooltip content={<DarkTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-gray-400 text-center py-10">No subscription data</p>
              )}
            </div>

            <div className="mt-4 text-center">
              <button onClick={() => setOpenSubModal(true)} className="text-sm text-indigo-300 hover:text-indigo-100">View full breakdown &rarr;</button>
            </div>
          </GlassCard>
        </div>

        {/* Admin breakdown table (only when not scoped) */}
        {!adminId && data.adminBreakdown && (
          <div className="mt-10">
            <GlassCard title="Admin Performance" subtitle="Click a row to filter by admin">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs text-gray-400">
                    <tr>
                      <th className="text-left py-2">Admin</th>
                      <th className="text-right py-2">Users</th>
                      <th className="text-right py-2">Revenue</th>
                      <th className="text-right py-2">Queries</th>
                      <th className="text-right py-2">Complaints</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.adminBreakdown.map((a) => (
                      <tr key={a.adminId} onClick={() => handleAdminClick(a.adminId)} className="cursor-pointer hover:bg-[rgba(255,255,255,0.02)]">
                        <td className="py-3 text-indigo-300 font-semibold">{a.adminName}</td>
                        <td className="py-3 text-right text-gray-200">{a.totalUsers}</td>
                        <td className="py-3 text-right text-green-300">₹ {Number(a.totalRevenue || 0).toLocaleString()}</td>
                        <td className="py-3 text-right text-gray-200">{a.totalQueries}</td>
                        <td className="py-3 text-right text-gray-200">{a.totalComplaints}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          </div>
        )}

      </div>

      {/* Modals */}
      <Modal isOpen={openUserModal} title="User Status Breakdown" onClose={() => setOpenUserModal(false)}>
        <UserStatusContent api={api} adminId={adminId} />
      </Modal>

      <Modal isOpen={openSubModal} title="Subscription Breakdown" onClose={() => setOpenSubModal(false)}>
        <SubscriptionContent data={data.subscriptionSummary} />
      </Modal>

      <Modal isOpen={openComplaintModal} title="Complaints Overview" onClose={() => setOpenComplaintModal(false)}>
        <ComplaintContent data={data.complaintSummary} />
      </Modal>

    </div>
  );
}

// ------------------- Sub modal contents -------------------
function UserStatusContent({ api, adminId }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [planBreakdown, setPlanBreakdown] = useState(null);

  const buildApi = (endpoint) => {
    let url = `/adminDashboard/${endpoint}`;
    if (adminId) url += `?targetAdminId=${adminId}`;
    return url;
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await api.get(buildApi('users/summary'));
        setStatus(res.data.statusBreakdown || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [adminId]);

  const fetchPlans = async (s) => {
    setPlanBreakdown(null);
    try {
      const res = await api.get(buildApi(`user-breakdown-by-status/${s}`));
      setPlanBreakdown(res.data || {});
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) return <p className="text-center text-gray-300">Loading…</p>;

  return (
    <div>
      <div className="grid grid-cols-3 gap-3 mb-4">
        {(status || []).map((s) => (
          <button key={s.status} onClick={() => fetchPlans(s.status)} className="p-3 rounded bg-[rgba(255,255,255,0.03)]">{s.status}: {s.count}</button>
        ))}
      </div>

      {planBreakdown ? (
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-[rgba(255,255,255,0.02)] rounded">Trial: <strong>{planBreakdown.trialUsers || 0}</strong></div>
          <div className="p-3 bg-[rgba(255,255,255,0.02)] rounded">Active Sub: <strong>{planBreakdown.activeSubscriptions || 0}</strong></div>
          <div className="p-3 bg-[rgba(255,255,255,0.02)] rounded">Expired: <strong>{planBreakdown.expiredSubscriptions || 0}</strong></div>
          <div className="p-3 bg-[rgba(255,255,255,0.02)] rounded">No Plan: <strong>{planBreakdown.noPlan || 0}</strong></div>
        </div>
      ) : (
        <p className="text-gray-400">Select a status to view plans.</p>
      )}
    </div>
  );
}

function SubscriptionContent({ data }) {
  if (!data) return <p className="text-gray-400">No subscription summary available.</p>;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div className="p-3 rounded bg-[rgba(255,255,255,0.03)]">Total Paid: <strong>{data.totalSubscriptions || 0}</strong></div>
      <div className="p-3 rounded bg-[rgba(255,255,255,0.03)]">Active: <strong>{data.activeSubscriptions || 0}</strong></div>
      <div className="p-3 rounded bg-[rgba(255,255,255,0.03)]">Expired: <strong>{data.expiredSubscriptions || 0}</strong></div>
      <div className="p-3 rounded bg-[rgba(255,255,255,0.03)]">Scheduled: <strong>{data.futureSubscriptions || 0}</strong></div>
    </div>
  );
}

function ComplaintContent({ data }) {
  if (!data) return <p className="text-gray-400">No complaints summary available.</p>;
  return (
    <div>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="p-3 rounded bg-[rgba(255,255,255,0.03)]">Open: <strong>{data.open || 0}</strong></div>
        <div className="p-3 rounded bg-[rgba(255,255,255,0.03)]">In Progress: <strong>{data.inProgress || 0}</strong></div>
        <div className="p-3 rounded bg-[rgba(255,255,255,0.03)]">Resolved: <strong>{data.resolved || 0}</strong></div>
        <div className="p-3 rounded bg-[rgba(255,255,255,0.03)]">Closed: <strong>{data.closed || 0}</strong></div>
      </div>

      <div>
        <h4 className="text-sm text-gray-300 mb-2">By Category</h4>
        <ul className="space-y-2">
          {(data.categoryBreakdown || []).map((c, i) => (
            <li key={i} className="p-3 rounded bg-[rgba(255,255,255,0.02)] flex justify-between">
              <span className="text-gray-200">{c.category}</span>
              <strong className="text-indigo-300">{c.count}</strong>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
