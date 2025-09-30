import React, { useState } from "react";
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
import { FaCrown } from "react-icons/fa";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import { scaleLinear } from "d3-scale";
import { Marker } from "react-simple-maps";
import { geoCentroid } from "d3-geo";

// const indiaGeoUrl = "https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/india_states.geojson";
const indiaGeoUrl = "/india_state_geo.json";

export default function ModuleChart({ data, type }) {
  const [activeIndex, setActiveIndex] = useState(null);

  if (!data || data.length === 0) {
    return <p className="text-center text-gray-500">No data to display</p>;
  }

  const keys = Object.keys(data[0]);
  const COLORS = [
    "#0000FF", "#4F46E5", "#A855F7", "#57167E", "#9B3192", "#EA5F89", "#2B0B3F", "#6366F1",
    "#FBCF00", "#423C2E", "#822513", "#D3974E", "#C084FC", "#E9D5FF", "#152342FF"
  ];

  switch (type) {
    case "table":
      return (
        <div className="mt-2 border rounded overflow-hidden">
          <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
            <table className="border-collapse border w-full min-w-max text-sm">
              <thead className="bg-gray-100 sticky top-0 z-10">
                <tr>
                  {keys.map((k) => (
                    <th
                      key={k}
                      className="border px-3 py-2 text-left font-semibold text-gray-700"
                    >
                      {k}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    {keys.map((k) => (
                      <td key={k} className="border px-3 py-2">
                        {row[k]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );

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

    case "pie":
      const chartData = data.map((item) => ({
        name: item[keys[0]],
        value: Number(item[keys[1]]),
      }));

      const sortedData = [...chartData].sort((a, b) => b.value - a.value);
      const topName = sortedData[0]?.name;

      const renderActiveShape = (props) => {
        const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
        return (
          <g>
            <Sector
              cx={cx}
              cy={cy}
              innerRadius={innerRadius}
              outerRadius={outerRadius + 10}
              startAngle={startAngle}
              endAngle={endAngle}
              fill={fill}
            />
          </g>
        );
      };

      const handleClick = (_, index) => {
        setActiveIndex(index === activeIndex ? null : index);
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

      return (
        <div className="h-96 w-full">
          <ResponsiveContainer width="100%" height="100%">
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
                onClick={handleClick}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <ReTooltip content={<CustomTooltip />} />
              <Legend verticalAlign="bottom" height={60} />
            </PieChart>
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
      const numericKeys = keys.filter(k => !isNaN(Number(data[0][k])));
      const allValues = data.flatMap(row => numericKeys.map(k => Number(row[k])));
      const minValue = Math.min(...allValues);
      const maxValue = Math.max(...allValues);

      return (
        <div className="mt-4 border rounded overflow-hidden">
          <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
            <table className="border-collapse border w-full min-w-max text-sm">
              <thead className="bg-gray-100 sticky top-0 z-10">
                <tr>
                  {keys.map(k => (
                    <th key={k} className="border px-3 py-2 text-left font-semibold text-gray-700">
                      {k}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((row, i) => (
                  <tr key={i}>
                    {keys.map((k, j) => {
                      const value = Number(row[k]);
                      if (isNaN(value)) {
                        return (
                          <td key={j} className="border px-3 py-2 text-center">{row[k]}</td>
                        );
                      }
                      const intensity = (value - minValue) / (maxValue - minValue);
                      const colorValue = Math.floor(255 - intensity * 200);
                      return (
                        <td
                          key={j}
                          className="border px-3 py-2 text-center font-semibold"
                          style={{ backgroundColor: `rgb(${colorValue}, ${colorValue}, 255)` }}
                        >
                          {value.toLocaleString()}
                        </td>
                      );
                    })}
                  </tr>
                ))}
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
                  // console.log(geo.properties);
                  const stateName = geo.properties.NAME_1;
                  const value = regionData[stateName] || 0;
                  const centroid = geoCentroid(geo);

                  return (
                    <React.Fragment key={geo.rsmKey}>
                      {/* Base state shape */}
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

                      {/* Add circle if this state has value */}
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