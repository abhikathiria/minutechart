import React, { useState, useMemo, useCallback } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip as ReTooltip,
  ResponsiveContainer,
  Sector,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  AreaChart,
  Area,
  LineChart,
  Line,
} from "recharts";
import { FaCrown, FaFileExcel } from "react-icons/fa";
import { ComposableMap, Geographies, Geography, Marker } from "react-simple-maps";
import { scaleLinear } from "d3-scale";
import { geoCentroid } from "d3-geo";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import api from "../../api";
import { motion } from "framer-motion";

const indiaGeoUrl = "/india_state_geo.json";

// --- Visual helpers (purely cosmetic, logic unchanged) ---
const NEON = {
  primary: "#00F0FF",
  accent: "#9D4EDD",
  deep: "#071016",
};

const containerFade = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.36, ease: "easeOut" } },
};

// --- Small shared subcomponents used inside ModuleChart ---
function CardWrapper({ children, className = "", rightNode }) {
  return (
    <motion.div variants={containerFade} initial="hidden" animate="show" className={`bg-white p-2 ${className}`}>
      {/* Check if rightNode exists to render the header div */}
      {rightNode ? (
        // Changed justify-between to justify-start and removed gap-2
        <div className="flex items-center justify-start p-2 pb-0">
          {/* rightNode is now the only (and therefore left-most) item */}
          {rightNode && <div className="text-sm text-slate-400">{rightNode}</div>}
        </div>
      ) : null}
      <div className="p-2 pt-0">{children}</div>
    </motion.div>
  );
}

function PaginationControls({ pageIndex, pageSize, total, setPageIndex }) {
  const from = total === 0 ? 0 : pageIndex * pageSize + 1;
  const to = Math.min(total, (pageIndex + 1) * pageSize);

  const isNextDisabled = (pageIndex + 1) * pageSize >= total;

  return (
    <div className="flex items-center justify-end gap-4 text-sm text-[#0a2345] w-full">

      {/* Arrows group (left side of the right-aligned container) */}
      <div className="flex items-center">

        <div className="font-semibold">{`${from} - ${to} / ${total}`}</div>

        {/* Prev */}
        <button
          onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
          className={`
            p-1 mx-1 text-2xl font-semibold transition-colors duration-150
            ${pageIndex === 0
              ? "text-gray-400 cursor-not-allowed"
              : "text-[#0a2345] hover:text-[#0a2345]/80"
            }
          `}
          disabled={pageIndex === 0}
        >
          &lt;
        </button>

        {/* Next */}
        <button
          onClick={() => setPageIndex((p) => (p + 1) * pageSize < total ? p + 1 : p)}
          className={`
            p-1 mx-1 text-2xl font-bold transition-colors duration-150
            ${isNextDisabled
              ? "text-gray-400 cursor-not-allowed"
              : "text-[#0a2345] hover:text-[#0a2345]/80"
            }
          `}
          disabled={isNextDisabled}
        >
          &gt;
        </button>

      </div>
    </div>
  );
}


/**
 * MiniTable
 * - rows: array of {label, value, pct?}
 * - pageSize: number
 * - colorBars: optional colors array aligned with rows
 */
function MiniTable({ rows = [], pageSize = 5, colors = [], title }) {
  const [pageIndex, setPageIndex] = useState(0);
  const total = rows.length;
  const start = pageIndex * pageSize;
  const pageRows = rows.slice(start, start + pageSize);

  // reset page when rows change
  React.useEffect(() => {
    setPageIndex(0);
  }, [rows.length]);

  return (
    <div>
      {title && <div className="text-xs text-slate-300 mb-1 font-semibold">{title}</div>}
      <div className="bg-[#021016] border border-[#0b1620] rounded text-sm overflow-hidden">
        <table className="w-full text-sm">
          <tbody>
            {pageRows.map((r, i) => (
              <tr key={i} className="odd:bg-[#041018] hover:bg-[#022a4a]/20">
                <td className="px-3 py-2 truncate" title={r.label} style={{ maxWidth: 220 }}>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-sm" style={{ background: colors[(start + i) % colors.length] || "transparent" }} />
                    <span className="truncate">{r.label}</span>
                  </div>
                </td>
                <td className="px-3 py-2 text-right font-semibold">{typeof r.value === "number" ? r.value.toLocaleString() : r.value}</td>
                <td className="px-3 py-2 text-right text-slate-400">{r.pct != null ? `${(r.pct * 100).toFixed(1)}%` : ""}</td>
              </tr>
            ))}
            {pageRows.length === 0 && (
              <tr>
                <td colSpan={3} className="text-center p-4 text-slate-500">No items</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <PaginationControls pageIndex={pageIndex} pageSize={pageSize} total={total} setPageIndex={setPageIndex} />
    </div>
  );
}

// -----------------------------------------------------------------------------
// Main ModuleChart (updated full code)
// -----------------------------------------------------------------------------
export default function ModuleChart({
  data,
  type,
  isApprovalModule,
  approvalIdColumn,
  queryId,
  userId,
  onRefresh,
  limitHeight,
}) {
  // --- 1. ALL HOOKS MUST BE DEFINED HERE (TOP LEVEL) ---
  const [activeIndex, setActiveIndex] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("");
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState("asc");
  const [selectedApprovalIds, setSelectedApprovalIds] = useState([]);

  // table pagination
  const [tablePageIndex, setTablePageIndex] = useState(0);
  const tablePageSize = 5;

  // heatmap pagination
  const [heatmapPageIndex, setHeatmapPageIndex] = useState(0);
  const heatmapPageSize = 5;

  // map pagination
  const [mapPageIndex, setMapPageIndex] = useState(0);
  const mapPageSize = 5;


  // shared small export utility
  const handleExportTable = () => {
    if (!data || data.length === 0) return;
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data");
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([wbout], { type: "application/octet-stream" });
    saveAs(blob, "data.xlsx");
  };

  // --- Core Sorting Logic (useCallback) ---
  const sortData = useCallback((d, column, direction) => {
    if (!column || !direction) return d;
    return [...d].sort((a, b) => {
      const valA = a[column];
      const valB = b[column];
      const isNumeric = !isNaN(Number(valA)) && !isNaN(Number(valB));
      let comparison = 0;
      if (isNumeric) comparison = Number(valA) - Number(valB);
      else {
        const strA = String(valA || "").toLowerCase();
        const strB = String(valB || "").toLowerCase();
        comparison = strA > strB ? 1 : strA < strB ? -1 : 0;
      }
      return direction === "desc" ? comparison * -1 : comparison;
    });
  }, []);

  const handleSort = useCallback((key) => {
    setSortColumn((prev) => {
      if (prev === key) {
        setSortDirection((dir) => {
          if (dir === "asc") return "desc";
          if (dir === "desc") return null;
          return "asc";
        });
        return key;
      }
      setSortDirection("asc");
      return key;
    });
  }, []);

  // --- Memoized datasets ---
  const sortedAndFilteredData = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const filtered = term
      ? data.filter((row) => Object.values(row).some((v) => String(v).toLowerCase().includes(term)))
      : data;
    return sortData(filtered, sortColumn, sortDirection);
  }, [data, searchTerm, sortColumn, sortDirection, sortData]);

  const sortedAndFilteredHeatmapData = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const filtered = term
      ? data.filter((row) => Object.values(row).some((v) => String(v).toLowerCase().includes(term)))
      : data;
    return sortData(filtered, sortColumn, sortDirection);
  }, [data, searchTerm, sortColumn, sortDirection, sortData]);

  // --- 2. DATA VALIDATION AND EARLY RETURN (MUST BE AFTER ALL HOOKS) ---
  if (!data || data.length === 0) {
    return (
      <motion.div variants={containerFade} initial="hidden" animate="show" className="p-6 bg-[#071017] rounded-lg border border-[#0f1720] text-center">
        <div className="text-sm text-slate-400">No data to display</div>
      </motion.div>
    );
  }

  const keys = Object.keys(data[0]);
  const COLORS = [
    "#00F0FF", "#4F46E5", "#A855F7", "#9D4EDD", "#EA5F89", "#2B0B3F", "#6366F1",
    "#FBCF00", "#D3974E", "#C084FC", "#E9D5FF",
  ];

  // --- HANDLER FUNCTIONS (non-hook) ---
  const handleApproval = async (rowId) => {
    setSelectedApprovalIds((prev) => (prev.includes(rowId) ? prev.filter((id) => id !== rowId) : [...prev, rowId]));

    try {
      await api.post(`/admin/approve-row/${userId}`, {
        QueryId: queryId,
        RowId: rowId,
      });
      setSelectedApprovalIds((prev) => prev.filter((id) => id !== rowId));
      if (onRefresh) onRefresh();
    } catch (err) {
      // keep original behavior (alert) but styled fallback
      // eslint-disable-next-line no-alert
      alert("Approval failed: " + (err.response?.data?.message || err.message));
      setSelectedApprovalIds((prev) => prev.filter((id) => id !== rowId));
    }
  };

  // Utility: build rows for mini-table for chart types
  const makeMiniRows = (items, labelKey, valueKey, includePct = true) => {
    const filtered = items
      .filter((it) => it[labelKey] != null && it[valueKey] != null && !isNaN(Number(it[valueKey])));
    const numericTotal = filtered.reduce((s, r) => s + Number(r[valueKey]), 0) || 0;
    return filtered.map((r) => ({
      label: String(r[labelKey]),
      value: Number(r[valueKey]),
      pct: includePct ? (numericTotal ? Number(r[valueKey]) / numericTotal : 0) : null,
    }));
  };

  // --- RENDER SWITCH ---
  switch (type) {
    case "table": {
      // -------------------------------
      // TOTAL ROW DETECTION (LAST ROW ONLY)
      // -------------------------------
      let totalRow = null;

      if (sortedAndFilteredData.length > 0) {
        const lastRow = sortedAndFilteredData[sortedAndFilteredData.length - 1];

        const lastRowIsTotal = Object.values(lastRow).some(
          v => typeof v === "string" && v.toLowerCase().includes("total")
        );

        if (lastRowIsTotal) {
          totalRow = lastRow;
        }
      }

      // Remove total row so it is NOT paginated
      const nonTotalRows = totalRow
        ? sortedAndFilteredData.slice(0, sortedAndFilteredData.length - 1)
        : sortedAndFilteredData;

      // Pagination
      const totalRows = nonTotalRows.length;
      const tableStart = tablePageIndex * tablePageSize;
      const tablePageRows = nonTotalRows.slice(tableStart, tableStart + tablePageSize);

      return (
        <CardWrapper className={`mt-2 ${limitHeight ? "max-h-[520px] overflow-y-auto" : ""}`}>

          {/* Search Bar */}
          <div className="flex items-center justify-between pb-2">
            <input
              type="text"
              placeholder="Search..."
              className="px-3 py-2 w-60 bg-[#0a2345] text-white placeholder-white"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setTablePageIndex(0); }}
            />
          </div>

          {/* Table */}
          <div className={`overflow-x-auto ${limitHeight ? "max-h-[420px] overflow-y-auto" : ""}`}>
            <table className="border-collapse border-2 border-[#0a2345] w-full min-w-max text-sm">

              {/* Header */}
              <thead className="sticky top-0 z-10 bg-[#0a2345]">
                <tr>
                  {isApprovalModule && (
                    <th className="border px-3 py-2 font-semibold text-white">Approve</th>
                  )}

                  {keys.map((k, colIndex) => {
                    const isTextColumn = colIndex === 0;
                    const activeDirectionIcon = sortDirection === "asc" ? "▲" : "▼";
                    const defaultIcon = "↕";

                    return (
                      <th
                        key={k}
                        onClick={() => handleSort(k)}
                        style={
                          isTextColumn
                            ? { maxWidth: "300px", whiteSpace: "normal" }
                            : { whiteSpace: "normal" }
                        }
                        className="border px-3 py-2 font-semibold text-white cursor-pointer select-none text-left"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span>{k}</span>
                          <span className="ml-2 text-xs">
                            {sortColumn === k ? activeDirectionIcon : defaultIcon}
                          </span>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>

              {/* Body */}
              <tbody>
                {/* Paginated Rows */}
                {tablePageRows.map((row, i) => {
                  const rowId = row[approvalIdColumn];
                  const isRowSelected = selectedApprovalIds.includes(rowId);

                  const isEven = i % 2 === 0;
                  const baseRowBg = isEven
                    ? "bg-white text-black"
                    : "bg-[#1a3a60] text-white";

                  return (
                    <tr key={rowId || i} className={`${baseRowBg} hover:bg-[#3b2f8a]/80`}>
                      {isApprovalModule && (
                        <td className="border px-3 py-2 text-center">
                          <input
                            type="checkbox"
                            checked={isRowSelected}
                            onChange={() => handleApproval(rowId)}
                            className="w-4 h-4 accent-[#00F0FF]"
                          />
                        </td>
                      )}

                      {keys.map((k, j) => {
                        const cellValue = row[k];
                        const isNumeric = !isNaN(Number(cellValue));

                        return (
                          <td
                            key={j}
                            style={
                              j === 0
                                ? { maxWidth: "300px", whiteSpace: "normal" }
                                : {}
                            }
                            className={`border px-3 py-2 ${isNumeric ? "text-right" : "text-left"} break-words`}
                          >
                            <div className="whitespace-normal break-words">{cellValue}</div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}

                {/* No Results */}
                {tablePageRows.length === 0 && (
                  <tr>
                    <td
                      colSpan={keys.length + (isApprovalModule ? 1 : 0)}
                      className="text-center py-4 text-black"
                    >
                      No results found.
                    </td>
                  </tr>
                )}

                {/* ----- FIXED GRAND TOTAL ROW ----- */}
                {totalRow && (
                  <tr className="bg-[#0a2345] text-white font-semibold border-t-2 border-[#0a2345]">
                    {isApprovalModule && (
                      <td className="border px-3 py-2"></td>
                    )}

                    {keys.map((k, j) => {
                      const val = totalRow[k];
                      const isNumeric = !isNaN(Number(val));
                      return (
                        <td
                          key={j}
                          className={`border px-3 py-2 ${isNumeric ? "text-right" : "text-left"}`}
                        >
                          {val}
                        </td>
                      );
                    })}
                  </tr>
                )}

              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="mt-1">
            <PaginationControls
              pageIndex={tablePageIndex}
              pageSize={tablePageSize}
              total={totalRows}
              setPageIndex={setTablePageIndex}
            />
          </div>

        </CardWrapper>
      );
    }


    case "pie": {
      const allColumns = keys || [];
      let filterColumn = null;
      let xCol = "";
      let yCol = "";
      if (allColumns.length === 2) [xCol, yCol] = allColumns;
      else if (allColumns.length >= 3) [filterColumn, xCol, yCol] = allColumns;

      const filterOptions = filterColumn ? [...new Set(data.map((d) => d[filterColumn]))].filter(Boolean) : [];

      const chartFilteredData = filterColumn && selectedFilter ? data.filter((d) => String(d[filterColumn]) === String(selectedFilter)) : data;

      const chartData = chartFilteredData
        .filter((item) => item[xCol] && !isNaN(Number(item[yCol])))
        .map((item) => ({ name: item[xCol], value: Number(item[yCol]) }));

      const sortedData = [...chartData].sort((a, b) => b.value - a.value);
      const topName = sortedData[0]?.name;

      if (chartData.length === 0) {
        return (
          <CardWrapper className="h-96 w-full" title="Pie Chart">
            <div className="p-4 border rounded text-center text-slate-400 bg-[#041018]">No data available for this selection.</div>
          </CardWrapper>
        );
      }

      const renderActiveShape = (props) => {
        const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
        return <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius + 12} startAngle={startAngle} endAngle={endAngle} fill={fill} />;
      };

      const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
          const item = payload[0].payload;
          const isTop = item.name === topName;
          return (
            <div className="bg-white border border-[#e6eef9] rounded shadow px-3 py-2 text-sm font-semibold">
              <div className="flex items-center gap-2 text-gray-800 font-bold">
                {isTop && <FaCrown className="text-yellow-500" />}
                <span>{item.name}</span>
              </div>
              <div className="text-slate-600">{yCol}: {item.value.toLocaleString()}</div>
            </div>
          );
        }
        return null;
      };

      const renderLegend = () => (
        <div className="border-t border-[#0b1620] mt-3 pt-3">
          <h4 className="text-sm font-semibold text-black mb-2">{xCol}</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto">
            {chartData.map((entry, index) => (
              <div key={`legend-${index}-${entry.name}`} className="flex items-center text-sm text-black gap-2">
                <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                <span className="truncate" title={entry.name}>{entry.name}</span>
              </div>
            ))}
          </div>
        </div>
      );

      const miniRows = makeMiniRows(chartFilteredData.map((d) => ({ [xCol]: d[xCol], [yCol]: d[yCol] })), xCol, yCol, true);

      return (
        <CardWrapper className="h-96 w-full" title={`${xCol} vs ${yCol}`} rightNode={filterColumn ? (
          <div className="flex items-center gap-2">
            <span className="text-md font-semibold text-black">Filter:</span>
            <select value={selectedFilter} onChange={(e) => setSelectedFilter(e.target.value)} className="border border-black px-3 py-1 text-sm bg-white text-black">
              <option value="">All</option>
              {filterOptions.map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
            </select>
          </div>
        ) : null}>
          <div className="flex gap-4 mt-1">
            <div className="flex-1 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={110}
                    activeIndex={activeIndex}
                    activeShape={renderActiveShape}
                    onClick={(_, idx) => setActiveIndex(idx === activeIndex ? null : idx)}
                    isAnimationActive
                    animationDuration={450}
                  >
                    {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <ReTooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* <div style={{ width: 300 }}>
              <MiniTable rows={miniRows} pageSize={5} colors={COLORS} title={`${xCol}`} />
            </div> */}
          </div>

          {renderLegend()}
        </CardWrapper>
      );
    }

    case "bar": {
      const keys0 = keys[0];
      const keys1 = keys[1];
      const miniRows = makeMiniRows(data.map((d) => ({ [keys0]: d[keys0], [keys1]: d[keys1] })), keys0, keys1, true);

      const CustomBarTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
          const p = payload[0].payload;
          return (
            <div className="bg-white px-3 py-2 rounded shadow border text-sm">
              <div className="font-semibold text-gray-800">{label}</div>
              <div className="text-gray-600">{keys1}: {p[keys1].toLocaleString()}</div>
            </div>
          );
        }
        return null;
      };


      return (
        <CardWrapper className="mt-4 h-80 w-full" title={`${keys1} vs ${keys0}`}>
          <div className="flex gap-4 h-full">
            <div className="flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#07314a" />
                  <XAxis dataKey={keys0} stroke="#9fb7c9" />
                  <YAxis stroke="#9fb7c9" />
                  <ReTooltip content={<CustomBarTooltip />} />
                  <Bar dataKey={keys1} fill={NEON.primary} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* <div style={{ width: 320 }}>
              <MiniTable rows={miniRows} pageSize={5} colors={[NEON.primary, NEON.accent, ...COLORS]} title="Top items" />
            </div> */}
          </div>
        </CardWrapper>
      );
    }

    case "area": {
      const keys0 = keys[0];
      const keys1 = keys[1];
      const miniRows = makeMiniRows(data.map((d) => ({ [keys0]: d[keys0], [keys1]: d[keys1] })), keys0, keys1, true);

      return (
        <CardWrapper className="mt-4 h-80 w-full" title={`${keys1} over ${keys0}`}>
          <div className="flex gap-4 h-full">
            <div className="flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data}>
                  <defs>
                    <linearGradient id="gradArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#9D4EDD" stopOpacity={0.6} />
                      <stop offset="100%" stopColor="#9D4EDD" stopOpacity={0.06} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#07314a" />
                  <XAxis dataKey={keys0} stroke="#9fb7c9" />
                  <YAxis stroke="#9fb7c9" />
                  <ReTooltip />
                  <Area type="monotone" dataKey={keys1} stroke="#9D4EDD" fill="url(#gradArea)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            {/* <div style={{ width: 320 }}>
              <MiniTable rows={miniRows} pageSize={5} colors={[NEON.accent, ...COLORS]} title="Top items" />
            </div> */}
          </div>
        </CardWrapper>
      );
    }

    case "line": {
      const keys0 = keys[0];
      const keys1 = keys[1];
      const miniRows = makeMiniRows(data.map((d) => ({ [keys0]: d[keys0], [keys1]: d[keys1] })), keys0, keys1, true);

      return (
        <CardWrapper className="mt-4 h-80 w-full" title={`${keys1} trend`}>
          <div className="flex gap-4 h-full">
            <div className="flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#07314a" />
                  <XAxis dataKey={keys0} stroke="#9fb7c9" />
                  <YAxis stroke="#9fb7c9" />
                  <ReTooltip />
                  <Line type="monotone" dataKey={keys1} stroke="#9D4EDD" strokeWidth={2} dot />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* <div style={{ width: 320 }}>
              <MiniTable rows={miniRows} pageSize={5} colors={[NEON.accent, ...COLORS]} title="Top items" />
            </div> */}
          </div>
        </CardWrapper>
      );
    }

    case "kpi": {
      const totalValue = data.reduce((sum, item) => sum + Number(item[keys[0]] || 0), 0);
      return (
        <motion.div variants={containerFade} initial="hidden" animate="show" className="mt-4 p-6 bg-gradient-to-r from-[#00F0FF]/20 via-[#9D4EDD]/14 to-[#ffffff]/4 text-white rounded-lg text-center border border-[#0f1720] shadow-[0_10px_40px_rgba(157,78,221,0.06)]">
          <p className="text-xs tracking-widest text-slate-300">KEY METRIC</p>
          <p className="text-4xl font-extrabold mt-2" style={{ color: NEON.primary }}>{totalValue.toLocaleString()}</p>
        </motion.div>
      );
    }

    case "heatmap": {
      const finalHeatmapData = sortedAndFilteredHeatmapData;
      const hasData = finalHeatmapData.length > 0;
      const numericKeys = hasData ? keys.filter((k) => !isNaN(Number(data[0][k]))) : [];
      const allValues = finalHeatmapData.flatMap((row) => numericKeys.map((k) => Number(row[k])));
      const minValue = Math.min(...allValues.filter((v) => isFinite(v)));
      const maxValue = Math.max(...allValues.filter((v) => isFinite(v)));

      const totalRows = finalHeatmapData.length;
      const heatmapStart = heatmapPageIndex * heatmapPageSize;
      const heatmapPageRows = finalHeatmapData.slice(heatmapStart, heatmapStart + heatmapPageSize);

      return (
        <CardWrapper className="mt-4 border rounded-lg overflow-hidden" title="Heatmap Preview">

          {/* Search Bar */}
          <div className="flex items-center justify-between p-2">
            <input
              type="text"
              placeholder="Search..."
              className="border px-3 py-2 rounded w-60 bg-white text-black placeholder-black"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setHeatmapPageIndex(0);
              }}
            />
          </div>

          {/* Table */}
          <div className={`overflow-x-auto ${limitHeight ? "max-h-[420px] overflow-y-auto" : ""}`}>
            <table className="border-collapse border w-full min-w-max text-sm bg-transparent">
              <thead className="sticky top-0 z-10 bg-[#0a2345]">
                <tr>
                  {isApprovalModule && (
                    <th className="border px-3 py-2 font-semibold text-slate-200">Approve</th>
                  )}

                  {keys.map((k, colIndex) => {
                    const isTextColumn = colIndex === 0; // Same logic as table
                    const isNumeric = hasData && !isNaN(Number(data[0][k]));

                    const activeDirectionIcon = sortDirection === "asc" ? "▲" : "▼";
                    const defaultIcon = "↕";

                    return (
                      <th
                        key={k}
                        onClick={() => handleSort(k)}
                        style={
                          isTextColumn
                            ? { maxWidth: "300px", whiteSpace: "normal" }
                            : { whiteSpace: "normal" }
                        }
                        className={`border px-3 py-2 font-semibold text-slate-200 cursor-pointer select-none ${isNumeric ? "text-right" : "text-left"
                          }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="whitespace-normal break-words">{k}</span>
                          <span className="ml-2 text-xs">
                            {sortColumn === k ? activeDirectionIcon : defaultIcon}
                          </span>
                        </div>
                      </th>
                    );
                  })}

                </tr>
              </thead>

              <tbody>
                {heatmapPageRows.map((row, i) => {
                  const rowId = row[approvalIdColumn];
                  const isRowSelected = selectedApprovalIds.includes(rowId);

                  return (
                    <tr key={rowId || i} className="hover:bg-[#3b2f8a]/40">
                      {isApprovalModule && (
                        <td className="border px-3 py-2 text-center">
                          <input
                            type="checkbox"
                            checked={isRowSelected}
                            onChange={() => handleApproval(rowId)}
                            className="w-4 h-4 accent-[#9D4EDD]"
                          />
                        </td>
                      )}

                      {keys.map((k, j) => {
                        const rawValue = row[k];
                        const numericValue = Number(rawValue);

                        // Non-numeric cells
                        if (isNaN(numericValue) || !isFinite(numericValue)) {
                          return (
                            <td
                              key={j}
                              style={
                                j === 0
                                  ? { maxWidth: "300px", whiteSpace: "normal" }
                                  : {}
                              }
                              className="border px-3 py-2 whitespace-normal break-words"
                            >
                              {rawValue}
                            </td>
                          );
                        }

                        // Numeric cells → heatmap colored
                        const range = maxValue - minValue;
                        const intensity = range > 0 ? (numericValue - minValue) / range : 0.5;
                        const colorValue = Math.floor(255 - intensity * 160);

                        return (
                          <td
                            key={j}
                            className="border px-3 py-2 font-bold text-black text-right"
                            style={{
                              backgroundColor: `rgb(${colorValue}, ${colorValue}, 255)`
                            }}
                          >
                            {numericValue.toLocaleString()}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}

                {heatmapPageRows.length === 0 && (
                  <tr>
                    <td
                      colSpan={keys.length + (isApprovalModule ? 1 : 0)}
                      className="text-center py-4 text-black"
                    >
                      No results found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-2">
            <PaginationControls
              pageIndex={heatmapPageIndex}
              pageSize={heatmapPageSize}
              total={totalRows}
              setPageIndex={setHeatmapPageIndex}
            />
          </div>
        </CardWrapper>
      );
    }

    case "map": {
      const regionKey = keys[0];
      const valueKey = keys[1];
      const regionData = {};
      data.forEach((d) => { regionData[d[regionKey]] = Number(d[valueKey]); });
      const values = Object.values(regionData); const min = Math.min(...values); const max = Math.max(...values);
      const sizeScale = scaleLinear().domain([min, max]).range([5, 40]);

      // make a top-list and paginated
      const regionList = Object.keys(regionData).map((k) => ({ label: k, value: regionData[k] })).sort((a, b) => b.value - a.value);
      const mapStart = mapPageIndex * mapPageSize;
      const mapPageRows = regionList.slice(mapStart, mapStart + mapPageSize);

      return (
        <CardWrapper className="mt-4 w-full overflow-x-auto" title="Map">
          <div className="flex gap-4">
            <div className="flex-1">
              <ComposableMap projection="geoMercator" projectionConfig={{ scale: 1000, center: [78.9629, 22.5937] }}>
                <Geographies geography={indiaGeoUrl}>
                  {({ geographies }) => geographies.map((geo) => {
                    const stateName = geo.properties.NAME_1;
                    const value = regionData[stateName] || 0;
                    const centroid = geoCentroid(geo);
                    return (
                      <React.Fragment key={geo.rsmKey}>
                        <Geography geography={geo} fill="#0b1220" stroke="#17354a" style={{ default: { outline: "none" }, hover: { outline: "none" }, pressed: { outline: "none" } }} />
                        {value > 0 && (
                          <Marker coordinates={centroid}>
                            <circle r={sizeScale(value)} fill="#00F0FF" opacity={0.9} stroke="#071017" strokeWidth={1} />
                            <title>{`${stateName}: ${value}`}</title>
                          </Marker>
                        )}
                      </React.Fragment>
                    );
                  })}
                </Geographies>
              </ComposableMap>
            </div>

            {/* <div style={{ width: 320 }}>
              <MiniTable rows={regionList} pageSize={5} colors={[NEON.primary, NEON.accent, ...COLORS]} title="Top regions" />
            </div> */}
          </div>
        </CardWrapper>
      );
    }

    default:
      return <p className="mt-4 text-slate-400">Unsupported visualization type</p>;
  }
}
