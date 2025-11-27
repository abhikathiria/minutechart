import React, { useState, useEffect, useMemo } from "react";
import api from "../api";
import { toast } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  CircleDollarSign,
  FileText,
  ChevronDown,
  ChevronUp,
  Loader2,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

function AdminCommissionPage() {
  const [bills, setBills] = useState([]);
  const [expanded, setExpanded] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadingItems, setLoadingItems] = useState({});

  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 8;
  const [sortBy, setSortBy] = useState("newest");

  useEffect(() => {
    loadBills();
  }, []);

  const loadBills = () => {
    setLoading(true);
    api
      .get("/commission/my-bills")
      .then((res) => {
        setBills(res.data || []);
        setPage(1);
      })
      .catch(() => toast.error("Failed to load bills"))
      .finally(() => setLoading(false));
  };

  const approveBill = (id) => {
    api
      .put(`/commission/admin-approve/${id}`)
      .then(() => {
        toast.success("Bill approved");
        loadBills();
      })
      .catch(() => toast.error("Approval failed"));
  };

  const formatDate = (date) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString();
  };

  const loadBillDetails = async (billId) => {
    const bill = bills.find((b) => b.billId === billId);
    if (!bill) return;

    // already loaded
    if (bill.items && bill.items.length > 0) return;

    // avoid double loading
    if (loadingItems[billId]) return;

    setLoadingItems((s) => ({ ...s, [billId]: true }));

    try {
      const res = await api.get(`/commission/bills/${billId}`);
      const details = res.data;

      setBills((prev) =>
        prev.map((b) => (b.billId === billId ? { ...b, ...details } : b))
      );
    } catch {
      toast.error("Failed to load bill details");
    } finally {
      setLoadingItems((s) => ({ ...s, [billId]: false }));
    }
  };

  const toggleExpand = (id) => {
    const next = !expanded[id];
    setExpanded((x) => ({ ...x, [id]: next }));
    if (next) loadBillDetails(id);
  };

  // FILTER + SORT (immutably)
  const filtered = useMemo(() => {
    let list = [...bills];

    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((b) => {
        return (
          String(b.billId).toLowerCase().includes(q) ||
          (b.adminName || "").toLowerCase().includes(q) ||
          (b.status || "").toLowerCase().includes(q)
        );
      });
    }

    switch (sortBy) {
      case "newest":
        list.sort((a, z) => new Date(z.createdAt) - new Date(a.createdAt));
        break;

      case "oldest":
        list.sort((a, z) => new Date(a.createdAt) - new Date(z.createdAt));
        break;

      case "amount_desc":
        list.sort(
          (a, z) => Number(z.totalCommission) - Number(a.totalCommission)
        );
        break;

      case "amount_asc":
        list.sort(
          (a, z) => Number(a.totalCommission) - Number(z.totalCommission)
        );
        break;

      case "status_pending":
        list.sort((a, z) =>
          a.status === "Pending" ? -1 : z.status === "Pending" ? 1 : 0
        );
        break;

      case "status_paid":
        list.sort((a, z) =>
          a.status === "Paid" ? -1 : z.status === "Paid" ? 1 : 0
        );
        break;

      default:
        break;
    }

    return list;
  }, [bills, query, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#06070a] to-[#0b1220] p-6 md:p-10 text-white">
      <div className="max-w-6xl mx-auto">
        {/* HEADER */}
        <header className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/5 rounded-2xl">
              <CircleDollarSign className="w-9 h-9 text-teal-300" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-teal-300 to-indigo-400">
                My Commission Bills
              </h1>
              <p className="text-gray-400 text-sm mt-1">
                View commissions, approve bills, and check item-wise details.
              </p>
            </div>
          </div>

          {/* FILTER BAR */}
          <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:flex-none">
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Search bills…"
                className="w-full md:w-80 px-4 py-2 rounded-xl bg-[#0f1724] border border-gray-700
                text-gray-200 placeholder-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
              />
              <Search className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
            </div>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 bg-[#0f1724] border border-gray-700 rounded-xl text-gray-200"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="amount_desc">Amount: High → Low</option>
              <option value="amount_asc">Amount: Low → High</option>
              <option value="status_pending">Pending First</option>
              <option value="status_paid">Paid First</option>
            </select>

            <button
              onClick={loadBills}
              className="px-4 py-2 bg-white/10 rounded-xl hover:bg-white/20"
            >
              Refresh
            </button>
          </div>
        </header>

        {/* LOADING */}
        {loading && (
          <div className="bg-white/5 border border-white/10 p-6 rounded-2xl shadow-lg flex items-center gap-4">
            <Loader2 className="animate-spin w-6 h-6" />
            <p className="text-white">Loading Bills...</p>
          </div>
        )}

        {/* EMPTY */}
        {!loading && filtered.length === 0 && (
          <div className="bg-white/5 border border-white/10 p-6 rounded-2xl text-center shadow-lg">
            <p className="text-gray-400 text-lg">No bills found.</p>
          </div>
        )}

        {/* BILL CARDS */}
        <div className="space-y-4 mt-6">
          {paginated.map((bill) => (
            <motion.div
              key={bill.billId}
              layout
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="bg-white/5 border border-white/10 rounded-2xl p-5 shadow-lg"
            >
              {/* TOP */}
              <div className="flex flex-col md:flex-row justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-indigo-300 flex-shrink-0" />
                    <h2 className="text-lg font-bold text-indigo-200">
                      Bill #{bill.billId}
                    </h2>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-4">
                    <div className="font-bold text-lg">
                      ₹{bill.totalCommission}
                    </div>

                    <span
                      className={`px-3 py-1 rounded-full text-sm font-semibold
                      ${
                        bill.status === "Pending"
                          ? "bg-yellow-100 text-yellow-800"
                          : bill.status === "Paid"
                          ? "bg-green-100 text-green-800"
                          : "bg-blue-100 text-blue-800"
                      }
                    `}
                    >
                      {bill.status}
                    </span>

                    <div className="text-sm text-gray-400">
                      {formatDate(bill.fromDate)} — {formatDate(bill.toDate)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {bill.status === "Pending" && (
                    <button
                      onClick={() => approveBill(bill.billId)}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg font-semibold"
                    >
                      Approve
                    </button>
                  )}

                  <button
                    onClick={() => toggleExpand(bill.billId)}
                    className="p-3 bg-white/10 rounded-full hover:bg-white/20"
                  >
                    {expanded[bill.billId] ? (
                      <ChevronUp className="w-5 h-5" />
                    ) : (
                      <ChevronDown className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* EXPANDED */}
              <AnimatePresence>
                {expanded[bill.billId] && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.24 }}
                    className="mt-4 border-t border-white/10 pt-4 w-full max-w-full overflow-x-hidden"
                  >
                    <div className="grid md:grid-cols-3 gap-4">
                      <div>
                        <p>
                          <strong>Created:</strong> {formatDate(bill.createdAt)}
                        </p>
                        <p>
                          <strong>Approved:</strong>{" "}
                          {formatDate(bill.approvedAt)}
                        </p>
                        <p>
                          <strong>Paid:</strong> {formatDate(bill.paidAt)}
                        </p>
                      </div>

                      <div className="md:col-span-2">
                        {loadingItems[bill.billId] ? (
                          <div className="flex items-center gap-3 py-6">
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span>Loading items…</span>
                          </div>
                        ) : bill.items && bill.items.length > 0 ? (
                          <div
                            className="mt-2 bg-white/5 p-3 border border-white/10 rounded-lg
                            w-full max-w-full overflow-x-auto overflow-y-auto max-h-64"
                          >
                            <table className="min-w-[480px] w-full text-sm">
                              <thead className="bg-white/5 sticky top-0">
                                <tr>
                                  <th className="p-2 text-left">User</th>
                                  <th className="p-2 text-left">Plan</th>
                                  <th className="p-2 text-right">Amount</th>
                                  <th className="p-2 text-right">Commission</th>
                                </tr>
                              </thead>

                              <tbody>
                                {bill.items.map((it) => (
                                  <tr
                                    key={it.purchaseId}
                                    className="border-t border-white/10"
                                  >
                                    <td className="p-2 truncate max-w-[140px]">
                                      {it.userName ||
                                        it.customerName ||
                                        it.companyName}
                                    </td>
                                    <td className="p-2 truncate max-w-[140px]">
                                      {it.planName}
                                    </td>
                                    <td className="p-2 text-right">
                                      ₹{it.amount}
                                    </td>
                                    <td className="p-2 text-right text-green-400">
                                      ₹{it.commissionAmount}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <p className="text-gray-400">
                            No items in this bill.
                          </p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>

        {/* PAGINATION */}
        {filtered.length > 0 && (
          <div className="mt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-gray-400 text-sm">
              Showing {filtered.length} results
            </div>

            <div className="flex items-center gap-3">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-2 rounded-lg bg-white/5 disabled:opacity-30"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="px-4 py-2 rounded-lg bg-white/5">
                Page {page} / {totalPages}
              </div>

              <button
                disabled={page === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-2 rounded-lg bg-white/5 disabled:opacity-30"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminCommissionPage;
