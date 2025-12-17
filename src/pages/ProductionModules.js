// src/pages/ProductionModules.jsx
import React, { useEffect, useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../api";
import {
  FaRegCopy,
  FaCog,
  FaUsers,
  FaEyeSlash,
  FaEye,
  FaSave,
  FaPlay,
  FaPlus,
  FaCheck,
  FaSearch
} from "react-icons/fa";

const COMPONENTS = [
  { id: "pa_kpi_grossproduction", title: "Gross Production KPI" },
  { id: "pa_kpi_netproduction", title: "Net Production KPI" },
  { id: "pa_kpi_grade", title: "Grade KPI" },
  { id: "pa_kpi_machines", title: "Machines KPI" },
  { id: "pa_kpi_items", title: "Items KPI" },
  { id: "pa_kpi_lots", title: "Lots KPI" },

  { id: "pa_pie_production", title: "Production Pie" },
  { id: "pa_line_month", title: "Month Wise (Line)" },
  { id: "pa_pie_grade", title: "Grade Pie" },

  { id: "pa_table_machine", title: "Machine Table" },
  { id: "pa_table_item", title: "Item Table" }
];

const Spinner = () => (
  <div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-300 border-t-indigo-500"></div>
);

function SqlTipBox() {
  return (
    <div className="p-3 mt-3 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-800">
      <div className="font-semibold mb-1">Tip: How to use filters in SQL</div>
      <p className="leading-relaxed">
        Use the following filter format in queries:
      </p>
      <pre className="mt-2 p-2 bg-white border rounded text-[11px] whitespace-pre-wrap">
        WHERE
        (@startDate IS NULL OR OrderDate &gt;= @startDate)
        AND (@endDate IS NULL OR OrderDate &lt;= @endDate)
      </pre>
      <p className="mt-2">
        These values come from dashboard filters. Use them in any query.
      </p>
    </div>
  );
}

export default function ProductionModules() {
  const { id: userId } = useParams();
  const [configMap, setConfigMap] = useState({});
  const [selected, setSelected] = useState(null);
  const [sqlText, setSqlText] = useState("");
  const [moduleTitle, setModuleTitle] = useState("");
  const [loadingList, setLoadingList] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState(null);
  const [message, setMessage] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [companyName, setCompanyName] = useState("");
  const [customerName, setCustomerName,] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [moduleToDelete, setModuleToDelete] = useState(null);
  const [returnPath, setReturnPath] = useState("/admin/users");
  const [editorCopied, setEditorCopied] = useState(false);
  const [listCopied, setListCopied] = useState({});
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [transferTargetUser, setTransferTargetUser] = useState("");
  const [transferCheckResult, setTransferCheckResult] = useState(null);
  const [transferLoading, setTransferLoading] = useState(false);

  // Batch selection & batch actions
  const [selectedModules, setSelectedModules] = useState([]); // array of component ids
  const [batchActionLoading, setBatchActionLoading] = useState(false);
  const [batchDeleteModalOpen, setBatchDeleteModalOpen] = useState(false);

  useEffect(() => {
    loadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  async function loadList() {
    setLoadingList(true);
    setMessage(null);
    try {
      const res = await api.get(`/productionmodules/list/${encodeURIComponent(userId)}`);
      setConfigMap(res.data || {});

      const viewerRes = await api.get("/account/me");
      const viewerRoles = viewerRes.data?.roles || [];

      // 🎯 FIX 1: Determine the correct return path based on the viewer's role
      if (viewerRoles.includes("SuperAdmin")) {
        setReturnPath("/superadmin/user-management");
      } else {
        setReturnPath("/admin/users");
      }

      const userRes = await api.get(`/admin/users`);
      const activeUsers = (userRes.data || []).filter((u) => u.accountStatus === "Active");
      setUsers(activeUsers);

      const user = (userRes.data || []).find((u) => u.id === userId);
      if (user) {
        setCompanyName(user.companyName || "Unknown Company");
        setCustomerName(user.customerName || "");
      } else {
        setCompanyName("Unknown Company");
        setCustomerName("");
      }
    } catch (err) {
      console.error("Failed to load production modules list", err);
      setConfigMap({});
      setMessage({ type: "error", text: "Failed to load components" });
      setCompanyName("Unknown Company");
      setCustomerName("");
    } finally {
      setLoadingList(false);
    }
  }

  // when selected or configMap changes, sync editor and title
  useEffect(() => {
    if (!selected) return;
    const cfg = configMap[selected] ?? null;
    setModuleTitle(cfg?.moduleTitle ?? "");
    setSqlText(cfg?.sqlQuery ?? "");
    setResults(null);
    // setMessage(null);
  }, [selected, configMap]);

  // auto-hide top message strip
  function showMessage(type, text, ttl = 3500) {
    setMessage({ type, text, visible: true });
    setTimeout(() => setMessage(null), ttl);
  }

  // helper date formatters (same style as UserModules)
  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");
    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
  };
  const formatShortDate = (dateStr) => {
    if (!dateStr) return "N/A";
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  async function handleTest() {
    if (!selected) return;
    setTesting(true);
    setResults(null);
    setMessage(null);

    try {
      const body = {
        componentId: selected,
        sqlQuery: sqlText
      };

      const res = await api.post(
        `/productionmodules/test-raw/${encodeURIComponent(userId)}`,
        body
      );

      if (res.data?.success) {
        setResults(res.data.data || []);
        showMessage("success", "Query tested successfully (preview below)");
      } else {
        showMessage("error", res.data?.message || "Execution returned no data");
      }
    } catch (err) {
      showMessage("error", err?.response?.data?.message || "Execution failed");
    } finally {
      setTesting(false);
    }
  }

  async function handleSave() {
    if (!selected) return;
    setSaving(true);
    setMessage(null);

    try {
      const payload = { componentId: selected, moduleTitle: moduleTitle, sqlQuery: sqlText };
      const res = await api.post(`/productionmodules/save/${encodeURIComponent(userId)}`, payload);
      if (res.data?.success) {
        await loadList();
        showMessage("success", "Saved successfully");
      } else {
        showMessage("error", res.data?.message ?? "Save failed");
      }
    } catch (err) {
      console.error("Save failed", err);
      showMessage("error", err?.response?.data?.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleTransferCheck() {
    if (!transferTargetUser) {
      showMessage("error", "Select a user to transfer modules to");
      return;
    }

    setTransferLoading(true);
    setTransferCheckResult(null);

    try {
      const res = await api.post("/productionmodules/transfer-modules", {
        sourceUserId: userId,
        targetUserId: transferTargetUser,
        moduleIds: selectedModules.map(id => configMap[id]?.id),
        action: "check"
      });

      setTransferCheckResult(res.data);
    } catch (err) {
      showMessage("error", "Check failed");
    } finally {
      setTransferLoading(false);
    }
  }

  async function handleTransferAction(action) {
    setTransferLoading(true);
    try {
      const res = await api.post("/productionmodules/transfer-modules", {
        sourceUserId: userId,
        targetUserId: transferTargetUser,
        moduleIds: selectedModules.map(id => configMap[id]?.id),
        action
      });

      if (res.data?.success) {
        showMessage("success", res.data.message || "Transfer completed");
        setTransferModalOpen(false);
        setTransferCheckResult(null);
        setSelectedModules([]);
      } else {
        showMessage("error", res.data?.message || "Transfer failed");
      }
    } catch (err) {
      showMessage("error", "Transfer error");
    } finally {
      setTransferLoading(false);
      loadList();
    }
  }

  async function handleToggleHide() {
    if (!selected) return;
    const cfg = configMap[selected];
    if (!cfg) {
      showMessage("error", "No saved module to hide/unhide");
      return;
    }
    setActionLoading(true);
    try {
      const id = cfg.id;
      const res = await api.post(`/productionmodules/toggle-hide/${id}`, { hide: !cfg.hideQuery });
      if (res.data?.success) {
        const updated = { ...configMap };
        updated[selected] = { ...updated[selected], hideQuery: !cfg.hideQuery, lastUpdated: new Date().toISOString() };
        setConfigMap(updated);
        showMessage("success", res.data.message ?? (cfg.hideQuery ? "Made visible" : "Hidden"));
      } else {
        showMessage("error", res.data?.message ?? "Failed to toggle visibility");
      }
    } catch (err) {
      console.error("Toggle hide failed", err);
      showMessage("error", "Toggle hide failed");
    } finally {
      setActionLoading(false);
    }
  }

  // open delete modal (styled) instead of window.confirm
  const confirmDelete = (compId) => {
    const cfg = configMap[compId];
    setModuleToDelete({ compId, cfg });
    setDeleteModalOpen(true);
  };

  async function handleDelete() {
    if (!moduleToDelete?.cfg) {
      showMessage("error", "Nothing to delete");
      setDeleteModalOpen(false);
      setModuleToDelete(null);
      return;
    }
    setActionLoading(true);
    try {
      const res = await api.delete(`/productionmodules/delete/${moduleToDelete.cfg.id}`);
      if (res.data?.success) {
        const updated = { ...configMap };
        updated[moduleToDelete.compId] = null;
        setConfigMap(updated);
        if (selected === moduleToDelete.compId) {
          setSqlText("");
          setResults(null);
        }
        // also remove from selectedModules if present
        setSelectedModules(prev => prev.filter(id => id !== moduleToDelete.compId));
        showMessage("success", "Deleted");
      } else {
        showMessage("error", res.data?.message ?? "Delete failed");
      }
    } catch (err) {
      console.error("Delete failed", err);
      showMessage("error", "Delete failed");
    } finally {
      setActionLoading(false);
      setDeleteModalOpen(false);
      setModuleToDelete(null);
    }
  }

  function copySqlToClipboard() {
    navigator.clipboard.writeText(sqlText || "");
    showMessage("success", "SQL copied to clipboard");
  }

  // filtered components by search term
  const filteredComponents = useMemo(() => {
    if (!searchTerm) return COMPONENTS;
    const lc = searchTerm.toLowerCase();
    return COMPONENTS.filter(c => c.title.toLowerCase().includes(lc) || c.id.toLowerCase().includes(lc));
  }, [searchTerm]);

  // Selection helpers
  const toggleSelectModule = (compId) => {
    setSelectedModules(prev => {
      if (prev.includes(compId)) return prev.filter(id => id !== compId);
      return [...prev, compId];
    });
  };
  const selectAll = () => {
    const compIds = filteredComponents.map(c => c.id);
    setSelectedModules(compIds);
  };
  const clearAllSelection = () => setSelectedModules([]);

  // batch actions: hide/unhide/delete (one-by-one calls - confirmed)
  const batchToggleHide = async (makeHide = true) => {
    if (selectedModules.length === 0) return;
    setBatchActionLoading(true);
    const failures = [];
    try {
      for (const compId of selectedModules) {
        const cfg = configMap[compId];
        if (!cfg) {
          failures.push({ compId, reason: "Not configured" });
          continue;
        }
        try {
          // call toggle for each saved record
          await api.post(`/productionmodules/toggle-hide/${cfg.id}`, { hide: makeHide });
          // update local map
          setConfigMap(prev => {
            const copy = { ...prev };
            copy[compId] = { ...copy[compId], hideQuery: makeHide, lastUpdated: new Date().toISOString() };
            return copy;
          });
        } catch (err) {
          console.error("toggle hide failed for", compId, err);
          failures.push({ compId, reason: err?.response?.data?.message || "API error" });
        }
      }
      if (failures.length === 0) {
        showMessage("success", `${makeHide ? "Hidden" : "Made visible"} selected modules`);
      } else {
        showMessage("error", `Some items failed: ${failures.length}`);
      }
    } finally {
      setBatchActionLoading(false);
      // keep selection so user can retry or clear
    }
  };

  const batchDelete = async () => {
    if (selectedModules.length === 0) return;
    setBatchActionLoading(true);
    const failures = [];
    try {
      for (const compId of selectedModules) {
        const cfg = configMap[compId];
        if (!cfg) {
          failures.push({ compId, reason: "Not configured" });
          continue;
        }
        try {
          await api.delete(`/productionmodules/delete/${cfg.id}`);
          setConfigMap(prev => {
            const copy = { ...prev };
            copy[compId] = null;
            return copy;
          });
          // if currently selected module was deleted, clear editor
          if (compId === selected) {
            setSqlText("");
            setResults(null);
            setSelected(null);
          }
        } catch (err) {
          console.error("delete failed for", compId, err);
          failures.push({ compId, reason: err?.response?.data?.message || "API error" });
        }
      }

      if (failures.length === 0) {
        showMessage("success", `Deleted ${selectedModules.length} modules`);
        setSelectedModules([]);
      } else {
        showMessage("error", `${failures.length} deletes failed`);
        // remove successful deletes from selection
        setSelectedModules(prev => prev.filter(id => configMap[id] && configMap[id] !== null));
      }
    } finally {
      setBatchActionLoading(false);
      setBatchDeleteModalOpen(false);
    }
  };

  // render list item using Tailwind, matching UserModules styling
  function renderListItem(comp) {
    const cfg = configMap[comp.id] ?? null;
    const active = selected === comp.id;
    const isChecked = selectedModules.includes(comp.id);

    return (
      <li
        key={comp.id}
        className={`p-3 rounded-xl transition-all border ${active ? "border-4 border-indigo-500 bg-indigo-50" : "border-gray-200 bg-white hover:shadow-lg"} ${cfg?.hideQuery ? "opacity-60 grayscale" : ""}`}
        onClick={() => setSelected(comp.id)}
      >
        <div className="flex justify-between items-start">
          <div className="flex items-start gap-3 min-w-0">
            <input
              type="checkbox"
              checked={isChecked}
              onChange={(e) => { e.stopPropagation(); toggleSelectModule(comp.id); }}
              onClick={(e) => e.stopPropagation()}
              className="w-4 h-4 mt-1 accent-indigo-600"
            />
            <div className="min-w-0">
              <div className="font-bold text-sm text-gray-900 truncate">{comp.title}</div>
              <div className="text-xs text-gray-500 mt-1 flex whitespace-nowrap text-[12px]">
                <span>Created: <span className="font-medium">{cfg?.createdAt ? formatShortDate(cfg.createdAt) : "N/A"}</span></span>
                <span className="px-1 text-gray-300">|</span>
                <span>Updated: <span className="font-medium">{cfg?.lastUpdated ? formatShortDate(cfg.lastUpdated) : "N/A"}</span></span>
              </div>
            </div>
          </div>

          <div className="ml-3 flex flex-col gap-2 items-end">
            {cfg ? (
              <div className="flex gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigator.clipboard.writeText(cfg.sqlQuery || "");

                    setListCopied(prev => ({ ...prev, [comp.id]: true }));
                    setTimeout(() => {
                      setListCopied(prev => ({ ...prev, [comp.id]: false }));
                    }, 2000);
                  }}
                  className="p-1 rounded-md border border-gray-200 bg-white hover:bg-gray-50 text-sm"
                >
                  {listCopied[comp.id] ? (
                    <FaCheck className="text-green-600" />
                  ) : (
                    <FaRegCopy />
                  )}
                </button>

                <button
                  onClick={(e) => { e.stopPropagation(); setSelected(comp.id); setSqlText(cfg.sqlQuery ?? ""); setModuleTitle(cfg.moduleTitle ?? ""); showMessage("info", "Loaded saved SQL into editor"); }}
                  title="Edit"
                  className="px-2 py-1 rounded-md bg-yellow-100 text-yellow-700 text-xs hover:bg-yellow-200"
                >
                  ✎
                </button>

                <button
                  onClick={(e) => { e.stopPropagation(); handleToggleHideSingle(comp.id); }}
                  title={cfg.hideQuery ? "Show" : "Hide"}
                  className={`px-2 py-1 rounded-md text-xs ${cfg.hideQuery ? "bg-gray-100 text-gray-700" : "bg-indigo-50 text-indigo-700"}`}
                >
                  {cfg.hideQuery ? <><FaEye /> </> : <><FaEyeSlash /></>}
                </button>
              </div>
            ) : (
              <div className="text-xs text-gray-400">—</div>
            )}
          </div>
        </div>
      </li>
    );
  }

  // helper to toggle hide for a single comp (uses same endpoint)
  const handleToggleHideSingle = async (compId) => {
    const cfg = configMap[compId];
    if (!cfg) {
      showMessage("error", "No saved module to hide/unhide");
      return;
    }
    setActionLoading(true);
    try {
      const res = await api.post(`/productionmodules/toggle-hide/${cfg.id}`, { hide: !cfg.hideQuery });
      if (res.data?.success) {
        setConfigMap(prev => {
          const copy = { ...prev };
          copy[compId] = { ...copy[compId], hideQuery: !cfg.hideQuery, lastUpdated: new Date().toISOString() };
          return copy;
        });
        showMessage("success", res.data.message ?? (!cfg.hideQuery ? "Hidden" : "Made visible"));
      } else {
        showMessage("error", res.data?.message ?? "Failed to toggle visibility");
      }
    } catch (err) {
      console.error("Toggle hide failed", err);
      showMessage("error", "Toggle hide failed");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 font-sans">
      {/* Global loader overlay */}
      {(loadingList || actionLoading || transferLoading || batchActionLoading) && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-[60]">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-indigo-500"></div>
        </div>
      )}
      {/* Header */}
      <header className="bg-white p-4 sm:p-6 border-b shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 max-w-7xl mx-auto">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-800 flex items-center gap-2">
              <FaCog className="text-indigo-600" /> Production Modules for <span className="text-indigo-600">{companyName}</span>
            </h1>
            {customerName && <p className="text-sm sm:text-lg text-gray-500 mt-1 ml-8">Customer Name: {customerName}</p>}
          </div>
          <Link
            to={`/user/${userId}/tools`}
            state={{ keepFilters: true }}
            className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg font-semibold hover:bg-indigo-200 transition-colors flex items-center gap-1 text-sm"
          >
            <FaUsers className="text-indigo-500" /> Back
          </Link>
        </div>
      </header>

      {/* Top message strip */}
      {/* {message?.text && (
        <div className={`p-3 text-center text-sm transition-opacity duration-500 z-40 ${message.type === "success" ? "bg-green-100 text-green-800 border-b-2 border-green-400" : message.type === "error" ? "bg-red-100 text-red-800 border-b-2 border-red-400" : "bg-blue-50 text-blue-800 border-b-2 border-blue-200"} ${message.visible ? "opacity-100" : "opacity-0"}`}>
          {message.text}
        </div>
      )} */}

      {/* Main content */}
      <div className="flex flex-1 flex-col lg:flex-row max-w-7xl mx-auto w-full p-4 sm:p-6 gap-6">
        {/* Left column */}
        <section className="flex-1 lg:w-4/12 flex flex-col space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 flex flex-col">
            <div className="flex justify-between items-center mb-4 border-b pb-3">
              <h2 className="text-xl font-bold text-gray-700">Production Modules ({COMPONENTS.length})</h2>
              <div className="flex items-center gap-3">
                <div className="text-sm text-gray-500">{selectedModules.length > 0 ? `Selected: ${selectedModules.length}` : null}</div>
                <button
                  onClick={() => {
                    if (selectedModules.length === filteredComponents.length) clearAllSelection();
                    else selectAll();
                  }}
                  className="px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-lg font-semibold hover:bg-indigo-200 transition-colors text-sm"
                >
                  {selectedModules.length === filteredComponents.length ? "Clear" : "Select All"}
                </button>
              </div>
            </div>

            {/* Batch action bar */}
            <div className="flex items-center gap-2 mb-4 p-3 bg-indigo-50 rounded-lg border border-indigo-200">
              <button
                onClick={() => batchToggleHide(true)}
                disabled={selectedModules.length === 0 || batchActionLoading}
                className="px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg text-sm disabled:opacity-50"
              >
                🙈 Hide Selected
              </button>
              <button
                onClick={() => batchToggleHide(false)}
                disabled={selectedModules.length === 0 || batchActionLoading}
                className="px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg text-sm disabled:opacity-50"
              >
                👁 Show Selected
              </button>
              <button
                onClick={() => {
                  if (selectedModules.length === 0) {
                    showMessage("error", "Select at least one module to transfer");
                    return;
                  }
                  setTransferModalOpen(true);
                }}
                disabled={selectedModules.length === 0}
                className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-sm disabled:opacity-50"
              >
                📤 Transfer Selected
              </button>
            </div>

            {/* Search */}
            <div className="relative mb-4">
              <input
                type="text"
                placeholder="Search components..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full p-2 pl-10 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
              />
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            </div>

            {/* Select list */}
            <div className="flex-1 overflow-y-auto max-h-[65vh] pr-2 -mr-2">
              {loadingList ? (
                <div className="text-center py-6 text-gray-500 flex justify-center">
                  <Spinner />
                </div>
              ) : (
                <ul className="space-y-3">
                  {filteredComponents.length === 0 ? (
                    <li className="text-center p-4 text-gray-500 bg-gray-100 rounded-lg">No components match your search.</li>
                  ) : filteredComponents.map(renderListItem)}
                </ul>
              )}
            </div>

            <div className="mt-4 text-xs text-gray-500">
              Tip: Click a component to edit SQL. Use the checkboxes for batch actions.
            </div>
          </div>
        </section>

        {/* Right column */}
        <aside className="lg:w-8/12 flex flex-col space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
            <div className="flex items-start gap-4 mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-800">{COMPONENTS.find(c => c.id === selected)?.title || "Select a component"}</h3>
                <p className="text-xs text-gray-500 mt-1">{selected}</p>
              </div>
            </div>

            {!selected ? (
              <div className="text-center p-8 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                <p className="text-gray-500 mb-2">Select a component from the left to manage its SQL module.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="lg:col-span-2">
                    <input
                      type="text"
                      placeholder="Module Title (shown in dashboard)"
                      value={moduleTitle}
                      onChange={(e) => setModuleTitle(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded focus:ring-indigo-500 focus:border-indigo-500 mb-2"
                    />

                    <label className="text-sm text-gray-600 mb-2 block">SQL Editor</label>
                    <div className="relative">
                      <textarea
                        value={sqlText}
                        onChange={(e) => setSqlText(e.target.value)}
                        placeholder={`Write SQL for ${selected}. Use named params: @startDate, @endDate`}
                        className="w-full min-h-[250px] p-3 font-mono text-sm rounded border border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                      />
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(sqlText || "");
                          setEditorCopied(true);
                          setTimeout(() => setEditorCopied(false), 2000);
                        }}
                        className="absolute top-2 right-2 p-2 text-indigo-600 hover:text-indigo-800 transition-colors rounded"
                      >
                        {editorCopied ? <FaCheck className="text-green-600" /> : <FaRegCopy />}
                      </button>
                    </div>

                    <div className="flex gap-3 mt-3">
                      <button
                        onClick={handleToggleHide}
                        disabled={actionLoading}
                        className={`px-3 py-2 rounded-md text-sm flex items-center gap-2 ${configMap[selected]?.hideQuery ? "bg-gray-100 text-gray-700" : "bg-indigo-50 text-indigo-700"}`}
                      >
                        {configMap[selected]?.hideQuery ? (<><FaEye /> Show</>) : (<><FaEyeSlash /> Hide</>)}
                      </button>
                      <button onClick={handleTest} disabled={testing} className={`px-3 py-2 rounded-md text-sm flex items-center gap-2 ${testing ? "bg-yellow-300" : "bg-yellow-100 hover:bg-yellow-200"}`}>
                        <FaPlay /> {testing ? "Running..." : "Test"}
                      </button>
                      <button onClick={handleSave} disabled={saving} className={`px-3 py-2 rounded-md text-sm font-semibold flex items-center gap-2 ${saving ? "bg-indigo-300 text-white" : "bg-indigo-600 text-white hover:bg-indigo-700"}`}>
                        <FaSave /> {saving ? "Saving..." : "Save"}
                      </button>
                      <button
                        onClick={() => {
                          setSelected(null);
                          setSqlText("");
                          setModuleTitle("");
                          setResults(null);
                        }}
                        className="px-3 py-2 rounded-md text-sm bg-gray-200 text-gray-700 hover:bg-gray-300"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>

                  {/* Results / Info column */}
                  <div className="space-y-3">
                    {/* Inline toast (inside right panel, above preview) */}
                    {message?.text && (
                      <div
                        className={`p-2 rounded text-xs mb-2 ${message.type === "success"
                          ? "bg-green-100 text-green-800 border border-green-300"
                          : message.type === "error"
                            ? "bg-red-100 text-red-800 border border-red-300"
                            : "bg-blue-100 text-blue-800 border border-blue-300"
                          }`}
                      >
                        {message.text}
                      </div>
                    )}
                    <div className="text-sm font-medium text-gray-700">Preview / Results</div>

                    {testing && <div className="p-3 rounded bg-yellow-50 text-sm text-gray-700">Running query...</div>}

                    {!results ? (
                      <div className="p-3 rounded bg-gray-50 text-sm text-gray-600">
                        {configMap[selected]
                          ? "No results yet. Click Test to run the saved SQL and preview rows."
                          : "This component is not configured yet. Saving SQL will make it available to users."
                        }

                        {/* Show SQL TIP only if no toast message is visible */}
                        {!message && <SqlTipBox />}
                      </div>
                    ) : Array.isArray(results) && results.length === 0 ? (
                      <div className="p-3 rounded bg-yellow-50 text-sm text-gray-600">Query executed but returned 0 rows.</div>
                    ) : (
                      <div className="max-h-60 overflow-auto border border-blue-50 rounded">
                        <table className="w-full text-sm">
                          <thead className="sticky top-0 bg-slate-50">
                            <tr>
                              {Object.keys(results[0] || {}).map(col => (
                                <th key={col} className="text-left px-3 py-2 border-b">{col}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {results.map((row, i) => (
                              <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                                {Object.keys(results[0]).map(col => (
                                  <td key={col} className="px-3 py-2 align-top break-words">{String(row[col] ?? "")}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>
      {transferModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-xl w-full max-w-lg">

            <h2 className="text-xl font-bold mb-4">Transfer Production Modules</h2>

            {/* STEP 1: Select target user */}
            {!transferCheckResult && (
              <>
                <label className="block text-sm mb-2 font-medium text-gray-700">
                  Transfer To User
                </label>

                <select
                  className="w-full border p-2 rounded mb-4"
                  value={transferTargetUser}
                  onChange={(e) => setTransferTargetUser(e.target.value)}
                >
                  <option value="">Select user</option>
                  {users
                    .filter(u => u.id !== userId)
                    .map(u => (
                      <option key={u.id} value={u.id}>
                        {u.companyName}
                      </option>
                    ))}
                </select>

                <button
                  onClick={handleTransferCheck}
                  disabled={transferLoading || !transferTargetUser}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg"
                >
                  {transferLoading ? (
                    <span className="flex items-center gap-2"><Spinner /> Checking...</span>
                  ) : (
                    "Check for duplicates"
                  )}
                </button>

                <button
                  onClick={() => setTransferModalOpen(false)}
                  className="ml-3 px-4 py-2 bg-gray-300 rounded-lg"
                >
                  Cancel
                </button>
              </>
            )}

            {/* STEP 2: Check Result */}
            {transferCheckResult && (
              <div>
                {transferCheckResult.duplicates?.length > 0 ? (
                  <>
                    <p className="text-red-600 mb-3">
                      {transferCheckResult.duplicates.length} duplicate modules found.
                    </p>

                    <ul className="mb-4 bg-gray-50 p-3 rounded border">
                      {transferCheckResult.duplicates.map(d => (
                        <li key={d.id} className="text-sm text-gray-700">
                          • {d.componentId} — {d.moduleTitle}
                        </li>
                      ))}
                    </ul>

                    <div className="flex gap-3">
                      <button
                        onClick={() => handleTransferAction("replace")}
                        className="px-4 py-2 bg-yellow-600 text-white rounded-lg"
                      >
                        {transferLoading ? <Spinner /> : "Replace Existing"}
                      </button>

                      <button
                        onClick={() => handleTransferAction("ignore")}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg"
                      >
                        {transferLoading ? <Spinner /> : "Ignore Duplicates"}
                      </button>

                      <button
                        onClick={() => handleTransferAction("cancel")}
                        className="px-4 py-2 bg-gray-300 rounded-lg"
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-green-600 mb-3">No duplicates found.</p>

                    <button
                      onClick={() => handleTransferAction("replace")}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg"
                    >
                      Transfer All
                    </button>

                    <button
                      onClick={() => setTransferModalOpen(false)}
                      className="ml-3 px-4 py-2 bg-gray-300 rounded-lg"
                    >
                      Close
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
