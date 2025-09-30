import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";
import { FaChartArea } from "react-icons/fa";
import api from "../../api";

function LowStockProducts() {
  const [data, setData] = useState([]);
  const [refreshInterval, setRefreshInterval] = useState(5000); // default fallback

  useEffect(() => {
    // Fetch refresh interval from backend
    api.get("/dashboard/refresh-interval")
      .then((res) => {
        if (res.data && !isNaN(res.data)) {
          setRefreshInterval(res.data);
        }
      })
      .catch((err) => {
        console.error("Error fetching refresh interval:", err);
      });
  }, []);

  useEffect(() => {
    const fetchData = () => {
      api
        .get("/dashboard/product-dashboard-data")
        .then((response) => {
          setData(response.data);
        })
        .catch((error) => {
          console.error("Error fetching low stock products:", error);
        });
    };

    fetchData(); // initial fetch
    const interval = setInterval(fetchData, refreshInterval);

    return () => clearInterval(interval); // cleanup
  }, [refreshInterval]); // refresh whenever interval changes

  return (
    <div
      className="bg-white rounded-xl shadow-md p-6 transition-transform duration-200 hover:scale-[1.01]"
      style={{ border: "1px solid #E2E8F0" }}
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
          <FaChartArea className="text-white text-xl sm:text-2xl" />
        </span>
        <span>Low Stock Products</span>
      </h2>

      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorStock" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0000FF" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#A855F7" stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
          <XAxis dataKey="productName" tick={{ fill: "#475569", fontSize: 12 }} />
          <YAxis tick={{ fill: "#475569", fontSize: 12 }} />
          <Tooltip
            contentStyle={{
              backgroundColor: "#F9FAFB",
              border: "1px solid #E2E8F0",
              borderRadius: "8px",
              color: "#0F172A",
            }}
          />
          <Area
            type="monotone"
            dataKey="stock"
            stroke="#0000FF"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorStock)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export default LowStockProducts;
