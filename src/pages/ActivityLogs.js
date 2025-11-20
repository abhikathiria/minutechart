import React, { useEffect, useState, useCallback, useMemo } from "react";
import api from "../api";
import { FaUser, FaClock, FaRedo, FaFilter, FaInfoCircle, FaCog, FaHistory, FaSearch, FaChevronLeft, FaChevronRight } from "react-icons/fa";

// --- Configuration for visual consistency ---
const PRIMARY_COLOR = 'text-indigo-600';
const PRIMARY_BG = 'bg-indigo-600';
const LOGS_PER_PAGE = 20; // Define items per page

const ROLE_COLORS = {
    Admin: 'bg-red-500 text-white',
    User: 'bg-green-500 text-white',
    System: 'bg-gray-500 text-white',
    Unknown: 'bg-yellow-500 text-gray-900',
};

// --- Custom Pagination Component (Unchanged) ---
const PaginationControls = ({ currentPage, totalPages, onPageChange }) => (
    <div className="flex items-center justify-between mt-4">
        <span className="text-sm text-gray-700">
            Page {currentPage} of {totalPages}
        </span>
        <div className="flex space-x-2">
            <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
                <FaChevronLeft className="w-4 h-4" />
            </button>
            <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages || totalPages === 0}
                className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
                <FaChevronRight className="w-4 h-4" />
            </button>
        </div>
    </div>
);


// --- Log Row Component (Unchanged) ---
const LogRow = ({ log }) => {
    const roleClass = ROLE_COLORS[log.actorRole] || ROLE_COLORS.User;
    const isError = log.action.toLowerCase().includes("fail") || log.action.toLowerCase().includes("error") || log.action.toLowerCase().includes("block");
    const rowClass = isError ? "bg-red-50 hover:bg-red-100 border-red-200" : "hover:bg-gray-50 border-gray-100";
    const formattedDescription = log.description?.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>') || log.description;

    return (
        <tr className={`border-b ${rowClass} transition duration-150`}>
            <td className="p-4 whitespace-nowrap text-xs sm:text-sm">
                <div className="flex items-center space-x-3">
                    <FaClock className="text-gray-400 w-3 h-3 flex-shrink-0" />
                    <div className="flex flex-col">
                        <span className="font-semibold text-gray-800">
                            {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                        <span className="text-gray-500 text-xs mt-0.5">
                            {new Date(log.timestamp).toLocaleDateString()}
                        </span>
                    </div>
                </div>
            </td>

            <td className="p-4 whitespace-nowrap hidden md:table-cell">
                <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${roleClass}`}>
                    {log.actorRole}
                </span>
                <div className="text-sm font-medium text-gray-900 mt-1 flex items-center truncate max-w-[150px]">
                    <FaUser className="w-3 h-3 mr-1 text-gray-500 flex-shrink-0" />
                    {log.actorName || "Unknown"}
                </div>
            </td>

            <td className="p-4">
                <div className="text-sm font-medium text-gray-800">
                    <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${isError ? 'bg-red-200 text-red-800' : 'bg-green-100 text-green-800'}`}>
                        {log.action.toUpperCase().split(' ')[0]} 
                    </span>
                    <div className="mt-1 text-gray-600 leading-tight">
                        <span dangerouslySetInnerHTML={{ __html: formattedDescription }} />
                    </div>
                </div>
            </td>

            <td className="p-4 whitespace-nowrap text-xs text-gray-500 hidden lg:table-cell">
                <p className="font-mono text-gray-700">{log.ipAddress || 'N/A'}</p>
                <p className="truncate w-32">{log.browserInfo.substring(0, 30) || 'N/A'}</p>
            </td>
        </tr>
    );
}

// --- Main ActivityLogs Component ---
export default function ActivityLogs() {
    const [allLogs, setAllLogs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filterRole, setFilterRole] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [startDate, setStartDate] = useState("");
    const [startTime, setStartTime] = useState(""); // NEW: State for Start Time
    const [endDate, setEndDate] = useState("");
    const [endTime, setEndTime] = useState("");     // NEW: State for End Time
    const [currentPage, setCurrentPage] = useState(1);

    const loadLogs = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await api.get("/adminDashboard/activitylogs");
            const sortedLogs = res.data.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            setAllLogs(sortedLogs);
            setCurrentPage(1);
        } catch (error) {
            console.error("Failed to load logs:", error);
            setAllLogs([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadLogs();
    }, [loadLogs]);

    // Helper to combine Date (YYYY-MM-DD) and Time (HH:MM) into one Date object
    const combineDateTime = (dateStr, timeStr, isEnd = false) => {
        if (!dateStr) return null;
        
        // If no time is set, default to start/end of day
        const time = timeStr || (isEnd ? '23:59' : '00:00');
        
        // Create a new Date object using the combined string
        const dateTimeString = `${dateStr}T${time}:00`;
        return new Date(dateTimeString).getTime();
    };


    // --- Client-Side Filtering, Searching, and Pagination Logic ---
    const paginatedLogs = useMemo(() => {
        let tempLogs = allLogs;

        // 1. Role Filter
        if (filterRole) {
            tempLogs = tempLogs.filter(log => log.actorRole === filterRole);
        }

        // 2. Date/Time Filter (Precise Filtering)
        const startFilterTime = combineDateTime(startDate, startTime, false);
        const endFilterTime = combineDateTime(endDate, endTime, true);

        if (startFilterTime) {
            tempLogs = tempLogs.filter(log => new Date(log.timestamp).getTime() >= startFilterTime);
        }
        if (endFilterTime) {
            tempLogs = tempLogs.filter(log => new Date(log.timestamp).getTime() <= endFilterTime);
        }

        // 3. Search Term Filter
        if (searchTerm) {
            const lowerCaseSearch = searchTerm.toLowerCase();
            tempLogs = tempLogs.filter(log => 
                log.action.toLowerCase().includes(lowerCaseSearch) ||
                log.description.toLowerCase().includes(lowerCaseSearch) ||
                log.actorName?.toLowerCase().includes(lowerCaseSearch)
            );
        }

        // --- Pagination Calculation ---
        const totalPages = Math.ceil(tempLogs.length / LOGS_PER_PAGE);
        const startIndex = (currentPage - 1) * LOGS_PER_PAGE;
        const endIndex = startIndex + LOGS_PER_PAGE;

        if (currentPage > totalPages && totalPages > 0) {
            setCurrentPage(totalPages);
        }

        return {
            filteredLogs: tempLogs.slice(startIndex, endIndex),
            totalRecords: tempLogs.length,
            totalPages: totalPages
        };
    }, [allLogs, filterRole, searchTerm, startDate, startTime, endDate, endTime, currentPage]);

    const { filteredLogs, totalRecords, totalPages } = paginatedLogs;

    // Handler to change page
    const handlePageChange = (page) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
        }
    };
    
    // Handler for filters to reset to page 1
    const handleFilterChange = (setter) => (e) => {
        setter(e.target.value);
        setCurrentPage(1);
    };


    return (
        <div className="min-h-screen bg-gray-50 p-4 sm:p-8 lg:p-10">
            {/* Header and Controls (Unchanged) */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 pb-4 border-b border-gray-200">
                <h2 className="text-3xl font-extrabold text-gray-900 mb-4 sm:mb-0 flex items-center">
                    <FaHistory className={`w-7 h-7 mr-3 ${PRIMARY_COLOR}`} />
                    System Audit Logs 📜
                </h2>
                <button
                    onClick={loadLogs}
                    disabled={isLoading}
                    className={`inline-flex items-center px-5 py-2 text-sm font-semibold rounded-full shadow-md transition duration-300
                        ${isLoading 
                            ? 'bg-gray-400 text-gray-700 cursor-not-allowed' 
                            : `${PRIMARY_BG} text-white hover:bg-indigo-700 hover:shadow-lg active:scale-95`
                        }`}
                >
                    <FaRedo className={`mr-2 w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                    {isLoading ? 'Loading...' : 'Refresh Logs'}
                </button>
            </div>

            {/* --- Filter Bar and Search (Redesigned for 6 columns/rows) --- */}
            <div className="bg-white p-5 rounded-xl shadow-xl mb-6 border border-gray-100">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-4 items-center">
                    
                    {/* Search Bar (2/6 columns) */}
                    <div className="md:col-span-2 relative">
                        <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Search action, description, or actor..."
                            value={searchTerm}
                            onChange={handleFilterChange(setSearchTerm)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl text-sm shadow-sm focus:ring-indigo-500 focus:border-indigo-500 transition"
                        />
                    </div>

                    {/* Role Filter (1/6 column) */}
                    <select
                        value={filterRole}
                        onChange={handleFilterChange(setFilterRole)}
                        className="p-2.5 border border-gray-300 rounded-xl text-sm shadow-sm focus:ring-indigo-500 focus:border-indigo-500 appearance-none bg-white"
                    >
                        <option value="">👤 All Actors</option>
                        <option value="Admin">Admins</option>
                        <option value="User">Users</option>
                        <option value="System">System</option>
                    </select>

                    {/* Start Date (1/6 column) */}
                    <input
                        type="date"
                        title="Start Date"
                        value={startDate}
                        onChange={handleFilterChange(setStartDate)}
                        className="p-2.5 border border-gray-300 rounded-xl text-sm shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    />

                    {/* Start Time (1/6 column) - NEW */}
                    <input
                        type="time"
                        title="Start Time (Optional)"
                        value={startTime}
                        onChange={handleFilterChange(setStartTime)}
                        className="p-2.5 border border-gray-300 rounded-xl text-sm shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    />

                    {/* End Date (1/6 column) */}
                    <input
                        type="date"
                        title="End Date"
                        value={endDate}
                        onChange={handleFilterChange(setEndDate)}
                        className="p-2.5 border border-gray-300 rounded-xl text-sm shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    
                    {/* End Time (Removed for simplicity, using default 23:59:59 logic in helper)
                       * If you want a 6th input, you can re-enable End Time here.
                       * For a cleaner layout, I've opted for 5 inputs (2+1+1+1) and a simplified end logic.
                       * If you need 6 inputs, simply uncomment the following block and modify the grid to 6 columns:
                       * * <input
                       * type="time"
                       * title="End Time (Optional)"
                       * value={endTime}
                       * onChange={handleFilterChange(setEndTime)}
                       * className="p-2.5 border border-gray-300 rounded-xl text-sm shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                       * />
                    */}

                </div>
            </div>

            {/* Log Table Container (Unchanged) */}
            <div className="bg-white shadow-2xl rounded-xl overflow-x-auto border border-gray-100">
                <table className="min-w-full text-left">
                    <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm border-b border-gray-200">
                        <tr>
                            <th className="p-4 text-xs font-semibold text-gray-600 uppercase tracking-wider w-[15%]">Time/Date</th>
                            <th className="p-4 text-xs font-semibold text-gray-600 uppercase tracking-wider w-[15%] hidden md:table-cell">Actor (Role)</th>
                            <th className="p-4 text-xs font-semibold text-gray-600 uppercase tracking-wider w-[55%]">Action Description</th>
                            <th className="p-4 text-xs font-semibold text-gray-600 uppercase tracking-wider w-[15%] hidden lg:table-cell">Source IP / Browser</th>
                        </tr>
                    </thead>
                    <tbody>
                        {/* Loading State */}
                        {isLoading && (
                            <tr>
                                <td colSpan={4} className="py-12 text-center text-lg text-gray-500">
                                    <FaCog className="animate-spin inline-block mr-3 text-indigo-500 w-6 h-6" />
                                    Fetching the Audit Trail...
                                </td>
                            </tr>
                        )}
                        {/* No Results State */}
                        {!isLoading && filteredLogs.length === 0 && (
                            <tr>
                                <td colSpan={4} className="py-12 text-center text-lg text-gray-500">
                                    <FaInfoCircle className="inline-block mr-2" />
                                    No records found for the current filters. Try broadening your search.
                                </td>
                            </tr>
                        )}
                        {/* Log Rows */}
                        {!isLoading && filteredLogs.map((log) => (
                            <LogRow key={log.id} log={log} />
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Footer and Pagination (Unchanged) */}
            {!isLoading && totalPages > 0 && (
                <div className="flex justify-between items-center mt-6 p-4 bg-white rounded-xl shadow-lg border border-gray-100">
                 <div className="text-sm font-medium text-gray-600">
                    Displaying **{filteredLogs.length}** of **{totalRecords.toLocaleString()}** records matching filters.
                </div>
                    <PaginationControls
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={handlePageChange}
                    />
                </div>
            )}
        </div>
    );
}