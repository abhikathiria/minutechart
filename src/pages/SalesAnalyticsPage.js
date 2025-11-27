// src/pages/SalesAnalyticsPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  PieChart, Pie, Cell, Tooltip as ReTooltip, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Legend, Line, Customized, LineChart
} from "recharts";

import { useParams } from "react-router-dom";
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
  kpiBorder: "#CDE1FB",
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

function pct(prev, curr) {
  if (!prev) return { text: "n/a", color: "#666" };

  const raw = ((curr - prev) / Math.abs(prev)) * 100;
  const rounded = Math.round(raw * 10) / 10;

  const color = rounded >= 0 ? "#0B6623" : "#d12b2b";

  return { text: `${rounded >= 0 ? "+" : ""}${rounded.toFixed(1)}%`, color };
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

      const normalizeLine = (res) =>
        Array.isArray(res?.data)
          ? res.data.map(r => ({
            x: r.x || r.X || r.date || Object.values(r)[0],
            sales: r.sales ?? r.Sales ?? r.amount ?? null,
            qty: r.qty ?? r.Qty ?? r.quantity ?? null
          }))
          : [];

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
        flexDirection: "column"
      }}
    >
      <svg width="20" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
        <rect x="2" y="6" width="20" height="12" rx="2" stroke={NGRAPH_THEME.primary} strokeWidth="1.5" fill="transparent" />
        <path d="M6 10h12" stroke={NGRAPH_THEME.primary} strokeWidth="1.2" />
        <path d="M8 14v2" stroke={NGRAPH_THEME.primary} strokeWidth="1.2" />
      </svg>
      <div style={{ fontSize: 11, color: NGRAPH_THEME.primary, fontWeight: 600 }}>No Logo</div>
    </div>
  );
}

function Header({ companyLogoUrl, dateRange, onDateChange }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        marginBottom: 12,
        background: NGRAPH_THEME.header,
        padding: 8,
        borderRadius: 8,
        border: `1px solid ${NGRAPH_THEME.kpiBorder}`
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexGrow: 1 }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <h1
            style={{
              margin: 0,
              fontSize: 18,
              fontWeight: 600,
              color: "white",
            }}
          >
            Sales Analytics
          </h1>
          {/* <div style={{ fontSize: 12, color: "#2962A3" }}>Insights · Location · Channels</div> */}
        </div>

        <div style={{ marginLeft: 12 }}>
          {/* Logo area: rectangular container */}
          {companyLogoUrl ? (
            <img
              src={companyLogoUrl}
              alt="company"
              style={{
                height: 44,
                width: 160,
                objectFit: "contain",
                borderRadius: 6,
                border: `1px solid ${NGRAPH_THEME.kpiBorder}`,
                background: "#0a2345"
              }}
              onError={(e) => {
                // fallback to placeholder if image fails to load
                e.target.onerror = null;
                e.target.style.display = "none";
              }}
            />
          ) : (
            <NoLogoPlaceholder width={160} height={44} />
          )}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          borderRadius: 8,
          padding: "4px 8px",
          background: NGRAPH_THEME.primarySoft
        }}
      >
        <DateRangeInput value={dateRange} onChange={onDateChange} />
      </div>
    </div>
  );
}

function DateRangeInput({ value, onChange }) {
  const [local, setLocal] = useState(value || { start: "", end: "" });

  useEffect(() => setLocal(value || { start: "", end: "" }), [value]);

  const style = {
    padding: "4px 6px",
    borderRadius: 6,
    border: `1px solid ${NGRAPH_THEME.kpiBorder}`,
    fontSize: 12,
    width: 110,
    background: "#fff"
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <input
        type="date"
        value={local.start}
        onChange={e => {
          const v = { ...local, start: e.target.value };
          setLocal(v);
          onChange && onChange(v);
        }}
        style={style}
      />

      <span style={{ color: "#2962A3", fontSize: 12 }}>to</span>

      <input
        type="date"
        value={local.end}
        onChange={e => {
          const v = { ...local, end: e.target.value };
          setLocal(v);
          onChange && onChange(v);
        }}
        style={style}
      />
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
        gridTemplateColumns: "repeat(6,1fr)",
        gap: 12,
        marginBottom: 12
      }}
    >
      {items.map((it, i) => {
        const diff =
          it.previousValue != null
            ? pct(it.previousValue, it.value)
            : { text: "—", color: "#666" };

        return (
          <div
            key={i}
            style={{
              border: `1px solid ${NGRAPH_THEME.kpiBorder}`,
              padding: 10,
              borderRadius: 8,
              background: "#fff",
              boxShadow: "0 1px 4px rgba(43,108,176,0.06)"
            }}
          >
            <div style={{ fontSize: 11, color: "#356FAF", marginBottom: 6 }}>
              {it.title || it.label}
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                justifyContent: "space-between"
              }}
            >
              <div style={{ fontSize: 16, fontWeight: 700, color: NGRAPH_THEME.textPrimary }}>
                {["sa_kpi_sales", "sa_kpi_invoices"].includes(it.id)
                  ? money(it.value)
                  : it.id === "sa_kpi_rate"
                    ? rateFmt(it.value)
                    : numberFmt(it.value)}
              </div>

              <div style={{ fontSize: 12, color: diff.color, fontWeight: 600 }}>
                {diff.text}
              </div>
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
    <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
      {keys.map(k => {
        const optObj = options[`sa_filter_${k}`] || { values: [] };
        const list = [
          { label: optObj.title || k, value: "All" },
          ...optObj.values
        ];

        return (
          <select
            key={k}
            value={filters[k]}
            onChange={e => onChange({ ...filters, [k]: e.target.value })}
            style={{
              padding: "6px 8px",
              borderRadius: 8,
              border: `1px solid ${NGRAPH_THEME.kpiBorder}`,
              fontSize: 13,
              background: "#fff",
              color: NGRAPH_THEME.textPrimary,
              minWidth: 160
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
  "#E6F0FB"
];

function DonutWidget({ title, data }) {
  if (!data?.items?.length)
    return (
      <div
        style={{
          background: "#fff",
          borderRadius: 8,
          border: "1px solid #eef6ff",
          padding: 12
        }}
      >
        <div style={{ fontWeight: 600, color: "#0B3A66" }}>{title}</div>
        <div style={{ padding: 12, color: "#6b8fbf" }}>No data</div>
      </div>
    );

  const items = [...data.items].sort((a, b) => b.value - a.value);

  return (
    <div
      style={{
        background: "#fff",
        padding: 12,
        borderRadius: 8,
        border: "1px solid #eef6ff"
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 6, color: "#0B3A66" }}>{title}</div>

      <div style={{ height: 200 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              dataKey="value"
              data={items}
              cx="50%"
              cy="50%"
              outerRadius={70}
              innerRadius={40}
            >
              {items.map((e, i) => (
                <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
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
                      style={{ fontSize: 14, fontWeight: 700, fill: "#0B3A66" }}
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
                `${p.payload.label} (${p.payload.percentage.toFixed(1)}%)`
              ]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div style={{ marginTop: 6, fontSize: 12 }}>
        {items.map((it, i) => (
          <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6, alignItems: "center" }}>
            <div
              style={{
                width: 10,
                height: 10,
                background: DONUT_COLORS[i % DONUT_COLORS.length],
                borderRadius: "50%",
                boxShadow: "0 0 6px rgba(0,0,0,0.03)"
              }}
            />
            <div style={{ flexGrow: 1, color: "#0B3A66" }}>{it.label}</div>
            <strong style={{ color: "#0B3A66" }}>{it.percentage.toFixed(1)}%</strong>
          </div>
        ))}
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



// -----------------------
//  MAIN WIDGET
// -----------------------
function LineAreaWidget({ title, data }) {
  const merged = useMemo(() => {
    const curr = data?.current || [];
    const prev = data?.previous || [];

    if (!curr.length) return [];

    const xs = curr.map((d) => d.x);

    return xs.map((x, i) => ({
      x,

      // current
      sales: curr[i]?.sales ?? null,
      qty: curr[i]?.qty ?? null,
      realCurrDate: curr[i]?.x ?? null,

      // previous aligned but keep real date
      prevSales: prev[i]?.sales ?? null,
      realPrevDate: prev[i]?.x ?? null
    }));
  }, [data]);

  window.__prevData = data?.previous || [];

  if (!merged.length)
    return (
      <div
        style={{
          background: "#fff",
          padding: 12,
          borderRadius: 10,
          border: "1px solid #dae7ff"
        }}
      >
        <div style={{ fontWeight: 600, color: "#0B3A66" }}>{title}</div>
        <div style={{ padding: 12, color: "#6b8fbf" }}>No data</div>
      </div>
    );

  return (
    <div
      style={{
        background: "#fff",
        padding: 14,
        borderRadius: 10,
        border: "1px solid #dae7ff",
        boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
      }}
    >
      <div
        style={{
          fontWeight: 600,
          marginBottom: 6,
          color: "#0B3A66",
          fontSize: 15
        }}
      >
        {title}
      </div>

      <div style={{ height: 260 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={merged}>
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
              tickFormatter={(v) =>
                v >= 1e6 ? `${(v / 1e6).toFixed(0)}M` : v
              }
              fontSize={11}
              tick={{ fill: "#33527a" }}
              axisLine={{ stroke: "#c3d7ff" }}
              tickLine={{ stroke: "#c3d7ff" }}
            />

            <ReTooltip
              content={props => {
                const p = props?.payload?.[0];
                if (!p) return null;

                const row = p.payload;

                return (
                  <div style={{ background: "#fff", padding: 8, border: "1px solid #ddd", borderRadius: 6 }}>
                    {/* CURRENT */}
                    {row.sales != null && (
                      <div style={{ marginBottom: 4 }}>
                        <div style={{ fontWeight: 600 }}>Sales ({formatDateShort(row.realCurrDate)})</div>
                        <div>{money(row.sales)}</div>
                      </div>
                    )}

                    {/* PREVIOUS */}
                    {row.prevSales != null && (
                      <div>
                        <div style={{ fontWeight: 600 }}>Prev Sales ({formatDateShort(row.realPrevDate)})</div>
                        <div>{money(row.prevSales)}</div>
                      </div>
                    )}
                  </div>
                );
              }}
            />

            {/* CURRENT SALES (LINE) */}
            <Line
              type="monotone"
              dataKey="sales"
              stroke="#2563eb"
              strokeWidth={3}
              dot={{ r: 4, stroke: "#2563eb", fill: "#fff" }}
              activeDot={{ r: 5 }}
            />

            {/* PREVIOUS SALES (DASHED LINE) */}
            <Line
              type="monotone"
              dataKey="prevSales"
              stroke="#8dabecff"
              strokeWidth={3}
              dot={{ r: 4, stroke: "#8dabecff", fill: "#fff" }}
              activeDot={{ r: 5 }}
            />

            <Legend
              content={<CustomLineLegend />}
              verticalAlign="top"
              height={30}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}


/* ------------------------------------------------------------------
   REPLACED PROFESSIONAL MAP (blue palette)
-------------------------------------------------------------------*/

function ProfessionalMap({ title, data }) {
  const [tooltip, setTooltip] = useState(null);
  const mapRef = React.useRef(null);

  if (!data || !data.locations || data.locations.length === 0) {
    return (
      <div style={{ background: "#fff", padding: 12, borderRadius: 8 }}>
        <div style={{ fontWeight: 600, color: "#0B3A66" }}>{title}</div>
        <div style={{ padding: 12, color: "#6b8fbf" }}>No map data</div>
      </div>
    );
  }

  const regionData = {};
  data.locations.forEach((loc) => {
    const name = String(loc.name || "").trim();
    const value = Number(loc.sales) || 0;
    if (name) regionData[name] = (regionData[name] || 0) + value;
  });

  const values = Object.values(regionData);
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 1;

  const colorScale = scaleLinear()
    .domain([min, max])
    .range(["#E9F6FF", "#08306B"]);


  return (

    <div
      ref={mapRef}
      style={{
        background: "#fff",
        padding: 12,
        borderRadius: 8,
        border: "1px solid #eef6ff",
        position: "relative"
      }}
    >

      <div style={{ fontWeight: 600, marginBottom: 6, color: "#0B3A66" }}>{title}</div>

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
            pointerEvents: "none"
            // zIndex: 10
          }}
        >
          <strong style={{ color: "#0B3A66" }}>{tooltip.state}</strong>
          <br />
          {money(tooltip.value)}
        </div>
      )}

      <div style={{ width: "100%", overflowX: "auto" }}>
        <ComposableMap
          projection="geoMercator"
          projectionConfig={{ scale: 1000, center: [78.9629, 22.5937] }}
          style={{ width: "100%", height: 400, background: "#ffffff" }}
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
                        x: evt.clientX - rect.left + 10,  // relative to map
                        y: evt.clientY - rect.top - 10    // relative to map
                      });
                    }}

                    onMouseLeave={() => setTooltip(null)}
                    style={{
                      default: {
                        outline: "none",
                        fill: value > 0 ? colorScale(value) : "#ffffff",
                        stroke: "#000",
                        strokeWidth: 0.8
                      },
                      hover: {
                        outline: "none",
                        fill: value ? colorScale(value) : "#ffffff",
                        stroke: "#000",
                        strokeWidth: 1
                      },
                      pressed: {
                        outline: "none",
                        stroke: "#000",
                        strokeWidth: 1
                      }
                    }}
                  />
                );
              })
            }
          </Geographies>
        </ComposableMap>
      </div>
    </div>
  );
}

/* TABLE WIDGET */
function TableWidget({ title, data }) {
  const [page, setPage] = useState(1);

  if (!data?.columns?.length)
    return (
      <div
        style={{
          background: "#fff",
          padding: 12,
          borderRadius: 8,
          border: "1px solid #eef6ff",
          display: "flex",
          flexDirection: "column",
          height: 260
        }}
      >

        <div style={{ fontWeight: 600, color: "#0B3A66" }}>{title}</div>
        <div style={{ padding: 12, color: "#6b8fbf" }}>No data</div>
      </div>
    );

  const total = data.rows.length;
  const pages = Math.ceil(total / TABLE_PAGE_SIZE);

  const start = (page - 1) * TABLE_PAGE_SIZE;
  const visible = data.rows.slice(start, start + TABLE_PAGE_SIZE);

  return (
    <div
      style={{
        background: "#fff",
        padding: 12,
        borderRadius: 8,
        border: "1px solid #eef6ff"
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 8, color: "#0B3A66" }}>{title}</div>

      <table style={{ width: "100%", fontSize: 12 }}>
        <thead>
          <tr>
            {data.columns.slice(0, 4).map(c => (
              <th
                key={c}
                style={{
                  textAlign: "left",
                  padding: "6px 8px",
                  borderBottom: "1px solid #e6f2ff",
                  color: "#6b8fbf",
                  fontSize: 11
                }}
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {visible.map((row, i) => (
            <tr
              key={i}
              style={{
                background:
                  i % 2 === 1 ? NGRAPH_THEME.primarySoft : "#fff",
                borderBottom: "1px solid #f2f8ff"
              }}
            >
              {row.slice(0, 4).map((v, j) => {
                const idx = start + i + 1;

                const style = {
                  padding: "6px 8px",
                  whiteSpace: "nowrap",
                  color: NGRAPH_THEME.textPrimary
                };

                if (j === 0) return <td key={j} style={style}>{`${idx}`}</td>;
                if (j === 2) return <td key={j} style={{ ...style, fontWeight: 600 }}>{money(v)}</td>;
                if (j === 3) {
                  const color = String(v).includes("-")
                    ? "#d12b2b"
                    : "#0B6623";
                  return <td key={j} style={{ ...style, color, fontWeight: 700 }}>{v}</td>;
                }

                return <td key={j} style={style}>{v}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
        <span style={{ marginRight: 8, color: "#6b8fbf" }}>
          {start + 1}–{Math.min(start + TABLE_PAGE_SIZE, total)} of {total}
        </span>

        <button
          disabled={page === 1}
          onClick={() => setPage(p => p - 1)}
          style={{ padding: "4px 8px", marginRight: 6, borderRadius: 6, border: `1px solid ${NGRAPH_THEME.kpiBorder}`, background: "#fff", color: NGRAPH_THEME.primary }}
        >
          {"<"}
        </button>

        <button
          disabled={page === pages}
          onClick={() => setPage(p => p + 1)}
          style={{ padding: "4px 8px", borderRadius: 6, border: `1px solid ${NGRAPH_THEME.kpiBorder}`, background: "#fff", color: NGRAPH_THEME.primary }}
        >
          {">"}
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------
   PAGE ROOT
-------------------------------------------------------------------*/

export default function SalesAnalyticsPage({
  userId: propUserId
}) {
  const { id: routeUserId } = useParams();
  const userId = routeUserId || propUserId || "demo_tenant";

  const [dateRange, setDateRange] = useState({
    start: "",
    end: ""
  });

  const [filters, setFilters] = useState({
    client: "All",
    consignee: "All",
    agent: "All",
    product: "All"
  });

  const [dataMap, setDataMap] = useState({});
  const [error, setError] = useState(null);

  // new: company logo from profile
  const [companyLogoUrl, setCompanyLogoUrl] = useState(null);

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

    Promise.all(
      COMPONENT_IDS.map(cid =>
        fetchComponentData(cid, { userId, dateRange, filters })
      )
    )
      .then(res => {
        if (cancel) return;

        const obj = {};
        COMPONENT_IDS.forEach((cid, i) => {
          obj[cid] = res[i] || { data: null };
        });

        setDataMap(obj);
      })
      .catch(() => setError("Failed to load components"));

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
    filters.product
  ]);

  const kpiItems = [
    dataMap.sa_kpi_clients?.data,
    dataMap.sa_kpi_agents?.data,
    dataMap.sa_kpi_invoices?.data,
    dataMap.sa_kpi_sales?.data,
    dataMap.sa_kpi_qty?.data,
    dataMap.sa_kpi_rate?.data
  ].filter(Boolean);

  const filterOptions = {
    sa_filter_client: {
      values: dataMap.sa_filter_client?.data?.values || [],
      title: "Client"
    },
    sa_filter_consignee: {
      values: dataMap.sa_filter_consignee?.data?.values || [],
      title: "Consignee"
    },
    sa_filter_agent: {
      values: dataMap.sa_filter_agent?.data?.values || [],
      title: "Agent"
    },
    sa_filter_product: {
      values: dataMap.sa_filter_product?.data?.values || [],
      title: "Product"
    }
  };

  return (
    <div
      style={{
        padding: 20,
        fontFamily: "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial",
        background: NGRAPH_THEME.background,
        maxWidth: 1400,
        margin: "0 auto"
      }}
    >
      <Header
        companyLogoUrl={companyLogoUrl}
        dateRange={dateRange}
        onDateChange={setDateRange}
      />

      {error && (
        <div style={{ color: "#a31b1b", marginBottom: 12 }}>{error}</div>
      )}

      <KpiGrid items={kpiItems} />

      <FiltersRow
        filters={filters}
        options={filterOptions}
        onChange={setFilters}
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
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

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
          marginTop: 12
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

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3,1fr)",
          gap: 12,
          marginTop: 12
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

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3,1fr)",
          gap: 12,
          marginTop: 12
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
    </div>
  );
}
