import React, { useState, useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";
import api from "../api";
import ModuleChart from "../components/modules/ModuleChart";
import { FaChartLine, FaSpinner } from "react-icons/fa";

import "../ReportStyles.css";

const ReportModuleWrapper = ({ module, index, userId }) => {
    const isTable =
        module.VisualizationType === "table" ||
        module.VisualizationType === "heatmap";

    return (
        <div
            key={module.UserQueryId}
            className="report-module-wrapper"
            data-index={index}
        >
            <div className="flex items-center justify-between border-b pb-3 mb-4">
                <h3 className="font-extrabold text-xl text-indigo-700">
                    {index + 1}. {module.UserTitle || "Untitled Module"}
                </h3>
                <span className="text-sm text-gray-500 capitalize">
                    {module.VisualizationType}
                </span>
            </div>

            <div className={isTable ? "w-full" : "w-full h-[360px]"}>
                {module.Data && module.Data.length > 0 ? (
                    <ModuleChart
                        data={module.Data}
                        type={module.VisualizationType}
                        isApprovalModule={false}
                        queryId={module.UserQueryId}
                        userId={userId}
                        limitHeight={!isTable}
                    />
                ) : (
                    <p className="text-gray-400 text-md text-center py-10">
                        No data returned for this module.
                    </p>
                )}
            </div>
        </div>
    );
};

export default function ReportRenderer() {
    const [reportData, setReportData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const location = useLocation();

    const query = useMemo(
        () => new URLSearchParams(location.search),
        [location.search]
    );

    const userId = query.get("user");
    const token = query.get("token");

    useEffect(() => {
        if (!userId || !token) {
            setIsLoading(false);
            return;
        }

        const fetchReportData = async () => {
            try {
                const res = await api.get(`/report/data?userId=${userId}`, {
                    headers: { "X-Report-Token": token },
                });
                setReportData(res.data);
            } catch (err) {
                console.error("Failed to fetch report data:", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchReportData();
    }, [userId, token]);

    // In ReportRenderer.jsx, replace the useEffect that creates the readySignal

useEffect(() => {
    if (!isLoading && reportData) {
        // Use a small timeout to ensure the browser has finished painting 
        // the last React component before the signal is emitted.
        const paintTimeout = setTimeout(() => {
            const readySignal = document.createElement("div");
            readySignal.id = "report-ready-signal";
            readySignal.style.display = "none";
            document.body.appendChild(readySignal);
        }, 500); // Wait 500ms after last state change

        return () => {
            clearTimeout(paintTimeout);
            // Cleanup logic remains the same:
            const signal = document.getElementById('report-ready-signal');
            if (signal && document.body.contains(signal)) {
                document.body.removeChild(signal);
            }
        };
    }
}, [isLoading, reportData]);

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <FaSpinner className="w-8 h-8 text-indigo-600 animate-spin" />
                <p className="ml-3 text-lg text-gray-700">Preparing Report...</p>
            </div>
        );
    }

    if (!reportData || reportData.Modules.length === 0) {
        return (
            <div className="min-h-screen p-10 text-center bg-gray-50">
                <h1 className="text-3xl font-bold text-red-600">
                    Report Data Missing or Empty
                </h1>
                <p className="mt-4 text-gray-600">
                    Please contact support or ensure modules are configured.
                </p>
            </div>
        );
    }

    return (
        <div className="report-page text-gray-800">
            <header className="report-header">
                <div className="flex justify-between items-center border-b pb-3 mb-3">
                    <h1 className="text-3xl font-extrabold text-teal-600 flex items-center">
                        <FaChartLine className="mr-3" /> minutechart MIS Report
                    </h1>
                    <span className="text-sm text-gray-500">
                        Generated: {new Date().toLocaleDateString()}
                    </span>
                </div>

                <div className="text-sm grid grid-cols-2 gap-2">
                    <p>
                        <strong>User ID:</strong> {reportData.UserId}
                    </p>
                    <p>
                        <strong>Total Modules:</strong>{" "}
                        {reportData.Modules.length}
                    </p>
                    <p>
                        <strong>Timestamp:</strong>{" "}
                        {new Date(reportData.Timestamp).toLocaleString()}
                    </p>
                </div>
            </header>

            <main className="report-content">
                {reportData.Modules.map((module, index) => (
                    <ReportModuleWrapper
                        key={module.UserQueryId}
                        module={module}
                        index={index}
                        userId={reportData.UserId}
                    />
                ))}
            </main>

            <footer className="report-footer">
                minutechart Confidential — Page <span className="page"></span> of{" "}
                <span className="pages"></span>
            </footer>
        </div>
    );
}
