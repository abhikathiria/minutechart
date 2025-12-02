// src/pages/SalesAnalyticsPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  PieChart, Pie, Cell, Tooltip as ReTooltip, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Legend, Line, Customized, LineChart
} from "recharts";

import { useParams, useNavigate } from "react-router-dom";
import api from "../api";

import {
  format,
  parseISO,
  subDays,
  differenceInCalendarDays,
} from "date-fns";

import {
  ComposableMap,
  Geographies,
  Geography
} from "react-simple-maps";

import { scaleLinear } from "d3-scale";

/* ------------------------------------------------------------------
   CONFIG (Blue theme)
-------------------------------------------------------------------*/

const INDIA_GEOJSON = "/india_state_geo.json";

const NGRAPH_THEME = {
  primary: "#2B6CB0",        // mid blue
  primarySoft: "#E6F0FB",    // very light blue background
  accent: "#1E40AF",         // stronger blue
  grid: "#E8F1FB",
  textPrimary: "#0B2447",
  tooltipBg: "#ffffff",
  tooltipBorder: "#cfe3fb",
  background: "#F7FBFF",
  // kpiBorder: "#CDE1FB",
  kpiBorder: "#2B6CB0",
  header: "#0a2345"
};

const COMPONENT_IDS = [
  "sa_kpi_clients",
  "sa_kpi_agents",
  "sa_kpi_invoices",
  "sa_kpi_sales",
  "sa_kpi_qty",
  "sa_kpi_rate",

  "sa_filter_client",
  "sa_filter_consignee",
  "sa_filter_agent",
  "sa_filter_product",

  "sa_pie_branch",
  "sa_pie_costcenter",
  "sa_pie_channel",

  "sa_map_sales",
  "sa_line_sales_qty",

  "sa_table_book",
  "sa_table_category",
  "sa_table_product",
  "sa_table_client",
  "sa_table_delivery",
  "sa_table_agent",
];

const TABLE_PAGE_SIZE = 5;

/* ------------------------------------------------------------------
   UTILITIES
-------------------------------------------------------------------*/

function money(v) {
  if (v === null || v === undefined) return "-";
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v);

  const sign = n < 0 ? "-" : "";
  const absN = Math.abs(n);

  if (absN >= 1e9) return `${sign}₹${(absN / 1e9).toFixed(2)}B`;
  if (absN >= 1e6) return `${sign}₹${(absN / 1e6).toFixed(2)}M`;

  return `${sign}₹${absN.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

function numberFmt(v) {
  if (v === null || v === undefined) return "-";
  const n = Number(v);
  return Number.isFinite(n)
    ? n.toLocaleString("en-IN", { maximumFractionDigits: 0 })
    : String(v);
}

function rateFmt(v) {
  if (v === null || v === undefined) return "-";
  const n = Number(v);
  return Number.isFinite(n) ? n.toFixed(2) : String(v);
}

function formatDateShort(d) {
  if (!d) return "";
  try {
    return format(parseISO(d), "MMM yy");
  } catch {
    return d;
  }
}

function formatDateFull(d) {
  if (!d) return "";
  try {
    return format(parseISO(d), "d MMM, yyyy");
  } catch {
    return d;
  }
}


function inferColumns(rows) {
  if (!rows.length) return [];
  return Object.keys(rows[0]);
}

/* ------------------------------------------------------------------
   DATA NORMALIZATION HELPERS
-------------------------------------------------------------------*/

function normalizeToPie(rows) {
  if (!rows.length) return { items: [] };

  const cols = inferColumns(rows);

  let labelCol = cols.find(c => typeof rows[0][c] === "string") || cols[0];
  let valueCol =
    cols.find(c => typeof rows[0][c] === "number") ||
    cols.find(c => String(rows[0][c]).match(/^-?\d+(\.\d+)?$/)) ||
    cols[1];

  const items = rows
    .map(r => ({
      label: String(r[labelCol] ?? ""),
      value: Number(r[valueCol]) || 0
    }))
    .filter(r => r.label && Number.isFinite(r.value));

  if (!items.length) return { items: [] };

  const total = items.reduce((s, x) => s + x.value, 0);

  return {
    items: items.map(i => ({
      ...i,
      percentage: total > 0 ? (i.value / total) * 100 : 0
    }))
  };
}

function normalizeToTable(rows) {
  const cols = inferColumns(rows);
  return {
    columns: cols,
    rows: rows.map(r => cols.map(c => r[c]))
  };
}

function normalizeKpi(rows, componentId) {
  if (!rows || !rows.length) return null;
  const src = rows[0];

  const keys = Object.keys(src);
  const numeric = keys.filter(k =>
    String(src[k]).match(/^-?\d+(\.\d+)?$/)
  );

  const priority = ["value", "sales", "amount", "total", "count", "qty"];
  const valueKey = numeric.find(k =>
    priority.includes(k.toLowerCase())
  ) || numeric[0];

  const stringKeys = keys.filter(k => typeof src[k] === "string");
  const labelKey =
    stringKeys.find(k =>
      ["name", "title", "client", "branch"].some(x =>
        k.toLowerCase().includes(x)
      )
    ) || stringKeys[0] || valueKey;

  return {
    id: componentId,
    label: src[labelKey],
    value: Number(src[valueKey]) || 0,
    previousValue: Number(src.previousValue) || null,
    title: src.title || src[labelKey]
  };
}

/* ------------------------------------------------------------------
   API CALL
-------------------------------------------------------------------*/
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
    return null;
  }
}

/* ------------------------------------------------------------------
   COMPONENT DATA FETCHER (WITH FIXED LINE CHART LOGIC)
-------------------------------------------------------------------*/

async function fetchComponentData(componentId, { userId, dateRange, filters }) {
  const startISO = dateRange.start ? `${dateRange.start}T00:00:00` : null;
  const endISO = dateRange.end ? `${dateRange.end}T23:59:59` : null;

  /* ----------------------------------------------
     FIXED LINE CHART LOGIC
  ------------------------------------------------*/
  if (componentId === "sa_line_sales_qty") {
    try {
      const start = dateRange.start ? parseISO(dateRange.start) : null;
      const end = dateRange.end ? parseISO(dateRange.end) : null;
      if (!start || !end) return { datasource: "db", data: null };

      const days = differenceInCalendarDays(end, start) + 1;

      // Correct previous period shift
      const prevEnd = subDays(start, 1);
      const prevStart = subDays(prevEnd, days - 1);

      const common = {
        componentId,
        clientId: filters.client === "All" ? null : filters.client,
        agentId: filters.agent === "All" ? null : filters.agent,
        productId: filters.product === "All" ? null : filters.product,
        consigneeId: filters.consignee === "All" ? null : filters.consignee
      };

      const currentBody = {
        ...common,
        startDate: startISO,
        endDate: endISO
      };

      const previousBody = {
        ...common,
        startDate: `${format(prevStart, "yyyy-MM-dd")}T00:00:00`,
        endDate: `${format(prevEnd, "yyyy-MM-dd")}T23:59:59`
      };

      const curr = await postExecuteSalesComponent(userId, currentBody);
      const prev = await postExecuteSalesComponent(userId, previousBody);

      const normalizeLine = (res) => {
        if (!Array.isArray(res?.data)) return [];

        const rows = res.data;
        if (!rows.length) return [];

        const sample = rows[0];
        const keys = Object.keys(sample);

        // 1. find a DATE column
        const dateKey =
          keys.find(k =>
            typeof sample[k] === "string" &&
            !isNaN(Date.parse(sample[k]))
          )
          || keys.find(k => k.toLowerCase().includes("date"))
          || keys.find(k => k.toLowerCase().includes("label"))
          || keys[0]; // fallback

        // 2. find NUMERIC column
        const numericKey =
          keys.find(k => typeof sample[k] === "number")
          || keys.find(k => !isNaN(Number(sample[k])))
          || keys[1]; // fallback

        return rows.map(r => ({
          x: r[dateKey],
          sales: Number(r[numericKey]) || 0,
          realCurrDate: r[dateKey]
        }));
      };

      const current = normalizeLine(curr);
      const previous = normalizeLine(prev);

      if (!current.length && !previous.length)
        return { datasource: "db", data: null };

      return {
        datasource: "db",
        data: { current, previous },
        title: curr?.title || "Monthly Sales <> Qty"
      };
    } catch (err) {
      console.warn("line error:", err);
      return { datasource: "db", data: null };
    }
  }

  /* ----------------------------------------------
     NORMAL COMPONENTS
  ------------------------------------------------*/

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
    if (!res?.success || res.data == null)
      return { datasource: "db", data: null };

    const rows = Array.isArray(res.data)
      ? res.data
      : typeof res.data === "object"
        ? [res.data]
        : [];

    // FILTER DROPDOWNS
    if (componentId.startsWith("sa_filter_")) {
      if (!rows.length) return { datasource: "db", data: null };

      const cols = inferColumns(rows);
      const first = cols[0];
      const second = cols[1];

      const values = rows
        .map(r => ({
          label: r[second] ?? r[first],
          value: r[first]
        }))
        .filter(v => v.label);

      const uniq = [];
      const seen = new Set();
      for (const v of values) {
        if (!seen.has(v.value)) {
          uniq.push(v);
          seen.add(v.value);
        }
      }

      return {
        datasource: "db",
        data: { values: uniq },
        title: res.title || componentId
      };
    }

    // PIE
    if (
      componentId === "sa_pie_branch" ||
      componentId === "sa_pie_costcenter" ||
      componentId === "sa_pie_channel"
    ) {
      const pie = normalizeToPie(rows);
      return {
        datasource: "db",
        data: pie.items.length ? pie : null,
        title: res.title
      };
    }

    // TABLE
    if (componentId.startsWith("sa_table_")) {
      const table = normalizeToTable(rows);
      return {
        datasource: "db",
        data: table.columns.length ? table : null,
        title: res.title
      };
    }

    // MAP
    if (componentId === "sa_map_sales") {
      if (!rows.length) return { datasource: "db", data: null };

      const cols = inferColumns(rows);
      const nameKey = cols.find(c => /(name|state|region|city)/i.test(c)) || cols[0];
      const valKey = cols.find(c =>
        /(sales|amount|value|total)/i.test(c.toLowerCase())
      ) || cols[1];

      const locations = rows.map(r => ({
        id: r[nameKey],
        name: r[nameKey],
        sales: Number(r[valKey]) || 0
      }));

      return {
        datasource: "db",
        data: { locations },
        title: res.title
      };
    }

    // KPI
    if (componentId.startsWith("sa_kpi_")) {
      const kpi = normalizeKpi(rows, componentId);
      return {
        datasource: "db",
        data: {
          ...kpi,
          title: res.title || kpi.title   // keep title from API if present
        },
        title: res.title || kpi.title
      };
    }


    return { datasource: "db", data: rows };
  } catch (err) {
    console.warn("component fetch error", err);
    return { datasource: "db", data: null };
  }
}

/* ------------------------------------------------------------------
   UI COMPONENTS (Header, Filters, KPI, Donut, Line, Map, Table)
-------------------------------------------------------------------*/

/* Creative No-Logo Placeholder A */
function NoLogoPlaceholder({ width = 120, height = 44 }) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius: 8,
        background: NGRAPH_THEME.primarySoft,
        border: `1px solid ${NGRAPH_THEME.kpiBorder}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        padding: 6,
        boxSizing: "border-box",
        flexDirection: "column",
      }}
    >
      <svg width="20" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
        <rect
          x="2"
          y="6"
          width="20"
          height="12"
          rx="2"
          stroke={NGRAPH_THEME.primary}
          strokeWidth="1.5"
          fill="transparent"
        />
        <path d="M6 10h12" stroke={NGRAPH_THEME.primary} strokeWidth="1.2" />
        <path d="M8 14v2" stroke={NGRAPH_THEME.primary} strokeWidth="1.2" />
      </svg>
      <div
        style={{ fontSize: 11, color: NGRAPH_THEME.primary, fontWeight: 600 }}
      >
        No Logo
      </div>
    </div>
  );
}

function Header({ companyLogoUrl }) {
  return (
    <div
      style={{
        background: NGRAPH_THEME.header,
        padding: "1rem 1.25rem", // RELATIVE UNITS
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap", // ALLOW WRAPPING on small screens
        minHeight: "4rem", // Ensure min height
      }}
    >
      {/* Title */}
      <h1
        style={{
          margin: 0,
          fontSize: "1.625rem", // RELATIVE FONT SIZE (26px)
          fontWeight: 700,
          color: "white",
          flexGrow: 1, // Allow growth
        }}
      >
        Sales Analytics
      </h1>

      {/* Logo */}
      <div style={{ flexShrink: 0, marginTop: "0.5rem" /* ADD SPACE IF WRAPPED */ }}>
        {companyLogoUrl ? (
          <img
            src={companyLogoUrl}
            alt="company"
            style={{
              height: "3rem", // RELATIVE HEIGHT (48px)
              width: "11.25rem", // RELATIVE WIDTH (180px)
              maxWidth: "100%", // IMPORTANT: prevent overflow
              objectFit: "contain",
              background: "#0a2345",
            }}
            onError={(e) => {
              e.target.onerror = null;
              e.target.style.display = "none";
            }}
          />
        ) : (
          <NoLogoPlaceholder width={180} height={48} />
        )}
      </div>
    </div>
  );
}

function DateRangeInput({ value, onPendingChange, onApply }) {
  const [local, setLocal] = useState(value || { start: "", end: "" });

  useEffect(() => setLocal(value || { start: "", end: "" }), [value]);

  const style = {
    padding: "0.375rem 0.5rem", // RELATIVE UNITS (6px 8px)
    borderRadius: 6,
    border: `1px solid ${NGRAPH_THEME.kpiBorder}`,
    fontSize: 14,
    width: "7.5rem", // RELATIVE WIDTH (120px)
    maxWidth: "40vw", // CATCHALL: prevent input from being too wide
    background: "#fff",
    color: NGRAPH_THEME.textPrimary,
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.5rem", // RELATIVE GAP (8px)
        flexWrap: "wrap", // ALLOW WRAPPING if needed
        justifyContent: "flex-end", // Keep right-aligned
      }}
    >
      <input
        type="date"
        value={local.start}
        onChange={(e) => {
          const v = { ...local, start: e.target.value };
          setLocal(v);
          onPendingChange(v); // notify parent but DON'T apply
        }}
        style={style}
      />

      <span
        style={{ color: NGRAPH_THEME.textPrimary, fontSize: 14, fontWeight: 500 }}
      >
        to
      </span>

      <input
        type="date"
        value={local.end}
        onChange={(e) => {
          const v = { ...local, end: e.target.value };
          setLocal(v);
          onPendingChange(v);
        }}
        style={style}
      />

      <button
        onClick={() => onApply(local)} // only apply on click
        style={{
          padding: "0.375rem 0.75rem", // RELATIVE UNITS (6px 12px)
          background: NGRAPH_THEME.accent,
          color: "white",
          borderRadius: 6,
          border: "none",
          cursor: "pointer",
          fontSize: 14,
          fontWeight: 700, // Bolder button text
        }}
      >
        Apply
      </button>
    </div>
  );
}

/* KPI GRID */
function KpiGrid({ items }) {
  if (!items || !items.length) return null;

  return (
    <div
      style={{
        display: "grid",
        // RESPONSIVE GRID: Auto-fit as many columns as possible, min size 160px
        gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
        gap: "0.75rem", // RELATIVE GAP (12px)
        marginBottom: "0.75rem", // RELATIVE MARGIN (12px)
      }}
    >
      {items.map((it, i) => {
        return (
          <div
            key={i}
            style={{
              border: `2px solid ${NGRAPH_THEME.kpiBorder}`,
              padding: "0.625rem", // RELATIVE PADDING (10px)
              background: "#fff",
              boxShadow: "0 1px 4px rgba(43,108,176,0.06)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: "1.125rem", // RELATIVE FONT SIZE (18px)
                fontWeight: "semibold",
                color: "#356FAF",
              }}
            >
              {it.title || it.label}
            </div>

            <div
              style={{
                fontSize: "2rem", // RELATIVE FONT SIZE (32px)
                fontWeight: 700,
                color: "#000",
              }}
            >
              {it.id === "sa_kpi_sales"
                ? money(it.value)
                : it.id === "sa_kpi_rate"
                  ? rateFmt(it.value)
                  : numberFmt(it.value)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* Filters Row */
function FiltersRow({ filters, options, onChange }) {
  const keys = ["client", "consignee", "agent", "product"];

  return (
    <div
      style={{
        display: "grid",
        // RESPONSIVE GRID: Auto-fit as many columns as possible, min size 200px
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: "0.75rem", // RELATIVE GAP (12px)
        marginBottom: "0.75rem", // RELATIVE MARGIN (12px)
      }}
    >
      {keys.map((k) => {
        const optObj = options[`sa_filter_${k}`] || { values: [] };
        const list = [
          { label: optObj.title || k, value: "All" },
          ...optObj.values,
        ];

        return (
          <select
            key={k}
            value={filters[k]}
            onChange={(e) => onChange({ ...filters, [k]: e.target.value })}
            style={{
              width: "100%",
              padding: "0.375rem 0.5rem", // RELATIVE UNITS (6px 8px)
              border: `2px solid ${NGRAPH_THEME.kpiBorder}`,
              fontSize: "1rem", // RELATIVE FONT SIZE (16px)
              fontWeight: 700,
              background: "#fff",
              color: "#0B3A66",
            }}
          >
            {list.map((v, i) => (
              <option key={i} value={String(v.value)}>
                {v.label}
              </option>
            ))}
          </select>
        );
      })}
    </div>
  );
}

/* DONUT WIDGET (blue palette) */
const DONUT_COLORS = [
  "#2B6CB0",
  "#1E90FF",
  "#60A5FA",
  "#93C5FD",
  "#BEE3F8",
  "#E6F0FB",
];

function DonutWidget({ title, data }) {
  const hasData = data?.items?.length;
  const items = hasData
    ? [...data.items].sort((a, b) => b.value - a.value)
    : [];
  const renderInsideLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
  }) => {
    const radius = innerRadius + (outerRadius - innerRadius) / 2;
    const RADIAN = Math.PI / 180;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    if (percent * 100 < 3) return null; // hide tiny slice labels if you want

    return (
      <text
        x={x}
        y={y}
        fill="#fff"
        fontSize={11}
        fontWeight={600}
        textAnchor="middle"
        dominantBaseline="central"
      >
        {(percent * 100).toFixed(1)}%
      </text>
    );
  };

  const dynamicTruncate = (str) => {
    // Adjusted logic: More aggressive truncation on small screens
    const w = window.innerWidth;
    let limit = 25; // Default for large screens
    if (w < 1280) limit = 18;
    if (w < 1024) limit = 15;
    if (w < 768) limit = 12; // Tablet/Mobile Portrait
    if (w < 480) limit = 10; // Mobile Portrait

    return str.length > limit ? str.slice(0, limit) + "…" : str;
  };

  return (
    <div style={{ textAlign: "center", marginBottom: "0.75rem" /* RELATIVE MARGIN */ }}>
      {/* Title outside and centered */}
      <div
        style={{
          fontWeight: 700,
          fontSize: "1rem", // RELATIVE FONT SIZE (16px)
          color: "#0B3A66",
          marginBottom: "0.5rem", // RELATIVE MARGIN (8px)
        }}
      >
        {title}
      </div>

      <div
        style={{
          background: "#fff",
          border: `2px solid ${NGRAPH_THEME.kpiBorder}`,
          padding: "0.75rem", // RELATIVE PADDING (12px)
        }}
      >
        {!hasData && (
          <div style={{ padding: "0.75rem", color: "#000" }}>No data</div>
        )}

        {hasData && (
          <div
            style={{
              display: "flex",
              flexDirection: "column", // STACK CHART AND LEGEND on small screens
              alignItems: "center",
              gap: "1rem", // RELATIVE GAP (16px)
            }}
          >
            {/* --- TOP/LEFT SIDE: Donut Chart --- */}
            <div style={{ width: "100%", height: 220, maxWidth: 300 /* LIMIT CHART SIZE */ }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    dataKey="value"
                    data={items}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    innerRadius={35}
                    label={renderInsideLabel}
                    labelLine={false}
                  >
                    {items.map((e, i) => (
                      <Cell
                        key={i}
                        fill={DONUT_COLORS[i % DONUT_COLORS.length]}
                      />
                    ))}
                  </Pie>

                  <Customized>
                    {({ width, height }) => {
                      const total = items.reduce((s, x) => s + x.value, 0);
                      return (
                        <g>
                          <text
                            x={width / 2}
                            y={height / 2 - 10}
                            textAnchor="middle"
                            style={{
                              fontSize: 14,
                              fontWeight: 700,
                              fill: "#0B3A66",
                            }}
                          >
                            {money(total)}
                          </text>

                          <text
                            x={width / 2}
                            y={height / 2 + 10}
                            textAnchor="middle"
                            style={{ fontSize: 12, fill: "#6b8fbf" }}
                          >
                            Total
                          </text>
                        </g>
                      );
                    }}
                  </Customized>

                  <ReTooltip
                    wrapperStyle={{ outline: "none" }}
                    formatter={(v, n, p) => [
                      money(v),
                      `${dynamicTruncate(
                        p.payload.label
                      )} (${p.payload.percentage.toFixed(1)}%)`,
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* --- BOTTOM/RIGHT SIDE: Legend --- */}
            {/* <div
              style={{
                width: "100%",
                fontSize: 12,
                display: "flex",
                flexDirection: "column",
                alignSelf: "flex-start", // align to start of container
              }}
            > */}
            <div
              style={{
                width: "100%",
                maxHeight: "100px",   // fixed height
                overflowY: "auto",    // scrolling instead of shrinking chart
                paddingRight: 4,
                fontSize: 12,
              }}
            >
              {items.map((it, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    gap: 4,
                    marginBottom: 8,
                    alignItems: "center",
                  }}
                >
                  <div
                    style={{
                      width: 10,
                      height: 10,
                      background: DONUT_COLORS[i % DONUT_COLORS.length],
                      borderRadius: "50%",
                      flexShrink: 0,
                    }}
                  ></div>

                  <div style={{ color: "#0B3A66", overflow: "hidden" }}>
                    {dynamicTruncate(it.label)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


function getDateRange(arr) {
  if (!arr?.length) return "";
  const first = arr[0].realPrevDate || arr[0].x;
  const last = arr[arr.length - 1].realPrevDate || arr[arr.length - 1].x;
  return `${formatDateShort(first)} - ${formatDateShort(last)}`;
}



function CustomLineLegend({ payload }) {
  const prevRange = getDateRange(window.__prevData);

  return (
    <ul style={{ display: "flex", justifyContent: "center", gap: 20, listStyle: "none" }}>
      {payload.map((p, i) => {
        if (p.dataKey === "sales") {
          return (
            <li key={i}>
              <span style={{ width: 12, height: 2, marginBottom: 3, background: p.color, display: "inline-block", marginRight: 6 }} />
              Sales
            </li>
          );
        }

        if (p.dataKey === "prevSales") {
          return (
            <li key={i}>
              <span style={{ width: 12, height: 2, marginBottom: 3, background: p.color, display: "inline-block", marginRight: 6 }} />
              Prev Sales ({prevRange})
            </li>
          );
        }
      })}
    </ul>
  );
}

function LineAreaWidget({ title, data }) {
  const merged = useMemo(() => {
    const curr = data?.current || [];
    const prev = data?.previous || [];

    if (!curr.length) return [];

    const xs = curr.map((d) => d.x);

    return xs.map((x, i) => ({
      x,
      sales: curr[i]?.sales ?? null,
      qty: curr[i]?.qty ?? null,
      realCurrDate: curr[i]?.x ?? null,

      prevSales: prev[i]?.sales ?? null,
      realPrevDate: prev[i]?.x ?? null,
    }));
  }, [data]);

  window.__prevData = data?.previous || [];

  if (!merged.length)
    return (
      <div
        style={{
          textAlign: "center",
          marginBottom: "0.75rem",
          height: "400px",
          display: "flex",
          flexDirection: "column"
        }}
      >
        <div
          style={{
            fontWeight: 700,
            fontSize: 16,
            color: "#0B3A66",
            marginBottom: 8,
          }}
        >
          {title}
        </div>

        <div
          style={{
            background: "#fff",
            padding: 12,
            border: `2px solid ${NGRAPH_THEME.kpiBorder}`,
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div style={{ padding: 12, color: "#000" }}>No data</div>
        </div>
      </div>
    );

  return (
    <div
      style={{
        textAlign: "center",
        marginBottom: "0.75rem",
        height: "400px",
        display: "flex",
        flexDirection: "column"
      }}
    >
      <div
        style={{
          fontWeight: 700,
          fontSize: 16,
          color: "#0B3A66",
          marginBottom: 8,
        }}
      >
        {title}
      </div>

      <div
        style={{
          background: "#fff",
          padding: 12,
          border: `2px solid ${NGRAPH_THEME.kpiBorder}`,
          flex: 1,
          position: "relative",
          minHeight: 0
        }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={merged} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e6efff" />

            <XAxis
              dataKey="x"
              fontSize={11}
              tick={{ fill: "#33527a" }}
              axisLine={{ stroke: "#c3d7ff" }}
              tickLine={{ stroke: "#c3d7ff" }}
              tickFormatter={formatDateShort}
            />

            <YAxis
              tickFormatter={(v) => (v >= 1e6 ? `${(v / 1e6).toFixed(0)}M` : v)}
              fontSize={11}
              tick={{ fill: "#33527a" }}
              axisLine={{ stroke: "#c3d7ff" }}
              tickLine={{ stroke: "#c3d7ff" }}
            />

            <ReTooltip
              content={(props) => {
                const p = props?.payload?.[0];
                if (!p) return null;
                const row = p.payload;

                return (
                  <div
                    style={{
                      background: "#fff",
                      padding: 8,
                      border: "1px solid #ddd",
                      borderRadius: 6,
                    }}
                  >
                    {row.sales != null && (
                      <div style={{ marginBottom: 4 }}>
                        <div style={{ fontWeight: 600 }}>
                          Sales ({formatDateShort(row.realCurrDate)})
                        </div>
                        <div>{money(row.sales)}</div>
                      </div>
                    )}

                    {row.prevSales != null && (
                      <div>
                        <div style={{ fontWeight: 600 }}>
                          Prev Sales ({formatDateShort(row.realPrevDate)})
                        </div>
                        <div>{money(row.prevSales)}</div>
                      </div>
                    )}
                  </div>
                );
              }}
            />

            <Line
              type="monotone"
              dataKey="sales"
              stroke="#2563eb"
              strokeWidth={3}
              dot={{ r: 4, stroke: "#2563eb", fill: "#fff" }}
              activeDot={{ r: 5 }}
            />

            <Line
              type="monotone"
              dataKey="prevSales"
              stroke="#8dabecff"
              strokeWidth={3}
              dot={{ r: 4, stroke: "#8dabecff", fill: "#fff" }}
              activeDot={{ r: 5 }}
            />

            <Legend content={<CustomLineLegend />} verticalAlign="top" height={30} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}


function ProfessionalMap({ title, data }) {
  const [tooltip, setTooltip] = useState(null);
  const mapRef = React.useRef(null);

  if (!data || !data.locations || data.locations.length === 0)
    return (
      <div
        style={{
          textAlign: "center",
          marginBottom: "0.75rem",
          height: "400px",
          display: "flex",
          flexDirection: "column"
        }}
      >
        <div
          style={{
            fontWeight: 700,
            fontSize: 16,
            color: "#0B3A66",
            marginBottom: 8,
          }}
        >
          {title}
        </div>

        <div
          style={{
            background: "#fff",
            padding: 12,
            border: `2px solid ${NGRAPH_THEME.kpiBorder}`,
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div style={{ padding: 12, color: "#000" }}>No data</div>
        </div>
      </div>
    );

  const regionData = {};
  data.locations.forEach((loc) => {
    const name = String(loc.name || "").trim();
    const value = Number(loc.sales) || 0;
    if (name) regionData[name] = (regionData[name] || 0) + value;
  });

  const values = Object.values(regionData);
  const min = Math.min(...values);
  const max = Math.max(...values);

  const colorScale = scaleLinear().domain([min, max]).range(["#E9F6FF", "#08306B"]);

  return (
    <div
      style={{
        textAlign: "center",
        marginBottom: "0.75rem",
        height: "400px",
        display: "flex",
        flexDirection: "column"
      }}
    >
      <div
        style={{
          fontWeight: 700,
          fontSize: 16,
          color: "#0B3A66",
          marginBottom: 8,
        }}
      >
        {title}
      </div>

      <div
        ref={mapRef}
        style={{
          background: "#fff",
          padding: 12,
          border: `2px solid ${NGRAPH_THEME.kpiBorder}`,
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minHeight: 0
        }}
      >
        {tooltip && (
          <div
            style={{
              position: "absolute",
              top: tooltip.y,
              left: tooltip.x,
              background: "#fff",
              padding: "6px 10px",
              border: "1px solid #dcefff",
              borderRadius: 4,
              fontSize: 12,
              pointerEvents: "none",
              zIndex: 10,
            }}
          >
            <strong style={{ color: "#0B3A66" }}>{tooltip.state}</strong>
            <br />
            {money(tooltip.value)}
          </div>
        )}

        {/* Map should take all available vertical space */}
        <div style={{ flex: 1, width: "100%", minHeight: 0 }}>
          <ComposableMap
            projection="geoMercator"
            projectionConfig={{ scale: 1000, center: [78.9629, 22.5937] }}
            style={{ width: "100%", height: "100%" }}
          >
            <Geographies geography={INDIA_GEOJSON}>
              {({ geographies }) =>
                geographies.map((geo) => {
                  const stateName =
                    geo.properties.NAME_1 ||
                    geo.properties.name ||
                    geo.properties.STATE ||
                    "";
                  const value = regionData[stateName] || 0;

                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      onMouseEnter={(evt) => {
                        const rect = mapRef.current.getBoundingClientRect();
                        setTooltip({
                          state: stateName,
                          value,
                          x: evt.clientX - rect.left + 10,
                          y: evt.clientY - rect.top - 10,
                        });
                      }}
                      onMouseLeave={() => setTooltip(null)}
                      style={{
                        default: {
                          outline: "none",
                          fill: value > 0 ? colorScale(value) : "#ffffff",
                          stroke: "#000",
                          strokeWidth: 0.8,
                        },
                        hover: {
                          outline: "none",
                          fill: value ? colorScale(value) : "#ffffff",
                          stroke: "#000",
                          strokeWidth: 1,
                        },
                        pressed: {
                          outline: "none",
                          stroke: "#000",
                          strokeWidth: 1,
                        },
                      }}
                    />
                  );
                })
              }
            </Geographies>
          </ComposableMap>
        </div>

        {/* Legend stays at the bottom without stretching widget height */}
        <div
          style={{
            marginTop: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 20,
            flexShrink: 0
          }}
        >
          <span style={{ fontWeight: 700, color: "#0B3A66" }}>Sales</span>
          <span style={{ fontWeight: 600, color: "#0B3A66" }}>{money(min)}</span>

          <div
            style={{
              width: 160,
              height: 16,
              background: `linear-gradient(to right, ${colorScale(min)}, ${colorScale(max)})`,
              border: "1px solid #ccc"
            }}
          />

          <span style={{ fontWeight: 600, color: "#0B3A66" }}>{money(max)}</span>
        </div>
      </div>
    </div>
  );
}


/* TABLE WIDGET (title outside + centered) */

function TableWidget({ title, data }) {
  const [page, setPage] = useState(1);

  if (!data?.columns?.length)
    return (
      <div
        style={{
          textAlign: "center",
          marginBottom: "0.75rem",
          minHeight: 260,
          height: "400px",
          display: "flex",
          flexDirection: "column"
        }}
      >
        <div
          style={{
            fontWeight: 700,
            fontSize: 16,
            color: "#0B3A66",
            marginBottom: 8,
          }}
        >
          {title}
        </div>

        <div
          style={{
            background: "#fff",
            padding: 12,
            border: `2px solid ${NGRAPH_THEME.kpiBorder}`,
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div style={{ padding: 12, color: "#000" }}>No data</div>
        </div>
      </div>
    );

  // ---------------------------------------------
  // EXTRACT TOTAL ROW
  // ---------------------------------------------
  let totalRow = null;
  let rows = [...data.rows];

  if (rows.length > 0) {
    const last = rows[rows.length - 1];
    const isTotal =
      Object.values(last).some(
        (v) => typeof v === "string" && v.toLowerCase().includes("total")
      );

    if (isTotal) {
      totalRow = last;
      rows = rows.slice(0, rows.length - 1);
    }
  }

  // If all rows are removed OR original rows had only the total row → show No data
  if (rows.length === 0) {
    return (
      <div
        style={{
          textAlign: "center",
          marginBottom: "0.75rem",
          height: "400px",
          display: "flex",
          flexDirection: "column"
        }}
      >
        <div
          style={{
            fontWeight: 700,
            fontSize: 16,
            color: "#0B3A66",
            marginBottom: 8,
          }}
        >
          {title}
        </div>

        <div
          style={{
            background: "#fff",
            padding: 12,
            border: `2px solid ${NGRAPH_THEME.kpiBorder}`,
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div style={{ padding: 12, color: "#000" }}>No data</div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------
  // DETECT MONEY COLUMNS (Dynamic)
  // ---------------------------------------------
  const MONEY_NAME_REGEX = /(amount|amt|total|price|value|cost|net|revenue|sales|balance|paid|receipt)/i;
  const moneyColumnIndexes = new Set();

  // 1) First check column names
  data.columns.forEach((col, idx) => {
    if (MONEY_NAME_REGEX.test(String(col))) moneyColumnIndexes.add(idx);
  });

  // 2) If no matches, fallback: inspect sample values
  if (moneyColumnIndexes.size === 0) {
    const sampleSize = Math.min(6, rows.length);
    for (let colIdx = 0; colIdx < data.columns.length; colIdx++) {
      let numericCount = 0;

      for (let r = 0; r < sampleSize; r++) {
        const val = rows[r]?.[colIdx];
        const cleaned = String(val).replace(/[,₹$]/g, "");
        if (val !== null && val !== undefined && val !== "" && !isNaN(Number(cleaned))) {
          numericCount++;
        }
      }
      if (numericCount >= Math.ceil(sampleSize * 0.6)) {
        moneyColumnIndexes.add(colIdx);
      }
    }
  }

  // ---------------------------------------------
  // PAGINATION (without total row)
  // ---------------------------------------------
  const total = rows.length;
  const pages = Math.ceil(total / TABLE_PAGE_SIZE);
  const start = (page - 1) * TABLE_PAGE_SIZE;
  const visible = rows.slice(start, start + TABLE_PAGE_SIZE);

  return (
    <div
      style={{
        marginBottom: "0.75rem",
        height: "400px",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          textAlign: "center",
          fontWeight: 700,
          fontSize: 16,
          color: "#0B3A66",
          marginBottom: 8,
        }}
      >
        {title}
      </div>

      <div
        style={{
          background: "#fff",
          border: `2px solid ${NGRAPH_THEME.kpiBorder}`,
          display: "flex",
          flexDirection: "column",
          minHeight: 260,
          height: "100%",
        }}
      >
        <div style={{ flex: 1, minHeight: 0, overflowX: "auto", overflowY: "auto" }}>
          <table style={{ width: "100%", minWidth: "400px", fontSize: 12 }}>
            <thead>
              <tr>
                <th style={{ width: "40px", background: NGRAPH_THEME.primary }}></th>

                {data.columns.map((c) => (
                  <th
                    key={c}
                    style={{
                      textAlign: "left",
                      padding: "6px 8px",
                      color: "#fff",
                      background: NGRAPH_THEME.primary,
                      fontSize: 14,
                    }}
                  >
                    {c}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {visible.map((row, i) => {
                const idx = start + i + 1;

                return (
                  <tr
                    key={i}
                    style={{
                      background: i % 2 === 1 ? NGRAPH_THEME.primarySoft : "#fff",
                      borderBottom: "1px solid #f2f8ff",
                      fontSize: 14,
                    }}
                  >
                    {/* INDEX COLUMN */}
                    <td
                      style={{
                        padding: "6px 8px",
                        whiteSpace: "nowrap",
                        color: NGRAPH_THEME.textPrimary,
                        fontWeight: 600,
                      }}
                    >
                      {idx}.
                    </td>

                    {/* DATA CELLS */}
                    {row.map((v, j) => {
                      const baseStyle = {
                        padding: "6px 8px",
                        whiteSpace: "normal",
                        wordBreak: "break-word",
                        color: NGRAPH_THEME.textPrimary,
                        lineHeight: 2,
                      };

                      // MONEY COLUMN (Dynamic)
                      const cleaned = String(v).replace(/[,₹$]/g, "");
                      if (
                        moneyColumnIndexes.has(j) &&
                        cleaned !== "" &&
                        !isNaN(Number(cleaned))
                      ) {
                        return (
                          <td key={j} style={{ ...baseStyle, whiteSpace: "nowrap", wordBreak: "normal", fontWeight: 600 }}>
                            {money(v)}
                          </td>
                        );
                      }

                      // PERCENTAGE COLUMN
                      if (typeof v === "string" && v.endsWith("%")) {
                        const num = parseFloat(v.replace("%", ""));
                        const text = isNaN(num) ? v : num.toFixed(1) + "%";
                        const color = !isNaN(num) && num < 0 ? "#d12b2b" : "#0B6623";

                        return (
                          <td key={j} style={{ ...baseStyle, color, fontWeight: 700 }}>
                            {text}
                          </td>
                        );
                      }

                      return (
                        <td key={j} style={baseStyle}>
                          {v}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}

              {/* TOTAL ROW */}
              {totalRow && (
                <tr
                  style={{
                    textAlign: "left",
                    padding: "6px 8px",
                    color: "#fff",
                    background: NGRAPH_THEME.primary,
                    fontSize: 14,
                    fontWeight: 700,
                  }}
                >
                  <td style={{ padding: "6px 8px" }}></td>

                  {data.columns.map((c, j) => {
                    const v = totalRow[c] ?? totalRow[j] ?? "";
                    const cleaned = String(v).replace(/[,₹$]/g, "");

                    const baseStyle = {
                      padding: "6px 8px",
                      whiteSpace: "nowrap",
                      wordBreak: "normal",
                      color: "#fff",
                      lineHeight: 2,
                    };

                    // MONEY FORMATTING
                    if (
                      moneyColumnIndexes.has(j) &&
                      cleaned !== "" &&
                      !isNaN(Number(cleaned))
                    ) {
                      return (
                        <td key={j} style={{ ...baseStyle, whiteSpace: "nowrap", wordBreak: "normal", fontWeight: 600 }}>
                          {money(v)}
                        </td>
                      );
                    }

                    // PERCENTAGE FORMATTING
                    if (typeof v === "string" && v.endsWith("%")) {
                      const num = parseFloat(v.replace("%", ""));
                      const text = isNaN(num) ? v : num.toFixed(1) + "%";
                      const color = !isNaN(num) && num < 0 ? "#d12b2b" : "#0B6623";

                      return (
                        <td key={j} style={{ ...baseStyle, color, fontWeight: 700 }}>
                          {text}
                        </td>
                      );
                    }

                    return (
                      <td key={j} style={baseStyle}>
                        {v}
                      </td>
                    );
                  })}
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {pages > 1 && (
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              marginTop: 8,
              marginBottom: 4,
              padding: "0 8px",
            }}
          >
            <span style={{ marginRight: 8, color: "#000", fontSize: 14 }}>
              {start + 1}–{Math.min(start + TABLE_PAGE_SIZE, total)} of {total}
            </span>

            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              style={{
                marginRight: 6,
                background: "#fff",
                color: "#000",
                cursor: "pointer",
                border: "1px solid #ccc",
                padding: "4px 8px",
                borderRadius: 4,
              }}
            >
              {"<"}
            </button>

            <button
              disabled={page === pages}
              onClick={() => setPage((p) => p + 1)}
              style={{
                marginRight: 6,
                background: "#fff",
                color: "#000",
                cursor: "pointer",
                border: "1px solid #ccc",
                padding: "4px 8px",
                borderRadius: 4,
              }}
            >
              {">"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}


/* ------------------------------------------------------------------
   PAGE ROOT
-------------------------------------------------------------------*/

export default function SalesAnalyticsPage({ userId: propUserId }) {
  // Assuming 'useParams', 'useNavigate', 'api', 'COMPONENT_IDS', 'fetchComponentData' are available
  const { id: routeUserId } = useParams();
  const userId = routeUserId || propUserId || "demo_tenant";

  const [dateRange, setDateRange] = useState({
    start: "",
    end: "",
  });

  const [pendingRange, setPendingRange] = useState({
    start: "",
    end: "",
  });

  const [filters, setFilters] = useState({
    client: "All",
    consignee: "All",
    agent: "All",
    product: "All",
  });

  const navigate = useNavigate();

  const [dataMap, setDataMap] = useState({});
  const [error, setError] = useState(null);

  // new: company logo from profile
  const [companyLogoUrl, setCompanyLogoUrl] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // fetch profile to get company logo first
    let mounted = true;

    (async () => {
      try {
        const res = await api.get("/account/my-profile");
        if (!mounted) return;
        if (res?.data?.companyLogoUrl) {
          setCompanyLogoUrl(res.data.companyLogoUrl);
        } else {
          setCompanyLogoUrl(null);
        }
      } catch (err) {
        // ignore — we'll show placeholder
        setCompanyLogoUrl(null);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!userId) return;

    let cancel = false;
    setError(null);
    setLoading(true);

    Promise.all(
      COMPONENT_IDS.map((cid) =>
        fetchComponentData(cid, { userId, dateRange, filters })
      )
    )
      .then((res) => {
        if (cancel) return;

        const obj = {};
        COMPONENT_IDS.forEach((cid, i) => {
          obj[cid] = res[i] || { data: null };
        });

        setDataMap(obj);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load components");
        setLoading(false);
      });

    return () => {
      cancel = true;
    };
  }, [
    userId,
    dateRange.start,
    dateRange.end,
    filters.client,
    filters.consignee,
    filters.agent,
    filters.product,
  ]);

  const kpiItems = [
    dataMap.sa_kpi_clients?.data,
    dataMap.sa_kpi_agents?.data,
    dataMap.sa_kpi_invoices?.data,
    dataMap.sa_kpi_sales?.data,
    dataMap.sa_kpi_qty?.data,
    dataMap.sa_kpi_rate?.data,
  ].filter(Boolean);

  const filterOptions = {
    sa_filter_client: {
      values: dataMap.sa_filter_client?.data?.values || [],
      title: "Client",
    },
    sa_filter_consignee: {
      values: dataMap.sa_filter_consignee?.data?.values || [],
      title: "Consignee",
    },
    sa_filter_agent: {
      values: dataMap.sa_filter_agent?.data?.values || [],
      title: "Agent",
    },
    sa_filter_product: {
      values: dataMap.sa_filter_product?.data?.values || [],
      title: "Product",
    },
  };

  return (
    <div
      style={{
        // Use relative padding and font
        padding: 0,
        fontFamily:
          "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial",
        background: NGRAPH_THEME.background,
        // The container needs to be flexible to accommodate all screen sizes
        maxWidth: "100%",
        minWidth: "320px",
        margin: "0 auto",
      }}
    >
      <div
        style={{
          position: "sticky",
          top: "96px",
          zIndex: 90,
          background: NGRAPH_THEME.header,
        }}
      >
        <Header companyLogoUrl={companyLogoUrl} />

        {/* BACK + DATE FILTER ROW */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "0.75rem 1.25rem",
            background: NGRAPH_THEME.primarySoft,
            borderBottom: `2px solid ${NGRAPH_THEME.kpiBorder}`,
            flexWrap: "wrap",
            gap: "0.5rem",
          }}
        >
          <button
            onClick={() => navigate("/")}
            style={{
              padding: "0.375rem 0.875rem",
              background: NGRAPH_THEME.accent,
              color: "white",
              fontWeight: 600,
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            ← Back
          </button>

          <DateRangeInput
            value={pendingRange}
            onPendingChange={setPendingRange}
            onApply={setDateRange}
          />
        </div>
      </div>

      {error && (
        <div style={{ color: "#a31b1b", marginBottom: 12 }}>{error}</div>
      )}

      {/* KPI and Filters sections remain responsive due to internal grid logic */}
      <div style={{ padding: "1.25rem" /* RELATIVE PADDING (20px) */ }}>
        <KpiGrid items={kpiItems} />
      </div>
      <div style={{ padding: "1.25rem" }}>
        <FiltersRow
          filters={filters}
          options={filterOptions}
          onChange={setFilters}
        />
      </div>

      {/* DONUT WIDGETS SECTION */}
      <div
        style={{
          padding: "1.25rem",
          display: "grid",
          // RESPONSIVE GRID: Auto-fit up to 3 columns, minimum 280px wide
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "0.75rem",
        }}
      >
        <DonutWidget
          title={dataMap.sa_pie_branch?.title || "Branch-wise Sales"}
          data={dataMap.sa_pie_branch?.data}
        />

        <DonutWidget
          title={dataMap.sa_pie_costcenter?.title || "Cost Center-wise Sales"}
          data={dataMap.sa_pie_costcenter?.data}
        />

        <DonutWidget
          title={dataMap.sa_pie_channel?.title || "Channel-wise Sales"}
          data={dataMap.sa_pie_channel?.data}
        />
      </div>

      {/* MAP AND LINE CHART SECTION */}
      <div
        style={{
          padding: "1.25rem",
          display: "grid",
          // RESPONSIVE GRID: Auto-fit up to 2 columns, minimum 350px wide
          gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))",
          gap: "0.75rem",
          marginTop: "0.75rem",
        }}
      >
        <ProfessionalMap
          title={dataMap.sa_map_sales?.title || "Location-wise Sales"}
          data={dataMap.sa_map_sales?.data}
        />

        <LineAreaWidget
          title={dataMap.sa_line_sales_qty?.title || "Monthly Sales <> Qty"}
          data={dataMap.sa_line_sales_qty?.data}
        />
      </div>

      {/* FIRST ROW OF TABLE WIDGETS */}
      <div
        style={{
          padding: "1.25rem",
          display: "grid",
          // RESPONSIVE GRID: Auto-fit up to 3 columns, minimum 300px wide
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: "0.75rem",
          marginTop: "0.75rem",
        }}
      >
        <TableWidget
          title={dataMap.sa_table_book?.title || "Book-wise Sales"}
          data={dataMap.sa_table_book?.data}
        />

        <TableWidget
          title={dataMap.sa_table_category?.title || "Category-wise Sales"}
          data={dataMap.sa_table_category?.data}
        />

        <TableWidget
          title={dataMap.sa_table_product?.title || "Product-wise Sales"}
          data={dataMap.sa_table_product?.data}
        />
      </div>

      {/* SECOND ROW OF TABLE WIDGETS */}
      <div
        style={{
          padding: "1.25rem",
          display: "grid",
          // RESPONSIVE GRID: Auto-fit up to 3 columns, minimum 300px wide
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: "0.75rem",
          marginBottom: "0.75rem",
        }}
      >
        <TableWidget
          title={dataMap.sa_table_client?.title || "Client-wise Sales"}
          data={dataMap.sa_table_client?.data}
        />

        <TableWidget
          title={dataMap.sa_table_delivery?.title || "Delivery-wise Sales"}
          data={dataMap.sa_table_delivery?.data}
        />

        <TableWidget
          title={dataMap.sa_table_agent?.title || "Agent-wise Sales"}
          data={dataMap.sa_table_agent?.data}
        />
      </div>
      {loading && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(255,255,255,0.6)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 9999,
            backdropFilter: "blur(2px)",
          }}
        >

          <div
            style={{
              width: 40,
              height: 40,
              border: "4px solid #cbdaf5",
              borderTopColor: NGRAPH_THEME.primary,
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
            }}
          />
        </div>
      )}
    </div>
  );
}