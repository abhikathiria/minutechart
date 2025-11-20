import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import ModuleChart from "../components/modules/ModuleChart";
import PlanPage from "./PlanPage";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { FaGripVertical, FaFileExcel, FaBars, FaTimes, FaHistory, FaChartLine, FaExclamationTriangle } from "react-icons/fa";
import { Reorder, motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import { Clock, Calendar, RefreshCw, AlertTriangle, RefreshCcw } from "lucide-react";

// 1. Define the sidebar width (fixed size for clean transitions)
const SIDEBAR_WIDTH_DESKTOP = 288; // md:w-72 (72 * 4px = 288px)
const SIDEBAR_STORAGE_KEY = 'dashboardSidebarOpen';

function AmbientBackground({ mouseX, mouseY }) {
  // small motion transforms for the blobs
  const bx = useTransform(mouseX, (v) => `${v * 12}px`);
  const by = useTransform(mouseY, (v) => `${v * 8}px`);

  return (
    <div aria-hidden className="fixed inset-0 -z-10 pointer-events-none">
      <motion.div
        style={{ translateX: bx, translateY: by }}
        className="absolute left-1/4 top-1/5 w-[36rem] h-[36rem] rounded-full blur-[120px] bg-[radial-gradient(circle,_#00F0FF_0%,_transparent_40%)] opacity-20 mix-blend-screen"
      />
      <motion.div
        style={{ translateX: bx, translateY: by }}
        className="absolute right-1/5 bottom-1/6 w-[44rem] h-[44rem] rounded-full blur-[160px] bg-[radial-gradient(circle,_#9D4EDD_0%,_transparent_40%)] opacity-16 mix-blend-screen"
      />
      <svg className="absolute inset-0 w-full h-full opacity-5" preserveAspectRatio="none">
        <defs>
          <linearGradient id="g1" x1="0" x2="1">
            <stop offset="0%" stopColor="#00F0FF" stopOpacity="0.06" />
            <stop offset="100%" stopColor="#9D4EDD" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#g1)" />
      </svg>
    </div>
  );
}

function useCursor() {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  useEffect(() => {
    const onMove = (e) => {
      const cx = (e.clientX / window.innerWidth) - 0.5;
      const cy = (e.clientY / window.innerHeight) - 0.5;
      mouseX.set(cx);
      mouseY.set(cy);
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [mouseX, mouseY]);
  return { mouseX, mouseY };
}

// Light-follow wrapper for hover highlight (visual only)
function LightFollow({ children }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    function onMove(e) {
      const rect = el.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      el.style.setProperty("--lf-x", `${x}%`);
      el.style.setProperty("--lf-y", `${y}%`);
    }
    function onLeave() {
      el.style.setProperty("--lf-x", `50%`);
      el.style.setProperty("--lf-y", `50%`);
    }
    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);
    return () => {
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", onLeave);
    };
  }, []);
  return (
    <div ref={ref} className="relative rounded-xl">
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background:
            "radial-gradient(circle at var(--lf-x,50%) var(--lf-y,50%), rgba(0,240,255,0.06), transparent 18%)",
          mixBlendMode: "screen",
          transition: "background .12s linear",
        }}
      />
      {children}
    </div>
  );
}

// --- Helper Components ---

// Reordering Item Component (Kept as is)
const ReorderModuleItem = ({ q, executeQuery }) => (
    <Reorder.Item
        key={q.userQueryId}
        value={q}
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        className="flex items-center gap-3 p-3 bg-[#071016]/80 rounded-lg shadow-[0_6px_24px_rgba(0,0,0,0.4)] hover:bg-[#0b2430] transition cursor-grab border border-[#0f1720]"
  >
        <FaGripVertical className="text-slate-400 cursor-grab" />
        <div className="flex flex-col truncate flex-1">
            <div className="font-semibold text-white truncate">{q.userTitle || "Untitled Module"}</div>
            <div className="text-xs text-gray-400 capitalize">
                {q.visualizationType} Module
            </div>
        </div>
        <button
            onClick={(e) => {
                e.stopPropagation();
                executeQuery(q.userQueryText, q.userQueryId);
            }}
            className="text-slate-300 hover:text-teal-400 p-1 rounded transition"
            title="Refresh Module Data"
        >
            <RefreshCcw className="w-4 h-4" /> 
        </button>
    </Reorder.Item>
);

// === NEW: Module Suggestion Form Component ===
const ModuleSuggestionForm = ({ userId, setToastMessage }) => {
    const [suggestionText, setSuggestionText] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSuggestionSubmit = async (e) => {
        e.preventDefault();
        if (!suggestionText.trim()) {
            setToastMessage({ type: 'error', text: 'Suggestion cannot be empty.' });
            return;
        }
        if (!userId) return;

        setIsSubmitting(true);
        try {
            await api.post("/user/suggest-module", { text: suggestionText.trim() });
            
            setToastMessage({ type: 'success', text: 'Module suggestion sent successfully! You will be notified once the admin creates it.' });
            setSuggestionText(""); // Clear input
        } catch (error) {
            console.error("Failed to submit module suggestion", error);
            setToastMessage({ type: 'error', text: 'Failed to send suggestion. Please try again.' });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    return (
        <form onSubmit={handleSuggestionSubmit} className="p-4 border-t border-[#0f1720] mt-4 bg-[#061018]/60">
            <label htmlFor="moduleSuggestion" className="block text-sm font-medium text-teal-300 mb-2">
                Suggest a New Module
            </label>

            <textarea
                id="moduleSuggestion"
                rows="2"
                value={suggestionText}
                onChange={(e) => setSuggestionText(e.target.value)}
                placeholder="What module would help you?"
                className="w-full p-2 border border-[#0f1720] rounded-lg focus:ring-teal-400 focus:border-teal-400 text-sm resize-none bg-[#041018] text-white placeholder-slate-500"
                disabled={isSubmitting}
            />
            <button
                type="submit"
                disabled={isSubmitting || !suggestionText.trim()}
                className="mt-2 w-full bg-gradient-to-r from-[#00F0FF] to-[#9D4EDD] text-[#080C16] py-2 rounded-lg font-semibold hover:scale-[1.01] transition disabled:opacity-50"
            >
                {isSubmitting ? "Sending..." : "Submit"}
            </button>
        </form>
    );
};

export default function Dashboard() {
    const [queries, setQueries] = useState([]);
    const [results, setResults] = useState({});
    const [subscriptionStatus, setSubscriptionStatus] = useState(null);
    const [countdown, setCountdown] = useState("");
    const [refreshRules, setRefreshRules] = useState({});
    const [queriesLoaded, setQueriesLoaded] = useState(false);
    
    const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
        const storedValue = localStorage.getItem(SIDEBAR_STORAGE_KEY);
        if (storedValue === null) {
            return window.innerWidth >= 768; 
        }
        return storedValue === 'true';
    });
    const [userId, setUserId] = useState(null);
    
    // --- Toast State ---
    const [toastMessage, setToastMessage] = useState(null); 

    const { mouseX, mouseY } = useCursor();
    const mx = useTransform(mouseX, (v) => v);
    const my = useTransform(mouseY, (v) => v);

    useEffect(() => {
        const fetchUserId = async () => {
            try {
                const res = await api.get("/account/me");
                setUserId(res.data.id);
            } catch (err) {
                console.error("Failed to fetch user ID", err);
            }
        };
        fetchUserId();

        const fetchStatus = async () => {
            try {
                const res = await api.get("/user/subscription-status");
                setSubscriptionStatus(res.data);

                if (res.data?.hasActivePlan && !queriesLoaded) {
                    loadQueries();
                    setQueriesLoaded(true);
                }

                // Check for admin-created toast signal
                if (res.data?.moduleSuggestionCreated) {
                    setToastMessage({ 
                        type: 'success', 
                        text: 'Great news! An admin has created a module you suggested.' 
                    }); 
                }
            } catch (err) {
                console.error("Failed to fetch subscription status", err);
                setSubscriptionStatus({ hasActivePlan: false });
            }
        };

        fetchStatus();
        const interval = setInterval(fetchStatus, 10000);

        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const timer = setInterval(() => {
            setSubscriptionStatus((prev) => ({ ...prev }));
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    let totalDaysRemaining = 0;
    let subscriptionEnd = null;
    if (subscriptionStatus?.activePlans?.length > 0) {
        const now = new Date();
        totalDaysRemaining = subscriptionStatus.activePlans.reduce((sum, plan) => {
            const start = new Date(plan.subscriptionStart);
            const end = new Date(plan.subscriptionEnd);
            if (start <= now && end >= now) {
                subscriptionEnd = end;
                const remaining = Math.max(Math.ceil((end - now) / (1000 * 60 * 60 * 24)), 0);
                return sum + remaining;
            }
            return sum;
        }, 0);
    }

    let trialDaysRemaining = 0;
    let trialEnd = null;
    if (subscriptionStatus?.isTrialActive && subscriptionStatus?.trialEnd) {
        const now = new Date();
        trialEnd = new Date(subscriptionStatus.trialEnd);
        trialDaysRemaining = Math.max(Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24)), 0);
    }

    useEffect(() => {
        let timer;
        const target = subscriptionEnd || trialEnd;

        if (target && ((totalDaysRemaining === 1 && !trialEnd) || (trialDaysRemaining === 1 && trialEnd))) {
            const updateCountdown = () => {
                const now = new Date();
                const diff = target - now;
                if (diff <= 0) {
                    setCountdown("Expired");
                    clearInterval(timer);
                    return;
                }
                const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
                const minutes = Math.floor((diff / (1000 * 60)) % 60);
                const seconds = Math.floor((diff / 1000) % 60);

                setCountdown(`${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`);
            };
            updateCountdown();
            timer = setInterval(updateCountdown, 1000);
        }
        return () => clearInterval(timer);
    }, [totalDaysRemaining, trialDaysRemaining, subscriptionEnd, trialEnd]);

    const showSubscriptionBanner = totalDaysRemaining > 0;
    const showTrialBanner = trialDaysRemaining > 0 && !showSubscriptionBanner;

    const loadQueries = async () => {
        try {
            const res = await api.get("/dashboard/queries");
            const list = res.data || [];
            setQueries(list);
            for (const q of list) {
    await executeQuery(q.userQueryText, q.userQueryId);
}
        } catch (err) {
            console.error("Failed to load queries", err);
            setQueries([]);
        }
    };

    const executeQuery = async (queryText, queryId) => {
    try {
        const res = await api.post("/dashboard/execute-query", { sql: queryText });

        // --- Store per-module cooldown rules ---
        setRefreshRules(prev => ({
            ...prev,
            [queryId]: {
                canRefresh: res.data.canRefresh !== false,
                nextAllowedAt: res.data.nextAllowedAt ? new Date(res.data.nextAllowedAt) : null,
                excelAllowed: res.data.excelAllowed === true
            }
        }));

        // --- Store results ---
        if (res.data?.success) {
            setResults(prev => ({ ...prev, [queryId]: res.data.data }));
        } else {
            setResults(prev => ({ ...prev, [queryId]: [] }));
        }
    } catch (err) {
        console.error("Error executing query", err);
        setResults(prev => ({ ...prev, [queryId]: [] }));
    }
};
    
    // Effect to auto-clear the suggestion/error toast
    useEffect(() => {
        if (toastMessage) {
            const timer = setTimeout(() => {
                setToastMessage(null);
            }, 5000); // Toast visible for 5 seconds
            return () => clearTimeout(timer);
        }
    }, [toastMessage]);


    // --- Loading and PlanPage Logic ---
    if (subscriptionStatus === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#05070D] text-white">
        <div className="text-lg text-white/60 animate-pulse">Checking Subscription...</div>
      </div>
    );
  }

    if (!subscriptionStatus.hasActivePlan) {
        return <PlanPage status={subscriptionStatus} />;
    }

    // 2. Calculate the main content margin dynamically for desktop sliding effect
    const mainContentMargin = isSidebarOpen ? SIDEBAR_WIDTH_DESKTOP : 0;
    const isMobile = window.innerWidth < 768; // Helper for mobile

    const exportData = (data, q) => {
    if (data && data.length > 0) {
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Data");
      const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const blob = new Blob([wbout], { type: "application/octet-stream" });
      saveAs(blob, `${q.userTitle || "data"}.xlsx`);
    }
  };

    // --- Main Render (Improved Responsive Layout) ---
    return (
        <div className="min-h-screen flex relative bg-[#02060b] text-white">
      {/* Ambient background responsive to cursor */}
      <AmbientBackground mouseX={mx} mouseY={my} />

            {/* 3. Sidebar Container (Module List + Suggestion Form/History) */}
            <motion.aside
                initial={false}
                animate={{
                    x: isMobile ? (isSidebarOpen ? 0 : '-100%') : 0,
                    width: isMobile ? '100%' : (isSidebarOpen ? SIDEBAR_WIDTH_DESKTOP : 0)
                }}
                transition={{ duration: 0.32, ease: 'easeInOut' }}
                className={`
                    fixed inset-y-0 left-0 z-50
                    md:sticky md:top-0 md:h-screen 
                    flex flex-col bg-[#061018]/80
                    backdrop-blur border-r border-[#123244]/30
                    w-full max-w-xs sm:max-w-sm md:w-72
                    ${isMobile ? "pt-24" : ""}
                `}
                style={{
                    width: isMobile ? '100%' : (isSidebarOpen ? SIDEBAR_WIDTH_DESKTOP : 0),
                    overflow: isMobile || isSidebarOpen ? 'auto' : 'hidden',
                }}
            >

                {/* Sidebar Header and Toggle */}
                <div className="flex items-center justify-between mb-4 p-4 shrink-0 border-b border-[#0f1720]">
          <h1 className="text-2xl font-bold text-teal-300">
            <FaChartLine className="inline mr-2" /> Modules
          </h1>
                    {/* Universal Close Button */}
                    <button
                        onClick={() => {
                            setIsSidebarOpen(false);
                            localStorage.setItem(SIDEBAR_STORAGE_KEY, 'false');
                        }}
                        className="text-white p-2 rounded hover:bg-gray-700 ml-auto"
                        title="Close Sidebar"
                    >
                        <FaTimes size={20} />
                    </button>
                </div>

                {/* Sidebar content (Reorder.Group moved inside a scrollable div) */}
                <div
                    className={`flex-1 flex flex-col overflow-hidden transition-opacity duration-300 ${isSidebarOpen ? "opacity-100" : "opacity-0"}`}
                    style={{ minWidth: isSidebarOpen ? SIDEBAR_WIDTH_DESKTOP - 32 : 0 }}
                >
                    <div className="flex-1 overflow-y-auto"> {/* Scrollable Area for Modules */}
                        <div className="text-sm font-semibold text-slate-400 mb-2 px-4">
                            Drag to reorder dashboard layout.
                        </div>
                        <hr className="border-[#0f1720] mb-4" />
                        
                        <Reorder.Group
                            axis="y"
                            values={queries}
                            onReorder={(newOrder) => {
                                setQueries(newOrder);
                                api.post("/dashboard/reorder-modules", {
                                    order: newOrder.map((q, idx) => ({ id: q.userQueryId, position: idx }))
                                });
                            }}
                            className="space-y-2 px-4"
                        >
                            <AnimatePresence>
                                {queries.length === 0 ? (
                                    <li className="text-slate-500 text-center list-none p-4 bg-[#061018] rounded-lg">
                                        No active modules.
                                    </li>
                                ) : (
                                    queries.map((q) => (
                                        <ReorderModuleItem key={q.userQueryId} q={q} executeQuery={executeQuery} />
                                    ))
                                )}
                            </AnimatePresence>
                        </Reorder.Group>

                        {queries.length > 0 && (
                            <>
                                <hr className="my-4 border-[#0f1720]" />
                <div className="mt-2 text-md text-slate-300 text-center font-bold">Total Modules: {queries.length}</div>
              </>
                        )}
                    </div> {/* End Scrollable Area for Modules */}
                    
                    {/* Suggestion Form and History added at the bottom of the sidebar */}
                    <div className='shrink-0 px-4'>
                        {userId && <ModuleSuggestionForm userId={userId} setToastMessage={setToastMessage} />}
                    </div>
                </div>
            </motion.aside>

            {/* 4. Mobile Sidebar Backdrop (Only visible on mobile when open) */}
            {isSidebarOpen && isMobile && (
                <div
                    className="fixed inset-0 bg-black/50 z-40"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* 5. Main Content Area (Kept as is, but without suggestion box) */}
            <main
                className="flex-1 p-4 md:p-6 transition-all duration-300 relative"
                style={{
                    marginLeft: !isMobile ? 0 : `${mainContentMargin}px`,
                    minHeight: '100vh', 
                }}
            >
                {/* Dashboard Header/Banners */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                    
                    {/* Menu Button & Title */}
                    <div className="flex items-center">
                        {!isSidebarOpen && (
                            <button
                                onClick={() => {
                                    setIsSidebarOpen(true);
                                    localStorage.setItem(SIDEBAR_STORAGE_KEY, 'true');
                                }}
                                className="p-3 bg-[#152342] text-white rounded-lg hover:bg-gray-800 transition mr-4 shadow-lg"
                                title="Open Sidebar"
                            >
                                <FaBars size={20} />
                            </button>
                        )}
                        <h2 className="text-3xl font-bold text-white">
                            Your Dashboard
                        </h2>
                    </div>

                    {/* Subscription Banners (Kept as is) */}
                    {showSubscriptionBanner && (
                        <div className="w-full md:w-auto p-3 rounded-xl shadow-md bg-gradient-to-r from-[#0f4b87] to-[#3b2f8a]/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
                            <div className="flex items-center space-x-3">
                                <Calendar className="w-6 h-6 text-teal-300 shrink-0" />
                                <div>
                                    <div className="text-sm font-semibold whitespace-nowrap">
                                        Subscription Active: {totalDaysRemaining} days left
                                    </div>
                                    <div className="text-xs opacity-90">
                                        {totalDaysRemaining === 1 ? `Expires in: ${countdown}` : `Expires ${subscriptionEnd?.toLocaleDateString('en-GB')}`}
                                    </div>
                                </div>
                            </div>
                            <Link
                                to="/pricing"
                                className="bg-white text-indigo-700 font-semibold px-4 py-1.5 rounded-lg shadow-lg transition hover:bg-gray-200 w-full sm:w-auto text-center text-sm"
                            >
                                Renew / Upgrade
                            </Link>
                        </div>
                    )}

                    {showTrialBanner && (
                        <div className="w-full md:w-auto p-3 rounded-xl shadow-md bg-yellow-700/90 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
                            <div className="flex items-center space-x-3">
                                <AlertTriangle className="w-6 h-6 text-white shrink-0" />
                                <div>
                                    <div className="text-sm font-semibold whitespace-nowrap">
                                        FREE TRIAL: {trialDaysRemaining} days left
                                    </div>
                                    <div className="text-xs opacity-90">
                                        {trialDaysRemaining === 1 ? `Time remaining: ${countdown}` : `Ends ${trialEnd?.toLocaleDateString('en-GB')}`}
                                    </div>
                                </div>
                            </div>
                            <Link
                                to="/subscription/buy"
                                className="bg-white text-yellow-700 font-semibold px-4 py-1.5 rounded-lg shadow-lg transition hover:bg-gray-200 w-full sm:w-auto text-center text-sm"
                            >
                                Upgrade Now
                            </Link>
                        </div>
                    )}
                </div>

{/* Toast */}
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className={`fixed right-6 top-6 z-60 px-4 py-2 rounded-lg shadow-lg ${toastMessage.type === "success" ? "bg-green-600" : "bg-red-600"}`}
            >
              <div className="text-sm font-semibold">{toastMessage.text}</div>
            </motion.div>
          )}
        </AnimatePresence>

                {/* Module Grid Area (Kept as is) */}
                {queries.length === 0 ? (
                    <div className="text-slate-300 text-xl text-center py-20 bg-[#061018] rounded-xl shadow">
            <FaExclamationTriangle className="inline w-8 h-8 mb-4 text-orange-400" />
            <p>No active modules have been configured for your dashboard yet.</p>
            <p className="text-sm mt-2">Please contact your administrator for module setup.</p>
          </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {queries.map((q) => {
                            const data = results[q.userQueryId];
                            const isDataLoading = data === undefined || data === null; 
                            const isDataReady = data !== undefined && data !== null && data.length > 0; 
                            
                            const numRows = (data && data.length) || 0;
                            const numColumns = (data && data.length > 0 && data[0] && Object.keys(data[0]).length) || 0; 
                            
                            let spanClasses = "";
                            let overflowClass = "overflow-auto";
                            let limitHeight = true;

                            spanClasses = "sm:col-span-2"; 

                            if (q.visualizationType === "table" || q.visualizationType === "heatmap") {
                                if (numRows > 10 && numColumns > 5) {
                                    spanClasses = "sm:col-span-2 lg:col-span-4 lg:row-span-2"; 
                                    overflowClass = "overflow-auto";
                                    limitHeight = false;
                                } else if (numRows > 10) {
                                    spanClasses = "sm:col-span-2 lg:row-span-2";
                                    overflowClass = "overflow-x-auto";
                                    limitHeight = false;
                                } else if (numColumns > 5) {
                                    spanClasses = "sm:col-span-2 lg:col-span-4";
                                    overflowClass = "overflow-auto";
                                    limitHeight = true;
                                }
                            }
                            
                            const handleExport = () => {
                                if (data && data.length > 0) {
                                    const ws = XLSX.utils.json_to_sheet(data);
                                    const wb = XLSX.utils.book_new();
                                    XLSX.utils.book_append_sheet(wb, ws, "Data");
                                    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
                                    const blob = new Blob([wbout], { type: "application/octet-stream" });
                                    saveAs(blob, `${q.userTitle || "data"}.xlsx`);
                                };
                            };


                            return (
                                <div
                                    key={q.userQueryId}
                                    className={`bg-[#071017]/70 rounded-xl shadow-lg p-5 flex flex-col hover:shadow-[0_16px_60px_rgba(0,240,255,0.06)] transition ${spanClasses} h-auto min-h-[300px] border border-[#0f1720]`}
                  >
                                    <div className="flex items-start justify-between mb-1 border-b pb-2">
                                        <h3 className="font-extrabold text-xl sm:text-2xl truncate mr-2 text-indigo-700">
                                            {q.userTitle || "Untitled Module"}
                                        </h3>
                                        <div className="flex gap-2">
                                            {(q.visualizationType === "table" || q.visualizationType === "heatmap") && (
                                                <button
                                                    onClick={handleExport}
                                                    title={
                                                        refreshRules[q.userQueryId]?.excelAllowed
                                                            ? "Export Data to Excel"
                                                            : "Your plan does not include Excel Export"
                                                    }
                                                    disabled={!isDataReady || refreshRules[q.userQueryId]?.excelAllowed === false} 
                                                    className="p-2 bg-green-600 text-white rounded-full hover:bg-green-700 disabled:bg-gray-400 flex items-center justify-center shrink-0 shadow-md"
                                                >
                                                    <FaFileExcel size={16} />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => {
                                                    if (refreshRules[q.userQueryId]?.canRefresh === false) return;
                                                    executeQuery(q.userQueryText, q.userQueryId);
                                                }}
                                                disabled={refreshRules[q.userQueryId]?.canRefresh === false}
                                                title={
                                                    refreshRules[q.userQueryId]?.canRefresh
                                                        ? "Refresh Module"
                                                        : `Next refresh at: ${
                                                            refreshRules[q.userQueryId]?.nextAllowedAt?.toLocaleTimeString()
                                                        }`
                                                }
                                                className={`p-2 rounded-full shadow-md ${
                                                    refreshRules[q.userQueryId]?.canRefresh === false
                                                        ? "bg-gray-500 cursor-not-allowed"
                                                        : "bg-blue-500 hover:bg-blue-600"
                                                } text-white`}
                                            >
                                                <RefreshCcw size={16} />
                                            </button>
                                        </div>
                                    </div>
                                    {refreshRules[q.userQueryId]?.canRefresh === false && (
                                        <div className="text-xs text-yellow-400 mb-2 flex items-center gap-1">
                                            <AlertTriangle className="w-3 h-3" />
                                            Next refresh at:{" "}
                                            {refreshRules[q.userQueryId]?.nextAllowedAt?.toLocaleTimeString()}
                                        </div>
                                    )}

                                    {/* Chart / Table area */}
                                    <div className={`flex-1 ${overflowClass} flex items-center justify-center ${limitHeight ? "max-h-[500px]" : ""}`}>
                                        {/* Loading State */}
                                        {isDataLoading ? (
                                            <div className="text-gray-500 text-md flex items-center gap-2">
                                                <RefreshCcw className="w-5 h-5 animate-spin" /> Loading Data...
                                            </div>
                                        ) : data.length > 0 ? (
                                            <ModuleChart
                                                data={data}
                                                type={q.visualizationType}
                                                isApprovalModule={q.isApprovalModule || false}
                                                approvalIdColumn={q.approvalIdColumn || ""}
                                                queryId={q.userQueryId}
                                                userId={userId}
                                                onRefresh={() => executeQuery(q.userQueryText, q.userQueryId)}
                                                limitHeight={limitHeight}
                                            />
                                        ) : (
                                            <p className="text-gray-400 text-md text-center py-10">
                                                No data returned for this module.
                                            </p>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>
        </div>
    );
}

// import React, { useState, useEffect } from "react";
// import { Link, useNavigate } from "react-router-dom";
// import api from "../api";
// import ModuleChart from "../components/modules/ModuleChart";
// import PlanPage from "./PlanPage";
// import * as XLSX from "xlsx";
// import { saveAs } from "file-saver";
// import { FaGripVertical, FaFileExcel, FaBars, FaTimes, FaChartLine, FaExclamationTriangle } from "react-icons/fa";
// import { Reorder, motion, AnimatePresence } from "framer-motion";
// import { Clock, Calendar, RefreshCw, AlertTriangle, RefreshCcw } from 'lucide-react'; 

// // 1. Define the sidebar width (fixed size for clean transitions)
// const SIDEBAR_WIDTH_DESKTOP = 288; // md:w-72 (72 * 4px = 288px)

// // --- Helper Components ---

// // Reordering Item Component
// const ReorderModuleItem = ({ q, executeQuery }) => (
//     <Reorder.Item
//         key={q.userQueryId}
//         value={q}
//         initial={{ opacity: 0, y: -8 }}
//         animate={{ opacity: 1, y: 0 }}
//         exit={{ opacity: 0, y: -8 }}
//         className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg shadow-md hover:bg-gray-700 transition cursor-grab border border-gray-700"
//     >
//         <FaGripVertical className="text-gray-400 cursor-grab" />
//         <div className="flex flex-col truncate flex-1">
//             <div className="font-semibold text-white truncate">{q.userTitle || "Untitled Module"}</div>
//             <div className="text-xs text-gray-400 capitalize">
//                 {q.visualizationType} Module
//             </div>
//         </div>
//         <button
//             onClick={(e) => {
//                 e.stopPropagation();
//                 executeQuery(q.userQueryText, q.userQueryId);
//             }}
//             className="text-gray-400 hover:text-teal-400 p-1 rounded transition"
//             title="Refresh Module Data"
//         >
//             <RefreshCcw className="w-4 h-4" /> 
//         </button>
//     </Reorder.Item>
// );


// export default function Dashboard() {
//     const [queries, setQueries] = useState([]);
//     const [results, setResults] = useState({});
//     const [subscriptionStatus, setSubscriptionStatus] = useState(null);
//     const [countdown, setCountdown] = useState("");
//     const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 768);
//     const [userId, setUserId] = useState(null);

//     // --- Core Logic Functions (Retained) ---
//     const fetchUserId = async () => { /* ... */ };
//     const executeQuery = async (queryText, queryId) => { /* ... */ };
//     const loadQueries = async () => { /* ... */ };
//     const fetchStatus = async () => { /* ... */ };
//     // Effects & Calculations (Retained)
//     useEffect(() => { fetchUserId(); fetchStatus(); const interval = setInterval(fetchStatus, 10000); return () => clearInterval(interval); }, []);
//     useEffect(() => { const timer = setInterval(() => { setSubscriptionStatus((prev) => (prev ? { ...prev } : null)); }, 1000); return () => clearInterval(timer); }, []);

//     let totalDaysRemaining = 0; let subscriptionEnd = null;
//     if (subscriptionStatus?.activePlans?.length > 0) {
//         const now = new Date();
//         totalDaysRemaining = subscriptionStatus.activePlans.reduce((sum, plan) => {
//             const end = new Date(plan.subscriptionEnd);
//             if (end >= now) {
//                 subscriptionEnd = subscriptionEnd ? (end > subscriptionEnd ? end : subscriptionEnd) : end;
//                 const remaining = Math.max(Math.ceil((end - now) / (1000 * 60 * 60 * 24)), 0);
//                 return sum + remaining;
//             } return sum;
//         }, 0);
//     }

//     let trialDaysRemaining = 0; let trialEnd = null;
//     if (subscriptionStatus?.isTrialActive && subscriptionStatus?.trialEnd) {
//         const now = new Date();
//         trialEnd = new Date(subscriptionStatus.trialEnd);
//         trialDaysRemaining = Math.max(Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24)), 0);
//     }

//     const showSubscriptionBanner = totalDaysRemaining > 0;
//     const showTrialBanner = trialDaysRemaining > 0 && !showSubscriptionBanner;
//     const isActiveUser = showSubscriptionBanner || showTrialBanner;

//     useEffect(() => {
//         let timer;
//         const target = subscriptionEnd || trialEnd;
//         const remainingDays = totalDaysRemaining || trialDaysRemaining;

//         if (target && remainingDays === 1) {
//             const updateCountdown = () => {
//                 const now = new Date();
//                 const diff = target - now;
//                 if (diff <= 0) { setCountdown("Expired"); clearInterval(timer); return; }
//                 const hours = Math.floor(diff / (1000 * 60 * 60));
//                 const minutes = Math.floor((diff / (1000 * 60)) % 60);
//                 const seconds = Math.floor((diff / 1000) % 60);
//                 setCountdown(`${hours.toString().padStart(2, "0")}h ${minutes.toString().padStart(2, "0")}m ${seconds.toString().padStart(2, "0")}s`);
//             };
//             updateCountdown();
//             timer = setInterval(updateCountdown, 1000);
//         } else { setCountdown(""); }
//         return () => clearInterval(timer);
//     }, [totalDaysRemaining, trialDaysRemaining, subscriptionEnd, trialEnd]);


//     // --- Render Logic (Guard Clauses) ---
//     if (subscriptionStatus === null) {
//         return (
//             <div className="min-h-screen flex items-center justify-center bg-gray-50">
//                 <div className="text-xl text-indigo-600 font-semibold flex items-center gap-3">
//                     <RefreshCw className="w-6 h-6 animate-spin"/> Checking Subscription...
//                 </div>
//             </div>
//         );
//     }

//     if (!isActiveUser) {
//         return <PlanPage status={subscriptionStatus} />;
//     }

//     // --- Layout Calculations ---
//     const mainContentMargin = isSidebarOpen ? SIDEBAR_WIDTH_DESKTOP : 0;
//     const isMobile = window.innerWidth < 768;


//     // --- Main Render (Redesigned) ---
//     return (
//         <div className="min-h-screen flex relative bg-gray-100">

//             {/* 3. Sidebar Container (Module List) */}
//             <motion.aside
//                 initial={false}
//                 animate={{
//                     x: isMobile ? (isSidebarOpen ? 0 : '-100%') : 0,
//                     width: isMobile ? '100%' : (isSidebarOpen ? SIDEBAR_WIDTH_DESKTOP : 0)
//                 }}
//                 transition={{ duration: 0.3, ease: 'easeInOut' }}
//                 className={`
//                     fixed inset-y-0 left-0 z-40 
//                     md:sticky md:top-0 md:h-screen 
//                     flex flex-col bg-[#152342] 
//                     transition-shadow duration-300 ease-in-out
//                     w-full max-w-xs sm:max-w-sm md:w-72
//                 `}
//                 style={{
//                     width: isMobile ? '100%' : (isSidebarOpen ? SIDEBAR_WIDTH_DESKTOP : 0),
//                     overflow: isMobile || isSidebarOpen ? 'auto' : 'hidden',
//                 }}
//             >
//                 {/* Sidebar Header and Toggle */}
//                 <div className="flex items-center justify-between mb-4 p-4 shrink-0 border-b border-gray-700">
//                     <h1 className="text-2xl font-bold text-teal-400">
//                         <FaChartLine className="inline mr-2" /> Modules
//                     </h1>
//                     {/* Universal Close Button */}
//                     <button
//                         onClick={() => setIsSidebarOpen(false)}
//                         className="text-white p-2 rounded hover:bg-gray-700 ml-auto"
//                         title="Close Sidebar"
//                     >
//                         <FaTimes size={20} />
//                     </button>
//                 </div>

//                 {/* Sidebar content */}
//                 <div
//                     className={`flex-1 flex flex-col p-4 pt-0 overflow-hidden transition-opacity duration-300 ${isSidebarOpen ? "opacity-100" : "opacity-0"}`}
//                     style={{ minWidth: isSidebarOpen ? SIDEBAR_WIDTH_DESKTOP - 32 : 0 }}
//                 >
//                     <div className="text-sm font-semibold text-gray-400 mb-2 shrink-0">
//                         Drag to reorder dashboard layout.
//                     </div>
//                     <hr className="border-gray-700 mb-4 shrink-0" />
                    
//                     <Reorder.Group
//                         axis="y"
//                         values={queries}
//                         onReorder={(newOrder) => {
//                             setQueries(newOrder);
//                             api.post("/dashboard/reorder-modules", {
//                                 order: newOrder.map((q, idx) => ({ id: q.userQueryId, position: idx }))
//                             });
//                         }}
//                         className="space-y-2 flex-1 overflow-y-auto pr-2"
//                     >
//                         <AnimatePresence>
//                             {queries.length === 0 ? (
//                                 <li className="text-gray-500 text-center md:text-left list-none p-4 bg-gray-800 rounded-lg">
//                                     No active modules.
//                                 </li>
//                             ) : (
//                                 queries.map((q) => (
//                                     <ReorderModuleItem key={q.userQueryId} q={q} executeQuery={executeQuery} />
//                                 ))
//                             )}
//                         </AnimatePresence>
//                     </Reorder.Group>

//                     {queries.length > 0 && (
//                         <>
//                             <hr className="my-4 border-gray-700 shrink-0" />
//                             <div className="mt-2 text-md text-gray-300 text-center font-bold shrink-0">
//                                 Total Modules: {queries.length}
//                             </div>
//                         </>
//                     )}
//                 </div>
//             </motion.aside>

//             {/* 4. Mobile Sidebar Backdrop (Only visible on mobile when open) */}
//             {isSidebarOpen && isMobile && (
//                 <div
//                     className="fixed inset-0 bg-black bg-opacity-50 z-30"
//                     onClick={() => setIsSidebarOpen(false)}
//                 />
//             )}

//             {/* 5. Main Content Area */}
//             <main
//                 className="flex-1 p-4 md:p-6 transition-all duration-300 relative"
//                 style={{
//                     marginLeft: !isMobile && isSidebarOpen ? mainContentMargin : 0,
//                     minHeight: '100vh', 
//                 }}
//             >
//                 {/* Dashboard Header/Banners */}
//                 <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                    
//                     {/* Menu Button & Title */}
//                     <div className="flex items-center">
//                         {!isSidebarOpen && (
//                             <button
//                                 onClick={() => setIsSidebarOpen(true)}
//                                 className="p-3 bg-[#152342] text-white rounded-lg hover:bg-gray-800 transition mr-4 shadow-lg"
//                                 title="Open Sidebar"
//                             >
//                                 <FaBars size={20} />
//                             </button>
//                         )}
//                         <h2 className="text-3xl font-bold text-gray-800">
//                             Live Business Dashboard
//                         </h2>
//                     </div>

//                     {/* Subscription Banners */}
//                     {showSubscriptionBanner && (
//                         <div className="w-full md:w-auto p-3 rounded-xl shadow-md bg-gradient-to-r from-blue-700 to-indigo-600 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
//                             <div className="flex items-center space-x-3">
//                                 <Calendar className="w-6 h-6 text-teal-300 shrink-0" />
//                                 <div>
//                                     <div className="text-sm font-semibold whitespace-nowrap">
//                                         Subscription Active: {totalDaysRemaining} days left
//                                     </div>
//                                     <div className="text-xs opacity-90">
//                                         {totalDaysRemaining === 1 ? `Expires in: ${countdown}` : `Expires ${subscriptionEnd?.toLocaleDateString('en-GB')}`}
//                                     </div>
//                                 </div>
//                             </div>
//                             <Link
//                                 to="/subscription/buy"
//                                 className="bg-white text-indigo-700 font-semibold px-4 py-1.5 rounded-lg shadow-lg transition hover:bg-gray-200 w-full sm:w-auto text-center text-sm"
//                             >
//                                 Renew / Upgrade
//                             </Link>
//                         </div>
//                     )}

//                     {showTrialBanner && (
//                         <div className="w-full md:w-auto p-3 rounded-xl shadow-md bg-yellow-600 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
//                             <div className="flex items-center space-x-3">
//                                 <AlertTriangle className="w-6 h-6 text-white shrink-0" />
//                                 <div>
//                                     <div className="text-sm font-semibold whitespace-nowrap">
//                                         FREE TRIAL: {trialDaysRemaining} days left
//                                     </div>
//                                     <div className="text-xs opacity-90">
//                                         {trialDaysRemaining === 1 ? `Time remaining: ${countdown}` : `Ends ${trialEnd?.toLocaleDateString('en-GB')}`}
//                                     </div>
//                                 </div>
//                             </div>
//                             <Link
//                                 to="/subscription/buy"
//                                 className="bg-white text-yellow-700 font-semibold px-4 py-1.5 rounded-lg shadow-lg transition hover:bg-gray-200 w-full sm:w-auto text-center text-sm"
//                             >
//                                 Upgrade Now
//                             </Link>
//                         </div>
//                     )}
//                 </div>

//                 {/* Module Grid Area */}
//                 {queries.length === 0 ? (
//                     <div className="text-gray-500 text-xl text-center py-20 bg-white rounded-xl shadow-lg">
//                         <FaExclamationTriangle className="inline w-8 h-8 mb-4 text-orange-400"/>
//                         <p>No active modules have been configured for your dashboard yet.</p>
//                         <p className="text-sm mt-2">Please contact your administrator for module setup.</p>
//                     </div>
//                 ) : (
//                     <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
//                         {queries.map((q) => {
//                             const data = results[q.userQueryId];
//                             // Check for undefined or null (loading state)
//                             const isDataLoading = data === undefined || data === null; 
//                             // isDataReady is true only if data is not loading AND data has elements
//                             const isDataReady = data !== undefined && data !== null && data.length > 0; 
                            
//                             const numRows = (data && data.length) || 0;
//                             const numColumns = (data && data.length > 0 && data[0] && Object.keys(data[0]).length) || 0; 
                            
//                             let spanClasses = "";
//                             let overflowClass = "overflow-auto";
//                             let limitHeight = true;

//                             // --- CRITICAL SPAN LOGIC (MODIFIED FOR 4-COLUMN BASE) ---
//                             // Default: 2 columns wide (half of the 4-column base)
//                             spanClasses = "sm:col-span-2"; 

//                             if (q.visualizationType === "table" || q.visualizationType === "heatmap") {
//                                 if (numRows > 10 && numColumns > 5) {
//                                     // HUGE DATA: Full Width (4 columns) AND Double Height (row-span-2)
//                                     spanClasses = "sm:col-span-2 lg:col-span-4 lg:row-span-2"; 
//                                     overflowClass = "overflow-auto";
//                                     limitHeight = false;
//                                 } else if (numRows > 10) {
//                                     // LONG DATA: Half Width (2 columns) AND Double Height (row-span-2)
//                                     spanClasses = "sm:col-span-2 lg:row-span-2";
//                                     overflowClass = "overflow-x-auto";
//                                     limitHeight = false;
//                                 } else if (numColumns > 5) {
//                                     // WIDE DATA: Full Width (4 columns)
//                                     spanClasses = "sm:col-span-2 lg:col-span-4";
//                                     overflowClass = "overflow-auto";
//                                     limitHeight = true;
//                                 }
//                             }
//                             // --- END CRITICAL SPAN LOGIC ---
                            
//                             // Export Functionality 
//                             const handleExport = () => {
//                                 if (data && data.length > 0) {
//                                     const ws = XLSX.utils.json_to_sheet(data);
//                                     const wb = XLSX.utils.book_new();
//                                     XLSX.utils.book_append_sheet(wb, ws, "Data");
//                                     const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
//                                     const blob = new Blob([wbout], { type: "application/octet-stream" });
//                                     saveAs(blob, `${q.userTitle || "data"}.xlsx`);
//                                 }
//                             };


//                             return (
//                                 <div
//                                     key={q.userQueryId}
//                                     className={`bg-white rounded-xl shadow-lg p-5 flex flex-col hover:shadow-xl transition ${spanClasses} h-auto min-h-[300px]`}
//                                 >
//                                     <div className="flex items-start justify-between mb-3 border-b pb-2">
//                                         <h3 className="font-extrabold text-lg sm:text-xl truncate mr-2 text-indigo-700">
//                                             {q.userTitle || "Untitled Module"}
//                                         </h3>
//                                         <div className="flex gap-2">
//                                             {(q.visualizationType === "table" || q.visualizationType === "heatmap") && (
//                                                 <button
//                                                     onClick={handleExport}
//                                                     title="Export Data to Excel"
//                                                     disabled={!isDataReady} 
//                                                     className="p-2 bg-green-600 text-white rounded-full hover:bg-green-700 disabled:bg-gray-400 flex items-center justify-center shrink-0 shadow-md"
//                                                 >
//                                                     <FaFileExcel size={16} />
//                                                 </button>
//                                             )}
//                                             <button
//                                                 onClick={() => executeQuery(q.userQueryText, q.userQueryId)}
//                                                 title="Manual Refresh"
//                                                 className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 flex items-center justify-center shrink-0 shadow-md"
//                                             >
//                                                 <RefreshCcw size={16} />
//                                             </button>
//                                         </div>
//                                     </div>

//                                     {/* Chart / Table area */}
//                                     <div className={`flex-1 ${overflowClass} flex items-center justify-center ${limitHeight ? "max-h-[500px]" : ""}`}>
//                                         {/* Loading State */}
//                                         {isDataLoading ? (
//                                             <div className="text-gray-500 text-md flex items-center gap-2">
//                                                 <RefreshCcw className="w-5 h-5 animate-spin" /> Loading Data...
//                                             </div>
//                                         ) : data.length > 0 ? (
//                                             <ModuleChart
//                                                 data={data}
//                                                 type={q.visualizationType}
//                                                 isApprovalModule={q.isApprovalModule || false}
//                                                 approvalIdColumn={q.approvalIdColumn || ""}
//                                                 queryId={q.userQueryId}
//                                                 userId={userId}
//                                                 onRefresh={() => executeQuery(q.userQueryText, q.userQueryId)}
//                                                 limitHeight={limitHeight}
//                                             />
//                                         ) : (
//                                             <p className="text-gray-400 text-md text-center py-10">
//                                                 No data returned for this module.
//                                             </p>
//                                         )}
//                                     </div>
//                                 </div>
//                             );
//                         })}
//                     </div>
//                 )}
//             </main>
//         </div>
//     );
// }