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
import { Loader2 } from "lucide-react";

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
      const base = buildApi("activitylogs");
      const url = base.includes("?")
        ? `${base}&take=10`
        : `${base}?take=10`;

      const res = await api.get(url);
      setLogs(res.data || []);
    } catch (e) {
      console.error("loadLogs ERROR:", e.response?.data || e);
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
          <div className="text-lg text-white flex items-center gap-2 p-6 bg-[#0a2345] rounded-2xl shadow-lg">
            <Loader2 className="animate-spin w-6 h-6" /> Loading Dashboard...
          </div>
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

          <GlassCard title="Total Revenue" subtitle={`From ${data.subscriptionSummary?.totalSubscriptions || 0} invoices`}>
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
                      {/* <YAxis
                        tickFormatter={(v) => {
                          if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`;      // Billion
                          if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;      // Million
                          if (v >= 1e5) return `${(v / 1e5).toFixed(1)}L`;      // Lakh
                          if (v >= 1e3) return `${(v / 1e3).toFixed(0)}K`;      // Thousand
                          return v;
                        }}
                        fontSize={11}
                        tick={{ fill: "#33527a" }}
                        axisLine={{ stroke: "#c3d7ff" }}
                        tickLine={{ stroke: "#c3d7ff" }}
                        width={isMobile ? 40 : 50}
                      /> */}
                      <Tooltip content={<DarkTooltip />} />
                      <Bar dataKey="revenue" fill={ACCENT_INDIGO} radius={[6, 6, 0, 0]} />
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
              <button onClick={() => navigate('/admin/activitylogs')} className="text-sm text-indigo-300 hover:text-indigo-100">View all &rarr;</button>
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
                  {(data.topRevenueUsers || []).slice(0, 10).map((u, idx) => (
                    <tr key={idx} className="border-t border-[rgba(255,255,255,0.03)]">
                      <td className="py-2 text-gray-200">{idx + 1}</td>
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
                  {(data.querySummary?.topUsers || []).slice(0, 5).map((u, idx) => (
                    <tr key={idx} className="border-t border-[rgba(255,255,255,0.03)]">
                      <td className="py-2 text-gray-200">{idx + 1}</td>
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
