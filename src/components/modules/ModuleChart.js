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
import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import { scaleLinear } from "d3-scale";
import { Marker } from "react-simple-maps";
import { geoCentroid } from "d3-geo";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import api from "../../api";

const indiaGeoUrl = "/india_state_geo.json";

export default function ModuleChart({ data, type, isApprovalModule, approvalIdColumn, queryId, userId, onRefresh, limitHeight }) {
  // --- 1. ALL HOOKS MUST BE DEFINED HERE (TOP LEVEL) ---
  const [activeIndex, setActiveIndex] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Kept for Pie Chart logic
  const [selectedFilter, setSelectedFilter] = useState("");

  // Sorting State
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');

  // State to track which row IDs have been checked for approval
  const [selectedApprovalIds, setSelectedApprovalIds] = useState([]);

  // --- Core Sorting Logic (useCallback) ---
  const sortData = useCallback((data, column, direction) => {
    if (!column || !direction) return data;

    return [...data].sort((a, b) => {
      const valA = a[column];
      const valB = b[column];
      const isNumeric = !isNaN(Number(valA)) && !isNaN(Number(valB));

      let comparison = 0;

      if (isNumeric) {
        comparison = Number(valA) - Number(valB);
      } else {
        const strA = String(valA || "").toLowerCase();
        const strB = String(valB || "").toLowerCase();
        if (strA > strB) {
          comparison = 1;
        } else if (strA < strB) {
          comparison = -1;
        }
      }

      return direction === 'desc' ? comparison * -1 : comparison;
    });
  }, []);

  // Function to handle header click for sorting (useCallback)
  const handleSort = useCallback((key) => {
    setSortColumn(prevCol => {
      if (prevCol === key) {
        setSortDirection(prevDir => {
          if (prevDir === 'asc') return 'desc';
          if (prevDir === 'desc') return null;
          return 'asc';
        });
        return sortDirection === 'desc' ? null : prevCol;
      } else {
        setSortDirection('asc');
        return key;
      }
    });
  }, [sortDirection]);

  // --- Data Source for Table (useMemo) ---
  const sortedAndFilteredData = useMemo(() => {
    const searchFiltered = data.filter(row => {
      return Object.values(row)
        .some(val => String(val).toLowerCase().includes(searchTerm.toLowerCase()));
    });

    return sortData(searchFiltered, sortColumn, sortDirection);

  }, [data, searchTerm, sortColumn, sortDirection, sortData]);

  const sortedAndFilteredHeatmapData = useMemo(() => {
    // 1. Apply Search filter
    const searchFiltered = data.filter(row => {
      return Object.values(row)
        .some(val => String(val).toLowerCase().includes(searchTerm.toLowerCase()));
    });

    // 2. Apply Sorting
    return sortData(searchFiltered, sortColumn, sortDirection);

  }, [data, searchTerm, sortColumn, sortDirection, sortData]);

  // --- 2. DATA VALIDATION AND EARLY RETURN (MUST BE AFTER ALL HOOKS) ---
  if (!data || data.length === 0) {
    return <p className="text-center text-gray-500">No data to display</p>;
  }

  const keys = Object.keys(data[0]);
  const COLORS = [
    "#0000FF", "#4F46E5", "#A855F7", "#57167E", "#9B3192", "#EA5F89", "#2B0B3F", "#6366F1",
    "#FBCF00", "#423C2E", "#822513", "#D3974E", "#C084FC", "#E9D5FF", "#152342FF"
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
    setSelectedApprovalIds(prev =>
      prev.includes(rowId) ? prev.filter(id => id !== rowId) : [...prev, rowId]
    );

    try {
      await api.post(`/admin/approve-row/${userId}`, {
        QueryId: queryId,
        RowId: rowId,
      });

      setSelectedApprovalIds(prev => prev.filter(id => id !== rowId));
      if (onRefresh) onRefresh();

    } catch (err) {
      alert("Approval failed: " + err.response?.data?.message);
      setSelectedApprovalIds(prev => prev.filter(id => id !== rowId));
    }
  };


  switch (type) {
    case "table":
      return (
        <div className="mt-2 border rounded overflow-hidden">
          <div className="flex flex-wrap gap-2 items-center justify-between p-3 bg-gray-100 border-b">
            <input
              type="text"
              placeholder="Search..."
              className="border px-3 py-2 rounded w-60"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className={`overflow-x-auto ${limitHeight ? 'max-h-[400px] overflow-y-auto' : ''}`}>
            <table className="border-collapse border w-full min-w-max text-sm">
              <thead className="bg-[#152342FF] sticky top-0 z-10">
                <tr>
                  {isApprovalModule && <th className="border px-3 py-2 font-semibold text-white">Approve</th>}
                  {keys.map((k) => {
                    // Check against data[0] is safe because we checked if data.length > 0 above.
                    const isNumeric = !isNaN(Number(data[0]?.[k]));
                    // Show the icon based on the current sort direction
                    const activeDirectionIcon = sortDirection === 'asc' ? '▲' : '▼';

                    // Show a neutral, permanent icon for unsorted columns
                    const defaultIcon = '↕';

                    return (
                      <th
                        key={k}
                        onClick={() => handleSort(k)}
                        className={`border px-3 py-2 font-semibold text-white cursor-pointer select-none 
                                                ${isNumeric ? "text-right" : "text-left"} 
                                                hover:bg-[#20305BFF] transition-colors duration-150`}
                      >
                        <span className="flex items-center gap-1 justify-between">
                          {k}
                          {/* PERMANENTLY VISIBLE SORT INDICATOR LOGIC */}
                          <span
                            className={`ml-1 text-xs transition-opacity duration-200 
                                                    ${sortColumn === k
                                ? 'opacity-100' // Fully visible if sorting this column
                                : 'opacity-50 text-gray-300' // Lightly visible if not sorting
                              }`
                            }
                          >
                            {sortColumn === k
                              ? activeDirectionIcon // Show actual direction
                              : defaultIcon // Show neutral icon
                            }
                          </span>
                        </span>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {/* Uses the memoized, sorted, and filtered data */}
                {sortedAndFilteredData.map((row, i) => {
                  const rowId = row[approvalIdColumn];
                  const isRowSelected = selectedApprovalIds.includes(rowId);

                  const isTotalRow = Object.values(row).some(
                    (val) => typeof val === "string" && String(val).toLowerCase().includes("total")
                  );

                  return (
                    <tr
                      key={rowId || i}
                      className={isTotalRow ? "bg-[#152342FF] text-white font-semibold" : "hover:bg-gray-50"}
                    >
                      {isApprovalModule && (
                        <td className="border px-3 py-2 text-center">
                          <input
                            type="checkbox"
                            checked={isRowSelected}
                            onChange={() => handleApproval(rowId)}
                            className="w-4 h-4 accent-indigo-600"
                          />
                        </td>
                      )}
                      {keys.map((k, j) => {
                        const cellValue = row[k];
                        const isNumeric = !isNaN(Number(cellValue));
                        const isTotalColumn = k && String(k).toLowerCase().includes("total");

                        let cellClasses = `border px-3 py-2 ${isNumeric ? "text-right" : "text-left"}`;

                        if (isTotalRow || isTotalColumn) {
                          cellClasses += " bg-[#152342FF] text-white font-semibold";
                        } else if (sortColumn === k) {
                          cellClasses += " bg-indigo-50/50";
                        }

                        return (
                          <td
                            key={j}
                            className={cellClasses}
                          >
                            {cellValue}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}

                {sortedAndFilteredData.length === 0 && (
                  <tr>
                    <td colSpan={keys.length + (isApprovalModule ? 1 : 0)} className="text-center py-4 text-gray-500">
                      No results found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      );

    // --- PIE CHART CASE (Filtering Logic Restored) ---
    case "pie": {
      const allColumns = keys || [];

      let filterColumn = null;
      let xCol = "";
      let yCol = "";

      if (allColumns.length === 2) {
        [xCol, yCol] = allColumns;
      } else if (allColumns.length >= 3) {
        [filterColumn, xCol, yCol] = allColumns;
      }

      const filterOptions = filterColumn
        ? [...new Set(data.map((d) => d[filterColumn]))].filter(Boolean)
        : [];

      const chartFilteredData = filterColumn && selectedFilter
        ? data.filter((d) => String(d[filterColumn]) === String(selectedFilter))
        : data;

      const chartData = chartFilteredData
        .filter((item) => item[xCol] && !isNaN(Number(item[yCol])))
        .map((item) => ({
          name: item[xCol],
          value: Number(item[yCol]),
        }));
      const sortedData = [...chartData].sort((a, b) => b.value - a.value);
      const topName = sortedData[0]?.name;

      if (chartData.length === 0) {
        return (
          <div className="p-4 border rounded text-center text-gray-500">
            No data available for this selection.
          </div>
        );
      }

      const renderActiveShape = (props) => {
        const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
        return (
          <Sector
            cx={cx}
            cy={cy}
            innerRadius={innerRadius}
            outerRadius={outerRadius + 10}
            startAngle={startAngle}
            endAngle={endAngle}
            fill={fill}
          />
        );
      };

      const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
          const item = payload[0].payload;
          const isTop = item.name === topName;
          // const label = keys[1].charAt(0).toUpperCase() + keys[1].slice(1);

          return (
            <div className="bg-white border border-gray-300 rounded shadow px-3 py-2 text-sm font-semibold">
              <div className="flex items-center gap-1 text-gray-800 font-bold text-lg">
                {isTop && <FaCrown className="text-yellow-500 text-lg" />}
                <span>{item.name}</span>
              </div>
              <div>{keys[1]}: {item.value.toLocaleString()}</div>
            </div>
          );
        }
        return null;
      };

      const renderLegend = () => (
        <div className="border-t border-gray-700">
          {/* Clear Heading for Legend Data */}
          <h4 className="text-sm font-semibold text-gray-600 mt-2 mb-2">
            {xCol}
          </h4>

          {/* Organized Multi-Column Layout */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-1 max-h-40 overflow-y-auto">
            {chartData.map((entry, index) => (
              // Use a more stable key if possible, but index is safe if data order is stable
              <div key={`legend-${index}-${entry.name}`} className="flex items-center text-sm text-gray-700">
                {/* Color Swatch */}
                <span
                  className="w-2 h-2 rounded-sm mr-2 flex-shrink-0"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                {/* Legend Label - Use full label for distinction if needed, otherwise use name */}
                <span title={entry.name} className="leading-tight">
                  {entry.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      );

      return (
        <div className="h-96 w-full">
          {filterColumn && (
            <div className="flex justify-start mb-3 items-center gap-2">
              <span className="text-sm font-semibold text-gray-700">
                Filter by {filterColumn}:
              </span>
              <select
                value={selectedFilter}
                onChange={(e) => setSelectedFilter(e.target.value)}
                className="border px-3 py-1 rounded text-sm"
              >
                <option value="">All {filterColumn}</option>
                {filterOptions.map((opt, i) => (
                  <option key={i} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          )}

          <ResponsiveContainer width="100%" height="90%">
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={120}
                activeIndex={activeIndex}
                activeShape={renderActiveShape}
                onClick={(_, index) => setActiveIndex(index === activeIndex ? null : index)}
                isAnimationActive={true}
                animationDuration={400}
              >
                {chartData.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <ReTooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          {renderLegend()}
        </div>
      );
    }

    case "bar":
      return (
        <div className="mt-4 h-80 w-full overflow-x-auto">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={keys[0]} />
              <YAxis />
              <ReTooltip />
              <Bar dataKey={keys[1]} fill="#0000ff" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      );

    case "area":
      return (
        <div className="mt-4 h-80 w-full overflow-x-auto">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={keys[0]} />
              <YAxis />
              <ReTooltip />
              <Area type="monotone" dataKey={keys[1]} stroke="#0000ff" fill="#0000ff" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      );

    case "line":
      return (
        <div className="mt-4 h-80 w-full overflow-x-auto">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={keys[0]} />
              <YAxis />
              <ReTooltip />
              <Line type="monotone" dataKey={keys[1]} stroke="#8884d8" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      );

    case "kpi":
      const totalValue = data.reduce((sum, item) => sum + Number(item[keys[0]]), 0);
      return (
        <div className="mt-4 p-6 bg-blue-600 text-white rounded-lg text-center shadow-lg">
          <p className="text-3xl font-bold">{totalValue.toLocaleString()}</p>
        </div>
      );

    case "heatmap":
      const finalHeatmapData = sortedAndFilteredHeatmapData;

      // Note: The min/max calculation must use the final filtered and sorted data
      const hasData = finalHeatmapData.length > 0;
      const numericKeys = hasData ? keys.filter(k => !isNaN(Number(data[0][k]))) : [];

      const allValues = finalHeatmapData.flatMap(row => numericKeys.map(k => Number(row[k])));
      const minValue = Math.min(...allValues.filter(v => isFinite(v)));
      const maxValue = Math.max(...allValues.filter(v => isFinite(v)));

      return (
        <div className="mt-4 border rounded overflow-hidden">
          <div className="flex flex-wrap gap-2 items-center justify-between p-3 bg-gray-100 border-b">
            <input
              type="text"
              placeholder="Search..."
              className="border px-3 py-2 rounded w-60"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className={`overflow-x-auto ${limitHeight ? 'max-h-[400px] overflow-y-auto' : ''}`}>
            <table className="border-collapse border w-full min-w-max text-sm">
              <thead className="bg-[#152342FF] sticky top-0 z-10">
                <tr>
                  {/* Approval Column for Heatmap */}
                  {isApprovalModule && <th className="border px-3 py-2 font-semibold text-white">Approve</th>}
                  {keys.map((k) => {
                    const isNumeric = hasData && !isNaN(Number(data[0][k]));
                    const activeDirectionIcon = sortDirection === 'asc' ? '▲' : '▼';
                    const defaultIcon = '↕';

                    return (
                      <th
                        key={k}
                        onClick={() => handleSort(k)}
                        className={`border px-3 py-2 font-semibold text-white cursor-pointer select-none 
                                                ${isNumeric ? "text-right" : "text-left"} 
                                                hover:bg-[#20305BFF] transition-colors duration-150`}
                      >
                        <span className="flex items-center gap-1 justify-between">
                          {k}
                          {/* PERMANENTLY VISIBLE SORT INDICATOR LOGIC (Restored) */}
                          <span
                            className={`ml-1 text-xs transition-opacity duration-200 
                                                        ${sortColumn === k
                                ? 'opacity-100'
                                : 'opacity-50 text-gray-300'
                              }`
                            }
                          >
                            {sortColumn === k
                              ? activeDirectionIcon
                              : defaultIcon
                            }
                          </span>
                        </span>
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
                    <tr key={rowId || i}>
                      {/* Approval Checkbox for Heatmap */}
                      {isApprovalModule && (
                        <td className="border px-3 py-2 text-center">
                          <input
                            type="checkbox"
                            checked={isRowSelected}
                            onChange={() => handleApproval(rowId)}
                            className="w-4 h-4 accent-indigo-600"
                          />
                        </td>
                      )}
                      {keys.map((k, j) => {
                        const value = Number(row[k]);
                        if (isNaN(value) || !isFinite(value)) {
                          return (
                            <td key={j} className="border px-3 py-2 text-center">{row[k]}</td>
                          );
                        }
                        const range = maxValue - minValue;
                        const intensity = range > 0 ? (value - minValue) / range : 0.5;
                        const colorValue = Math.floor(255 - intensity * 200);
                        return (
                          <td
                            key={j}
                            className="border px-3 py-2 font-semibold text-right"
                            style={{ backgroundColor: `rgb(${colorValue}, ${colorValue}, 255)` }}
                          >
                            {value.toLocaleString()}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
                {finalHeatmapData.length === 0 && (
                  <tr>
                    <td colSpan={keys.length + (isApprovalModule ? 1 : 0)} className="text-center py-4 text-gray-500">
                      No results found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      );

    case "map":
      const regionKey = keys[0];
      const valueKey = keys[1];

      const regionData = {};
      data.forEach(d => {
        regionData[d[regionKey]] = Number(d[valueKey]);
      });

      const values = Object.values(regionData);
      const min = Math.min(...values);
      const max = Math.max(...values);

      const sizeScale = scaleLinear()
        .domain([min, max])
        .range([5, 40]);
      return (
        <div className="mt-4 w-full overflow-x-auto">
          <ComposableMap
            projection="geoMercator"
            projectionConfig={{ scale: 1000, center: [78.9629, 22.5937] }}
          >
            <Geographies geography={indiaGeoUrl}>
              {({ geographies }) =>
                geographies.map(geo => {
                  const stateName = geo.properties.NAME_1;
                  const value = regionData[stateName] || 0;
                  const centroid = geoCentroid(geo);

                  return (
                    <React.Fragment key={geo.rsmKey}>
                      <Geography
                        geography={geo}
                        fill="#ffff"
                        stroke="#444"
                        style={{
                          default: { outline: "none" },
                          hover: { outline: "none" },
                          pressed: { outline: "none" },
                        }}
                      />

                      {value > 0 && (
                        <Marker coordinates={centroid}>
                          <circle
                            r={sizeScale(value)}
                            fill="red"
                            opacity={0.9}
                            stroke="#fff"
                            strokeWidth={1}
                          />
                          <title>{`${stateName}: ${value}`}</title>
                        </Marker>
                      )}
                    </React.Fragment>
                  );
                })
              }
            </Geographies>
          </ComposableMap>
        </div>
      );

    default:
      return <p className="mt-4 text-gray-500">Unsupported visualization type</p>;
  }
}