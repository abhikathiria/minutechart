import React, { useEffect, useState } from "react";
import { FaUserFriends } from "react-icons/fa";
import {
  PieChart,
  Pie,
  Cell,
  Legend,
  Tooltip,
  ResponsiveContainer
} from "recharts";

const COLORS = ["#4F46E5", "#0000FF", "#A855F7", "#6366F1", "#C084FC", "#E9D5FF"];

const EmployeeTypeDistribution = ({ data }) => {
  const [labelFontSize, setLabelFontSize] = useState(14); // default for desktop

  useEffect(() => {
    const handleResize = () => {
      setLabelFontSize(window.innerWidth < 640 ? 10 : 14);
    };

    handleResize(); // run on mount
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Transform data to match chart expectations
  const chartData = data?.map(item => ({
    name: item.employmentType || item.EmploymentType,
    value: item.count || item.Count
  })) || [];

  return (
    <div className="bg-white rounded-xl shadow p-4 flex flex-col h-full">
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
          <FaUserFriends className="text-white text-xl sm:text-2xl" />
        </span>
        <span>Employee Distribution by Type</span>
      </h2>

      <div className="flex-1 min-h-0">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius="45%"
                outerRadius="95%"
                paddingAngle={3}
                dataKey="value"
                labelLine={false}
                label={({ value, cx, cy, midAngle, innerRadius, outerRadius }) => {
                  const total = chartData.reduce((sum, entry) => sum + entry.value, 0);
                  const percent = ((value / total) * 100).toFixed(1);

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
                      fontSize={labelFontSize}
                    >
                      {percent}%
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
              <Tooltip />
              <Legend verticalAlign="bottom" height={36} />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-center text-gray-500">No data available</p>
        )}
      </div>
    </div>
  );
};

export default EmployeeTypeDistribution;
