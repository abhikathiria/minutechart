import { useRef, useState, useEffect, useMemo } from "react";
import api from "../../api";
import { FaArrowUp, FaArrowDown, FaDownload } from "react-icons/fa";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";


const PAGE_SIZES = [20, 30, 50, 100, 200];

function TruncatedCell({ children, style }) {
    const ref = useRef(null);
    const [showTitle, setShowTitle] = useState(false);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        setShowTitle(el.scrollWidth > el.clientWidth);
    }, [children]);

    return (
        <td
            ref={ref}
            title={showTitle ? String(children) : undefined}
            style={{
                ...style,
                cursor: showTitle ? "help" : "default",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis"
            }}
        >
            {children ?? "-"}
        </td>
    );
}

/* ---------- SQL PARAM PARSER ---------- */
function extractSqlParams(sql) {
    if (!sql) return [];
    const matches = sql.match(/@\w+/g) || [];
    return [...new Set(matches.map(p => p.substring(1)))];
}

export default function CatalogsProducts() {
    const [userId, setUserId] = useState(null);
    const [queryId, setQueryId] = useState(null);

    const [showTaxableDetails, setShowTaxableDetails] = useState(false);
    const [showInventoryDetails, setShowInventoryDetails] = useState(false);

    const [showMeasurementDetails, setShowMeasurementDetails] = useState(false);
    const [showSalesShippingDetails, setShowSalesShippingDetails] = useState(false);

    const [showOtherDetails, setShowOtherDetails] = useState(false);
    const [showLongDescription, setShowLongDescription] = useState(false);

    const [rows, setRows] = useState([]);
    const [columns, setColumns] = useState([]);
    const [loading, setLoading] = useState(true);

    const [sortKey, setSortKey] = useState(null);
    const [sortDir, setSortDir] = useState("asc");

    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);

    const [filters, setFilters] = useState({});
    const [editRow, setEditRow] = useState(null);
    const [columnWidths, setColumnWidths] = useState({});

    // 🔑 catalog metadata
    const [insertQuery, setInsertQuery] = useState("");
    const [updateQuery, setUpdateQuery] = useState("");
    const [primaryKey, setPrimaryKey] = useState("");

    const isEditMode = !!(editRow && primaryKey && editRow[primaryKey]);

    const [categories, setCategories] = useState([]);
    const [uoms, setUoms] = useState([]);

    /* ---------- USER ---------- */
    useEffect(() => {
        api.get("/account/me").then(res => setUserId(res.data.id));
    }, []);

    /* ---------- LOAD DATA ---------- */
    useEffect(() => {
        if (!userId) return;

        const loadData = async () => {
            setLoading(true);
            try {
                const modulesRes = await api.get(`/catalogs/user/${userId}/queries`);
                const modules = modulesRes.data || [];
                if (!modules.length) return;

                const module = modules[0];
                setQueryId(module.id);
                setInsertQuery(module.insertQuery || "");
                setUpdateQuery(module.updateQuery || "");
                setPrimaryKey(module.primaryKeyColumn || "");

                const res = await api.get(
                    `/catalogs/run-saved-query/${userId}/${module.id}`
                );

                const data = res.data?.data || [];
                setRows(data);
                setColumns(data.length ? Object.keys(data[0]) : []);
            } catch (e) {
                setRows([]);
                setColumns([]);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [userId]);

    /* ---------- MODAL FIELDS ---------- */
    const modalFields = useMemo(() => {
        if (!editRow) return [];

        if (isEditMode) {
            return extractSqlParams(updateQuery).filter(p => p !== primaryKey);
        }
        return extractSqlParams(insertQuery);
    }, [editRow, isEditMode, insertQuery, updateQuery, primaryKey]);

    /* ---------- SORT ---------- */
    const handleSort = key => {
        if (sortKey === key) setSortDir(d => (d === "asc" ? "desc" : "asc"));
        else {
            setSortKey(key);
            setSortDir("asc");
        }
    };

    /* ---------- SAVE ---------- */
    /* ---------- REFINED SAVE ---------- */
    const handleSave = async () => {
        // 1. Identify the PK value from the row
        // If adding new, we use the input value. If editing, we use the original value.
        const pkValue = editRow[primaryKey] || editRow["MainCode"];

        if (!pkValue || !editRow["MainName"]) {
            alert("Main Code and Main Name are required.");
            return;
        }

        try {
            // 2. Check if this record exists in our current table to decide Add vs Update
            const isExisting = rows.some(r => String(r[primaryKey]) === String(pkValue));

            const url = isExisting
                ? `/catalogs/item/update/${userId}`
                : `/catalogs/item/save/${userId}`;

            // 3. Map the fields to the DTO expected by C#
            const payload = {
                MainCode: pkValue,
                MainName: editRow["MainName"] || editRow["WIP_NAME"],
                Mode: editRow["Mode"] || editRow["WIP_MODE"] || null
            };

            await api.post(url, payload);

            setEditRow(null);
            refreshData();
            alert("Saved successfully!");
        } catch (e) {
            // 4. Capture specific SQL errors
            const errorMsg = e.response?.data || e.message;
            alert(`Database Error: ${errorMsg}`);
        }
    };

    /* ---------- REFINED DELETE ---------- */
    const handleDelete = async () => {
        const pkValue = editRow[primaryKey];
        if (!pkValue) return;

        if (!window.confirm(`Delete item ${pkValue}?`)) return;

        try {
            await api.delete(`/catalogs/item/delete/${userId}/${pkValue}`);
            setEditRow(null);
            refreshData();
        } catch (e) {
            alert("Delete failed: " + (e.response?.data || e.message));
        }
    };

    const refreshData = async () => {
        const res = await api.get(`/catalogs/run-saved-query/${userId}/${queryId}`);
        setRows(res.data.data || []);
    };


    /* ---------- FILTER + SORT ---------- */
    const filteredRows = useMemo(() => {
        return rows.filter(row =>
            Object.entries(filters).every(([k, v]) =>
                !v ? true : String(row[k] ?? "").toLowerCase().includes(v.toLowerCase())
            )
        );
    }, [rows, filters]);

    const sortedRows = useMemo(() => {
        if (!sortKey) return filteredRows;
        return [...filteredRows].sort((a, b) => {
            const v1 = a[sortKey] ?? "";
            const v2 = b[sortKey] ?? "";
            return sortDir === "asc" ? (v1 > v2 ? 1 : -1) : v1 > v2 ? -1 : 1;
        });
    }, [filteredRows, sortKey, sortDir]);

    const startResize = (e, col) => {
        e.preventDefault();
        e.stopPropagation();

        const startX = e.clientX;
        const startWidth = columnWidths[col] || e.target.parentElement.offsetWidth;

        const onMouseMove = (moveEvent) => {
            const newWidth = Math.max(80, startWidth + (moveEvent.clientX - startX));
            setColumnWidths(w => ({ ...w, [col]: newWidth }));
        };

        const onMouseUp = () => {
            document.removeEventListener("mousemove", onMouseMove);
            document.removeEventListener("mouseup", onMouseUp);
        };

        document.addEventListener("mousemove", onMouseMove);
        document.addEventListener("mouseup", onMouseUp);
    };

    /* ---------- PAGINATION ---------- */
    const totalItems = sortedRows.length;
    const pagedData = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return sortedRows.slice(start, start + pageSize);
    }, [sortedRows, currentPage, pageSize]);

    const SortIcon = ({ col }) =>
        sortKey === col ? (sortDir === "asc" ? <FaArrowUp /> : <FaArrowDown />) : null;
    const from = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
    const to = Math.min(currentPage * pageSize, totalItems);

    const handleExport = () => {
        if (!rows || rows.length === 0) return;

        // Use filtered + sorted data (what user is actually seeing)
        const exportData = sortedRows.map(row => {
            const obj = {};
            columns.forEach(col => {
                obj[col] = row[col];
            });
            return obj;
        });

        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();

        XLSX.utils.book_append_sheet(workbook, worksheet, "Data");

        const excelBuffer = XLSX.write(workbook, {
            bookType: "xlsx",
            type: "array"
        });

        const blob = new Blob([excelBuffer], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        });

        saveAs(blob, `catalog-product-data-${new Date().toISOString().slice(0, 10)}.xlsx`);
    };

    /* ---------- UI ---------- */
    return (
        <div className="party-page flex flex-col min-h-screen">
            <div className="party-main-area flex flex-col flex-1">
                <div className="party-header">
                    <h2>Catalog Query Results</h2>
                    <div className="party-actions">
                        <button
                            onClick={handleExport}
                            title={"Export Data to Excel"}
                            className="btn ghost"
                        >
                            <FaDownload /> Download Excel
                        </button>
                        <button
                            className="btn primary"
                            onClick={async () => {
                                setEditRow({}); // ADD mode only

                                try {
                                    const [catRes, uomRes] = await Promise.all([
                                        api.get(`/catalogs/lookups/categories/${userId}`),
                                        api.get(`/catalogs/lookups/uoms/${userId}`)
                                    ]);

                                    setCategories(catRes.data || []);
                                    setUoms(uomRes.data || []);
                                } catch (e) {
                                    console.error("Failed to load lookups", e);
                                }
                            }}
                        >
                            + Add Data
                        </button>
                    </div>
                </div>

                <div className="party-table-wrapper flex-1 overflow-hidden">
                    <div className="party-table-scroll overflow-auto h-full">

                        {loading ? (
                            <div className="p-6 text-center">Loading…</div>
                        ) : (
                            <table className="party-table">
                                <thead>
                                    <tr>
                                        {columns.map(col => (
                                            <th
                                                key={col}
                                                onClick={() => handleSort(col)}
                                                style={{
                                                    width: columnWidths[col],
                                                    minWidth: 80,
                                                    position: "relative",
                                                    userSelect: "none"
                                                }}
                                            >
                                                <div className="flex items-center justify-between gap-1">
                                                    <span>{col}</span>
                                                    <SortIcon col={col} />
                                                </div>

                                                {/* Resizer */}
                                                <div
                                                    onMouseDown={(e) => startResize(e, col)}
                                                    style={{
                                                        position: "absolute",
                                                        right: 0,
                                                        top: 0,
                                                        height: "100%",
                                                        width: 6,
                                                        cursor: "col-resize",
                                                        zIndex: 10
                                                    }}
                                                />
                                            </th>
                                        ))}
                                    </tr>
                                    <tr>
                                        {columns.map(col => (
                                            <th key={col}>
                                                <input
                                                    placeholder="Search…"
                                                    value={filters[col] || ""}
                                                    onChange={e =>
                                                        setFilters(f => ({ ...f, [col]: e.target.value }))
                                                    }
                                                />
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {pagedData.map((row, i) => (
                                        <tr key={i}>
                                            {columns.map((col, idx) => (
                                                <TruncatedCell
                                                    key={col}
                                                    style={{
                                                        width: columnWidths[col],
                                                        minWidth: 80,
                                                        maxWidth: columnWidths[col]
                                                    }}
                                                >
                                                    {idx === 0 ? (
                                                        <button
                                                            className="row-link"
                                                            onClick={() => setEditRow(row)}
                                                        >
                                                            {row[col]}
                                                        </button>
                                                    ) : (
                                                        row[col]
                                                    )}
                                                </TruncatedCell>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>

            <div className="party-footer">
                <span>{from} - {to} of {totalItems} items</span>
                <div className="pagination">
                    <button disabled={currentPage === 1} onClick={() => setCurrentPage(1)}>
                        ⏮ First
                    </button>

                    <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>
                        ◀ Prev
                    </button>

                    <span>
                        Page {currentPage} of {Math.ceil(totalItems / pageSize)}
                    </span>

                    <button
                        disabled={currentPage >= Math.ceil(totalItems / pageSize)}
                        onClick={() => setCurrentPage(p => p + 1)}
                    >
                        Next ▶
                    </button>

                    <button
                        disabled={currentPage >= Math.ceil(totalItems / pageSize)}
                        onClick={() => setCurrentPage(Math.ceil(totalItems / pageSize))}
                    >
                        Last ⏭
                    </button>
                </div>
                <div className="items-per-page">
                    <select
                        value={pageSize}
                        onChange={(e) => {
                            setPageSize(Number(e.target.value));
                            setCurrentPage(1);
                        }}
                    >
                        {PAGE_SIZES.map(s => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </select>
                    <span>Items per page</span>
                </div>
            </div>

            {/* ---------- MODAL ---------- */}
            {editRow && (
                <div className="modal-backdrop">
                    <div className="modal" style={{ maxWidth: "500px", width: "100%", padding: "0" }}> {/* Increased width for 2 columns */}
                        <h3 className="modal-title" style={{ backgroundColor: "#eef2f5", padding: "15px", margin: "0", borderBottom: "1px solid #ddd", fontSize: "20px", fontWeight: "700", textAlign: "center" }}>
                            MAIN GROUP MASTER
                        </h3>

                        <div className="modal-body flex flex-col items-center gap-y-4 text-sm p-6">
                            {/* --- SINGLE COLUMN CONTAINER --- */}
                            <div className="flex flex-col gap-3 w-full max-w-md">

                                {/* Main Code */}
                                <div className="flex items-center">
                                    <label className="w-1/3 text-right pr-4 font-bold text-gray-700">{!isEditMode && <span className="text-red-500 mr-1">*</span>}Main Code:</label>
                                    <input
                                        disabled={rows.some(r => String(r[primaryKey]) === String(editRow[primaryKey]))}

                                        className={`w-2/3 border p-1 rounded ${rows.some(r => String(r[primaryKey]) === String(editRow[primaryKey]))
                                            ? "bg-gray-100 cursor-not-allowed text-gray-500" // Grey out if disabled
                                            : "bg-white"
                                            }`}
                                        title="WIP_CODE"
                                        value={editRow[primaryKey] || editRow["MainCode"] || ""}
                                        onChange={e => setEditRow(r => ({ ...r, "MainCode": e.target.value }))}
                                    />
                                </div>

                                {/* Main Name */}
                                <div className="flex items-center">
                                    <label className="w-1/3 text-right pr-4 font-bold text-gray-700"><span className="text-red-500 mr-1">*</span>Main Name:</label>
                                    <input
                                        className="w-2/3 border p-1 rounded"
                                        title="WIP_NAME"
                                        value={editRow["MainName"] || ""}
                                        onChange={e => setEditRow(r => ({ ...r, "MainName": e.target.value }))}
                                    />
                                </div>

                                {/* Mode */}
                                <div className="flex items-center">
                                    <label className="w-1/3 text-right pr-4 font-bold text-gray-700">Mode:</label>
                                    <select
                                        className="w-2/3 border p-1 rounded"
                                        title="WIP_MODE"
                                        value={editRow["Mode"] || ""}
                                        onChange={e => setEditRow(r => ({ ...r, "Mode": e.target.value }))}
                                    >
                                        <option value="">-Select-</option>
                                        <option value="JOB">JOB</option>
                                        <option value="Regular">Regular</option>
                                    </select>
                                </div>

                            </div>
                        </div>

                        <div className="modal-actions mt-4 mb-4 pt-4 border-t flex justify-center gap-2 px-6">
                            {rows.some(r => r[primaryKey] === editRow[primaryKey]) && (
                                <button
                                    className="px-4 py-1 bg-gray-200 text-red-600 border border-red-200 rounded hover:bg-red-50 font-bold mr-auto"
                                    onClick={handleDelete}
                                >
                                    Delete
                                </button>
                            )}

                            <button
                                className="px-4 py-1 bg-red-600 text-white rounded hover:bg-red-700 shadow-sm"
                                onClick={() => setEditRow(null)}
                            >
                                Cancel
                            </button>

                            <button
                                className="px-4 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 shadow-sm"
                                onClick={handleSave}
                            >
                                {rows.some(r => r[primaryKey] === editRow[primaryKey]) ? "Update" : "Save"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}