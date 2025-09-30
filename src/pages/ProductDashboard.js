import React, { useState, useEffect } from "react";
import StockByCategory from "../components/product/StockByCategory";
import LowStockProducts from "../components/product/LowStockProducts";
import TotalStockValue from "../components/product/TotalStockValue";
import MostSellingProducts from "../components/product/MostSellingProducts";
import UpcomingExpiriesChart from "../components/product/UpcomingExpiriesChart";
import api from "../api";

const ProductDashboard = () => {

  const [dashboardData, setDashboardData] = useState({
    totalStockValue: 0,
    mostSellingProducts: [],
    upcomingExpiries: [],
    lowStockProducts: [],
    stockByCategory: [],
  });

  useEffect(() => {
    const fetchDashboardData = () => {
      api.get(`/dashboard/product-dashboard-data`)
        .then(res => res.json())
        .then(data => setDashboardData(data))
        .catch(err => console.error("Error fetching Product dashboard data:", err));
    };

    fetchDashboardData(); // immediate load
    const interval = setInterval(fetchDashboardData, 5000);
    return () => clearInterval(interval);
  }, []);
  return (
    <div className="min-h-screen p-4 md:p-6 bg-gray-50">
      <h1
        className="text-3xl md:text-4xl font-bold text-center mb-6"
      >
        📦 <span style={{
          background: "linear-gradient(90deg, #A855F7, #0000FF)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent"
        }}>Product Dashboard</span>
      </h1>

      {/* Responsive layout */}
      <div className="flex-grow grid md:grid md:grid-cols-3 gap-6 w-full">

        {/* Left two columns on medium and up */}
        <div className="md:col-span-2 flex flex-col gap-6 min-h-0">

          {/* Top row: stock category + low stock */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 ">
            <StockByCategory data={dashboardData.stockByCategory} />
            <LowStockProducts data={dashboardData.lowStockProducts} />
          </div>

          {/* Expiry chart fills remaining space and aligns with MostSellingProducts */}
          <div className="flex-1 min-h-0 flex">
            <UpcomingExpiriesChart data={dashboardData.upcomingExpiries} className="w-full h-full" />
          </div>
        </div>

        {/* Right column: KPI + most selling */}
        <div className="flex flex-col min-h-0">
          <TotalStockValue count={dashboardData.totalStockValue} />
          <div className="mt-4 flex-1 min-h-0 flex">
            <MostSellingProducts data={dashboardData.mostSellingProducts} className="w-full h-full" />
          </div>
        </div>
      </div>
    </div >
  );
};

export default ProductDashboard;
