import React, { useEffect, useState } from "react";
import { MdTrendingUp } from "react-icons/md";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from "recharts";

function CashMovement({ className = "", data }) {
    const [setWindowWidth] = useState(window.innerWidth);

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
                        <LineChart
                            data={chartData}
                            margin={{ top: 10, right: 20, left: 5, bottom: 25 }}
                        >
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


                            <CartesianGrid strokeDasharray="5 5" />

                            <XAxis
                                dataKey="date"
                                tickLine={false}
                                padding={{ top: 20, bottom: 20 }}
                            />

                            <YAxis allowDecimals={false}
                                domain={[0, maxDomain]}
                                tickFormatter={(val) => {
                                    if (val === 0) return '0';
                                    return val >= 100000
                                        ? `₹${(val / 100000).toFixed(2)}L`
                                        : `₹${(val / 1000)}k`;
                                }}
                                ticks={ticks}
                            />

                            <Tooltip
                                content={({ payload }) => {
                                    if (!payload || !payload.length) return null;
                                    const date = payload[0].payload.date;
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

                            <Line
                                type="monotone"
                                dataKey="Opening"
                                stroke="green"
                                strokeWidth={2}
                                name="Cash Opening"
                                activeDot={{ r: 6 }}
                            />
                            <Line
                                type="monotone"
                                dataKey="Closing"
                                stroke="red"
                                strokeWidth={2}
                                name="Cash Closing"
                                activeDot={{ r: 6 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                ) : (
                    <p className="text-center text-gray-500">No data available</p>
                )}
            </div>
        </div>
    );
}

export default CashMovement;
