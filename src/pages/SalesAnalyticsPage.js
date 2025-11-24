// src/pages/SalesAnalyticsPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  PieChart, Pie, Cell, Tooltip as ReTooltip, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Legend, Line
} from "recharts";
import api from "../api";
import { format, parseISO, subDays, differenceInCalendarDays, addMonths, subYears } from "date-fns";
import { useParams } from "react-router-dom";

/* === CONFIG / Constants === */
const REPORT_PDF_URL = "/mnt/data/Meera_Group_-_MIS_Report.pdf";

const NGRAPH_THEME = {
  primary: "#E97F2C",
  primarySoft: "#FDF6F1",
  accent: "#B35A24",
  grid: "#EFEFEF",
  textPrimary: "#222222",
  kpiBorder: "#E6B886",
  tooltipBg: "#ffffff",
  tooltipBorder: "#E0D2C0",
  background: "#ffffff"
};

const COMPONENT_IDS = [
  "sa_kpi_clients", "sa_kpi_agents", "sa_kpi_invoices", "sa_kpi_sales", "sa_kpi_qty", "sa_kpi_rate",
  "sa_filter_client", "sa_filter_consignee", "sa_filter_agent", "sa_filter_product",
  "sa_pie_branch", "sa_pie_costcenter", "sa_pie_channel", "sa_map_sales", "sa_line_sales_qty",
  "sa_table_book", "sa_table_category", "sa_table_product", "sa_table_client", "sa_table_delivery", "sa_table_agent"
];

/* === Dummy data (keeps UI usable when backend not available) */
const DUMMY = {
  sa_kpi_clients: { id: "sa_kpi_clients", label: "Clients", value: 479, previousValue: 474 },
  sa_kpi_agents: { id: "sa_kpi_agents", label: "Agents", value: 119, previousValue: 117 },
  sa_kpi_invoices: { id: "sa_kpi_invoices", label: "Invoices", value: 8000, previousValue: 11860 },
  sa_kpi_sales: { id: "sa_kpi_sales", label: "Sales", value: 1200000000, previousValue: 1100000000 },
  sa_kpi_qty: { id: "sa_kpi_qty", label: "Qty", value: 8000000, previousValue: 7200000 },
  sa_kpi_rate: { id: "sa_kpi_rate", label: "Rate", value: 149, previousValue: 150 },

  sa_filter_client: { values: ["All", "Client A", "Client B", "Client C"] },
  sa_filter_consignee: { values: ["All", "Consignee X", "Consignee Y"] },
  sa_filter_agent: { values: ["All", "Agent 1", "Agent 2", "Agent 3"] },
  sa_filter_product: { values: ["All", "Product 1", "Product 2", "Product 3"] },

  sa_pie_branch: {
    items: [
      { label: "MEERA COTTON", value: 888000000 },
      { label: "KNITTING DISPATCH", value: 872170000 },
      { label: "BRANCH B", value: 250000000 }
    ]
  },
  sa_pie_costcenter: {
    items: [
      { label: "CostCenter A", value: 500000000 },
      { label: "CostCenter B", value: 400000000 },
      { label: "Other", value: 250000000 }
    ]
  },
  sa_pie_channel: {
    items: [
      { label: "Retail", value: 700000000 },
      { label: "Wholesale", value: 400000000 },
      { label: "Online", value: 200000000 }
    ]
  },

  sa_map_sales: {
    locations: [
      { id: "surat", name: "Surat", lat: 21.1702, lng: 72.8311, sales: 600490000 },
      { id: "mumbai", name: "Mumbai", lat: 19.0760, lng: 72.8777, sales: 450000000 },
      { id: "delhi", name: "Delhi", lat: 28.7041, lng: 77.1025, sales: 320000000 }
    ]
  },

  sa_line_sales_qty: {
    timeUnit: "month",
    current: [
      { x: "2025-07-01", sales: 300000000, qty: 2300000 },
      { x: "2025-08-01", sales: 420000000, qty: 2800000 },
      { x: "2025-09-01", sales: 480000000, qty: 2900000 }
    ],
    previous: [
      { x: "2025-04-01", sales: 270000000, qty: 2100000 },
      { x: "2025-05-01", sales: 380000000, qty: 2500000 },
      { x: "2025-06-01", sales: 450000000, qty: 2600000 }
    ]
  },

  sa_table_book: {
    columns: ["Rank", "Book", "Sales", "Pct"],
    rows: [
      [1, "KNITTING DISPATCH", 872170000, "29%"],
      [2, "MEERA COTTON", 600490000, "20%"]
    ]
  },
  sa_table_category: {
    columns: ["Rank", "Category", "Sales", "Pct"],
    rows: [
      [1, "YARN", 500000000, "17%"],
      [2, "FABRIC", 420000000, "14%"]
    ]
  },
  sa_table_product: {
    columns: ["Rank", "Product", "Sales", "Pct"],
    rows: [
      [1, "Product 1", 300000000, "10%"],
      [2, "Product 2", 240000000, "8%"]
    ]
  },
  sa_table_client: {
    columns: ["Rank", "Client", "Sales", "Pct"],
    rows: [
      [1, "Client A", 400000000, "13%"],
      [2, "Client B", 250000000, "8%"]
    ]
  },
  sa_table_delivery: {
    columns: ["Rank", "Delivery Mode", "Sales", "Pct"],
    rows: [
      [1, "Road", 800000000, "27%"],
      [2, "Rail", 200000000, "7%"]
    ]
  },
  sa_table_agent: {
    columns: ["Rank", "Agent", "Sales", "Pct"],
    rows: [
      [1, "Agent 1", 450000000, "15%"],
      [2, "Agent 2", 350000000, "11%"]
    ]
  }
};

/* === UTILITIES === */
function money(v) {
  if (v === null || v === undefined) return "-";
  return v >= 1e9 ? `₹${(v / 1e9).toFixed(2)}B` :
    v >= 1e6 ? `₹${(v / 1e6).toFixed(2)}M` :
      `₹${v.toLocaleString()}`;
}
function numberFmt(v) {
  if (v === null || v === undefined) return "-";
  if (typeof v === "number") return v.toLocaleString();
  const n = Number(v);
  return Number.isFinite(n) ? n.toLocaleString() : String(v);
}
function rateFmt(v) {
  if (v === null || v === undefined) return "-";
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v);
  return n.toFixed(2);
}
function pct(prev, curr) {
  if (prev === null || prev === undefined || prev === 0) return "n/a";
  const p = ((curr - prev) / Math.abs(prev)) * 100;
  return `${p >= 0 ? "+" : ""}${p.toFixed(1)}%`;
}
function formatDateShort(d) {
  if (!d) return "";
  try { return format(parseISO(d), "MMM yyyy"); } catch { return d; }
}

/* === API helper === */
async function postExecuteSalesComponent(userId, body) {
  try {
    const res = await api.post(
      `/salesmodules/execute/${encodeURIComponent(userId)}`,
      body,
      { headers: { "Content-Type": "application/json" } }
    );
    return res.data;
  } catch (err) {
    console.warn("execute-sales-component error", err);
    return { success: false, dummy: true };
  }
}

/* === Generic normalizers === */
function inferColumns(rows = []) {
  if (!Array.isArray(rows) || rows.length === 0) return [];
  return Object.keys(rows[0]);
}

function normalizeToPie(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return { items: [] };
  const cols = inferColumns(rows);
  let labelCol = null;
  let valueCol = null;
  for (const c of cols) {
    for (let i = 0; i < rows.length; i++) {
      const v = rows[i][c];
      if (v === null || v === undefined) continue;
      if (typeof v === "string" && !labelCol) labelCol = c;
      if (typeof v === "number" && !valueCol) valueCol = c;
      if (!valueCol && typeof v === "string" && String(v).match(/^-?\d+(\.\d+)?$/)) valueCol = c;
      if (labelCol && valueCol) break;
    }
    if (labelCol && valueCol) break;
  }
  if (!labelCol) labelCol = cols[0];
  if (!valueCol) valueCol = cols[1] ?? cols[0];
  const items = rows.map(r => {
    const rawLabel = r[labelCol];
    const rawValue = r[valueCol];
    const label = rawLabel != null ? String(rawLabel) : "";
    const value = (rawValue === null || rawValue === undefined) ? 0 : Number(rawValue) || 0;
    return { label, value };
  }).filter(it => it.label !== "" && !Number.isNaN(it.value));
  return { items };
}

function normalizeToTable(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return { columns: [], rows: [] };
  const cols = inferColumns(rows);
  const outRows = rows.map(r => cols.map(c => r[c]));
  return { columns: cols, rows: outRows };
}

function normalizeKpi(rows, componentId) {
  if (!rows) return null;
  let src = null;
  if (Array.isArray(rows) && rows.length > 0) src = rows[0];
  else if (!Array.isArray(rows) && typeof rows === "object") src = rows;
  if (!src) return null;

  const keys = Object.keys(src);
  const numericCandidates = keys.filter(k => typeof src[k] === "number" || (typeof src[k] === "string" && String(src[k]).match(/^-?\d+(\.\d+)?$/)));
  const priority = ["value", "sales", "amount", "total", "count", "number", "qty", "quantity", "numberoforders"];
  let valueKey = numericCandidates.find(k => priority.includes(k.toLowerCase())) || numericCandidates[0];

  const labelCandidates = keys.filter(k => typeof src[k] === "string");
  const labelPriority = ["name", "label", "title", "customername", "customer", "client", "branch"];
  let labelKey = labelCandidates.find(k => labelPriority.some(p => k.toLowerCase().includes(p))) || labelCandidates[0] || valueKey;

  const value = valueKey ? (typeof src[valueKey] === "number" ? src[valueKey] : Number(src[valueKey]) || 0) : 0;
  const label = labelKey ? String(src[labelKey]) : componentId;
  const previousValue = (typeof src.previousValue === "number") ? src.previousValue : undefined;

  return { id: componentId, label, value, previousValue };
}

/* === Core fetch & normalization === */
async function fetchComponentData(componentId, { userId, dateRange, filters }) {
  const startISO = dateRange?.start ? `${dateRange.start}T00:00:00` : null;
  const endISO = dateRange?.end ? `${dateRange.end}T23:59:59` : null;

  // Special: line chart wants previous period too (with fallback attempts)
  if (componentId === "sa_line_sales_qty") {
    try {
      const start = dateRange.start ? parseISO(dateRange.start) : null;
      const end = dateRange.end ? parseISO(dateRange.end) : null;
      if (!start || !end) return { datasource: "db", data: { current: [], previous: [] } };

      const days = Math.max(1, differenceInCalendarDays(end, start) + 1);
      const prevEnd = subDays(start, 1);
      const prevStart = subDays(prevEnd, days - 1);

      const currentBody = {
        componentId,
        startDate: startISO,
        endDate: endISO,
        clientId: filters.client === "All" ? null : filters.client,
        agentId: filters.agent === "All" ? null : filters.agent,
        productId: filters.product === "All" ? null : filters.product,
        consigneeId: filters.consignee === "All" ? null : filters.consignee
      };

      const previousBody = {
        componentId,
        startDate: `${format(prevStart, "yyyy-MM-dd")}T00:00:00`,
        endDate: `${format(prevEnd, "yyyy-MM-dd")}T23:59:59`,
        clientId: filters.client === "All" ? null : filters.client,
        agentId: filters.agent === "All" ? null : filters.agent,
        productId: filters.product === "All" ? null : filters.product,
        consigneeId: filters.consignee === "All" ? null : filters.consignee
      };

      const currRes = await postExecuteSalesComponent(userId, currentBody);
      let prevRes = await postExecuteSalesComponent(userId, previousBody);

      // fallback: if previous empty try a month-shift then year-shift
      if (prevRes?.success && Array.isArray(prevRes.data) && prevRes.data.length === 0) {
        const altPrevStart = addMonths(start, -1);
        const altPrevEnd = addMonths(end, -1);
        const altBody = {
          componentId,
          startDate: `${format(altPrevStart, "yyyy-MM-dd")}T00:00:00`,
          endDate: `${format(altPrevEnd, "yyyy-MM-dd")}T23:59:59`,
          clientId: filters.client === "All" ? null : filters.client,
          agentId: filters.agent === "All" ? null : filters.agent,
          productId: filters.product === "All" ? null : filters.product,
          consigneeId: filters.consignee === "All" ? null : filters.consignee
        };
        const altRes = await postExecuteSalesComponent(userId, altBody);
        if (altRes?.success && Array.isArray(altRes.data) && altRes.data.length > 0) prevRes = altRes;
        else {
          const yearStart = subYears(start, 1);
          const yearEnd = subYears(end, 1);
          const yBody = {
            componentId,
            startDate: `${format(yearStart, "yyyy-MM-dd")}T00:00:00`,
            endDate: `${format(yearEnd, "yyyy-MM-dd")}T23:59:59`,
            clientId: filters.client === "All" ? null : filters.client,
            agentId: filters.agent === "All" ? null : filters.agent,
            productId: filters.product === "All" ? null : filters.product,
            consigneeId: filters.consignee === "All" ? null : filters.consignee
          };
          const yRes = await postExecuteSalesComponent(userId, yBody);
          if (yRes?.success && Array.isArray(yRes.data) && yRes.data.length > 0) prevRes = yRes;
        }
      }

      const normalizeLine = (res) => {
        if (!res?.success || !Array.isArray(res.data)) return [];
        return res.data.map((row) => {
          const x = row.x ?? row.date ?? row.month ?? Object.values(row)[0];
          return {
            x: String(x),
            sales:
              row.sales ??
              row.Sales ??
              row.total ??
              row.Total ??
              row.amount ??
              null,
            qty:
              row.qty ??
              row.Qty ??
              row.quantity ??
              row.Quantity ??
              null
          };
        });
      };

      return {
        datasource: "db",
        data: {
          current: normalizeLine(currRes),
          previous: normalizeLine(prevRes)
        }
      };
    } catch (err) {
      console.warn("line component error", err);
      return { datasource: "dummy", data: DUMMY[componentId] };
    }
  }

  // Normal components
  try {
    const body = {
      componentId,
      startDate: startISO,
      endDate: endISO,
      clientId: filters.client === "All" ? null : filters.client,
      agentId: filters.agent === "All" ? null : filters.agent,
      productId: filters.product === "All" ? null : filters.product,
      consigneeId: filters.consignee === "All" ? null : filters.consignee
    };

    const res = await postExecuteSalesComponent(userId, body);

    // if endpoint failed or returned dummy -> use dummy
    if (!res || res.dummy || res.success !== true) return { datasource: "dummy", data: DUMMY[componentId] };

    const rows = Array.isArray(res.data) ? res.data : [];

    /* FILTER DROPDOWN LOGIC
        Support both single-column returns (value strings) and two-column returns (id,name).
        We'll return values as array of { label, value } to preserve ids when available.
     */
    if (componentId === "sa_filter_client" ||
      componentId === "sa_filter_agent" ||
      componentId === "sa_filter_consignee" ||
      componentId === "sa_filter_product") {

      if (!rows || rows.length === 0) return { datasource: "db", data: { values: [{ label: "All", value: "All" }] } };

      const cols = inferColumns(rows);
      const firstCol = cols[0];
      const secondCol = cols[1];

      const values = rows.map(r => {
        if (secondCol && (typeof r[secondCol] === "string")) {
          return { label: String(r[secondCol]), value: r[firstCol] ?? String(r[secondCol]) };
        }
        return { label: String(r[firstCol] ?? ""), value: r[firstCol] ?? String(r[firstCol]) };
      }).filter(v => v.label);

      const seen = new Set();
      const uniq = [];
      for (const v of values) {
        const key = String(v.value);
        if (!seen.has(key)) { seen.add(key); uniq.push(v); }
      }
      return { datasource: "db", data: { values: [{ label: "All", value: "All" }, ...uniq] } };
    }

    /* PIE */
    if (componentId === "sa_pie_branch" || componentId === "sa_pie_costcenter" || componentId === "sa_pie_channel") {
      const pie = normalizeToPie(rows);
      return { datasource: "db", data: pie };
    }

    /* TABLES */
    if (componentId.startsWith("sa_table_")) {
      return { datasource: "db", data: normalizeToTable(rows) };
    }

    /* MAP */
    if (componentId === "sa_map_sales") {
      if (!rows || rows.length === 0) return { datasource: "db", data: { locations: [] } };
      const cols = inferColumns(rows);
      const latKey = cols.find(c => /lat/i.test(c)) || cols.find(c => /latitude/i.test(c)) || cols.find(c => /y/i.test(c));
      const lngKey = cols.find(c => /(lng|lon|longitude|x)/i.test(c)) || cols[cols.length - 1];
      const nameKey = cols.find(c => /(name|city|place)/i.test(c)) || cols[0];
      const valueKey = cols.find(c => /sales|amount|value|total|orders/i.test(c.toLowerCase())) || cols[cols.length - 1];

      const locations = rows.map((r, i) => {
        const lat = Number(r[latKey]);
        const lng = Number(r[lngKey]);
        return {
          id: String(r[nameKey] ?? i),
          name: String(r[nameKey] ?? ""),
          lat: Number.isFinite(lat) ? lat : 0,
          lng: Number.isFinite(lng) ? lng : 0,
          sales: Number(r[valueKey]) || 0
        };
      }).filter(l => l.name);

      return { datasource: "db", data: { locations } };
    }

    /* KPI */
    if (componentId.startsWith("sa_kpi_")) {
      return { datasource: "db", data: normalizeKpi(rows, componentId) };
    }

    /* default pass-through */
    return { datasource: "db", data: rows };
  } catch (err) {
    console.warn("component fetch error", err);
    return { datasource: "dummy", data: DUMMY[componentId] };
  }
}

/* === Small subcomponents === */
function Header({ companyLogoUrl, dateRange, onDateChange }) {
  return (
    <div style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 12
    }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 20, color: NGRAPH_THEME.textPrimary }}>Sales Analytics</h1>
        <div style={{ fontSize: 12, color: "#666" }}>Dashboard</div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
          <small style={{ color: "#666" }}>Date range</small>
          <DateRangeInput value={dateRange} onChange={onDateChange} />
        </div>
        <img src={companyLogoUrl} alt="company" style={{ height: 40, borderRadius: 4, objectFit: "contain" }} />
      </div>
    </div>
  );
}

function DateRangeInput({ value, onChange }) {
  const [local, setLocal] = useState(value || { start: "", end: "" });
  useEffect(() => setLocal(value || { start: "", end: "" }), [value]);

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <input
        type="date"
        value={local.start ?? ""}
        onChange={(e) => {
          const nv = { ...local, start: e.target.value ?? "" };
          setLocal(nv);
          onChange && onChange(nv);
        }}
        style={{ padding: 6, borderRadius: 4, border: "1px solid #ddd" }}
      />
      <span style={{ color: "#999" }}>—</span>
      <input
        type="date"
        value={local.end ?? ""}
        onChange={(e) => {
          const nv = { ...local, end: e.target.value ?? "" };
          setLocal(nv);
          onChange && onChange(nv);
        }}
        style={{ padding: 6, borderRadius: 4, border: "1px solid #ddd" }}
      />
    </div>
  );
}

function KpiGrid({ items }) {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(6, 1fr)",
      gap: 12,
      marginBottom: 12
    }}>
      {items.map(it => (
        <div key={it.id} style={{
          background: NGRAPH_THEME.primarySoft,
          border: `1px solid ${NGRAPH_THEME.kpiBorder}`,
          borderRadius: 8,
          padding: 12,
          minHeight: 72,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between"
        }}>
          <div style={{ fontSize: 12, color: "#666" }}>{it.label}</div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: NGRAPH_THEME.textPrimary }}>
              {(() => {
                if (!it || it.value === undefined || it.value === null) return "-";
                if (it.id === "sa_kpi_sales") return money(it.value);
                if (it.id === "sa_kpi_rate") return rateFmt(it.value);
                return numberFmt(it.value);
              })()}
            </div>
            <div style={{ fontSize: 12, color: it.previousValue != null ? (it.value >= it.previousValue ? "#138000" : "#d12b2b") : "#666" }}>
              {it.previousValue != null ? pct(it.previousValue, it.value) : "—"}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function FiltersRow({ filters, options, onChange }) {
  const keys = ["client", "consignee", "agent", "product"];
  return (
    <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
      {keys.map(key => {
        const opts = options[`sa_filter_${key}`]?.values ?? ["All"];
        const selected = filters[key] ?? "All";
        return (
          <select key={key}
            value={selected}
            onChange={(e) => onChange({ ...filters, [key]: e.target.value })}
            style={{ padding: 8, borderRadius: 6, border: "1px solid #ddd", minWidth: 180 }}>
            {opts.map((v, i) => {
              if (typeof v === "object" && v !== null) {
                return <option key={String(v.value) + i} value={String(v.value)}>{v.label}</option>;
              }
              return <option key={String(v) + i} value={String(v)}>{String(v)}</option>;
            })}
          </select>
        );
      })}
    </div>
  );
}

function DonutWidget({ title, data }) {
  const COLORS = ["#E97F2C", "#F3B17A", "#FFD9B2", "#B35A24", "#E5A66D", "#F7EDE6"];
  if (!data || !Array.isArray(data.items) || data.items.length === 0) return <div style={{ padding: 12, borderRadius: 8, border: "1px solid #eee" }}>No data</div>;
  return (
    <div style={{ background: "#fff", padding: 12, borderRadius: 8, border: "1px solid #eee" }}>
      <div style={{ fontSize: 13, marginBottom: 8 }}>{title}</div>
      <div style={{ height: 180 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie dataKey="value" data={data.items} cx="50%" cy="50%" outerRadius={60} innerRadius={28} paddingAngle={2}>
              {data.items.map((entry, index) => <Cell key={entry.label + index} fill={COLORS[index % COLORS.length]} />)}
            </Pie>
            <ReTooltip
              formatter={(value, name, props) => {
                const label = props?.payload?.label || "";
                return [money(value), label];
              }}
              wrapperStyle={{ borderRadius: 8 }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
        {data.items.map((it, i) => (
          <div key={it.label + i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#444" }}>
            <div style={{ width: 12, height: 12, background: COLORS[i % COLORS.length], borderRadius: 3 }} />
            <div>{it.label}</div>
            <div style={{ color: "#888", marginLeft: 6 }}>{money(it.value)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LineAreaWidget({ title, data }) {
  const merged = useMemo(() => {
    if (!data || (!data.current && !data.previous)) return [];
    const xs =
      data?.current?.length
        ? data.current.map(d => d.x)
        : data?.previous?.length
          ? data.previous.map(d => d.x)
          : [];

    const mapPrev = (data.previous || []).reduce((acc, cur) => { acc[cur.x] = cur; return acc; }, {});
    const mapCur = (data.current || []).reduce((acc, cur) => { acc[cur.x] = cur; return acc; }, {});

    return xs.map(x => ({
      x,
      sales: (mapCur[x] && mapCur[x].sales != null) ? mapCur[x].sales : (mapPrev[x]?.sales ?? 0),
      qty: (mapCur[x] && mapCur[x].qty != null) ? mapCur[x].qty : (mapPrev[x]?.qty ?? 0),
      prevSales: mapPrev[x]?.sales ?? null
    }));
  }, [data]);

  if (!data) {
    return (
      <div style={{ background: "#fff", padding: 12, borderRadius: 8, border: "1px solid #eee" }}>
        {title}
        <div style={{ padding: 12 }}>No data</div>
      </div>
    );
  }

  return (
    <div style={{ background: "#fff", padding: 12, borderRadius: 8, border: "1px solid #eee" }}>
      <div style={{ fontSize: 13, marginBottom: 8 }}>{title}</div>
      <div style={{ height: 260 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={merged} margin={{ top: 8, right: 30, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={NGRAPH_THEME.primary} stopOpacity={0.6} />
                <stop offset="95%" stopColor={NGRAPH_THEME.primary} stopOpacity={0.05} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke={NGRAPH_THEME.grid} />
            <XAxis dataKey="x" tickFormatter={formatDateShort} />
            <YAxis tickFormatter={v => v >= 1e6 ? `${(v / 1e6).toFixed(0)}M` : v} />

            <ReTooltip
              formatter={(value, name) => {
                if (name === "prevSales") return [money(value), "Prev Sales"];
                if (name === "sales") return [money(value), "Sales"];
                if (name === "qty") return [value?.toLocaleString?.() ?? value, "Qty"];
                return [value, name];
              }}
            />

            <Area type="monotone" dataKey="sales" stroke={NGRAPH_THEME.primary} fillOpacity={1} fill="url(#colorSales)" />
            <Line type="monotone" dataKey="prevSales" stroke="#888" strokeDasharray="4 4" dot={false} />
            <Legend />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// MODIFIED MAP COMPONENT
// Renamed to ProfessionalMap to use a geographic-aware projection simulation
// ----------------------------------------------------------------------

// Bounding box for India (approximate values for projection scale)
const INDIA_BOUNDS = {
  minLat: 8.0,  // Kanyakumari
  maxLat: 37.0, // Kashmir
  minLng: 68.0, // Gujarat
  maxLng: 98.0, // Arunachal Pradesh
};

function ProfessionalMap({ title, data }) {
  if (!data || !data.locations) return <div style={{ padding: 12 }}>No map data</div>;
  const locs = data.locations;
  if (!locs || locs.length === 0) return <div style={{ padding: 12 }}>No map data</div>;

  const width = 450, height = 300; // Adjusted for a better aspect ratio for India
  const maxSales = Math.max(...locs.map(l => l.sales || 0));

  // Projection function scaled to India bounds
  function projectToIndiaMap(lat, lng) {
    const { minLat, maxLat, minLng, maxLng } = INDIA_BOUNDS;
    const latRange = maxLat - minLat;
    const lngRange = maxLng - minLng;

    // Use an internal padding/margin (e.g., 40 units total, 20 on each side)
    const padding = 20;
    const chartWidth = width - 2 * padding;
    const chartHeight = height - 2 * padding;

    // Scaling Lng (X-axis)
    let x = ((lng - minLng) / lngRange) * chartWidth + padding;

    // Scaling Lat (Y-axis), inverted for screen coordinates (Y=0 is top)
    let y = (1 - (lat - minLat) / latRange) * chartHeight + padding;

    return { x, y };
  }

  // Simple SVG path data representing the outline of India
  // NOTE: This is a simplified placeholder. A real map uses thousands of coordinates.
  // This path simulates the general shape of India for a professional look.
  const indiaOutlinePath = "M70 280 L120 290 L150 240 L190 250 L230 220 L260 180 L290 140 L310 120 L330 170 L350 200 L370 180 L390 140 L370 100 L330 70 L290 40 L260 30 L210 30 L160 60 L110 90 L80 130 L70 190 L70 250 Z";

  return (
    <div style={{ background: "#fff", padding: 12, borderRadius: 8, border: "1px solid #eee" }}>
      <div style={{ fontSize: 13, marginBottom: 8 }}>{title}</div>
      <div style={{ position: 'relative', height: height, width: "100%", overflow: 'hidden' }}>
        <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height: height }}>
          {/* Background: Simulate a map appearance */}
          <rect x="0" y="0" width={width} height={height} fill="#EAEAEA" />

          {/* Map Outline (Styled to look like a shaded map region) */}
          <path d={indiaOutlinePath} fill="#F7EDE6" stroke="#D1CFCF" strokeWidth="0.5" />

          {/* Plotting the data points */}
          {locs.map(loc => {
            const p = projectToIndiaMap(loc.lat, loc.lng);
            // Scale radius: min 4, max 16
            const r = 4 + (loc.sales / (maxSales || 1)) * 12;

            return (
              <g key={loc.id}>
                <circle cx={p.x} cy={p.y} r={r} fill={NGRAPH_THEME.primary} opacity={0.8} stroke="#fff" strokeWidth="1.5" />
                {/* Position the name tag outside the bubble */}
                <text x={p.x + r + 2} y={p.y + 4} fontSize="12" fontWeight="500" fill="#222">{loc.name}</text>
              </g>
            );
          })}

          {/* Simple Legend/Scale for visual reference */}
          <g transform={`translate(${width - 150}, ${height - 20})`}>
            <text x="0" y="0" fontSize="10" fill="#666">Sales Scale:</text>
            <rect x="40" y="-10" width="10" height="10" fill={NGRAPH_THEME.primary} opacity="0.8" />
            <text x="55" y="0" fontSize="10" fill="#666">Size = Sales</text>
          </g>
        </svg>
      </div>
    </div>
  );
}

function TableWidget({ title, data }) {
  if (!data) return <div style={{ padding: 12 }}>No data</div>;
  return (
    <div style={{ background: "#fff", padding: 12, borderRadius: 8, border: "1px solid #eee" }}>
      <div style={{ fontSize: 13, marginBottom: 8 }}>{title}</div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr>
              {data.columns.map(c => <th key={c} style={{ textAlign: "left", padding: "6px 8px", color: "#666" }}>{c}</th>)}
            </tr>
          </thead>
          <tbody>
            {data.rows.map((r, i) => <tr key={i} style={{ borderTop: "1px solid #f2f2f2" }}>
              {r.map((cell, j) => <td key={j} style={{ padding: "8px", verticalAlign: "middle" }}>{(typeof cell === "number" && j === 2) ? money(cell) : (cell === null || cell === undefined ? "-" : String(cell))}</td>)}
            </tr>)}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* === Main Page Component === */
export default function SalesAnalyticsPage({ userId: propUserId, companyLogoUrl = "/assets/company-logo.png" }) {
  const { id: routeUserId } = useParams();
  const userId = routeUserId || propUserId || "demo_tenant";

  // default: no date selected (empty) — backend sees null
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [filters, setFilters] = useState({ client: "All", consignee: "All", agent: "All", product: "All" });
  const [dataMap, setDataMap] = useState({});
  const [loading, setLoading] = useState({});
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userId) return;
    let mounted = true;

    setLoading(prev => {
      const nv = { ...prev };
      COMPONENT_IDS.forEach(id => nv[id] = true);
      return nv;
    });

    setError(null);

    Promise.all(COMPONENT_IDS.map(id => fetchComponentData(id, { userId, dateRange, filters })))
      .then(results => {
        if (!mounted) return;
        const map = {};
        COMPONENT_IDS.forEach((id, idx) => {
          const r = results[idx];
          if (!r || r.datasource === "dummy" || !r.data) map[id] = { datasource: "dummy", data: DUMMY[id] };
          else map[id] = { datasource: "db", data: r.data };
        });
        setDataMap(map);
        setLoading({});
      }).catch(err => {
        console.error("Failed to load components:", err);
        setError("Failed to load some components");
        const map = {};
        COMPONENT_IDS.forEach(id => map[id] = { datasource: "dummy", data: DUMMY[id] });
        setDataMap(map);
        setLoading({});
      });

    return () => { mounted = false; };
  }, [userId, dateRange.start, dateRange.end, filters.client, filters.consignee, filters.agent, filters.product]);

  // assemble KPI array for UI (dataMap.*.data is normalized to {id,label,value})
  const kpiItems = [
    (dataMap.sa_kpi_clients?.data) ?? DUMMY.sa_kpi_clients,
    (dataMap.sa_kpi_agents?.data) ?? DUMMY.sa_kpi_agents,
    (dataMap.sa_kpi_invoices?.data) ?? DUMMY.sa_kpi_invoices,
    (dataMap.sa_kpi_sales?.data) ?? DUMMY.sa_kpi_sales,
    (dataMap.sa_kpi_qty?.data) ?? DUMMY.sa_kpi_qty,
    (dataMap.sa_kpi_rate?.data) ?? DUMMY.sa_kpi_rate
  ];

  // filters options (normalized) — values array may contain objects {label,value}
  const filterOptions = {
    sa_filter_client: dataMap.sa_filter_client?.data ?? DUMMY.sa_filter_client,
    sa_filter_consignee: dataMap.sa_filter_consignee?.data ?? DUMMY.sa_filter_consignee,
    sa_filter_agent: dataMap.sa_filter_agent?.data ?? DUMMY.sa_filter_agent,
    sa_filter_product: dataMap.sa_filter_product?.data ?? DUMMY.sa_filter_product
  };

  return (
    <div style={{ padding: 18, fontFamily: "Inter, Roboto, Arial, sans-serif", background: NGRAPH_THEME.background }}>
      <Header companyLogoUrl={companyLogoUrl} dateRange={dateRange} onDateChange={setDateRange} />

      {error && <div style={{ color: "#a31b1b", marginBottom: 8 }}>{error}</div>}

      <KpiGrid items={kpiItems} />

      <FiltersRow filters={filters} options={filterOptions} onChange={setFilters} />

      {/* Three donuts (dynamic) */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        <DonutWidget title="Branch-wise Sales" data={dataMap.sa_pie_branch?.data ?? DUMMY.sa_pie_branch} />
        <DonutWidget title="Cost Center-wise Sales" data={dataMap.sa_pie_costcenter?.data ?? DUMMY.sa_pie_costcenter} />
        <DonutWidget title="Channel-wise Sales" data={dataMap.sa_pie_channel?.data ?? DUMMY.sa_pie_channel} />
      </div>

      {/* Map + Line */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
        <ProfessionalMap title="Location-wise Sales" data={dataMap.sa_map_sales?.data ?? DUMMY.sa_map_sales} />
        <LineAreaWidget title="Monthly Sales <> Qty (current vs previous)" data={dataMap.sa_line_sales_qty?.data ?? DUMMY.sa_line_sales_qty} />
      </div>

      {/* Lower 6 tables */}
      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        <TableWidget title="Book-wise Sales" data={dataMap.sa_table_book?.data ?? DUMMY.sa_table_book} />
        <TableWidget title="Category-wise Sales" data={dataMap.sa_table_category?.data ?? DUMMY.sa_table_category} />
        <TableWidget title="Product-wise Sales" data={dataMap.sa_table_product?.data ?? DUMMY.sa_table_product} />
      </div>

      <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        <TableWidget title="Client-wise Sales" data={dataMap.sa_table_client?.data ?? DUMMY.sa_table_client} />
        <TableWidget title="Delivery-wise Sales" data={dataMap.sa_table_delivery?.data ?? DUMMY.sa_table_delivery} />
        <TableWidget title="Agent-wise Sales" data={dataMap.sa_table_agent?.data ?? DUMMY.sa_table_agent} />
      </div>

      <div style={{ marginTop: 16, fontSize: 12, color: "#666" }}>
        <div>Note: Components use backend SQL when configured. Filters (Client/Agent/etc.) are populated from admin-provided SQL.</div>
        <div>PDF reference: <a href={REPORT_PDF_URL} target="_blank" rel="noreferrer">Meera MIS PDF</a></div>
      </div>
    </div>
  );
}