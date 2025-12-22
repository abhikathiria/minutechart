// src/pages/SalesAnalyticsPage.jsx
import React, { useEffect, useMemo, useState, useRef } from "react";
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
  startOfMonth,
  endOfMonth,
  subMonths,
  addMonths,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isWithinInterval,
  isAfter,
  isBefore,
  addDays,
  isValid,
  startOfYear,
  endOfYear,
  subYears
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
const WIDGET_HEIGHT = 340;
const VALUE_NUMBER_WIDTH = 70;
const VALUE_BAR_WIDTH = 60;
const VALUE_COL_WIDTH = VALUE_NUMBER_WIDTH + VALUE_BAR_WIDTH + 6;

/* ------------------------------------------------------------------
   UTILITIES
-------------------------------------------------------------------*/
function useWindowWidth() {
  const [width, setWidth] = useState(typeof window !== "undefined" ? window.innerWidth : 1200);

  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return width;
}

function moneyFmt(v) {
  if (v === null || v === undefined) return "-";
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v);

  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);

  if (abs >= 1e9) return `${sign}₹${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${sign}₹${(abs / 1e6).toFixed(2)}M`;
  if (abs >= 1e5) return `${sign}₹${(abs / 1e5).toFixed(2)}L`;
  if (abs >= 1e3) return `${sign}₹${(abs / 1e3).toFixed(1)}K`;

  return `${sign}₹${abs.toLocaleString("en-IN")}`;
}


function numberFmt(v) {
  if (v === null || v === undefined) return "-";
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v);

  const sign = n < 0 ? "-" : "";
  const absN = Math.abs(n);

  if (absN >= 1e9) return `${sign}${(absN / 1e9).toFixed(2)}B`;
  if (absN >= 1e6) return `${sign}${(absN / 1e6).toFixed(2)}M`;
  if (absN >= 1e5) return `${sign}${(absN / 1e5).toFixed(2)}L`;
  if (absN >= 1e3) return `${sign}${(absN / 1e3).toFixed(2)}K`;

  return `${sign}${absN.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

function formatDateShort(d) {
  if (!d) return "";
  try {
    return format(parseISO(d), "MMM yy");
  } catch {
    return d;
  }
}

function getPreviousRange(start, end) {
  const s = parseISO(start);
  const e = parseISO(end);

  const days = differenceInCalendarDays(e, s) + 1;

  const prevEnd = subDays(s, 1);
  const prevStart = subDays(prevEnd, days - 1);

  return {
    start: format(prevStart, "yyyy-MM-dd"),
    end: format(prevEnd, "yyyy-MM-dd"),
  };
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

  const numericKeys = keys.filter(k =>
    String(src[k]).match(/^-?\d+(\.\d+)?$/)
  );

  const priority = ["value", "sales", "amount", "total", "count", "qty"];
  const valueKey =
    numericKeys.find(k => priority.includes(k.toLowerCase())) ||
    numericKeys[0];

  const labelKey =
    keys.find(k =>
      ["name", "title", "client", "branch"].some(x =>
        k.toLowerCase().includes(x)
      )
    ) || valueKey;

  const current = Number(src[valueKey]) || 0;
  const previous =
    Number.isFinite(Number(src.previousValue)) ? Number(src.previousValue) : null;

  const deltaValue =
    previous == null ? null : current - previous;

  const deltaPercent =
    previous == null || previous === 0
      ? null
      : (deltaValue / previous) * 100;

  return {
    id: componentId,
    title: src.title || src[labelKey],
    value: current,
    previousValue: previous,
    deltaValue,
    deltaPercent
  };
}

/* ------------------------------------------------------------------
   API CALL
-------------------------------------------------------------------*/
async function postExecuteSalesComponent(userId, body) {
  try {
    const res = await api.post(
      `/salesmodules/executesales/${encodeURIComponent(userId)}`,
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
   COMPONENT DATA FETCHER
-------------------------------------------------------------------*/

async function fetchComponentData(componentId, { userId, dateRange, filters }) {
  const startISO = dateRange.start ? `${dateRange.start}T00:00:00` : null;
  const endISO = dateRange.end ? `${dateRange.end}T23:59:59` : null;

  if (componentId === "sa_line_sales_qty") {
    try {
      const start = dateRange.start ? parseISO(dateRange.start) : null;
      const end = dateRange.end ? parseISO(dateRange.end) : null;
      if (!start || !end) return { datasource: "db", data: null };

      const days = differenceInCalendarDays(end, start) + 1;
      const prevEnd = subDays(start, 1);
      const prevStart = subDays(prevEnd, days - 1);

      const common = {
        componentId,
        clientId: filters.client === "All" ? null : filters.client,
        agentId: filters.agent === "All" ? null : filters.agent,
        productId: filters.product === "All" ? null : filters.product,
        consigneeId: filters.consignee === "All" ? null : filters.consignee
      };

      const currentBody = { ...common, startDate: startISO, endDate: endISO };
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
        const dateKey = keys.find(k => typeof sample[k] === "string" && !isNaN(Date.parse(sample[k]))) || keys[0];
        const numericKey = keys.find(k => typeof sample[k] === "number") || keys[1];

        return rows.map(r => ({
          x: r[dateKey],
          sales: Number(r[numericKey]) || 0,
          realCurrDate: r[dateKey]
        }));
      };

      const current = normalizeLine(curr);
      const previous = normalizeLine(prev);

      if (!current.length && !previous.length) {
        return { datasource: "db", data: { empty: true }, title: curr?.title || "Monthly Sales <> Qty" };
      }

      return {
        datasource: "db",
        data: { current, previous },
        title: curr?.title || "Monthly Sales <> Qty"
      };
    } catch (err) {
      return { datasource: "db", data: null };
    }
  }

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
    if (!res?.success || res.data == null) return { datasource: "db", data: null };

    const rows = Array.isArray(res.data) ? res.data : typeof res.data === "object" ? [res.data] : [];

    if (componentId.startsWith("sa_filter_")) {
      if (!rows.length) return { datasource: "db", data: { empty: true }, title: res.title };
      const cols = inferColumns(rows);
      const first = cols[0];
      const second = cols[1];
      const values = rows.map(r => ({ label: r[second] ?? r[first], value: r[first] })).filter(v => v.label);
      const uniq = [];
      const seen = new Set();
      for (const v of values) {
        if (!seen.has(v.value)) {
          uniq.push(v);
          seen.add(v.value);
        }
      }
      return { datasource: "db", data: { values: uniq }, title: res.title || componentId };
    }

    if (["sa_pie_branch", "sa_pie_costcenter", "sa_pie_channel"].includes(componentId)) {
      const pie = normalizeToPie(rows);
      return { datasource: "db", data: pie.items.length ? pie : { empty: true }, title: res.title };
    }

    if (componentId.startsWith("sa_table_")) {
      const prev = getPreviousRange(dateRange.start, dateRange.end);

      const prevRes = await postExecuteSalesComponent(userId, {
        componentId,
        startDate: `${prev.start}T00:00:00`,
        endDate: `${prev.end}T23:59:59`,
      });

      const currentTable = normalizeToTable(rows);
      const previousTable = normalizeToTable(
        Array.isArray(prevRes?.data) ? prevRes.data : []
      );

      if (!currentTable.columns.length) {
        return {
          datasource: "db",
          data: { empty: true },
          title: res.title
        };
      }

      return {
        datasource: "db",
        data: {
          current: currentTable,
          previous: previousTable
        },
        title: res.title
      };
    }

    if (componentId === "sa_map_sales") {
      if (!rows.length) return { datasource: "db", data: { empty: true }, title: res.title };
      const cols = inferColumns(rows);
      const nameKey = cols.find(c => /(name|state|region|city)/i.test(c)) || cols[0];
      const valKey = cols.find(c => /(sales|amount|value|total)/i.test(c.toLowerCase())) || cols[1];
      const locations = rows.map(r => ({ id: r[nameKey], name: r[nameKey], sales: Number(r[valKey]) || 0 }));
      return { datasource: "db", data: { locations }, title: res.title };
    }

    if (componentId.startsWith("sa_kpi_")) {
      const prev = getPreviousRange(dateRange.start, dateRange.end);

      // CURRENT
      const currRes = await postExecuteSalesComponent(userId, {
        componentId,
        startDate: startISO,
        endDate: endISO
      });

      // PREVIOUS
      const prevRes = await postExecuteSalesComponent(userId, {
        componentId,
        startDate: `${prev.start}T00:00:00`,
        endDate: `${prev.end}T23:59:59`,
      });

      if (!currRes?.success || !currRes?.data) {
        return { datasource: "db", data: null };
      }

      const currRows = Array.isArray(currRes.data)
        ? currRes.data
        : [currRes.data];

      const prevRows = Array.isArray(prevRes?.data)
        ? prevRes.data
        : [];

      if (!currRows.length) {
        return {
          datasource: "db",
          data: { empty: true, title: currRes.title || componentId },
          title: currRes.title || componentId
        };
      }

      // Inject previousValue
      const merged = {
        ...currRows[0],
        previousValue:
          prevRows.length
            ? Object.values(prevRows[0]).find(v => !isNaN(Number(v)))
            : null
      };

      const kpi = normalizeKpi([merged], componentId);

      return {
        datasource: "db",
        data: { ...kpi, title: currRes.title || kpi.title },
        title: currRes.title || kpi.title
      };
    }

    return { datasource: "db", data: rows };
  } catch (err) {
    console.warn("component fetch error", err);
    return { datasource: "db", data: null };
  }
}

/* ------------------------------------------------------------------
   UI COMPONENTS
-------------------------------------------------------------------*/
function NoDataWidget({ title }) {
  const width = useWindowWidth();
  const isMobile = width < 768;
  const getWidgetHeight = (isMobile) => (isMobile ? 420 : 340);
  const widgetHeight = getWidgetHeight(isMobile);

  return (
    <div
      style={{
        textAlign: "center",
        marginBottom: "0.75rem",
        height: widgetHeight,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* TITLE */}
      <div
        style={{
          textAlign: "center",
          color: "#0B3A66",
          fontWeight: 600,
          fontSize: 16,
          marginBottom: "8px",
        }}
      >
        {title}
      </div>

      {/* BODY */}
      <div
        style={{
          flex: 1,
          border: `2px solid ${NGRAPH_THEME.kpiBorder}`,
          background: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#0B3A66",
          fontWeight: 600,
          fontSize: 20,
          minHeight: 0
        }}
      >
        <div style={{ opacity: 0.7 }}>No data available</div>
      </div>
    </div>
  );
}

function NoLogoPlaceholder({ width = 120, height = 44 }) {
  return (
    <div
      style={{
        width: "100%", // Responsive width
        maxWidth: width, // Max constraint
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
        <rect x="2" y="6" width="20" height="12" rx="2" stroke={NGRAPH_THEME.primary} strokeWidth="1.5" fill="transparent" />
        <path d="M6 10h12" stroke={NGRAPH_THEME.primary} strokeWidth="1.2" />
        <path d="M8 14v2" stroke={NGRAPH_THEME.primary} strokeWidth="1.2" />
      </svg>
      <div style={{ fontSize: 11, color: NGRAPH_THEME.primary, fontWeight: 600 }}>
        No Logo
      </div>
    </div>
  );
}

function Header({ companyLogoUrl }) {
  const width = useWindowWidth();
  const isMobile = width < 600;

  return (
    <div
      style={{
        background: NGRAPH_THEME.header,
        padding: isMobile ? "0.75rem 1rem" : "1rem 1.25rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: "1rem", // Gap handles spacing when wrapped
      }}
    >
      <h1
        style={{
          margin: 0,
          fontSize: isMobile ? "1.25rem" : "1.625rem", // Responsive Font
          fontWeight: 700,
          color: "white",
          flex: "1 1 auto", // Allow shrink/grow
        }}
      >
        Sales Analytics
      </h1>

      <div style={{ flexShrink: 0 }}>
        {companyLogoUrl ? (
          <img
            src={companyLogoUrl}
            alt="company"
            style={{
              height: "3rem",
              width: "auto",
              maxWidth: "100%",
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

function AdvancedDatePicker({ value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const windowWidth = useWindowWidth();
  const isMobile = windowWidth < 768; // Mobile breakpoint

  const startDate = value?.start ? parseISO(value.start) : new Date();
  const endDate = value?.end ? parseISO(value.end) : new Date();

  const [viewDate, setViewDate] = useState(() => subMonths(startOfMonth(endDate), 1));

  useEffect(() => {
    if (value?.end && isOpen) {
      setViewDate(subMonths(startOfMonth(parseISO(value.end)), 1));
    }
  }, [isOpen, value]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleDateClick = (day) => {
    if ((startDate && endDate && !isSameDay(startDate, endDate)) || (!startDate && !endDate)) {
      onChange({ start: format(day, "yyyy-MM-dd"), end: format(day, "yyyy-MM-dd") });
    } else if (startDate && isSameDay(startDate, endDate)) {
      if (isBefore(day, startDate)) {
        onChange({ start: format(day, "yyyy-MM-dd"), end: format(startDate, "yyyy-MM-dd") });
      } else {
        onChange({ start: format(startDate, "yyyy-MM-dd"), end: format(day, "yyyy-MM-dd") });
      }
    }
  };

  const applyPreset = (type) => {
    const today = new Date();
    let s, e;
    if (type === "Today") { s = today; e = today; }
    else if (type === "Yesterday") { s = subDays(today, 1); e = subDays(today, 1); }
    else if (type === "Last 7 Days") { s = subDays(today, 6); e = today; }
    else if (type === "Last 30 Days") { s = subDays(today, 29); e = today; }
    else if (type === "This Month") { s = startOfMonth(today); e = today; }
    else if (type === "Last Month") { s = startOfMonth(subMonths(today, 1)); e = endOfMonth(subMonths(today, 1)); }
    else if (type === "This Year") { s = startOfYear(today); e = today; }
    else if (type === "Last Year") { s = startOfYear(subYears(today, 1)); e = endOfYear(subYears(today, 1)); }

    if (s && e) {
      onChange({ start: format(s, "yyyy-MM-dd"), end: format(e, "yyyy-MM-dd") });
      if (isMobile) setIsOpen(false); // Auto close on mobile for better UX
    }
  };

  const renderCalendar = (baseDate) => {
    const monthStart = startOfMonth(baseDate);
    const monthEnd = endOfMonth(monthStart);
    const startDateGrid = startOfWeek(monthStart);
    const endDateGrid = endOfWeek(monthEnd);
    const days = eachDayOfInterval({ start: startDateGrid, end: endDateGrid });
    const weekDays = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

    return (
      <div style={{ width: isMobile ? "100%" : 230 }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 10, fontWeight: "bold", color: "#333", fontSize: 14 }}>
          {format(baseDate, "MMM yyyy")}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", marginBottom: 6 }}>
          {weekDays.map(d => (
            <div key={d} style={{ textAlign: "center", fontSize: 12, color: "#888", fontWeight: 600 }}>{d}</div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", rowGap: 4 }}>
          {days.map(day => {
            const isCurrentMonth = isSameMonth(day, baseDate);
            const isSelected = (startDate && isSameDay(day, startDate)) || (endDate && isSameDay(day, endDate));
            const isInRange = startDate && endDate && isWithinInterval(day, { start: startDate, end: endDate });

            let bg = "transparent";
            let color = isCurrentMonth ? "#333" : "#ccc";
            let borderRadius = 0;

            if (isSelected) {
              bg = NGRAPH_THEME.primary;
              color = "#fff";
              borderRadius = 4;
            } else if (isInRange) {
              bg = "#ebf8ff";
              color = NGRAPH_THEME.primary;
            }

            return (
              <div
                key={day.toString()}
                onClick={() => handleDateClick(day)}
                style={{
                  textAlign: "center",
                  padding: "6px 0", // Larger touch target
                  fontSize: 12,
                  cursor: "pointer",
                  background: bg,
                  color: color,
                  borderRadius
                }}
              >
                {format(day, "d")}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div ref={containerRef} style={{ position: "relative", width: isMobile ? "100%" : "auto" }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: "flex", alignItems: "center", gap: 8, padding: "8px 12px",
          border: "1px solid #ccc", background: "#fff", borderRadius: 4,
          cursor: "pointer", fontSize: 14, color: "#333",
          width: "100%", // Full width of flex container
          minWidth: isMobile ? "unset" : 260
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
        <span style={{ fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {value.start && value.end
            ? `${format(parseISO(value.start), "MMM d, yyyy")} - ${format(parseISO(value.end), "MMM d, yyyy")}`
            : "Select Date Range"
          }
        </span>
        <span style={{ marginLeft: "auto", fontSize: 10 }}>▼</span>
      </button>

      {isOpen && (
        <div style={{
          position: "absolute",
          top: "110%",
          right: isMobile ? "0" : "0",
          left: isMobile ? "0" : "auto", // Center on mobile
          background: "#fff", border: "1px solid #ccc", borderRadius: 6,
          boxShadow: "0 4px 20px rgba(0,0,0,0.15)", zIndex: 1000,
          display: "flex",
          flexDirection: isMobile ? "column" : "row", // Stack on mobile
          width: isMobile ? "100%" : "max-content",
          maxWidth: isMobile ? "90vw" : "unset",
          margin: isMobile ? "0 auto" : "unset"
        }}>
          {/* Presets Panel */}
          <div style={{
            width: isMobile ? "100%" : 140,
            borderRight: isMobile ? "none" : "1px solid #eee",
            borderBottom: isMobile ? "1px solid #eee" : "none",
            padding: "12px 0",
            background: "#f9fafb",
            display: "flex",
            flexDirection: isMobile ? "row" : "column", // Horizontal scroll on mobile
            gap: 2,
            overflowX: isMobile ? "auto" : "visible", // Enable scrolling for presets
            paddingLeft: isMobile ? 10 : 0
          }}>
            {[
              "Today", "Yesterday", "Last 7 Days", "Last 30 Days",
              "This Month", "Last Month", "This Year", "Last Year" // <--- Added "Last Year" here
            ].map(preset => (
              <button
                key={preset}
                onClick={() => applyPreset(preset)}
                style={{
                  display: "block",
                  width: isMobile ? "auto" : "100%",
                  textAlign: isMobile ? "center" : "left",
                  padding: isMobile ? "6px 12px" : "8px 16px",
                  border: isMobile ? "1px solid #ddd" : "none",
                  borderRadius: isMobile ? 20 : 0,
                  marginRight: isMobile ? 5 : 0,
                  background: isMobile ? "#fff" : "transparent",
                  fontSize: 13, cursor: "pointer", color: "#444",
                  whiteSpace: "nowrap"
                }}
              >
                {preset}
              </button>
            ))}
          </div>

          {/* Calendar Panel */}
          <div style={{ padding: isMobile ? "16px 10px" : "16px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <button
                onClick={() => setViewDate(subMonths(viewDate, 1))}
                style={{ border: "1px solid #eee", background: "#fff", borderRadius: 4, width: 28, height: 28, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                &lt;
              </button>

              <div style={{ display: "flex", gap: 24, justifyContent: "center", width: "100%" }}>
                {/* Show 1 calendar on mobile, 2 on desktop */}
                {renderCalendar(viewDate)}
                {!isMobile && renderCalendar(addMonths(viewDate, 1))}
              </div>

              <button
                onClick={() => setViewDate(addMonths(viewDate, 1))}
                style={{ border: "1px solid #eee", background: "#fff", borderRadius: 4, width: 28, height: 28, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                &gt;
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function KpiGrid({ items }) {
  const width = useWindowWidth();
  const isMobile = width < 768; // Tablet/Mobile breakpoint

  if (!items || !items.length) return null;

  const safeItems = items.map((it) => {
    if (!it) return null;
    if (it.empty) {
      return { title: it.title || "KPI", value: null, empty: true };
    }
    return it;
  }).filter(Boolean);

  return (
    <div
      style={{
        display: "grid",
        // Mobile: 135px allows 2 columns on almost all phones. Desktop: 160px standard.
        // Change from 180px to 140px to allow all 6 to stay on one line
        gridTemplateColumns: `repeat(auto-fit, minmax(${isMobile ? "135px" : "140px"}, 1fr))`,
        // Mobile: Tighter gap (16px). Desktop: Spacious gap (40px).
        gap: isMobile ? "1rem" : "2.50rem",
        marginBottom: "0.75rem",
        width: "100%",
        boxSizing: "border-box" // Prevents padding from breaking width
      }}
    >
      {safeItems.map((it, i) => {
        // Determine color logic
        const isNeutral = it.deltaPercent == null || it.deltaPercent === 0;
        const isNegative = it.deltaPercent < 0;
        const deltaColor = isNeutral ? "#666" : isNegative ? "#d12b2b" : "#0B6623";

        return (
          <div
            key={i}
            style={{
              border: `2px solid ${NGRAPH_THEME.kpiBorder}`,
              padding: isMobile ? "0.5rem" : "0.625rem",
              background: "#fff",
              boxShadow: "0 1px 4px rgba(43,108,176,0.06)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              minHeight: isMobile ? "80px" : "100px", // Visual consistency
            }}
          >
            {/* TITLE */}
            <div
              style={{
                fontSize: isMobile ? "0.875rem" : "1.125rem", // 14px vs 18px
                fontWeight: 600, // Replaced "semibold" string with numeric or valid standard
                color: "#356FAF",
                marginBottom: "4px",
                whiteSpace: "nowrap",       // Prevent wrapping
                overflow: "hidden",         // Handle long titles safely
                textOverflow: "ellipsis",
                maxWidth: "100%"
              }}
              title={it.title || it.label} // Tooltip for truncated text
            >
              {it.title || it.label}
            </div>

            {/* VALUE */}
            <div
              style={{
                fontSize: isMobile ? "1.5rem" : "2rem", // Scale down font on mobile
                fontWeight: 700,
                color: "#000",
                lineHeight: 1.1,
                marginBottom: "4px"
              }}
            >
              {it.empty ? "-" : numberFmt(it.value)}
            </div>

            {/* DELTA / PERCENTAGE */}
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: deltaColor,
                background: isNeutral ? "transparent" : `${deltaColor}15`, // Subtle bg tint for readability
                padding: "2px 6px",
                borderRadius: "4px"
              }}
            >
              {isNeutral
                ? "–"
                : `${it.deltaPercent > 0 ? "+" : ""}${it.deltaPercent.toFixed(1)}%`}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function FiltersRow({ filters, options, onChange }) {
  // --- 2. HOOKS ALWAYS FIRST (Fixes "Rules of Hooks" error) ---
  const width = useWindowWidth(); // Fixes "useWindowSize is not defined"
  const [openMobileFilter, setOpenMobileFilter] = useState(null);

  useEffect(() => {
    if (openMobileFilter) {
      document.body.style.overflow = "hidden"; // Prevent background scroll when modal is open
    } else {
      document.body.style.overflow = "auto";
    }
    return () => { document.body.style.overflow = "auto"; };
  }, [openMobileFilter]);

  // --- 3. CONSTANTS ---
  const isMobile = width < 768;
  const keys = ["client", "consignee", "agent", "product"];

  // --- 4. EARLY RETURNS (Must come AFTER hooks) ---
  if (options == null) return null;
  if (options?.empty) return null; // Or <NoDataWidget />

  return (
    <>
      {/* LAYOUT FIX: Using Flexbox with wrap instead of Grid.
         Grid breaks on small screens if minmax is too wide. 
         Flexbox handles wrapping gracefully.
      */}
      <div style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "0.75rem",
        marginBottom: "0.75rem",
        width: "100%"
      }}>
        {keys.map((k) => {
          const optObj = options[`sa_filter_${k}`];
          if (!optObj?.values?.length) return null;

          const list = [{ label: optObj.title, value: "All" }, ...optObj.values];
          // Find label safely
          const currentValStr = String(filters[k]);
          const current = list.find((x) => String(x.value) === currentValStr) || list[0];

          return (
            <div key={k} style={{
              // Flex logic:
              // Mobile: 100% width (Stacked)
              // Desktop: Grows to fill space, min 160px
              flex: isMobile ? "1 1 100%" : "1 1 160px",
              minWidth: 0 // Prevents overflow if content is long
            }}>
              {!isMobile ? (
                // DESKTOP: Standard Select
                <select
                  value={filters[k]}
                  onChange={(e) => onChange({ ...filters, [k]: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: `2px solid ${NGRAPH_THEME.kpiBorder}`,
                    fontSize: "0.9rem",
                    fontWeight: 700,
                    background: "#fff",
                    color: "#0B3A66",
                    cursor: "pointer",
                    outline: "none",
                    // Custom Arrow styling
                    appearance: "none",
                    backgroundImage: `url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%230B3A66%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")`,
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "right 10px center",
                    backgroundSize: "10px auto",
                    paddingRight: "25px"
                  }}
                >
                  {list.map((v, i) => (
                    <option key={i} value={String(v.value)}>{v.label}</option>
                  ))}
                </select>
              ) : (
                // MOBILE: Trigger Button for Modal
                <button
                  onClick={() => setOpenMobileFilter(k)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "12px",
                    border: `2px solid ${NGRAPH_THEME.kpiBorder}`,
                    background: "#fff",
                    color: "#0B3A66",
                    fontWeight: 700,
                    fontSize: "0.95rem",
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}
                >
                  <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginRight: 8 }}>
                    {current.label}
                  </span>
                  <span style={{ fontSize: "10px", flexShrink: 0, opacity: 0.6 }}>▼</span>
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* MOBILE FULL-SCREEN MODAL */}
      {isMobile && openMobileFilter && (() => {
        const k = openMobileFilter;
        const optObj = options[`sa_filter_${k}`];
        if (!optObj) return null;
        const list = [{ label: optObj.title, value: "All" }, ...optObj.values];

        return (
          <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 99999, background: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "flex-end" }}>
            <div style={{
              width: "100%",
              maxWidth: "500px", // Limit max width on tablets
              height: "85vh", // Fixed height sheet
              background: "#fff",
              borderTopLeftRadius: "16px",
              borderTopRightRadius: "16px",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 -4px 20px rgba(0,0,0,0.2)",
              overflow: "hidden",
              animation: "slideUp 0.3s ease-out" // Optional animation class
            }}>

              <div style={{ padding: "16px", borderBottom: `1px solid ${NGRAPH_THEME.grid}`, display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8fafc" }}>
                <div style={{ fontWeight: 800, fontSize: "1.1rem", color: "#0B2447" }}>Select {optObj.title}</div>
                <button onClick={() => setOpenMobileFilter(null)} style={{ padding: "8px 16px", background: "#e2e8f0", border: "none", borderRadius: "6px", color: "#0f172a", fontWeight: 700, cursor: "pointer" }}>Done</button>
              </div>

              <div style={{ flex: 1, overflowY: "auto", padding: "0 16px 40px 16px" }}>
                {list.map((v, i) => {
                  const val = String(v.value);
                  const isSelected = String(filters[k]) === val;
                  return (
                    <div
                      key={i}
                      onClick={() => { onChange({ ...filters, [k]: v.value }); setOpenMobileFilter(null); }}
                      style={{
                        padding: "16px 12px",
                        borderBottom: "1px solid #f1f5f9",
                        background: isSelected ? "#e0f2fe" : "transparent", // Highlight selected
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        cursor: "pointer"
                      }}
                    >
                      <div style={{ fontWeight: isSelected ? 700 : 500, color: "#0B2447", fontSize: "1rem" }}>
                        {String(v.label)}
                      </div>
                      {isSelected && <div style={{ color: NGRAPH_THEME.primary, fontWeight: 900, fontSize: "1.2rem" }}>✓</div>}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })()}
    </>
  );
}

const DONUT_COLORS = [
  "#2B6CB0",
  "#1E90FF",
  "#60A5FA",
  "#93C5FD",
  "#BEE3F8",
  "#E6F0FB",
];

function DonutWidget({ title, data }) {
  const width = useWindowWidth();
  const isMobile = width < 768;
  const getWidgetHeight = (isMobile) => (isMobile ? 420 : 340);
  const widgetHeight = getWidgetHeight(isMobile);

  const items = useMemo(() => {
    if (!data?.items?.length) return [];
    return [...data.items].sort((a, b) => b.value - a.value);
  }, [data]);

  const MAX_SLICES = 5;

  const preparedItems = useMemo(() => {
    if (!items.length) return [];
    if (items.length <= MAX_SLICES) return items;

    const top = items.slice(0, MAX_SLICES);
    const rest = items.slice(MAX_SLICES);
    const othersValue = rest.reduce((sum, x) => sum + x.value, 0);

    if (othersValue <= 0) return top;

    return [
      ...top,
      { label: "Others", value: othersValue, isOthers: true },
    ];
  }, [items]);

  const totalValue = useMemo(
    () => preparedItems.reduce((s, x) => s + x.value, 0),
    [preparedItems]
  );

  const finalItems = useMemo(
    () =>
      preparedItems.map(it => ({
        ...it,
        percentage: totalValue > 0 ? (it.value / totalValue) * 100 : 0,
      })),
    [preparedItems, totalValue]
  );

  // Helper for inner label
  const renderInsideLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    if (percent * 100 < 4) return null;
    const radius = innerRadius + (outerRadius - innerRadius) / 2;
    const RADIAN = Math.PI / 180;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text x={x} y={y} fill="#fff" fontSize={isMobile ? 9 : 11} fontWeight={600} textAnchor="middle" dominantBaseline="central">
        {(percent * 100).toFixed(1)}%
      </text>
    );
  };

  const truncateLabel = (str) => {
    const limit = isMobile ? 25 : 18;
    return str.length > limit ? str.slice(0, limit) + "…" : str;
  };

  // --- RENDERING ---

  // Wrapper Style: Strict Fixed Height
  const containerStyle = {
    textAlign: "center",
    marginBottom: "0.75rem",
    minHeight: widgetHeight,
    display: "flex",
    flexDirection: "column",
  };

  if (data == null) return <div style={containerStyle}></div>; // Placeholder to keep grid intact
  if (data?.empty || !finalItems.length)
    return (
      <div style={containerStyle}>
        <NoDataWidget title={title} />
      </div>
    );

  return (
    <div style={containerStyle}>
      <div style={{ fontWeight: 700, fontSize: "1rem", color: "#0B3A66", marginBottom: "0.5rem", flexShrink: 0 }}>
        {title}
      </div>

      <div style={{
        background: "#fff",
        border: `2px solid ${NGRAPH_THEME.kpiBorder}`,
        padding: "0.75rem",
        flex: 1,
        minHeight: 0, // CRITICAL for nested flex scrolling
        display: "flex",
        flexDirection: isMobile ? "column" : "row",
        alignItems: "center",
        overflow: "hidden" // Ensure nothing spills out of the fixed box
      }}>
        {/* DONUT CHART AREA */}
        <div style={{
          width: isMobile ? "100%" : "55%",
          height: isMobile ? "50%" : "100%", // Split height on mobile
          marginBottom: isMobile ? 12 : 0,
          flexShrink: 0
        }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={finalItems}
                dataKey="value"
                cx="50%"
                cy="50%"
                outerRadius={isMobile ? 70 : 85} // Slightly smaller to fit fixed height
                innerRadius={isMobile ? 30 : 40}
                paddingAngle={5}
                label={renderInsideLabel}
                labelLine={false}
              >
                {finalItems.map((e, i) => (
                  <Cell key={i} fill={e.isOthers ? "#CBD5E1" : DONUT_COLORS[i % DONUT_COLORS.length]} />
                ))}
              </Pie>
              <Customized>
                {({ width, height }) => (
                  <g>
                    <text x={width / 2} y={height / 2 - 8} textAnchor="middle" style={{ fontSize: isMobile ? 12 : 14, fontWeight: 700, fill: "#0B3A66" }}>
                      {moneyFmt(totalValue)}
                    </text>
                    <text x={width / 2} y={height / 2 + 10} textAnchor="middle" style={{ fontSize: 10, fill: "#6b8fbf" }}>
                      Total
                    </text>
                  </g>
                )}
              </Customized>
              <ReTooltip formatter={(v, n, p) => [moneyFmt(v), `${p.payload.label} (${p.payload.percentage.toFixed(1)}%)`]} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* LEGEND AREA */}
        <div style={{
          width: isMobile ? "100%" : "45%",
          height: isMobile ? "50%" : "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: isMobile ? "flex-start" : "center", // Align top on mobile
          gap: 8,
          overflowY: "auto", // SCROLLABLE if too many items
          paddingLeft: isMobile ? 0 : 10,
          borderTop: isMobile ? "1px solid #eee" : "none",
          paddingTop: isMobile ? 12 : 0
        }}>
          {finalItems.map((it, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: it.isOthers ? "#CBD5E1" : DONUT_COLORS[i % DONUT_COLORS.length], flexShrink: 0 }} />
              <div style={{ color: "#0B3A66", fontSize: 13, flex: 1, textAlign: "left", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {truncateLabel(it.label)}
              </div>
              {isMobile && <div style={{ fontSize: 12, fontWeight: 600, color: "#555" }}>{it.percentage.toFixed(0)}%</div>}
            </div>
          ))}
        </div>
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

function detectMetricKey(data) {
  if (!data?.current?.length) return "sales";
  const row = data.current[0];
  return Object.keys(row).find(k => k !== "Label" && k !== "x" && typeof row[k] === "number") || "sales";
}

function formatLegendLabel(dataKey, prevRange) {
  if (dataKey.startsWith("prev")) {
    const base = dataKey.replace(/^prev/, "");
    return `${base} (${prevRange})`;
  }
  return dataKey;
}

function prettify(label) {
  return label.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
}

function CustomLineLegend({ payload, prevData }) {
  const prevRange = getDateRange(prevData);

  const sortedPayload = [...payload].sort((a, b) => {
    const aIsPrev = a.dataKey.startsWith("prev");
    const bIsPrev = b.dataKey.startsWith("prev");

    if (aIsPrev === bIsPrev) return 0;
    return aIsPrev ? 1 : -1; // current first
  });

  return (
    <ul
      style={{
        display: "flex",
        justifyContent: "center",
        flexWrap: "wrap",
        gap: "10px 20px",
        listStyle: "none",
        padding: 0,
        margin: 0
      }}
    >
      {sortedPayload.map((p, i) => (
        <li
          key={i}
          style={{
            display: "flex",
            alignItems: "center",
            fontSize: 12,
            color: "#1f2937"
          }}
        >
          <span
            style={{
              width: 16,
              height: 3,
              background: p.color,
              display: "inline-block",
              marginRight: 6
            }}
          />
          {/* formatting logic remains the same */}
          {prettify(formatLegendLabel(p.dataKey, prevRange))}
        </li>
      ))}
    </ul>
  );
}

function LineAreaWidget({ title, data }) {
  const width = useWindowWidth();
  const isMobile = width < 768;
  const getWidgetHeight = (isMobile) => (isMobile ? 420 : 340);
  const widgetHeight = getWidgetHeight(isMobile);
  const metricKey = detectMetricKey(data);

  const merged = useMemo(() => {
    const curr = data?.current || [];
    const prev = data?.previous || [];
    if (!curr.length) return [];
    return curr.map((d, i) => ({
      x: d.x,
      [metricKey]: d[metricKey] ?? null,
      [`prev${metricKey}`]: prev[i]?.[metricKey] ?? null,
      realCurrDate: d.x,
      realPrevDate: prev[i]?.x,
    }));
  }, [data, metricKey]);

  // Wrapper Style
  const containerStyle = {
    textAlign: "center",
    marginBottom: "0.75rem",
    height: widgetHeight,
    display: "flex",
    flexDirection: "column"
  };

  if (data == null) return <div style={containerStyle}></div>;
  if (data?.empty) return <div style={containerStyle}><NoDataWidget title={title} /></div>;

  return (
    <div style={containerStyle}>
      <div style={{ fontWeight: 700, fontSize: 16, color: "#0B3A66", marginBottom: 8, flexShrink: 0 }}>{title}</div>

      <div style={{ background: "#fff", padding: isMobile ? "8px 4px" : 12, border: `2px solid ${NGRAPH_THEME.kpiBorder}`, flex: 1, position: "relative", minHeight: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={merged} margin={{ top: 5, right: isMobile ? 10 : 30, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e6efff" />
            <XAxis dataKey="x" fontSize={11} tick={{ fill: "#33527a" }} axisLine={{ stroke: "#c3d7ff" }} tickLine={{ stroke: "#c3d7ff" }} tickFormatter={formatDateShort} interval={isMobile ? "preserveStartEnd" : 0} />
            <YAxis
              tickFormatter={(v) => {
                if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`;      // Billion
                if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;      // Million
                if (v >= 1e5) return `${(v / 1e5).toFixed(1)}L`;      // Lakh
                if (v >= 1e3) return `${(v / 1e3).toFixed(0)}K`;      // Thousand
                return v;
              }}
              fontSize={11}
              tick={{ fill: "#33527a" }}
              axisLine={{ stroke: "#c3d7ff" }}
              tickLine={{ stroke: "#c3d7ff" }}
              width={isMobile ? 40 : 50}
            />
            <ReTooltip content={(props) => {
              const p = props?.payload?.[0];
              if (!p) return null;
              const row = p.payload;
              return (
                <div style={{ background: "#fff", padding: 8, border: "1px solid #ddd", borderRadius: 6, boxShadow: "0 2px 10px rgba(0,0,0,0.1)", textAlign: 'left' }}>
                  {row[metricKey] != null && (
                    <div style={{ marginBottom: 4 }}>
                      <div style={{ fontWeight: 600, fontSize: 12, color: "#555" }}>{prettify(metricKey)} ({formatDateShort(row.realCurrDate)})</div>
                      <div style={{ fontWeight: 700, color: "#2563eb" }}>{moneyFmt(row[metricKey])}</div>
                    </div>
                  )}
                  {row[`prev${metricKey}`] != null && (
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 12, color: "#555" }}>{prettify(metricKey)} ({formatDateShort(row.realPrevDate)})</div>
                      <div style={{ fontWeight: 700, color: "#8dabec" }}>{moneyFmt(row[`prev${metricKey}`])}</div>
                    </div>
                  )}
                </div>
              );
            }} />
            <Line type="monotone" dataKey={metricKey} stroke="#2563eb" strokeWidth={3} dot={false} activeDot={{ r: 5 }} />
            <Line type="monotone" dataKey={`prev${metricKey}`} stroke="#8dabecff" strokeWidth={3} dot={false} activeDot={{ r: 5 }} />
            <Legend
              content={(props) => (
                <CustomLineLegend
                  {...props}
                  prevData={data?.previous} // <--- Pass the specific data here
                />
              )}
              verticalAlign="top"
              height={isMobile ? 40 : 30}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// scroll showing
// function TableWidget({ title, data }) {
//   const [page, setPage] = useState(1);
//   const width = useWindowWidth();
//   const isMobile = width < 768;
//   const getWidgetHeight = (isMobile) => (isMobile ? 420 : 340);
//   const widgetHeight = getWidgetHeight(isMobile);

//   // --- RESPONSIVE DIMENSIONS ---
//   const VALUE_COL_WIDTH = isMobile ? 110 : 150;
//   const VALUE_NUMBER_WIDTH = isMobile ? 60 : 80;
//   const VALUE_BAR_WIDTH = isMobile ? 30 : 50;
//   const TEXT_COL_WIDTH = isMobile ? 120 : 180;

//   const safeColumns = Array.isArray(data?.current?.columns) ? data.current.columns : [];
//   const safeRows = Array.isArray(data?.current?.rows) ? data.current.rows : [];
//   const prevRows = Array.isArray(data?.previous?.rows) ? data.previous.rows : [];
//   const dataKey = safeColumns.join(",") + safeRows.length;

//   useEffect(() => { setPage(1); }, [dataKey]);

//   // Wrapper Style
//   const containerStyle = {
//     marginBottom: "0.75rem",
//     display: "flex",
//     flexDirection: "column",
//     height: widgetHeight
//   };

//   if (data == null) return <div style={containerStyle}></div>;
//   if (data.empty || !safeColumns.length) return <div style={containerStyle}><NoDataWidget title={title} /></div>;

//   let rows = [...safeRows];
//   let totalRow = null;
//   if (rows.length > 0) {
//     const last = rows[rows.length - 1];
//     const isTotal = Object.values(last).some((v) => typeof v === "string" && v.toLowerCase().includes("total"));
//     if (isTotal) {
//       totalRow = last;
//       rows = rows.slice(0, rows.length - 1);
//     }
//   }

//   if (rows.length === 0) return <div style={containerStyle}><NoDataWidget title={title} /></div>;

//   // --- COLUMN DETECTION LOGIC ---
//   const MONEY_NAME_REGEX = /(amount|amt|total|price|value|cost|net|revenue|sales|balance|paid|receipt|gross)/i;
//   const moneyColumnIndexes = new Set();
//   const numberColumnIndexes = new Set();

//   safeColumns.forEach((col, idx) => { if (MONEY_NAME_REGEX.test(String(col))) moneyColumnIndexes.add(idx); });

//   const sampleSize = Math.min(6, rows.length);
//   for (let colIdx = 0; colIdx < safeColumns.length; colIdx++) {
//     let numericCount = 0;
//     for (let r = 0; r < sampleSize; r++) {
//       const val = rows[r]?.[colIdx];
//       const cleaned = String(val).replace(/[,₹$]/g, "");
//       if (val !== null && val !== undefined && val !== "" && !isNaN(Number(cleaned))) numericCount++;
//     }
//     if (numericCount >= Math.ceil(sampleSize * 0.6) && !moneyColumnIndexes.has(colIdx)) {
//       numberColumnIndexes.add(colIdx);
//     }
//   }

//   if (moneyColumnIndexes.size === 0 && numberColumnIndexes.size > 0) {
//     const firstNumCol = [...numberColumnIndexes][0];
//     moneyColumnIndexes.add(firstNumCol);
//     numberColumnIndexes.delete(firstNumCol);
//   }

//   const valueColIndex = [...moneyColumnIndexes][0];
//   const keyColIndex = safeColumns.findIndex((_, i) => typeof safeRows[0]?.[i] === "string");
//   const prevMap = new Map();
//   if (keyColIndex !== -1 && valueColIndex !== undefined) {
//     prevRows.forEach(r => {
//       const key = r[keyColIndex];
//       const val = Number(String(r[valueColIndex]).replace(/[,₹$]/g, ""));
//       if (key && Number.isFinite(val)) prevMap.set(key, val);
//     });
//   }

//   let currentTotal = 0;
//   let previousTotal = 0;
//   if (valueColIndex !== undefined && keyColIndex !== -1) {
//     rows.forEach(r => {
//       const key = r[keyColIndex];
//       const currVal = Number(String(r[valueColIndex]).replace(/[,₹$]/g, ""));
//       const prevVal = prevMap.get(key);
//       if (Number.isFinite(currVal)) currentTotal += currVal;
//       if (Number.isFinite(prevVal)) previousTotal += prevVal;
//     });
//   }
//   const totalDeltaPercent = previousTotal !== 0 ? ((currentTotal - previousTotal) / previousTotal) * 100 : null;

//   const total = rows.length;
//   const TABLE_PAGE_SIZE = 5;
//   const pages = Math.ceil(total / TABLE_PAGE_SIZE);
//   const start = (page - 1) * TABLE_PAGE_SIZE;
//   const visible = rows.slice(start, start + TABLE_PAGE_SIZE);

//   const maxValueOnPage = Math.max(1, ...visible.map(r => {
//     const v = Number(String(r[valueColIndex]).replace(/[,₹$]/g, ""));
//     return Number.isFinite(v) ? v : 0;
//   }));

//   return (
//     <div style={containerStyle}>
//       <div style={{ textAlign: "center", fontWeight: 700, fontSize: "1rem", color: "#0B3A66", marginBottom: 8, flexShrink: 0 }}>
//         {title}
//       </div>

//       <div style={{
//         background: "#fff",
//         border: `2px solid ${NGRAPH_THEME.kpiBorder}`,
//         display: "flex",
//         flexDirection: "column",
//         flex: 1,
//         minHeight: 0 // Crucial so child can scroll
//       }}>
//         <div style={{
//           flex: 1,
//           minHeight: 0,
//           overflow: "auto", // Allow Both Vertical and Horizontal Scroll if needed
//           WebkitOverflowScrolling: "touch"
//         }}>
//           <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, minWidth: isMobile ? "100%" : "400px" }}>
//             <thead>
//               <tr>
//                 <th style={{ position: "sticky", top: 0, zIndex: 10, width: "40px", padding: "8px", background: NGRAPH_THEME.primary, color: "white", textAlign: "left", fontSize: 13 }}>#</th>
//                 {[...safeColumns, "Δ %"].map((c, idx) => {
//                   const isValueCol = idx === valueColIndex + 1;
//                   const isDeltaCol = c === "Δ %";
//                   const isNumeric = moneyColumnIndexes.has(idx) || numberColumnIndexes.has(idx) || isDeltaCol;
//                   return (
//                     <th key={c} style={{
//                       position: "sticky", top: 0, zIndex: 10,
//                       textAlign: isDeltaCol ? "right" : "left",
//                       padding: "8px", color: "#fff", background: NGRAPH_THEME.primary,
//                       fontSize: 13, whiteSpace: "nowrap",
//                       minWidth: isValueCol ? VALUE_COL_WIDTH : isDeltaCol ? 80 : 100
//                     }}>{c}</th>
//                   );
//                 })}
//               </tr>
//             </thead>
//             <tbody>
//               {visible.map((row, i) => {
//                 const idx = start + i + 1;
//                 return (
//                   <tr key={i} style={{ background: i % 2 === 1 ? NGRAPH_THEME.primarySoft : "#fff" }}>
//                     <td style={{ padding: "8px", fontSize: 13, color: "#333", borderBottom: "1px solid #eee", verticalAlign: "top" }}>{idx}</td>
//                     {row.map((v, j) => {
//                       const cleaned = String(v).replace(/[,₹$]/g, "");
//                       if (j === valueColIndex && !isNaN(Number(cleaned))) {
//                         const numericValue = Number(cleaned);
//                         const barPx = Math.round((numericValue / maxValueOnPage) * VALUE_BAR_WIDTH);
//                         return (
//                           <td key={j} style={{ padding: "6px 8px", borderBottom: "1px solid #eee", verticalAlign: "top" }}>
//                             <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6 }}>
//                               <div style={{ width: VALUE_NUMBER_WIDTH, textAlign: "right", fontWeight: 700, color: "#0B3A66", fontSize: 13 }}>{moneyFmt(numericValue)}</div>
//                               <div style={{ width: VALUE_BAR_WIDTH, height: 6, background: "transparent", display: "flex", alignItems: "center" }}>
//                                 {barPx > 0 && <div style={{ width: barPx, height: "100%", background: NGRAPH_THEME.primary, borderRadius: 2 }} />}
//                               </div>
//                             </div>
//                           </td>
//                         );
//                       }
//                       if (typeof v === "string" && v.trim().endsWith("%")) {
//                         const num = parseFloat(v.replace("%", ""));
//                         return <td key={j} style={{ padding: "8px", textAlign: "right", fontWeight: 700, fontSize: 13, color: !isNaN(num) && num < 0 ? "#d12b2b" : "#0B6623", borderBottom: "1px solid #eee", verticalAlign: "top" }}>{v}</td>;
//                       }
//                       if (numberColumnIndexes.has(j)) {
//                         const numVal = Number(cleaned);
//                         return <td key={j} style={{ padding: "8px", textAlign: "right", fontSize: 13, color: "#333", borderBottom: "1px solid #eee", verticalAlign: "top" }}>{numberFmt(numVal)}</td>
//                       }
//                       return (
//                         <td key={j} style={{ padding: "8px", maxWidth: TEXT_COL_WIDTH, whiteSpace: "normal", wordBreak: "break-word", fontSize: 13, color: "#333", borderBottom: "1px solid #eee", verticalAlign: "top" }} title={String(v)}>{v}</td>
//                       );
//                     })}
//                     {(() => {
//                       const key = row[keyColIndex];
//                       const currVal = Number(String(row[valueColIndex]).replace(/[,₹$]/g, "")) || 0;
//                       const rawPrev = prevMap.get(key);
//                       const prevVal = Number.isFinite(rawPrev) ? rawPrev : null;
//                       const deltaVal = prevVal == null ? null : currVal - prevVal;
//                       const deltaPct = prevVal == null || prevVal === 0 ? null : (deltaVal / prevVal) * 100;
//                       return <td style={{ padding: "8px", textAlign: "right", fontWeight: 700, fontSize: 13, color: deltaPct < 0 ? "#d12b2b" : "#0B6623", whiteSpace: "nowrap", borderBottom: "1px solid #eee", verticalAlign: "top" }}>{deltaPct == null ? "–" : `${deltaPct > 0 ? "+" : ""}${deltaPct.toFixed(1)}%`}</td>;
//                     })()}
//                   </tr>
//                 );
//               })}
//             </tbody>
//             {totalRow && (
//               <tfoot>
//                 <tr style={{ background: NGRAPH_THEME.primary, color: "#fff", fontWeight: 700 }}>
//                   <td style={{ padding: "8px" }}></td>
//                   {safeColumns.map((c, j) => {
//                     const v = totalRow[c] ?? totalRow[j] ?? "";
//                     const cleaned = String(v).replace(/[,₹$]/g, "");
//                     const isNumeric = cleaned !== "" && !isNaN(Number(cleaned));
//                     if (moneyColumnIndexes.has(j) && isNumeric) return <td key={j} style={{ padding: "8px", textAlign: "right", whiteSpace: "nowrap", verticalAlign: "top" }}><div style={{ marginRight: VALUE_BAR_WIDTH + 6 }}>{moneyFmt(Number(cleaned))}</div></td>;
//                     if (numberColumnIndexes.has(j) && isNumeric) return <td key={j} style={{ padding: "8px", textAlign: "right", whiteSpace: "nowrap", verticalAlign: "top" }}>{numberFmt(Number(cleaned))}</td>;
//                     return <td key={j} style={{ padding: "8px", textAlign: isNumeric ? "right" : "left", maxWidth: TEXT_COL_WIDTH, whiteSpace: "normal", wordBreak: "break-word", verticalAlign: "top" }}>{v}</td>
//                   })}
//                   <td style={{ padding: "8px", textAlign: "right", whiteSpace: "nowrap", color: totalDeltaPercent < 0 ? "#ff8888" : "#88ff88", verticalAlign: "top" }}>{totalDeltaPercent == null ? "–" : `${totalDeltaPercent > 0 ? "+" : ""}${totalDeltaPercent.toFixed(1)}%`}</td>
//                 </tr>
//               </tfoot>
//             )}
//           </table>
//         </div>
//         {pages > 1 && (
//           <div style={{ display: "flex", justifyContent: "flex-end", padding: "10px", borderTop: "1px solid #eee", flexShrink: 0 }}>
//             <span style={{ marginRight: 12, fontSize: 13, display: "flex", alignItems: "center" }}>{start + 1}–{Math.min(start + TABLE_PAGE_SIZE, total)} of {total}</span>
//             <div style={{ display: "flex", gap: 4 }}>
//               <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} style={{ padding: "4px 10px", background: "#f3f4f6", border: "1px solid #ddd", borderRadius: 4, cursor: page === 1 ? "not-allowed" : "pointer", opacity: page === 1 ? 0.5 : 1 }}>{"<"}</button>
//               <button disabled={page === pages} onClick={() => setPage((p) => p + 1)} style={{ padding: "4px 10px", background: "#f3f4f6", border: "1px solid #ddd", borderRadius: 4, cursor: page === pages ? "not-allowed" : "pointer", opacity: page === pages ? 0.5 : 1 }}>{">"}</button>
//             </div>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }

// scroll hided and wrapping+truncate
function TableWidget({ title, data }) {
  const [page, setPage] = useState(1);
  const width = useWindowWidth();
  const isMobile = width < 768;
  const isMedium = width >= 768 && width <= 1366; // New breakpoint for your issue

  const getWidgetHeight = (isMobile) => (isMobile ? 420 : 340);
  const widgetHeight = getWidgetHeight(isMobile);

  // --- ADJUSTED RESPONSIVE DIMENSIONS ---
  const VALUE_COL_WIDTH = isMobile ? 110 : (isMedium ? 100 : 120);
  const VALUE_NUMBER_WIDTH = isMobile ? 60 : (isMedium ? 55 : 70);
  const VALUE_BAR_WIDTH = isMobile ? 30 : (isMedium ? 30 : 40);
  const TEXT_COL_WIDTH = isMobile ? 120 : (isMedium ? 100 : 150);

  const safeColumns = Array.isArray(data?.current?.columns) ? data.current.columns : [];
  const safeRows = Array.isArray(data?.current?.rows) ? data.current.rows : [];
  const prevRows = Array.isArray(data?.previous?.rows) ? data.previous.rows : [];
  const dataKey = safeColumns.join(",") + safeRows.length;

  useEffect(() => { setPage(1); }, [dataKey]);

  // Wrapper Style - CHANGED height to minHeight
  const containerStyle = {
    marginBottom: "0.75rem",
    display: "flex",
    flexDirection: "column",
    height: widgetHeight,
    width: "100%",
    overflow: "hidden" // Prevent the card itself from growing
  };

  if (data == null) return <div style={containerStyle}></div>;
  if (data.empty || !safeColumns.length) return <div style={containerStyle}><NoDataWidget title={title} /></div>;

  let rows = [...safeRows];
  let totalRow = null;
  if (rows.length > 0) {
    const last = rows[rows.length - 1];
    const isTotal = Object.values(last).some((v) => typeof v === "string" && v.toLowerCase().includes("total"));
    if (isTotal) {
      totalRow = last;
      rows = rows.slice(0, rows.length - 1);
    }
  }

  if (rows.length === 0) return <div style={containerStyle}><NoDataWidget title={title} /></div>;

  const MONEY_NAME_REGEX = /(amount|amt|total|price|value|cost|net|revenue|sales|balance|paid|receipt|gross)/i;
  const moneyColumnIndexes = new Set();
  const numberColumnIndexes = new Set();

  safeColumns.forEach((col, idx) => {
    if (MONEY_NAME_REGEX.test(String(col))) moneyColumnIndexes.add(idx);
  });

  const sampleSize = Math.min(6, rows.length);
  for (let colIdx = 0; colIdx < safeColumns.length; colIdx++) {
    let numericCount = 0;
    for (let r = 0; r < sampleSize; r++) {
      const val = rows[r]?.[colIdx];
      const cleaned = String(val).replace(/[,₹$Lkmb]/gi, "");
      if (val !== null && val !== undefined && val !== "" && !isNaN(Number(cleaned))) numericCount++;
    }
    if (numericCount >= Math.ceil(sampleSize * 0.6) && !moneyColumnIndexes.has(colIdx)) {
      numberColumnIndexes.add(colIdx);
    }
  }

  if (moneyColumnIndexes.size === 0 && numberColumnIndexes.size > 0) {
    const firstNumCol = [...numberColumnIndexes][0];
    moneyColumnIndexes.add(firstNumCol);
    numberColumnIndexes.delete(firstNumCol);
  }

  const valueColIndex = [...moneyColumnIndexes][0];
  const keyColIndex = safeColumns.findIndex((_, i) => typeof safeRows[0]?.[i] === "string");

  const prevMap = new Map();
  if (keyColIndex !== -1 && valueColIndex !== undefined) {
    prevRows.forEach(r => {
      const key = r[keyColIndex];
      const val = Number(String(r[valueColIndex]).replace(/[,₹$Lkmb]/gi, ""));
      if (key && Number.isFinite(val)) prevMap.set(key, val);
    });
  }

  let currentTotal = 0;
  let previousTotal = 0;
  if (valueColIndex !== undefined && keyColIndex !== -1) {
    rows.forEach(r => {
      const key = r[keyColIndex];
      const currVal = Number(String(r[valueColIndex]).replace(/[,₹$]/g, ""));
      const prevVal = prevMap.get(key);
      if (Number.isFinite(currVal)) currentTotal += currVal;
      if (Number.isFinite(prevVal)) previousTotal += prevVal;
    });
  }
  const totalDeltaPercent = previousTotal !== 0 ? ((currentTotal - previousTotal) / previousTotal) * 100 : null;

  const total = rows.length;
  const TABLE_PAGE_SIZE = 5;
  const pages = Math.ceil(total / TABLE_PAGE_SIZE);
  const start = (page - 1) * TABLE_PAGE_SIZE;
  const visible = rows.slice(start, start + TABLE_PAGE_SIZE);

  const maxValueOnPage = Math.max(1, ...visible.map(r => {
    const v = Number(String(r[valueColIndex]).replace(/[,₹$]/g, ""));
    return Number.isFinite(v) ? v : 0;
  }));

  const lineClampStyle = {
    display: "-webkit-box",
    WebkitLineClamp: 2, // Reduced to 2 for tighter screens
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "normal",
    wordBreak: "break-word",
    maxWidth: TEXT_COL_WIDTH,
  };

  return (
    <div style={containerStyle}>
      <div style={{ textAlign: "center", fontWeight: 700, fontSize: "1rem", color: "#0B3A66", marginBottom: 8, flexShrink: 0 }}>
        {title}
      </div>

      <div style={{
        background: "#fff",
        border: `2px solid ${NGRAPH_THEME.kpiBorder}`,
        display: "flex",
        flexDirection: "column",
        flex: 1,
        minHeight: 0
      }}>
        <div
          className="hide-scrollbar"
          style={{
            flex: 1,
            minHeight: 0,
            overflowX: "auto",
            overflowY: "hidden",
            scrollbarWidth: "none"
          }}
        >
          <style>{`
            .hide-scrollbar::-webkit-scrollbar {
              display: none;
            }
          `}</style>

          <table
            style={{
              width: "100%",
              borderCollapse: "separate",
              borderSpacing: 0,
              // minWidth: isMobile ? "100%" : "400px",
              tableLayout: safeColumns.length > 4 ? "auto" : "fixed", // flexible if many columns
              fontSize: isMedium ? "11px" : "13px"
            }}
          >
            <thead>
              <tr>
                <th style={{ position: "sticky", top: 0, zIndex: 10, width: "40px", padding: "8px", background: NGRAPH_THEME.primary, color: "white", textAlign: "left", fontSize: 13 }}>#</th>
                {[...safeColumns, "Δ %"].map((c, idx) => {
                  const isValueCol = idx === valueColIndex + 1;
                  const isDeltaCol = c === "Δ %";
                  const isNumeric = moneyColumnIndexes.has(idx) || numberColumnIndexes.has(idx) || isDeltaCol;
                  return (
                    <th key={c} style={{
                      position: "sticky", top: 0, zIndex: 10,
                      textAlign: isDeltaCol || isNumeric ? "right" : "left",
                      // textAlign: isDeltaCol ? "right" : "left",
                      padding: "8px", color: "#fff", background: NGRAPH_THEME.primary,
                      fontSize: 13, whiteSpace: "nowrap",
                      minWidth: isValueCol ? VALUE_COL_WIDTH : isDeltaCol ? 80 : 100
                    }}>{c}</th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {visible.map((row, i) => {
                const idx = start + i + 1;
                return (
                  <tr key={i} style={{ background: i % 2 === 1 ? NGRAPH_THEME.primarySoft : "#fff" }}>
                    <td style={{ padding: "8px", fontSize: 13, color: "#333", borderBottom: "1px solid #eee", verticalAlign: "top" }}>{idx}</td>
                    {row.map((v, j) => {
                      const cleaned = String(v).replace(/[,₹$Lkmb]/gi, "");
                      const numericValue = !isNaN(Number(cleaned)) ? Number(cleaned) : null;

                      // CASE 1: Primary Value Column (Render Bar + MoneyFmt)
                      if (j === valueColIndex && numericValue !== null) {
                        const barPx = Math.round((numericValue / maxValueOnPage) * VALUE_BAR_WIDTH);
                        return (
                          <td key={j} style={{ padding: "6px 8px", borderBottom: "1px solid #eee", verticalAlign: "top" }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6 }}>
                              <div style={{ width: VALUE_NUMBER_WIDTH, textAlign: "right", fontWeight: 700, color: "#0B3A66", fontSize: 13 }}>{moneyFmt(numericValue)}</div>
                              <div style={{ width: VALUE_BAR_WIDTH, height: 6, background: "transparent", display: "flex", alignItems: "center" }}>
                                {barPx > 0 && <div style={{ width: barPx, height: "100%", background: NGRAPH_THEME.primary, borderRadius: 2 }} />}
                              </div>
                            </div>
                          </td>
                        );
                      }

                      // CASE 2: Percentage Columns
                      if (typeof v === "string" && v.trim().endsWith("%")) {
                        const num = parseFloat(v.replace("%", ""));
                        return <td key={j} style={{ padding: "8px", textAlign: "right", fontWeight: 700, fontSize: 13, color: !isNaN(num) && num < 0 ? "#d12b2b" : "#0B6623", borderBottom: "1px solid #eee", verticalAlign: "top" }}>{v}</td>;
                      }

                      // CASE 3: Secondary Money Columns (Render MoneyFmt only) - FIX ADDED HERE
                      if (moneyColumnIndexes.has(j) && numericValue !== null) {
                        return <td key={j} style={{ padding: "8px", textAlign: "right", fontSize: 13, color: "#333", borderBottom: "1px solid #eee", verticalAlign: "top" }}>{moneyFmt(numericValue)}</td>
                      }

                      // CASE 4: Standard Number Columns (Render NumberFmt)
                      if (numberColumnIndexes.has(j) && numericValue !== null) {
                        return <td key={j} style={{ padding: "8px", textAlign: "right", fontSize: 13, color: "#333", borderBottom: "1px solid #eee", verticalAlign: "top" }}>{numberFmt(numericValue)}</td>
                      }

                      // Case 4: Text/Generic - Wrapped with Line Clamp
                      return (
                        <td key={j} style={{ padding: "8px", borderBottom: "1px solid #eee", verticalAlign: "top" }} title={String(v)}>
                          <div style={{ ...lineClampStyle, fontSize: 13, color: "#333" }}>
                            {v}
                          </div>
                        </td>
                      );
                    })}
                    {(() => {
                      const key = row[keyColIndex];
                      const currVal = Number(String(row[valueColIndex]).replace(/[,₹$]/g, "")) || 0;
                      const rawPrev = prevMap.get(key);
                      const prevVal = Number.isFinite(rawPrev) ? rawPrev : null;
                      const deltaVal = prevVal == null ? null : currVal - prevVal;
                      const deltaPct = prevVal == null || prevVal === 0 ? null : (deltaVal / prevVal) * 100;
                      if (deltaVal === 0 || deltaVal == null || deltaPct == 0 || deltaPct == null) {
                        return <td style={{ padding: "6px", textAlign: "right", fontWeight: 700, fontSize: 13, color: "#999", borderBottom: "1px solid #eee", verticalAlign: "top" }}>–</td>;
                      }
                      return <td style={{ padding: "6px", textAlign: "right", fontWeight: 700, fontSize: 13, color: deltaPct < 0 ? "#d12b2b" : "#0B6623", whiteSpace: "nowrap", borderBottom: "1px solid #eee", verticalAlign: "top" }}>{deltaPct == null ? "–" : `${deltaPct > 0 ? "+" : ""}${deltaPct.toFixed(1)}%`}</td>;
                    })()}
                  </tr>
                );
              })}
            </tbody>
            {totalRow && (
              <tfoot>
                <tr style={{ background: NGRAPH_THEME.primary, color: "#fff", fontWeight: 700 }}>
                  <td style={{ padding: "8px" }}></td>
                  {safeColumns.map((c, j) => {
                    const v = totalRow[c] ?? totalRow[j] ?? "";
                    const cleaned = String(v).replace(/[,₹$]/g, "");
                    const isNumeric = cleaned !== "" && !isNaN(Number(cleaned));

                    // FIX 1: Primary Value Column - Apply spacing logic
                    if (j === valueColIndex && isNumeric) {
                      return (
                        <td key={j} style={{ padding: "8px", textAlign: "right", whiteSpace: "nowrap", verticalAlign: "top" }}>
                          <div style={{ marginRight: VALUE_BAR_WIDTH + 6 }}>
                            {moneyFmt(Number(cleaned))}
                          </div>
                        </td>
                      );
                    }

                    // FIX 2: Other Money Columns (Standard MoneyFmt)
                    if (moneyColumnIndexes.has(j) && isNumeric) {
                      return <td key={j} style={{ padding: "8px", textAlign: "right", whiteSpace: "nowrap", verticalAlign: "top" }}>{moneyFmt(Number(cleaned))}</td>;
                    }

                    // FIX 3: Number Columns (Standard NumberFmt)
                    if (numberColumnIndexes.has(j) && isNumeric) {
                      return <td key={j} style={{ padding: "8px", textAlign: "right", whiteSpace: "nowrap", verticalAlign: "top" }}>{numberFmt(Number(cleaned))}</td>;
                    }

                    // String Column in Footer - Also Wrapped
                    return (
                      <td key={j} style={{ padding: "8px", textAlign: isNumeric ? "right" : "left", verticalAlign: "top" }}>
                        <div style={{ ...lineClampStyle, color: "#fff" }}>
                          {v}
                        </div>
                      </td>
                    );
                  })}
                  <td style={{ padding: "8px", textAlign: "right", whiteSpace: "nowrap", color: !totalDeltaPercent ? "#fff" : totalDeltaPercent < 0 ? "#ff8888" : "#88ff88", verticalAlign: "top" }}>
                    {totalDeltaPercent === 0 || totalDeltaPercent == null ? "–" : `${totalDeltaPercent > 0 ? "+" : "-"}${totalDeltaPercent.toFixed(1)}%`}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        {pages > 1 && (
          <div style={{ display: "flex", justifyContent: "flex-end", padding: "10px", borderTop: "1px solid #eee", flexShrink: 0 }}>
            <span style={{ marginRight: 12, fontSize: 13, display: "flex", alignItems: "center" }}>{start + 1}–{Math.min(start + TABLE_PAGE_SIZE, total)} of {total}</span>
            <div style={{ display: "flex", gap: 4 }}>
              <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} style={{ padding: "4px 10px", background: "#f3f4f6", border: "1px solid #ddd", borderRadius: 4, cursor: page === 1 ? "not-allowed" : "pointer", opacity: page === 1 ? 0.5 : 1 }}>{"<"}</button>
              <button disabled={page === pages} onClick={() => setPage((p) => p + 1)} style={{ padding: "4px 10px", background: "#f3f4f6", border: "1px solid #ddd", borderRadius: 4, cursor: page === pages ? "not-allowed" : "pointer", opacity: page === pages ? 0.5 : 1 }}>{">"}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ProfessionalMap({ title, data }) {
  const [tooltip, setTooltip] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false); 
  
  const mapRef = useRef(null);
  const width = useWindowWidth();
  const isMobile = width < 768;
  const isSmallMobile = width < 400;
  
  // Standard height for the widget when not fullscreen
  const widgetHeight = isMobile ? 420 : 340;

  // Wrapper Style
  const containerStyle = {
    textAlign: "center",
    marginBottom: "0.75rem",
    height: widgetHeight,
    display: "flex",
    flexDirection: "column"
  };

  if (data == null) return <div style={containerStyle}></div>;
  if (data?.empty) return (
    <div style={containerStyle}>
      <div style={{ height: "100%", border: `2px solid ${NGRAPH_THEME.kpiBorder}`, display: "flex", justifyContent: "center", alignItems: "center" }}>
        No Data for {title}
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
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 0;
  const colorScale = scaleLinear().domain([min, max]).range(["#E9F6FF", "#08306B"]);

  // --- STYLE LOGIC ---
  // When fullscreen, we want fixed positioning covering the screen.
  // We use flex to center the map in the middle of that screen.
  const mapContainerStyle = isFullscreen ? {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    zIndex: 9999,
    background: "#fff",
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    boxSizing: "border-box"
  } : {
    background: "#fff",
    padding: isMobile ? 8 : 12,
    border: `2px solid ${NGRAPH_THEME.kpiBorder}`,
    flex: 1,
    display: "flex",
    flexDirection: "column",
    minHeight: 0,
    position: "relative"
  };

  return (
    <div style={containerStyle}>
      <div style={{ fontWeight: 700, fontSize: 16, color: "#0B3A66", marginBottom: 8, flexShrink: 0 }}>{title}</div>

      <div ref={mapRef} style={mapContainerStyle}>
        
        {/* Fullscreen Toggle Button */}
        <button 
          onClick={() => setIsFullscreen(!isFullscreen)}
          style={{
            position: isFullscreen ? "fixed" : "absolute",
            top: 10,
            left: 10,
            zIndex: 10,
            background: "#fff",
            border: "1px solid #ccc",
            borderRadius: "4px",
            padding: "5px",
            cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
          }}
          title={isFullscreen ? "Close Fullscreen" : "Expand Map"}
        >
          {isFullscreen ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0B3A66" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"></path>
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0B3A66" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"></path>
            </svg>
          )}
        </button>

        {tooltip && (
          <div style={{ position: "absolute", top: tooltip.y, left: Math.min(tooltip.x, width - 150), background: "#fff", padding: "6px 10px", border: "1px solid #dcefff", borderRadius: 4, fontSize: 12, pointerEvents: "none", zIndex: 10, boxShadow: "0 2px 8px rgba(0,0,0,0.15)", textAlign: "left" }}>
            <strong style={{ color: "#0B3A66" }}>{tooltip.state}</strong><br />
            {moneyFmt(tooltip.value)}
          </div>
        )}

        {/* Map Area */}
        {/* We use flex: 1 to fill space, but alignItems center to ensure map doesn't stretch weirdly */}
        <div style={{ flex: 1, width: "100%", minHeight: 0, display: "flex", justifyContent: "center", alignItems: "center", overflow: "hidden" }}>
          
          <ComposableMap 
            projection="geoMercator" 
            // 1. FIXED WIDTH/HEIGHT: This defines the aspect ratio (Taller for India)
            width={600} 
            height={700}
            // 2. FIXED SCALE: 1000 fits perfectly inside a 600x700 box
            projectionConfig={{ scale: 1000, center: [78.9629, 22.5937] }} 
            // 3. RESPONSIVE CSS: object-fit equivalent. "100%" makes it fit the parent container automatically
            style={{ width: "100%", height: "100%", maxHeight: "100%" }}
          >
            <Geographies geography={INDIA_GEOJSON}>
              {({ geographies }) => geographies.map((geo) => {
                const stateName = geo.properties.NAME_1 || geo.properties.name || geo.properties.STATE || "";
                const value = regionData[stateName] || 0;
                return (
                  <Geography key={geo.rsmKey} geography={geo}
                    onMouseEnter={(evt) => {
                      const rect = mapRef.current.getBoundingClientRect();
                      setTooltip({ state: stateName, value, x: evt.clientX - rect.left + 10, y: evt.clientY - rect.top - 10 });
                    }}
                    onMouseLeave={() => setTooltip(null)}
                    style={{ 
                      default: { outline: "none", fill: value > 0 ? colorScale(value) : "#ffffff", stroke: "#666", strokeWidth: 0.5 }, 
                      hover: { outline: "none", fill: value ? colorScale(value) : "#f0f0f0", stroke: "#000", strokeWidth: 1 }, 
                      pressed: { outline: "none", stroke: "#000", strokeWidth: 1 } 
                    }}
                  />
                );
              })}
            </Geographies>
          </ComposableMap>
        </div>

        {/* Legend */}
        <div style={{ marginTop: 10, display: "flex", alignItems: "center", justifyContent: "center", gap: isMobile ? 10 : 20, flexShrink: 0, flexWrap: "wrap" }}>
          <span style={{ fontWeight: 700, color: "#0B3A66", fontSize: isMobile ? 12 : 14 }}>Sales</span>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontWeight: 600, color: "#0B3A66", fontSize: 11 }}>{moneyFmt(min)}</span>
            <div style={{ width: isSmallMobile ? 80 : (isMobile ? 100 : 160), height: 12, background: `linear-gradient(to right, ${colorScale(min)}, ${colorScale(max)})`, border: "1px solid #ccc", borderRadius: 2 }} />
            <span style={{ fontWeight: 600, color: "#0B3A66", fontSize: 11 }}>{moneyFmt(max)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------
   PAGE ROOT
-------------------------------------------------------------------*/

export default function SalesAnalyticsPage({ userId: propUserId }) {
  const { id: routeUserId } = useParams();
  const userId = routeUserId || propUserId || "demo_tenant";
  const windowWidth = useWindowWidth();
  const isMobile = windowWidth < 768;
  const today = new Date();

  // DEFAULT TO LAST MONTH as requested
  const prevMonthDate = subMonths(today, 1);
  const defaultStart = format(startOfMonth(prevMonthDate), "yyyy-MM-dd");
  const defaultEnd = format(endOfMonth(prevMonthDate), "yyyy-MM-dd");

  const [dateRange, setDateRange] = useState({ start: defaultStart, end: defaultEnd });
  const [pendingRange, setPendingRange] = useState({ start: defaultStart, end: defaultEnd });

  const [filters, setFilters] = useState({ client: "All", consignee: "All", agent: "All", product: "All" });

  const navigate = useNavigate();
  const [dataMap, setDataMap] = useState({});
  const [error, setError] = useState(null);
  const [companyLogoUrl, setCompanyLogoUrl] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await api.get("/account/my-profile");
        if (!mounted) return;
        if (res?.data?.companyLogoUrl) { setCompanyLogoUrl(res.data.companyLogoUrl); }
        else { setCompanyLogoUrl(null); }
      } catch (err) { setCompanyLogoUrl(null); }
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!userId) return;
    let cancel = false;
    setError(null);
    setLoading(true);

    Promise.all(COMPONENT_IDS.map((cid) => fetchComponentData(cid, { userId, dateRange, filters })))
      .then((res) => {
        if (cancel) return;
        const obj = {};
        COMPONENT_IDS.forEach((cid, i) => { obj[cid] = res[i] || { data: null }; });
        setDataMap(obj);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load components");
        setLoading(false);
      });
    return () => { cancel = true; };
  }, [userId, dateRange.start, dateRange.end, filters.client, filters.consignee, filters.agent, filters.product]);

  const kpiItems = [
    dataMap.sa_kpi_clients?.data, dataMap.sa_kpi_agents?.data, dataMap.sa_kpi_invoices?.data,
    dataMap.sa_kpi_sales?.data, dataMap.sa_kpi_qty?.data, dataMap.sa_kpi_rate?.data,
  ].filter(Boolean);

  const filterOptions = {
    sa_filter_client: { values: dataMap.sa_filter_client?.data?.values || [], title: "Client" },
    sa_filter_consignee: { values: dataMap.sa_filter_consignee?.data?.values || [], title: "Consignee" },
    sa_filter_agent: { values: dataMap.sa_filter_agent?.data?.values || [], title: "Agent" },
    sa_filter_product: { values: dataMap.sa_filter_product?.data?.values || [], title: "Product" },
  };

  const anyFilterVisible = (dataMap.sa_filter_client?.data?.values?.length ?? 0) > 0 || (dataMap.sa_filter_consignee?.data?.values?.length ?? 0) > 0 || (dataMap.sa_filter_agent?.data?.values?.length ?? 0) > 0 || (dataMap.sa_filter_product?.data?.values?.length ?? 0) > 0;

  function resetDateRange() {
    setPendingRange({
      start: defaultStart,
      end: defaultEnd,
    });
    setDateRange({
      start: defaultStart,
      end: defaultEnd,
    });
  }

  function handleApply() {
    setDateRange(pendingRange);
  }

  return (
    <div style={{ padding: 0, fontFamily: "Tahoma, sans-serif", background: NGRAPH_THEME.background, maxWidth: "100%", minWidth: "320px", margin: "0 auto" }}>
      <div style={{ position: "sticky", top: "96px", zIndex: 90, background: NGRAPH_THEME.header }}>
        <Header companyLogoUrl={companyLogoUrl} />
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: isMobile ? "0.75rem 1rem" : "0.75rem 1.25rem",
          background: NGRAPH_THEME.primarySoft,
          borderBottom: `2px solid ${NGRAPH_THEME.kpiBorder}`,
          flexWrap: "wrap",
          gap: "1rem"
        }}>

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
              flexShrink: 0
            }}
          >
            ← Back
          </button>

          <div style={{
            display: "flex",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "0.5rem",
            flex: "1 1 auto",
            justifyContent: isMobile ? "flex-start" : "flex-end", // Align right on desktop
            width: isMobile ? "100%" : "auto"
          }}>

            {/* Date Picker Grows to fill space on mobile */}
            <div style={{ flex: isMobile ? "1 1 100%" : "0 1 auto" }}>
              <AdvancedDatePicker
                value={pendingRange}
                onChange={setPendingRange}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', flex: isMobile ? "1 1 100%" : "0 1 auto" }}>
              <button
                onClick={handleApply}
                style={{
                  flex: 1, // Equal width buttons on mobile
                  padding: "0.375rem 0.75rem",
                  background: NGRAPH_THEME.accent,
                  color: "white",
                  borderRadius: 6,
                  border: "none",
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: 700,
                  whiteSpace: "nowrap"
                }}
              >
                Apply
              </button>

              <button
                onClick={resetDateRange}
                style={{
                  flex: 1, // Equal width buttons on mobile
                  padding: "0.375rem 0.75rem",
                  background: "#A1A1A1",
                  color: "white",
                  borderRadius: 6,
                  border: "none",
                  cursor: "pointer",
                  fontWeight: 600,
                  whiteSpace: "nowrap"
                }}
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div style={{ color: "#a31b1b", margin: "12px", textAlign: "center" }}>{error}</div>
      )}

      <div
        style={{
          padding: isMobile ? "1rem" : "1.25rem",
          width: "100%",
          boxSizing: "border-box"
        }}
      >
        <KpiGrid items={kpiItems} />
      </div>

      {/* Filter Section */}
      {anyFilterVisible && (
        <div style={{ padding: isMobile ? "0.75rem" : "1.25rem" }}>
          <FiltersRow filters={filters} options={filterOptions} onChange={setFilters} />
        </div>
      )}

      {/* ROW 1: Donut Charts 
    Logic: Uses auto-fit. If 1 exists, it takes 100%. If 3 exist, they take 33% each.
*/}
      <div
        style={{
          padding: isMobile ? "0.75rem" : "1.25rem",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: isMobile ? "1rem" : "2.50rem",
          width: "100%",
          boxSizing: "border-box"
        }}
      >
        {/* Check if data exists before rendering */}
        {dataMap.sa_pie_branch?.data && (
          <DonutWidget
            title={dataMap.sa_pie_branch?.title || "Branch-wise Sales"}
            data={dataMap.sa_pie_branch?.data}
          />
        )}
        {dataMap.sa_pie_costcenter?.data && (
          <DonutWidget
            title={dataMap.sa_pie_costcenter?.title || "Cost Center-wise Sales"}
            data={dataMap.sa_pie_costcenter?.data}
          />
        )}
        {dataMap.sa_pie_channel?.data && (
          <DonutWidget
            title={dataMap.sa_pie_channel?.title || "Channel-wise Sales"}
            data={dataMap.sa_pie_channel?.data}
          />
        )}
      </div>

      {/* ROW 2: Line Area & Map 
    Logic: Previously 'repeat(2, 1fr)'. Changed to 'auto-fit' with a larger min-width (500px).
    If one is hidden, the other expands. On small laptops, they might wrap to stack vertically (good for readability).
*/}
      <div style={{
        padding: isMobile ? "0.75rem" : "1.25rem",
        display: "grid",
        // 500px min-width ensures map/line chart aren't squashed before wrapping
        gridTemplateColumns: isMobile
          ? "1fr"
          : "repeat(auto-fit, minmax(min(100%, 500px), 1fr))",
        gap: isMobile ? "1rem" : "2.50rem",
        marginTop: isMobile ? "0" : "0.75rem"
      }}>
        {dataMap.sa_line_sales_qty?.data && (
          <LineAreaWidget
            title={dataMap.sa_line_sales_qty?.title || "Monthly Sales <> Qty"}
            data={dataMap.sa_line_sales_qty?.data}
          />
        )}
        {dataMap.sa_map_sales?.data && (
          <ProfessionalMap
            title={dataMap.sa_map_sales?.title || "Location-wise Sales"}
            data={dataMap.sa_map_sales?.data}
          />
        )}
      </div>

      {/* ROW 3: Tables (Book, Category, Product) */}
      <div
        style={{
          padding: isMobile ? "0.75rem" : "1.25rem",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: isMobile ? "1rem" : "2.50rem",
          marginTop: "0.75rem",
          boxSizing: "border-box"
        }}
      >
        {dataMap.sa_table_book?.data && (
          <TableWidget
            title={dataMap.sa_table_book?.title || "Book-wise Sales"}
            data={dataMap.sa_table_book?.data}
          />
        )}
        {dataMap.sa_table_category?.data && (
          <TableWidget
            title={dataMap.sa_table_category?.title || "Category-wise Sales"}
            data={dataMap.sa_table_category?.data}
          />
        )}
        {dataMap.sa_table_product?.data && (
          <TableWidget
            title={dataMap.sa_table_product?.title || "Product-wise Sales"}
            data={dataMap.sa_table_product?.data}
          />
        )}
      </div>

      {/* ROW 4: Tables (Client, Delivery, Agent) */}
      <div
        style={{
          padding: isMobile ? "0.75rem" : "1.25rem",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: isMobile ? "1rem" : "2.50rem",
          marginBottom: "0.75rem",
          boxSizing: "border-box"
        }}
      >
        {dataMap.sa_table_client?.data && (
          <TableWidget
            title={dataMap.sa_table_client?.title || "Client-wise Sales"}
            data={dataMap.sa_table_client?.data}
          />
        )}
        {dataMap.sa_table_delivery?.data && (
          <TableWidget
            title={dataMap.sa_table_delivery?.title || "Delivery-wise Sales"}
            data={dataMap.sa_table_delivery?.data}
          />
        )}
        {dataMap.sa_table_agent?.data && (
          <TableWidget
            title={dataMap.sa_table_agent?.title || "Agent-wise Sales"}
            data={dataMap.sa_table_agent?.data}
          />
        )}
      </div>

      {loading && (<div style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", background: "rgba(255,255,255,0.6)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 9999, backdropFilter: "blur(2px)" }}><div style={{ width: 40, height: 40, border: "4px solid #cbdaf5", borderTopColor: NGRAPH_THEME.primary, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} /></div>)}
    </div>
  );
}