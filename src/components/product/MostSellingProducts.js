import React, { useEffect, useState } from "react";
import axios from "axios";
import { FaFire, FaFireAlt } from "react-icons/fa";
import api from "../../api";

function MostSellingProducts({ className = "" }) {
  const [data, setData] = useState([]);

  useEffect(() => {
    const fetchData = () => {
      api
        .get("/dashboard/product-dashboard-data")
        .then((response) => setData(response.data))
        .catch((error) =>
          console.error("Error fetching most selling products:", error)
        );
    };
    fetchData(); // initial fetch
    const intervalId = setInterval(fetchData, 5000); // poll every 5 sec

    return () => clearInterval(intervalId); // cleanup on unmount
  }, []);

  return (
    <div
      className={`bg-white rounded-xl shadow-md border transition-transform duration-200 hover:scale-[1.01] flex flex-col ${className}`}
      style={{ borderColor: "#E2E8F0" }}
    >
      <h2 className="text-xl font-semibold text-center  pt-4 pb-3 text-blue-700 flex items-center justify-center space-x-2">
        <span
          className="p-2 rounded-full"
          style={{
            background: "linear-gradient(135deg, #0000FF, #A855F7)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <FaFireAlt className="text-white text-xl sm:text-2xl" />
        </span>
        <span>Most Selling Products</span>
      </h2>

      {/* Scrollable Table */}
      <div className="flex-1 min-h-0 overflow-auto px-4 pb-4">
        <table className="w-full text-sm text-left border border-gray-200 rounded-lg overflow-hidden">
          <thead className="bg-blue-50 sticky top-0 z-10">
            <tr>
              <th className="px-4 py-2">Product</th>
              <th className="px-4 py-2">Product Size</th>
              <th className="px-4 py-2">Pack Size</th>
              <th className="px-4 py-2">Total Sold</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan="4"
                  className="text-center py-4 text-gray-500 italic"
                >
                  No sales data available 📉
                </td>
              </tr>
            ) : (
              data.map((item, index) => (
                <tr
                  key={index}
                  className={`border-t ${index % 2 === 0 ? "bg-gray-50" : "bg-white"
                    } hover:bg-gray-100`}
                >
                  <td className="px-4 py-2">{item.productName}</td>
                  <td className="px-4 py-2">{item.productSize}</td>
                  <td className="px-4 py-2">{item.packSize}</td>
                  <td className="px-4 py-2 text-green-700 font-bold">
                    {item.totalSold}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default MostSellingProducts;
