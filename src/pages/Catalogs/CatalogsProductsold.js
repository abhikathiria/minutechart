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
    const handleSave = async () => {
        try {
            await api.post(`/catalogs/save-row/${userId}/${queryId}`, editRow);
            setEditRow(null);

            const res = await api.get(
                `/catalogs/run-saved-query/${userId}/${queryId}`
            );
            setRows(res.data.data || []);
        } catch (e) {
            alert(e.response?.data || "Save failed");
        }
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
                        <button className="btn primary" onClick={() => setEditRow({})}>
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
                    <div className="modal">
                        <h3 className="modal-title">
                            {isEditMode ? "Edit Row" : "Add Row"}
                        </h3>

                        <div className="modal-body grid grid-cols-1 md:grid-cols-2 gap-4">
                            {modalFields.map(col => (
                                <div key={col}>
                                    <label className="text-xs font-semibold">{col}</label>
                                    <input
                                        className="w-full border px-2 py-1"
                                        value={editRow[col] || ""}
                                        onChange={e =>
                                            setEditRow(r => ({ ...r, [col]: e.target.value }))
                                        }
                                    />
                                </div>
                            ))}
                        </div>

                        <div className="modal-actions">
                            <button onClick={() => setEditRow(null)}>Cancel</button>
                            <button className="btn primary" onClick={handleSave}>
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}



// {editRow && (
//                 <div className="modal-backdrop">
//                     <div className="modal" style={{ maxWidth: "900px", width: "100%", padding: "0" }}> {/* Increased width for 2 columns */}
//                         <h3 className="modal-title" style={{ backgroundColor: "#eef2f5", padding: "15px", margin: "0", borderBottom: "1px solid #ddd" }}>
//                             Basic Info
//                         </h3>

//                         {/* REPLACE THIS WHOLE SECTION */}
//                         <div className="modal-body grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-sm p-6">

//                             {/* --- LEFT COLUMN --- */}
//                             <div className="flex flex-col gap-3">

//                                 {/* Product Type */}
//                                 <div className="flex items-center">
//                                     <label className="w-1/3 text-right pr-2 font-bold text-gray-700">Product Type:</label>
//                                     <select
//                                         className="w-2/3 border p-1 rounded"
//                                         value={editRow.ProductType || ""}
//                                         onChange={e =>
//                                             setEditRow(r => ({ ...r, ProductType: e.target.value }))
//                                         }
//                                     >
//                                         <option value="">-Select-</option>
//                                         {categories.map(c => (
//                                             <option key={c.code} value={c.code}>
//                                                 {c.name}
//                                             </option>
//                                         ))}
//                                     </select>
//                                 </div>

//                                 {/* Product ID */}
//                                 <div className="flex items-center">
//                                     <label className="w-1/3 text-right pr-2 font-bold text-gray-700">Product ID:</label>
//                                     <input
//                                         className="w-2/3 border p-1 rounded"
//                                         value={editRow["ProductID"] || ""}
//                                         onChange={e => setEditRow(r => ({ ...r, "ProductID": e.target.value }))}
//                                     />
//                                 </div>

//                                 {/* Internal Name */}
//                                 <div className="flex items-center">
//                                     <label className="w-1/3 text-right pr-2 font-bold text-gray-700">Internal Name:</label>
//                                     <input
//                                         className="w-2/3 border p-1 rounded"
//                                         value={editRow["InternalName"] || ""}
//                                         onChange={e => setEditRow(r => ({ ...r, "InternalName": e.target.value }))}
//                                     />
//                                 </div>

//                                 {/* Stock UOM */}
//                                 <div className="flex items-center">
//                                     <label className="w-1/3 text-right pr-2 font-bold text-gray-700">Primary UOM:</label>
//                                     <select
//                                         className="w-2/3 border p-1 rounded"
//                                         value={editRow.PrimaryUOM || ""}
//                                         onChange={e =>
//                                             setEditRow(r => ({ ...r, PrimaryUOM: e.target.value }))
//                                         }
//                                     >
//                                         <option value="">-Select-</option>
//                                         {uoms.map(u => (
//                                             <option key={u.code} value={u.code}>
//                                                 {u.name}
//                                             </option>
//                                         ))}
//                                     </select>
//                                 </div>


//                                 {/* Per Unit Cost */}
//                                 <div className="flex items-center">
//                                     <label className="w-1/3 text-right pr-2 font-bold text-gray-700">Per Unit Cost:</label>
//                                     <input
//                                         className="w-2/3 border p-1 rounded"
//                                         type="number"
//                                         value={editRow["PerUnitCost"] || ""}
//                                         onChange={e => setEditRow(r => ({ ...r, "PerUnitCost": e.target.value }))}
//                                     />
//                                 </div>


//                             </div>

//                             {/* --- RIGHT COLUMN --- */}
//                             <div className="flex flex-col gap-3">

//                                 {/* Customer Supplied Product */}
//                                 <div className="flex items-center">
//                                     <label className="w-1/3 text-right pr-2 font-bold text-gray-700">Customer Supplied Product:</label>
//                                     <div className="w-2/3 flex gap-4">
//                                         <label><input type="radio" name="csp" checked={editRow["CustSupplied"] === "Yes"} onChange={() => setEditRow(r => ({ ...r, "CustSupplied": "Yes" }))} /> Yes</label>
//                                         <label><input type="radio" name="csp" checked={editRow["CustSupplied"] === "No"} onChange={() => setEditRow(r => ({ ...r, "CustSupplied": "No" }))} /> No</label>
//                                     </div>
//                                 </div>

//                                 {/* Product Name */}
//                                 <div className="flex items-center">
//                                     <label className="w-1/3 text-right pr-2 font-bold text-gray-700">Product Name:</label>
//                                     <input
//                                         className="w-2/3 border p-1 rounded"
//                                         value={editRow["ProductName"] || ""}
//                                         onChange={e => setEditRow(r => ({ ...r, "ProductName": e.target.value }))}
//                                     />
//                                 </div>

//                                 {/* Shelf life (In Days) */}
//                                 <div className="flex items-center">
//                                     <label className="w-1/3 text-right pr-2 font-bold text-gray-700">Shelf life (In Days):</label>
//                                     <input
//                                         className="w-2/3 border p-1 rounded"
//                                         type="number"
//                                         value={editRow["ShelfLife"] || ""}
//                                         onChange={e => setEditRow(r => ({ ...r, "ShelfLife": e.target.value }))}
//                                     />
//                                 </div>
//                             </div>

//                         </div>
//                         {/* ... Previous "Basic Info" grid closing div ends here ... */}

//                         {/* ================= TAXABLE DETAILS SECTION ================= */}
//                         <div className="mt-4">
//                             {/* 1. HEADER (Clickable) */}
//                             <h3
//                                 className="modal-title flex items-center gap-2 font-bold cursor-pointer select-none"
//                                 style={{ backgroundColor: "#eef2f5", padding: "10px", marginBottom: "0px", color: "#2d3748" }}
//                                 onClick={() => setShowTaxableDetails(!showTaxableDetails)}
//                             >
//                                 {/* Arrow changes based on state */}
//                                 <span style={{ fontSize: "10px", width: "15px", display: "inline-block", textAlign: "center" }}>
//                                     {showTaxableDetails ? "▼" : "▶"}
//                                 </span>
//                                 Taxable Details
//                             </h3>

//                             {/* 2. CONTENT (Hidden unless showTaxableDetails is true) */}
//                             {showTaxableDetails && (
//                                 <div className="modal-body grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-sm pt-4 border-t-0">

//                                     {/* --- LEFT COLUMN --- */}
//                                     <div className="flex flex-col gap-3">

//                                         {/* Taxable Product */}
//                                         <div className="flex items-center">
//                                             <label className="w-1/3 text-right pr-2 font-bold text-gray-700">Taxable Product:</label>
//                                             <div className="w-2/3 flex gap-4 border-l-2 border-red-500 pl-2">
//                                                 <label className="flex items-center gap-1">
//                                                     <input
//                                                         type="radio"
//                                                         name="taxable"
//                                                         checked={editRow["TaxableProduct"] === "Yes"}
//                                                         onChange={() => setEditRow(r => ({ ...r, "TaxableProduct": "Yes" }))}
//                                                     /> Yes
//                                                 </label>
//                                                 <label className="flex items-center gap-1">
//                                                     <input
//                                                         type="radio"
//                                                         name="taxable"
//                                                         checked={editRow["TaxableProduct"] === "No"}
//                                                         onChange={() => setEditRow(r => ({ ...r, "TaxableProduct": "No" }))}
//                                                     /> No
//                                                 </label>
//                                             </div>
//                                         </div>

//                                         {/* Purchase Import Tax Category */}
//                                         <div className="flex items-center">
//                                             <label className="w-1/3 text-right pr-2 font-bold text-gray-700">Purchase Import Tax Category:</label>
//                                             <select
//                                                 className="w-2/3 border p-1 rounded"
//                                                 value={editRow["PurchaseImportTaxCategory"] || ""}
//                                                 onChange={e => setEditRow(r => ({ ...r, "PurchaseImportTaxCategory": e.target.value }))}
//                                             >
//                                                 <option value="">-Select-</option>
//                                                 <option value="Cat1">Category 1</option>
//                                             </select>
//                                         </div>

//                                         {/* Sales Export Tax Category */}
//                                         <div className="flex items-center">
//                                             <label className="w-1/3 text-right pr-2 font-bold text-gray-700">Sales Export Tax Category:</label>
//                                             <select
//                                                 className="w-2/3 border p-1 rounded"
//                                                 value={editRow["SalesExportTaxCategory"] || ""}
//                                                 onChange={e => setEditRow(r => ({ ...r, "SalesExportTaxCategory": e.target.value }))}
//                                             >
//                                                 <option value="">-Select-</option>
//                                                 <option value="Cat1">Category 1</option>
//                                             </select>
//                                         </div>

//                                         {/* STO Tax Category */}
//                                         <div className="flex items-center">
//                                             <label className="w-1/3 text-right pr-2 font-bold text-gray-700">STO Tax Category:</label>
//                                             <select
//                                                 className="w-2/3 border p-1 rounded"
//                                                 value={editRow["STOTaxCategory"] || ""}
//                                                 onChange={e => setEditRow(r => ({ ...r, "STOTaxCategory": e.target.value }))}
//                                             >
//                                                 <option value="">-Select-</option>
//                                                 <option value="Cat1">Category 1</option>
//                                             </select>
//                                         </div>

//                                         {/* HSN Code */}
//                                         <div className="flex items-center">
//                                             <label className="w-1/3 text-right pr-2 font-bold text-gray-700">HSN Code:</label>
//                                             <div className="w-2/3 relative flex items-center">
//                                                 <input
//                                                     className="w-full border p-1 rounded pr-8"
//                                                     value={editRow["HSNCode"] || ""}
//                                                     onChange={e => setEditRow(r => ({ ...r, "HSNCode": e.target.value }))}
//                                                 />
//                                                 <button className="absolute right-2 text-gray-500 hover:text-black font-bold">☰</button>
//                                             </div>
//                                         </div>

//                                     </div>

//                                     {/* --- RIGHT COLUMN --- */}
//                                     <div className="flex flex-col gap-3">

//                                         {/* Assessable Value */}
//                                         <div className="flex items-center">
//                                             <label className="w-1/3 text-right pr-2 font-bold text-gray-700">Assessable Value:</label>
//                                             <input
//                                                 className="w-2/3 border p-1 rounded"
//                                                 value={editRow["AssessableValue"] || ""}
//                                                 onChange={e => setEditRow(r => ({ ...r, "AssessableValue": e.target.value }))}
//                                             />
//                                         </div>

//                                         {/* Purchase Domestic Tax Category */}
//                                         <div className="flex items-center">
//                                             <label className="w-1/3 text-right pr-2 font-bold text-gray-700">Purchase Domestic Tax Category:</label>
//                                             <select
//                                                 className="w-2/3 border p-1 rounded"
//                                                 value={editRow["PurchaseDomesticTaxCategory"] || ""}
//                                                 onChange={e => setEditRow(r => ({ ...r, "PurchaseDomesticTaxCategory": e.target.value }))}
//                                             >
//                                                 <option value="">-Select-</option>
//                                                 <option value="Cat1">Category 1</option>
//                                             </select>
//                                         </div>

//                                         {/* Sales Domestic Tax Category */}
//                                         <div className="flex items-center">
//                                             <label className="w-1/3 text-right pr-2 font-bold text-gray-700">Sales Domestic Tax Category:</label>
//                                             <select
//                                                 className="w-2/3 border p-1 rounded"
//                                                 value={editRow["SalesDomesticTaxCategory"] || ""}
//                                                 onChange={e => setEditRow(r => ({ ...r, "SalesDomesticTaxCategory": e.target.value }))}
//                                             >
//                                                 <option value="">-Select-</option>
//                                                 <option value="Cat1">Category 1</option>
//                                             </select>
//                                         </div>

//                                         {/* GST TDS */}
//                                         <div className="flex items-center">
//                                             <label className="w-1/3 text-right pr-2 font-bold text-gray-700">GST TDS:</label>
//                                             <select
//                                                 className="w-2/3 border p-1 rounded"
//                                                 value={editRow["GSTTDS"] || ""}
//                                                 onChange={e => setEditRow(r => ({ ...r, "GSTTDS": e.target.value }))}
//                                             >
//                                                 <option value="">-Select-</option>
//                                                 <option value="Applicable">Applicable</option>
//                                                 <option value="Not Applicable">Not Applicable</option>
//                                             </select>
//                                         </div>

//                                         {/* SAC Code */}
//                                         <div className="flex items-center">
//                                             <label className="w-1/3 text-right pr-2 font-bold text-gray-700">SAC Code:</label>
//                                             <div className="w-2/3 relative flex items-center">
//                                                 <input
//                                                     className="w-full border p-1 rounded pr-8"
//                                                     value={editRow["SACCode"] || ""}
//                                                     onChange={e => setEditRow(r => ({ ...r, "SACCode": e.target.value }))}
//                                                 />
//                                                 <button className="absolute right-2 text-gray-500 hover:text-black font-bold">☰</button>
//                                             </div>
//                                         </div>

//                                     </div>
//                                 </div>
//                             )}
//                         </div>

//                         {/* ================= INVENTORY DETAILS SECTION ================= */}
//                         <div className="mt-4">
//                             {/* 1. Header Button */}
//                             <h3
//                                 className="modal-title flex items-center gap-2 font-bold cursor-pointer select-none"
//                                 style={{ backgroundColor: "#eef2f5", padding: "10px", marginBottom: "0px", color: "#2d3748" }}
//                                 onClick={() => setShowInventoryDetails(!showInventoryDetails)}
//                             >
//                                 <span style={{ fontSize: "10px", width: "15px", display: "inline-block", textAlign: "center" }}>
//                                     {showInventoryDetails ? "▼" : "▶"}
//                                 </span>
//                                 Inventory Details
//                             </h3>

//                             {/* 2. Content Body */}
//                             {showInventoryDetails && (
//                                 <div className="modal-body grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-sm pt-4 border-t-0">

//                                     {/* --- LEFT COLUMN --- */}
//                                     <div className="flex flex-col gap-3">

//                                         {/* Disc. When Inv. Not Available */}
//                                         <div className="flex items-center">
//                                             <label className="w-1/3 text-right pr-2 font-bold text-gray-700">Disc. When Inv. Not Available:</label>
//                                             <div className="w-2/3 flex gap-4">
//                                                 <label className="flex items-center gap-1">
//                                                     <input
//                                                         type="radio"
//                                                         name="discInv"
//                                                         checked={editRow["DiscWhenInvNotAvailable"] === "Yes"}
//                                                         onChange={() => setEditRow(r => ({ ...r, "DiscWhenInvNotAvailable": "Yes" }))}
//                                                     /> Yes
//                                                 </label>
//                                                 <label className="flex items-center gap-1">
//                                                     <input
//                                                         type="radio"
//                                                         name="discInv"
//                                                         checked={editRow["DiscWhenInvNotAvailable"] === "No"}
//                                                         onChange={() => setEditRow(r => ({ ...r, "DiscWhenInvNotAvailable": "No" }))}
//                                                     /> No
//                                                 </label>
//                                             </div>
//                                         </div>

//                                         {/* Requirement Method */}
//                                         <div className="flex items-center">
//                                             <label className="w-1/3 text-right pr-2 font-bold text-gray-700">Requirement Method:</label>
//                                             <select
//                                                 className="w-2/3 border p-1 rounded"
//                                                 value={editRow["RequirementMethod"] || ""}
//                                                 onChange={e => setEditRow(r => ({ ...r, "RequirementMethod": e.target.value }))}
//                                             >
//                                                 <option value="">-Select-</option>
//                                                 <option value="Method1">Method 1</option>
//                                             </select>
//                                         </div>

//                                         {/* Purchase Positive Tolerance (%) */}
//                                         <div className="flex items-center">
//                                             <label className="w-1/3 text-right pr-2 font-bold text-gray-700">Purchase Positive Tolerance (%):</label>
//                                             <input
//                                                 className="w-2/3 border p-1 rounded"
//                                                 type="number"
//                                                 value={editRow["PurchasePositiveTolerance"] || ""}
//                                                 onChange={e => setEditRow(r => ({ ...r, "PurchasePositiveTolerance": e.target.value }))}
//                                             />
//                                         </div>

//                                     </div>

//                                     {/* --- RIGHT COLUMN --- */}
//                                     <div className="flex flex-col gap-3">

//                                         {/* Require Inventory */}
//                                         <div className="flex items-center">
//                                             <label className="w-1/3 text-right pr-2 font-bold text-gray-700">Require Inventory:</label>
//                                             <div className="w-2/3 flex gap-4">
//                                                 <label className="flex items-center gap-1">
//                                                     <input
//                                                         type="radio"
//                                                         name="reqInv"
//                                                         checked={editRow["RequireInventory"] === "Yes"}
//                                                         onChange={() => setEditRow(r => ({ ...r, "RequireInventory": "Yes" }))}
//                                                     /> Yes
//                                                 </label>
//                                                 <label className="flex items-center gap-1">
//                                                     <input
//                                                         type="radio"
//                                                         name="reqInv"
//                                                         checked={editRow["RequireInventory"] === "No"}
//                                                         onChange={() => setEditRow(r => ({ ...r, "RequireInventory": "No" }))}
//                                                     /> No
//                                                 </label>
//                                             </div>
//                                         </div>

//                                         {/* Spacer Div to align the bottom inputs (Matches height of 'Requirement Method' on left) */}
//                                         <div className="hidden md:flex items-center h-8">
//                                             {/* Empty space to push the next input down */}
//                                         </div>

//                                         {/* Purchase Negative Tolerance (%) */}
//                                         <div className="flex items-center">
//                                             <label className="w-1/3 text-right pr-2 font-bold text-gray-700">Purchase Negative Tolerance (%):</label>
//                                             <input
//                                                 className="w-2/3 border p-1 rounded"
//                                                 type="number"
//                                                 value={editRow["PurchaseNegativeTolerance"] || ""}
//                                                 onChange={e => setEditRow(r => ({ ...r, "PurchaseNegativeTolerance": e.target.value }))}
//                                             />
//                                         </div>

//                                     </div>
//                                 </div>
//                             )}
//                         </div>
//                         {/* ================= END INVENTORY DETAILS ================= */}

//                         {/* ================= MEASUREMENT DETAILS SECTION ================= */}
//                         <div className="mt-4">
//                             {/* 1. Header Button */}
//                             <h3
//                                 className="modal-title flex items-center gap-2 font-bold cursor-pointer select-none"
//                                 style={{ backgroundColor: "#eef2f5", padding: "10px", marginBottom: "0px", color: "#2d3748" }}
//                                 onClick={() => setShowMeasurementDetails(!showMeasurementDetails)}
//                             >
//                                 <span style={{ fontSize: "10px", width: "15px", display: "inline-block", textAlign: "center" }}>
//                                     {showMeasurementDetails ? "▼" : "▶"}
//                                 </span>
//                                 Measurement Details
//                             </h3>

//                             {/* 2. Content Body */}
//                             {showMeasurementDetails && (
//                                 <div className="modal-body grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-sm pt-4 border-t-0">

//                                     {/* --- LEFT COLUMN --- */}
//                                     <div className="flex flex-col gap-3">

//                                         {/* Height */}
//                                         <div className="flex items-center">
//                                             <label className="w-1/3 text-right pr-2 font-bold text-gray-700">Height:</label>
//                                             <input
//                                                 className="w-2/3 border p-1 rounded"
//                                                 type="number"
//                                                 value={editRow["Height"] || ""}
//                                                 onChange={e => setEditRow(r => ({ ...r, "Height": e.target.value }))}
//                                             />
//                                         </div>

//                                         {/* Width */}
//                                         <div className="flex items-center">
//                                             <label className="w-1/3 text-right pr-2 font-bold text-gray-700">Width:</label>
//                                             <input
//                                                 className="w-2/3 border p-1 rounded"
//                                                 type="number"
//                                                 value={editRow["Width"] || ""}
//                                                 onChange={e => setEditRow(r => ({ ...r, "Width": e.target.value }))}
//                                             />
//                                         </div>

//                                         {/* Depth */}
//                                         <div className="flex items-center">
//                                             <label className="w-1/3 text-right pr-2 font-bold text-gray-700">Depth:</label>
//                                             <input
//                                                 className="w-2/3 border p-1 rounded"
//                                                 type="number"
//                                                 value={editRow["Depth"] || ""}
//                                                 onChange={e => setEditRow(r => ({ ...r, "Depth": e.target.value }))}
//                                             />
//                                         </div>

//                                         {/* Diameter */}
//                                         <div className="flex items-center">
//                                             <label className="w-1/3 text-right pr-2 font-bold text-gray-700">Diameter:</label>
//                                             <input
//                                                 className="w-2/3 border p-1 rounded"
//                                                 type="number"
//                                                 value={editRow["Diameter"] || ""}
//                                                 onChange={e => setEditRow(r => ({ ...r, "Diameter": e.target.value }))}
//                                             />
//                                         </div>

//                                         {/* Weight */}
//                                         <div className="flex items-center">
//                                             <label className="w-1/3 text-right pr-2 font-bold text-gray-700">Weight:</label>
//                                             <input
//                                                 className="w-2/3 border p-1 rounded"
//                                                 type="number"
//                                                 value={editRow["Weight"] || ""}
//                                                 onChange={e => setEditRow(r => ({ ...r, "Weight": e.target.value }))}
//                                             />
//                                         </div>

//                                     </div>

//                                     {/* --- RIGHT COLUMN --- */}
//                                     <div className="flex flex-col gap-3">

//                                         {/* Height UOM */}
//                                         <div className="flex items-center">
//                                             <label className="w-1/3 text-right pr-2 font-bold text-gray-700">Height UOM:</label>
//                                             <select
//                                                 className="w-2/3 border p-1 rounded"
//                                                 value={editRow["HeightUOM"] || ""}
//                                                 onChange={e => setEditRow(r => ({ ...r, "HeightUOM": e.target.value }))}
//                                             >
//                                                 <option value="">-Select-</option>
//                                                 <option value="CM">CM</option>
//                                                 <option value="INCH">INCH</option>
//                                             </select>
//                                         </div>

//                                         {/* Width UOM */}
//                                         <div className="flex items-center">
//                                             <label className="w-1/3 text-right pr-2 font-bold text-gray-700">Width UOM:</label>
//                                             <select
//                                                 className="w-2/3 border p-1 rounded"
//                                                 value={editRow["WidthUOM"] || ""}
//                                                 onChange={e => setEditRow(r => ({ ...r, "WidthUOM": e.target.value }))}
//                                             >
//                                                 <option value="">-Select-</option>
//                                                 <option value="CM">CM</option>
//                                                 <option value="INCH">INCH</option>
//                                             </select>
//                                         </div>

//                                         {/* Depth UOM */}
//                                         <div className="flex items-center">
//                                             <label className="w-1/3 text-right pr-2 font-bold text-gray-700">Depth UOM:</label>
//                                             <select
//                                                 className="w-2/3 border p-1 rounded"
//                                                 value={editRow["DepthUOM"] || ""}
//                                                 onChange={e => setEditRow(r => ({ ...r, "DepthUOM": e.target.value }))}
//                                             >
//                                                 <option value="">-Select-</option>
//                                                 <option value="CM">CM</option>
//                                                 <option value="INCH">INCH</option>
//                                             </select>
//                                         </div>

//                                         {/* Diameter UOM */}
//                                         <div className="flex items-center">
//                                             <label className="w-1/3 text-right pr-2 font-bold text-gray-700">Diameter UOM:</label>
//                                             <select
//                                                 className="w-2/3 border p-1 rounded"
//                                                 value={editRow["DiameterUOM"] || ""}
//                                                 onChange={e => setEditRow(r => ({ ...r, "DiameterUOM": e.target.value }))}
//                                             >
//                                                 <option value="">-Select-</option>
//                                                 <option value="CM">CM</option>
//                                                 <option value="INCH">INCH</option>
//                                             </select>
//                                         </div>

//                                         {/* Weight UOM */}
//                                         <div className="flex items-center">
//                                             <label className="w-1/3 text-right pr-2 font-bold text-gray-700">Weight UOM:</label>
//                                             <select
//                                                 className="w-2/3 border p-1 rounded"
//                                                 value={editRow["WeightUOM"] || ""}
//                                                 onChange={e => setEditRow(r => ({ ...r, "WeightUOM": e.target.value }))}
//                                             >
//                                                 <option value="">-Select-</option>
//                                                 <option value="KG">KG</option>
//                                                 <option value="LBS">LBS</option>
//                                             </select>
//                                         </div>

//                                     </div>
//                                 </div>
//                             )}
//                         </div>
//                         {/* ================= END MEASUREMENT DETAILS ================= */}

//                         {/* ================= SALES & SHIPPING DETAILS SECTION ================= */}
//                         <div className="mt-4">
//                             {/* 1. Header Button */}
//                             <h3
//                                 className="modal-title flex items-center gap-2 font-bold cursor-pointer select-none"
//                                 style={{ backgroundColor: "#eef2f5", padding: "10px", marginBottom: "0px", color: "#2d3748" }}
//                                 onClick={() => setShowSalesShippingDetails(!showSalesShippingDetails)}
//                             >
//                                 <span style={{ fontSize: "10px", width: "15px", display: "inline-block", textAlign: "center" }}>
//                                     {showSalesShippingDetails ? "▼" : "▶"}
//                                 </span>
//                                 Sales & Shipping Details
//                             </h3>

//                             {/* 2. Content Body */}
//                             {showSalesShippingDetails && (
//                                 <div className="modal-body grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-sm pt-4 border-t-0">

//                                     {/* --- LEFT COLUMN --- */}
//                                     <div className="flex flex-col gap-3">

//                                         {/* Returnable */}
//                                         <div className="flex items-center">
//                                             <label className="w-1/3 text-right pr-2 font-bold text-gray-700">Returnable:</label>
//                                             <div className="w-2/3 flex gap-4">
//                                                 <label className="flex items-center gap-1">
//                                                     <input
//                                                         type="radio"
//                                                         name="returnable"
//                                                         checked={editRow["Returnable"] === "Yes"}
//                                                         onChange={() => setEditRow(r => ({ ...r, "Returnable": "Yes" }))}
//                                                     /> Yes
//                                                 </label>
//                                                 <label className="flex items-center gap-1">
//                                                     <input
//                                                         type="radio"
//                                                         name="returnable"
//                                                         checked={editRow["Returnable"] === "No"}
//                                                         onChange={() => setEditRow(r => ({ ...r, "Returnable": "No" }))}
//                                                     /> No
//                                                 </label>
//                                             </div>
//                                         </div>

//                                         {/* Auto Create Keywords */}
//                                         <div className="flex items-center">
//                                             <label className="w-1/3 text-right pr-2 font-bold text-gray-700">Auto Create Keywords:</label>
//                                             <div className="w-2/3 flex gap-4">
//                                                 <label className="flex items-center gap-1">
//                                                     <input
//                                                         type="radio"
//                                                         name="autoKey"
//                                                         checked={editRow["AutoCreateKeywords"] === "Yes"}
//                                                         onChange={() => setEditRow(r => ({ ...r, "AutoCreateKeywords": "Yes" }))}
//                                                     /> Yes
//                                                 </label>
//                                                 <label className="flex items-center gap-1">
//                                                     <input
//                                                         type="radio"
//                                                         name="autoKey"
//                                                         checked={editRow["AutoCreateKeywords"] === "No"}
//                                                         onChange={() => setEditRow(r => ({ ...r, "AutoCreateKeywords": "No" }))}
//                                                     /> No
//                                                 </label>
//                                             </div>
//                                         </div>

//                                         {/* Pieces Included */}
//                                         <div className="flex items-center">
//                                             <label className="w-1/3 text-right pr-2 font-bold text-gray-700">Pieces Included:</label>
//                                             <input
//                                                 className="w-2/3 border p-1 rounded"
//                                                 value={editRow["PiecesIncluded"] || ""}
//                                                 onChange={e => setEditRow(r => ({ ...r, "PiecesIncluded": e.target.value }))}
//                                             />
//                                         </div>

//                                         {/* Box Shipping */}
//                                         <div className="flex items-center">
//                                             <label className="w-1/3 text-right pr-2 font-bold text-gray-700">Box Shipping:</label>
//                                             <div className="w-2/3 flex gap-4">
//                                                 <label className="flex items-center gap-1">
//                                                     <input
//                                                         type="radio"
//                                                         name="boxShip"
//                                                         checked={editRow["BoxShipping"] === "Yes"}
//                                                         onChange={() => setEditRow(r => ({ ...r, "BoxShipping": "Yes" }))}
//                                                     /> Yes
//                                                 </label>
//                                                 <label className="flex items-center gap-1">
//                                                     <input
//                                                         type="radio"
//                                                         name="boxShip"
//                                                         checked={editRow["BoxShipping"] === "No"}
//                                                         onChange={() => setEditRow(r => ({ ...r, "BoxShipping": "No" }))}
//                                                     /> No
//                                                 </label>
//                                             </div>
//                                         </div>

//                                     </div>

//                                     {/* --- RIGHT COLUMN --- */}
//                                     <div className="flex flex-col gap-3">

//                                         {/* Include In Promo */}
//                                         <div className="flex items-center">
//                                             <label className="w-1/3 text-right pr-2 font-bold text-gray-700">Include In Promo:</label>
//                                             <div className="w-2/3 flex gap-4">
//                                                 <label className="flex items-center gap-1">
//                                                     <input
//                                                         type="radio"
//                                                         name="promo"
//                                                         checked={editRow["IncludeInPromo"] === "Yes"}
//                                                         onChange={() => setEditRow(r => ({ ...r, "IncludeInPromo": "Yes" }))}
//                                                     /> Yes
//                                                 </label>
//                                                 <label className="flex items-center gap-1">
//                                                     <input
//                                                         type="radio"
//                                                         name="promo"
//                                                         checked={editRow["IncludeInPromo"] === "No"}
//                                                         onChange={() => setEditRow(r => ({ ...r, "IncludeInPromo": "No" }))}
//                                                     /> No
//                                                 </label>
//                                             </div>
//                                         </div>

//                                         {/* Allow Decimal Qty. */}
//                                         <div className="flex items-center">
//                                             <label className="w-1/3 text-right pr-2 font-bold text-gray-700">Allow Decimal Qty.:</label>
//                                             <div className="w-2/3 flex gap-4">
//                                                 <label className="flex items-center gap-1">
//                                                     <input
//                                                         type="radio"
//                                                         name="decQty"
//                                                         checked={editRow["AllowDecimalQty"] === "Yes"}
//                                                         onChange={() => setEditRow(r => ({ ...r, "AllowDecimalQty": "Yes" }))}
//                                                     /> Yes
//                                                 </label>
//                                                 <label className="flex items-center gap-1">
//                                                     <input
//                                                         type="radio"
//                                                         name="decQty"
//                                                         checked={editRow["AllowDecimalQty"] === "No"}
//                                                         onChange={() => setEditRow(r => ({ ...r, "AllowDecimalQty": "No" }))}
//                                                     /> No
//                                                 </label>
//                                             </div>
//                                         </div>

//                                         {/* Default Shipment Box Type */}
//                                         <div className="flex items-center">
//                                             <label className="w-1/3 text-right pr-2 font-bold text-gray-700">Default Shipment Box Type:</label>
//                                             <select
//                                                 className="w-2/3 border p-1 rounded"
//                                                 value={editRow["DefaultShipmentBoxType"] || ""}
//                                                 onChange={e => setEditRow(r => ({ ...r, "DefaultShipmentBoxType": e.target.value }))}
//                                             >
//                                                 <option value="">-Select-</option>
//                                                 <option value="CARTON">CARTON</option>
//                                                 <option value="PALLET">PALLET</option>
//                                             </select>
//                                         </div>

//                                         {/* Charge Shipping */}
//                                         <div className="flex items-center">
//                                             <label className="w-1/3 text-right pr-2 font-bold text-gray-700">Charge Shipping:</label>
//                                             <div className="w-2/3 flex gap-4">
//                                                 <label className="flex items-center gap-1">
//                                                     <input
//                                                         type="radio"
//                                                         name="chargeShip"
//                                                         checked={editRow["ChargeShipping"] === "Yes"}
//                                                         onChange={() => setEditRow(r => ({ ...r, "ChargeShipping": "Yes" }))}
//                                                     /> Yes
//                                                 </label>
//                                                 <label className="flex items-center gap-1">
//                                                     <input
//                                                         type="radio"
//                                                         name="chargeShip"
//                                                         checked={editRow["ChargeShipping"] === "No"}
//                                                         onChange={() => setEditRow(r => ({ ...r, "ChargeShipping": "No" }))}
//                                                     /> No
//                                                 </label>
//                                             </div>
//                                         </div>

//                                     </div>
//                                 </div>
//                             )}
//                         </div>
//                         {/* ================= END SALES & SHIPPING DETAILS ================= */}

//                         {/* ================= OTHER DETAILS SECTION ================= */}
//                         <div className="mt-4">
//                             {/* 1. Header Button */}
//                             <h3
//                                 className="modal-title flex items-center gap-2 font-bold cursor-pointer select-none"
//                                 style={{ backgroundColor: "#eef2f5", padding: "10px", marginBottom: "0px", color: "#2d3748" }}
//                                 onClick={() => setShowOtherDetails(!showOtherDetails)}
//                             >
//                                 <span style={{ fontSize: "10px", width: "15px", display: "inline-block", textAlign: "center" }}>
//                                     {showOtherDetails ? "▼" : "▶"}
//                                 </span>
//                                 Other Details
//                             </h3>

//                             {/* 2. Content Body */}
//                             {showOtherDetails && (
//                                 <div className="modal-body grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-sm pt-4 border-t-0">

//                                     {/* --- LEFT COLUMN --- */}
//                                     <div className="flex flex-col gap-3">

//                                         {/* Rating Type */}
//                                         <div className="flex items-center">
//                                             <label className="w-1/3 text-right pr-2 font-bold text-gray-700">Rating Type:</label>
//                                             <select
//                                                 className="w-2/3 border p-1 rounded"
//                                                 value={editRow["RatingType"] || ""}
//                                                 onChange={e => setEditRow(r => ({ ...r, "RatingType": e.target.value }))}
//                                             >
//                                                 <option value="">-Select-</option>
//                                                 <option value="Type1">Type 1</option>
//                                                 <option value="Type2">Type 2</option>
//                                             </select>
//                                         </div>

//                                         {/* Required Amount */}
//                                         <div className="flex items-center">
//                                             <label className="w-1/3 text-right pr-2 font-bold text-gray-700">Required Amount:</label>
//                                             <div className="w-2/3 flex gap-4">
//                                                 <label className="flex items-center gap-1">
//                                                     <input
//                                                         type="radio"
//                                                         name="reqAmount"
//                                                         checked={editRow["RequiredAmount"] === "Yes"}
//                                                         onChange={() => setEditRow(r => ({ ...r, "RequiredAmount": "Yes" }))}
//                                                     /> Yes
//                                                 </label>
//                                                 <label className="flex items-center gap-1">
//                                                     <input
//                                                         type="radio"
//                                                         name="reqAmount"
//                                                         checked={editRow["RequiredAmount"] === "No"}
//                                                         onChange={() => setEditRow(r => ({ ...r, "RequiredAmount": "No" }))}
//                                                     /> No
//                                                 </label>
//                                             </div>
//                                         </div>

//                                         {/* Introduction Date */}
//                                         <div className="flex items-center">
//                                             <label className="w-1/3 text-right pr-2 font-bold text-gray-700">Introduction Date:</label>
//                                             <input
//                                                 className="w-2/3 border p-1 rounded"
//                                                 placeholder="(DD/MM/YYYY)"
//                                                 value={editRow["IntroductionDate"] || ""}
//                                                 onChange={e => setEditRow(r => ({ ...r, "IntroductionDate": e.target.value }))}
//                                             />
//                                         </div>

//                                         {/* Sales End Date */}
//                                         <div className="flex items-center">
//                                             <label className="w-1/3 text-right pr-2 font-bold text-gray-700">Sales End Date:</label>
//                                             <input
//                                                 className="w-2/3 border p-1 rounded"
//                                                 placeholder="(DD/MM/YYYY)"
//                                                 value={editRow["SalesEndDate"] || ""}
//                                                 onChange={e => setEditRow(r => ({ ...r, "SalesEndDate": e.target.value }))}
//                                             />
//                                         </div>

//                                     </div>

//                                     {/* --- RIGHT COLUMN --- */}
//                                     <div className="flex flex-col gap-3">

//                                         {/* Rating */}
//                                         <div className="flex items-center">
//                                             <label className="w-1/3 text-right pr-2 font-bold text-gray-700">Rating:</label>
//                                             <input
//                                                 className="w-2/3 border p-1 rounded"
//                                                 value={editRow["Rating"] || ""}
//                                                 onChange={e => setEditRow(r => ({ ...r, "Rating": e.target.value }))}
//                                             />
//                                         </div>

//                                         {/* Amount UOM */}
//                                         <div className="flex items-center">
//                                             <label className="w-1/3 text-right pr-2 font-bold text-gray-700">Amount UOM:</label>
//                                             <select
//                                                 className="w-2/3 border p-1 rounded"
//                                                 value={editRow["AmountUOM"] || ""}
//                                                 onChange={e => setEditRow(r => ({ ...r, "AmountUOM": e.target.value }))}
//                                             >
//                                                 <option value="">-Select-</option>
//                                                 <option value="UOM1">UOM 1</option>
//                                                 <option value="UOM2">UOM 2</option>
//                                             </select>
//                                         </div>

//                                         {/* Release Date */}
//                                         <div className="flex items-center">
//                                             <label className="w-1/3 text-right pr-2 font-bold text-gray-700">Release Date:</label>
//                                             <input
//                                                 className="w-2/3 border p-1 rounded"
//                                                 placeholder="(DD/MM/YYYY)"
//                                                 value={editRow["ReleaseDate"] || ""}
//                                                 onChange={e => setEditRow(r => ({ ...r, "ReleaseDate": e.target.value }))}
//                                             />
//                                         </div>

//                                         {/* Support End Date */}
//                                         <div className="flex items-center">
//                                             <label className="w-1/3 text-right pr-2 font-bold text-gray-700">Support End Date:</label>
//                                             <input
//                                                 className="w-2/3 border p-1 rounded"
//                                                 placeholder="(DD/MM/YYYY)"
//                                                 value={editRow["SupportEndDate"] || ""}
//                                                 onChange={e => setEditRow(r => ({ ...r, "SupportEndDate": e.target.value }))}
//                                             />
//                                         </div>

//                                     </div>
//                                 </div>
//                             )}
//                         </div>
//                         {/* ================= END OTHER DETAILS ================= */}

//                         {/* ================= LONG DESCRIPTION SECTION ================= */}
//                         <div className="mt-4">
//                             {/* 1. Header Button */}
//                             <h3
//                                 className="modal-title flex items-center gap-2 font-bold cursor-pointer select-none"
//                                 style={{ backgroundColor: "#eef2f5", padding: "10px", marginBottom: "0px", color: "#2d3748" }}
//                                 onClick={() => setShowLongDescription(!showLongDescription)}
//                             >
//                                 <span style={{ fontSize: "10px", width: "15px", display: "inline-block", textAlign: "center" }}>
//                                     {showLongDescription ? "▼" : "▶"}
//                                 </span>
//                                 Long Description
//                             </h3>

//                             {/* 2. Content Body */}
//                             {showLongDescription && (
//                                 <div className="modal-body text-sm pt-4 border-t-0">

//                                     {/* Description Field - Full Width */}
//                                     <div className="flex items-start">
//                                         {/* Label width set to 16.6% to align with the left-column labels above */}
//                                         <label className="w-1/6 text-right pr-2 font-bold text-gray-700 mt-1">Description:</label>
//                                         <textarea
//                                             className="w-5/6 border p-1 rounded"
//                                             rows={3}
//                                             value={editRow["LongDescription"] || ""}
//                                             onChange={e => setEditRow(r => ({ ...r, "LongDescription": e.target.value }))}
//                                         />
//                                     </div>

//                                 </div>
//                             )}
//                         </div>
//                         {/* ================= END LONG DESCRIPTION ================= */}

//                         {/* ================= END TAXABLE DETAILS ================= */}

//                         <div className="modal-actions mt-4 pt-4 border-t flex justify-end gap-2">
//                             <button className="px-4 py-1 border rounded" onClick={() => setEditRow(null)}>Cancel</button>
//                             <button className="btn primary px-4 py-1 bg-blue-600 text-white rounded" onClick={handleSave}>
//                                 Save
//                             </button>
//                         </div>
//                     </div>
//                 </div>
//             )}