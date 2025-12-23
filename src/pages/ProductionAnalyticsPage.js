// src/pages/ProductionAnalyticsPage.jsx
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
    "pa_kpi_grossproduction",
    "pa_kpi_netproduction",
    "pa_kpi_grade",
    "pa_kpi_machines",
    "pa_kpi_items",
    "pa_kpi_lots",

    "pa_pie_production",
    "pa_line_month",
    "pa_pie_grade",

    "pa_table_machine",
    "pa_table_item",
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

function formatDateFull(d) {
    if (!d) return "";
    try {
        return format(parseISO(d), "d MMM, yyyy");
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
async function postExecuteProductionComponent(userId, body) {
    try {
        const res = await api.post(
            `/productionmodules/execute/${encodeURIComponent(userId)}`,
            body,
            { headers: { "Content-Type": "application/json" } }
        );
        return res.data;
    } catch (err) {
        console.warn("execute-production-component error", err);
        return null;
    }
}

/* ------------------------------------------------------------------
   COMPONENT DATA FETCHER (WITH FIXED LINE CHART LOGIC)
-------------------------------------------------------------------*/

async function fetchComponentData(componentId, { userId, dateRange }) {
    const startISO = dateRange.start ? `${dateRange.start}T00:00:00` : null;
    const endISO = dateRange.end ? `${dateRange.end}T23:59:59` : null;

    /* ----------------------------------------------
       FIXED LINE CHART LOGIC
    ------------------------------------------------*/
    if (componentId === "pa_line_month") {
        try {
            const start = dateRange.start ? parseISO(dateRange.start) : null;
            const end = dateRange.end ? parseISO(dateRange.end) : null;
            if (!start || !end) return { datasource: "db", data: null };

            const days = differenceInCalendarDays(end, start) + 1;

            // Correct previous period shift
            const prevEnd = subDays(start, 1);
            const prevStart = subDays(prevEnd, days - 1);

            const common = {
                componentId
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

            const curr = await postExecuteProductionComponent(userId, currentBody);
            const prev = await postExecuteProductionComponent(userId, previousBody);

            const normalizeLine = (res) => {
                if (!Array.isArray(res?.data)) return [];

                const rows = res.data;
                if (!rows.length) return [];

                const sample = rows[0];
                const keys = Object.keys(sample);

                // 1️⃣ Detect date / label column
                const dateKey =
                    keys.find(k =>
                        typeof sample[k] === "string" &&
                        !isNaN(Date.parse(sample[k]))
                    )
                    || keys.find(k => k.toLowerCase().includes("date"))
                    || keys.find(k => k.toLowerCase().includes("month"))
                    || keys.find(k => k.toLowerCase().includes("label"))
                    || keys[0];

                // 2️⃣ Detect ALL numeric metrics
                const metricKeys = keys.filter(
                    k => k !== dateKey && typeof sample[k] === "number"
                );

                return rows.map(r => {
                    const row = {
                        x: r[dateKey],
                        realCurrDate: r[dateKey]
                    };

                    metricKeys.forEach(k => {
                        row[k] = Number(r[k]) || 0;
                    });

                    return row;
                });
            };

            const current = normalizeLine(curr);
            const previous = normalizeLine(prev);

            if (!current.length && !previous.length) {
                return {
                    datasource: "db",
                    data: { empty: true },
                    title: curr?.title || "Month-wise Production"
                };
            }
            return {
                datasource: "db",
                data: { current, previous },
                title: curr?.title || "Month-wise Production"
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
            endDate: endISO
        };

        const res = await postExecuteProductionComponent(userId, body);
        if (!res?.success || res.data == null)
            return { datasource: "db", data: null };

        const rows = Array.isArray(res.data)
            ? res.data
            : typeof res.data === "object"
                ? [res.data]
                : [];

        // PIE
        if (
            componentId === "pa_pie_production" ||
            componentId === "pa_pie_grade"
        ) {
            const pie = normalizeToPie(rows);
            if (!pie.items.length) {
                return {
                    datasource: "db",
                    data: { empty: true },
                    title: res.title
                };
            }

            return {
                datasource: "db",
                data: pie,
                title: res.title
            };
        }

        // TABLE (WITH PREVIOUS PERIOD)
        if (componentId.startsWith("pa_table_")) {
            const prev = getPreviousRange(dateRange.start, dateRange.end);

            const prevRes = await postExecuteProductionComponent(userId, {
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

        // KPI
        if (componentId.startsWith("pa_kpi_")) {
            const prev = getPreviousRange(dateRange.start, dateRange.end);

            // CURRENT
            const currRes = await postExecuteProductionComponent(userId, {
                componentId,
                startDate: startISO,
                endDate: endISO
            });

            // PREVIOUS
            const prevRes = await postExecuteProductionComponent(userId, {
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
   UI COMPONENTS (Header, KPI, Donut, Lin, Table)
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
                Production Analytics
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

const DONUT_COLORS = [
    "#2B6CB0",
    "#1E90FF",
    "#60A5FA",
    "#93C5FD",
    "#BEE3F8",
    "#E6F0FB",
];

function DonutWidget({ title, data }) {
  // --- STATE: Track Fullscreen Mode ---
  const [isFullscreen, setIsFullscreen] = useState(false);

  const width = useWindowWidth();
  const isMobile = width < 768;
  const getWidgetHeight = (isMobile) => (isMobile ? 420 : 340);
  const widgetHeight = getWidgetHeight(isMobile);

  // --- DATA PROCESSING ---
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

  // --- HELPERS ---
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

  // --- STYLES ---

  // 1. Placeholder Container
  const containerStyle = {
    textAlign: "center",
    marginBottom: "0.75rem",
    minHeight: widgetHeight,
    display: "flex",
    flexDirection: "column",
  };

  // 2. Main Box Frame (Switches between Widget and Fullscreen)
  const boxStyle = isFullscreen ? {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    zIndex: 9999, // High z-index to cover everything
    background: "#fff",
    padding: "20px",
    display: "flex",
    flexDirection: "column", // Stack Title on top of Content
    boxSizing: "border-box",
    overflow: "hidden" 
  } : {
    background: "#fff",
    border: `2px solid ${NGRAPH_THEME.kpiBorder}`,
    padding: "0.75rem",
    flex: 1,
    minHeight: 0,
    display: "flex",
    flexDirection: "column", // Consistent layout
    overflow: "hidden",
    position: "relative"
  };

  // 3. Inner Content Wrapper (Holds Chart + Legend side-by-side)
  const innerContentStyle = {
    display: "flex",
    flexDirection: isMobile ? "column" : "row",
    alignItems: "center",
    flex: 1, // Fill remaining space below title
    width: "100%",
    minHeight: 0,
    overflow: "hidden" 
  };

  if (data == null) return <div style={containerStyle}></div>;
  if (data?.empty || !finalItems.length)
    return (
      <div style={containerStyle}>
        <NoDataWidget title={title} />
      </div>
    );

  return (
    <div style={containerStyle}>
      
      {/* --- 1. NORMAL TITLE (Click to OPEN) --- */}
      {!isFullscreen && (
        <div 
          onClick={() => setIsFullscreen(true)}
          style={{ 
            fontWeight: 700, 
            fontSize: "1rem", 
            color: "#0B3A66", 
            marginBottom: "0.5rem", 
            flexShrink: 0,
            cursor: "pointer" // Indicates clickable
          }}
        >
          {title}
        </div>
      )}

      {/* --- Main Box --- */}
      <div style={boxStyle}>

        {/* --- CHANGE: Expand/Close Button (Icon Only) --- */}
        <button 
          onClick={() => setIsFullscreen(!isFullscreen)}
          style={{
            position: "absolute",
            top: 10,
            left: 10,
            zIndex: 10,
            background: "#fff",
            border: "1px solid #ccc",
            borderRadius: "4px",
            padding: "6px", // Square padding
            cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#0B3A66",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
          }}
          title={isFullscreen ? "Close Fullscreen" : "Expand Widget"}
        >
          {isFullscreen ? (
            // Close Icon
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"></path></svg>
          ) : (
            // Expand Icon
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"></path></svg>
          )}
        </button>

        {/* --- 2. FULLSCREEN TITLE (Click to CLOSE) --- */}
        {isFullscreen && (
          <div 
            onClick={() => setIsFullscreen(false)}
            style={{
              textAlign: "center",
              width: "100%",
              fontSize: 22,
              fontWeight: 700,
              color: "#0B3A66",
              marginBottom: 20,
              marginTop: 10,
              flexShrink: 0,
              cursor: "pointer"
            }}
          >
            {title}
          </div>
        )}

        {/* --- Inner Content (Chart + Legend) --- */}
        <div style={innerContentStyle}>
          
          {/* DONUT CHART AREA */}
          <div style={{
            width: isMobile ? "100%" : "55%",
            height: isMobile ? "50%" : "100%",
            marginBottom: isMobile ? 12 : 0,
            flexShrink: 0,
            padding: isFullscreen ? "0 20px" : "0"
          }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={finalItems}
                  dataKey="value"
                  cx="50%"
                  cy="50%"
                  // Make chart bigger in fullscreen
                  outerRadius={isFullscreen ? (isMobile ? 120 : 200) : (isMobile ? 70 : 85)}
                  innerRadius={isFullscreen ? (isMobile ? 60 : 100) : (isMobile ? 30 : 40)}
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
            justifyContent: isMobile ? "flex-start" : "center",
            gap: 8,
            overflowY: "auto",
            paddingLeft: isMobile ? 0 : 10,
            borderTop: isMobile ? "1px solid #eee" : "none",
            paddingTop: isMobile ? 12 : 0,
            paddingRight: isFullscreen ? "20px" : "0"
          }}>
            {finalItems.map((it, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: it.isOthers ? "#CBD5E1" : DONUT_COLORS[i % DONUT_COLORS.length], flexShrink: 0 }} />
                <div style={{ color: "#0B3A66", fontSize: isFullscreen ? 16 : 13, flex: 1, textAlign: "left", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {isFullscreen ? it.label : truncateLabel(it.label)}
                </div>
                {(isMobile || isFullscreen) && <div style={{ fontSize: isFullscreen ? 14 : 12, fontWeight: 600, color: "#555" }}>{it.percentage.toFixed(0)}%</div>}
              </div>
            ))}
          </div>

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

function detectMetricKeys(data) {
    if (!data?.current?.length) return [];

    const row = data.current[0];
    return Object.keys(row).filter(
        (k) => k !== "Label" && k !== "x" && typeof row[k] === "number"
    );
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
    const hasPrevData = Array.isArray(prevData) && prevData.length > 0;

    // Build metric map from payload (current always exists)
    const metrics = payload.reduce((acc, p) => {
        const isPrev = p.dataKey.startsWith("prev");
        const baseKey = isPrev ? p.dataKey.replace(/^prev/, "") : p.dataKey;

        if (!acc[baseKey]) {
            acc[baseKey] = {
                color: p.color,
                hasCurrent: false,
                hasPrevious: false
            };
        }

        if (isPrev) acc[baseKey].hasPrevious = true;
        else acc[baseKey].hasCurrent = true;

        return acc;
    }, {});

    return (
        <ul
            style={{
                display: "flex",
                justifyContent: "center",
                flexWrap: "wrap",
                gap: "8px 24px",
                listStyle: "none",
                padding: 0,
                margin: 0
            }}
        >
            {Object.entries(metrics).map(([key, meta]) => (
                <React.Fragment key={key}>
                    {/* CURRENT */}
                    <li
                        style={{
                            display: "grid",
                            gridTemplateColumns: "16px minmax(0, 1fr)",
                            alignItems: "center",
                            gap: 8,
                            maxWidth: 320,
                            fontSize: 12,
                            color: "#1f2937"
                        }}
                    >
                        <span
                            style={{
                                width: 16,
                                height: 4,
                                background: meta.color,
                                borderRadius: 2,
                                position: "relative",
                                display: "inline-block"
                            }}
                        >
                            <span
                                style={{
                                    position: "absolute",
                                    left: "50%",
                                    top: "50%",
                                    width: 6,
                                    height: 6,
                                    borderRadius: "50%",
                                    background: meta.color,
                                    transform: "translate(-50%, -50%)"
                                }}
                            />
                        </span>
                        <span
                            style={{
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis"
                            }}
                            title={prettify(key)}
                        >
                            {prettify(key)}
                        </span>
                    </li>

                    {/* PREVIOUS (only if previous data exists) */}
                    {hasPrevData && (
                        <li
                            style={{
                                display: "grid",
                                gridTemplateColumns: "16px minmax(0, 1fr)",
                                alignItems: "center",
                                gap: 8,
                                maxWidth: 320,
                                fontSize: 12,
                                color: "#1f2937",
                                opacity: meta.hasPrevious ? 1 : 0.4
                            }}
                        >
                            <span
                                style={{
                                    width: 16,
                                    height: 4,
                                    background: meta.color,
                                    borderRadius: 2,
                                    opacity: 0.4,
                                    position: "relative",
                                    display: "inline-block"
                                }}
                            >
                                <span
                                    style={{
                                        position: "absolute",
                                        left: "50%",
                                        top: "50%",
                                        width: 6,
                                        height: 6,
                                        borderRadius: "50%",
                                        background: meta.color,
                                        transform: "translate(-50%, -50%)",
                                        opacity: 0.8
                                    }}
                                />
                            </span>

                            <span
                                style={{
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis"
                                }}
                                title={`${prettify(key)} (${prevRange})`}
                            >
                                {prettify(key)} ({prevRange})
                            </span>
                        </li>
                    )}
                </React.Fragment>
            ))}
        </ul>
    );
}

function LineAreaWidget({ title, data }) {
  // --- STATE: Track Fullscreen Mode ---
  const [isFullscreen, setIsFullscreen] = useState(false);

  const width = useWindowWidth();
  const isMobile = width < 768;
  const getWidgetHeight = (isMobile) => (isMobile ? 420 : 340);
  const widgetHeight = getWidgetHeight(isMobile);
  const metricKeys = detectMetricKeys(data);

  const merged = useMemo(() => {
    const curr = data?.current || [];
    const prev = data?.previous || [];
    if (!curr.length) return [];

    return curr.map((d, i) => {
      const row = {
        x: d.x,
        realCurrDate: d.x,
        realPrevDate: prev[i]?.x,
      };

      metricKeys.forEach((k) => {
        row[k] = d[k] ?? null;
        row[`prev${k}`] = prev[i]?.[k] ?? null;
      });

      return row;
    });
  }, [data, metricKeys]);

  const COLORS = ["#2563eb", "#9333ea", "#10c67aff", "#ea580c", "#084b58ff", "#112d6b"];

  // --- STYLES ---

  // 1. Placeholder Container (Keeps the layout intact)
  const containerStyle = {
    textAlign: "center",
    marginBottom: "0.75rem",
    height: widgetHeight,
    display: "flex",
    flexDirection: "column"
  };

  // 2. Main Box Frame (Switches between Widget and Fullscreen)
  const boxStyle = isFullscreen ? {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    zIndex: 9999, // High z-index to cover everything
    background: "#fff",
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    boxSizing: "border-box",
    overflow: "hidden" 
  } : {
    background: "#fff",
    padding: isMobile ? "8px 4px" : 12,
    border: `2px solid ${NGRAPH_THEME.kpiBorder}`,
    flex: 1,
    display: "flex",
    flexDirection: "column",
    minHeight: 0,
    position: "relative" // Needed for the absolute button
  };

  if (data == null) return <div style={containerStyle}></div>;
  if (data?.empty) return <div style={containerStyle}><NoDataWidget title={title} /></div>;

  return (
    <div style={containerStyle}>
      
      {/* --- 1. NORMAL TITLE (Click to OPEN) --- */}
      {!isFullscreen && (
        <div 
          onClick={() => setIsFullscreen(true)}
          style={{ 
            fontWeight: 700, 
            fontSize: 16, 
            color: "#0B3A66", 
            marginBottom: 8, 
            flexShrink: 0,
            cursor: "pointer" // Indicates clickable
          }}
        >
          {title}
        </div>
      )}

      {/* --- Main Box --- */}
      <div style={boxStyle}>

        {/* --- CHANGE: Expand/Close Button (Icon Only) --- */}
        <button 
          onClick={() => setIsFullscreen(!isFullscreen)}
          style={{
            position: "absolute",
            top: 10,
            left: 10,
            zIndex: 10,
            background: "#fff",
            border: "1px solid #ccc",
            borderRadius: "4px",
            padding: "6px", // Square padding
            cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#0B3A66",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
          }}
          title={isFullscreen ? "Close Fullscreen" : "Expand Widget"}
        >
          {isFullscreen ? (
            // Close Icon
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"></path></svg>
          ) : (
            // Expand Icon
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"></path></svg>
          )}
        </button>

        {/* --- 2. FULLSCREEN TITLE (Click to CLOSE) --- */}
        {isFullscreen && (
          <div 
            onClick={() => setIsFullscreen(false)}
            style={{
              textAlign: "center",
              width: "100%",
              fontSize: 22,
              fontWeight: 700,
              color: "#0B3A66",
              marginBottom: 20,
              marginTop: 10,
              flexShrink: 0,
              cursor: "pointer" // Indicates clickable
            }}
          >
            {title}
          </div>
        )}

        {/* Legend */}
        <div style={{ marginBottom: 8, flexShrink: 0, paddingLeft: isFullscreen ? 0 : 30 }}>
          <CustomLineLegend
            payload={[
              ...metricKeys.flatMap((k, i) => ([
                { dataKey: k, color: COLORS[i % COLORS.length] },
                { dataKey: `prev${k}`, color: COLORS[i % COLORS.length] }
              ]))
            ]}
            prevData={data?.previous}
          />
        </div>

        {/* Chart */}
        <div style={{ flex: 1, minHeight: 0, padding: isFullscreen ? "0 20px" : "0" }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={merged}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e6efff" />

              <XAxis
                dataKey="x"
                tickFormatter={formatDateShort}
                fontSize={11}
              />

              <YAxis
                tickFormatter={(v) => {
                  if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
                  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
                  if (v >= 1e5) return `${(v / 1e5).toFixed(1)}L`;
                  if (v >= 1e3) return `${(v / 1e3).toFixed(0)}K`;
                  return v;
                }}
                fontSize={11}
                width={isMobile ? 40 : 50}
              />

              <ReTooltip
                content={({ payload }) => {
                  if (!payload?.length) return null;

                  const grouped = payload.reduce((acc, p) => {
                    const isPrev = p.dataKey.startsWith("prev");
                    const baseKey = isPrev ? p.dataKey.replace(/^prev/, "") : p.dataKey;

                    acc[baseKey] ??= {};
                    acc[baseKey][isPrev ? "prev" : "curr"] = p;
                    return acc;
                  }, {});

                  return (
                    <div style={{ background: "#fff", padding: 10, border: "1px solid #ddd", borderRadius: 6, boxShadow: "0 2px 10px rgba(0,0,0,0.1)", textAlign: "left", minWidth: 180 }}>
                      {Object.entries(grouped).map(([key, pair]) => (
                        <div key={key} style={{ marginBottom: 10 }}>
                          <div style={{ fontWeight: 700, color: pair.curr?.color || pair.prev?.color }}>{prettify(key)}</div>
                          {pair.curr && <div style={{ color: pair.curr.color, fontWeight: 600, fontSize: 13 }}>● {formatDateShort(pair.curr.payload.realCurrDate)}: {moneyFmt(pair.curr.value)}</div>}
                          {pair.prev && <div style={{ color: pair.prev.color, fontWeight: 600, opacity: 0.7, fontSize: 13 }}>● {formatDateShort(pair.prev.payload.realPrevDate)}: {moneyFmt(pair.prev.value)}</div>}
                        </div>
                      ))}
                    </div>
                  );
                }}
              />

              {metricKeys.map((k, i) => (
                <React.Fragment key={k}>
                  <Line type="monotone" dataKey={k} stroke={COLORS[i % COLORS.length]} strokeWidth={3} dot={{ r: 3, fill: COLORS[i % COLORS.length], stroke: COLORS[i % COLORS.length], strokeWidth: 1 }} />
                  <Line type="monotone" dataKey={`prev${k}`} stroke={COLORS[i % COLORS.length]} strokeOpacity={0.4} strokeWidth={3} dot={{ r: 3, fill: COLORS[i % COLORS.length], fillOpacity: 0.4, stroke: COLORS[i % COLORS.length], strokeOpacity: 0.4, strokeWidth: 1 }} activeDot={{ r: 5 }} />
                </React.Fragment>
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function TableWidget({ title, data }) {
  const [page, setPage] = useState(1);
  // --- CHANGE 1: Add Fullscreen State ---
  const [isFullscreen, setIsFullscreen] = useState(false);

  const width = useWindowWidth();
  const isMobile = width < 768;
  const isMedium = width >= 768 && width <= 1366;

  const getWidgetHeight = (isMobile) => (isMobile ? 420 : 340);
  const widgetHeight = getWidgetHeight(isMobile);

  // --- DIMENSIONS ---
  const VALUE_COL_WIDTH = isMobile ? 110 : (isMedium ? 100 : 120);
  const VALUE_NUMBER_WIDTH = isMobile ? 60 : (isMedium ? 55 : 70);
  const VALUE_BAR_WIDTH = isMobile ? 30 : (isMedium ? 30 : 40);
  const TEXT_COL_WIDTH = isMobile ? 120 : (isMedium ? 100 : 150);

  const safeColumns = Array.isArray(data?.current?.columns) ? data.current.columns : [];
  const safeRows = Array.isArray(data?.current?.rows) ? data.current.rows : [];
  const prevRows = Array.isArray(data?.previous?.rows) ? data.previous.rows : [];
  const dataKey = safeColumns.join(",") + safeRows.length;

  useEffect(() => { setPage(1); }, [dataKey]);

  // --- STYLES ---

  // 1. Placeholder Container
  const containerStyle = {
    marginBottom: "0.75rem",
    display: "flex",
    flexDirection: "column",
    height: widgetHeight,
    width: "100%",
  };

  // 2. Main Box Frame (Switches between Widget and Fullscreen)
  const boxStyle = isFullscreen ? {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    zIndex: 9999, // High z-index
    background: "#fff",
    display: "flex",
    flexDirection: "column",
    padding: "20px",
    boxSizing: "border-box"
  } : {
    background: "#fff",
    border: `2px solid ${NGRAPH_THEME.kpiBorder}`,
    display: "flex",
    flexDirection: "column",
    flex: 1,
    minHeight: 0,
    position: "relative"
  };

  if (data == null) return <div style={containerStyle}></div>;
  if (data.empty || !safeColumns.length) return <div style={containerStyle}><NoDataWidget title={title} /></div>;

  // --- DATA PROCESSING ---
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
  const totalDeltaValue = previousTotal !== 0 ? currentTotal - previousTotal : null;
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
    WebkitLineClamp: 2, 
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "normal",
    wordBreak: "break-word",
    maxWidth: TEXT_COL_WIDTH,
  };

  return (
    <div style={containerStyle}>
      
      {/* --- 1. NORMAL TITLE (Click to OPEN) --- */}
      {!isFullscreen && (
        <div 
          onClick={() => setIsFullscreen(true)}
          style={{ 
            textAlign: "center", 
            fontWeight: 700, 
            fontSize: "1rem", 
            color: "#0B3A66", 
            marginBottom: 8, 
            flexShrink: 0,
            cursor: "pointer" // Indicates clickable
          }}
        >
          {title}
        </div>
      )}

      {/* --- Main Box --- */}
      <div style={boxStyle}>
        
        {/* --- 2. FULLSCREEN TITLE (Click to CLOSE) --- */}
        {isFullscreen && (
          <div 
            onClick={() => setIsFullscreen(false)}
            style={{
              textAlign: "center",
              width: "100%",
              fontSize: 22,
              fontWeight: 700,
              color: "#0B3A66",
              marginBottom: 20,
              marginTop: 10,
              flexShrink: 0,
              cursor: "pointer" // Indicates clickable
            }}
          >
            {title}
          </div>
        )}

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
              tableLayout: safeColumns.length > 4 ? "auto" : "fixed", 
              fontSize: isMedium ? "11px" : "13px"
            }}
          >
            <thead>
              <tr>
                <th style={{ position: "sticky", top: 0, zIndex: 10, width: "40px", padding: "8px", background: NGRAPH_THEME.primary, color: "white", textAlign: "left", fontSize: 13 }}>#</th>
                {[...safeColumns, "Δ", "Δ %"].map((c, idx) => {
                  const isValueCol = idx === valueColIndex + 1;
                  const isDeltaCol = c === "Δ" || c === "Δ %";
                  const isNumeric = moneyColumnIndexes.has(idx) || numberColumnIndexes.has(idx) || isDeltaCol;
                  return (
                    <th key={c} style={{
                      position: "sticky", top: 0, zIndex: 10,
                      textAlign: isDeltaCol || isNumeric ? "right" : "left",
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

                      // CASE 1: Primary Value Column
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

                      // CASE 3: Secondary Money
                      if (moneyColumnIndexes.has(j) && numericValue !== null) {
                        return <td key={j} style={{ padding: "8px", textAlign: "right", fontSize: 13, color: "#333", borderBottom: "1px solid #eee", verticalAlign: "top" }}>{moneyFmt(numericValue)}</td>
                      }

                      // CASE 4: Standard Number
                      if (numberColumnIndexes.has(j) && numericValue !== null) {
                        return <td key={j} style={{ padding: "8px", textAlign: "right", fontSize: 13, color: "#333", borderBottom: "1px solid #eee", verticalAlign: "top" }}>{numberFmt(numericValue)}</td>
                      }

                      // Case 5: Text
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
                      const showDeltaVal = !(deltaVal === 0 || deltaVal == null);
                      const showDeltaPct = !(deltaPct === 0 || deltaPct == null);

                      return (
                        <>
                          <td style={{ padding: "8px", textAlign: "right", fontWeight: 700, fontSize: 13, color: showDeltaVal ? (deltaVal < 0 ? "#d12b2b" : "#0B6623") : "#999", borderBottom: "1px solid #eee", verticalAlign: "top" }}>
                            {showDeltaVal ? `${deltaVal > 0 ? "▲" : "▼"} ${moneyFmt(Math.abs(deltaVal))}` : "–"}
                          </td>
                          <td style={{ padding: "8px", textAlign: "right", fontWeight: 700, fontSize: 13, color: showDeltaPct ? (deltaPct < 0 ? "#d12b2b" : "#0B6623") : "#999", borderBottom: "1px solid #eee", verticalAlign: "top" }}>
                            {showDeltaPct ? `${deltaPct > 0 ? "+" : ""}${deltaPct.toFixed(1)}%` : "–"}
                          </td>
                        </>
                      );
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

                    if (j === valueColIndex && isNumeric) {
                      return (
                        <td key={j} style={{ padding: "8px", textAlign: "right", whiteSpace: "nowrap", verticalAlign: "top" }}>
                          <div style={{ marginRight: VALUE_BAR_WIDTH + 6 }}>{moneyFmt(Number(cleaned))}</div>
                        </td>
                      );
                    }
                    if (moneyColumnIndexes.has(j) && isNumeric) {
                      return <td key={j} style={{ padding: "8px", textAlign: "right", whiteSpace: "nowrap", verticalAlign: "top" }}>{moneyFmt(Number(cleaned))}</td>;
                    }
                    if (numberColumnIndexes.has(j) && isNumeric) {
                      return <td key={j} style={{ padding: "8px", textAlign: "right", whiteSpace: "nowrap", verticalAlign: "top" }}>{numberFmt(Number(cleaned))}</td>;
                    }
                    return (
                      <td key={j} style={{ padding: "8px", textAlign: isNumeric ? "right" : "left", verticalAlign: "top" }}>
                        <div style={{ ...lineClampStyle, color: "#fff" }}>{v}</div>
                      </td>
                    );
                  })}
                  <td style={{ padding: "8px", textAlign: "right", whiteSpace: "nowrap", color: !totalDeltaValue ? "#fff" : totalDeltaValue < 0 ? "#ff8888" : "#88ff88", verticalAlign: "top" }}>
                    {totalDeltaValue === 0 || totalDeltaValue == null ? "–" : `${totalDeltaValue > 0 ? "▲" : "▼"}${moneyFmt(Math.abs(totalDeltaValue))}`}
                  </td>
                  <td style={{ padding: "8px", textAlign: "right", whiteSpace: "nowrap", color: !totalDeltaPercent ? "#fff" : totalDeltaPercent < 0 ? "#ff8888" : "#88ff88", verticalAlign: "top" }}>
                    {totalDeltaPercent === 0 || totalDeltaPercent == null ? "–" : `${totalDeltaPercent > 0 ? "+" : "-"}${totalDeltaPercent.toFixed(1)}%`}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* --- FOOTER (Always visible to hold Expand Button) --- */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px", borderTop: "1px solid #eee", flexShrink: 0, background: "#fff" }}>
          
          {/* LEFT: Expand/Collapse Button (Symbolic) */}
          <button 
            onClick={() => setIsFullscreen(!isFullscreen)}
            style={{
              background: "#fff",
              border: "1px solid #ccc",
              borderRadius: "4px",
              padding: "6px",
              cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#0B3A66",
              boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
            }}
            title={isFullscreen ? "Close Fullscreen" : "Expand Table"}
          >
            {isFullscreen ? (
               // Close Icon
               <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"></path></svg>
            ) : (
               // Expand Icon
               <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"></path></svg>
            )}
          </button>

          {/* RIGHT: Pagination (Only if pages > 1) */}
          {pages > 1 ? (
            <div style={{ display: "flex", alignItems: "center" }}>
              <span style={{ marginRight: 12, fontSize: 13 }}>{start + 1}–{Math.min(start + TABLE_PAGE_SIZE, total)} of {total}</span>
              <div style={{ display: "flex", gap: 4 }}>
                <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} style={{ padding: "4px 10px", background: "#f3f4f6", border: "1px solid #ddd", borderRadius: 4, cursor: page === 1 ? "not-allowed" : "pointer", opacity: page === 1 ? 0.5 : 1 }}>{"<"}</button>
                <button disabled={page === pages} onClick={() => setPage((p) => p + 1)} style={{ padding: "4px 10px", background: "#f3f4f6", border: "1px solid #ddd", borderRadius: 4, cursor: page === pages ? "not-allowed" : "pointer", opacity: page === pages ? 0.5 : 1 }}>{">"}</button> 
              </div>
            </div>
          ) : (
            <div /> // Spacer
          )}
        </div>

      </div>
    </div>
  );
}


/* ------------------------------------------------------------------
   PAGE ROOT
-------------------------------------------------------------------*/

export default function ProductionAnalyticsPage({ userId: propUserId }) {
    const { id: routeUserId } = useParams();
    const userId = routeUserId || propUserId || "demo_tenant";
    const windowWidth = useWindowWidth();
    const isMobile = windowWidth < 768;
    const today = new Date();
    const prevMonth = subMonths(today, 1);
    const defaultStart = format(startOfMonth(prevMonth), "yyyy-MM-dd");
    const defaultEnd = format(endOfMonth(prevMonth), "yyyy-MM-dd");

    const [dateRange, setDateRange] = useState({
        start: defaultStart,
        end: defaultEnd,
    });

    const [pendingRange, setPendingRange] = useState({
        start: defaultStart,
        end: defaultEnd,
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
                fetchComponentData(cid, { userId, dateRange })
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
    ]);

    const kpiItems = [
        dataMap.pa_kpi_grossproduction?.data,
        dataMap.pa_kpi_netproduction?.data,
        dataMap.pa_kpi_grade?.data,
        dataMap.pa_kpi_machines?.data,
        dataMap.pa_kpi_items?.data,
        dataMap.pa_kpi_lots?.data,
    ].filter(Boolean);

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

            {/* KPI sections remain responsive due to internal grid logic */}
            <div
                style={{
                    padding: isMobile ? "1rem" : "1.25rem",
                    width: "100%",
                    boxSizing: "border-box"
                }}
            >
                <KpiGrid items={kpiItems} />
            </div>

            {/* DONUT AND LINE CHART WIDGETS SECTION */}
            <div
                style={{
                    padding: isMobile ? "0.75rem" : "1.25rem",
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                    gap: isMobile ? "1rem" : "2.50rem",
                    width: "100%",
                    boxSizing: "border-box"
                }}
            >
                {dataMap.pa_pie_production?.data && (
                    <DonutWidget
                        title={dataMap.pa_pie_production?.title || "Branch-wise Sales"}
                        data={dataMap.pa_pie_production?.data}
                    />
                )}

                {dataMap.pa_line_month?.data && (
                    <LineAreaWidget
                        title={dataMap.pa_line_month?.title || "Monthly Sales <> Qty"}
                        data={dataMap.pa_line_month?.data}
                    />
                )}

                {dataMap.pa_pie_grade?.data && (
                    <DonutWidget
                        title={dataMap.pa_pie_grade?.title || "Cost Center-wise Sales"}
                        data={dataMap.pa_pie_grade?.data}
                    />
                )}
            </div>

            {/* TABLE WIDGETS */}
            <div
                style={{
                    padding: isMobile ? "0.75rem" : "1.25rem",
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                    gap: isMobile ? "1rem" : "2.50rem",
                    width: "100%",
                    boxSizing: "border-box"
                }}
            >
                {dataMap.pa_table_machine?.data && (
                    <TableWidget
                        title={dataMap.pa_table_machine?.title || "Book-wise Sales"}
                        data={dataMap.pa_table_machine?.data}
                    />
                )}

                {dataMap.pa_table_item?.data && (
                    <TableWidget
                        title={dataMap.pa_table_item?.title || "Category-wise Sales"}
                        data={dataMap.pa_table_item?.data}
                    />
                )}
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