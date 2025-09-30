import React from "react";
import { FaUserCheck } from "react-icons/fa";

function TotalActiveEmployees({ count }) {
  const isLoading = typeof count !== "number";

  return (
    <div
      className="bg-white rounded-xl shadow-md p-4 w-full max-w-full sm:max-w-xs md:max-w-sm lg:max-w-md xl:max-w-lg border-t-4 transition-transform duration-200 hover:scale-[1.01]"
      style={{
        borderTopColor: "#0000FF",
        border: "1px solid #E2E8F0",
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
          <FaUserCheck className="text-white text-xl sm:text-2xl" />
        </div>

        {/* Text content */}
        <div className="min-w-0">
          <div
            className="text-sm sm:text-base truncate"
            style={{ color: "#475569" }}
          >
            Total Active Employees
          </div>
          <div
            className="text-lg sm:text-xl md:text-2xl font-bold break-words"
            style={{ color: "#0F172A" }}
          >
            {isLoading
              ? "Loading..."
              : count.toLocaleString("en-IN", {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default TotalActiveEmployees;
