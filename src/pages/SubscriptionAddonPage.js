// SubscriptionAddonPage.jsx (FINAL FIXED VERSION)
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaTimes, FaArrowRight, FaSpinner } from "react-icons/fa";
import api from "../api";
import PropTypes from "prop-types";
import { Loader2 } from "lucide-react";

// Colors
const PRIMARY = "#4F46E5";
const ACCENT = "#9D4EDD";

/* Motion variants */
const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.04, duration: 0.45 },
  }),
};
const modalBackdrop = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

/* Neon Button */
function NeonButton({ children, onClick, className = "", ariaLabel, disabled = false }) {
  return (
    <button
      onClick={onClick}
      aria-label={ariaLabel}
      disabled={disabled}
      className={`relative inline-flex items-center justify-center px-5 py-2 rounded-xl font-semibold transition transform active:scale-95 select-none ${className} ${disabled ? "opacity-50 cursor-not-allowed" : "shadow-[0_8px_30px_rgba(0,240,255,0.12)]"
        }`}
    >
      {children}
      {!disabled && (
        <motion.span
          className="absolute inset-0 rounded-xl pointer-events-none"
          animate={{ opacity: [0.06, 0.18, 0.06], scale: [1, 1.02, 1] }}
          transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
        />
      )}
    </button>
  );
}

function AddonCard({ addon, onRenew }) {

  // Time Utility
  const getIndianTime = useCallback(
    () => new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
    []
  );

  // Date Formatter (keeps India timezone)
  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    try {
      return new Date(dateStr).toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };
  return (
    <motion.li
      layout
      initial="hidden"
      animate="visible"
      variants={fadeUp}
      className="relative p-4 rounded-xl bg-[#0b0d10]/60 border border-transparent hover:border-[rgba(0,240,255,0.08)] transition-all duration-300"
    >
      <div className="flex justify-between items-start gap-4">
        <div>
          <div className="text-sm text-white/85 font-semibold">+{addon.dashboards} dashboards</div>
          <div className="text-xs text-white/50 mt-1">Expires: {formatDate(addon.endDate)}</div>
          {addon.PricingName && (
            <div className="text-xs text-white/40 mt-2">{addon.pricingName}</div>
          )}
        </div>

        <div className="text-right flex flex-col items-end gap-2">
          <div className="text-lg font-bold text-white">₹{addon.price}</div>
          <div className="text-xs text-white/50">
            Purchased: {formatDate(addon.startDate)}
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="text-xs font-mono text-white/40">ID: {addon.id}</div>
        <button
          onClick={() => onRenew(addon)}
          className="px-3 py-2 rounded-md bg-transparent border border-white/6 text-white/90 text-sm hover:bg-white/3 transition"
        >
          Renew
        </button>
      </div>

      <span
        aria-hidden
        className="absolute left-0 top-2 bottom-2 w-1 rounded-r-md"
        style={{
          background: `linear-gradient(180deg, ${PRIMARY} 0%, ${ACCENT} 100%)`,
          opacity: 0.16,
        }}
      />
    </motion.li>
  );
}
AddonCard.propTypes = { addon: PropTypes.object.isRequired, onRenew: PropTypes.func };

function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;

  const windowSize = 5;
  let start = Math.max(1, page - Math.floor(windowSize / 2));
  let end = Math.min(totalPages, start + windowSize - 1);
  if (end - start < windowSize - 1) start = Math.max(1, end - windowSize + 1);

  const pages = [];
  for (let i = start; i <= end; i++) pages.push(i);

  return (
    <nav className="flex items-center justify-center gap-3 mt-6">
      <button
        className="px-3 py-1 rounded-md text-sm bg-transparent border border-white/6 hover:bg-white/3 disabled:opacity-40"
        onClick={() => onChange(Math.max(1, page - 1))}
        disabled={page === 1}
      >
        Prev
      </button>

      {pages.map((p) => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className={`px-3 py-1 rounded-md text-sm font-semibold ${p === page
              ? "bg-gradient-to-r from-[#00F0FF] to-[#9D4EDD] text-[#080C16] shadow-lg"
              : "bg-transparent border border-white/6"
            }`}
        >
          {p}
        </button>
      ))}

      <button
        className="px-3 py-1 rounded-md text-sm bg-transparent border border-white/6 hover:bg-white/3 disabled:opacity-40"
        onClick={() => onChange(Math.min(totalPages, page + 1))}
        disabled={page === totalPages}
      >
        Next
      </button>
    </nav>
  );
}

export default function SubscriptionAddonPage() {
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState(null);
  const [addons, setAddons] = useState([]);
  const [toast, setToast] = useState(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const [page, setPage] = useState(1);
  const PER_PAGE = 6;

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    try {
      setLoading(true);
      const [planRes, addonRes] = await Promise.all([
        api.get("/user/current-plan"),
        api.get("/user/addons"),
      ]);

      const planData = planRes.data;
      setPlan(planData && planData.hasPlan ? planData : null);
      setAddons(Array.isArray(addonRes.data) ? addonRes.data : []);
    } catch (err) {
      setToast({ type: "error", text: "Failed to load subscription data" });
    } finally {
      setLoading(false);
    }
  }

  // corrected naming
  const addonDashboards =
    plan?.addonDashboards ||
    plan?.AddonDashboards ||
    0;

  const addonPrice =
    plan?.addonPrice ||
    plan?.AddonPrice ||
    0;

  const canBuyAddon = Boolean(plan?.dashboardAddonEnabled);
  const baseLimit = plan?.dashboardLimit || plan?.DashboardLimit || 0;

  const totalDashboards = plan?.totalDashboards || plan?.TotalDashboards || 0;

  const totalPages = Math.max(1, Math.ceil(addons.length / PER_PAGE));
  const pagedAddons = useMemo(() => {
    const start = (page - 1) * PER_PAGE;
    return addons.slice(start, start + PER_PAGE);
  }, [addons, page]);

  const loadRazorpay = () =>
    new Promise((resolve) => {
      if (window.Razorpay) return resolve(true);
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });

  function openBuyModal() {
    setIsModalOpen(true);
  }

  async function handleBuyFlow() {
    if (!plan) {
      setToast({ type: "error", text: "No active plan found." });
      return;
    }

    setIsProcessing(true);

    try {
      const orderRes = await api.post("/user/create-order", {
        pricingId: plan.planId, // FINAL FIX
      });

      const { orderId, key, amount, currency } = orderRes.data;

      const loaded = await loadRazorpay();
      if (!loaded) {
        setToast({ type: "error", text: "Failed to load Razorpay." });
        setIsProcessing(false);
        return;
      }

      const options = {
        key,
        amount,
        currency,
        name: "NGraph",
        description: `Add ${addonDashboards} dashboards`,
        order_id: orderId,
        handler: async function (response) {
          setIsVerifying(true);
          try {
            await api.post("/user/verify", {
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
            });
            setToast({ type: "success", text: "Payment successful!" });
            await loadAll();
            setIsModalOpen(false);
          } catch {
            setToast({ type: "error", text: "Payment verification failed." });
          } finally {
            setTimeout(() => setIsVerifying(false), 500);
          }
        },
        theme: { color: PRIMARY },
        modal: {
          ondismiss: () => {
            setIsProcessing(false);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      setToast({
        type: "error",
        text: err?.response?.data?.message || "Failed to initiate payment.",
      });
    } finally {
      setIsProcessing(false);
    }
  }

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(t);
  }, [toast]);

  return (
    <div className="min-h-screen pb-20 bg-[#080C16] text-white font-sans relative overflow-x-hidden">

      {/* header */}
      <header className="pt-20 pb-8 px-4 max-w-6xl mx-auto">
        <motion.div initial="hidden" animate="visible" variants={fadeUp}>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white/95">
            Manage Add-ons
          </h1>
          <p className="text-white/60 mt-2 max-w-2xl">
            Increase your dashboard capacity and purchase add-on packs.
          </p>
        </motion.div>
      </header>

      <main className="max-w-6xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* PLAN CARD */}
        <section className="lg:col-span-1 bg-[#0b0d10]/60 border border-white/6 rounded-2xl p-6 shadow-lg backdrop-blur-sm">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-xl font-bold text-white">Active Plan</h3>
              <p className="text-white/70 mt-1">{plan?.name ?? "No active plan"}</p>
            </div>

            <div className="text-right">
              <div className="text-sm text-white/40">Dashboards</div>
              <div className="text-2xl font-semibold text-white">{totalDashboards}</div>
            </div>
          </div>

          <ul className="mt-6 space-y-3 text-sm text-white/70">
            <li>Base Dashboards: {baseLimit}</li>
            <li>Add-ons active: {addons.length}</li>
            <li>Refresh Rate: {plan?.refreshRateMinutes} min</li>
          </ul>

          <div className="mt-6">
            <NeonButton
              onClick={openBuyModal}
              ariaLabel="Purchase add-on"
              disabled={!canBuyAddon}
              className={`w-full ${canBuyAddon
                  ? "bg-gradient-to-r from-[#00F0FF] to-[#9D4EDD] text-[#080C16]"
                  : "bg-transparent border border-white/6 text-white/50"
                }`}
            >
              {canBuyAddon
                ? `Add ${addonDashboards} Dashboards — ₹${addonPrice}`
                : "Add-ons not available"}
            </NeonButton>

            <button
              onClick={loadAll}
              className="mt-3 w-full px-4 py-2 rounded-xl bg-transparent border border-white/6 text-sm hover:bg-white/3 transition"
            >
              Refresh
            </button>
          </div>
        </section>

        {/* ADDON LIST */}
        <section className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Active Add-ons</h2>
            <div className="text-sm text-white/60">
              Showing {pagedAddons.length} of {addons.length}
            </div>
          </div>

          <div className="rounded-2xl p-4 border border-white/6">
            {loading ? (
              <div className="py-16 flex gap-2 items-center justify-center">
               <Loader2 className="animate-spin w-6 h-6" />
                <div className="text-white/60">Loading add-ons...</div>
              </div>
            ) : addons.length === 0 ? (
              <div className="py-16 text-center text-white/50">
                No add-ons purchased yet.
              </div>
            ) : (
              <>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {pagedAddons.map((a) => (
                    <AddonCard key={a.Id} addon={a} onRenew={() => openBuyModal()} />
                  ))}
                </ul>

                <Pagination page={page} totalPages={totalPages} onChange={setPage} />
              </>
            )}
          </div>
        </section>
      </main>

      {/* BUY MODAL */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            className="fixed inset-0 z-[10000] flex items-center justify-center px-4"
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={modalBackdrop}
          >
            <motion.div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => !isProcessing && setIsModalOpen(false)}
            />

            <motion.div
              initial={{ y: 10, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 8, opacity: 0, scale: 0.98 }}
              className="relative w-full max-w-md bg-white/6 border border-white/8 backdrop-blur-md rounded-2xl p-6 shadow-xl"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-xl font-bold text-white">Purchase Add-on Pack</h3>
                  <p className="text-white/60 text-sm mt-1">
                    Add {addonDashboards} dashboards — ₹{addonPrice}
                  </p>
                </div>
                <button
                  onClick={() => !isProcessing && setIsModalOpen(false)}
                  className="p-2 rounded-md text-white/60 hover:text-white"
                >
                  <FaTimes />
                </button>
              </div>

              <div className="mt-6 rounded-xl p-4 bg-white/4 border border-white/6 flex justify-between">
                <div>
                  <div className="text-sm text-white/50">Dashboards</div>
                  <div className="text-lg font-semibold text-white mt-1">{addonDashboards}</div>
                </div>

                <div className="text-right">
                  <div className="text-sm text-white/50">Price</div>
                  <div className="text-lg font-semibold text-white mt-1">₹{addonPrice}</div>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => !isProcessing && setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-transparent border border-white/6 text-white/80 hover:bg-white/3 transition"
                >
                  Cancel
                </button>

                <NeonButton
                  onClick={handleBuyFlow}
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#00F0FF] to-[#9D4EDD] text-[#080C16]"
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <span className="flex items-center gap-2">
                      <FaSpinner className="animate-spin" /> Processing
                    </span>
                  ) : (
                    <span>
                      Buy Add-on <FaArrowRight className="ml-2" />
                    </span>
                  )}
                </NeonButton>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* VERIFY OVERLAY */}
      <AnimatePresence>
        {isVerifying && (
          <motion.div
            className="fixed inset-0 z-[11000] flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="absolute inset-0 bg-black/60" />
            <motion.div className="relative z-10 p-8 bg-[#080C16] rounded-2xl border border-[#00F0FF]/30 shadow-2xl flex flex-col items-center gap-4">
              <svg
                className="animate-spin h-12 w-12 text-[#00F0FF]"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
              </svg>
              <div className="text-white font-medium">Verifying payment…</div>
              <div className="text-sm text-white/60">Do not close this window.</div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast */}
      <div className="fixed bottom-6 right-6 z-[12000]">
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ y: 16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 16, opacity: 0 }}
              className={`px-4 py-3 rounded-xl shadow-lg ${toast.type === "success" ? "bg-green-600" : "bg-red-600"
                } text-white`}
            >
              {toast.text}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
