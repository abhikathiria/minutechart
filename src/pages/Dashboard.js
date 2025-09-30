import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import ModuleChart from "../components/modules/ModuleChart";
import PlanPage from "./PlanPage";

export default function Dashboard() {
  const [queries, setQueries] = useState([]);
  const [results, setResults] = useState({});
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);

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

  if (subscriptionStatus?.activePlans?.length > 0) {
    const now = new Date();
    totalDaysRemaining = subscriptionStatus.activePlans.reduce((sum, plan) => {
      const start = new Date(plan.subscriptionStart);
      const end = new Date(plan.subscriptionEnd);

      // Only count if subscription is currently active
      if (start <= now && end >= now) {
        const remaining = Math.max(Math.ceil((end - now) / (1000 * 60 * 60 * 24)), 0);
        return sum + remaining;
      }

      return sum;
    }, 0);
  }

  let trialDaysRemaining = 0;

  if (subscriptionStatus?.isTrialActive && subscriptionStatus?.trialEnd) {
    const now = new Date();
    const trialEnd = new Date(subscriptionStatus.trialEnd);
    trialDaysRemaining = Math.max(Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24)), 0);
  }

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
      <aside className="w-full md:w-72 border-b md:border-b-0 md:border-r p-4 bg-[#152342FF]">
        <h1 className="text-2xl font-bold text-white mb-4 text-center md:text-left">
          📊 Dashboard
        </h1>
        <div className="text-lg text-white font-semibold mb-2 text-center md:text-left">
          Your Modules
        </div>
        <hr className="border-black mb-4" />

        <ul className="space-y-2">
          {queries.length === 0 && (
            <li className="text-gray-500 text-center md:text-left">
              No modules available.
            </li>
          )}
          {queries.map((q) => (
            <li
              key={q.userQueryId}
              className="p-3 bg-gray-100 rounded-lg shadow-sm hover:bg-blue-50 hover:shadow-md transition cursor-default"
            >
              <div className="font-semibold">
                {q.userTitle || "Untitled Module"}
              </div>
              <div className="text-sm text-gray-800 capitalize">
                {q.visualizationType} Chart
              </div>
            </li>
          ))}
        </ul>

        {queries.length > 0 && (
          <>
            <hr className="my-4 border-white" />
            <div className="mt-4 text-xl text-white text-center font-bold">
              Total Modules: {queries.length}
            </div>
          </>
        )}
      </aside>

      {/* Main content */}
      <main className="flex-1 p-4 md:p-6">
        {showSubscriptionBanner && (
          <div className="w-full mb-6 p-4 rounded-xl shadow-md bg-gradient-to-r from-[#152342FF] to-[#0000FF] text-white flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-3xl">📅</span>
              <div>
                <div className="text-lg font-semibold">
                  {totalDaysRemaining} day{totalDaysRemaining > 1 ? "s" : ""} left
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
                  {trialDaysRemaining} day{trialDaysRemaining > 1 ? "s" : ""} left in trial
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {queries.map((q) => (
              <div
                key={q.userQueryId}
                className="bg-white rounded-xl shadow-lg p-4 flex flex-col hover:shadow-xl transition overflow-hidden"
              >
                <h3 className="font-semibold text-lg sm:text-xl text-center mb-3">
                  {q.userTitle || "Untitled Module"}
                </h3>
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
