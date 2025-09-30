import React, { useEffect, useState } from "react";
import { FaRestroom } from "react-icons/fa";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Sector,
} from "recharts";

const COLORS = ["#A855F7", "#0000FF", "#38A169", "#D69E2E"];

function GenderDistribution({ className = "", data }) {
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const isMobile = windowWidth < 640;

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const chartData = data?.map(item => ({
    gender: item.gender || item.Gender,
    count: item.count || item.Count
  })) || [];

  return (
    <div
      className={`bg-white rounded-lg shadow p-4 w-full h-full flex flex-col ${className}`}
    >
      <h2 className="text-xl font-semibold text-center p-4 text-blue-700 flex items-center justify-center space-x-2">
        <span
          className="p-2 rounded-full"
          style={{
            background: "linear-gradient(135deg, #0000FF, #A855F7)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <FaRestroom className="text-white text-xl sm:text-2xl" />
        </span>
        <span>Gender Distribution</span>
      </h2>

      <div className="flex-1 min-h-[250px]">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <Pie
                data={chartData}
                dataKey="count"
                nameKey="gender"
                cx="50%"
                cy="50%"
                outerRadius={isMobile ? 60 : 80}
                labelLine={false}
                label={({ cx, cy, midAngle, innerRadius, outerRadius, index }) => {
                  const RADIAN = Math.PI / 180;
                  const radius = innerRadius + (outerRadius - innerRadius) / 2;
                  const x = cx + radius * Math.cos(-midAngle * RADIAN);
                  const y = cy + radius * Math.sin(-midAngle * RADIAN);

                  return (
                    <text
                      x={x}
                      y={y}
                      fill="white"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontWeight="bold"
                    >
                      {chartData[index].count}
                    </text>
                  );
                }}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "#F9FAFB",
                  border: "1px solid #E2E8F0",
                  borderRadius: "8px",
                  color: "#0F172A",
                }}
              />
              <Legend verticalAlign="bottom" height={36} />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-center text-gray-500">No data available</p>
        )}
      </div>
    </div>
  );
}

export default GenderDistribution;
