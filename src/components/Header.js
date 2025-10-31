import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaUserCircle, FaSignInAlt, FaChevronDown, FaUserPlus, FaUserShield } from "react-icons/fa";
import api from "../api";

function Header({ user, onLogout }) {
    const [profileOpen, setProfileOpen] = useState(false);
    const [adminSettingsOpen, setAdminSettingsOpen] = useState(false);
    const navigate = useNavigate();
    const profileRef = useRef(null);
    const adminSettingsRef = useRef(null);
    const adminSettingsButtonRef = useRef(null);
    const profileButtonRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                adminSettingsRef.current &&
                !adminSettingsRef.current.contains(event.target) &&
                adminSettingsButtonRef.current &&
                !adminSettingsButtonRef.current.contains(event.target)
            ) {
                setAdminSettingsOpen(false);
            }

            if (
                profileRef.current &&
                !profileRef.current.contains(event.target) &&
                profileButtonRef.current &&
                !profileButtonRef.current.contains(event.target)
            ) {
                setProfileOpen(false);
            }
        };

        document.addEventListener("click", handleClickOutside);
        return () => {
            document.removeEventListener("click", handleClickOutside);
        };
    }, []);

    const handleLogout = () => {
        onLogout();
    };

    return (
        <header className="bg-[#0F172A] text-white shadow-md">
            <div className="w-full px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between h-auto md:h-24 py-4 md:py-0 gap-4 md:gap-0">
                <Link to="/" className="flex items-center min-h-[44px]">
                    <img src="/Group 22.png" alt="NGraph Logo" className="h-12 sm:h-16 w-auto object-contain" />
                </Link>

                <nav className="flex flex-col md:flex-row items-center gap-4 md:gap-8 text-lg sm:text-xl font-medium">
                    <Link to="/" className="hover:text-cyan-400 min-h-[44px] flex items-center justify-center md:justify-start">Home</Link>

                    {user?.roles?.includes("Admin") ? (
                        <div className="relative">
                            <div
                                ref={adminSettingsButtonRef}
                                onClick={(event) => {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    setAdminSettingsOpen(!adminSettingsOpen);
                                }}
                                className="flex items-center gap-1 hover:text-cyan-400 cursor-pointer min-h-[44px] px-2"
                                aria-expanded={adminSettingsOpen}
                                aria-haspopup="true"
                            >
                                Admin Settings <FaChevronDown className="text-sm" />
                            </div>
                            {adminSettingsOpen && (
                                <div
                                    ref={adminSettingsRef}
                                    onClick={(e) => e.stopPropagation()}
                                    className="absolute left-0 mt-2 bg-white text-gray-900 shadow-lg rounded-md w-full sm:w-48 z-50"
                                >
                                    <Link
                                        to="/admin/users"
                                        className="block px-4 py-2 hover:bg-gray-100 min-h-[44px] flex items-center"
                                        onClick={() => setAdminSettingsOpen(false)}
                                    >
                                        User Settings
                                    </Link>
                                    <Link
                                        to="/admin/emailsettings"
                                        className="block px-4 py-2 hover:bg-gray-100 min-h-[44px] flex items-center"
                                        onClick={() => setAdminSettingsOpen(false)}
                                    >
                                        Email Settings
                                    </Link>
                                    <Link
                                        to="/admin/invoicesettings"
                                        className="block px-4 py-2 hover:bg-gray-100 min-h-[44px] flex items-center"
                                        onClick={() => setAdminSettingsOpen(false)}
                                    >
                                        Invoice Settings
                                    </Link>
                                    <Link
                                        to="/admin/complaintsmanagement"
                                        className="block px-4 py-2 hover:bg-gray-100 min-h-[44px] flex items-center"
                                        onClick={() => setAdminSettingsOpen(false)}
                                    >
                                        Complaints Management
                                    </Link>
                                </div>
                            )}
                        </div>
                    ) : (
                        <Link to="/dashboard" className="hover:text-cyan-400 min-h-[44px] flex items-center justify-center md:justify-start">
                            Dashboard
                        </Link>
                    )}
                    <Link to="/subscription/buy" className="hover:text-cyan-400 min-h-[44px] flex items-center justify-center md:justify-start">
                        Subscriptions
                    </Link>
                </nav>

                {user ? (
                    <div className="flex items-center gap-4 relative">
                        {user.roles?.includes("Admin") ? (
                            <div className="relative">
                                <div
                                    ref={profileButtonRef}
                                    onClick={(event) => {
                                        event.preventDefault();
                                        event.stopPropagation();
                                        setProfileOpen(!profileOpen);
                                    }}
                                    className="flex items-center gap-2 hover:text-cyan-400 cursor-pointer min-h-[44px] px-2"
                                    aria-expanded={profileOpen}
                                    aria-haspopup="true"
                                >
                                    <FaUserShield className="text-2xl sm:text-3xl" />
                                    <FaChevronDown className="text-sm" />
                                </div>

                                {profileOpen && (
                                    <div
                                        ref={profileRef}
                                        onClick={(e) => e.stopPropagation()}
                                        className="absolute right-0 mt-2 bg-white text-gray-900 shadow-lg rounded-md w-full sm:w-48 z-50"
                                    >
                                        <div className="block w-full text-left px-4 py-2 min-h-[44px] flex flex-col justify-center">
                                            <span className="block text-sm sm:text-base font-bold">
                                                {user.adminName || "Admin Name"}
                                            </span>
                                            {user.email && (
                                                <span className="block text-xs sm:text-sm text-gray-500">{user.email}</span>
                                            )}
                                        </div>
                                        <button
                                            onClick={(event) => {
                                                event.preventDefault();
                                                event.stopPropagation();
                                                setProfileOpen(false);
                                                handleLogout();
                                            }}
                                            className="block w-full text-left px-4 py-2 hover:bg-gray-100 min-h-[44px] flex items-center"
                                        >
                                            Logout
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="relative">
                                <div
                                    ref={profileButtonRef}
                                    onClick={(event) => {
                                        event.preventDefault();
                                        event.stopPropagation();
                                        setProfileOpen(!profileOpen);
                                    }}
                                    className="flex items-center gap-3 hover:text-cyan-400 cursor-pointer min-h-[44px] px-2"
                                    aria-expanded={profileOpen}
                                    aria-haspopup="true"
                                >
                                    <div className="flex flex-col items-end text-right leading-tight">
                                        <span className="font-semibold text-sm sm:text-base">
                                            {user.companyName || user.customerName || "User"}
                                        </span>
                                        <span className="text-xs sm:text-sm text-gray-400 truncate max-w-[140px]">
                                            {user.email}
                                        </span>
                                    </div>
                                    <FaChevronDown className="text-sm" />
                                </div>

                                {profileOpen && (
                                    <div
                                        ref={profileRef}
                                        onClick={(e) => e.stopPropagation()}
                                        className="absolute right-0 mt-2 bg-white text-gray-900 shadow-lg rounded-md w-full sm:w-56 z-50"
                                    >
                                        <Link
                                            to="/my-profile"
                                            className="block px-4 py-2 hover:bg-gray-100 min-h-[44px] flex items-center"
                                            onClick={() => setProfileOpen(false)}
                                        >
                                            My Profile
                                        </Link>
                                        <Link
                                            to="/purchase-history"
                                            className="block px-4 py-2 hover:bg-gray-100 min-h-[44px] flex items-center"
                                            onClick={() => setProfileOpen(false)}
                                        >
                                            Purchase History
                                        </Link>
                                        <Link
                                            to="/complaints"
                                            className="block px-4 py-2 hover:bg-gray-100 min-h-[44px] flex items-center"
                                            onClick={() => setProfileOpen(false)}
                                        >
                                            Complaints
                                        </Link>
                                        <Link
                                            to="/change-password"
                                            className="block px-4 py-2 hover:bg-gray-100 min-h-[44px] flex items-center"
                                            onClick={() => setProfileOpen(false)}
                                        >
                                            Change Password
                                        </Link>
                                        <button
                                            onClick={(event) => {
                                                event.preventDefault();
                                                event.stopPropagation();
                                                setProfileOpen(false);
                                                handleLogout();
                                            }}
                                            className="block w-full text-left px-4 py-2 hover:bg-gray-100 min-h-[44px] flex items-center"
                                        >
                                            Logout
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                        <Link to="/login" className="hover:text-cyan-400 flex items-center gap-2 text-lg sm:text-xl min-h-[44px] px-2">
                            <FaSignInAlt className="text-lg sm:text-xl" /> Login
                        </Link>
                        <Link to="/register" className="hover:text-cyan-400 flex items-center gap-2 text-lg sm:text-xl min-h-[44px] px-2">
                            <FaUserPlus className="text-lg sm:text-xl" /> Register
                        </Link>
                    </div>
                )}
            </div>
        </header>
    );
}

export default Header;
