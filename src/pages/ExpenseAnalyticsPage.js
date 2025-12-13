// src/pages/ExpenseAnalyticsPage.jsx
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
    startOfMonth,
    endOfMonth,
    subMonths,
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
    "ea_line_purchase",
    "ea_pie_purchase",
    "ea_table_purchase",

    "ea_line_salary",
    "ea_pie_salary",
    "ea_table_salary",

    "ea_line_direct",
    "ea_pie_direct",
    "ea_table_direct",

    "ea_line_indirect",
    "ea_pie_indirect",
    "ea_table_indirect",

    "ea_line_admin",
    "ea_pie_admin",
    "ea_table_admin",
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
    if (!Number.isFinite(n)) return String(v);

    const sign = n < 0 ? "-" : "";
    const absN = Math.abs(n);

    if (absN >= 1e9) return `${sign}${(absN / 1e9).toFixed(2)}B`;
    if (absN >= 1e6) return `${sign}${(absN / 1e6).toFixed(2)}M`;

    return `${sign}${absN.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}
// function numberFmt(v) {
//     if (v === null || v === undefined) return "-";
//     const n = Number(v);
//     return Number.isFinite(n)
//         ? n.toLocaleString("en-IN", { maximumFractionDigits: 0 })
//         : String(v);
// }

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

/* ------------------------------------------------------------------
   API CALL
-------------------------------------------------------------------*/
async function postExecuteExpenseComponent(userId, body) {
    try {
        const res = await api.post(
            `/expensemodules/execute/${encodeURIComponent(userId)}`,
            body,
            { headers: { "Content-Type": "application/json" } }
        );
        return res.data;
    } catch (err) {
        console.warn("execute-expense-component error", err);
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
    if (componentId.startsWith("ea_line_")) {
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

            const curr = await postExecuteExpenseComponent(userId, currentBody);
            const prev = await postExecuteExpenseComponent(userId, previousBody);

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
                    data: null,
                    title: curr?.title || "Month-wise Expense"
                };
            }

            return {
                datasource: "db",
                data: { current, previous },
                title: curr?.title || "Month-wise Expense"
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

        const res = await postExecuteExpenseComponent(userId, body);
        if (!res?.success || res.data == null)
            return { datasource: "db", data: null };

        const rows = Array.isArray(res.data)
            ? res.data
            : typeof res.data === "object"
                ? [res.data]
                : [];

        // PIE
        if (componentId.startsWith("ea_pie_")) {
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

        // TABLE
        if (componentId.startsWith("ea_table_")) {
            const table = normalizeToTable(rows);
            if (!table.columns.length) {
                return {
                    datasource: "db",
                    data: { empty: true },
                    title: res.title
                };
            }

            return {
                datasource: "db",
                data: table,
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
    const widgetStyle = {
        textAlign: "center",
        border: `2px solid ${NGRAPH_THEME.kpiBorder}`,
        background: "#fff",
        padding: "1.5rem",
        color: "#0B3A66",
        fontWeight: 600,
        fontSize: 14,
    };

    const titleStyle = {
        textAlign: "center",
        color: "#0B3A66",
        fontWeight: 600,
        fontSize: 16,
        marginBottom: "8px",
    };

    return (
        <div>
            <div style={titleStyle}>{title}</div>

            <div style={widgetStyle}>
                <div style={{ opacity: 0.7 }}>No data available</div>
            </div>
        </div>
    );
}

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
                Expense Analytics
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

function PresetDateButtons({ onSelect }) {
    const today = new Date();
    const yr = today.getFullYear();
    const month = today.getMonth() + 1;

    // YEARLY: previous full year
    const getYearly = () => ({
        start: `${yr - 1}-01-01`,
        end: `${yr - 1}-12-31`,
    });

    // HALF-YEARLY
    const getHalfYearly = () => {
        if (month <= 6) {
            return {
                start: `${yr}-01-01`,
                end: `${yr}-06-30`,
            };
        } else {
            return {
                start: `${yr}-07-01`,
                end: `${yr}-12-31`,
            };
        }
    };

    // QUARTERLY
    const getQuarterly = () => {
        const q1 = [1, 2, 3];
        const q2 = [4, 5, 6];
        const q3 = [7, 8, 9];
        const q4 = [10, 11, 12];

        let start, end;

        if (q1.includes(month)) {
            start = `${yr}-01-01`; end = `${yr}-03-31`;
        } else if (q2.includes(month)) {
            start = `${yr}-04-01`; end = `${yr}-06-30`;
        } else if (q3.includes(month)) {
            start = `${yr}-07-01`; end = `${yr}-09-30`;
        } else {
            start = `${yr}-10-01`; end = `${yr}-12-31`;
        }

        return { start, end };
    };

    // MONTHLY
    const getMonthly = () => {
        const first = new Date(yr, month - 1, 1);
        const last = new Date(yr, month, 0);

        return {
            start: format(first, "yyyy-MM-dd"),
            end: format(last, "yyyy-MM-dd"),
        };
    };

    // TODAY + YESTERDAY
    const getToday = () => {
        const yest = new Date();
        yest.setDate(today.getDate());

        return {
            start: format(yest, "yyyy-MM-dd"),
            end: format(yest, "yyyy-MM-dd"),
        };
    };

    // TODAY + YESTERDAY
    const getTodayYesterday = () => {
        const yest = new Date();
        yest.setDate(today.getDate() - 1);

        return {
            start: format(yest, "yyyy-MM-dd"),
            end: format(today, "yyyy-MM-dd"),
        };
    };

    const btn = {
        padding: "6px 10px",
        background: "#2B6CB0",
        borderRadius: 6,
        border: "none",
        color: "white",
        cursor: "pointer",
        fontWeight: 600,
        fontSize: 14,
    };

    return (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            <button style={btn} onClick={() => onSelect(getYearly())}>Yearly</button>
            <button style={btn} onClick={() => onSelect(getHalfYearly())}>Half Yearly</button>
            <button style={btn} onClick={() => onSelect(getQuarterly())}>Quarterly</button>
            <button style={btn} onClick={() => onSelect(getMonthly())}>Monthly</button>
            <button style={btn} onClick={() => onSelect(getToday())}>Today</button>
            <button style={btn} onClick={() => onSelect(getTodayYesterday())}>Today + Yesterday</button>
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
    if (data == null) return null;
    if (data?.empty) return <NoDataWidget title={title} />;
    const hasData = data?.items?.length > 0;
    const items = hasData
        ? [...data.items].sort((a, b) => b.value - a.value)
        : [];

    const renderInsideLabel = ({
        cx, cy, midAngle, innerRadius, outerRadius, percent
    }) => {
        const radius = innerRadius + (outerRadius - innerRadius) / 2;
        const RADIAN = Math.PI / 180;
        const x = cx + radius * Math.cos(-midAngle * RADIAN);
        const y = cy + radius * Math.sin(-midAngle * RADIAN);

        if (percent * 100 < 3) return null;

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
        const w = window.innerWidth;
        let limit = 25;
        if (w < 1280) limit = 18;
        if (w < 1024) limit = 15;
        if (w < 768) limit = 12;
        if (w < 480) limit = 10;
        return str.length > limit ? str.slice(0, limit) + "…" : str;
    };

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
            {/* Title */}
            <div
                style={{
                    fontWeight: 700,
                    fontSize: "1rem",
                    color: "#0B3A66",
                    marginBottom: "0.5rem"
                }}
            >
                {title}
            </div>

            {/* Main container identical to Line & Map */}
            <div
                style={{
                    background: "#fff",
                    border: `2px solid ${NGRAPH_THEME.kpiBorder}`,
                    padding: "12px",
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    minHeight: 0
                }}
            >
                <div
                    style={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        minHeight: 0
                    }}
                >
                    {/* Chart should take all remaining space */}
                    <div style={{ flex: 1, minHeight: 0 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    dataKey="value"
                                    data={items}
                                    cx="50%"
                                    cy="45%"
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
                                                        fill: "#0B3A66"
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
                                    formatter={(v, n, p) => [
                                        money(v),
                                        `${dynamicTruncate(
                                            p.payload.label
                                        )} (${p.payload.percentage.toFixed(1)}%)`
                                    ]}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Legend at bottom, fixed height */}
                    <div
                        style={{
                            display: "flex",
                            flexWrap: "wrap",
                            justifyContent: "center",
                            alignItems: "center",
                            gap: 10,

                            width: "100%",
                            maxHeight: "100px",
                            overflowY: "auto",
                            paddingRight: 4,
                            fontSize: 12,
                        }}
                    >
                        {items.map((it, i) => (
                            <div
                                key={i}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 4,
                                    width: "22%",
                                    minWidth: 90,
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
                                />
                                <div
                                    style={{
                                        color: "#0B3A66",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        whiteSpace: "nowrap",
                                    }}
                                >
                                    {dynamicTruncate(it.label)}
                                </div>
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

    if (data == null) return null;
    if (data?.empty) return <NoDataWidget title={title} />;

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

/* TABLE WIDGET (title outside + centered) */
function TableWidget({ title, data }) {
    const [page, setPage] = useState(1);
    const safeColumns = Array.isArray(data?.columns) ? data.columns : [];
    const safeRows = Array.isArray(data?.rows) ? data.rows : [];

    const dataKey = safeColumns.join(",") + safeRows.length;

    useEffect(() => {
        setPage(1);
    }, [dataKey]);

    if (data == null) return null;
    if (data.empty) return <NoDataWidget title={title} />;
    if (!safeColumns.length) return <NoDataWidget title={title} />;

    let rows = [...safeRows];
    let totalRow = null;

    if (rows.length > 0) {
        const last = rows[rows.length - 1];
        const isTotal = Object.values(last).some(
            (v) => typeof v === "string" && v.toLowerCase().includes("total")
        );

        if (isTotal) {
            totalRow = last;
            rows = rows.slice(0, rows.length - 1);
        }
    }

    if (rows.length === 0) return <NoDataWidget title={title} />;

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
                                                    <td key={j} style={{ ...baseStyle, whiteSpace: "nowrap", wordBreak: "normal", color, fontWeight: 700 }}>
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

export default function ExpenseAnalyticsPage({ userId: propUserId }) {
    const { id: routeUserId } = useParams();
    const userId = routeUserId || propUserId || "demo_tenant";

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

                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            flexWrap: "wrap",
                            gap: "0.5rem",
                        }}
                    >

                        {/* PRESET BUTTON GROUP */}
                        <PresetDateButtons onSelect={(range) => {
                            setPendingRange(range);
                            setDateRange(range);
                        }} />

                        {/* EXISTING DATE RANGE INPUT */}
                        <DateRangeInput
                            value={pendingRange}
                            onPendingChange={setPendingRange}
                            onApply={setDateRange}
                        />

                        <button
                            onClick={resetDateRange}
                            style={{
                                padding: "0.375rem 0.75rem",
                                background: "#A1A1A1",
                                color: "white",
                                borderRadius: 6,
                                border: "none",
                                cursor: "pointer",
                                fontWeight: 600,
                                flexShrink: 0,
                            }}
                        >
                            Reset
                        </button>

                    </div>
                </div>
            </div>

            {
                error && (
                    <div style={{ color: "#a31b1b", marginBottom: 12 }}>{error}</div>
                )
            }

            {/* LINE, DONUT AND TABLE CHART WIDGETS SECTION */}
            <div
                style={{
                    padding: "1.25rem",
                    display: "grid",
                    // RESPONSIVE GRID: Auto-fit up to 3 columns, minimum 280px wide
                    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                    gap: "0.75rem",
                }}
            >
                <LineAreaWidget
                    title={dataMap.ea_line_purchase?.title || "Purchase %"}
                    data={dataMap.ea_line_purchase?.data}
                />

                <DonutWidget
                    title={dataMap.ea_pie_purchase?.title || "Purchase Contribution"}
                    data={dataMap.ea_pie_purchase?.data}
                />

                <TableWidget
                    title={dataMap.ea_table_purchase?.title || "Purchase"}
                    data={dataMap.ea_table_purchase?.data}
                />
            </div>

            {/* LINE, DONUT AND TABLE CHART WIDGETS SECTION */}
            <div
                style={{
                    padding: "1.25rem",
                    display: "grid",
                    // RESPONSIVE GRID: Auto-fit up to 3 columns, minimum 280px wide
                    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                    gap: "0.75rem",
                }}
            >
                <LineAreaWidget
                    title={dataMap.ea_line_salary?.title || "Salary Exp %"}
                    data={dataMap.ea_line_salary?.data}
                />

                <DonutWidget
                    title={dataMap.ea_pie_salary?.title || "Salary Exp Contribution"}
                    data={dataMap.ea_pie_salary?.data}
                />

                <TableWidget
                    title={dataMap.ea_table_salary?.title || "Salary Exp"}
                    data={dataMap.ea_table_salary?.data}
                />
            </div>

            {/* LINE, DONUT AND TABLE CHART WIDGETS SECTION */}
            <div
                style={{
                    padding: "1.25rem",
                    display: "grid",
                    // RESPONSIVE GRID: Auto-fit up to 3 columns, minimum 280px wide
                    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                    gap: "0.75rem",
                }}
            >
                <LineAreaWidget
                    title={dataMap.ea_line_direct?.title || "Direct Exp %"}
                    data={dataMap.ea_line_direct?.data}
                />

                <DonutWidget
                    title={dataMap.ea_pie_direct?.title || "Direct Exp Contribution"}
                    data={dataMap.ea_pie_direct?.data}
                />

                <TableWidget
                    title={dataMap.ea_table_direct?.title || "Direct Exp"}
                    data={dataMap.ea_table_direct?.data}
                />
            </div>

            {/* LINE, DONUT AND TABLE CHART WIDGETS SECTION */}
            <div
                style={{
                    padding: "1.25rem",
                    display: "grid",
                    // RESPONSIVE GRID: Auto-fit up to 3 columns, minimum 280px wide
                    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                    gap: "0.75rem",
                }}
            >
                <LineAreaWidget
                    title={dataMap.ea_line_indirect?.title || "Indirect Exp %"}
                    data={dataMap.ea_line_indirect?.data}
                />

                <DonutWidget
                    title={dataMap.ea_pie_indirect?.title || "Indirect Exp Contribution"}
                    data={dataMap.ea_pie_indirect?.data}
                />

                <TableWidget
                    title={dataMap.ea_table_indirect?.title || "Indirect Exp"}
                    data={dataMap.ea_table_indirect?.data}
                />
            </div>

            {/* LINE, DONUT AND TABLE CHART WIDGETS SECTION */}
            <div
                style={{
                    padding: "1.25rem",
                    display: "grid",
                    // RESPONSIVE GRID: Auto-fit up to 3 columns, minimum 280px wide
                    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                    gap: "0.75rem",
                }}
            >
                <LineAreaWidget
                    title={dataMap.ea_line_admin?.title || "Admin Exp %"}
                    data={dataMap.ea_line_admin?.data}
                />

                <DonutWidget
                    title={dataMap.ea_pie_admin?.title || "Admin Exp Contribution"}
                    data={dataMap.ea_pie_admin?.data}
                />

                <TableWidget
                    title={dataMap.ea_table_admin?.title || "Admin Exp"}
                    data={dataMap.ea_table_admin?.data}
                />
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