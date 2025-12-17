// src/pages/FinanceAnalyticsPage.jsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import {
    PieChart, Pie, Cell, Tooltip as ReTooltip, ResponsiveContainer,
    BarChart, Bar, LabelList, XAxis, YAxis, CartesianGrid, Legend, Line, Customized, LineChart
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
    "fa_line_debttoequity",
    "fa_bar_debtandequity",
    "fa_table_debt",

    "fa_line_cashturnoverratio",
    "fa_bar_salesvscashandbank",
    "fa_table_cashandbank",

    "fa_line_faturnoverratio",
    "fa_bar_salesvsfixedassets",
    "fa_table_fixedassets",

    "fa_line_debtors",
    "fa_bar_debtorsvssales",
    "fa_table_debtors",

    "fa_line_creditors",
    "fa_bar_creditorsvspurchase",
    "fa_table_creditors",

    "fa_line_commission",
    "fa_bar_commissionandcreditors",
    "fa_table_creditorscommission"
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

function barmoneyFmt(v) {
    if (v === null || v === undefined) return "-";
    const n = Number(v);
    if (!Number.isFinite(n)) return String(v);

    const sign = n < 0 ? "-" : "";
    const absN = Math.abs(n);

    const fmt = (num) => {
        return Number(num.toFixed(2)).toString();
    };

    // Billion
    if (absN >= 1e9) return `${sign}₹${fmt(absN / 1e9)}B`;

    // Million
    if (absN >= 1e6) return `${sign}₹${fmt(absN / 1e6)}M`;

    // Lakh (100,000)
    if (absN >= 1e5) return `${sign}₹${fmt(absN / 1e5)}L`;

    // Thousand (1,000)
    if (absN >= 1e3) return `${sign}₹${fmt(absN / 1e3)}K`;

    // Indian formatting for < 1,000
    return `${sign}₹${absN.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
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

/* ------------------------------------------------------------------
   API CALL
-------------------------------------------------------------------*/
async function postExecuteFinanceComponent(userId, body) {
    try {
        const res = await api.post(
            `/financemodules/execute/${encodeURIComponent(userId)}`,
            body,
            { headers: { "Content-Type": "application/json" } }
        );
        return res.data;
    } catch (err) {
        console.warn("execute-finance-component error", err);
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
    if (componentId.startsWith("fa_line_")) {
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

            const curr = await postExecuteFinanceComponent(userId, currentBody);
            const prev = await postExecuteFinanceComponent(userId, previousBody);

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

            if (!current.length && !previous.length) {
                return {
                    datasource: "db",
                    data: { empty: true },
                    title: curr?.title || "Month-wise Finance"
                };
            }
            return {
                datasource: "db",
                data: { current, previous },
                title: curr?.title || "Month-wise Finance"
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

        const res = await postExecuteFinanceComponent(userId, body);
        if (!res?.success || res.data == null)
            return { datasource: "db", data: null };

        const rows = Array.isArray(res.data)
            ? res.data
            : typeof res.data === "object"
                ? [res.data]
                : [];

        // PIE
        if (componentId.startsWith("fa_pie_")) {
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

        // BAR
        if (componentId.startsWith("fa_bar_")) {
            const bars = Array.isArray(rows)
                ? rows.map((r) => {
                    const obj = {};

                    // label detection
                    const keys = Object.keys(r);
                    obj.label =
                        r.label ||
                        r.month ||
                        r.date ||
                        r.period ||
                        r[keys.find((k) => typeof r[k] === "string")] ||
                        "Label";

                    // detect numeric columns properly
                    const numericCols = keys.filter((k) => {
                        const clean = String(r[k]).replace(/[,₹$]/g, "");
                        return !isNaN(Number(clean));
                    });

                    // add ONLY existing numeric fields
                    numericCols.forEach((col) => {
                        obj[col] = Number(r[col]);
                    });

                    return obj;
                })
                : [];

            // After building `bars`
            let hasNumeric = false;
            if (bars.length) {
                const keys = Object.keys(bars[0]);
                for (let k of keys) {
                    if (k !== "label") {
                        const clean = String(bars[0][k]).replace(/[,₹$]/g, "");
                        if (!isNaN(Number(clean))) {
                            hasNumeric = true;
                            break;
                        }
                    }
                }
            }

            if (!bars.length || !hasNumeric) {
                return {
                    datasource: "db",
                    data: { empty: true },
                    title: res.title,
                };
            }

            return {
                datasource: "db",
                data: bars,
                title: res.title,
            };

        }

        // TABLE
        if (componentId.startsWith("fa_table_")) {
            const prev = getPreviousRange(dateRange.start, dateRange.end);

            const prevRes = await postExecuteFinanceComponent(userId, {
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

        return { datasource: "db", data: rows };
    } catch (err) {
        console.warn("component fetch error", err);
        return { datasource: "db", data: null };
    }
}

/* ------------------------------------------------------------------
   UI COMPONENTS (Header, Donut, Line, Table)
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
                Finance Analytics
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
                            "This Month", "Last Month", "This Year"
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

const DONUT_COLORS = [
    "#2B6CB0",
    "#1E90FF",
    "#60A5FA",
    "#93C5FD",
    "#BEE3F8",
    "#E6F0FB",
];

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


function BarChartWidget({ title, data }) {
    const width = useWindowWidth();
    const isMobile = width < 768;
    const getWidgetHeight = (isMobile) => (isMobile ? 420 : 340);
    const widgetHeight = getWidgetHeight(isMobile);
    if (data == null) return null;
    if (data.empty) {
        return <NoDataWidget title={title} />;
    }

    const rows = Array.isArray(data) ? data : [];
    const hasData = rows.length > 0;

    // detect numeric columns
    const numericKeys = [];
    if (hasData) {
        const sample = rows[0];
        Object.keys(sample).forEach((k) => {
            const clean = String(sample[k]).replace(/[,₹$]/g, "");
            if (!isNaN(Number(clean)) && k !== "label") numericKeys.push(k);
        });
    }

    const renderInsideBarLabel = (props) => {
        const { x, y, width, height, value } = props;
        if (value == null) return null;

        const label = barmoneyFmt(value);
        const fits = width > label.length * 8;

        return (
            <text
                x={x + width / 2}
                y={y + height / 2}
                fill="#fff"
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={14}
                fontWeight={600}
                transform={
                    fits ? undefined :
                        `rotate(-90, ${x + width / 2}, ${y + height / 2})`
                }
            >
                {label}
            </text>
        );
    };

    return (
        <div
            style={{
                textAlign: "center",
                marginBottom: "0.75rem",
                height: WIDGET_HEIGHT,
                display: "flex",
                flexDirection: "column",
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
                    flexDirection: "column",
                    minHeight: 0,
                }}
            >

                {hasData && (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={rows} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e6efff" />

                            <XAxis
                                dataKey="label"
                                fontSize={11}
                                tick={{ fill: "#33527a" }}
                                axisLine={{ stroke: "#c3d7ff" }}
                                tickLine={{ stroke: "#c3d7ff" }}
                            />

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

                            <Legend verticalAlign="top" height={30} wrapperStyle={{ fontSize: 12 }} />

                            <ReTooltip formatter={(v) => barmoneyFmt(v)} labelFormatter={(l) => l} />

                            {numericKeys.map((key, i) => (
                                <Bar key={key} dataKey={key} fill={i === 0 ? "#2B6CB0" : "#1E90FF"}>
                                    <LabelList content={renderInsideBarLabel} />
                                </Bar>
                            ))}
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    );
}

function TableWidget({ title, data }) {
    const [page, setPage] = useState(1);
    const width = useWindowWidth();
    const isMobile = width < 768;
    const getWidgetHeight = (isMobile) => (isMobile ? 420 : 340);
    const widgetHeight = getWidgetHeight(isMobile);

    // --- RESPONSIVE DIMENSIONS ---
    const VALUE_COL_WIDTH = isMobile ? 110 : 150;
    const VALUE_NUMBER_WIDTH = isMobile ? 60 : 80;
    const VALUE_BAR_WIDTH = isMobile ? 30 : 50;
    const TEXT_COL_WIDTH = isMobile ? 120 : 180;

    const safeColumns = Array.isArray(data?.current?.columns) ? data.current.columns : [];
    const safeRows = Array.isArray(data?.current?.rows) ? data.current.rows : [];
    const prevRows = Array.isArray(data?.previous?.rows) ? data.previous.rows : [];
    const dataKey = safeColumns.join(",") + safeRows.length;

    useEffect(() => { setPage(1); }, [dataKey]);

    // Wrapper Style
    const containerStyle = {
        marginBottom: "0.75rem",
        display: "flex",
        flexDirection: "column",
        height: widgetHeight
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

    // --- COLUMN DETECTION LOGIC ---
    const MONEY_NAME_REGEX = /(amount|amt|total|price|value|cost|net|revenue|sales|balance|paid|receipt|gross)/i;
    const moneyColumnIndexes = new Set();
    const numberColumnIndexes = new Set();

    // 1. Identify Money Columns by Name
    safeColumns.forEach((col, idx) => {
        if (MONEY_NAME_REGEX.test(String(col))) moneyColumnIndexes.add(idx);
    });

    // 2. Identify Number Columns by Content
    const sampleSize = Math.min(6, rows.length);
    for (let colIdx = 0; colIdx < safeColumns.length; colIdx++) {
        let numericCount = 0;
        for (let r = 0; r < sampleSize; r++) {
            const val = rows[r]?.[colIdx];
            const cleaned = String(val).replace(/[,₹$Lkmb]/gi, ""); // Expanded regex to strip suffixes like L, k
            if (val !== null && val !== undefined && val !== "" && !isNaN(Number(cleaned))) numericCount++;
        }
        // If it looks like a number and wasn't already tagged as money, tag as number
        if (numericCount >= Math.ceil(sampleSize * 0.6) && !moneyColumnIndexes.has(colIdx)) {
            numberColumnIndexes.add(colIdx);
        }
    }

    // Ensure we have at least one value column if numbers exist
    if (moneyColumnIndexes.size === 0 && numberColumnIndexes.size > 0) {
        const firstNumCol = [...numberColumnIndexes][0];
        moneyColumnIndexes.add(firstNumCol);
        numberColumnIndexes.delete(firstNumCol);
    }

    // Select the "Primary" value column (for the bar chart) - usually the first money col found
    const valueColIndex = [...moneyColumnIndexes][0];
    const keyColIndex = safeColumns.findIndex((_, i) => typeof safeRows[0]?.[i] === "string");

    // --- PREVIOUS DATA MAPPING ---
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


    const total = rows.length;
    const TABLE_PAGE_SIZE = 5;
    const pages = Math.ceil(total / TABLE_PAGE_SIZE);
    const start = (page - 1) * TABLE_PAGE_SIZE;
    const visible = rows.slice(start, start + TABLE_PAGE_SIZE);

    const maxValueOnPage = Math.max(1, ...visible.map(r => {
        const v = Number(String(r[valueColIndex]).replace(/[,₹$]/g, ""));
        return Number.isFinite(v) ? v : 0;
    }));

    // Reusable style for line clamping
    const lineClampStyle = {
        display: "-webkit-box",
        WebkitLineClamp: 3,
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
                        overflow: "auto",
                        WebkitOverflowScrolling: "touch",
                        scrollbarWidth: "none",
                        msOverflowStyle: "none"
                    }}
                >
                    <style>{`
            .hide-scrollbar::-webkit-scrollbar {
              display: none;
            }
          `}</style>

                    <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, minWidth: isMobile ? "100%" : "400px" }}>
                        <thead>
                            <tr>
                                <th style={{ position: "sticky", top: 0, zIndex: 10, width: "40px", padding: "8px", background: NGRAPH_THEME.primary, color: "white", textAlign: "left", fontSize: 13 }}>#</th>
                                {[...safeColumns, "Δ"].map((c, idx) => {
                                    const isValueCol = idx === valueColIndex + 1;
                                    const isDeltaCol = c === "Δ";
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
                                                return <td style={{ padding: "8px", textAlign: "right", fontWeight: 700, fontSize: 13, color: "#999", borderBottom: "1px solid #eee", verticalAlign: "top" }}>–</td>;
                                            }

                                            return <td style={{ padding: "8px", textAlign: "right", fontWeight: 700, fontSize: 13, color: deltaVal < 0 ? "#d12b2b" : "#0B6623", whiteSpace: "nowrap", borderBottom: "1px solid #eee", verticalAlign: "top" }}>{`${deltaVal > 0 ? "▲" : "▼"}${moneyFmt(Math.abs(deltaVal))}`}</td>;
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
                                    <td style={{ padding: "8px", textAlign: "right", whiteSpace: "nowrap", color: !totalDeltaValue ? "#fff" : totalDeltaValue < 0 ? "#ff8888" : "#88ff88", verticalAlign: "top" }}>
                                        {totalDeltaValue === 0 || totalDeltaValue == null ? "–" : `${totalDeltaValue > 0 ? "▲" : "▼"}${moneyFmt(Math.abs(totalDeltaValue))}`}
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

/* ------------------------------------------------------------------
   PAGE ROOT
-------------------------------------------------------------------*/

export default function FinanceAnalyticsPage({ userId: propUserId }) {
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
        <div style={{ padding: 0, fontFamily: "Arial, sans-serif", background: NGRAPH_THEME.background, maxWidth: "100%", minWidth: "320px", margin: "0 auto" }}>
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

            {/* LINE, BAR AND TABLE CHART WIDGETS SECTION */}
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
                {dataMap.fa_line_debttoequity?.data && (
                    <LineAreaWidget
                        title={dataMap.fa_line_debttoequity?.title || "Debt-to-Equity Ratio"}
                        data={dataMap.fa_line_debttoequity?.data}
                    />
                )}

                {dataMap.fa_bar_debtandequity?.data && (
                    <BarChartWidget
                        title={dataMap.fa_bar_debtandequity?.title || "Debt & Equity"}
                        data={dataMap.fa_bar_debtandequity?.data}
                    />
                )}

                {dataMap.fa_table_debt?.data && (
                    <TableWidget
                        title={dataMap.fa_table_debt?.title || "Debt"}
                        data={dataMap.fa_table_debt?.data}
                    />
                )}
            </div>

            {/* LINE, BAR AND TABLE CHART WIDGETS SECTION */}
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
                {dataMap.fa_line_cashturnoverratio?.data && (
                    <LineAreaWidget
                        title={dataMap.fa_line_cashturnoverratio?.title || "Cash Turnover Ratio"}
                        data={dataMap.fa_line_cashturnoverratio?.data}
                    />
                )}

                {dataMap.fa_bar_salesvscashandbank?.data && (
                    <BarChartWidget
                        title={dataMap.fa_bar_salesvscashandbank?.title || "Sales vs Cash & Bank"}
                        data={dataMap.fa_bar_salesvscashandbank?.data}
                    />
                )}

                {dataMap.fa_table_cashandbank?.data && (
                    <TableWidget
                        title={dataMap.fa_table_cashandbank?.title || "Cash & Bank"}
                        data={dataMap.fa_table_cashandbank?.data}
                    />
                )}
            </div>

            {/* LINE, BAR AND TABLE CHART WIDGETS SECTION */}
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
                {dataMap.fa_line_faturnoverratio?.data && (
                    <LineAreaWidget
                        title={dataMap.fa_line_faturnoverratio?.title || "FA Ratio"}
                        data={dataMap.fa_line_faturnoverratio?.data}
                    />
                )}

                {dataMap.fa_bar_salesvsfixedassets?.data && (
                    <BarChartWidget
                        title={dataMap.fa_bar_salesvsfixedassets?.title || "Sales vs Fixed Assets"}
                        data={dataMap.fa_bar_salesvsfixedassets?.data}
                    />
                )}

                {dataMap.fa_table_fixedassets?.data && (
                    <TableWidget
                        title={dataMap.fa_table_fixedassets?.title || "Fixed Assets"}
                        data={dataMap.fa_table_fixedassets?.data}
                    />
                )}
            </div>

            {/* LINE, BAR AND TABLE CHART WIDGETS SECTION */}
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
                {dataMap.fa_line_debtors?.data && (
                    <LineAreaWidget
                        title={dataMap.fa_line_debtors?.title || "Debtors"}
                        data={dataMap.fa_line_debtors?.data}
                    />
                )}

                {dataMap.fa_bar_debtorsvssales?.data && (
                    <BarChartWidget
                        title={dataMap.fa_bar_debtorsvssales?.title || "Debtors vs Sales"}
                        data={dataMap.fa_bar_debtorsvssales?.data}
                    />
                )}

                {dataMap.fa_table_debtors?.data && (
                    <TableWidget
                        title={dataMap.fa_table_debtors?.title || "Debtors"}
                        data={dataMap.fa_table_debtors?.data}
                    />
                )}
            </div>

            {/* LINE, BAR AND TABLE CHART WIDGETS SECTION */}
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
                {dataMap.fa_line_creditors?.data && (
                    <LineAreaWidget
                        title={dataMap.fa_line_creditors?.title || "Creditors"}
                        data={dataMap.fa_line_creditors?.data}
                    />
                )}

                {dataMap.fa_bar_creditorsvspurchase?.data && (
                    <BarChartWidget
                        title={dataMap.fa_bar_creditorsvspurchase?.title || "Creditors vs Purchase"}
                        data={dataMap.fa_bar_creditorsvspurchase?.data}
                    />
                )}

                {dataMap.fa_table_creditors?.data && (
                    <TableWidget
                        title={dataMap.fa_table_creditors?.title || "Creditors"}
                        data={dataMap.fa_table_creditors?.data}
                    />
                )}
            </div>

            {/* LINE, BAR AND TABLE CHART WIDGETS SECTION */}
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
                {dataMap.fa_line_commission?.data && (
                    <LineAreaWidget
                        title={dataMap.fa_line_commission?.title || "Commission"}
                        data={dataMap.fa_line_commission?.data}
                    />
                )}

                {dataMap.fa_bar_commissionandcreditors?.data && (
                    <BarChartWidget
                        title={dataMap.fa_bar_commissionandcreditors?.title || "Commission & Creditors"}
                        data={dataMap.fa_bar_commissionandcreditors?.data}
                    />
                )}

                {dataMap.fa_table_creditorscommission?.data && (
                    <TableWidget
                        title={dataMap.fa_table_creditorscommission?.title || "Creditors for Commission"}
                        data={dataMap.fa_table_creditorscommission?.data}
                    />
                )}
            </div>

            {
                loading && (
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
                )
            }
        </div >
    );
}