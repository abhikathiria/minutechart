import React, { useState, useEffect, useMemo } from "react";
import api from "../../api";
import { Link, useParams, useNavigate } from "react-router-dom";
import {
    FaArrowLeft,
    FaToolbox,
    FaUserCog,
    FaDollarSign,
    FaMoneyBillWave,
    FaReceipt,
    FaIndustry
} from "react-icons/fa";

export default function ProcurementsModules() {
    const { id } = useParams();
    const navigate = useNavigate();

    // Define the tool button data with updated modules and distinct colors
    const buttons = [
        {
            name: "Main",
            description: "Manage Procurements Main Module.",
            link: `/erp/${id}/procurements/main`,
            icon: <FaUserCog className="w-8 h-8 text-indigo-600" />,
            color: "indigo"
        },
        {
            name: "Requirements",
            description: "Manage Procurements Requirements Module.",
            link: `/erp/${id}/procurements/requirements`,
            icon: <FaDollarSign className="w-8 h-8 text-teal-600" />,
            color: "teal"
        },
        {
            name: "Request for Quote",
            description: "Manage Procurements Request for Quote Module.",
            link: `/erp/${id}/procurements/quote`,
            icon: <FaDollarSign className="w-8 h-8 text-teal-600" />,
            color: "teal"
        },
        {
            name: "Purchase Orders",
            description: "Manage Procurements Purchase Orders Module.",
            link: `/erp/${id}/procurements/purchase-orders`,
            icon: <FaDollarSign className="w-8 h-8 text-teal-600" />,
            color: "teal"
        },
        {
            name: "Purchase Returns",
            description: "Manage Procurements Purchase Returns Module.",
            link: `/erp/${id}/procurements/purchase-returns`,
            icon: <FaDollarSign className="w-8 h-8 text-teal-600" />,
            color: "teal"
        },
        {
            name: "Reports",
            description: "Manage Procurements Reports Module.",
            link: `/erp/${id}/procurements/reports`,
            icon: <FaDollarSign className="w-8 h-8 text-teal-600" />,
            color: "teal"
        },
    ];

    // Helper function for dynamic Tailwind classes (kept the same)
    const getCardClasses = (color) => ({
        iconBg: `bg-${color}-100 group-hover:bg-${color}-200`,
        nameHover: `group-hover:text-${color}-700`,
        borderHover: `hover:border-${color}-400`,
        shadowHover: `hover:shadow-lg-${color}`,
    });

    return (
        <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-10">
            <div className="max-w-7xl mx-auto">

                {/* Header Section */}
                <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-10 border-b pb-4">
                    <Link
                        to={`/user/${id}/erp-modules`}
                        state={{ keepFilters: true }}
                        className="
                            flex items-center gap-2 text-sm font-medium 
                            text-gray-600 bg-white px-4 py-2 rounded-full 
                            shadow-md transition duration-300 ease-in-out 
                            hover:bg-gray-100 hover:text-gray-800 
                            ring-1 ring-gray-200 mb-4 sm:mb-0
                        "
                    >
                        <FaArrowLeft className="w-3 h-3" />
                        Back to ERP
                    </Link>

                    <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
                        <FaToolbox className="w-8 h-8 text-purple-600" />
                        <span>ERP Procurements Modules Control Panel</span>
                    </h1>

                    <div className="w-40 sm:block hidden" />
                </header>

                <div className="mb-8">
                    <p className="text-xl text-gray-500 font-light">
                        Select any erp procurements module below to manage the specific module.
                    </p>
                </div>

                {/* Tool Cards Grid - Adjusted for 5 items (will gracefully fall back to 4/3/2/1 columns) */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
                    {buttons.map((btn, index) => {
                        const { iconBg, nameHover, borderHover } = getCardClasses(btn.color);
                        return (
                            <Link
                                key={index}
                                to={btn.link}
                                className={`
                                    group 
                                    bg-white 
                                    rounded-xl 
                                    p-6 
                                    shadow-lg 
                                    border border-gray-100
                                    transition-all duration-300 ease-in-out
                                    flex flex-col items-start gap-4 
                                    ${borderHover}
                                    hover:translate-y-[-4px]
                                `}
                            >
                                {/* Icon Container */}
                                <div
                                    className={`
                                        w-16 h-16 
                                        rounded-xl 
                                        ${iconBg} 
                                        flex items-center justify-center 
                                        transition-colors duration-300
                                    `}
                                >
                                    {btn.icon}
                                </div>

                                {/* Title */}
                                <span className={`text-xl font-bold text-gray-800 ${nameHover} transition-colors duration-300 mt-2`}>
                                    {btn.name}
                                </span>

                                {/* Description */}
                                <p className="text-sm text-gray-500 leading-relaxed flex-grow">
                                    {btn.description}
                                </p>

                                {/* Action link look */}
                                <div className="text-sm font-semibold text-purple-500 group-hover:text-purple-700 mt-2">
                                    Explore &rarr;
                                </div>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}