import React, { useEffect, useState } from "react";
import axios from "axios";
import { FaBalanceScale } from "react-icons/fa";
import { FaArrowTrendUp, FaArrowTrendDown } from "react-icons/fa6";
import api from "../../api";

function TotalStockValue() {
  const [value, setValue] = useState(0);
  const [prevValue, setPrevValue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [trend, setTrend] = useState(null); // "up" | "down" | null

  useEffect(() => {
    const fetchData = () => {
      api
        .get("/dashboard/product-dashboard-data")
        .then((res) => {
          const newValue = res.data?.totalValue || 0;

          // Compare with previous value
          if (prevValue !== null) {
            if (newValue > prevValue) {
              setTrend("up");
            } else if (newValue < prevValue) {
              setTrend("down");
            }
            // if equal, keep the existing trend (do nothing)
          }

          setPrevValue(newValue);
          setValue(newValue);
        })
        .catch((err) => console.error("Error fetching total stock value:", err))
        .finally(() => setLoading(false));
    };

    fetchData(); // Initial load
    const interval = setInterval(fetchData, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, [prevValue]);

  return (
    <div
      className="bg-white rounded-xl shadow-md p-4 w-full max-w-full sm:max-w-xs md:max-w-sm lg:max-w-md xl:max-w-lg border-t-4 transition-transform duration-200 hover:scale-[1.01]"
      style={{
        borderTopColor: "#0000FF",
        border: "1px solid #E2E8F0"
      }}
    >
      <div className="flex items-center space-x-4">
        {/* Icon container */}
        <div
          className="p-3 rounded-full flex-shrink-0"
          style={{
            background: "linear-gradient(135deg, #0000FF, #A855F7)",
          }}
        >
          <FaBalanceScale className="text-white text-xl sm:text-2xl" />
        </div>

        {/* Text content */}
        <div className="min-w-0">
          <div className="text-sm sm:text-base truncate" style={{ color: "#475569" }}>
            Total Stock Value
          </div>
          <div
            className="text-lg sm:text-xl md:text-2xl font-bold flex items-center gap-2"
            style={{ color: "#0F172A" }}
          >
            {loading
              ? "Loading..."
              : `₹ ${value.toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}`}

            {/* Trend Icon stays until next change */}
            {!loading && trend === "up" && (
              <FaArrowTrendUp className="text-green-600 text-3xl" title="Increased" />
            )}
            {!loading && trend === "down" && (
              <FaArrowTrendDown className="text-red-600 text-3xl" title="Decreased" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default TotalStockValue;
