import React, { useState, useEffect } from "react";
import api from "../api";
import EmployeeTypeDistribution from "../components/hr/EmployeeTypeDistribution";
import AllTimeEmployeesCount from "../components/hr/AllTimeEmployeesCount";
import TotalActiveEmployees from "../components/hr/TotalActiveEmployees";
import HiringExitingTrend from "../components/hr/HiringExitingTrend";
import GenderDistribution from "../components/hr/GenderDistribution";
import TopItemsTable from "../components/hr/TopItemsTable";
import RoleWiseHeadCount from "../components/hr/RoleWiseHeadCount";

const HRDashboard = () => {
  const [departments, setDepartments] = useState(["All"]);
  const [selectedDept, setSelectedDept] = useState("All");
  const [refreshTime, setRefreshTime] = useState(5000); // fallback default in ms

  const [dashboardData, setDashboardData] = useState({
    allTimeEmployees: 0,
    topItems: [],
    totalActiveEmployees: 0,
    hiringExitingTrend: [],
    employeeTypeDistribution: [],
    genderDistribution: [],
  });

  // Fetch department list once
  useEffect(() => {
    api.get("/dashboard/departments")
      .then(res => setDepartments(["All", ...res.data]))
      .catch(err => console.error("Error fetching departments:", err));
  }, []);

  // Fetch refresh time from backend
  useEffect(() => {
    api.get("/dashboard/refresh-time")
      .then(res => {
        const refreshInterval = parseInt(res.data);
        if (!isNaN(refreshInterval) && refreshInterval > 0) {
          setRefreshTime(refreshInterval);
        }
      })
      .catch(err => console.error("Error fetching refresh time:", err));
  }, []);

  // Poll dashboard data using dynamic refresh time
  useEffect(() => {
    const fetchDashboardData = () => {
      const deptParam = selectedDept === "All" ? "" : `?department=${encodeURIComponent(selectedDept)}`;
      api.get(`/dashboard/hr-dashboard-data${deptParam}`)
        .then(res => {
          console.log("Dashboard data:", res.data);
          setDashboardData(res.data);
        })
        .catch(err => console.error("Error fetching HR dashboard data:", err));
    };

    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, refreshTime);
    return () => clearInterval(interval);
  }, [selectedDept, refreshTime]);

  return (
    <div className="min-h-screen w-full p-4 md:p-8 bg-gray-50 flex flex-col">
      {/* Header & Filter */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-center mb-6">
          👥 <span style={{
            background: "linear-gradient(90deg, #A855F7, #0000FF)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent"
          }}>HR Dashboard</span>
        </h1>

        <div className="mt-4 md:mt-0 flex flex-wrap md:flex-nowrap items-center gap-3 bg-blue-50 border border-blue-300 shadow-sm 
          rounded-xl px-4 py-2 transition duration-200 hover:shadow-md w-full md:w-auto">
          <span className="text-blue-700 font-semibold flex items-center gap-2 whitespace-nowrap">
            🏢 Department
          </span>
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="bg-white border border-blue-200 rounded-lg px-2 py-1 w-full sm:w-auto 
              focus:ring-2 focus:ring-blue-400 focus:outline-none font-medium text-blue-900 cursor-pointer
              hover:text-blue-700 transition duration-200 ease-in-out"
          >
            {departments.map((dept, index) => (
              <option key={index} value={dept} className="text-blue-900 bg-white">
                {dept}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-grow grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
        {/* COLUMN 1 */}
        <div className="flex flex-col w-full">
          <AllTimeEmployeesCount count={dashboardData.allTimeEmployees} department={selectedDept} />
          <div className="mt-4 flex-1 w-full">
            {/* <RoleWiseHeadCount data={dashboardData.roleWiseHeadCount} department={selectedDept} className="w-full h-full" /> */}
            <TopItemsTable data={dashboardData.topItems} department={selectedDept} className="w-full h-full" />
          </div>
        </div>

        {/* COLUMN 2 */}
        <div className="flex flex-col w-full">
          <TotalActiveEmployees count={dashboardData.totalActiveEmployees} department={selectedDept} />
          <div className="mt-4 flex-1 w-full min-h-[250px]">
            <HiringExitingTrend data={dashboardData.hiringExitingTrend} department={selectedDept} className="w-full h-full" />
          </div>
        </div>

        {/* COLUMN 3 */}
        <div className="flex flex-col w-full">
          <div className="flex-1 w-full min-h-[250px]">
            <EmployeeTypeDistribution data={dashboardData.employeeTypeDistribution} department={selectedDept} />
          </div>
          <div className="mt-4 flex-1 w-full min-h-[250px]">
            <GenderDistribution data={dashboardData.genderDistribution} department={selectedDept} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default HRDashboard;
