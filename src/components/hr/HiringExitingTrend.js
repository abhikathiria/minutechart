import React from "react";
import { FaChartLine } from "react-icons/fa";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

function HiringExitingTrend({ className = "", data = [] }) {
  const hasData = data.length > 0;

  const chartData = data.map(item => ({
    year: item.year || item.Year,
    hiresCount: item.hiresCount || item.HiresCount,
    exitsCount: item.exitsCount || item.ExitsCount,
  }));

  return (
    <div
      className={`bg-white rounded-lg shadow p-4 w-full h-full flex flex-col ${className}`}
    >
      <h2 className="text-xl font-semibold text-center pb-3 text-blue-700 flex items-center justify-center space-x-2">
        <span
          className="p-2 rounded-full"
          style={{
            background: "linear-gradient(135deg, #0000FF, #A855F7)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <FaChartLine className="text-white text-xl sm:text-2xl" />
        </span>
        <span>Hires vs Exits Timeline</span>
      </h2>

      <div className="flex-1 min-h-0">
        {!hasData ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            No hiring or exit data available 📉
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 10, right: 20, left: 5, bottom: 25 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="year"
                tick={{ fontSize: 12, fill: "black" }}
                angle={-30}
                textAnchor="end"
                height={50}
              />
              <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "black" }} />
              <Tooltip
                contentStyle={{
                  fontSize: "0.85rem",
                  borderRadius: "8px",
                }}
              />
              <Legend wrapperStyle={{ fontSize: "0.85rem" }} />
              <Line
                type="monotone"
                dataKey="hiresCount"
                stroke="green"
                strokeWidth={2}
                name="New Hires"
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="exitsCount"
                stroke="red"
                strokeWidth={2}
                name="Exits"
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

export default HiringExitingTrend;
