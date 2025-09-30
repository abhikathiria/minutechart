import React from "react";
import { FixedSizeList as List } from "react-window";
import { FaBoxes } from "react-icons/fa";

function TopItemsTable({ className = "", data = [] }) {
  const rowHeight = 50;
  const visibleRowCount = 10;
  const listHeight = rowHeight * visibleRowCount;

  const Row = ({ index, style }) => {
    const item = data[index];
    const isEven = index % 2 === 0;

    return (
      <div
        style={style}
        className={`grid grid-cols-[20%_50%_30%] text-sm border-b border-gray-200 ${
          isEven ? "bg-blue-50" : "bg-white"
        } hover:bg-gray-50`}
      >
        <div className="px-4 py-2">{item.code || item.Code}</div>
        <div className="px-4 py-2">{item.material || item.Material}</div>
        <div className="px-4 py-2 font-bold text-right">
          {item.stock || item.Stock}
        </div>
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
          <FaBoxes className="text-white text-xl sm:text-2xl" />
        </span>
        <span>Top Items</span>
      </h2>

      {/* Header */}
      <div className="grid grid-cols-[20%_50%_30%] bg-blue-50 font-semibold text-sm border-b border-gray-300 px-4 py-2">
        <div>Code</div>
        <div>Material</div>
        <div className="text-right">Stock</div>
      </div>

      {/* Virtualized List or Empty State */}
      <div className="flex-1 min-h-0">
        {data.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No item data available 📦
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
    </div>
  );
}

export default TopItemsTable;
