import React from "react";
import { FixedSizeList as List } from "react-window";
import { FaUserTie } from "react-icons/fa";

function RoleWiseHeadCount({ className = "", data = [] }) {
  const totals = data.reduce(
    (acc, item) => {
      acc.active += item.activeCount || 0;
      acc.inactive += item.inactiveCount || 0;
      acc.total += item.totalCount || 0;
      return acc;
    },
    { active: 0, inactive: 0, total: 0 }
  );

  const rowHeight = 50;
  const visibleRowCount = 10;
  const listHeight = rowHeight * visibleRowCount;

  const Row = ({ index, style }) => {
    const item = data[index];
    const isEven = index % 2 === 0;

    return (
      <div
        style={style}
        className={`grid grid-cols-[40%_20%_20%_20%] text-sm border-b border-gray-200 ${isEven ? "bg-blue-50" : "bg-white"
          } hover:bg-gray-50`}
      >
        <div className="px-4 py-2">{item.roleName}</div>
        <div className="px-4 py-2 text-green-700 font-semibold">{item.activeCount}</div>
        <div className="px-4 py-2 text-red-700 font-semibold">{item.inactiveCount}</div>
        <div className="px-4 py-2 font-bold">{item.totalCount}</div>
      </div>
    );
  };

  return (
    <div
      className={`bg-white rounded-lg shadow w-full flex flex-col ${className}`}
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
          <FaUserTie className="text-white text-xl sm:text-2xl" />
        </span>
        <span>Role Wise Headcount</span>
      </h2>

      {/* Header */}
      <div className="grid grid-cols-[40%_20%_20%_20%] bg-blue-50 font-semibold text-sm border-b border-gray-300 px-4 py-2 sticky top-0 z-10">
        <div>Role</div>
        <div>Active</div>
        <div>Inactive</div>
        <div>Total</div>
      </div>

      {/* Virtualized List or Empty State */}
      <div className="flex-1 min-h-0">
        {data.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No headcount data available 📉
          </div>
        ) : (
          <List
            height={listHeight}
            itemCount={data.length}
            itemSize={rowHeight}
            width="100%"
          >
            {Row}
          </List>
        )}
      </div>

      {/* Footer Totals */}
      {data.length > 0 && (
        <div className="grid grid-cols-[40%_20%_20%_20%] bg-gray-100 text-sm border-t border-gray-300 px-4 py-2 sticky bottom-0">
          <div>Total</div>
          <div className="text-green-700 font-semibold">{totals.active}</div>
          <div className="text-red-700 font-semibold">{totals.inactive}</div>
          <div className="font-bold">{totals.total}</div>
        </div>
      )}
    </div>
  );
}

export default RoleWiseHeadCount;
