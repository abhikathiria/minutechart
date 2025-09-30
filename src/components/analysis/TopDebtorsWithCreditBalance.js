import React, { useEffect, useState } from "react";
import { MdCompareArrows } from "react-icons/md";
import { FaCrown } from "react-icons/fa";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Sector,
} from "recharts";

const COLORS = ["#0000FF", "#A855F7", "#4F46E5", "#6366F1", "#C084FC", "#E9D5FF"];

function TopDebtorsWithCreditBalance({ className = "", data }) {
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [activeIndex, setActiveIndex] = useState(null);
  const isMobile = windowWidth < 640;

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const chartData = data?.map(item => ({
    name: item.entityName || item.EntityName,
    value: item.metricValue || item.MetricValue
  })) || [];

  const sortedData = [...chartData].sort((a, b) => b.value - a.value);
  const topDebtorWithCreditBalanceName = sortedData[0]?.name;

  const topColors =
    sortedData.length >= 2
      ? [
        COLORS[chartData.indexOf(sortedData[0]) % COLORS.length],
        COLORS[chartData.indexOf(sortedData[1]) % COLORS.length],
      ]
      : ["#0000FF", "#A855F7"];

  const gradientStyle = {
    background: `linear-gradient(135deg, ${topColors[0]}, ${topColors[1]})`,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  };

  const headingTextColor = topColors[0];

  const handleClick = (_, index) => {
    setActiveIndex(index === activeIndex ? null : index); // toggle
  };

  const renderActiveShape = (props) => {
    const {
      cx,
      cy,
      innerRadius,
      outerRadius,
      startAngle,
      endAngle,
      fill,
      payload,
    } = props;

    return (
      <g>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius + 10}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
        />
      </g>
    );
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const debtorWithCreditBalance = payload[0].payload;
      const isTop = debtorWithCreditBalance.name === topDebtorWithCreditBalanceName;

      return (
        <div className="bg-white border border-gray-300 rounded shadow px-3 py-2 text-sm">
          <div className="flex items-center gap-1  text-2xl font-bold text-gray-800">
            {isTop && <FaCrown className="text-yellow-500 text-2xl" />}
            <span>{debtorWithCreditBalance.name}</span>
          </div>
          <div className="text-lg font-semibold">
            Sales: ₹{debtorWithCreditBalance.value.toLocaleString("en-IN")}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div
      className={`bg-white rounded-lg shadow p-4 w-full h-full flex flex-col ${className}`}
    >
      <h2 className="text-xl font-semibold text-center p-4 text-blue-700 flex items-center justify-center space-x-2" style={{ color: headingTextColor }}>
        <span className="p-2 rounded-full" style={gradientStyle}>
          <MdCompareArrows className="text-white text-xl sm:text-2xl" />
        </span>
        <span>Top Debtors With Credit Balance</span>
      </h2>

      <div className="flex-1 min-h-[250px]">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={isMobile ? 60 : 80}
                labelLine={false}
                activeIndex={activeIndex}
                activeShape={renderActiveShape}
                onClick={handleClick}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend verticalAlign="bottom" height={36} />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-center text-gray-500">No data available</p>
        )}
      </div>
    </div>
  );
}

export default TopDebtorsWithCreditBalance;
