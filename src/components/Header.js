import React, { useState, useEffect, useRef, memo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
    FaUserCircle, FaSignOutAlt, FaSignInAlt, FaChevronDown, FaUserPlus, FaUserShield,
    FaBars, FaTimes, FaCog, FaChevronUp, FaChartArea, FaHome, FaTags, FaLock, FaHistory, FaEnvelope,
    FaUsers, FaAt, FaFileInvoice, FaClipboardList, FaTachometerAlt, FaPlug
} from "react-icons/fa";
// Assuming 'api' is not needed directly in the component structure, keeping it imported for completeness
import api from "../api";
import { motion, AnimatePresence } from "framer-motion";

// --- FUTURISTIC DESIGN VARIABLES & COMPONENTS ---

// Primary Neon Colors
const NEON_CYAN = "#00F0FF";
const NEON_PURPLE = "#9D4EDD";
const BG_DARK = "#080C16";
const ACCENT_RED = "#FF6347"; // Used for Admin alerts/icons

// Dropdown motion variants (Holographic reveal)
const dropdownVariants = {
    initial: { opacity: 0, y: -20, scale: 0.95 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: -20, scale: 0.95 },
};

// Mobile Nav motion variants (System slide down)
const mobileNavVariants = {
    initial: { opacity: 0, y: '-100%' },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: '-100%' },
};

// --- Helper Components ---

// **FUTURISTIC COMPONENT 1: User Display Panel**
// FIX: Added isSuperAdmin prop
const UserDisplay = memo(({ user, isAdmin, isSuperAdmin }) => {
    const userName = isAdmin
        ? (user?.adminName || "Admin")
        : (user?.companyName || user?.customerName || "User");

    // Determine the admin level text
    const adminLevelText = isSuperAdmin ? 'I' : 'II';

    return (
        <div className={`flex flex-col px-4 py-3 border-b border-white/10 text-left bg-black/30 backdrop-blur-md`}>
            <div className={`font-extrabold text-lg flex items-center gap-2 ${isAdmin ? 'text-red-400' : 'text-cyan-400'}`}>
                {/* Subtle Breathing Glow for Icon */}
                <motion.div
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    className="shrink-0"
                >
                    {isAdmin ? <FaUserShield className="w-5 h-5 drop-shadow-[0_0_5px_#FF6347]" /> : <FaUserCircle className="w-5 h-5 drop-shadow-[0_0_5px_#00F0FF]" />}
                </motion.div>
                <span className="truncate max-w-[calc(100%-2rem)] text-white">{userName}</span>
            </div>
            <span className="text-sm text-gray-400 truncate font-mono">{user?.email}</span>
        </div>
    );
});

// **FUTURISTIC COMPONENT 2: Dropdown Item (Interactive Holo-Link)**
const DropdownItem = ({ to, icon, children, onClick }) => (
    <Link
        to={to}
        onClick={onClick}
        className="block px-4 py-3 text-white/80 hover:bg-cyan-500/10 hover:text-cyan-400 transition-colors duration-150 text-base font-medium flex items-center gap-3 min-h-[44px] relative group overflow-hidden"
    >
        {/* Animated Hover Bar */}
        <div className="absolute left-0 top-0 h-full w-0.5 bg-cyan-400 opacity-0 group-hover:opacity-100 group-hover:w-1 transition-all duration-200" />
        <span className="text-cyan-400 group-hover:text-cyan-300 transition-colors duration-150">{icon}</span>
        {children}
    </Link>
);

const AdminDropdownItem = ({ to, icon, children, onClick }) => (
    <Link
        to={to}
        onClick={onClick}
        className="block px-4 py-3 text-white/80 hover:bg-red-500/10 hover:text-red-400 transition-colors duration-150 text-base font-medium flex items-center gap-3 min-h-[44px] relative group overflow-hidden"
    >
        {/* Animated Hover Bar */}
        <div className="absolute left-0 top-0 h-full w-0.5 bg-red-400 opacity-0 group-hover:opacity-100 group-hover:w-1 transition-all duration-200" />
        <span className="text-red-400 group-hover:text-red-300 transition-colors duration-150">{icon}</span>
        {children}
    </Link>
);

// **FUTURISTIC COMPONENT 3: Desktop Navigation Link (Animated Border)**
const NavLinkDesktop = ({ to, children }) => (
    <Link
        to={to}
        className="text-white/80 hover:text-cyan-400 transition-colors duration-300 px-3 py-2 text-lg font-medium min-h-[44px] flex items-center relative group"
    >
        {children}
        {/* Animated Underline Effect (Cyber-Glow) */}
        <motion.div
            className="absolute bottom-0 left-0 w-full h-0.5 bg-cyan-400/0 group-hover:bg-cyan-400 drop-shadow-[0_0_5px_#00F0FF] transition-all duration-300"
            initial={{ scaleX: 0 }}
            whileHover={{ scaleX: 1 }}
            transition={{ duration: 0.3 }}
        />
    </Link>
);


// --- Header Component ---

function Header({ user, onLogout }) {
    const [profileOpen, setProfileOpen] = useState(false);
    const [adminSettingsOpen, setAdminSettingsOpen] = useState(false);
    const [navOpen, setNavOpen] = useState(false); // Mobile Nav State
    const navigate = useNavigate();

    // Refs (KEEPING ALL EXISTING LOGIC)
    const profileRef = useRef(null);
    const adminSettingsRef = useRef(null);
    const adminSettingsButtonRef = useRef(null);
    const profileButtonRef = useRef(null);
    const navRef = useRef(null);
    const navToggleButtonRef = useRef(null);

    const roles = user?.roles || [];
    const isSuperAdmin = roles.includes("SuperAdmin"); // DEFINED HERE
    const isAdmin = roles.includes("Admin");
    const isAnyAdmin = isSuperAdmin || isAdmin;

    const userName = isSuperAdmin
        ? (user?.adminName || "SuperAdmin")
        : isAdmin
            ? (user?.adminName || "Admin")
            : (user?.companyName || user?.customerName || "User");

    // Click outside handler - LOGIC KEPT INTACT
    useEffect(() => {
        const handleClickOutside = (event) => {
            const isClickOutside = (ref, buttonRef) =>
                ref.current && !ref.current.contains(event.target) &&
                buttonRef.current && !buttonRef.current.contains(event.target);

            if (isClickOutside(adminSettingsRef, adminSettingsButtonRef)) {
                setAdminSettingsOpen(false);
            }
            if (isClickOutside(profileRef, profileButtonRef)) {
                setProfileOpen(false);
            }
            if (navOpen && isClickOutside(navRef, navToggleButtonRef)) {
                setNavOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [navOpen]);

    const handleLogout = () => {
        onLogout();
        setProfileOpen(false);
        setNavOpen(false);
    };

    const closeAllMenus = (callback) => {
        setProfileOpen(false);
        setAdminSettingsOpen(false);
        setNavOpen(false);
        if (callback) callback();
    };

    const toggleMobileNav = (event) => {
        event.preventDefault(); event.stopPropagation();
        setNavOpen(p => !p);
        setProfileOpen(false);
        setAdminSettingsOpen(false);
    };

    // **HOLOGRAPHIC DROPDOWN SURFACE**
    const dropdownSurface = (content) => (
        <motion.div
            ref={profileRef}
            variants={dropdownVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="absolute top-full right-0 mt-2 bg-black/70 backdrop-blur-lg shadow-[0_0_30px_rgba(0,240,255,0.4)] rounded-lg w-64 z-[60] border border-cyan-400/30 overflow-hidden"
        >
            {content}
        </motion.div>
    );

    // --- Admin Dropdown Items (Desktop) ---
    const adminDesktopDropdown = dropdownSurface(
        <div className="py-1">
            {isSuperAdmin && (
                <>
                    <AdminDropdownItem to="/superadmin/user-management" icon={<FaUsers className="w-4 h-4 shrink-0" />} onClick={() => closeAllMenus()}>User Management</AdminDropdownItem>
                    <AdminDropdownItem to="/admin/emailsettings" icon={<FaAt className="w-4 h-4 shrink-0" />} onClick={() => closeAllMenus()}>Email Settings</AdminDropdownItem>
                    <AdminDropdownItem to="/admin/invoicesettings" icon={<FaFileInvoice className="w-4 h-4 shrink-0" />} onClick={() => closeAllMenus()}>Invoice Settings</AdminDropdownItem>
                    <AdminDropdownItem to="/admin/complaintsmanagement" icon={<FaClipboardList className="w-4 h-4 shrink-0" />} onClick={() => closeAllMenus()}>Complaints Management</AdminDropdownItem>
                    <AdminDropdownItem to="/admin/admindashboard" icon={<FaTachometerAlt className="w-4 h-4 shrink-0" />} onClick={() => closeAllMenus()}>Admin Dashboard</AdminDropdownItem>
                    <AdminDropdownItem to="/admin/activitylogs" icon={<FaHistory className="w-4 h-4 shrink-0" />} onClick={() => closeAllMenus()}>Activity Log</AdminDropdownItem>
                    <AdminDropdownItem to="/superadmin/admin-commission" icon={<FaHistory className="w-4 h-4 shrink-0" />} onClick={() => closeAllMenus()}>Admin Commission</AdminDropdownItem>
                </>
            )}
            {isAdmin && !isSuperAdmin && (
                <>
                    <AdminDropdownItem to="/admin/users" icon={<FaUsers className="w-4 h-4 shrink-0" />} onClick={() => closeAllMenus()}>User Management</AdminDropdownItem>
                    <AdminDropdownItem to="/admin/complaintsmanagement" icon={<FaClipboardList className="w-4 h-4 shrink-0" />} onClick={() => closeAllMenus()}>Complaints Management</AdminDropdownItem>
                    <AdminDropdownItem to="/admin/admindashboard" icon={<FaTachometerAlt className="w-4 h-4 shrink-0" />} onClick={() => closeAllMenus()}>Admin Dashboard</AdminDropdownItem>
                    <AdminDropdownItem to="/admin/activitylogs" icon={<FaHistory className="w-4 h-4 shrink-0" />} onClick={() => closeAllMenus()}>Activity Log</AdminDropdownItem>
                    <AdminDropdownItem to="/admin/my-commission" icon={<FaHistory className="w-4 h-4 shrink-0" />} onClick={() => closeAllMenus()}>My Commission</AdminDropdownItem>
                    <AdminDropdownItem to="/admin/payout-details" icon={<FaHistory className="w-4 h-4 shrink-0" />} onClick={() => closeAllMenus()}>My Payment Details</AdminDropdownItem>
                </>
            )}
        </div>
    );

    // --- User Profile Dropdown Items (Desktop) ---
    const userDesktopDropdown = dropdownSurface(
        <>
            {/* FIX: Passed isSuperAdmin prop */}
            <UserDisplay user={user} isAdmin={isAnyAdmin} isSuperAdmin={isSuperAdmin} />
            <div className="py-1">
                {!isAnyAdmin && ( // Standard User Links
                    <>
                        <DropdownItem to="/my-profile" icon={<FaUserCircle className="w-4 h-4 shrink-0" />} onClick={() => closeAllMenus()}>My Profile</DropdownItem>
                        <DropdownItem to="/purchase-history" icon={<FaHistory className="w-4 h-4 shrink-0" />} onClick={() => closeAllMenus()}>Purchase History</DropdownItem>
                        <DropdownItem to="/complaints" icon={<FaEnvelope className="w-4 h-4 shrink-0" />} onClick={() => closeAllMenus()}>Complaints</DropdownItem>
                        <DropdownItem to="/suggestions-history" icon={<FaClipboardList className="w-4 h-4 shrink-0" />} onClick={() => closeAllMenus()}>Suggestions History</DropdownItem>
                        <DropdownItem to="/subscription/addon" icon={<FaClipboardList className="w-4 h-4 shrink-0" />} onClick={() => closeAllMenus()}>Add Ons</DropdownItem>
                    </>
                )}
                <DropdownItem to="/change-password" icon={<FaLock className="w-4 h-4 shrink-0" />} onClick={() => closeAllMenus()}>Change Password</DropdownItem>
            </div>

            <button
                onClick={() => closeAllMenus(handleLogout)}
                className="block w-full text-left px-4 py-3 text-red-400 bg-red-800/20 hover:bg-red-800/40 font-bold border-t border-red-400/30 flex items-center gap-3 transition-colors duration-150"
            >
                <FaSignOutAlt className="text-lg drop-shadow-[0_0_5px_#FF6347]" /> LOGOUT
            </button>
        </>
    );

    // --- MAIN RENDER ---
    return (
        <header className={`bg-[${BG_DARK}] text-white shadow-2xl shadow-black/50 sticky top-0 z-[100] relative`}>

            {/* --- NEW: FUTURISTIC GRID PATTERN LAYER (Placed directly inside header) --- */}
            <div
                className="absolute inset-0 z-0 opacity-10 pointer-events-none"
                style={{
                    // Inline style for the complex repeating gradient grid pattern
                    backgroundImage: `linear-gradient(to right, rgba(0,240,255,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,240,255,0.05) 1px, transparent 1px)`,
                    backgroundSize: '40px 40px',
                }}
            />

            {/* --- TOP HEADER CONTENT (Wrapped in a Z-index to sit above the grid) --- */}
            <div className="w-full relative z-10">
                <div className="flex items-center justify-between h-24 px-4 sm:px-6 lg:px-8">
                    {/* 1. Logo (Extreme Left) - Glow Effect */}
                    <Link to="/" className="flex items-center flex-shrink-0 group">
                        {/* Assuming /Group 22.png is the logo file */}
                        <motion.img
                            src="/Group 22.png"
                            alt="NGraph Logo - Data Core"
                            className="h-12 sm:h-16 w-auto object-contain group-hover:drop-shadow-[0_0_10px_#00F0FF] transition-all duration-300"
                            initial={{ scale: 0.95 }}
                            whileHover={{ scale: 1.05 }}
                        />
                    </Link>

                    {/* 2. Right Aligned Container */}
                    <div className="flex items-center gap-6">

                        {/* Desktop Navigation Links */}
                        <nav className="hidden md:flex items-center h-full">
                            <div className="flex items-center space-x-4 lg:space-x-6 h-full">

                                <NavLinkDesktop to="/">HOME</NavLinkDesktop>

                                {/* Admin Tools Dropdown (Re-rendered using new wrapper) */}
                                {(isAnyAdmin) && (
                                    <div className="relative h-full flex items-center">
                                        <button
                                            ref={adminSettingsButtonRef}
                                            onClick={(e) => {
                                                e.preventDefault(); e.stopPropagation();
                                                setAdminSettingsOpen(p => !p);
                                                setProfileOpen(false);
                                            }}
                                            className={`flex items-center gap-1 p-2 transition-colors border-2 border-transparent text-lg font-medium rounded-full text-white/80 hover:border-cyan-400 hover:bg-cyan-900/30'}
                                            `}
                                            aria-expanded={adminSettingsOpen}
                                        >
                                            {isSuperAdmin ? 'SUPER ADMIN TOOLS' : 'ADMIN TOOLS'}
                                            <FaChevronDown className={`text-sm transition-transform duration-200 ${adminSettingsOpen ? 'rotate-180' : 'rotate-0'}`} />
                                        </button>
                                        <AnimatePresence>
                                            {adminSettingsOpen && adminDesktopDropdown}
                                        </AnimatePresence>
                                    </div>
                                )}

                                {/* Dashboard Link for non-admins */}
                                {!isAnyAdmin && <NavLinkDesktop to="/dashboard">DASHBOARD</NavLinkDesktop>}

                                {/* Pricing Links (Combined Logic) */}
                                {isSuperAdmin && <NavLinkDesktop to="/superadmin/pricing">PRICING</NavLinkDesktop>}
                                {isAdmin && <NavLinkDesktop to="/pricing">PRICING</NavLinkDesktop>}
                                {!isAnyAdmin && <NavLinkDesktop to="/pricing">PRICING</NavLinkDesktop>}

                            </div>
                        </nav>

                        {/* 3. Profile/Auth & Mobile Toggle (Far Right) */}
                        <div className="flex items-center gap-2 sm:gap-4">
                            {user ? (
                                <>
                                    {/* Profile Button (Desktop/Tablet) - Interactive Device Style */}
                                    <div className="relative hidden md:block">
                                        <button
                                            ref={profileButtonRef}
                                            onClick={(event) => {
                                                event.preventDefault(); event.stopPropagation();
                                                setProfileOpen(!profileOpen);
                                                setAdminSettingsOpen(false);
                                            }}
                                            className="flex items-center gap-2 p-2 rounded-full transition-colors duration-200 border-2 border-transparent hover:border-cyan-400 hover:bg-cyan-900/30 min-h-[44px]"
                                            aria-expanded={profileOpen}
                                            aria-haspopup="true"
                                        >
                                            {isAnyAdmin ? (
                                                <FaUserShield className="text-2xl text-red-400 drop-shadow-[0_0_5px_#FF6347]" />
                                            ) : (
                                                <FaUserCircle className="text-2xl text-cyan-400 drop-shadow-[0_0_5px_#00F0FF]" />
                                            )}
                                            {/* User Name/Email display for desktop */}
                                            <div className="flex flex-col items-end text-right leading-tight hidden xl:block">
                                                <span className="font-semibold text-lg truncate max-w-[150px] text-white/90">{userName}</span>
                                            </div>
                                            <FaChevronDown className={`text-sm transition-transform duration-200 ${profileOpen ? 'rotate-180 text-cyan-400' : 'rotate-0 text-white/60'}`} />
                                        </button>

                                        <AnimatePresence>
                                            {profileOpen && userDesktopDropdown}
                                        </AnimatePresence>
                                    </div>
                                </>
                            ) : (
                                // Auth Links (Desktop) - Futuristic Buttons
                                <div className="hidden md:flex items-center space-x-3">
                                    <Link to="/login" className="flex items-center gap-2 text-lg px-4 py-2 bg-purple-700/60 rounded-lg hover:bg-purple-700/80 transition-colors font-semibold border border-purple-400/50 text-white hover:text-purple-400 drop-shadow-[0_0_5px_#9D4EDD]">
                                        <FaSignInAlt className="text-lg" /> LOGIN
                                    </Link>
                                    <Link to="/register" className="flex items-center gap-2 text-lg px-4 py-2 bg-cyan-700/60 rounded-lg hover:bg-cyan-700/80 transition-colors font-semibold border border-cyan-400/50 text-white hover:text-cyan-400 drop-shadow-[0_0_5px_#00F0FF]">
                                        <FaUserPlus className="text-lg" /> REGISTER
                                    </Link>
                                </div>
                            )}

                            {/* Mobile Menu Button (Far Right) - Interactive Toggle */}
                            <button
                                ref={navToggleButtonRef}
                                onClick={toggleMobileNav}
                                className="md:hidden p-3 text-white hover:text-cyan-400 transition-colors duration-200 rounded-md hover:bg-cyan-900/30 border border-transparent hover:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
                                aria-expanded={navOpen}
                                aria-controls="main-mobile-menu"
                            >
                                {navOpen ? <FaTimes size={24} className="text-cyan-400" /> : <FaBars size={24} className="text-white/80" />}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- CIRCUIT/GLOW SEPARATOR --- */}
            <div className="absolute bottom-0 left-0 w-full h-[3px] bg-gradient-to-r from-transparent via-[#00F0FF] to-transparent opacity-50 drop-shadow-[0_0_8px_#00F0FF]" />


            {/* Mobile Overlay Menu (Sliding from Top - Holographic Panel) */}
            <AnimatePresence>
                {navOpen && (
                    <motion.div
                        id="main-mobile-menu"
                        ref={navRef}
                        variants={mobileNavVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        transition={{ duration: 0.3 }}
                        className={`fixed top-20 left-0 w-full h-auto md:hidden bg-black/80 backdrop-blur-xl shadow-2xl border-t-4 border-cyan-500 z-[90] overflow-y-auto max-h-[calc(100vh-80px)]`}
                    >
                        <div className="px-4 py-4 space-y-2">
                            {/* Primary Links */}
                            <Link to="/" className="block px-3 py-3 rounded-md text-xl font-medium text-white hover:bg-cyan-900/30 transition-colors border-l-4 border-transparent hover:border-cyan-400" onClick={() => closeAllMenus()}>
                                <FaHome className="inline mr-3 text-cyan-400" /> HOME
                            </Link>

                            {/* ADMIN/SUPERADMIN Links (Mobile) */}
                            {(isAnyAdmin) && (
                                <div className="space-y-1 border-t border-red-700/50 pt-2">
                                    <h3 className="px-3 text-lg font-semibold text-red-400 tracking-wider">
                                        {isSuperAdmin ? 'SUPER ADMIN TOOLS' : 'ADMIN TOOLS'}
                                    </h3>
                                    {isSuperAdmin && (
                                        <>
                                            <Link to="/superadmin/user-management" className="block px-3 py-3 rounded-md text-lg font-medium text-white hover:bg-red-900/30 transition-colors border-l-4 border-transparent hover:border-red-400" onClick={() => closeAllMenus()}>
                                                <FaUsers className="inline mr-3 text-red-400" /> User Management
                                            </Link>
                                            <Link to="/admin/emailsettings" className="block px-3 py-3 rounded-md text-lg font-medium text-white hover:bg-red-900/30 transition-colors border-l-4 border-transparent hover:border-red-400" onClick={() => closeAllMenus()}>
                                                <FaAt className="inline mr-3 text-red-400" /> Email Settings
                                            </Link>
                                            <Link to="/admin/invoicesettings" className="block px-3 py-3 rounded-md text-lg font-medium text-white hover:bg-red-900/30 transition-colors border-l-4 border-transparent hover:border-red-400" onClick={() => closeAllMenus()}>
                                                <FaFileInvoice className="inline mr-3 text-red-400" /> Invoice Settings
                                            </Link>
                                            <Link to="/admin/complaintsmanagement" className="block px-3 py-3 rounded-md text-lg font-medium text-white hover:bg-red-900/30 transition-colors border-l-4 border-transparent hover:border-red-400" onClick={() => closeAllMenus()}>
                                                <FaClipboardList className="inline mr-3 text-red-400" /> Complaints Management
                                            </Link>
                                            <Link to="/admin/admindashboard" className="block px-3 py-3 rounded-md text-lg font-medium text-white hover:bg-red-900/30 transition-colors border-l-4 border-transparent hover:border-red-400" onClick={() => closeAllMenus()}>
                                                <FaTachometerAlt className="inline mr-3 text-red-400" /> Admin Dashboard
                                            </Link>
                                            <Link to="/admin/activitylogs" className="block px-3 py-3 rounded-md text-lg font-medium text-white hover:bg-red-900/30 transition-colors border-l-4 border-transparent hover:border-red-400" onClick={() => closeAllMenus()}>
                                                <FaHistory className="inline mr-3 text-red-400" /> Activity Log
                                            </Link>
                                        </>
                                    )}
                                    {isAdmin && !isSuperAdmin && (
                                        <>
                                            <Link to="/admin/users" className="block px-3 py-3 rounded-md text-lg font-medium text-white hover:bg-red-900/30 transition-colors border-l-4 border-transparent hover:border-red-400" onClick={() => closeAllMenus()}>
                                                <FaUsers className="inline mr-3 text-red-400" /> User Management
                                            </Link>
                                            <Link to="/admin/complaintsmanagement" className="block px-3 py-3 rounded-md text-lg font-medium text-white hover:bg-red-900/30 transition-colors border-l-4 border-transparent hover:border-red-400" onClick={() => closeAllMenus()}>
                                                <FaClipboardList className="inline mr-3 text-red-400" /> Complaints Management
                                            </Link>
                                            <Link to="/admin/admindashboard" className="block px-3 py-3 rounded-md text-lg font-medium text-white hover:bg-red-900/30 transition-colors border-l-4 border-transparent hover:border-red-400" onClick={() => closeAllMenus()}>
                                                <FaTachometerAlt className="inline mr-3 text-red-400" /> Admin Dashboard
                                            </Link>
                                            <Link to="/admin/activitylogs" className="block px-3 py-3 rounded-md text-lg font-medium text-white hover:bg-red-900/30 transition-colors border-l-4 border-transparent hover:border-red-400" onClick={() => closeAllMenus()}>
                                                <FaHistory className="inline mr-3 text-red-400" /> Activity Log
                                            </Link>
                                            <Link to="/admin/payout-details" className="block px-3 py-3 rounded-md text-lg font-medium text-white hover:bg-red-900/30 transition-colors border-l-4 border-transparent hover:border-red-400" onClick={() => closeAllMenus()}>
                                                <FaHistory className="inline mr-3 text-red-400" /> Admin Payout Details
                                            </Link>
                                        </>
                                    )}
                                </div>
                            )}

                            {/* Dashboard/Pricing for non-admins */}
                            {!isAnyAdmin && <Link to="/dashboard" className="block px-3 py-3 rounded-md text-xl font-medium text-white hover:bg-cyan-900/30 transition-colors border-l-4 border-transparent hover:border-cyan-400" onClick={() => closeAllMenus()}>
                                <FaChartArea className="inline mr-3 text-cyan-400" /> DASHBOARD
                            </Link>}

                            {/* Pricing Links (Mobile) */}
                            {(isSuperAdmin || isAdmin || !isAnyAdmin) && <Link to={isSuperAdmin ? "/superadmin/pricing" : "/pricing"} className="block px-3 py-3 rounded-md text-xl font-medium text-white hover:bg-cyan-900/30 transition-colors border-l-4 border-transparent hover:border-cyan-400" onClick={() => closeAllMenus()}>
                                <FaTags className="inline mr-3 text-cyan-400" /> PRICING
                            </Link>}


                            {/* User Profile Links & Logout (Mobile Only) */}
                            {user ? (
                                <div className="mt-4 pt-4 border-t border-cyan-700/50 space-y-2">
                                    {/* FIX: Passed isSuperAdmin prop */}
                                    <UserDisplay user={user} isAdmin={isAnyAdmin} isSuperAdmin={isSuperAdmin} />

                                    {/* User Links (Mobile Only) */}
                                    {!isAnyAdmin && <Link to="/my-profile" className="block px-3 py-3 text-white hover:bg-cyan-900/30 rounded-md flex items-center gap-3 border-l-4 border-transparent hover:border-cyan-400" onClick={() => closeAllMenus()}><FaUserCircle className="text-cyan-400 w-5 h-5 shrink-0" /> My Profile</Link>}
                                    {!isAnyAdmin && <Link to="/purchase-history" className="block px-3 py-3 text-white hover:bg-cyan-900/30 rounded-md flex items-center gap-3 border-l-4 border-transparent hover:border-cyan-400" onClick={() => closeAllMenus()}><FaHistory className="text-cyan-400 w-5 h-5 shrink-0" /> Purchase History</Link>}
                                    {!isAnyAdmin && <Link to="/complaints" className="block px-3 py-3 text-white hover:bg-cyan-900/30 rounded-md flex items-center gap-3 border-l-4 border-transparent hover:border-cyan-400" onClick={() => closeAllMenus()}><FaEnvelope className="text-cyan-400 w-5 h-5 shrink-0" /> My Complaints</Link>}
                                    {!isAnyAdmin && <Link to="/suggestions-history" className="block px-3 py-3 text-white hover:bg-cyan-900/30 rounded-md flex items-center gap-3 border-l-4 border-transparent hover:border-cyan-400" onClick={() => closeAllMenus()}><FaClipboardList className="text-cyan-400 w-5 h-5 shrink-0" /> Suggestions History</Link>}
                                    {!isAnyAdmin && <Link to="/subscription/addon" className="block px-3 py-3 text-white hover:bg-cyan-900/30 rounded-md flex items-center gap-3 border-l-4 border-transparent hover:border-cyan-400" onClick={() => closeAllMenus()}><FaPlug className="text-cyan-400 w-5 h-5 shrink-0" /> Add Ons</Link>}

                                    <Link to="/change-password" className="block px-3 py-3 text-white hover:bg-cyan-900/30 rounded-md flex items-center gap-3 border-l-4 border-transparent hover:border-cyan-400" onClick={() => closeAllMenus()}><FaLock className="text-cyan-400 w-5 h-5 shrink-0" /> Change Password</Link>

                                    <button
                                        onClick={() => closeAllMenus(handleLogout)}
                                        className="w-full text-left px-3 py-3 text-red-400 bg-red-800/20 hover:bg-red-800/40 font-bold transition-colors rounded-lg mt-4 flex items-center gap-3"
                                    >
                                        <FaSignOutAlt className="text-lg drop-shadow-[0_0_5px_#FF6347]" /> TERMINATE SESSION
                                    </button>
                                </div>
                            ) : (
                                // Auth Actions (Not logged in)
                                <div className="pt-4 border-t border-gray-700 flex flex-col gap-3">
                                    <Link to="/login" className="block text-center bg-purple-700/60 hover:bg-purple-700/80 py-3 rounded-lg font-bold transition text-xl border border-purple-400/50 text-white hover:text-purple-400" onClick={() => closeAllMenus()}>
                                        <FaSignInAlt className="inline mr-2" /> ACCESS LOGIN
                                    </Link>
                                    <Link to="/register" className="block text-center bg-cyan-700/60 hover:bg-cyan-700/80 py-3 rounded-lg font-bold transition text-xl border border-cyan-400/50 text-white hover:text-cyan-400" onClick={() => closeAllMenus()}>
                                        <FaUserPlus className="inline mr-2" /> NEW USER REGISTRATION
                                    </Link>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </header >
    );
}

export default Header;