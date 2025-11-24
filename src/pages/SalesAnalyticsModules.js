// src/pages/SalesAnalyticsModules.jsx
import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../api";
import {
  FaRegCopy,
  FaCheck,
  FaTrashAlt,
  FaEyeSlash,
  FaEye,
  FaSave,
  FaPlay,
  FaPlus,
  FaChevronLeft
} from "react-icons/fa";

const COMPONENTS = [
  { id: "sa_kpi_clients", title: "Clients KPI" },
  { id: "sa_kpi_agents", title: "Agents KPI" },
  { id: "sa_kpi_invoices", title: "Invoices KPI" },
  { id: "sa_kpi_sales", title: "Sales KPI" },
  { id: "sa_kpi_qty", title: "Quantity KPI" },
  { id: "sa_kpi_rate", title: "Rate KPI" },

  { id: "sa_filter_client", title: "Client Filter" },
  { id: "sa_filter_consignee", title: "Consignee Filter" },
  { id: "sa_filter_agent", title: "Agent Filter" },
  { id: "sa_filter_product", title: "Product Filter" },

  { id: "sa_pie_branch", title: "Branch Pie" },
  { id: "sa_pie_costcenter", title: "Cost Center Pie" },
  { id: "sa_pie_channel", title: "Channel Pie" },

  { id: "sa_map_sales", title: "Sales Map" },
  { id: "sa_line_sales_qty", title: "Sales vs Qty (Line)" },

  { id: "sa_table_book", title: "Book Table" },
  { id: "sa_table_category", title: "Category Table" },
  { id: "sa_table_product", title: "Product Table" },
  { id: "sa_table_client", title: "Client Table" },
  { id: "sa_table_delivery", title: "Delivery Table" },
  { id: "sa_table_agent", title: "Agent Table" }
];

const PDF_REF = "/mnt/data/Meera_Group_-_MIS_Report.pdf";

export default function SalesAnalyticsModules() {
  const { id: userId } = useParams(); // expects route like /user/:id/sales-analytics or admin linking
  const [configMap, setConfigMap] = useState({}); // componentId -> config object or null
  const [selected, setSelected] = useState(null); // componentId
  const [sqlText, setSqlText] = useState("");
  const [loadingList, setLoadingList] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState(null);
  const [message, setMessage] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  async function loadList() {
    setLoadingList(true);
    setMessage(null);
    try {
      const res = await api.get(`/salesmodules/list/${encodeURIComponent(userId)}`);
      // res.data expected as mapping: { componentId: { id, sqlQuery, lastUpdated, ... } | null }
      setConfigMap(res.data || {});
      // select first component by default
      const first = COMPONENTS[0]?.id;
      setSelected(prev => prev ?? first);
      if (!selected && first) {
        const cfg = (res.data || {})[first] ?? null;
        setSqlText(cfg?.sqlQuery ?? "");
      }
    } catch (err) {
      console.error("Failed to load sales modules list", err);
      setConfigMap({});
      setMessage({ type: "error", text: "Failed to load components" });
    } finally {
      setLoadingList(false);
    }
  }

  useEffect(() => {
    // when selected changes, update editor value from config (or empty)
    if (!selected) return;
    const cfg = configMap[selected] ?? null;
    setSqlText(cfg?.sqlQuery ?? "");
    setResults(null);
    setMessage(null);
  }, [selected, configMap]);

  function showMessage(type, text, ttl = 3500) {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), ttl);
  }

  async function handleTest() {
    if (!selected) return;
    setTesting(true);
    setResults(null);
    setMessage(null);

    try {
      const body = {
        componentId: selected,
        startDate: null,
        endDate: null,
        clientId: null,
        agentId: null,
        productId: null,
        consigneeId: null
      };
      const res = await api.post(`/salesmodules/execute/${encodeURIComponent(userId)}`, body);
      if (res.data?.success) {
        setResults(res.data.data || []);
        showMessage("success", "Query executed successfully (preview below)");
      } else if (res.data?.dummy) {
        setResults(null);
        showMessage("info", "No saved SQL for this component — using dummy fallback");
      } else {
        setResults(null);
        showMessage("error", res.data?.message ?? "Execution returned no data");
      }
    } catch (err) {
      console.error("Test execution failed", err);
      showMessage("error", err?.response?.data?.message ?? "Execution failed");
    } finally {
      setTesting(false);
    }
  }

  async function handleSave() {
    if (!selected) return;
    setSaving(true);
    setMessage(null);

    try {
      const payload = { componentId: selected, sqlQuery: sqlText };
      const res = await api.post(`/salesmodules/save/${encodeURIComponent(userId)}`, payload);
      if (res.data?.success) {
        // refresh list to pick up updated id/lastUpdated
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
      const res = await api.post(`/salesmodules/toggle-hide/${id}`, { hide: !cfg.hideQuery });
      if (res.data?.success) {
        // update local map
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

  async function handleDelete() {
    if (!selected) return;
    const cfg = configMap[selected];
    if (!cfg) {
      showMessage("error", "Nothing to delete");
      return;
    }
    if (!window.confirm(`Delete saved SQL for "${selected}"? This is permanent.`)) return;

    setActionLoading(true);
    try {
      const res = await api.delete(`/salesmodules/delete/${cfg.id}`);
      if (res.data?.success) {
        // remove from local map
        const updated = { ...configMap };
        updated[selected] = null;
        setConfigMap(updated);
        setSqlText("");
        setResults(null);
        showMessage("success", "Deleted");
      } else {
        showMessage("error", res.data?.message ?? "Delete failed");
      }
    } catch (err) {
      console.error("Delete failed", err);
      showMessage("error", "Delete failed");
    } finally {
      setActionLoading(false);
    }
  }

  function copySqlToClipboard() {
    navigator.clipboard.writeText(sqlText || "");
    showMessage("success", "SQL copied to clipboard");
  }

  // Render helpers
  function renderListItem(comp) {
    const cfg = configMap[comp.id] ?? null;
    const active = selected === comp.id;
    return (
      <div
        key={comp.id}
        onClick={() => setSelected(comp.id)}
        style={{
          padding: 12,
          borderRadius: 8,
          cursor: "pointer",
          background: active ? "#eef2ff" : "#fff",
          border: active ? "1px solid #c7d2fe" : "1px solid #eee",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#111", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {comp.title}
          </div>
          <div style={{ fontSize: 11, color: "#666", marginTop: 4 }}>
            {cfg ? (cfg.hideQuery ? "Hidden" : "Configured") : "Using dummy"}
            {cfg?.lastUpdated ? ` • ${new Date(cfg.lastUpdated).toLocaleString()}` : ""}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
          {cfg ? (
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(cfg.sqlQuery || ""); showMessage("success", "Saved SQL copied"); }}
                title="Copy saved SQL"
                className="btn"
                style={smallBtnStyle}
              >
                <FaRegCopy />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setSelected(comp.id); setSqlText(cfg.sqlQuery ?? ""); showMessage("info", "Loaded saved SQL into editor"); }}
                title="Edit"
                style={smallBtnStyle}
              >
                ✎
              </button>
            </div>
          ) : (
            <div style={{ fontSize: 11, color: "#999" }}>—</div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 18, maxWidth: 1200, margin: "0 auto", fontFamily: "Inter, Roboto, Arial, sans-serif" }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
        <Link to="/admin/users" style={{ display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none", color: "#374151" }}>
          <FaChevronLeft /> Back to Users
        </Link>
        <h2 style={{ margin: 0 }}>Sales Analytics — Admin Builder</h2>
        <div style={{ marginLeft: "auto", fontSize: 13, color: "#666" }}>
          PDF ref: <a href={PDF_REF} target="_blank" rel="noreferrer">Meera MIS PDF</a>
        </div>
      </div>

      {message && (
        <div style={{
          padding: 10,
          marginBottom: 12,
          borderRadius: 8,
          background: message.type === "error" ? "#fee2e2" : (message.type === "success" ? "#ecfccb" : "#e6f0ff"),
          color: "#111"
        }}>
          {message.text}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 16 }}>
        {/* Sidebar */}
        <aside style={{ background: "#fff", padding: 12, borderRadius: 8, border: "1px solid #e5e7eb", minHeight: 520, overflow: "auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div style={{ fontWeight: 700 }}>Components</div>
            <div style={{ fontSize: 12, color: "#666" }}>{COMPONENTS.length}</div>
          </div>

          {loadingList ? (
            <div style={{ padding: 14, textAlign: "center", color: "#666" }}>Loading...</div>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {COMPONENTS.map(renderListItem)}
            </div>
          )}

          <div style={{ marginTop: 12, fontSize: 12, color: "#666" }}>
            Tip: click a component to edit SQL. Test-run executes against the user's DB connection.
          </div>
        </aside>

        {/* Editor Panel */}
        <main style={{ background: "#fff", padding: 12, borderRadius: 8, border: "1px solid #e5e7eb", minHeight: 520 }}>
          {!selected ? (
            <div>Select a component on the left</div>
          ) : (
            <>
              <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 8 }}>
                <div style={{ fontSize: 18, fontWeight: 800 }}>{COMPONENTS.find(c => c.id === selected)?.title}</div>
                <div style={{ fontSize: 12, color: "#666" }}>{selected}</div>

                <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                  <button onClick={copySqlToClipboard} style={actionBtnStyle} title="Copy editor SQL"><FaRegCopy /></button>
                  <button onClick={handleTest} disabled={testing} style={{ ...actionBtnStyle, background: "#fde68a" }} title="Test SQL">
                    {testing ? "Running..." : (<><FaPlay /> Test</>)}
                  </button>
                  <button onClick={handleSave} disabled={saving} style={{ ...actionBtnStyle, background: "#c7d2fe" }}>
                    {saving ? "Saving..." : (<><FaSave /> Save</>)}
                  </button>
                </div>
              </div>

              <div style={{ display: "flex", gap: 12 }}>
                {/* SQL editor */}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: "#444", marginBottom: 6 }}>SQL Editor</div>
                  <textarea
                    value={sqlText}
                    onChange={(e) => setSqlText(e.target.value)}
                    placeholder={`Write SQL for ${selected}. Use named params: @startDate, @endDate, @clientId, @agentId, @productId, @consigneeId`}
                    style={{ width: "100%", minHeight: 260, padding: 10, fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, monospace", fontSize: 13, borderRadius: 6, border: "1px solid #e5e7eb" }}
                  />

                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    <button onClick={handleToggleHide} disabled={actionLoading} style={smallActionStyle}>
                      {configMap[selected]?.hideQuery ? (<><FaEye /> Unhide</>) : (<><FaEyeSlash /> Hide</>)}
                    </button>
                    <button onClick={handleDelete} disabled={actionLoading || !configMap[selected]} style={{ ...smallActionStyle, background: "#fee2e2", color: "#a31b1b" }}>
                      <FaTrashAlt /> Delete saved
                    </button>
                  </div>
                </div>

                {/* Results / Info */}
                <div style={{ width: 420 }}>
                  <div style={{ fontSize: 13, color: "#444", marginBottom: 6 }}>Preview / Results</div>

                  {testing && <div style={{ padding: 12, background: "#fff7ed", borderRadius: 6 }}>Running query...</div>}

                  {!results ? (
                    <div style={{ padding: 12, borderRadius: 6, background: "#f8fafc", color: "#666" }}>
                      {configMap[selected] ? "No results yet. Click Test to run the saved SQL and preview rows." : "This component is not configured yet. Saving SQL will make it available to users."}
                    </div>
                  ) : Array.isArray(results) && results.length === 0 ? (
                    <div style={{ padding: 12, borderRadius: 6, background: "#fff7ed", color: "#666" }}>Query executed but returned 0 rows.</div>
                  ) : (
                    <div style={{ maxHeight: 300, overflow: "auto", border: "1px solid #eef2ff", borderRadius: 6 }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                        <thead style={{ position: "sticky", top: 0, background: "#f1f5f9" }}>
                          <tr>
                            {Object.keys(results[0] || {}).map(col => <th key={col} style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #eee" }}>{col}</th>)}
                          </tr>
                        </thead>
                        <tbody>
                          {results.map((row, i) => (
                            <tr key={i} style={{ borderTop: "1px solid #f8fafc" }}>
                              {Object.keys(results[0]).map(col => <td key={col} style={{ padding: 8, verticalAlign: "top" }}>{String(row[col] ?? "")}</td>)}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <div style={{ marginTop: 10, fontSize: 12, color: "#666" }}>
                    Last saved: {configMap[selected]?.lastUpdated ? new Date(configMap[selected].lastUpdated).toLocaleString() : "Never"}
                  </div>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

/* ----- small styles ----- */
const smallBtnStyle = {
  padding: "6px 8px",
  borderRadius: 6,
  border: "1px solid #e5e7eb",
  background: "#fff",
  cursor: "pointer",
  fontSize: 12
};

const actionBtnStyle = {
  padding: "8px 10px",
  borderRadius: 6,
  border: "1px solid #e5e7eb",
  background: "#fff",
  cursor: "pointer",
  display: "inline-flex",
  gap: 8,
  alignItems: "center"
};

const smallActionStyle = {
  padding: "8px 10px",
  borderRadius: 6,
  border: "1px solid #e5e7eb",
  background: "#eef2ff",
  cursor: "pointer",
  display: "inline-flex",
  gap: 8,
  alignItems: "center"
};
