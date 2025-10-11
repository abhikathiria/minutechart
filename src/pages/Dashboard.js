import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import ModuleChart from "../components/modules/ModuleChart";
import PlanPage from "./PlanPage";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { FaGripVertical, FaFileExcel } from "react-icons/fa";
import { Reorder, motion, AnimatePresence } from "framer-motion";

export default function Dashboard() {
  const [queries, setQueries] = useState([]);
  const [results, setResults] = useState({});
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);
  const [countdown, setCountdown] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await api.get("/user/subscription-status");
        setSubscriptionStatus(res.data);

        if (res.data?.hasActivePlan) {
          loadQueries();
        }
      } catch (err) {
        console.error("Failed to fetch subscription status", err);
        setSubscriptionStatus({ hasActivePlan: false });
      }
    };

    fetchStatus(); // initial fetch
    const interval = setInterval(fetchStatus, 10000); // every 10s

    return () => clearInterval(interval); // cleanup on unmount
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setSubscriptionStatus((prev) => ({ ...prev })); // trigger a re-render
    }, 1000); // update every second

    return () => clearInterval(timer);
  }, []);

  // Calculate total subscription days remaining
  let totalDaysRemaining = 0;
  let subscriptionEnd = null;

  if (subscriptionStatus?.activePlans?.length > 0) {
    const now = new Date();
    totalDaysRemaining = subscriptionStatus.activePlans.reduce((sum, plan) => {
      const start = new Date(plan.subscriptionStart);
      const end = new Date(plan.subscriptionEnd);

      // Only count if subscription is currently active
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

    if (
      target &&
      ((totalDaysRemaining === 1 && !trialEnd) ||
        (trialDaysRemaining === 1 && trialEnd))
    ) {
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

        setCountdown(
          `${hours.toString().padStart(2, "0")}:${minutes
            .toString()
            .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
        );
      };

      updateCountdown();
      timer = setInterval(updateCountdown, 1000);
    }

    return () => clearInterval(timer);
  }, [totalDaysRemaining, trialDaysRemaining, subscriptionEnd, trialEnd]);


  const now = new Date();
  const subscriptionStart = subscriptionStatus?.subscriptionStart
    ? new Date(subscriptionStatus.subscriptionStart)
    : null;

  const showSubscriptionBanner = totalDaysRemaining > 0;

  const showTrialBanner = trialDaysRemaining > 0 && !showSubscriptionBanner;

  const loadQueries = async () => {
    try {
      const res = await api.get("/dashboard/queries");
      const list = res.data || [];
      setQueries(list);

      for (const q of list) {
        if (!results[q.userQueryId]) {
          await executeQuery(q.userQueryText, q.userQueryId);
        }
      }
    } catch (err) {
      console.error("Failed to load queries", err);
      setQueries([]);
    }
  };

  const executeQuery = async (queryText, queryId) => {
    try {
      const res = await api.post("/dashboard/execute-query", { sql: queryText });
      if (res.data?.success) {
        setResults((prev) => ({ ...prev, [queryId]: res.data.data }));
      } else {
        setResults((prev) => ({ ...prev, [queryId]: [] }));
      }
    } catch (err) {
      console.error("Error executing query", err);
      setResults((prev) => ({ ...prev, [queryId]: [] }));
    }
  };

  // Show loading while checking subscription
  if (subscriptionStatus === null) {
    return <div className="text-center p-8">Checking subscription...</div>;
  }

  // Show plan page if no active trial or subscription
  if (!subscriptionStatus.hasActivePlan) {
    return <PlanPage status={subscriptionStatus} />;
  }

  // Render dashboard if trial or subscription is active
  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside
        className={`relative flex flex-col bg-[#152342FF] border-b md:border-b-0 md:border-r
        transition-[width] duration-500 ease-in-out overflow-hidden
        ${isSidebarOpen ? "w-full md:w-72" : "w-16 md:w-16"}`}
      >
        {/* Header with toggle button */}
        <div className="flex items-center justify-between mb-4 relative px-2 mt-2">
          <h1
            className={`text-2xl font-bold text-white transition-opacity duration-300 ${isSidebarOpen ? "opacity-100" : "opacity-0"
              }`}
          >
            📊 Dashboard
          </h1>

          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="absolute right-5 text-white py-1 rounded transition-all duration-300"
            title={isSidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}
            style={{
              transform: isSidebarOpen ? "translateX(50%)" : "translateX(20%)",
              transition: "transform 0.4s ease",
              fontSize: "1.5rem",
              padding: "0.6rem 0.8rem",
            }}
          >
            {isSidebarOpen ? "⏪" : "⏩"}
          </button>
        </div>

        {/* Sidebar content */}
        <div
          className={`transition-all duration-500 ease-in-out flex-1 flex flex-col ${isSidebarOpen
            ? "opacity-100 translate-x-0"
            : "opacity-0 -translate-x-10 pointer-events-none"
            }`}
        >
          <div className="text-lg text-white font-semibold mb-2 text-center md:text-left">
            Your Modules
          </div>
          <hr className="border-black mb-4" />
          <ul className="space-y-2 max-h-[70vh] overflow-auto pr-2">
            {queries.length === 0 && (
              <li className="text-gray-500 text-center md:text-left">
                No modules available.
              </li>
            )}
            <Reorder.Group
              axis="y"
              values={queries}
              onReorder={(newOrder) => {
                setQueries(newOrder);
                api.post("/dashboard/reorder-modules", {
                  order: newOrder.map((q, idx) => ({ id: q.userQueryId, position: idx }))
                });
              }}
              className="space-y-2 max-h-[70vh] overflow-auto pr-2"
            >
              <AnimatePresence>
                {queries.map((q) => (
                  <Reorder.Item
                    key={q.userQueryId}
                    value={q}
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="flex items-center gap-3 p-3 bg-gray-100 rounded-lg shadow-sm hover:bg-blue-50 hover:shadow-md transition cursor-grab"
                  >
                    {/* Drag handle */}
                    <FaGripVertical className="text-gray-400 cursor-grab" />

                    {/* Module info */}
                    <div className="flex flex-col">
                      <div className="font-semibold">{q.userTitle || "Untitled Module"}</div>
                      <div className="text-sm text-gray-800 capitalize">
                        {q.visualizationType} Chart
                      </div>
                    </div>
                  </Reorder.Item>
                ))}
              </AnimatePresence>
            </Reorder.Group>
          </ul>

          {queries.length > 0 && (
            <>
              <hr className="my-4 border-white" />
              <div className="mt-4 text-xl text-white text-center font-bold">
                Total Modules: {queries.length}
              </div>
            </>
          )}
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-4 md:p-6 transition-all duration-300">
        {showSubscriptionBanner && (
          <div className="w-full mb-6 p-4 rounded-xl shadow-md bg-gradient-to-r from-[#152342FF] to-[#0000FF] text-white flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-3xl">📅</span>
              <div>
                <div className="text-lg font-semibold">
                  {totalDaysRemaining === 1 && countdown
                    ? `Time left: ${countdown}`
                    : `${totalDaysRemaining} day${totalDaysRemaining > 1 ? "s" : ""
                    } left`}
                </div>
                <div className="text-sm opacity-90">
                  Keep exploring your dashboards and modules!
                </div>
              </div>
            </div>
            <Link
              to="/subscription/buy"
              className="bg-white text-[#0000ff] font-semibold px-4 py-2 rounded-lg shadow transition transform hover:scale-110 hover:shadow-lg"
            >
              Renew / Upgrade
            </Link>
          </div>
        )}

        {showTrialBanner && (
          <div className="w-full mb-6 p-4 rounded-xl shadow-md bg-gradient-to-r from-[#1E3A8A] to-[#3B82F6] text-white flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-3xl">🎁</span>
              <div>
                <div className="text-lg font-semibold">
                  {trialDaysRemaining === 1 && countdown
                    ? `Time left: ${countdown}`
                    : `${trialDaysRemaining} day${trialDaysRemaining > 1 ? "s" : ""
                    } left in trial`}
                </div>
                <div className="text-sm opacity-90">
                  Enjoy full access during your trial period!
                </div>
              </div>
            </div>
            <Link
              to="/subscription/buy"
              className="bg-white text-[#1E3A8A] font-semibold px-4 py-2 rounded-lg shadow transition transform hover:scale-110 hover:shadow-lg"
            >
              Upgrade Now
            </Link>
          </div>
        )}

        {queries.length === 0 ? (
          <div className="text-gray-600 text-lg text-center md:text-left">
            No modules available to view.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6">
            {queries.map((q) => (
              <div
                key={q.userQueryId}
                className="bg-white rounded-xl shadow-lg p-4 flex flex-col hover:shadow-xl transition overflow-hidden"
              >
                {/* Title row with optional download button */}
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-lg sm:text-xl">
                    {q.userTitle || "Untitled Module"}
                  </h3>
                  {(q.visualizationType === "table" || q.visualizationType === "heatmap") && (
                    <button
                      onClick={() => {
                        if (results[q.userQueryId]?.length > 0) {
                          // Trigger export directly here
                          const XLSX = require("xlsx");
                          const { saveAs } = require("file-saver");
                          const ws = XLSX.utils.json_to_sheet(results[q.userQueryId]);
                          const wb = XLSX.utils.book_new();
                          XLSX.utils.book_append_sheet(wb, ws, "Data");
                          const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
                          const blob = new Blob([wbout], { type: "application/octet-stream" });
                          saveAs(blob, `${q.userTitle || "data"}.xlsx`);
                        }
                      }}
                      title="Export Table"
                      className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center"
                    >
                      <FaFileExcel size={20} />
                    </button>
                  )}
                </div>

                {/* Chart / Table area */}
                <div className="flex-1 overflow-auto">
                  {results[q.userQueryId]?.length > 0 ? (
                    <ModuleChart
                      data={results[q.userQueryId]}
                      type={q.visualizationType}
                    />
                  ) : (
                    <p className="text-gray-400 text-sm text-center">
                      No data available.
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
