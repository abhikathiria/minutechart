import React, { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";
import { FaCalendarAlt } from "react-icons/fa";
import api from "../../api";

function UpcomingExpiriesChart({ className = "" }) {
  const [data, setData] = useState([]);

  useEffect(() => {
    const fetchData = () => {
      api
        .get("/dashboard/product-dashboard-data")
        .then((res) => setData(res.data))
        .catch((err) => console.error("Error fetching upcoming expiries:", err));
    };

    // Initial fetch
    fetchData();

    // Refresh every 5 seconds
    const interval = setInterval(fetchData, 5000);

    // Cleanup
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className={`bg-white rounded-xl shadow-md p-6 border transition-transform duration-200 hover:scale-[1.01] flex flex-col ${className}`}
      style={{ borderColor: "#E2E8F0" }}
    >
      <h2 className="text-xl font-semibold text-center pb-2 text-blue-700 flex items-center justify-center space-x-2">
        <span
          className="p-2 rounded-full"
          style={{
            background: "linear-gradient(135deg, #0000FF, #A855F7)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <FaCalendarAlt className="text-white text-xl sm:text-2xl" />
        </span>
        <span>Upcoming Expiries</span>
      </h2>


      {/* Chart area */}
      <div style={{ height: "200px", width: "100%" }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 5, right: 20, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="inStockCount"
              stroke="#0000FF"
              strokeWidth={2}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default UpcomingExpiriesChart;
