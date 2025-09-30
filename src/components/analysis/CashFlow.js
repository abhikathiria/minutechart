import React, { useEffect, useState } from "react";
import { FaMoneyBillWave } from "react-icons/fa";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

function CashFlow({ className = "", data }) {
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const isMobile = windowWidth < 640;

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const inflow = data?.cashIn || data?.CashIn || 0;
  const outflow = data?.cashOut || data?.CashOut || 0;

  const chartData = [
    { name: "Cash In", value: inflow },
    { name: "Cash Out", value: outflow }, 
  ];

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
          <FaMoneyBillWave className="text-white text-xl sm:text-2xl" />
        </span>
        <span>Cash Flow</span>
      </h2>

      <div className="flex-1 min-h-[250px]">
        {inflow !== 0 || outflow !== 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barSize={60}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis
                type="number"
                tickFormatter={(val) => {
                  if (val === 0) return '0';
                  return val >= 100000
                    ? `₹${(val / 100000).toFixed(2)}L`
                    : `₹${(val / 1000)}k`;
                }}
              />
              <Tooltip formatter={(val) => `₹${val.toLocaleString("en-IN")}`} />
              <Bar dataKey="value" fill="#4F46E5" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-center text-gray-500">No data available</p>
        )}
      </div>
    </div>
  );
}

export default CashFlow;
