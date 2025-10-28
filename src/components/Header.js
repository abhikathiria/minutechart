// Header.jsx
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
            <div className="w-full px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between h-auto md:h-20 py-4 md:py-0 gap-4 md:gap-0">
                <Link to="/" className="flex items-center">
                    <img src="/Ngraphlogo.png" alt="Project Logo" className="h-12 w-auto object-contain" />
                </Link>

                <nav className="flex flex-col md:flex-row items-center gap-4 md:gap-8 text-lg font-medium">
                    <Link to="/" className="hover:text-cyan-400">Home</Link>

                    {user?.roles?.includes("Admin") ? (
                        <div className="relative">
                            <div
                                ref={adminSettingsButtonRef}
                                onClick={(event) => {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    setAdminSettingsOpen(!adminSettingsOpen);
                                }}
                                className="flex items-center gap-1 hover:text-cyan-400 cursor-pointer"
                            >
                                Admin Settings <FaChevronDown className="text-sm" />
                            </div>
                            {adminSettingsOpen && (
                                <div
                                    ref={adminSettingsRef}
                                    onClick={(e) => e.stopPropagation()}
                                    className="absolute left-0 mt-2 bg-white text-gray-900 shadow-lg rounded-md w-48 z-50"
                                >
                                    <Link
                                        to="/admin/users"
                                        className="block px-4 py-2 hover:bg-gray-100"
                                        onClick={() => setAdminSettingsOpen(false)}
                                    >
                                        User Settings
                                    </Link>
                                    <Link
                                        to="/admin/emailsettings"
                                        className="block px-4 py-2 hover:bg-gray-100"
                                        onClick={() => setAdminSettingsOpen(false)}
                                    >
                                        Email Settings
                                    </Link>
                                    <Link
                                        to="/admin/invoicesettings"
                                        className="block px-4 py-2 hover:bg-gray-100"
                                        onClick={() => setAdminSettingsOpen(false)}
                                    >
                                        Invoice Settings
                                    </Link>
                                    <Link
                                        to="/admin/complaintsmanagement"
                                        className="block px-4 py-2 hover:bg-gray-100"
                                        onClick={() => setAdminSettingsOpen(false)}
                                    >
                                        Complaints Management
                                    </Link>
                                </div>
                            )}
                        </div>
                    ) : (
                        <Link to="/dashboard" className="hover:text-cyan-400">
                            Dashboard
                        </Link>
                    )}
                    <Link to="/subscription/buy" className="hover:text-cyan-400">
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
                                    className="flex items-center gap-2 hover:text-cyan-400 cursor-pointer"
                                >
                                    <FaUserShield className="text-3xl" />
                                    <FaChevronDown className="text-sm" />
                                </div>

                                {profileOpen && (
                                    <div
                                        ref={profileRef}
                                        onClick={(e) => e.stopPropagation()}
                                        className="absolute right-0 mt-2 bg-white text-gray-900 shadow-lg rounded-md w-48 z-50"
                                    >
                                        <div className="block w-full text-left px-4 py-2">
                                            <span className="block text-base font-bold">
                                                {user.adminName || "Admin Name"}
                                            </span>
                                            {user.email && (
                                                <span className="block text-sm text-gray-500">{user.email}</span>
                                            )}
                                        </div>
                                        <button
                                            onClick={(event) => {
                                                event.preventDefault();
                                                event.stopPropagation();
                                                setProfileOpen(false);
                                                handleLogout();
                                            }}
                                            className="block w-full text-left px-4 py-2 hover:bg-gray-100"
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
                                    className="flex items-center gap-3 hover:text-cyan-400 cursor-pointer"
                                >
                                    <div className="flex flex-col items-end text-right leading-tight">
                                        <span className="font-semibold text-sm">
                                            {user.companyName || user.customerName || "User"}
                                        </span>
                                        <span className="text-xs text-gray-400 truncate max-w-[140px]">
                                            {user.email}
                                        </span>
                                    </div>
                                    <FaChevronDown className="text-sm" />
                                </div>

                                {profileOpen && (
                                    <div
                                        ref={profileRef}
                                        onClick={(e) => e.stopPropagation()}
                                        className="absolute right-0 mt-2 bg-white text-gray-900 shadow-lg rounded-md w-56 z-50"
                                    >
                                        <Link
                                            to="/my-profile"
                                            className="block px-4 py-2 hover:bg-gray-100"
                                            onClick={() => setProfileOpen(false)}
                                        >
                                            My Profile
                                        </Link>
                                        <Link
                                            to="/purchase-history"
                                            className="block px-4 py-2 hover:bg-gray-100"
                                            onClick={() => setProfileOpen(false)}
                                        >
                                            Purchase History
                                        </Link>
                                        <Link
                                            to="/complaints"
                                            className="block px-4 py-2 hover:bg-gray-100"
                                            onClick={() => setProfileOpen(false)}
                                        >
                                            Complaints
                                        </Link>
                                        <Link
                                            to="/change-password"
                                            className="block px-4 py-2 hover:bg-gray-100"
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
                                            className="block w-full text-left px-4 py-2 hover:bg-gray-100"
                                        >
                                            Logout
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex items-center gap-4">
                        <Link to="/login" className="hover:text-cyan-400 flex items-center gap-2 text-lg">
                            <FaSignInAlt className="text-xl" /> Login
                        </Link>
                        <Link to="/register" className="hover:text-cyan-400 flex items-center gap-2 text-lg">
                            <FaUserPlus className="text-xl" /> Register
                        </Link>
                    </div>
                )}
            </div>
        </header>
    );
}

export default Header;