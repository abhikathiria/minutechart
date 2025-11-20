// import React, { useState } from "react";
// import {
//   PieChart,
//   Pie,
//   Cell,
//   Tooltip as ReTooltip,
//   Legend,
//   ResponsiveContainer,
//   Sector,
//   BarChart,
//   Bar,
//   XAxis,
//   YAxis,
//   CartesianGrid,
//   AreaChart,
//   Area,
//   LineChart,
//   Line,
// } from "recharts";
// import { FaCrown, FaFileExcel } from "react-icons/fa";
// import { ComposableMap, Geographies, Geography } from "react-simple-maps";
// import { scaleLinear } from "d3-scale";
// import { Marker } from "react-simple-maps";
// import { geoCentroid } from "d3-geo";
// import * as XLSX from "xlsx";
// import { saveAs } from "file-saver";

// const indiaGeoUrl = "/india_state_geo.json";

// export default function ModuleChart({ data, type }) {
//   const [activeIndex, setActiveIndex] = useState(null);

//   if (!data || data.length === 0) {
//     return <p className="text-center text-gray-500">No data to display</p>;
//   }

//   const keys = Object.keys(data[0]);
//   const COLORS = [
//     "#0000FF", "#4F46E5", "#A855F7", "#57167E", "#9B3192", "#EA5F89", "#2B0B3F", "#6366F1",
//     "#FBCF00", "#423C2E", "#822513", "#D3974E", "#C084FC", "#E9D5FF", "#152342FF"
//   ];

//   const handleExportTable = () => {
//     if (!data || data.length === 0) return;
//     const ws = XLSX.utils.json_to_sheet(data);
//     const wb = XLSX.utils.book_new();
//     XLSX.utils.book_append_sheet(wb, ws, "Data");
//     const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
//     const blob = new Blob([wbout], { type: "application/octet-stream" });
//     saveAs(blob, "data.xlsx");
//   };

//   switch (type) {
//     case "table":
//       return (
//         <div className="mt-2 border rounded overflow-hidden">
//           <div className="flex justify-end p-2">
//             {/* <button
//               onClick={handleExportTable}
//               title="Export Table"
//               className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center"
//             >
//               <FaFileExcel size={20} />
//             </button> */}
//           </div>
//           <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
//             <table className="border-collapse border w-full min-w-max text-sm">
//               <thead className="bg-[#152342FF] sticky top-0 z-10">
//                 <tr>
//                   {keys.map((k) => {
//                     const isNumeric = !isNaN(Number(data[0][k]));
//                     return (
//                       <th
//                         key={k}
//                         className={`border px-3 py-2 font-semibold text-white ${isNumeric ? "text-right" : "text-left"
//                           }`}
//                       >
//                         {k}
//                       </th>
//                     );
//                   })}
//                 </tr>
//               </thead>
//               <tbody>
//                 {data.map((row, i) => {
//                   const isTotalRow = Object.values(row).some(
//                     (val) => typeof val === "string" && val.toLowerCase().includes("total")
//                   );

//                   return (
//                     <tr
//                       key={i}
//                       className={isTotalRow ? "bg-[#152342FF] text-white font-semibold" : "hover:bg-gray-50"}
//                     >
//                       {keys.map((k, j) => {
//                         const cellValue = row[k];
//                         const isNumeric = !isNaN(Number(cellValue));
//                         const isTotalColumn = k.toLowerCase().includes("total");

//                         return (
//                           <td
//                             key={j}
//                             className={`border px-3 py-2 ${isNumeric ? "text-right" : "text-left"
//                               } ${isTotalRow || isTotalColumn ? "bg-[#152342FF] text-white font-semibold" : ""}`}
//                           >
//                             {cellValue}
//                           </td>
//                         );
//                       })}
//                     </tr>
//                   );
//                 })}
//               </tbody>

//             </table>
//           </div>
//         </div>
//       );

//     case "bar":
//       return (
//         <div className="mt-4 h-80 w-full overflow-x-auto">
//           <ResponsiveContainer width="100%" height="100%">
//             <BarChart data={data}>
//               <CartesianGrid strokeDasharray="3 3" />
//               <XAxis dataKey={keys[0]} />
//               <YAxis />
//               <ReTooltip />
//               <Bar dataKey={keys[1]} fill="#0000ff" />
//             </BarChart>
//           </ResponsiveContainer>
//         </div>
//       );

//     case "area":
//       return (
//         <div className="mt-4 h-80 w-full overflow-x-auto">
//           <ResponsiveContainer width="100%" height="100%">
//             <AreaChart data={data}>
//               <CartesianGrid strokeDasharray="3 3" />
//               <XAxis dataKey={keys[0]} />
//               <YAxis />
//               <ReTooltip />
//               <Area type="monotone" dataKey={keys[1]} stroke="#0000ff" fill="#0000ff" />
//             </AreaChart>
//           </ResponsiveContainer>
//         </div>
//       );

//     case "pie":
//       const chartData = data.map((item) => ({
//         name: item[keys[0]],
//         value: Number(item[keys[1]]),
//       }));

//       const sortedData = [...chartData].sort((a, b) => b.value - a.value);
//       const topName = sortedData[0]?.name;

//       const renderActiveShape = (props) => {
//         const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
//         return (
//           <g>
//             <Sector
//               cx={cx}
//               cy={cy}
//               innerRadius={innerRadius}
//               outerRadius={outerRadius + 10}
//               startAngle={startAngle}
//               endAngle={endAngle}
//               fill={fill}
//             />
//           </g>
//         );
//       };

//       const handleClick = (_, index) => {
//         setActiveIndex(index === activeIndex ? null : index);
//       };

//       const CustomTooltip = ({ active, payload }) => {
//         if (active && payload && payload.length) {
//           const item = payload[0].payload;
//           const isTop = item.name === topName;
//           // const label = keys[1].charAt(0).toUpperCase() + keys[1].slice(1);

//           return (
//             <div className="bg-white border border-gray-300 rounded shadow px-3 py-2 text-sm font-semibold">
//               <div className="flex items-center gap-1 text-gray-800 font-bold text-lg">
//                 {isTop && <FaCrown className="text-yellow-500 text-lg" />}
//                 <span>{item.name}</span>
//               </div>
//               <div>{keys[1]}: {item.value.toLocaleString()}</div>
//             </div>
//           );
//         }
//         return null;
//       };

//       return (
//         <div className="h-96 w-full">
//           <ResponsiveContainer width="100%" height="100%">
//             <PieChart>
//               <Pie
//                 data={chartData}
//                 dataKey="value"
//                 nameKey="name"
//                 cx="50%"
//                 cy="50%"
//                 outerRadius={120}
//                 activeIndex={activeIndex}
//                 activeShape={renderActiveShape}
//                 onClick={handleClick}
//                 isAnimationActive={true}
//                 animationDuration={400}
//                 animationBegin={0}
//               >
//                 {chartData.map((entry, index) => (
//                   <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
//                 ))}
//               </Pie>
//               <ReTooltip content={<CustomTooltip />} />
//               <Legend verticalAlign="bottom" height={60} />
//             </PieChart>
//           </ResponsiveContainer>
//         </div>
//       );

//     case "line":
//       return (
//         <div className="mt-4 h-80 w-full overflow-x-auto">
//           <ResponsiveContainer width="100%" height="100%">
//             <LineChart data={data}>
//               <CartesianGrid strokeDasharray="3 3" />
//               <XAxis dataKey={keys[0]} />
//               <YAxis />
//               <ReTooltip />
//               <Line type="monotone" dataKey={keys[1]} stroke="#8884d8" strokeWidth={2} />
//             </LineChart>
//           </ResponsiveContainer>
//         </div>
//       );

//     case "kpi":
//       const totalValue = data.reduce((sum, item) => sum + Number(item[keys[0]]), 0);
//       return (
//         <div className="mt-4 p-6 bg-blue-600 text-white rounded-lg text-center shadow-lg">
//           <p className="text-3xl font-bold">{totalValue.toLocaleString()}</p>
//         </div>
//       );

//     case "heatmap":
//       const numericKeys = keys.filter(k => !isNaN(Number(data[0][k])));
//       const allValues = data.flatMap(row => numericKeys.map(k => Number(row[k])));
//       const minValue = Math.min(...allValues);
//       const maxValue = Math.max(...allValues);

//       return (
//         <div className="mt-4 border rounded overflow-hidden">
//           <div className="flex justify-end p-2">
//             {/* <button
//               onClick={handleExportTable}
//               title="Export Table"
//               className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center"
//             >
//               <FaFileExcel size={20} />
//             </button> */}
//           </div>
//           <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
//             <table className="border-collapse border w-full min-w-max text-sm">
//               <thead className="bg-[#152342FF] sticky top-0 z-10">
//                 <tr>
//                   {keys.map((k) => {
//                     const isNumeric = !isNaN(Number(data[0][k]));
//                     return (
//                       <th
//                         key={k}
//                         className={`border px-3 py-2 font-semibold text-white ${isNumeric ? "text-right" : "text-left"
//                           }`}
//                       >
//                         {k}
//                       </th>
//                     );
//                   })}
//                 </tr>
//               </thead>
//               <tbody>
//                 {data.map((row, i) => (
//                   <tr key={i}>
//                     {keys.map((k, j) => {
//                       const value = Number(row[k]);
//                       if (isNaN(value)) {
//                         return (
//                           <td key={j} className="border px-3 py-2 text-center">{row[k]}</td>
//                         );
//                       }
//                       const intensity = (value - minValue) / (maxValue - minValue);
//                       const colorValue = Math.floor(255 - intensity * 200);
//                       return (
//                         <td
//                           key={j}
//                           className="border px-3 py-2 font-semibold text-right"
//                           style={{ backgroundColor: `rgb(${colorValue}, ${colorValue}, 255)` }}
//                         >
//                           {value.toLocaleString()}
//                         </td>
//                       );
//                     })}
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
//         </div>
//       );

//     case "map":
//       const regionKey = keys[0];
//       const valueKey = keys[1];

//       const regionData = {};
//       data.forEach(d => {
//         regionData[d[regionKey]] = Number(d[valueKey]);
//       });

//       const values = Object.values(regionData);
//       const min = Math.min(...values);
//       const max = Math.max(...values);

//       const sizeScale = scaleLinear()
//         .domain([min, max])
//         .range([5, 40]);
//       return (
//         <div className="mt-4 w-full overflow-x-auto">
//           <ComposableMap
//             projection="geoMercator"
//             projectionConfig={{ scale: 1000, center: [78.9629, 22.5937] }}
//           >
//             <Geographies geography={indiaGeoUrl}>
//               {({ geographies }) =>
//                 geographies.map(geo => {
//                   // console.log(geo.properties);
//                   const stateName = geo.properties.NAME_1;
//                   const value = regionData[stateName] || 0;
//                   const centroid = geoCentroid(geo);

//                   return (
//                     <React.Fragment key={geo.rsmKey}>
//                       {/* Base state shape */}
//                       <Geography
//                         geography={geo}
//                         fill="#ffff"
//                         stroke="#444"
//                         style={{
//                           default: { outline: "none" },
//                           hover: { outline: "none" },
//                           pressed: { outline: "none" },
//                         }}
//                       />

//                       {/* Add circle if this state has value */}
//                       {value > 0 && (
//                         <Marker coordinates={centroid}>
//                           <circle
//                             r={sizeScale(value)}
//                             fill="red"
//                             opacity={0.9}
//                             stroke="#fff"
//                             strokeWidth={1}
//                           />
//                           <title>{`${stateName}: ${value}`}</title>
//                         </Marker>
//                       )}
//                     </React.Fragment>
//                   );
//                 })
//               }
//             </Geographies>
//           </ComposableMap>
//         </div>
//       );

//     default:
//       return <p className="mt-4 text-gray-500">Unsupported visualization type</p>;
//   }
// }


import React, { useState, useMemo, useCallback } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip as ReTooltip,
  Legend,
  ResponsiveContainer,
  Sector,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  AreaChart,
  Area,
  LineChart,
  Line,
} from "recharts";
import { FaCrown, FaFileExcel } from "react-icons/fa";
import { ComposableMap, Geographies, Geography, Marker } from "react-simple-maps";
import { scaleLinear } from "d3-scale";
import { geoCentroid } from "d3-geo";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import api from "../../api";
import { motion } from "framer-motion";

const indiaGeoUrl = "/india_state_geo.json";

// --- Visual helpers (purely cosmetic, logic unchanged) ---
const NEON = {
  primary: "#00F0FF",
  accent: "#9D4EDD",
  deep: "#071016",
};

const containerFade = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.36, ease: "easeOut" } },
};

export default function ModuleChart({ data, type, isApprovalModule, approvalIdColumn, queryId, userId, onRefresh, limitHeight }) {
  // --- 1. ALL HOOKS MUST BE DEFINED HERE (TOP LEVEL) ---
  const [activeIndex, setActiveIndex] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("");
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState("asc");
  const [selectedApprovalIds, setSelectedApprovalIds] = useState([]);

  // --- Core Sorting Logic (useCallback) ---
  const sortData = useCallback((d, column, direction) => {
    if (!column || !direction) return d;
    return [...d].sort((a, b) => {
      const valA = a[column];
      const valB = b[column];
      const isNumeric = !isNaN(Number(valA)) && !isNaN(Number(valB));
      let comparison = 0;
      if (isNumeric) comparison = Number(valA) - Number(valB);
      else {
        const strA = String(valA || "").toLowerCase();
        const strB = String(valB || "").toLowerCase();
        comparison = strA > strB ? 1 : strA < strB ? -1 : 0;
      }
      return direction === "desc" ? comparison * -1 : comparison;
    });
  }, []);

  const handleSort = useCallback((key) => {
    setSortColumn((prev) => {
      if (prev === key) {
        setSortDirection((dir) => {
          if (dir === "asc") return "desc";
          if (dir === "desc") return null;
          return "asc";
        });
        return key;
      }
      setSortDirection("asc");
      return key;
    });
  }, []);

  // --- Memoized datasets ---
  const sortedAndFilteredData = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const filtered = term
      ? data.filter((row) => Object.values(row).some((v) => String(v).toLowerCase().includes(term)))
      : data;
    return sortData(filtered, sortColumn, sortDirection);
  }, [data, searchTerm, sortColumn, sortDirection, sortData]);

  const sortedAndFilteredHeatmapData = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const filtered = term
      ? data.filter((row) => Object.values(row).some((v) => String(v).toLowerCase().includes(term)))
      : data;
    return sortData(filtered, sortColumn, sortDirection);
  }, [data, searchTerm, sortColumn, sortDirection, sortData]);

  // --- 2. DATA VALIDATION AND EARLY RETURN (MUST BE AFTER ALL HOOKS) ---
  if (!data || data.length === 0) {
    return (
      <motion.div variants={containerFade} initial="hidden" animate="show" className="p-6 bg-[#071017] rounded-lg border border-[#0f1720] text-center">
        <div className="text-sm text-slate-400">No data to display</div>
      </motion.div>
    );
  }

  const keys = Object.keys(data[0]);
  const COLORS = [
    "#00F0FF", "#4F46E5", "#A855F7", "#9D4EDD", "#EA5F89", "#2B0B3F", "#6366F1",
    "#FBCF00", "#D3974E", "#C084FC", "#E9D5FF",
  ];

  // --- HANDLER FUNCTIONS (non-hook) ---
  const handleExportTable = () => {
    if (!data || data.length === 0) return;
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data");
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([wbout], { type: "application/octet-stream" });
    saveAs(blob, "data.xlsx");
  };

  const handleApproval = async (rowId) => {
    setSelectedApprovalIds((prev) => (prev.includes(rowId) ? prev.filter((id) => id !== rowId) : [...prev, rowId]));

    try {
      await api.post(`/admin/approve-row/${userId}`, {
        QueryId: queryId,
        RowId: rowId,
      });
      setSelectedApprovalIds((prev) => prev.filter((id) => id !== rowId));
      if (onRefresh) onRefresh();
    } catch (err) {
      // keep original behavior (alert) but styled fallback
      // eslint-disable-next-line no-alert
      alert("Approval failed: " + (err.response?.data?.message || err.message));
      setSelectedApprovalIds((prev) => prev.filter((id) => id !== rowId));
    }
  };

  // --- RENDER SWITCH ---
  switch (type) {
    case "table":
      return (
        <motion.div variants={containerFade} initial="hidden" animate="show" className="mt-2 border rounded-lg overflow-hidden bg-[#041018]/60 backdrop-blur p-0 border-[#0b1620]">
          <div className="flex flex-wrap gap-2 items-center justify-between p-3 bg-[#061624]/60 border-b border-[#0b1620]">
            <div className="flex items-center gap-3">
              <input
                type="text"
                placeholder="Search..."
                className="border px-3 py-2 rounded w-60 bg-[#021016] text-slate-200 placeholder-slate-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {/* <button onClick={handleExportTable} className="px-3 py-2 bg-[#9D4EDD] text-black rounded hover:scale-[1.02] transition">Export</button> */}
            </div>
            <div className="text-sm text-slate-400">Columns: {keys.length}</div>
          </div>

          <div className={`overflow-x-auto ${limitHeight ? "max-h-[420px] overflow-y-auto" : ""}`}>
            <table className="border-collapse border w-full min-w-max text-sm bg-transparent">
              <thead className="sticky top-0 z-10 bg-[#0a2345]">
                <tr>
                  {isApprovalModule && <th className="border px-3 py-2 font-semibold text-slate-200">Approve</th>}
                  {keys.map((k) => {
                    const isNumeric = !isNaN(Number(data[0]?.[k]));
                    const activeDirectionIcon = sortDirection === "asc" ? "▲" : "▼";
                    const defaultIcon = "↕";
                    return (
                      <th
                        key={k}
                        onClick={() => handleSort(k)}
                        className={`border px-3 py-2 font-semibold text-slate-200 cursor-pointer select-none ${isNumeric ? "text-right" : "text-left"} hover:bg-[#3b2f8a]/80 transition-colors duration-150`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate">{k}</span>
                          <span className={`ml-2 text-xs ${sortColumn === k ? "opacity-100 text-slate-200" : "opacity-50 text-slate-500"}`}>
                            {sortColumn === k ? activeDirectionIcon : defaultIcon}
                          </span>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {sortedAndFilteredData.map((row, i) => {
                  const rowId = row[approvalIdColumn];
                  const isRowSelected = selectedApprovalIds.includes(rowId);
                  const isTotalRow = Object.values(row).some((val) => typeof val === "string" && String(val).toLowerCase().includes("total"));
                  return (
                    <tr key={rowId || i} className={`${isTotalRow ? "bg-[#0b2140] text-white font-semibold" : "hover:bg-[#3b2f8a]/80"}`}>
                      {isApprovalModule && (
                        <td className="border px-3 py-2 text-center">
                          <input type="checkbox" checked={isRowSelected} onChange={() => handleApproval(rowId)} className="w-4 h-4 accent-[#00F0FF]" />
                        </td>
                      )}
                      {keys.map((k, j) => {
                        const cellValue = row[k];
                        const isNumeric = !isNaN(Number(cellValue));
                        const isTotalColumn = k && String(k).toLowerCase().includes("total");
                        let cellClasses = `border px-3 py-2 ${isNumeric ? "text-right" : "text-left"}`;
                        if (isTotalRow || isTotalColumn) cellClasses += " bg-[#0b2140] text-white font-semibold";
                        else if (sortColumn === k) cellClasses += " bg-[#022a4a]/30";
                        return (
                          <td key={j} className={cellClasses}>
                            {cellValue}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}

                {sortedAndFilteredData.length === 0 && (
                  <tr>
                    <td colSpan={keys.length + (isApprovalModule ? 1 : 0)} className="text-center py-4 text-slate-500">
                      No results found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      );

    case "pie": {
      const allColumns = keys || [];
      let filterColumn = null;
      let xCol = "";
      let yCol = "";
      if (allColumns.length === 2) [xCol, yCol] = allColumns;
      else if (allColumns.length >= 3) [filterColumn, xCol, yCol] = allColumns;

      const filterOptions = filterColumn ? [...new Set(data.map((d) => d[filterColumn]))].filter(Boolean) : [];

      const chartFilteredData = filterColumn && selectedFilter ? data.filter((d) => String(d[filterColumn]) === String(selectedFilter)) : data;

      const chartData = chartFilteredData
        .filter((item) => item[xCol] && !isNaN(Number(item[yCol])))
        .map((item) => ({ name: item[xCol], value: Number(item[yCol]) }));

      const sortedData = [...chartData].sort((a, b) => b.value - a.value);
      const topName = sortedData[0]?.name;

      if (chartData.length === 0) {
        return (
          <div className="p-4 border rounded text-center text-slate-400 bg-[#041018]">No data available for this selection.</div>
        );
      }

      const renderActiveShape = (props) => {
        const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
        return <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius + 12} startAngle={startAngle} endAngle={endAngle} fill={fill} />;
      };

      const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
          const item = payload[0].payload;
          const isTop = item.name === topName;
          return (
            <div className="bg-white border border-[#e6eef9] rounded shadow px-3 py-2 text-sm font-semibold">
              <div className="flex items-center gap-2 text-gray-800 font-bold">
                {isTop && <FaCrown className="text-yellow-500" />}
                <span>{item.name}</span>
              </div>
              <div className="text-slate-600">{yCol}: {item.value.toLocaleString()}</div>
            </div>
          );
        }
        return null;
      };

      const renderLegend = () => (
        <div className="border-t border-[#0b1620] mt-3 pt-3">
          <h4 className="text-sm font-semibold text-slate-400 mb-2">{xCol}</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto">
            {chartData.map((entry, index) => (
              <div key={`legend-${index}-${entry.name}`} className="flex items-center text-sm text-slate-300 gap-2">
                <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                <span className="truncate" title={entry.name}>{entry.name}</span>
              </div>
            ))}
          </div>
        </div>
      );

      return (
        <motion.div variants={containerFade} initial="hidden" animate="show" className="h-96 w-full p-3 bg-[#041018]/60 rounded-lg border border-[#0f1720]">
          {filterColumn && (
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm text-slate-300">Filter by {filterColumn}:</span>
              <select value={selectedFilter} onChange={(e) => setSelectedFilter(e.target.value)} className="border px-3 py-1 rounded text-sm bg-[#021016] text-slate-200">
                <option value="">All {filterColumn}</option>
                {filterOptions.map((opt, i) => (
                  <option key={i} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
          )}

          <ResponsiveContainer width="100%" height="80%">
            <PieChart>
              <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={110} activeIndex={activeIndex} activeShape={renderActiveShape} onClick={(_, idx) => setActiveIndex(idx === activeIndex ? null : idx)} isAnimationActive animationDuration={450}>
                {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <ReTooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          {renderLegend()}
        </motion.div>
      );
    }

    case "bar":
      return (
        <motion.div variants={containerFade} initial="hidden" animate="show" className="mt-4 h-80 w-full p-2 bg-[#041018]/50 rounded-lg border border-[#0f1720]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#07314a" />
              <XAxis dataKey={keys[0]} stroke="#9fb7c9" />
              <YAxis stroke="#9fb7c9" />
              <ReTooltip />
              <Bar dataKey={keys[1]} fill={NEON.primary} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      );

    case "area":
      return (
        <motion.div variants={containerFade} initial="hidden" animate="show" className="mt-4 h-80 w-full p-2 bg-[#041018]/50 rounded-lg border border-[#0f1720]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#07314a" />
              <XAxis dataKey={keys[0]} stroke="#9fb7c9" />
              <YAxis stroke="#9fb7c9" />
              <ReTooltip />
              <Area type="monotone" dataKey={keys[1]} stroke="#9D4EDD" fill="url(#gradArea)" />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>
      );

    case "line":
      return (
        <motion.div variants={containerFade} initial="hidden" animate="show" className="mt-4 h-80 w-full p-2 bg-[#041018]/50 rounded-lg border border-[#0f1720]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#07314a" />
              <XAxis dataKey={keys[0]} stroke="#9fb7c9" />
              <YAxis stroke="#9fb7c9" />
              <ReTooltip />
              <Line type="monotone" dataKey={keys[1]} stroke="#9D4EDD" strokeWidth={2} dot />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>
      );

    case "kpi": {
      const totalValue = data.reduce((sum, item) => sum + Number(item[keys[0]] || 0), 0);
      return (
        <motion.div variants={containerFade} initial="hidden" animate="show" className="mt-4 p-6 bg-gradient-to-r from-[#00F0FF]/20 via-[#9D4EDD]/14 to-[#ffffff]/4 text-white rounded-lg text-center border border-[#0f1720] shadow-[0_10px_40px_rgba(157,78,221,0.06)]">
          {/* <div className="text-xs tracking-widest text-slate-300">KEY METRIC</div> */}
          <p className="text-4xl font-extrabold mt-2" style={{ color: NEON.primary }}>{totalValue.toLocaleString()}</p>
        </motion.div>
      );
    }

    case "heatmap": {
      const finalHeatmapData = sortedAndFilteredHeatmapData;
      const hasData = finalHeatmapData.length > 0;
      const numericKeys = hasData ? keys.filter((k) => !isNaN(Number(data[0][k]))) : [];
      const allValues = finalHeatmapData.flatMap((row) => numericKeys.map((k) => Number(row[k])));
      const minValue = Math.min(...allValues.filter((v) => isFinite(v)));
      const maxValue = Math.max(...allValues.filter((v) => isFinite(v)));

      return (
        <motion.div variants={containerFade} initial="hidden" animate="show" className="mt-4 border rounded-lg overflow-hidden bg-[#041018]/60">
          <div className="flex flex-wrap gap-2 items-center justify-between p-3 bg-[#061624]/60 border-b border-[#0b1620]">
            <input type="text" placeholder="Search..." className="border px-3 py-2 rounded w-60 bg-[#021016] text-slate-200 placeholder-slate-500" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            <div className="text-sm text-slate-400">Heatmap Preview</div>
          </div>

          <div className={`overflow-x-auto ${limitHeight ? "max-h-[420px] overflow-y-auto" : ""}`}>
            <table className="border-collapse border w-full min-w-max text-sm bg-transparent">
              <thead className="sticky top-0 z-10  bg-[#0a2345]">
                <tr>
                  {isApprovalModule && <th className="border px-3 py-2 font-semibold text-slate-200">Approve</th>}
                  {keys.map((k) => {
                    const isNumeric = hasData && !isNaN(Number(data[0][k]));
                    const activeDirectionIcon = sortDirection === "asc" ? "▲" : "▼";
                    const defaultIcon = "↕";
                    return (
                      <th key={k} onClick={() => handleSort(k)} className={`border px-3 py-2 font-semibold text-slate-200 cursor-pointer select-none hover:bg-[#3b2f8a]/80 ${isNumeric ? "text-right" : "text-left"}`}>
                        <div className="flex items-center justify-between">
                          <span className="truncate">{k}</span>
                          <span className={`ml-2 text-xs ${sortColumn === k ? "opacity-100 text-slate-200" : "opacity-50 text-slate-500"}`}>{sortColumn === k ? activeDirectionIcon : defaultIcon}</span>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {finalHeatmapData.map((row, i) => {
                  const rowId = row[approvalIdColumn];
                  const isRowSelected = selectedApprovalIds.includes(rowId);
                  return (
                    <tr key={rowId || i} className="hover:bg-[#3b2f8a]/80">
                      {isApprovalModule && (
                        <td className="border px-3 py-2 text-center">
                          <input type="checkbox" checked={isRowSelected} onChange={() => handleApproval(rowId)} className="w-4 h-4 accent-[#9D4EDD]" />
                        </td>
                      )}
                      {keys.map((k, j) => {
                        const value = Number(row[k]);
                        if (isNaN(value) || !isFinite(value)) return <td key={j} className="border px-3 py-2 text-center">{row[k]}</td>;
                        const range = maxValue - minValue;
                        const intensity = range > 0 ? (value - minValue) / range : 0.5;
                        const colorValue = Math.floor(255 - intensity * 160);
                        return (
                          <td key={j} className="border px-3 py-2 font-bold text-black text-right" style={{ backgroundColor: `rgb(${colorValue}, ${colorValue}, 255)` }}>{value.toLocaleString()}</td>
                        );
                      })}
                    </tr>
                  );
                })}
                {finalHeatmapData.length === 0 && (
                  <tr>
                    <td colSpan={keys.length + (isApprovalModule ? 1 : 0)} className="text-center py-4 text-slate-500">No results found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      );
    }

    case "map": {
      const regionKey = keys[0];
      const valueKey = keys[1];
      const regionData = {};
      data.forEach((d) => { regionData[d[regionKey]] = Number(d[valueKey]); });
      const values = Object.values(regionData); const min = Math.min(...values); const max = Math.max(...values);
      const sizeScale = scaleLinear().domain([min, max]).range([5, 40]);

      return (
        <motion.div variants={containerFade} initial="hidden" animate="show" className="mt-4 w-full overflow-x-auto p-2 bg-[#041018]/50 rounded-lg border border-[#0f1720]">
          <ComposableMap projection="geoMercator" projectionConfig={{ scale: 1000, center: [78.9629, 22.5937] }}>
            <Geographies geography={indiaGeoUrl}>
              {({ geographies }) => geographies.map((geo) => {
                const stateName = geo.properties.NAME_1;
                const value = regionData[stateName] || 0;
                const centroid = geoCentroid(geo);
                return (
                  <React.Fragment key={geo.rsmKey}>
                    <Geography geography={geo} fill="#0b1220" stroke="#17354a" style={{ default: { outline: "none" }, hover: { outline: "none" }, pressed: { outline: "none" } }} />
                    {value > 0 && (
                      <Marker coordinates={centroid}>
                        <circle r={sizeScale(value)} fill="#00F0FF" opacity={0.9} stroke="#071017" strokeWidth={1} />
                        <title>{`${stateName}: ${value}`}</title>
                      </Marker>
                    )}
                  </React.Fragment>
                );
              })}
            </Geographies>
          </ComposableMap>
        </motion.div>
      );
    }

    default:
      return <p className="mt-4 text-slate-400">Unsupported visualization type</p>;
  }
}

