import React, { useEffect, useState, useCallback } from "react";
import api from "../api"; // Assuming this exists and works
import {
    PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
    LineChart, Line, XAxis, YAxis, CartesianGrid, Legend, BarChart, Bar
} from "recharts";
import {
    FaUser, FaUsers, FaChartLine, FaMoneyBillWave, FaQuestionCircle,
    FaFileInvoiceDollar, FaTrophy, FaEnvelopeOpenText, FaTimes, FaLayerGroup, FaTags,
    FaSignal, FaArrowUp, FaCog, FaRedo, FaHistory, FaExternalLinkAlt
} from "react-icons/fa";
import { Link } from "react-router-dom";

// --- Configuration for consistent visuals ---
const PRIMARY_COLOR = '#4f46e5'; // Indigo 600
const SECONDARY_COLOR = '#22c55e'; // Green 500
const ACCENT_COLOR = '#f97316'; // Orange 500
const ALERT_COLOR = '#ef4444'; // Red 500
const CHART_COLORS = [PRIMARY_COLOR, SECONDARY_COLOR, ACCENT_COLOR, ALERT_COLOR, '#06b6d4', '#eab308'];

// Enhanced Card Icon Configuration
const CARD_CONFIG = {
    'Total Users': { icon: FaUsers, color: 'indigo', iconClass: 'text-indigo-600 bg-indigo-100' },
    'Online Users': { icon: FaSignal, color: 'purple', iconClass: 'text-purple-600 bg-purple-100' },
    'Total Subscriptions': { icon: FaFileInvoiceDollar, color: 'green', iconClass: 'text-green-600 bg-green-100' },
    'Total Revenue': { icon: FaMoneyBillWave, color: 'blue', iconClass: 'text-blue-600 bg-blue-100' },
    'Total Queries': { icon: FaQuestionCircle, color: 'yellow', iconClass: 'text-yellow-600 bg-yellow-100' },
    'Total Complaints': { icon: FaEnvelopeOpenText, color: 'red', iconClass: 'text-red-600 bg-red-100' },
};

// --- Custom Component for Log Preview ---
const LogPreviewCard = React.memo(({ logs }) => {
    const getLogStyle = (action) => {
        const actionWord = action.toUpperCase().split(' ')[0];
        if (actionWord.includes('FAIL') || actionWord.includes('BLOCK') || actionWord.includes('DELETE')) return { icon: FaTimes, color: 'text-red-500' };
        if (actionWord.includes('LOGIN') || actionWord.includes('REGISTER') || actionWord.includes('ACTIVATE')) return { icon: FaUser, color: 'text-green-500' };
        if (actionWord.includes('UPDATE') || actionWord.includes('SAVE') || actionWord.includes('EDIT')) return { icon: FaCog, color: 'text-yellow-500' };
        if (actionWord.includes('ORDER') || actionWord.includes('PURCHASE') || actionWord.includes('INITIATED') || actionWord.includes('ACTIVATED')) return { icon: FaMoneyBillWave, color: 'text-blue-500' };
        return { icon: FaHistory, color: 'text-gray-500' };
    };

    return (
        <div className="bg-white rounded-3xl shadow-xl p-6 border border-gray-100 h-full flex flex-col">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center justify-between">
                <div className="flex items-center">
                    <FaHistory className="text-indigo-500 mr-2 w-5 h-5" /> Latest Activity Log
                </div>
                <Link
                    to="/admin/activitylogs"
                    className="text-sm font-medium text-indigo-500 hover:text-indigo-700 flex items-center transition"
                    title="Go to full log history"
                >
                    View All <FaExternalLinkAlt className="ml-1 w-3 h-3" />
                </Link>
            </h2>
            <ul className="space-y-3 overflow-y-auto flex-grow custom-scrollbar pr-2"> {/* Added custom-scrollbar for better UX */}
                {logs.length === 0 ? (
                    <p className="text-gray-500 mt-4 p-3 bg-gray-50 rounded-xl">No activity recorded recently.</p>
                ) : (
                    logs.slice(0, 10).map((log) => { // Increased slice to 10 to fill more space
                        const style = getLogStyle(log.action);
                        const formattedDescription = log.description?.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>') || log.description;

                        return (
                            <li key={log.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-xl transition hover:bg-indigo-50 border border-gray-100">
                                <style.icon className={`mt-1 flex-shrink-0 w-4 h-4 ${style.color}`} />
                                <div className="text-sm min-w-0">
                                    <div
                                        className="font-semibold text-gray-800 leading-snug line-clamp-2"
                                        dangerouslySetInnerHTML={{ __html: formattedDescription }}
                                    />
                                    <p className="text-xs text-gray-500 mt-0.5 truncate">
                                        {new Date(log.timestamp).toLocaleTimeString()} by {log.actorRole}
                                    </p>
                                </div>
                            </li>
                        );
                    })
                )}
            </ul>
        </div>
    );
});

// 1. StatValue Component
const StatValue = ({ value, prefix = '', suffix = '' }) => {
    const formattedValue = typeof value === 'number' ? value.toLocaleString('en-IN') : value;
    return (
        <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 truncate flex items-center">
            {prefix}{formattedValue}{suffix}
        </h2>
    );
};

// 2. Refactored SummaryCard Component
const SummaryCard = React.memo(({ title, value, icon: Icon, iconClass, onClick }) => (
    <div
        onClick={onClick}
        className={`
            bg-white rounded-2xl p-5 shadow-lg border-b-4 border-transparent 
            hover:border-indigo-500 cursor-pointer h-full transition duration-300 
            transform hover:scale-[1.02] hover:shadow-xl active:scale-[0.98]
        `}
    >
        <div className={`p-3 rounded-xl inline-flex mb-3 shadow-md ${iconClass}`}>
            <Icon className="w-6 h-6" />
        </div>

        <p className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-1">{title}</p>

        <StatValue
            value={value}
            prefix={title === 'Total Revenue' ? '₹' : ''}
        />

        {onClick && (
            <p className={`text-xs mt-3 font-semibold flex items-center text-indigo-500 hover:text-indigo-700`}>
                Deep Dive Metrics
                <FaArrowUp className="ml-1 w-3 h-3 transform rotate-45" />
            </p>
        )}
    </div>
));

// 3. MODAL Component
const Modal = ({ isOpen, title, onClose, children }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-[30px] shadow-[0_20px_50px_rgba(79,70,229,0.2)] w-full max-w-4xl relative transform transition-all duration-300 scale-100 opacity-100 border-t-8 border-indigo-600 my-8">
                <div className="p-8">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-gray-400 hover:text-gray-900 transition p-2 rounded-full hover:bg-gray-100"
                        aria-label="Close"
                    >
                        <FaTimes className="w-6 h-6" />
                    </button>
                    <h3 className="text-3xl font-extrabold mb-5 text-gray-900 flex items-center">
                        <FaChartLine className="text-indigo-500 mr-3 w-6 h-6" /> {title}
                    </h3>
                    {children}
                </div>
            </div>
        </div>
    );
};

// --- Helper Render Functions for Modal Content (Keep them simple and separated) ---

const ModalUserContent = ({ userSummary, selectedStatus, statusBreakdown, openDetailModal, closeModal }) => (
    <div className="space-y-6">
        <div className="p-5 bg-indigo-50 rounded-xl shadow-inner border border-indigo-200">
            <p className="text-lg font-medium text-gray-800">Total Registered Users:</p>
            <p className="text-3xl font-extrabold text-indigo-600">{userSummary.totalUsers.toLocaleString('en-IN')}</p>
            <p className="text-sm text-gray-600 mt-1">Currently <span className="font-bold text-purple-600">{userSummary.usersOnline}</span> Online</p>
        </div>

        <h4 className="font-bold text-xl text-gray-800 border-b pb-2 flex items-center"><FaUsers className="mr-2 w-5 h-5 text-indigo-500" /> Account Status Distribution:</h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {userSummary.statusBreakdown.map((item, i) => (
                <button
                    key={i}
                    onClick={() => openDetailModal("userBreakdown", item.status)}
                    className="p-4 text-center bg-white rounded-xl hover:bg-indigo-50 transition shadow-lg border border-gray-100 transform hover:-translate-y-1"
                >
                    <span className="text-sm text-gray-600 block font-medium">{item.status}</span>
                    <span className="text-3xl font-extrabold text-indigo-700 mt-1 block">{item.count.toLocaleString('en-IN')}</span>
                </button>
            ))}
        </div>

        {selectedStatus && statusBreakdown && (
            <div className="mt-6 p-5 bg-indigo-50 border-l-4 border-indigo-500 rounded-xl shadow-xl">
                <h5 className="text-xl font-bold text-indigo-700 mb-3">Key Metrics for: {selectedStatus} Users</h5>
                <ul className="text-base text-gray-700 space-y-3">
                    <li className="flex justify-between p-3 rounded-lg bg-white shadow-sm border-l-4 border-indigo-500"><span>Trial Users Count:</span> <span className="font-bold">{statusBreakdown.trialUsers}</span></li>
                    <li className="flex justify-between p-3 rounded-lg bg-white shadow-sm border-l-4 border-green-500"><span>Active Subscriptions:</span> <span className="font-bold text-green-600">{statusBreakdown.activeSubscriptions}</span></li>
                    <li className="flex justify-between p-3 rounded-lg bg-white shadow-sm border-l-4 border-red-500"><span>Expired Subscriptions:</span> <span className="font-bold text-red-500">{statusBreakdown.expiredSubscriptions}</span></li>
                </ul>
            </div>
        )}
    </div>
);

const ModalSubscriptionContent = ({ subscriptionSummary }) => {
    const subscriptionChartData = subscriptionSummary.subscriptionGroups.map((group, index) => ({
        ...group,
        color: CHART_COLORS[index % CHART_COLORS.length],
    }));

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="p-3 bg-white border border-gray-200 shadow-xl rounded-lg text-sm">
                    <p className="font-medium text-gray-500 mb-1">{label}</p>
                    <p className="font-bold text-indigo-700">{`${payload[0].name}: ${payload[0].value.toLocaleString('en-IN')}`}</p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-center">
                <div className="p-4 bg-green-50 rounded-xl shadow-lg border-b-4 border-green-500">
                    <p className="text-sm text-gray-600 uppercase font-medium">Total Orders</p>
                    <p className="text-3xl font-extrabold text-green-700 mt-1">{subscriptionSummary.totalSubscriptions.toLocaleString('en-IN')}</p>
                </div>
                <div className="p-4 bg-blue-50 rounded-xl shadow-lg border-b-4 border-blue-500">
                    <p className="text-sm text-gray-600 uppercase font-medium">Active</p>
                    <p className="text-3xl font-extrabold text-blue-700 mt-1">{subscriptionSummary.activeSubscriptions.toLocaleString('en-IN')}</p>
                </div>
                <div className="p-4 bg-red-50 rounded-xl shadow-lg border-b-4 border-red-500">
                    <p className="text-sm text-gray-600 uppercase font-medium">Expired</p>
                    <p className="text-3xl font-extrabold text-red-700 mt-1">{subscriptionSummary.expiredSubscriptions.toLocaleString('en-IN')}</p>
                </div>
                <div className="p-4 bg-gray-100 rounded-xl shadow-lg border-b-4 border-gray-400">
                    <p className="text-sm text-gray-600 uppercase font-medium">Future/Pending</p>
                    <p className="text-3xl font-extrabold text-gray-700 mt-1">{subscriptionSummary.futureSubscriptions.toLocaleString('en-IN')}</p>
                </div>
            </div>

            <h4 className="font-bold text-xl text-gray-800 mt-4 border-b pb-2 flex items-center"><FaTags className="mr-2 w-5 h-5 text-indigo-500" /> Subscription Plan Distribution:</h4>
            <div className="h-96 bg-gray-50 rounded-xl p-4 shadow-inner border border-gray-200">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={subscriptionChartData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={120}
                            innerRadius={70} // Donut style
                            paddingAngle={3}
                            labelLine={false}
                            label={({ name, percent }) => `${name} (${(percent * 100).toFixed(1)}%)`}
                        >
                            {subscriptionChartData.map((g, i) => (
                                <Cell key={`cell-${i}`} fill={g.color} stroke={g.color} strokeWidth={2} />
                            ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                        <Legend layout="horizontal" iconType="circle" align="center" verticalAlign="bottom" wrapperStyle={{ paddingTop: '20px' }} />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

const ModalComplaintsContent = ({ complaintSummary }) => {
    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="p-3 bg-white border border-gray-200 shadow-xl rounded-lg text-sm">
                    <p className="font-medium text-gray-500 mb-1">{label}</p>
                    <p className="font-bold text-red-700">{`${payload[0].value.toLocaleString('en-IN')} Issues`}</p>
                </div>
            );
        }
        return null;
    };
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-5 bg-red-50 rounded-xl shadow-lg border-b-4 border-red-500">
                    <p className="text-sm text-gray-600 uppercase font-medium">Open (Urgent)</p>
                    <p className="text-3xl font-extrabold text-red-700 mt-1">{complaintSummary.open}</p>
                </div>
                <div className="p-5 bg-yellow-50 rounded-xl shadow-lg border-b-4 border-yellow-500">
                    <p className="text-sm text-gray-600 uppercase font-medium">In Progress</p>
                    <p className="text-3xl font-extrabold text-yellow-700 mt-1">{complaintSummary.inProgress}</p>
                </div>
                <div className="p-5 bg-green-50 rounded-xl shadow-lg border-b-4 border-green-500">
                    <p className="text-sm text-gray-600 uppercase font-medium">Resolved/Closed</p>
                    <p className="text-3xl font-extrabold text-green-700 mt-1">{complaintSummary.resolved + complaintSummary.closed}</p>
                </div>
            </div>

            <h4 className="font-bold text-xl text-gray-800 mt-4 border-b pb-2 flex items-center"><FaLayerGroup className="mr-2 w-5 h-5 text-red-500" /> Breakdown by Category:</h4>
            <div className="h-80 bg-gray-50 rounded-xl p-4 shadow-inner border border-gray-200">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={complaintSummary.categoryBreakdown} margin={{ top: 15, right: 10, left: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" vertical={false} />
                        <XAxis dataKey="category" stroke="#6b7280" interval={0} angle={-25} textAnchor="end" height={60} />
                        <YAxis stroke="#6b7280" allowDecimals={false} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="count" name="Count" fill={ALERT_COLOR} radius={[10, 10, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

// --- Main AdminDashboard Component ---
export default function AdminDashboard() {
    const [userSummary, setUserSummary] = useState(null);
    const [subscriptionSummary, setSubscriptionSummary] = useState(null);
    const [revenueSummary, setRevenueSummary] = useState(null);
    const [querySummary, setQuerySummary] = useState(null);
    const [topRevenueUsers, setTopRevenueUsers] = useState([]);
    const [complaintSummary, setComplaintSummary] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [latestLogs, setLatestLogs] = useState([]);

    const [modalType, setModalType] = useState(null);
    const [statusBreakdown, setStatusBreakdown] = useState(null);
    const [selectedStatus, setSelectedStatus] = useState(null);

    const loadLatestLogs = useCallback(async () => {
        try {
            const res = await api.get("/admin/activitylogs?take=10"); // Set to 10 for better fill on the log card
            setLatestLogs(res.data);
        } catch (err) {
            console.error("Failed to load latest activity logs", err);
        }
    }, []);

    const loadAllData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [
                userRes, subsRes, revRes, queryRes, topUserRes, complaintRes
            ] = await Promise.all([
                api.get(`/adminDashboard/users/summary`),
                api.get(`/adminDashboard/subscriptions/summary`),
                api.get(`/adminDashboard/revenue/summary`),
                api.get(`/adminDashboard/queries/summary`),
                api.get(`/adminDashboard/users/top-revenue`),
                api.get(`/adminDashboard/complaints/summary`)
            ]);

            loadLatestLogs();

            setUserSummary(userRes.data.totalUsers ? userRes.data : { ...userRes.data, totalUsers: 0 });
            setSubscriptionSummary(subsRes.data);
            setRevenueSummary(revRes.data);
            setQuerySummary(queryRes.data);
            setTopRevenueUsers(topUserRes.data);
            setComplaintSummary(complaintRes.data);
        } catch (err) {
            console.error("Failed to load dashboard data", err);
        } finally {
            setIsLoading(false);
        }
    }, [loadLatestLogs]);

    useEffect(() => {
        loadAllData();
        const logInterval = setInterval(loadLatestLogs, 5000);
        return () => clearInterval(logInterval);
    }, [loadAllData, loadLatestLogs]);

    const openDetailModal = async (type, status = null) => {
        setModalType(type);
        setSelectedStatus(status);
        if (type === "userBreakdown" && status) {
            try {
                const res = await api.get(`/adminDashboard/user-breakdown-by-status/${status}`);
                setStatusBreakdown(res.data);
            } catch (err) {
                console.error("Failed to load user breakdown", err);
                setStatusBreakdown(null);
            }
        }
    };

    const closeModal = () => {
        setModalType(null);
        setSelectedStatus(null);
        setStatusBreakdown(null);
    };

    const CustomTooltip = ({ active, payload, label, prefix = '' }) => {
        if (active && payload && payload.length) {
            return (
                <div className="p-3 bg-white border border-gray-200 shadow-xl rounded-lg text-sm">
                    <p className="font-medium text-gray-500 mb-1">{label}</p>
                    <p className="font-bold text-indigo-700">{`${prefix}${payload[0].value.toLocaleString('en-IN')}`}</p>
                </div>
            );
        }
        return null;
    };

    // --- Structure for 3-Column Layout ---
    // We'll divide the content into 3 logical columns of equal width (lg:grid-cols-3)

    const Column1 = (
        <div className="space-y-8">
            {/* Row 1: Primary Metrics (Col 1 - Spans 1/3 of total) */}
            <div className="grid grid-cols-2 gap-5">
                <SummaryCard
                    title="Total Users"
                    value={userSummary ? userSummary.totalUsers || 0 : '...'}
                    icon={CARD_CONFIG['Total Users'].icon}
                    iconClass={CARD_CONFIG['Total Users'].iconClass}
                    onClick={() => openDetailModal("user")}
                />
                <SummaryCard
                    title="Total Revenue"
                    value={revenueSummary ? revenueSummary.totalRevenue : '...'}
                    icon={CARD_CONFIG['Total Revenue'].icon}
                    iconClass={CARD_CONFIG['Total Revenue'].iconClass}
                />
            </div>

            {/* Row 2: Secondary Metrics */}
            <div className="grid grid-cols-2 gap-5">
                <SummaryCard
                    title="Total Subscriptions"
                    value={subscriptionSummary ? subscriptionSummary.totalSubscriptions : '...'}
                    icon={CARD_CONFIG['Total Subscriptions'].icon}
                    iconClass={CARD_CONFIG['Total Subscriptions'].iconClass}
                    onClick={() => openDetailModal("subscription")}
                />
                <SummaryCard
                    title="Total Queries"
                    value={querySummary ? querySummary.totalQueries : '...'}
                    icon={CARD_CONFIG['Total Queries'].icon}
                    iconClass={CARD_CONFIG['Total Queries'].iconClass}
                />
            </div>

            {/* Row 3: Monthly Revenue Chart (Takes full width of its column) */}
            {revenueSummary && (
                <div className="bg-white rounded-3xl shadow-xl p-6 h-[400px] border border-gray-100">
                    <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center border-b pb-3">
                        <FaChartLine className="text-indigo-500 mr-2 w-4 h-4" /> Revenue Trend
                    </h2>
                    <div className="h-[calc(100%-40px)]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={revenueSummary.monthlyRevenue} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" vertical={false} />
                                <XAxis dataKey="month" stroke="#6b7280" fontSize={10} />
                                <YAxis tickFormatter={(val) => `₹${val.toLocaleString()}`} stroke="#6b7280" fontSize={10} />
                                <Tooltip content={<CustomTooltip prefix="₹" />} />
                                <Line type="monotone" dataKey="revenue" name="Revenue" stroke={PRIMARY_COLOR} strokeWidth={2} dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}
        </div>
    );

    const Column2 = (
        <div className="space-y-8">
            {/* Row 1: Online Users & Complaints */}
            <div className="grid grid-cols-2 gap-5">
                <SummaryCard
                    title="Online Users"
                    value={userSummary ? userSummary.usersOnline : '...'}
                    icon={CARD_CONFIG['Online Users'].icon}
                    iconClass={CARD_CONFIG['Online Users'].iconClass}
                />
                <SummaryCard
                    title="Total Complaints"
                    value={complaintSummary ? complaintSummary.total : '...'}
                    icon={CARD_CONFIG['Total Complaints'].icon}
                    iconClass={CARD_CONFIG['Total Complaints'].iconClass}
                    onClick={() => openDetailModal("complaints")}
                />
            </div>
            
            {/* Row 2: Complaint Status / Top Revenue Users */}
            {complaintSummary && (
                <div className="bg-white rounded-3xl shadow-xl p-6 h-[250px] border border-gray-100">
                    <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center border-b pb-3">
                        <FaLayerGroup className="text-red-500 mr-2 w-4 h-4" /> Complaint Status
                    </h2>
                    <div className="h-[calc(100%-40px)]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={[
                                        { name: 'Open', value: complaintSummary.open, color: ALERT_COLOR },
                                        { name: 'In Progress', value: complaintSummary.inProgress, color: ACCENT_COLOR },
                                        { name: 'Resolved', value: complaintSummary.resolved + complaintSummary.closed, color: SECONDARY_COLOR },
                                    ]}
                                    dataKey="value"
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={80}
                                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                >
                                    <Cell key="cell-0" fill={ALERT_COLOR} />
                                    <Cell key="cell-1" fill={ACCENT_COLOR} />
                                    <Cell key="cell-2" fill={SECONDARY_COLOR} />
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                                <Legend layout="vertical" iconType="circle" align="right" verticalAlign="middle" wrapperStyle={{ fontSize: '12px' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}
            
            {/* Row 3: Top Revenue Users List */}
            {topRevenueUsers.length > 0 && (
                <div className="bg-white rounded-3xl shadow-xl p-6 h-[400px] border border-yellow-100">
                    <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center border-b pb-3">
                        <FaTrophy className="text-yellow-500 mr-2 w-4 h-4" /> Top Revenue Users
                    </h2>
                    <ul className="text-sm text-gray-700 divide-y divide-gray-100">
                        {topRevenueUsers.slice(0, 5).map((u, i) => (
                            <li key={i} className="py-3 flex justify-between items-center hover:bg-yellow-50 px-2 -mx-2 rounded-lg transition">
                                <span className="font-medium flex items-center">
                                    <span className={`text-md font-extrabold mr-3 ${i === 0 ? 'text-yellow-600' : i === 1 ? 'text-gray-500' : 'text-amber-700'}`}>#{i + 1}</span>
                                    <span className="truncate w-32">{u.companyName}</span>
                                </span>
                                <span className="font-bold text-lg text-green-600">
                                    ₹{u.totalRevenue.toLocaleString('en-IN')}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );

    const Column3 = (
        <div className="space-y-8">
            {/* Row 1: Activity Log (Takes full height of its section for visual balance) */}
            <div className="h-[510px]"> {/* Adjusted height to fit well with other cards */}
                <LogPreviewCard logs={latestLogs} />
            </div>

            {/* Row 2: Query Activity Bar Chart */}
            {querySummary && (
                <div className="bg-white rounded-3xl shadow-xl p-6 h-[450px] border border-gray-100">
                    <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center border-b pb-3">
                        <FaSignal className="text-green-500 mr-2 w-4 h-4" /> Top 5 Query Users
                    </h2>
                    <div className="h-[calc(100%-40px)]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={querySummary.topUsers.slice(0, 5)} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                                <XAxis type="number" stroke="#6b7280" fontSize={10} />
                                <YAxis dataKey="companyName" type="category" width={60} stroke="#6b7280" fontSize={10} />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="queryCount" fill={SECONDARY_COLOR} radius={[0, 8, 8, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}
        </div>
    );


    // --- Main Render ---
    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="flex flex-col items-center text-indigo-600">
                    <FaCog className="w-10 h-10 animate-spin mb-3" />
                    <p className="text-xl font-semibold">Loading Dashboard Metrics...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-4 sm:p-8 lg:p-10 font-sans">

            {/* --- Dashboard Header --- */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-10">
                <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-3 sm:mb-0 flex items-center">
                    <FaCog className="text-indigo-600 mr-3 w-8 h-8" /> Operations Dashboard
                </h1>
                <button
                    onClick={loadAllData}
                    disabled={isLoading}
                    className={`inline-flex items-center px-5 py-2 border border-transparent text-sm font-semibold rounded-full shadow-lg transition 
                        ${isLoading
                            ? 'bg-indigo-400 text-white cursor-not-allowed'
                            : 'text-white bg-indigo-600 hover:bg-indigo-700 hover:shadow-xl active:scale-95'
                        }`}
                >
                    <FaRedo className={`mr-2 w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                    {isLoading ? 'Syncing Data...' : 'Refresh Metrics'}
                </button>
            </div>

            {/* --- 3-COLUMN GRID LAYOUT --- */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Column 1: Revenue & User Primary Cards + Line Chart */}
                <div>{Column1}</div>

                {/* Column 2: Secondary Cards, Complaint Pie, Top Revenue List */}
                <div>{Column2}</div>

                {/* Column 3: Activity Log & Query Bar Chart */}
                <div>{Column3}</div>
            </div>

            {/* === MODALS (Centralized Detail Views) === */}

            <Modal
                isOpen={modalType === "user" || modalType === "userBreakdown"}
                title="User Segmentation & Status Breakdown"
                onClose={closeModal}
            >
                {userSummary && (
                    <ModalUserContent
                        userSummary={userSummary}
                        selectedStatus={selectedStatus}
                        statusBreakdown={statusBreakdown}
                        openDetailModal={openDetailModal}
                        closeModal={closeModal}
                    />
                )}
            </Modal>

            <Modal
                isOpen={modalType === "subscription"}
                title="Subscription Status and Plan Distribution"
                onClose={closeModal}
            >
                {subscriptionSummary && <ModalSubscriptionContent subscriptionSummary={subscriptionSummary} />}
            </Modal>

            <Modal
                isOpen={modalType === "complaints"}
                title="Total Complaints & Status Metrics"
                onClose={closeModal}
            >
                {complaintSummary && <ModalComplaintsContent complaintSummary={complaintSummary} />}
            </Modal>

        </div>
    );
}