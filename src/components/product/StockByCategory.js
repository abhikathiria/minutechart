import React, { useEffect, useState } from "react";
import axios from "axios";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { FaChartPie } from "react-icons/fa";
import api from "../../api";

const COLORS = ["#0000FF", "#4F46E5", "#A855F7", "#6366F1", "#C084FC", "#E9D5FF"];

function StockByCategory() {
  const [data, setData] = useState([]);

  useEffect(() => {
    const fetchData = () => {
      api
        .get("/dashboard/product-dashboard-data")
        .then((response) => {
          setData(response.data);
        })
        .catch((error) => {
          console.error("Error fetching stock by category:", error);
        });
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
          <FaChartPie className="text-white text-xl sm:text-2xl" />
        </span>
        <span>Stock by Category</span>
      </h2>

      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            dataKey="totalQuantity"
            nameKey="category"
            data={data}
            cx="50%"
            cy="50%"
            outerRadius="90%"
            labelLine={false}
          >
            {data.map((_, index) => (
              <Cell key={index} fill={COLORS[index % COLORS.length]} />
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
          <Legend
            verticalAlign="bottom"
            wrapperStyle={{ paddingTop: "10px", color: "#475569" }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export default StockByCategory;
