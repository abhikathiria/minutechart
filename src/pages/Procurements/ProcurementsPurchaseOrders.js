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

function calculateRow(row) {
    const grnQty = Number(row.GRN_Qty) || 0;
    const rate = Number(row.Rate) || 0;
    const discPer = Number(row.Disc_Per) || 0;
    const discountAmt = (grnQty * rate) * discPer / 100;

    const cgPer = Number(row.CG_Per) || 0;
    const sgPer = Number(row.SG_Per) || 0;
    const igPer = Number(row.IG_Per) || 0;

    // Base Amount
    let amount = grnQty * rate;
    amount = amount - (amount * discPer / 100);

    const cgAmt = amount * cgPer / 100;
    const sgAmt = amount * sgPer / 100;
    const igAmt = amount * igPer / 100;

    const netAmt = amount + cgAmt + sgAmt + igAmt;

    return {
        ...row,
        Disc_Amt: discountAmt.toFixed(2),
        Amount: amount.toFixed(2),
        CG_Amt: cgAmt.toFixed(2),
        SG_Amt: sgAmt.toFixed(2),
        IG_Amt: igAmt.toFixed(2),
        Net_Amt: netAmt.toFixed(2)
    };
}

/* ---------- SQL PARAM PARSER ---------- */
function extractSqlParams(sql) {
    if (!sql) return [];
    const matches = sql.match(/@\w+/g) || [];
    return [...new Set(matches.map(p => p.substring(1)))];
}

export default function ProcurementsPurchaseOrders() {
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

    const [insertQuery, setInsertQuery] = useState("");
    const [updateQuery, setUpdateQuery] = useState("");
    const [primaryKey, setPrimaryKey] = useState("");
    const [isEditMode, setIsEditMode] = useState(false);

    const currencies = Intl.supportedValuesOf("currency");
    const [poNumberLoading, setPoNumberLoading] = useState(false);
    const getTodayISO = () => new Date().toISOString().slice(0, 10);
    const [activeRowIndex, setActiveRowIndex] = useState(null);

    const [partySearch, setPartySearch] = useState({
        code: "",
        name: "",
        gst: "",
        add: ""
    });
    const [party, setParty] = useState([]);
    const [showParty, setShowParty] = useState(false);

    const [agentSearch, setAgentSearch] = useState({
        code: "",
        name: ""
    });
    const [agent, setAgent] = useState([]);
    const [showAgent, setShowAgent] = useState(false);

    const [storeSearch, setStoreSearch] = useState({
        code: "",
        name: "",
        loc_code: "",
        series: ""
    });
    const [store, setStore] = useState([]);
    const [showStore, setShowStore] = useState(false);

    const [itemSearch, setItemSearch] = useState({
        code: "",
        name: "",
        uom: ""
    });
    const [poItems, setPoItems] = useState([]);
    const [item, setItem] = useState([]);
    const [showItem, setShowItem] = useState(false);

    const [deptSearch, setDeptSearch] = useState({
        code: "",
        name: ""
    });
    const [department, setDepartment] = useState([]);
    const [showDepartment, setShowDepartment] = useState(false);

    const [costCenterSearch, setCostCenterSearch] = useState({
        code: "",
        name: ""
    });
    const [costCenter, setCostCenter] = useState([]);
    const [showCostCenter, setShowCostCenter] = useState(false);

    const [shadeSearch, setShadeSearch] = useState({
        code: "",
        cost: ""
    });
    const [shade, setShade] = useState([]);
    const [showShade, setShowShade] = useState(false);

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
                const modulesRes = await api.get(`/procurements/purchase-orders/user/${userId}/queries`);
                const modules = modulesRes.data || [];
                if (!modules.length) return;

                const module = modules[0];
                setQueryId(module.id);
                setInsertQuery(module.insertQuery || "");
                setUpdateQuery(module.updateQuery || "");
                setPrimaryKey(module.primaryKeyColumn || "");

                const res = await api.get(
                    `/procurements/purchase-orders/run-saved-query/${userId}/${module.id}`
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

    useEffect(() => {
        if (!userId) return;

        api.get(`/procurements/purchase-orders/parties/${userId}`)
            .then(res => setParty(res.data || []))
            .catch(() => setParty([]));
    }, [userId]);

    useEffect(() => {
        if (!userId) return;

        api.get(`/procurements/purchase-orders/agents/${userId}`)
            .then(res => setAgent(res.data || []))
            .catch(() => setAgent([]));
    }, [userId]);

    useEffect(() => {
        if (!userId) return;

        api.get(`/procurements/purchase-orders/stores/${userId}`)
            .then(res => setStore(res.data || []))
            .catch(() => setStore([]));
    }, [userId]);

    useEffect(() => {
        if (!userId) return;

        api.get(`/procurements/purchase-orders/items/${userId}`)
            .then(res => setItem(res.data || []))
            .catch(() => setItem([]));
    }, [userId]);

    useEffect(() => {
        if (!userId) return;

        api.get(`/procurements/purchase-orders/departments/${userId}`)
            .then(res => setDepartment(res.data || []))
            .catch(() => setDepartment([]));
    }, [userId]);

    useEffect(() => {
        if (!userId) return;

        api.get(`/procurements/purchase-orders/costcenters/${userId}`)
            .then(res => setCostCenter(res.data || []))
            .catch(() => setCostCenter([]));
    }, [userId]);

    useEffect(() => {
        if (!userId) return;

        api.get(`/procurements/purchase-orders/shades/${userId}`)
            .then(res => setShade(res.data || []))
            .catch(() => setShade([]));
    }, [userId]);

    const blockInvalidNumberKeys = (e) => {
        // if (["e", "E"].includes(e.key)) {
        if (["e", "E", "+", "-"].includes(e.key)) {
            e.preventDefault();
        }
    };

    const addItemRow = () => {
        setPoItems(items => ([
            ...items,
            {
                ItemCode: "",
                Description: "",
                Merge_No: "",
                Shade: "",
                Remark: "",
                Department: "",
                CostCenter: "",
                UOMCode: "",
                UOMName: "",
                Pend_Qty: "",
                GRN_Qty: "",
                Conv_Unit: "",
                Conv_Qty: "",
                Rate: "",
                Disc_Per: "",
                Amount: "",
                Freight: "",
                CG_Per: "",
                CG_Amt: "",
                SG_Per: "",
                SG_Amt: "",
                IG_Per: "",
                IG_Amt: "",
                Net_Amt: ""

            }
        ]));
    };

    const deleteItemRow = (rowIndex) => {
        setPoItems(items =>
            items.filter((_, i) => i !== rowIndex)
        );
    };

    const openParty = () => {
        setPartySearch({ code: "", name: "", gst: "", add: "" });
        setShowParty(true);
    };

    const selectParty = (p) => {
        setEditRow(r => ({
            ...r,
            PartyCode: String(p.code ?? ""),
            PartyName: String(p.name ?? ""),
            PartyGST: String(p.gst ?? ""),
            PartyAddress: String(p.add ?? "")
        }));

        setShowParty(false);
    };

    const filteredParties = useMemo(() => {
        return party.filter(p =>
            (!partySearch.code ||
                String(p.code ?? "")
                    .toLowerCase()
                    .includes(partySearch.code.toLowerCase())
            ) &&
            (!partySearch.name ||
                String(p.name ?? "")
                    .toLowerCase()
                    .includes(partySearch.name.toLowerCase())
            ) &&
            (!partySearch.gst ||
                String(p.gst ?? "")
                    .toLowerCase()
                    .includes(partySearch.gst.toLowerCase())
            ) &&
            (!partySearch.add ||
                String(p.add ?? "")
                    .toLowerCase()
                    .includes(partySearch.add.toLowerCase())
            )
        );
    }, [party, partySearch]);


    const openAgent = () => {
        setAgentSearch({ code: "", name: "" });
        setShowAgent(true);
    };

    const selectAgent = (a) => {
        setEditRow(r => ({
            ...r,
            AgentCode: a.code,
            AgentName: a.name
        }));

        setShowAgent(false);
    };

    const filteredAgents = useMemo(() => {
        return agent.filter(a =>
            (!agentSearch.code ||
                String(a.code ?? "")
                    .toLowerCase()
                    .includes(agentSearch.code.toLowerCase())
            ) &&
            (!agentSearch.name ||
                String(a.name ?? "")
                    .toLowerCase()
                    .includes(agentSearch.name.toLowerCase())
            )
        );
    }, [agent, agentSearch]);

    const openStore = () => {
        setStoreSearch({ code: "", name: "", loc_code: "", series: "" });
        setShowStore(true);
    };

    const selectStore = (str) => {
        setEditRow(r => ({
            ...r,
            StoreCode: str.code,
            StoreName: str.name,
            StoreLocCode: str.loc_code,
            StoreSeries: str.series
        }));

        setShowStore(false);
    };

    const filteredStores = useMemo(() => {
        return store.filter(str =>
            (!storeSearch.code ||
                String(str.code ?? "")
                    .toLowerCase()
                    .includes(storeSearch.code.toLowerCase())
            ) &&
            (!storeSearch.name ||
                String(str.name ?? "")
                    .toLowerCase()
                    .includes(storeSearch.name.toLowerCase())
            ) &&
            (!storeSearch.loc_code ||
                String(str.loc_code ?? "")
                    .toLowerCase()
                    .includes(storeSearch.loc_code.toLowerCase())
            ) &&
            (!storeSearch.series ||
                String(str.series ?? "")
                    .toLowerCase()
                    .includes(storeSearch.series.toLowerCase())
            )
        );
    }, [store, storeSearch]);

    const openItem = (rowIndex) => {
        setActiveRowIndex(rowIndex);
        setItemSearch({ code: "", name: "", uom: "" });
        setShowItem(true);
    };

    const selectItem = (item) => {
        setPoItems(items =>
            items.map((row, i) =>
                i === activeRowIndex
                    ? {
                        ...row,
                        ItemCode: item.code,
                        Description: item.name,
                        Rate: item.rate,
                        UOMCode: item.uomCode,
                        UOMName: item.uomName
                    }
                    : row
            )
        );

        setShowItem(false);
    };

    const filteredItems = useMemo(() => {
        return item.filter(it =>
            (!itemSearch.code || it.code.toLowerCase().includes(itemSearch.code.toLowerCase())) &&
            (!itemSearch.name || it.name.toLowerCase().includes(itemSearch.name.toLowerCase())) &&
            (!itemSearch.uom || it.uomName.toLowerCase().includes(itemSearch.uom.toLowerCase()))
        );
    }, [item, itemSearch]);

    const openDepartment = (rowIndex) => {
        setActiveRowIndex(rowIndex);
        setDeptSearch({ code: "", name: "" });
        setShowDepartment(true);
    };

    const selectDepartment = (dept) => {
        setPoItems(items =>
            items.map((row, i) =>
                i === activeRowIndex
                    ? {
                        ...row,
                        DepartmentCode: dept.code,
                        DepartmentName: dept.name
                    }
                    : row
            )
        );

        setShowDepartment(false);
    };

    const filteredDepartments = useMemo(() => {
        return department.filter(d =>
            (!deptSearch.code || d.code.toLowerCase().includes(deptSearch.code.toLowerCase())) &&
            (!deptSearch.name || d.name.toLowerCase().includes(deptSearch.name.toLowerCase()))
        );
    }, [department, deptSearch]);

    const openCostCenter = (rowIndex) => {
        setActiveRowIndex(rowIndex);
        setCostCenterSearch({ code: "", name: "" });
        setShowCostCenter(true);
    };

    const selectCostCenter = (cc) => {
        setPoItems(items =>
            items.map((row, i) =>
                i === activeRowIndex
                    ? {
                        ...row,
                        CostCenterCode: cc.code,
                        CostCenterName: cc.name
                    }
                    : row
            )
        );

        setShowCostCenter(false);
    };

    const filteredCostCenters = useMemo(() => {
        return costCenter.filter(c =>
            (!costCenterSearch.code || c.code.toLowerCase().includes(costCenterSearch.code.toLowerCase())) &&
            (!costCenterSearch.name || c.name.toLowerCase().includes(costCenterSearch.name.toLowerCase()))
        );
    }, [costCenter, costCenterSearch]);

    const openShade = (rowIndex) => {
        setActiveRowIndex(rowIndex);
        setShadeSearch({ code: "", cost: "" });
        setShowShade(true);
    };

    const selectShade = (s) => {
        setPoItems(items =>
            items.map((row, i) =>
                i === activeRowIndex
                    ? {
                        ...row,
                        ShadeCode: s.code,
                        ShadeCost: s.cost
                    }
                    : row
            )
        );

        setShowShade(false);
    };

    const filteredShades = useMemo(() => {
        return shade.filter(s =>
            (!shadeSearch.code || s.code.toLowerCase().includes(shadeSearch.code.toLowerCase())) &&
            (!shadeSearch.cost || s.cost.toLowerCase().includes(shadeSearch.cost.toLowerCase()))
        );
    }, [shade, shadeSearch]);

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

    /* ---------- GENERATE PO Number ---------- */
    const generatePoNumber = async (poDate) => {
        if (!userId || !poDate) return;

        try {
            setPoNumberLoading(true);

            const res = await api.post(
                `/procurements/purchase-orders/generate-po-number/${userId}`,
                { poDate }
            );

            if (res.data?.success) {
                setEditRow(r => ({
                    ...r,
                    Po_No: res.data.poNumber,
                    Po_Date: poDate
                }));
            }
        } catch (e) {
            alert("Failed to generate PO number");
        } finally {
            setPoNumberLoading(false);
        }
    };

    const updateHeader = (field, value) => {
        setEditRow(r => ({
            ...r,
            [field]: value
        }));
    };

    const updateItem = (rowIndex, field, value) => {
        setPoItems(items =>
            items.map((r, i) =>
                i === rowIndex ? { ...r, [field]: value } : r
            )
        );
    };


    const buildSavePayload = () => {
        if (!editRow) return null;

        return {
            header: {
                Purchase_Number: editRow.Po_No,
                Purchase_Date: editRow.Po_Date,
                OrderMode: Number(editRow.OrderMode),
                Mode: editRow.Mode || null,

                StoreName: Number(editRow.StoreCode) || null,
                PartyName: Number(editRow.PartyCode),
                AgentName: Number(editRow.AgentCode) || null,

                Reference: editRow.Reference || null,
                RefDate: editRow.RefDate || null,

                Currency: editRow.Currency || "INR",
                CrDays: editRow.Po_CrDays || null,
                DelDays: editRow.POM_DELDays || null,

                DelTerms: editRow.DTerms || null,
                PayTerms: editRow.PTerms || null,
                DispatchIns: editRow.Disp_Ins || null,
                SpNote: editRow.Sp_Note || null,
                Remarks: editRow.Remark || null,

                TotalItem: footerTotals.totalItems,
                TotalQty: Number(footerTotals.totalQty),
                GrossAmount: Number(footerTotals.grossAmt),
                TotalDiscount: Number(footerTotals.totalDisc),
                TaxAmount: Number(footerTotals.taxAmt),
                Freight: Number(footerTotals.totalFreight),
                NetAmount: Number(footerTotals.netAmt)
            },

            items: poItems.map((r, index) => ({
                SrNo: index + 1,

                ItemCode: r.ItemCode,
                Shade: r.ShadeCode || null,
                Remark: r.Remark || null,

                DepartmentName: r.DepartmentCode || null,
                CostCenterName: r.CostCenterCode || null,

                UQC: r.UOMCode,
                GRNQty: Number(r.GRN_Qty || 0),

                Rate: Number(r.Rate || 0),
                Disc: Number(r.Disc_Per || 0),
                Amount: Number(r.Amount || 0),
                Freight: Number(r.Freight || 0),

                CGPer: Number(r.CG_Per || 0),
                CGAmt: Number(r.CG_Amt || 0),

                SGPer: Number(r.SG_Per || 0),
                SGAmt: Number(r.SG_Amt || 0),

                IGPer: Number(r.IG_Per || 0),
                IGAmt: Number(r.IG_Amt || 0)
            }))
        };
    };

    /* ---------- SAVE ---------- */
    const handleSave = async () => {
        if (!editRow?.Po_No || !editRow?.Po_Date) {
            alert("PO Number and Date are required");
            return;
        }

        if (!poItems.length) {
            alert("At least one item is required");
            return;
        }

        const payload = buildSavePayload();

        try {
            if (isEditMode) {
                await api.post(
                    `/procurements/purchase-orders/update/${userId}`,
                    payload
                );
                alert("Purchase Order updated successfully");
            } else {
                await api.post(
                    `/procurements/purchase-orders/save/${userId}`,
                    payload
                );
                alert("Purchase Order saved successfully");
            }

            setEditRow(null);
            setPoItems([]);
            refreshData();
        } catch (e) {
            alert(
                "Operation failed: " +
                (e.response?.data || e.message)
            );
        }
    };

    const loadPoForEdit = async (poNo) => {
        try {
            const encodedPoNo = encodeURIComponent(poNo);
            const res = await api.get(`/procurements/purchase-orders/get/${userId}/${encodedPoNo}`);
            const { header, items } = res.data;

            setIsEditMode(true);

            setEditRow({
                ...header,
                Po_No: header.Po_No,
                // Format dates for HTML input (strips the T00:00:00 timestamp)
                Po_Date: header.PO_Date ? header.PO_Date.split('T')[0] : "",
                RefDate: header.RecDate ? header.RecDate.split('T')[0] : "",
                OrderMode: header.Dept_Code,
                Mode: header.PO_Mode,
                StoreCode: header.P_Str_Code,
                PartyCode: header.P_Code,
                AgentCode: header.POM_BrCode,
                Reference: header.Supp_Ref,
                Currency: header.Curr,
                Po_CrDays: header.PO_CrDays, // Fixed Casing
                POM_DELDays: header.POM_DELDays,
                DTerms: header.DTerms,
                PTerms: header.PTerms,
                Disp_Ins: header.Disp_Ins,
                Sp_Note: header.Sp_Note,
                Remark: header.Remark,
                TotalDiscount: header.Tot_Disc,
                Freight: header.Freight // For footer
            });

            setPoItems(items.map(it => ({
                SrNo: it.SrNo,
                ItemCode: it.I_Code,
                Description: it.ItemName,
                ShadeCode: it.SHADE,
                Remark: it.P_REMARK, // Fixed Casing
                DepartmentCode: it.DEP_CODE,
                CostCenterCode: it.Kh_Code,
                UOMCode: it.UOM,
                UOMName: it.UOMName,
                GRN_Qty: it.Qty, // Mapped to GRN_Qty for calculateRow logic
                Rate: it.Rate,
                Disc_Per: it.Disc,
                Amount: it.Amount,
                Freight: it.Freight || 0,
                CG_Per: it.CGPer,
                CG_Amt: it.CGAmt,
                SG_Per: it.SGPer,
                SG_Amt: it.SGAmt,
                IG_Per: it.IGPer,
                IG_Amt: it.IGAmt,
                // Ensure calculation is reactive
                Net_Amt: (Number(it.Amount) + Number(it.CGAmt) + Number(it.SGAmt) + Number(it.IGAmt)).toFixed(2)
            })));

        } catch (err) {
            console.error("Load Error:", err);
            alert("Failed to load PO for edit");
        }
    };

    const currentPartyName = useMemo(() => {
        const found = party.find(p => String(p.code) === String(editRow?.PartyCode));
        return found ? found.name : "";
    }, [party, editRow?.PartyCode]);

    const currentPartyGst = useMemo(() => {
        const found = party.find(p => String(p.code) === String(editRow?.PartyCode));
        return found ? found.gst : "";
    }, [party, editRow?.PartyCode]);

    const currentPartyAdd = useMemo(() => {
        const found = party.find(p => String(p.code) === String(editRow?.PartyCode));
        return found ? found.add : "";
    }, [party, editRow?.PartyCode]);

    const currentStoreName = useMemo(() => {
        const found = store.find(s => String(s.code) === String(editRow?.StoreCode));
        return found ? found.name : "";
    }, [store, editRow?.StoreCode]);

    const currentAgentName = useMemo(() => {
        const found = agent.find(a => String(a.code) === String(editRow?.AgentCode));
        return found ? found.name : "";
    }, [agent, editRow?.AgentCode]);

    const handleDeletePO = async (poNo) => {
        if (!window.confirm(`Delete PO ${poNo}?`)) return;

        try {
            const encodedPoNo = encodeURIComponent(poNo);

            await api.delete(
                `/procurements/purchase-orders/delete/${userId}/${encodedPoNo}`
            );

            alert("Purchase Order deleted");
            setEditRow(null);
            setPoItems([]);
            refreshData();
        } catch (e) {
            alert("Delete failed");
        }
    };


    const refreshData = async () => {
        const res = await api.get(`/procurements/purchase-orders/run-saved-query/${userId}/${queryId}`);
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

    const updateItemField = (rowIndex, field, value) => {
        setPoItems(items =>
            items.map((row, i) => {
                if (i !== rowIndex) return row;

                const updatedRow = {
                    ...row,
                    [field]: value
                };

                return calculateRow(updatedRow);
            })
        );
    };

    const footerTotals = useMemo(() => {
        let totalQty = 0;
        let grossAmt = 0;
        let taxAmt = 0;
        let netAmt = 0;
        let totalDisc = 0;
        let totalFreight = 0;

        poItems.forEach(r => {
            const qty = Number(r.GRN_Qty) || 0;
            const amount = Number(r.Amount) || 0;
            const cg = Number(r.CG_Amt) || 0;
            const sg = Number(r.SG_Amt) || 0;
            const ig = Number(r.IG_Amt) || 0;
            const net = Number(r.Net_Amt) || 0;

            totalQty += qty;
            grossAmt += amount;
            taxAmt += (cg + sg + ig);
            netAmt += net;
            totalDisc += Number(r.Disc_Amt) || 0;
            totalFreight += Number(r.Freight) || 0;
        });

        return {
            totalItems: poItems.length,
            totalQty: totalQty.toFixed(2),
            grossAmt: grossAmt.toFixed(2),
            taxAmt: taxAmt.toFixed(2),
            netAmt: netAmt.toFixed(2),
            totalDisc: totalDisc.toFixed(2),
            totalFreight: totalFreight.toFixed(2)
        };
    }, [poItems]);

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
                                const today = getTodayISO();

                                setIsEditMode(false);
                                setEditRow({
                                    Po_Date: today
                                });
                                setPoItems([]);
                                setTimeout(() => addItemRow(), 0);

                                await generatePoNumber(today);
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
                                        <th style={{ minWidth: 140, textAlign: "center" }}>
                                            Actions
                                        </th>
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
                                            {columns.map((col, idx) => {
                                                let cellValue = row[col];

                                                // --- 1. FORMAT INDIAN DATE ---
                                                // Detect if column name contains 'Date' and has a value
                                                if (col.toLowerCase().includes("date") && cellValue) {
                                                    const dateObj = new Date(cellValue);
                                                    if (!isNaN(dateObj)) {
                                                        cellValue = dateObj.toLocaleDateString("en-IN", {
                                                            day: "2-digit",
                                                            month: "2-digit",
                                                            year: "numeric",
                                                        });
                                                    }
                                                }

                                                return (
                                                    <TruncatedCell
                                                        key={col}
                                                        style={{
                                                            width: columnWidths[col],
                                                            minWidth: 120, // Increased min-width for better spacing
                                                            maxWidth: columnWidths[col]
                                                        }}
                                                    >
                                                        {col === primaryKey ? (
                                                            <button
                                                                className="row-link"
                                                                onClick={() => loadPoForEdit(row[primaryKey])}
                                                            >
                                                                {cellValue}
                                                            </button>
                                                        ) : col.toLowerCase() === "status" ? (
                                                            /* --- 2. STATUS BADGE WITH DOT --- */
                                                            <div className="inline-flex items-center px-2 py-1 rounded border border-gray-200 bg-gray-50 text-xs font-medium">
                                                                <span
                                                                    className={`w-2 h-2 rounded-full mr-2 ${String(cellValue).toLowerCase() === 'approved'
                                                                        ? 'bg-green-500'
                                                                        : 'bg-orange-500'
                                                                        }`}
                                                                />
                                                                {cellValue}
                                                            </div>
                                                        ) : (
                                                            cellValue
                                                        )}
                                                    </TruncatedCell>
                                                );
                                            })}
                                            <td style={{ textAlign: "center", whiteSpace: "nowrap" }}>
                                                <button
                                                    className="px-2 py-1 text-blue-600 underline hover:underline"
                                                    onClick={() => loadPoForEdit(row[primaryKey])}
                                                    title="Update Value"
                                                >
                                                    Update
                                                </button>

                                                <button
                                                    className="px-2 py-1 text-red-600 underline hover:underline ml-2"
                                                    onClick={() => handleDeletePO(row[primaryKey])}
                                                    title="Delete Value"
                                                >
                                                    Delete
                                                </button>
                                            </td>
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
                    <div className="modal" style={{ width: "98%", maxWidth: "1500px", height: "98%", overflow: "auto", padding: 0 }}>
                        {/* ================= HEADER ================= */}
                        <div className="bg-gray-200 border-b px-4 py-1 text-center font-bold text-lg uppercase tracking-wide">
                            Purchase Order Generation
                        </div>

                        <div className="p-2 space-y-2 bg-[#f0f0f0]">
                            {/* ================= PO HEADER ROW 1 ================= */}
                            <div className="grid grid-cols-12 gap-2 text-xs">
                                <div className="col-span-3 flex border border-gray-400">
                                    <label className="bg-gray-200 px-2 py-1 font-semibold border-r border-gray-400 w-24" style={{ whiteSpace: "nowrap" }}>P.O. No. :</label>
                                    <input
                                        className="flex-1 px-1 outline-none font-bold text-blue-900"
                                        value={editRow?.Po_No || (poNumberLoading ? "Generating..." : "")}
                                        title="Po_No"
                                        readOnly
                                    />
                                </div>
                                <div className="col-span-2 flex border border-gray-400">
                                    <label className="bg-gray-200 px-2 py-1 font-semibold border-r border-gray-400 w-16" style={{ whiteSpace: "nowrap" }}>Date :</label>
                                    <input
                                        type="date"
                                        className="flex-1 px-1 outline-none"
                                        value={editRow?.Po_Date || getTodayISO()}
                                        title="Po_Date"
                                        onChange={e => {
                                            updateHeader("Po_Date", e.target.value);
                                            if (!isEditMode) {
                                                generatePoNumber(e.target.value);
                                            }
                                        }}
                                    />
                                </div>
                                <div className="col-span-2 flex border border-gray-400">
                                    <label className="bg-gray-200 px-2 py-1 font-semibold border-r border-gray-400 w-20" style={{ whiteSpace: "nowrap" }}>Ord. Mode :</label>
                                    <select
                                        className="flex-1 px-1 outline-none bg-white"
                                        title="Dept_Code"
                                        value={editRow.OrderMode || ""}
                                        onChange={e =>
                                            updateHeader("OrderMode", Number(e.target.value))
                                        }
                                    >
                                        <option value="0"></option>
                                        <option value="1" selected>CONSUMABLE</option>
                                        <option value="2">CAPITAL</option>
                                        <option value="3">CAPTIVE</option>
                                        <option value="4">MARKET</option>
                                    </select>
                                </div>
                                <div className="col-span-2 flex border border-gray-400">
                                    <label className="bg-gray-200 px-2 py-1 font-semibold border-r border-gray-400 w-16" style={{ whiteSpace: "nowrap" }}>Mode :</label>
                                    <select
                                        className="flex-1 px-1 outline-none bg-white"
                                        title="PO_Mode"
                                        value={editRow.Mode || ""}
                                        onChange={e => updateHeader("Mode", e.target.value)}
                                    >
                                        <option value=""></option>
                                        <option value="Direct" selected>Direct</option>
                                    </select>
                                </div>
                                <div className="col-span-3 flex border border-gray-400">
                                    <label className="bg-gray-200 px-2 py-1 font-semibold border-r border-gray-400 w-16" style={{ whiteSpace: "nowrap" }}>Store :</label>
                                    <input
                                        readOnly
                                        // value={editRow.StoreName || ""}
                                        value={currentStoreName}
                                        onClick={openStore}
                                        title="P_Str_Code"
                                        className="table-input w-full cursor-pointer bg-gray-50"
                                        placeholder="Select Store"
                                    />
                                </div>
                            </div>

                            {/* ================= PO HEADER ROW 2 ================= */}
                            <div className="grid grid-cols-12 gap-2 text-xs">
                                <div className="col-span-5 flex border border-gray-400">
                                    <label className="bg-gray-200 px-2 py-1 font-semibold border-r border-gray-400 w-24" style={{ whiteSpace: "nowrap" }}>Party Name :</label>
                                    <input
                                        readOnly
                                        // value={editRow.PartyName || ""}
                                        value={currentPartyName}
                                        onClick={openParty}
                                        title="P_Code"
                                        className="table-input w-full cursor-pointer bg-gray-50"
                                        placeholder="Select Party"
                                    />
                                </div>
                                <div className="col-span-3 flex border border-gray-400">
                                    <label className="bg-gray-200 px-2 py-1 font-semibold border-r border-gray-400 w-24" style={{ whiteSpace: "nowrap" }}>Agent :</label>
                                    <input
                                        readOnly
                                        // value={editRow.AgentName || ""}
                                        value={currentAgentName}
                                        onClick={openAgent}
                                        title="POM_BrCode"
                                        className="table-input w-full cursor-pointer bg-gray-50"
                                        placeholder="Select Agent"
                                    />
                                </div>
                                <div className="col-span-4 flex border border-gray-400">
                                    <label className="bg-gray-200 px-2 py-1 font-semibold border-r border-gray-400 w-24" style={{ whiteSpace: "nowrap" }}>Reference :</label>
                                    <input
                                        className="flex-1 px-1 outline-none"
                                        title="Supp_Ref"
                                        value={editRow.Reference || ""}
                                        onChange={e => updateHeader("Reference", e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* ================= PO HEADER ROW 3 ================= */}
                            <div className="grid grid-cols-12 gap-2 text-xs">
                                <div className="col-span-2 flex border border-gray-400">
                                    <label className="bg-gray-200 px-2 py-1 font-semibold border-r border-gray-400 w-24" style={{ whiteSpace: "nowrap" }}>Ref. Date :</label>
                                    <input
                                        type="date"
                                        className="flex-1 px-1 outline-none"
                                        title="RecDate"
                                        value={editRow.RefDate || ""}
                                        onChange={e => updateHeader("RefDate", e.target.value)}
                                    />
                                </div>
                                <div className="col-span-2 flex border border-gray-400">
                                    <label className="bg-gray-200 px-2 py-1 font-semibold border-r border-gray-400 w-20" style={{ whiteSpace: "nowrap" }}>Currency :</label>
                                    <select
                                        className="flex-1 px-1 outline-none bg-white"
                                        title="Curr"
                                        value={editRow.Currency || "INR"}
                                        onChange={e => updateHeader("Currency", e.target.value)}
                                    >
                                        <option value="INR">INR</option>
                                        {Intl.supportedValuesOf("currency").map(c => (
                                            <option key={c} value={c}>{c}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="col-span-2 flex border border-gray-400">
                                    <label className="bg-gray-200 px-2 py-1 font-semibold border-r border-gray-400 w-20" style={{ whiteSpace: "nowrap" }}>Cr. Days :</label>
                                    <input
                                        type="number"
                                        onKeyDown={blockInvalidNumberKeys}
                                        className="flex-1 px-1 outline-none text-right"
                                        title="Po_CrDays"
                                        value={editRow.Po_CrDays || ""}
                                        onChange={e => updateHeader("Po_CrDays", Number(e.target.value))}
                                    />
                                </div>
                                <div className="col-span-2 flex border border-gray-400">
                                    <label className="bg-gray-200 px-2 py-1 font-semibold border-r border-gray-400 w-20" style={{ whiteSpace: "nowrap" }}>Del. Days :</label>
                                    <input
                                        type="number"
                                        onKeyDown={blockInvalidNumberKeys}
                                        className="flex-1 px-1 outline-none text-right"
                                        title="POM_DELDays"
                                        value={editRow.POM_DELDays || ""}
                                        onChange={e => updateHeader("POM_DELDays", Number(e.target.value))}
                                    />
                                </div>
                                <div className="col-span-2 flex border border-gray-400">
                                    <label className="bg-gray-200 px-2 py-1 font-semibold border-r border-gray-400 w-16" style={{ whiteSpace: "nowrap" }}>Freight :</label>
                                    <select className="flex-1 px-1 outline-none bg-white">
                                        <option value=""></option>
                                        <option value="EXTRA" selected>EXTRA</option>
                                        <option value="INCLUDE">INCLUDE</option>
                                    </select>
                                </div>
                                <div className="col-span-2 flex items-center px-2 gap-4">
                                    <div className="flex items-center gap-1"><input type="checkbox" /> <label style={{ whiteSpace: "nowrap" }}>Import</label></div>
                                    <div className="flex border border-gray-400 flex-1">
                                        <label className="bg-gray-200 px-1 font-semibold border-r border-gray-400" style={{ whiteSpace: "nowrap" }}>Status:</label>
                                        <input className="w-full text-center font-bold" />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-12 gap-2 text-xs">
                                <div className="flex items-center gap-2 col-span-2">
                                    <label className="font-semibold" style={{ whiteSpace: "nowrap" }}>GSTIN :</label>
                                    <input
                                        readOnly
                                        // value={editRow.PartyGST || ""}
                                        value={currentPartyGst}
                                        className="input w-full border-black border bg-gray-50"
                                    />
                                </div>

                                <div className="flex items-center gap-2 col-span-6">
                                    <label className="font-semibold" style={{ whiteSpace: "nowrap" }}>Address :</label>
                                    <input
                                        readOnly
                                        // value={editRow.PartyAddress || ""}
                                        value={currentPartyAdd}
                                        className="input w-full border-black border bg-gray-50"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end mb-1">
                            <button
                                className="px-3 py-1 bg-gray-200 border rounded text-xs font-semibold hover:bg-gray-300"
                                onClick={addItemRow}
                            >
                                + Add Item
                            </button>
                        </div>

                        {/* ================= ITEMS TABLE ================= */}
                        <div className="px-4 flex-1 overflow-hidden flex flex-col">
                            <div className="border border-gray-300 rounded overflow-auto h-auto max-h-[400px]">
                                {/* h-auto ensures the container only grows as large as the rows inside it */}
                                <table className="w-full border-collapse text-xs" style={{ minWidth: "1800px" }}>
                                    <thead className="bg-gray-200 sticky top-0 z-10 shadow-sm">
                                        <tr>
                                            <th className="border p-2" style={{ whiteSpace: "nowrap" }} title="SrNo">#</th>
                                            <th className="border p-2" style={{ whiteSpace: "nowrap" }} title="I_Code">Item Code</th>
                                            <th className="border p-2" style={{ whiteSpace: "nowrap" }}>Description</th>
                                            <th className="border p-2" style={{ whiteSpace: "nowrap" }}>Merge_No/Style</th>
                                            <th className="border p-2" style={{ whiteSpace: "nowrap" }} title="SHADE">Shade</th>
                                            <th className="border p-2" style={{ whiteSpace: "nowrap" }} title="P_Remark">Remark</th>
                                            <th className="border p-2" style={{ whiteSpace: "nowrap" }} title="DEP_CODE">Department</th>
                                            <th className="border p-2" style={{ whiteSpace: "nowrap" }} title="Kh_Code">Cost Center</th>
                                            <th className="border p-2" style={{ whiteSpace: "nowrap" }} title="UOM">UQC</th>
                                            <th className="border p-2" style={{ whiteSpace: "nowrap" }}>Pend. Qty</th>
                                            <th className="border p-2" style={{ whiteSpace: "nowrap" }} title="Qty">GRN_Qty</th>
                                            <th className="border p-2" style={{ whiteSpace: "nowrap" }}>Conv_Unit</th>
                                            <th className="border p-2" style={{ whiteSpace: "nowrap" }}>Conv_Qty</th>
                                            <th className="border p-2" style={{ whiteSpace: "nowrap" }} title="Rate">Rate</th>
                                            <th className="border p-2" style={{ whiteSpace: "nowrap" }} title="Disc">Disc(%)</th>
                                            <th className="border p-2" style={{ whiteSpace: "nowrap" }} title="Amount">Amount</th>
                                            <th className="border p-2" style={{ whiteSpace: "nowrap" }}>Freight</th>
                                            <th className="border p-2" style={{ whiteSpace: "nowrap" }} title="CGPer">CG(%)</th>
                                            <th className="border p-2" style={{ whiteSpace: "nowrap" }} title="CGAmt">CG_Amt</th>
                                            <th className="border p-2" style={{ whiteSpace: "nowrap" }} title="SGPer">SG(%)</th>
                                            <th className="border p-2" style={{ whiteSpace: "nowrap" }} title="SGAmt">SG_Amt</th>
                                            <th className="border p-2" style={{ whiteSpace: "nowrap" }} title="IGPer">IG(%)</th>
                                            <th className="border p-2" style={{ whiteSpace: "nowrap" }} title="IGAmt">IG_Amt</th>
                                            <th className="border p-2" style={{ whiteSpace: "nowrap" }}>Net_Amt</th>
                                            <th className="border p-2 text-center">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {poItems.map((row, i) => {
                                            const deptName = department.find(d => String(d.code) === String(row.DepartmentCode))?.name || "";
                                            const ccName = costCenter.find(c => String(c.code) === String(row.CostCenterCode))?.name || "";

                                            return (
                                                <tr key={i}>
                                                    <td className="border p-1 text-center" title="SrNo">{i + 1}</td>

                                                    {/* ITEM CODE */}
                                                    <td className="border p-1">
                                                        <input
                                                            readOnly
                                                            value={row.ItemCode}
                                                            onClick={() => openItem(i)}
                                                            title="I_Code"
                                                            className="table-input w-full cursor-pointer bg-gray-50"
                                                            placeholder="Select Item"
                                                        />
                                                    </td>

                                                    {/* DESCRIPTION */}
                                                    <td className="border p-1">
                                                        <input
                                                            readOnly
                                                            value={row.Description}
                                                            className="table-input w-full bg-gray-50"
                                                        />
                                                    </td>

                                                    {/* Merge_No/Style */}
                                                    <td className="border p-1">
                                                        <input
                                                            className="table-input w-full text-right"
                                                        />
                                                    </td>

                                                    {/* Shade */}
                                                    <td className="border p-1">
                                                        <input
                                                            readOnly
                                                            value={row.ShadeCode}
                                                            onClick={() => openShade(i)}
                                                            title="SHADE"
                                                            className="table-input w-full cursor-pointer bg-gray-50"
                                                        />
                                                    </td>

                                                    {/* Remark */}
                                                    <td className="border p-1">
                                                        <input
                                                            className="table-input w-full text-right"
                                                            title="P_Remark"
                                                            value={row.Remark || ""}
                                                            onChange={e => updateItem(i, "Remark", e.target.value)}
                                                        />
                                                    </td>

                                                    {/* Department */}
                                                    <td className="border p-1">
                                                        <input
                                                            readOnly
                                                            value={deptName}
                                                            onClick={() => openDepartment(i)}
                                                            title="DEP_CODE"
                                                            className="table-input w-full cursor-pointer bg-gray-50"
                                                        />
                                                    </td>

                                                    {/* Cost Center */}
                                                    <td className="border p-1">
                                                        <input
                                                            readOnly
                                                            value={ccName}
                                                            onClick={() => openCostCenter(i)}
                                                            title="Kh_Code"
                                                            className="table-input w-full cursor-pointer bg-gray-50"
                                                        />
                                                    </td>

                                                    {/* UQC */}
                                                    <td className="border p-1">
                                                        <input
                                                            readOnly
                                                            value={row.UOMName}
                                                            className="table-input w-full bg-gray-50 text-center"
                                                            title="UOM"
                                                        />
                                                    </td>

                                                    {/* Pend. Qty */}
                                                    <td className="border p-1">
                                                        <input
                                                            type="number"
                                                            onKeyDown={blockInvalidNumberKeys}
                                                            className="table-input w-full text-right"
                                                        />
                                                    </td>

                                                    {/* GRN_Qty */}
                                                    <td className="border p-1">
                                                        <input
                                                            type="number"
                                                            onKeyDown={blockInvalidNumberKeys}
                                                            className="table-input w-full text-right"
                                                            title="Qty"
                                                            value={row.GRN_Qty}
                                                            onChange={e => updateItemField(i, "GRN_Qty", e.target.value)}
                                                        />
                                                    </td>

                                                    {/* Conv_Unit */}
                                                    <td className="border p-1">
                                                        <input
                                                            className="table-input w-full text-right"
                                                        />
                                                    </td>

                                                    {/* Conv_Qty */}
                                                    <td className="border p-1">
                                                        <input
                                                            type="number"
                                                            onKeyDown={blockInvalidNumberKeys}
                                                            className="table-input w-full text-right"
                                                        />
                                                    </td>

                                                    {/* RATE */}
                                                    <td className="border p-1">
                                                        <input
                                                            type="number"
                                                            onKeyDown={blockInvalidNumberKeys}
                                                            className="table-input w-full text-right"
                                                            title="Rate"
                                                            value={row.Rate}
                                                            onChange={e => updateItemField(i, "Rate", e.target.value)}
                                                        />
                                                    </td>

                                                    {/* Disc(%) */}
                                                    <td className="border p-1">
                                                        <input
                                                            type="number"
                                                            onKeyDown={blockInvalidNumberKeys}
                                                            className="table-input w-full text-right"
                                                            title="Disc"
                                                            value={row.Disc_Per}
                                                            onChange={e => updateItemField(i, "Disc_Per", e.target.value)}
                                                        />
                                                    </td>

                                                    {/* Amount */}
                                                    <td className="border p-1">
                                                        <input readOnly value={row.Amount} className="table-input w-full text-right bg-gray-100" title="Amount" />
                                                    </td>

                                                    {/* Freight */}
                                                    <td className="border p-1">
                                                        <input
                                                            type="number"
                                                            onKeyDown={blockInvalidNumberKeys}
                                                            className="table-input w-full text-right"
                                                            value={row.Freight}
                                                            onChange={e => updateItemField(i, "Freight", e.target.value)}
                                                        />
                                                    </td>

                                                    {/* CG(%) */}
                                                    <td className="border p-1">
                                                        <input
                                                            type="number"
                                                            onKeyDown={blockInvalidNumberKeys}
                                                            value={row.CG_Per}
                                                            onChange={e => updateItemField(i, "CG_Per", e.target.value)}
                                                            className="table-input w-full text-right"
                                                            title="CGPer"
                                                        />
                                                    </td>

                                                    {/* CG_Amt */}
                                                    <td className="border p-1">
                                                        <input readOnly value={row.CG_Amt} className="table-input w-full text-right bg-gray-100" title="CGAmt" />
                                                    </td>

                                                    {/* SG(%) */}
                                                    <td className="border p-1">
                                                        <input
                                                            type="number"
                                                            onKeyDown={blockInvalidNumberKeys}
                                                            value={row.SG_Per}
                                                            onChange={e => updateItemField(i, "SG_Per", e.target.value)}
                                                            className="table-input w-full text-right"
                                                            title="SGPer"
                                                        />
                                                    </td>

                                                    {/* SG_Amt */}
                                                    <td className="border p-1">
                                                        <input readOnly value={row.SG_Amt} className="table-input w-full text-right bg-gray-100" title="SGAmt" />
                                                    </td>

                                                    {/* IG(%) */}
                                                    <td className="border p-1">
                                                        <input
                                                            type="number"
                                                            onKeyDown={blockInvalidNumberKeys}
                                                            value={row.IG_Per}
                                                            onChange={e => updateItemField(i, "IG_Per", e.target.value)}
                                                            className="table-input w-full text-right"
                                                            title="IGPer"
                                                        />
                                                    </td>

                                                    {/* IG_Amt */}
                                                    <td className="border p-1">
                                                        <input readOnly value={row.IG_Amt} className="table-input w-full text-right bg-gray-100" title="IGAmt" />
                                                    </td>

                                                    {/* Net_Amt */}
                                                    <td className="border p-1">
                                                        <input readOnly value={row.Net_Amt} className="table-input w-full text-right bg-gray-100 font-bold" />
                                                    </td>

                                                    <td className="border p-1 text-center">
                                                        <button
                                                            className="px-2 py-1 text-red-600 hover:text-red-800 font-bold"
                                                            title="Delete Item"
                                                            onClick={() => {
                                                                if (window.confirm("Remove this item?")) {
                                                                    deleteItemRow(i);
                                                                }
                                                            }}
                                                        >
                                                            ✕
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* ================= FOOTER ================= */}
                        <div className="grid grid-cols-12 gap-4 mt-2">
                            {/* Left Column: Terms & Instructions */}
                            <div className="col-span-7 space-y-1">
                                <div className="flex border border-gray-400 text-xs">
                                    <label className="bg-gray-200 px-2 py-1 font-semibold border-r border-gray-400 w-28" style={{ whiteSpace: "nowrap" }}>Delivery Party :</label>
                                    <input
                                        readOnly
                                        // value={editRow.PartyName || ""}
                                        value={currentPartyName}
                                        className="flex-1 px-1 outline-none bg-gray-50"
                                    />
                                    <button className="bg-gray-300 px-2 border-l border-gray-400">***</button>
                                </div>
                                <div className="flex border border-gray-400 text-xs">
                                    <label className="bg-gray-200 px-2 py-1 font-semibold border-r border-gray-400 w-28" style={{ whiteSpace: "nowrap" }}>Del. Terms :</label>
                                    <input
                                        title="DTerms"
                                        className="flex-1 px-1 outline-none"
                                        value={editRow.DTerms || ""}
                                        onChange={e => updateHeader("DTerms", e.target.value)}
                                    />
                                </div>
                                <div className="flex border border-gray-400 text-xs">
                                    <label className="bg-gray-200 px-2 py-1 font-semibold border-r border-gray-400 w-28" style={{ whiteSpace: "nowrap" }} title="PTerms">Pay. Terms :</label>
                                    <input
                                        title="PTerms"
                                        className="flex-1 px-1 outline-none"
                                        value={editRow.PTerms || ""}
                                        onChange={e => updateHeader("PTerms", e.target.value)}
                                    />
                                </div>
                                <div className="flex border border-gray-400 text-xs">
                                    <label className="bg-gray-200 px-2 py-1 font-semibold border-r border-gray-400 w-28" style={{ whiteSpace: "nowrap" }} title="Disp_Ins">Dispatch Ins :</label>
                                    <input
                                        title="Disp_Ins"
                                        className="flex-1 px-1 outline-none"
                                        value={editRow.Disp_Ins || ""}
                                        onChange={e => updateHeader("Disp_Ins", e.target.value)}
                                    />
                                </div>
                                <div className="flex border border-gray-400 text-xs">
                                    <label className="bg-gray-200 px-2 py-1 font-semibold border-r border-gray-400 w-28" style={{ whiteSpace: "nowrap" }} title="Sp_Note">Sp. Note :</label>
                                    <input
                                        title="Sp_Note"
                                        className="flex-1 px-1 outline-none"
                                        value={editRow.Sp_Note || ""}
                                        onChange={e => updateHeader("Sp_Note", e.target.value)}
                                    />
                                </div>
                                <div className="flex border border-gray-400 text-xs">
                                    <label className="bg-gray-200 px-2 py-1 font-semibold border-r border-gray-400 w-28" style={{ whiteSpace: "nowrap" }} title="Remark">Remarks :</label>
                                    <input
                                        title="Remark"
                                        className="flex-1 px-1 outline-none"
                                        value={editRow.Remark || ""}
                                        onChange={e => updateHeader("Remark", e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Right Column: Totals & Buttons */}
                            <div className="col-span-5 grid grid-cols-2 gap-2">
                                {/* Middle Action Buttons */}
                                <div className="flex flex-col gap-2 justify-center">
                                    <label className="bg-gray-200 border border-gray-500 rounded px-2 py-1 text-xs font-bold shadow-sm">
                                        Total Item :
                                        <input
                                            readOnly
                                            value={footerTotals.totalItems}
                                            className="flex-1 px-1 font-bold outline-none bg-transparent text-right"
                                            title="Tot_Itm"
                                        />
                                    </label>
                                    <label className="bg-gray-200 border border-gray-500 rounded px-2 py-1 text-xs font-bold shadow-sm">
                                        Total Qty :
                                        <input
                                            readOnly
                                            value={footerTotals.totalQty}
                                            className="flex-1 px-1 font-bold outline-none bg-transparent text-right"
                                            title="Tot_Qty"
                                        />
                                    </label>
                                    <button className="bg-gray-200 border border-gray-500 rounded px-2 py-1 text-xs font-bold shadow-sm hover:bg-gray-300" style={{ whiteSpace: "nowrap" }}>Duties & Charges</button>
                                    <button className="bg-gray-200 border border-gray-500 rounded px-2 py-1 text-xs font-bold shadow-sm hover:bg-gray-300" style={{ whiteSpace: "nowrap" }}>Terms & Condition</button>
                                </div>

                                {/* Calculated Totals */}
                                <div className="space-y-1">
                                    <div className="flex border border-gray-400 text-xs">
                                        <label className="bg-gray-200 px-2 py-1 font-semibold border-r border-gray-400 w-24" style={{ whiteSpace: "nowrap" }}>Gross Amount :</label>
                                        <input
                                            readOnly
                                            value={footerTotals.grossAmt}
                                            className="flex-1 px-1 text-right outline-none bg-gray-100"
                                            title="Tot_Amt"
                                        />
                                    </div>
                                    <div className="flex border border-gray-400 text-xs">
                                        <label className="bg-gray-200 px-2 py-1 font-semibold border-r border-gray-400 w-24" style={{ whiteSpace: "nowrap" }}>Total Discount :</label>
                                        <input
                                            readOnly
                                            value={footerTotals.totalDisc !== "0.00" ? footerTotals.totalDisc : editRow.TotalDiscount}
                                            className="flex-1 px-1 text-right outline-none bg-gray-100"
                                            title="Tot_Disc"
                                        />
                                    </div>
                                    <div className="flex border border-gray-400 text-xs">
                                        <label className="bg-gray-200 px-2 py-1 font-semibold border-r border-gray-400 w-24" style={{ whiteSpace: "nowrap" }}>Tax Amount :</label>
                                        <input
                                            readOnly
                                            value={footerTotals.taxAmt}
                                            className="flex-1 px-1 text-right outline-none bg-gray-100"
                                            title="PF_Chg"
                                        />
                                    </div>
                                    <div className="flex border border-gray-400 text-xs">
                                        <label className="bg-gray-200 px-2 py-1 font-semibold border-r border-gray-400 w-24" style={{ whiteSpace: "nowrap" }}>Frieght :</label>
                                        <input
                                            readOnly
                                            value={footerTotals.totalFreight !== "0.00" ? footerTotals.totalFreight : editRow.Freight}
                                            className="flex-1 px-1 text-right outline-none bg-gray-100"
                                            title="Freights"
                                        />
                                    </div>
                                    <div className="flex border border-gray-400 text-xs">
                                        <label className="bg-gray-200 px-2 py-1 font-semibold border-r border-gray-400 w-24" style={{ whiteSpace: "nowrap" }}>Net Amount :</label>
                                        <input
                                            readOnly
                                            value={footerTotals.netAmt}
                                            className="flex-1 px-1 text-right font-bold text-md text-blue-900 outline-none bg-gray-100"
                                            title="NetAmt"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="modal-actions mt-4 mb-4 pt-4 border-t flex justify-center gap-2 px-6">
                            {isEditMode && (
                                <button
                                    className="px-4 py-1 bg-gray-200 text-red-600 border border-red-200 rounded hover:bg-red-50 font-bold mr-auto"
                                    onClick={() => handleDeletePO(editRow.Po_No)}
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
                                {isEditMode ? "Update" : "Save"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {showParty && (
                <div className="modal-backdrop">
                    <div className="modal max-w-4xl flex flex-col max-h-[80vh]">
                        <div className="p-3 border-b font-bold">
                            Select Party
                        </div>

                        <div className="flex-1 overflow-auto">
                            <table className="w-full text-sm border">
                                <thead className="bg-gray-200">
                                    <tr>
                                        <th>Code</th>
                                        <th>Name</th>
                                        <th>GST</th>
                                        <th>Address</th>
                                    </tr>
                                    <tr>
                                        <th>
                                            <input
                                                className="w-full border px-1"
                                                placeholder="Search"
                                                value={partySearch.code}
                                                onChange={e => setPartySearch(s => ({ ...s, code: e.target.value }))}
                                            />
                                        </th>
                                        <th>
                                            <input
                                                className="w-full border px-1"
                                                placeholder="Search"
                                                value={partySearch.name}
                                                onChange={e => setPartySearch(s => ({ ...s, name: e.target.value }))}
                                            />
                                        </th>
                                        <th>
                                            <input
                                                className="w-full border px-1"
                                                placeholder="Search"
                                                value={partySearch.gst}
                                                onChange={e => setPartySearch(s => ({ ...s, gst: e.target.value }))}
                                            />
                                        </th>
                                        <th>
                                            <input
                                                className="w-full border px-1"
                                                placeholder="Search"
                                                value={partySearch.add}
                                                onChange={e => setPartySearch(s => ({ ...s, add: e.target.value }))}
                                            />
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredParties.map(p => (
                                        <tr
                                            key={p.code}
                                            className="hover:bg-blue-50 cursor-pointer"
                                            onClick={() => selectParty(p)}
                                        >
                                            <td>{String(p.code ?? "")}</td>
                                            <td>{String(p.name ?? "")}</td>
                                            <td>{String(p.gst ?? "")}</td>
                                            <td>{String(p.add ?? "")}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="p-2 border-t bg-white sticky bottom-0 text-right">
                            <button
                                className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
                                onClick={() => setShowParty(false)}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {showAgent && (
                <div className="modal-backdrop">
                    <div className="modal max-w-4xl flex flex-col max-h-[80vh]">
                        <div className="p-3 border-b font-bold">
                            Select Agent
                        </div>

                        <div className="flex-1 overflow-auto">
                            <table className="w-full text-sm border">
                                <thead className="bg-gray-200">
                                    <tr>
                                        <th>Code</th>
                                        <th>Name</th>
                                    </tr>
                                    <tr>
                                        <th>
                                            <input
                                                className="w-full border px-1"
                                                placeholder="Search"
                                                value={agentSearch.code}
                                                onChange={e => setAgentSearch(s => ({ ...s, code: e.target.value }))}
                                            />
                                        </th>
                                        <th>
                                            <input
                                                className="w-full border px-1"
                                                placeholder="Search"
                                                value={agentSearch.name}
                                                onChange={e => setAgentSearch(s => ({ ...s, name: e.target.value }))}
                                            />
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredAgents.map(a => (
                                        <tr
                                            key={a.code}
                                            className="hover:bg-blue-50 cursor-pointer"
                                            onClick={() => selectAgent(a)}
                                        >
                                            <td>{a.code}</td>
                                            <td>{a.name}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="p-2 border-t bg-white sticky bottom-0 text-right">
                            <button
                                className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
                                onClick={() => setShowAgent(false)}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {showStore && (
                <div className="modal-backdrop">
                    <div className="modal max-w-4xl flex flex-col max-h-[80vh]">
                        <div className="p-3 border-b font-bold">
                            Select Store
                        </div>

                        <div className="flex-1 overflow-auto">
                            <table className="w-full text-sm border">
                                <thead className="bg-gray-200">
                                    <tr>
                                        <th>Code</th>
                                        <th>Name</th>
                                        <th>Loc Code</th>
                                        <th>Series</th>
                                    </tr>
                                    <tr>
                                        <th>
                                            <input
                                                className="w-full border px-1"
                                                placeholder="Search"
                                                value={storeSearch.code}
                                                onChange={e => setStoreSearch(s => ({ ...s, code: e.target.value }))}
                                            />
                                        </th>
                                        <th>
                                            <input
                                                className="w-full border px-1"
                                                placeholder="Search"
                                                value={storeSearch.name}
                                                onChange={e => setStoreSearch(s => ({ ...s, name: e.target.value }))}
                                            />
                                        </th>
                                        <th>
                                            <input
                                                className="w-full border px-1"
                                                placeholder="Search"
                                                value={storeSearch.loc_code}
                                                onChange={e => setStoreSearch(s => ({ ...s, loc_code: e.target.value }))}
                                            />
                                        </th>
                                        <th>
                                            <input
                                                className="w-full border px-1"
                                                placeholder="Search"
                                                value={storeSearch.series}
                                                onChange={e => setStoreSearch(s => ({ ...s, series: e.target.value }))}
                                            />
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredStores.map(str => (
                                        <tr
                                            key={str.code}
                                            className="hover:bg-blue-50 cursor-pointer"
                                            onClick={() => selectStore(str)}
                                        >
                                            <td>{str.code}</td>
                                            <td>{str.name}</td>
                                            <td>{str.loc_code}</td>
                                            <td>{str.series}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="p-2 border-t bg-white sticky bottom-0 text-right">
                            <button
                                className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
                                onClick={() => setShowStore(false)}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {showItem && (
                <div className="modal-backdrop">
                    <div className="modal max-w-4xl flex flex-col max-h-[80vh]">
                        <div className="p-3 border-b font-bold">
                            Select Item
                        </div>

                        <div className="flex-1 overflow-auto">
                            <table className="w-full text-sm border">
                                <thead className="bg-gray-200">
                                    <tr>
                                        <th>Code</th>
                                        <th>Description</th>
                                        <th>UOM</th>
                                    </tr>
                                    <tr>
                                        <th>
                                            <input
                                                className="w-full border px-1"
                                                placeholder="Search"
                                                value={itemSearch.code}
                                                onChange={e => setItemSearch(s => ({ ...s, code: e.target.value }))}
                                            />
                                        </th>
                                        <th>
                                            <input
                                                className="w-full border px-1"
                                                placeholder="Search"
                                                value={itemSearch.name}
                                                onChange={e => setItemSearch(s => ({ ...s, name: e.target.value }))}
                                            />
                                        </th>
                                        <th>
                                            <input
                                                className="w-full border px-1"
                                                placeholder="Search"
                                                value={itemSearch.uom}
                                                onChange={e => setItemSearch(s => ({ ...s, uom: e.target.value }))}
                                            />
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredItems.map(it => (
                                        <tr
                                            key={it.code}
                                            className="hover:bg-blue-50 cursor-pointer"
                                            onClick={() => selectItem(it)}
                                        >
                                            <td>{it.code}</td>
                                            <td>{it.name}</td>
                                            <td>{it.uomName}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="p-2 border-t bg-white sticky bottom-0 text-right">
                            <button
                                className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
                                onClick={() => setShowItem(false)}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {showDepartment && (
                <div className="modal-backdrop">
                    <div className="modal max-w-4xl flex flex-col max-h-[80vh]">
                        <div className="p-3 border-b font-bold">
                            Select Department
                        </div>

                        <div className="flex-1 overflow-auto">
                            <table className="w-full text-sm border">
                                <thead className="bg-gray-200">
                                    <tr>
                                        <th>Code</th>
                                        <th>Name</th>
                                    </tr>
                                    <tr>
                                        <th>
                                            <input
                                                className="w-full border px-1"
                                                placeholder="Search"
                                                value={deptSearch.code}
                                                onChange={e => setDeptSearch(s => ({ ...s, code: e.target.value }))}
                                            />
                                        </th>
                                        <th>
                                            <input
                                                className="w-full border px-1"
                                                placeholder="Search"
                                                value={deptSearch.name}
                                                onChange={e => setDeptSearch(s => ({ ...s, name: e.target.value }))}
                                            />
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredDepartments.map(d => (
                                        <tr
                                            key={d.code}
                                            className="hover:bg-blue-50 cursor-pointer"
                                            onClick={() => selectDepartment(d)}
                                        >
                                            <td>{d.code}</td>
                                            <td>{d.name}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="p-2 border-t bg-white sticky bottom-0 text-right">
                            <button
                                className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
                                onClick={() => setShowDepartment(false)}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {showCostCenter && (
                <div className="modal-backdrop">
                    <div className="modal max-w-4xl flex flex-col max-h-[80vh]">
                        <div className="p-3 border-b font-bold">
                            Select Cost Center
                        </div>

                        <div className="flex-1 overflow-auto">
                            <table className="w-full text-sm border">
                                <thead className="bg-gray-200">
                                    <tr>
                                        <th>Code</th>
                                        <th>Name</th>
                                    </tr>
                                    <tr>
                                        <th>
                                            <input
                                                className="w-full border px-1"
                                                placeholder="Search"
                                                value={costCenterSearch.code}
                                                onChange={e => setCostCenterSearch(s => ({ ...s, code: e.target.value }))}
                                            />
                                        </th>
                                        <th>
                                            <input
                                                className="w-full border px-1"
                                                placeholder="Search"
                                                value={costCenterSearch.name}
                                                onChange={e => setCostCenterSearch(s => ({ ...s, name: e.target.value }))}
                                            />
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredCostCenters.map(c => (
                                        <tr
                                            key={c.code}
                                            className="hover:bg-blue-50 cursor-pointer"
                                            onClick={() => selectCostCenter(c)}
                                        >
                                            <td>{c.code}</td>
                                            <td>{c.name}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="p-2 border-t bg-white sticky bottom-0 text-right">
                            <button
                                className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
                                onClick={() => setShowCostCenter(false)}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {showShade && (
                <div className="modal-backdrop">
                    <div className="modal max-w-4xl flex flex-col max-h-[80vh]">
                        <div className="p-3 border-b font-bold">
                            Select Shade
                        </div>

                        <div className="flex-1 overflow-auto">
                            <table className="w-full text-sm border">
                                <thead className="bg-gray-200">
                                    <tr>
                                        <th>Code</th>
                                        <th>Cost</th>
                                    </tr>
                                    <tr>
                                        <th>
                                            <input
                                                className="w-full border px-1"
                                                placeholder="Search"
                                                value={shadeSearch.code}
                                                onChange={e => setShadeSearch(s => ({ ...s, code: e.target.value }))}
                                            />
                                        </th>
                                        <th>
                                            <input
                                                className="w-full border px-1"
                                                placeholder="Search"
                                                value={shadeSearch.cost}
                                                onChange={e => setShadeSearch(s => ({ ...s, cost: e.target.value }))}
                                            />
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredShades.map(s => (
                                        <tr
                                            key={s.code}
                                            className="hover:bg-blue-50 cursor-pointer"
                                            onClick={() => selectShade(s)}
                                        >
                                            <td>{s.code}</td>
                                            <td>{s.cost}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="p-2 border-t bg-white sticky bottom-0 text-right">
                            <button
                                className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
                                onClick={() => setShowShade(false)}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
}