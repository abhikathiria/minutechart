import React, { useEffect, useState } from "react";
import { MdTrendingUp } from "react-icons/md";
import {
    ResponsiveContainer,
    ScatterChart,
    Scatter,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
    Legend
} from "recharts";

const formatINR = (num) => {
    if (!num) return "0";
    if (num >= 100000) return `${(num / 100000).toFixed(1)}L`; // show in Lakhs
    return `${(num / 1000).toFixed(0)}K`; // else in Thousands
};

function CashMovement({ className = "", data }) {
    const [windowWidth, setWindowWidth] = useState(window.innerWidth);

    useEffect(() => {
        const handleResize = () => setWindowWidth(window.innerWidth);
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    // ✅ Transform incoming data
    const chartData = (data || []).map((d) => ({
        date: new Date(d.date).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        }),
        Opening: d.cashOpening || d.CashOpening || 0,
        Closing: d.cashClosing || d.CashClosing || 0,
    }));

    // ✅ Get max value for domain
    const maxCash = Math.max(
        ...chartData.flatMap((d) => [d.Opening, d.Closing]),
        0
    );

    const maxDomain = Math.ceil(maxCash / 50000) * 50000;
    const ticks = Array.from({ length: maxDomain / 50000 + 1 }, (_, i) => i * 50000);


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
                    <MdTrendingUp className="text-white text-xl sm:text-2xl" />
                </span>
                <span>Cash Movement</span>
            </h2>

            <div className="flex-1 min-h-[300px]">
                {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart margin={{ top: 20, right: 30, bottom: 10, left: 30 }}>
                            <Legend
                                verticalAlign="top"
                                align="center"
                                content={() => (
                                    <div style={{ display: "flex", justifyContent: "center", marginTop: -24, marginRight: -50 }}>
                                        <div style={{ display: "flex", alignItems: "center", marginRight: 20, fontSize: "16px" }}>
                                            <div
                                                style={{
                                                    width: 8,
                                                    height: 8,
                                                    borderRadius: "50%",
                                                    backgroundColor: "green",
                                                    marginRight: 6,
                                                }}
                                            />
                                            Opening
                                        </div>
                                        <div style={{ display: "flex", alignItems: "center", fontSize: "16px" }}>
                                            <div
                                                style={{
                                                    width: 8,
                                                    height: 8,
                                                    borderRadius: "50%",
                                                    backgroundColor: "red",
                                                    marginRight: 6,
                                                }}
                                            />
                                            Closing
                                        </div>
                                    </div>
                                )}
                            />


                            <CartesianGrid />

                            {/* X Axis → Cash scale (50k to 2.5L) */}
                            <XAxis
                                type="number"
                                dataKey="x"
                                domain={[0, maxDomain]}
                                tickFormatter={(val) => {
                                    if (val === 0) return '0';
                                    return val >= 100000
                                        ? `₹${(val / 100000).toFixed(2)}L`
                                        : `₹${(val / 1000)}k`;
                                }}
                                ticks={ticks}
                            />

                            {/* Y Axis → Dates */}
                            <YAxis
                                type="category"
                                dataKey="y"
                                axisLine={false}
                                tickLine={false}
                                padding={{ top: 20, bottom: 20 }}
                            />

                            <Tooltip
                                content={({ payload }) => {
                                    if (!payload || !payload.length) return null;
                                    const date = payload[0].payload.y;
                                    const d = chartData.find(item => item.date === date);
                                    if (!d) return null;

                                    return (
                                        <div className="bg-white p-2 rounded shadow text-sm">
                                            <div><strong>Date: {d.date}</strong></div>
                                            <div>Opening: ₹{d.Opening.toLocaleString("en-IN")}</div>
                                            <div>Closing: ₹{d.Closing.toLocaleString("en-IN")}</div>
                                        </div>
                                    );
                                }}
                            />

                            {/* Opening Points */}
                            <Scatter
                                name="Opening"
                                data={chartData.map((d) => ({
                                    y: d.date, // y-axis is date
                                    x: d.Opening, // x-axis is Opening cash
                                }))}
                                fill="green"
                            />

                            {/* Closing Points */}
                            <Scatter
                                name="Closing"
                                data={chartData.map((d) => ({
                                    y: d.date,
                                    x: d.Closing,
                                }))}
                                fill="red"
                            />
                        </ScatterChart>
                    </ResponsiveContainer>
                ) : (
                    <p className="text-center text-gray-500">No data available</p>
                )}
            </div>
        </div>
    );
}

export default CashMovement;
