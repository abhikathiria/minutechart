// import React, { useState, useEffect, useRef } from "react";
// import { Link, useNavigate } from "react-router-dom";
// import { FaUserCircle, FaSignInAlt, FaChevronDown, FaUserPlus, FaUserShield } from "react-icons/fa";
// import api from "../api";

// function Header({ user, onLogout }) {
//     const [profileOpen, setProfileOpen] = useState(false);
//     const [adminSettingsOpen, setAdminSettingsOpen] = useState(false);
//     const navigate = useNavigate();
//     const profileRef = useRef(null);
//     const adminSettingsRef = useRef(null);
//     const adminSettingsButtonRef = useRef(null);
//     const profileButtonRef = useRef(null);

//     useEffect(() => {
//         const handleClickOutside = (event) => {
//             if (
//                 adminSettingsRef.current &&
//                 !adminSettingsRef.current.contains(event.target) &&
//                 adminSettingsButtonRef.current &&
//                 !adminSettingsButtonRef.current.contains(event.target)
//             ) {
//                 setAdminSettingsOpen(false);
//             }

//             if (
//                 profileRef.current &&
//                 !profileRef.current.contains(event.target) &&
//                 profileButtonRef.current &&
//                 !profileButtonRef.current.contains(event.target)
//             ) {
//                 setProfileOpen(false);
//             }
//         };

//         document.addEventListener("click", handleClickOutside);
//         return () => {
//             document.removeEventListener("click", handleClickOutside);
//         };
//     }, []);

//     const handleLogout = () => {
//         onLogout();
//     };

//     return (
//         <header className="bg-[#0F172A] text-white shadow-md">
//             <div className="w-full px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between h-auto md:h-24 py-4 md:py-0 gap-4 md:gap-0">
//                 <Link to="/" className="flex items-center min-h-[44px]">
//                     <img src="/Group 22.png" alt="NGraph Logo" className="h-12 sm:h-16 w-auto object-contain" />
//                 </Link>

//                 <nav className="flex flex-col md:flex-row items-center gap-4 md:gap-8 text-lg sm:text-xl font-medium">
//                     <Link to="/" className="hover:text-cyan-400 min-h-[44px] flex items-center justify-center md:justify-start">Home</Link>

//                     {user?.roles?.includes("Admin") ? (
//                         <div className="relative">
//                             <div
//                                 ref={adminSettingsButtonRef}
//                                 onClick={(event) => {
//                                     event.preventDefault();
//                                     event.stopPropagation();
//                                     setAdminSettingsOpen(!adminSettingsOpen);
//                                 }}
//                                 className="flex items-center gap-1 hover:text-cyan-400 cursor-pointer min-h-[44px] px-2"
//                                 aria-expanded={adminSettingsOpen}
//                                 aria-haspopup="true"
//                             >
//                                 Admin Settings <FaChevronDown className="text-sm" />
//                             </div>
//                             {adminSettingsOpen && (
//                                 <div
//                                     ref={adminSettingsRef}
//                                     onClick={(e) => e.stopPropagation()}
//                                     className="absolute left-0 mt-2 bg-white text-gray-900 shadow-lg rounded-md w-full sm:w-48 z-50"
//                                 >
//                                     <Link
//                                         to="/admin/users"
//                                         className="block px-4 py-2 hover:bg-gray-100 min-h-[44px] flex items-center"
//                                         onClick={() => setAdminSettingsOpen(false)}
//                                     >
//                                         User Settings
//                                     </Link>
//                                     <Link
//                                         to="/admin/emailsettings"
//                                         className="block px-4 py-2 hover:bg-gray-100 min-h-[44px] flex items-center"
//                                         onClick={() => setAdminSettingsOpen(false)}
//                                     >
//                                         Email Settings
//                                     </Link>
//                                     <Link
//                                         to="/admin/invoicesettings"
//                                         className="block px-4 py-2 hover:bg-gray-100 min-h-[44px] flex items-center"
//                                         onClick={() => setAdminSettingsOpen(false)}
//                                     >
//                                         Invoice Settings
//                                     </Link>
//                                     <Link
//                                         to="/admin/complaintsmanagement"
//                                         className="block px-4 py-2 hover:bg-gray-100 min-h-[44px] flex items-center"
//                                         onClick={() => setAdminSettingsOpen(false)}
//                                     >
//                                         Complaints Management
//                                     </Link>
//                                 </div>
//                             )}
//                         </div>
//                     ) : (
//                         <Link to="/dashboard" className="hover:text-cyan-400 min-h-[44px] flex items-center justify-center md:justify-start">
//                             Dashboard
//                         </Link>
//                     )}
//                     <Link to="/subscription/buy" className="hover:text-cyan-400 min-h-[44px] flex items-center justify-center md:justify-start">
//                         Subscriptions
//                     </Link>
//                 </nav>

//                 {user ? (
//                     <div className="flex items-center gap-4 relative">
//                         {user.roles?.includes("Admin") ? (
//                             <div className="relative">
//                                 <div
//                                     ref={profileButtonRef}
//                                     onClick={(event) => {
//                                         event.preventDefault();
//                                         event.stopPropagation();
//                                         setProfileOpen(!profileOpen);
//                                     }}
//                                     className="flex items-center gap-2 hover:text-cyan-400 cursor-pointer min-h-[44px] px-2"
//                                     aria-expanded={profileOpen}
//                                     aria-haspopup="true"
//                                 >
//                                     <FaUserShield className="text-2xl sm:text-3xl" />
//                                     <FaChevronDown className="text-sm" />
//                                 </div>

//                                 {profileOpen && (
//                                     <div
//                                         ref={profileRef}
//                                         onClick={(e) => e.stopPropagation()}
//                                         className="absolute right-0 mt-2 bg-white text-gray-900 shadow-lg rounded-md w-full sm:w-48 z-50"
//                                     >
//                                         <div className="block w-full text-left px-4 py-2 min-h-[44px] flex flex-col justify-center">
//                                             <span className="block text-sm sm:text-base font-bold">
//                                                 {user.adminName || "Admin Name"}
//                                             </span>
//                                             {user.email && (
//                                                 <span className="block text-xs sm:text-sm text-gray-500">{user.email}</span>
//                                             )}
//                                         </div>
//                                         <button
//                                             onClick={(event) => {
//                                                 event.preventDefault();
//                                                 event.stopPropagation();
//                                                 setProfileOpen(false);
//                                                 handleLogout();
//                                             }}
//                                             className="block w-full text-left px-4 py-2 hover:bg-gray-100 min-h-[44px] flex items-center"
//                                         >
//                                             Logout
//                                         </button>
//                                     </div>
//                                 )}
//                             </div>
//                         ) : (
//                             <div className="relative">
//                                 <div
//                                     ref={profileButtonRef}
//                                     onClick={(event) => {
//                                         event.preventDefault();
//                                         event.stopPropagation();
//                                         setProfileOpen(!profileOpen);
//                                     }}
//                                     className="flex items-center gap-3 hover:text-cyan-400 cursor-pointer min-h-[44px] px-2"
//                                     aria-expanded={profileOpen}
//                                     aria-haspopup="true"
//                                 >
//                                     <div className="flex flex-col items-end text-right leading-tight">
//                                         <span className="font-semibold text-sm sm:text-base">
//                                             {user.companyName || user.customerName || "User"}
//                                         </span>
//                                         <span className="text-xs sm:text-sm text-gray-400 truncate max-w-[140px]">
//                                             {user.email}
//                                         </span>
//                                     </div>
//                                     <FaChevronDown className="text-sm" />
//                                 </div>

//                                 {profileOpen && (
//                                     <div
//                                         ref={profileRef}
//                                         onClick={(e) => e.stopPropagation()}
//                                         className="absolute right-0 mt-2 bg-white text-gray-900 shadow-lg rounded-md w-full sm:w-56 z-50"
//                                     >
//                                         <Link
//                                             to="/my-profile"
//                                             className="block px-4 py-2 hover:bg-gray-100 min-h-[44px] flex items-center"
//                                             onClick={() => setProfileOpen(false)}
//                                         >
//                                             My Profile
//                                         </Link>
//                                         <Link
//                                             to="/purchase-history"
//                                             className="block px-4 py-2 hover:bg-gray-100 min-h-[44px] flex items-center"
//                                             onClick={() => setProfileOpen(false)}
//                                         >
//                                             Purchase History
//                                         </Link>
//                                         <Link
//                                             to="/complaints"
//                                             className="block px-4 py-2 hover:bg-gray-100 min-h-[44px] flex items-center"
//                                             onClick={() => setProfileOpen(false)}
//                                         >
//                                             Complaints
//                                         </Link>
//                                         <Link
//                                             to="/change-password"
//                                             className="block px-4 py-2 hover:bg-gray-100 min-h-[44px] flex items-center"
//                                             onClick={() => setProfileOpen(false)}
//                                         >
//                                             Change Password
//                                         </Link>
//                                         <button
//                                             onClick={(event) => {
//                                                 event.preventDefault();
//                                                 event.stopPropagation();
//                                                 setProfileOpen(false);
//                                                 handleLogout();
//                                             }}
//                                             className="block w-full text-left px-4 py-2 hover:bg-gray-100 min-h-[44px] flex items-center"
//                                         >
//                                             Logout
//                                         </button>
//                                     </div>
//                                 )}
//                             </div>
//                         )}
//                     </div>
//                 ) : (
//                     <div className="flex flex-col sm:flex-row items-center gap-4">
//                         <Link to="/login" className="hover:text-cyan-400 flex items-center gap-2 text-lg sm:text-xl min-h-[44px] px-2">
//                             <FaSignInAlt className="text-lg sm:text-xl" /> Login
//                         </Link>
//                         <Link to="/register" className="hover:text-cyan-400 flex items-center gap-2 text-lg sm:text-xl min-h-[44px] px-2">
//                             <FaUserPlus className="text-lg sm:text-xl" /> Register
//                         </Link>
//                     </div>
//                 )}
//             </div>
//         </header>
//     );
// }

// export default Header;


// import React, { useState, useEffect, useRef, memo } from "react";
// import { Link, useNavigate } from "react-router-dom";
// import {
//     FaUserCircle, FaSignOutAlt, FaSignInAlt, FaChevronDown, FaUserPlus, FaUserShield,
//     FaBars, FaTimes, FaCog, FaChevronUp, FaChartArea, FaHome, FaTags, FaLock, FaHistory, FaEnvelope
// } from "react-icons/fa";
// import api from "../api";
// import { motion, AnimatePresence } from "framer-motion";

// // --- Helper Components & Logic ---

// // Component for displaying user info in dropdowns (Memozied for performance)
// const UserDisplay = memo(({ user, isAdmin }) => {
//     const userName = isAdmin 
//         ? (user?.adminName || "Admin") 
//         : (user?.companyName || user?.customerName || "User");

//     return (
//         <div className="flex flex-col p-4 border-b border-gray-200 text-left bg-white">
//             <div className={`font-extrabold text-lg flex items-center gap-2 ${isAdmin ? 'text-red-600' : 'text-blue-600'}`}>
//                 {isAdmin ? <FaUserShield className="w-6 h-6" /> : <FaUserCircle className="w-6 h-6" />}
//                 {userName}
//             </div>
//             <span className="text-sm text-gray-500 truncate">{user?.email}</span>
//             {isAdmin && <span className="text-xs font-semibold text-red-500 mt-1">ADMIN ACCOUNT</span>}
//         </div>
//     );
// });

// // --- Header Component ---

// function Header({ user, onLogout }) {
//     const [profileOpen, setProfileOpen] = useState(false);
//     const [adminSettingsOpen, setAdminSettingsOpen] = useState(false);
//     const [navOpen, setNavOpen] = useState(false); // Mobile Nav State
//     const navigate = useNavigate();

//     // Refs for click outside logic
//     const profileRef = useRef(null);
//     const adminSettingsRef = useRef(null);
//     const adminSettingsButtonRef = useRef(null);
//     const profileButtonRef = useRef(null);
//     const navRef = useRef(null);
//     const navToggleButtonRef = useRef(null);

//     const isAdmin = user?.roles?.includes("Admin");
//     const userName = isAdmin ? (user?.adminName || "Admin") : (user?.companyName || user?.customerName || "User");

//     // Click outside handler
//     useEffect(() => {
//         const handleClickOutside = (event) => {
//             // Close Admin Settings Dropdown
//             if (adminSettingsRef.current && !adminSettingsRef.current.contains(event.target) && adminSettingsButtonRef.current && !adminSettingsButtonRef.current.contains(event.target)) {
//                 setAdminSettingsOpen(false);
//             }
//             // Close Profile Dropdown
//             if (profileRef.current && !profileRef.current.contains(event.target) && profileButtonRef.current && !profileButtonRef.current.contains(event.target)) {
//                 setProfileOpen(false);
//             }
//             // Close Mobile Navigation
//             if (navOpen && navRef.current && !navRef.current.contains(event.target) && navToggleButtonRef.current && !navToggleButtonRef.current.contains(event.target)) {
//                 setNavOpen(false);
//             }
//         };

//         document.addEventListener("click", handleClickOutside);
//         return () => {
//             document.removeEventListener("click", handleClickOutside);
//         };
//     }, [navOpen]);

//     const handleLogout = () => {
//         onLogout();
//         setProfileOpen(false);
//         setNavOpen(false);
//     };

//     // Closes all menus and navigates if necessary
//     const closeAllMenus = (callback) => {
//         setProfileOpen(false);
//         setAdminSettingsOpen(false);
//         setNavOpen(false);
//         if (callback) callback();
//     };

//     const NavLinkDesktop = ({ to, children }) => (
//         <Link 
//             to={to} 
//             onClick={() => closeAllMenus()}
//             className="text-white hover:text-cyan-400 transition-colors duration-200 px-3 py-2 text-xl font-medium min-h-[44px] flex items-center"
//         >
//             {children}
//         </Link>
//     );

//     return (
//         <header className="bg-[#0F172A] text-white shadow-lg sticky top-0 z-50">
//             <div className="w-full">
//                 {/* Main alignment container: Logo (left) <-> Nav (center) <-> Profile/Auth & Toggle (right) */}
//                 <div className="flex items-center justify-between h-24 px-4 sm:px-6 lg:px-8">

//                     {/* 1. Logo (Extreme Left) */}
//                     <Link to="/" className="flex items-center flex-shrink-0">
//                         <img src="/Group 22.png" alt="NGraph Logo" className="h-10 sm:h-16 w-auto object-contain" />
//                     </Link>

//                     {/* 2. Desktop Navigation (Centered) */}
//                     <nav className="hidden md:flex items-center h-full flex-1 justify-center">
//                         <div className="flex items-center space-x-1 lg:space-x-4 h-full">
//                             <NavLinkDesktop to="/">Home</NavLinkDesktop>

//                             {!isAdmin && <NavLinkDesktop to="/dashboard">Dashboard</NavLinkDesktop>}

//                             <NavLinkDesktop to="/subscription/buy">Subscriptions</NavLinkDesktop>

//                             {/* Admin Settings Dropdown (Desktop) */}
//                             {isAdmin && (
//                                 <div className="relative h-full flex items-center">
//                                     <button
//                                         ref={adminSettingsButtonRef}
//                                         onClick={(e) => {
//                                             e.preventDefault(); e.stopPropagation();
//                                             setAdminSettingsOpen(p => !p);
//                                             setProfileOpen(false);
//                                         }}
//                                         className="flex items-center gap-1 text-white hover:text-cyan-400 transition-colors duration-200 h-full px-3 py-2 text-base font-medium"
//                                         aria-expanded={adminSettingsOpen}
//                                     >
//                                         Admin Tools <FaCog className="text-xl" /> 
//                                         <FaChevronDown className={`text-xs ml-1 transition-transform duration-200 ${adminSettingsOpen ? 'rotate-180' : 'rotate-0'}`} />
//                                     </button>
//                                     <AnimatePresence>
//                                         {adminSettingsOpen && (
//                                             <motion.div
//                                                 ref={adminSettingsRef}
//                                                 initial={{ opacity: 0, y: 10 }}
//                                                 animate={{ opacity: 1, y: 0 }}
//                                                 exit={{ opacity: 0, y: 10 }}
//                                                 transition={{ duration: 0.2 }}
//                                                 onClick={(e) => e.stopPropagation()}
//                                                 className="absolute left-1/2 transform -translate-x-1/2 mt-1 bg-white shadow-2xl rounded-lg w-56 z-50 ring-1 ring-gray-200"
//                                             >
//                                                 <Link to="/admin/users" className="block px-4 py-3 text-gray-700 hover:bg-cyan-50" onClick={closeAllMenus}>User Management</Link>
//                                                 <Link to="/admin/emailsettings" className="block px-4 py-3 text-gray-700 hover:bg-cyan-50" onClick={closeAllMenus}>Email Settings</Link>
//                                                 <Link to="/admin/invoicesettings" className="block px-4 py-3 text-gray-700 hover:bg-cyan-50" onClick={closeAllMenus}>Invoice Settings</Link>
//                                                 <Link to="/admin/complaintsmanagement" className="block px-4 py-3 text-gray-700 hover:bg-cyan-50" onClick={closeAllMenus}>Complaints Management</Link>
//                                             </motion.div>
//                                         )}
//                                     </AnimatePresence>
//                                 </div>
//                             )}
//                         </div>
//                     </nav>

//                     {/* 3. Profile/Auth & Mobile Toggle (Right Side) */}
//                     <div className="flex items-center gap-4">
//                         {user ? (
//                             <>
//                                 {/* Profile Button (Visible on Desktop/Tablet, Hidden on Mobile) */}
//                                 <div className="relative hidden md:block"> 
//                                     <button
//                                         ref={profileButtonRef}
//                                         onClick={(event) => {
//                                             event.preventDefault(); event.stopPropagation();
//                                             setProfileOpen(!profileOpen);
//                                             setAdminSettingsOpen(false);
//                                         }}
//                                         className="flex items-center gap-2 p-2 rounded-full hover:bg-[#2E3C57] transition-colors border border-transparent hover:border-cyan-400"
//                                         aria-expanded={profileOpen}
//                                         aria-haspopup="true"
//                                     >
//                                         {isAdmin ? (
//                                             <FaUserShield className="text-2xl text-red-400" />
//                                         ) : (
//                                             <FaUserCircle className="text-2xl" />
//                                         )}
//                                         <div className="flex flex-col items-end text-right leading-tight hidden lg:block">
//                                             <span className="font-semibold text-lg truncate max-w-[150px]">{userName}</span>
//                                         </div>
//                                         <FaChevronDown className={`text-sm transition-transform duration-200 ${profileOpen ? 'rotate-180' : 'rotate-0'}`} />
//                                     </button>

//                                     <AnimatePresence>
//                                         {profileOpen && (
//                                             <motion.div
//                                                 ref={profileRef}
//                                                 initial={{ opacity: 0, y: 10 }}
//                                                 animate={{ opacity: 1, y: 0 }}
//                                                 exit={{ opacity: 0, y: 10 }}
//                                                 transition={{ duration: 0.2 }}
//                                                 onClick={(e) => e.stopPropagation()}
//                                                 className="absolute right-0 mt-1 bg-white shadow-2xl rounded-lg w-64 z-50 border border-gray-200"
//                                             >
//                                                 <UserDisplay user={user} isAdmin={isAdmin} />

//                                                 {!isAdmin && ( // Standard User Links
//                                                     <>
//                                                         <Link to="/my-profile" className="block px-4 py-3 text-gray-700 hover:bg-gray-100" onClick={() => closeAllMenus()}>My Profile</Link>
//                                                         <Link to="/purchase-history" className="block px-4 py-3 text-gray-700 hover:bg-gray-100" onClick={() => closeAllMenus()}>Purchase History</Link>
//                                                         <Link to="/complaints" className="block px-4 py-3 text-gray-700 hover:bg-gray-100" onClick={() => closeAllMenus()}>Complaints</Link>
//                                                     </>
//                                                 )}
//                                                 <Link to="/change-password" className="block px-4 py-3 text-gray-700 hover:bg-gray-100" onClick={() => closeAllMenus()}>Change Password</Link>

//                                                 <button
//                                                     onClick={() => closeAllMenus(handleLogout)}
//                                                     className="block w-full text-left px-4 py-3 text-red-600 hover:bg-red-50 font-semibold border-t border-gray-200"
//                                                 >
//                                                     Logout
//                                                 </button>
//                                             </motion.div>
//                                         )}
//                                     </AnimatePresence>
//                                 </div>
//                             </>
//                         ) : (
//                             // Auth Links (Desktop)
// <div className="hidden md:flex items-center space-x-3">
//     <Link to="/login" className="hover:text-cyan-400 flex items-center gap-2 text-lg sm:text-xl min-h-[44px] px-2">
//         <FaSignInAlt className="text-lg sm:text-xl" /> Login
//     </Link>
//     <Link to="/register" className="hover:text-cyan-400 flex items-center gap-2 text-lg sm:text-xl min-h-[44px] px-2">
//         <FaUserPlus className="text-lg sm:text-xl" /> Register
//     </Link>
// </div>
//                         )}

//                         {/* Mobile Menu Button (Far Right - Always visible on mobile) */}
//                         <button
//                             ref={navToggleButtonRef}
//                             onClick={() => {
//                                 setNavOpen(p => !p);
//                                 setProfileOpen(false); // Close profile dropdown if open
//                                 setAdminSettingsOpen(false);
//                             }}
//                             className="md:hidden p-2 text-white hover:text-cyan-400 transition-colors"
//                             aria-expanded={navOpen}
//                             aria-controls="main-mobile-menu"
//                         >
//                             {navOpen ? <FaTimes size={24} /> : <FaBars size={24} />}
//                         </button>
//                     </div>
//                 </div>
//             </div>

//             {/* Mobile Overlay Menu (Sliding from Top) */}
//             <AnimatePresence>
//                 {navOpen && (
//                     <motion.div
//                         id="main-mobile-menu"
//                         ref={navRef}
//                         initial={{ opacity: 0, y: -20 }}
//                         animate={{ opacity: 1, y: 0 }}
//                         exit={{ opacity: 0, y: -20 }}
//                         transition={{ duration: 0.2 }}
//                         className="md:hidden bg-[#151D33] shadow-lg border-t-4 border-cyan-500"
//                     >
//                         <div className="px-2 pt-2 pb-4 space-y-1">
//                             {/* Primary Links (Home, Dashboard, Subscriptions) */}
//                             <Link to="/" className="block px-3 py-2 rounded-md text-base font-medium text-white hover:bg-[#2E3C57] transition-colors" onClick={() => closeAllMenus()}>
//                                 <FaHome className="inline mr-2"/> Home
//                             </Link>

//                             {!isAdmin && <Link to="/dashboard" className="block px-3 py-2 rounded-md text-base font-medium text-white hover:bg-[#2E3C57] transition-colors" onClick={() => closeAllMenus()}>
//                                 <FaChartArea className="inline mr-2"/> Dashboard
//                             </Link>}

//                             <Link to="/subscription/buy" className="block px-3 py-2 rounded-md text-base font-medium text-white hover:bg-[#2E3C57] transition-colors" onClick={() => closeAllMenus()}>
//                                 <FaTags className="inline mr-2"/> Subscriptions
//                             </Link>

//                             {user ? (
//                                 <div className="mt-2 pt-2 border-t border-gray-700">
//                                     <UserDisplay user={user} isAdmin={isAdmin} />

//                                     {/* User Links (Mobile Only) */}
//                                     {!isAdmin && <Link to="/my-profile" className="block px-3 py-2 text-white hover:bg-[#2E3C57] rounded-md" onClick={() => closeAllMenus()}>My Profile</Link>}
//                                     {!isAdmin && <Link to="/purchase-history" className="block px-3 py-2 text-white hover:bg-[#2E3C57] rounded-md" onClick={() => closeAllMenus()}>Purchase History</Link>}
//                                     {!isAdmin && <Link to="/complaints" className="block px-3 py-2 text-white hover:bg-[#2E3C57] rounded-md" onClick={() => closeAllMenus()}>My Complaints</Link>}
//                                     <Link to="/change-password" className="block px-3 py-2 text-white hover:bg-[#2E3C57] rounded-md" onClick={() => closeAllMenus()}>Change Password</Link>

//                                     {/* Admin Settings Toggle (Mobile Only) */}
//                                     {isAdmin && (
//                                         <div className="relative mt-1">
//                                             <button
//                                                 onClick={() => setAdminSettingsOpen(p => !p)}
//                                                 className="w-full flex justify-between items-center px-3 py-2 text-base font-medium text-white hover:bg-[#2E3C57] transition-colors rounded-lg"
//                                             >
//                                                 Admin Tools <FaCog />
//                                             </button>
//                                             <AnimatePresence>
//                                                 {adminSettingsOpen && (
//                                                     <motion.div
//                                                         initial={{ opacity: 0, height: 0 }}
//                                                         animate={{ opacity: 1, height: 'auto' }}
//                                                         exit={{ opacity: 0, height: 0 }}
//                                                         transition={{ duration: 0.2 }}
//                                                         className="bg-[#2E3C57] divide-y divide-gray-700 ml-4 rounded-md mt-1"
//                                                     >
//                                                         <Link to="/admin/users" className="block px-4 py-2 text-sm hover:bg-[#43526E]" onClick={() => closeAllMenus()}>User Management</Link>
//                                                         <Link to="/admin/emailsettings" className="block px-4 py-2 text-sm hover:bg-[#43526E]" onClick={() => closeAllMenus()}>Email Settings</Link>
//                                                         <Link to="/admin/invoicesettings" className="block px-4 py-2 text-sm hover:bg-[#43526E]" onClick={() => closeAllMenus()}>Invoice Settings</Link>
//                                                         <Link to="/admin/complaintsmanagement" className="block px-4 py-3 text-sm hover:bg-[#43526E]" onClick={() => closeAllMenus()}>Complaints Management</Link>
//                                                     </motion.div>
//                                                 )}
//                                             </AnimatePresence>
//                                         </div>
//                                     )}

//                                     <button
//                                         onClick={() => closeAllMenus(handleLogout)}
//                                         className="w-full text-left px-3 py-3 text-red-400 hover:bg-red-800 font-bold transition-colors rounded-lg mt-2 flex items-center gap-2"
//                                     >
//                                         <FaSignOutAlt className="text-lg" /> Log Out
//                                     </button>
//                                 </div>
//                             ) : (
//                                 // Auth Actions (Not logged in)
//                                 <div className="pt-2 border-t border-gray-700 flex flex-col gap-2">
//                                     <Link to="/login" className="block text-center bg-blue-600 hover:bg-blue-700 py-2 rounded-lg font-semibold transition" onClick={() => closeAllMenus()}>Login</Link>
//                                     <Link to="/register" className="block text-center bg-cyan-500 hover:bg-cyan-600 py-2 rounded-lg font-semibold transition" onClick={() => closeAllMenus()}>Register</Link>
//                                 </div>
//                             )}
//                         </div>
//                     </motion.div>
//                 )}
//             </AnimatePresence>
//         </header>
//     );
// }

// export default Header;


import React, { useState, useEffect, useRef, memo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
    FaUserCircle, FaSignOutAlt, FaSignInAlt, FaChevronDown, FaUserPlus, FaUserShield,
    FaBars, FaTimes, FaCog, FaChevronUp, FaChartArea, FaHome, FaTags, FaLock, FaHistory, FaEnvelope,
    FaUsers, FaAt, FaFileInvoice, FaClipboardList, FaTachometerAlt
} from "react-icons/fa";
import api from "../api";
import { motion, AnimatePresence } from "framer-motion";

const UserDisplay = memo(({ user, isAdmin }) => {
    const userName = isAdmin
        ? (user?.adminName || "Admin")
        : (user?.companyName || user?.customerName || "User");

    return (
        // Redesigned User Display Card
        <div className="flex flex-col px-4 py-3 border-b border-gray-100 text-left bg-gray-50">
            <div className={`font-extrabold text-lg flex items-center gap-2 ${isAdmin ? 'text-red-700' : 'text-blue-700'}`}>
                {isAdmin ? <FaUserShield className="w-5 h-5" /> : <FaUserCircle className="w-5 h-5" />}
                {userName}
            </div>
            <span className="text-sm text-gray-500 truncate">{user?.email}</span>
            {isAdmin && <span className="text-xs font-semibold text-red-500 mt-1">ADMIN ACCOUNT</span>}
        </div>
    );
});

// Helper component for styled dropdown links
const DropdownItem = ({ to, icon, children, onClick }) => (
    <Link
        to={to}
        onClick={onClick}
        className="block px-4 py-3 text-gray-700 hover:bg-cyan-50 hover:text-cyan-700 transition-colors duration-150 text-base font-medium flex items-center gap-3 min-h-[44px]"
    >
        {icon} {children}
    </Link>
);

const AdminDropdownItem = ({ to, icon, children, onClick }) => (
    <Link
        to={to}
        onClick={onClick}
        className="block px-4 py-3 text-gray-700 hover:bg-red-50 hover:text-red-700 transition-colors duration-150 text-lg font-medium flex items-center gap-3 min-h-[44px]"
    >
        {icon} {children}
    </Link>
);


// --- Header Component ---

function Header({ user, onLogout }) {
    const [profileOpen, setProfileOpen] = useState(false);
    const [adminSettingsOpen, setAdminSettingsOpen] = useState(false);
    const [navOpen, setNavOpen] = useState(false); // Mobile Nav State
    const navigate = useNavigate();

    // Refs for click outside logic
    const profileRef = useRef(null);
    const adminSettingsRef = useRef(null);
    const adminSettingsButtonRef = useRef(null);
    const profileButtonRef = useRef(null);
    const navRef = useRef(null);
    const navToggleButtonRef = useRef(null);

    const isAdmin = user?.roles?.includes("Admin");
    const userName = isAdmin ? (user?.adminName || "Admin") : (user?.companyName || user?.customerName || "User");

    // Click outside handler (UNMODIFIED)
    useEffect(() => {
        const handleClickOutside = (event) => {
            // Close Admin Settings Dropdown
            if (adminSettingsRef.current && !adminSettingsRef.current.contains(event.target) && adminSettingsButtonRef.current && !adminSettingsButtonRef.current.contains(event.target)) {
                setAdminSettingsOpen(false);
            }
            // Close Profile Dropdown
            if (profileRef.current && !profileRef.current.contains(event.target) && profileButtonRef.current && !profileButtonRef.current.contains(event.target)) {
                setProfileOpen(false);
            }
            // Close Mobile Navigation
            if (navOpen && navRef.current && !navRef.current.contains(event.target) && navToggleButtonRef.current && !navToggleButtonRef.current.contains(event.target)) {
                setNavOpen(false);
            }
        };

        document.addEventListener("click", handleClickOutside);
        return () => {
            document.removeEventListener("click", handleClickOutside);
        };
    }, [navOpen]);

    const handleLogout = () => {
        onLogout();
        setProfileOpen(false);
        setNavOpen(false);
    };

    // Closes all menus and navigates if necessary
    const closeAllMenus = (callback) => {
        setProfileOpen(false);
        setAdminSettingsOpen(false);
        setNavOpen(false);
        if (callback) callback();
    };

    const NavLinkDesktop = ({ to, children }) => (
        <Link
            to={to}
            onClick={() => closeAllMenus()}
            className="text-white hover:text-cyan-400 transition-colors duration-200 px-3 py-2 text-xl font-medium min-h-[44px] flex items-center"
        >
            {children}
        </Link>
    );


    // --- Admin Dropdown Items (Desktop - MODIFIED) ---
    const adminDesktopDropdown = (
        <motion.div
            ref={adminSettingsRef}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="absolute top-20 right-0 bg-white shadow-2xl rounded-lg w-64 z-60 border border-gray-200 origin-top"
        >
            <AdminDropdownItem to="/admin/users" icon={<FaUsers className="font extrabold text-red-700 w-4 h-4 shrink-0" />} onClick={() => closeAllMenus()}>User Management</AdminDropdownItem>
            <AdminDropdownItem to="/admin/emailsettings" icon={<FaAt className="font extrabold text-red-700 w-4 h-4 shrink-0" />} onClick={() => closeAllMenus()}>Email Settings</AdminDropdownItem>
            <AdminDropdownItem to="/admin/invoicesettings" icon={<FaFileInvoice className="font extrabold text-red-700 w-4 h-4 shrink-0" />} onClick={() => closeAllMenus()}>Invoice Settings</AdminDropdownItem>
            <AdminDropdownItem to="/admin/complaintsmanagement" icon={<FaClipboardList className="font extrabold text-red-700 w-4 h-4 shrink-0" />} onClick={() => closeAllMenus()}>Complaints Management</AdminDropdownItem>
            <AdminDropdownItem to="/admin/admindashboard" icon={<FaTachometerAlt className="font extrabold text-red-700 w-4 h-4 shrink-0" />} onClick={() => closeAllMenus()}>Admin Dashboard</AdminDropdownItem>
            <AdminDropdownItem to="/admin/activitylogs" icon={<FaHistory className="font extrabold text-red-700 w-4 h-4 shrink-0" />} onClick={() => closeAllMenus()}>Activity Log</AdminDropdownItem>

        </motion.div>
    );

    // --- User Profile Dropdown Items (Desktop - UNMODIFIED) ---
    const userDesktopDropdown = (
        <motion.div
            ref={profileRef}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="absolute top-12 right-0 bg-white shadow-2xl w-64 z-60 border border-gray-200 origin-top"
        >
            <UserDisplay user={user} isAdmin={isAdmin} />


            {!isAdmin && ( // Standard User Links
                <>
                    {/* Change this: onClick={closeAllMenus} */}
                    <DropdownItem to="/my-profile" icon={<FaUserCircle />} onClick={() => closeAllMenus()}>My Profile</DropdownItem>
                    <DropdownItem to="/purchase-history" icon={<FaHistory />} onClick={() => closeAllMenus()}>Purchase History</DropdownItem>
                    <DropdownItem to="/complaints" icon={<FaEnvelope />} onClick={() => closeAllMenus()}>Complaints</DropdownItem>
                </>
            )}


            <DropdownItem to="/change-password" icon={<FaLock />} onClick={() => closeAllMenus()}>Change Password</DropdownItem>
            <button
                onClick={() => closeAllMenus(handleLogout)}
                className="block w-full text-left px-4 py-3 text-red-600 hover:bg-red-50 font-semibold border-t border-gray-200 flex items-center gap-3"
            >
                <FaSignOutAlt className="text-lg" /> Logout
            </button>
        </motion.div>
    );

    return (
        <header className="bg-[#0F172A] text-white shadow-lg sticky top-0 z-50">
            <div className="w-full">
                {/* Main alignment container: Logo (left) <-> Nav (center) <-> Profile/Auth & Toggle (right) */}
                <div className="flex items-center justify-between h-24 px-4 sm:px-6 lg:px-8">

                    {/* 1. Logo (Extreme Left) */}
                    <Link to="/" className="flex items-center flex-shrink-0">
                        <img src="/Group 22.png" alt="NGraph Logo" className="h-10 sm:h-16 w-auto object-contain" />
                    </Link>

                    {/* 2. Desktop Navigation (Centered) */}
                    <nav className="hidden md:flex items-center h-full flex-1 justify-center">
                        <div className="flex items-center space-x-1 lg:space-x-4 h-full">
                            <NavLinkDesktop to="/">Home</NavLinkDesktop>

                            {/* **DESKTOP ORDER FIX:** Admin Tools placed between Home and Subscriptions */}
                            {isAdmin && (
                                <div className="relative h-full flex items-center">
                                    <button
                                        ref={adminSettingsButtonRef}
                                        onClick={(e) => {
                                            e.preventDefault(); e.stopPropagation();
                                            setAdminSettingsOpen(p => !p);
                                            setProfileOpen(false);
                                        }}
                                        className="flex items-center gap-1 p-2 text-white rounded-full hover:bg-[#2E3C57] transition-colors border border-transparent hover:border-cyan-400 text-xl font-medium"
                                        aria-expanded={adminSettingsOpen}
                                    >
                                        Admin Tools
                                        <FaChevronDown className={`text-sm transition-transform duration-200 ${adminSettingsOpen ? 'rotate-180' : 'rotate-0'}`} />
                                    </button>
                                    <AnimatePresence>
                                        {adminSettingsOpen && adminDesktopDropdown}
                                    </AnimatePresence>
                                </div>
                            )}

                            {!isAdmin && <NavLinkDesktop to="/dashboard">Dashboard</NavLinkDesktop>}

                            <NavLinkDesktop to="/subscription/buy">Subscriptions</NavLinkDesktop>

                        </div>
                    </nav>

                    {/* 3. Profile/Auth & Mobile Toggle (Right Side - UNMODIFIED) */}
                    {/* ... (Desktop Profile/Auth and Mobile Toggle) ... */}
                    <div className="flex items-center gap-4">
                        {user ? (
                            <>
                                {/* Profile Button (Visible on Desktop/Tablet, Hidden on Mobile) */}
                                <div className="relative hidden md:block">
                                    <button
                                        ref={profileButtonRef}
                                        onClick={(event) => {
                                            event.preventDefault(); event.stopPropagation();
                                            setProfileOpen(!profileOpen);
                                            setAdminSettingsOpen(false);
                                        }}
                                        className="flex items-center gap-2 p-2 rounded-full hover:bg-[#2E3C57] transition-colors border border-transparent hover:border-cyan-400"
                                        aria-expanded={profileOpen}
                                        aria-haspopup="true"
                                    >
                                        {isAdmin ? (
                                            <FaUserShield className="text-2xl text-red-400" />
                                        ) : (
                                            <FaUserCircle className="text-2xl" />
                                        )}
                                        {/* Added User Name/Email for non-admin profile desktop display */}
                                        <div className="flex flex-col items-end text-right leading-tight hidden lg:block">
                                            <span className="font-semibold text-lg truncate max-w-[150px]">{userName}</span>
                                        </div>
                                        <FaChevronDown className={`text-sm transition-transform duration-200 ${profileOpen ? 'rotate-180' : 'rotate-0'}`} />
                                    </button>

                                    <AnimatePresence>
                                        {profileOpen && userDesktopDropdown}
                                    </AnimatePresence>
                                </div>
                            </>
                        ) : (
                            // Auth Links (Desktop)
                            <div className="hidden md:flex items-center space-x-3">
                                <Link to="/login" className="hover:text-cyan-400 flex items-center gap-2 text-lg sm:text-xl min-h-[44px] px-2">
                                    <FaSignInAlt className="text-lg sm:text-xl" /> Login
                                </Link>
                                <Link to="/register" className="hover:text-cyan-400 flex items-center gap-2 text-lg sm:text-xl min-h-[44px] px-2">
                                    <FaUserPlus className="text-lg sm:text-xl" /> Register
                                </Link>
                            </div>

                        )}

                        {/* Mobile Menu Button (Far Right - Always visible on mobile - UNMODIFIED) */}
                        <button
                            ref={navToggleButtonRef}
                            onClick={() => {
                                setNavOpen(p => !p);
                                setProfileOpen(false); // Close profile dropdown if open
                                setAdminSettingsOpen(false);
                            }}
                            className="md:hidden p-2 text-white hover:text-cyan-400 transition-colors"
                            aria-expanded={navOpen}
                            aria-controls="main-mobile-menu"
                        >
                            {navOpen ? <FaTimes size={24} /> : <FaBars size={24} />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Overlay Menu (Sliding from Top) */}
            <AnimatePresence>
                {navOpen && (
                    <motion.div
                        id="main-mobile-menu"
                        ref={navRef}
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.2 }}
                        className="md:hidden bg-[#151D33] shadow-lg border-t-4 border-cyan-500 z-40"
                    >
                        <div className="px-2 pt-2 pb-4 space-y-1">
                            {/* Primary Links */}
                            <Link to="/" className="block px-3 py-2 rounded-md text-lg font-medium text-white hover:bg-[#2E3C57] transition-colors" onClick={() => closeAllMenus()}>
                                <FaHome className="inline mr-2" /> Home
                            </Link>

                            {isAdmin && <Link to="/admin/users" className="block px-3 py-2 rounded-md text-lg font-medium text-white hover:bg-[#2E3C57] transition-colors" onClick={() => closeAllMenus()}>
                                <FaUsers className="inline mr-2" /> User Management
                            </Link>}
                            {isAdmin && <Link to="/admin/emailsettings" className="block px-3 py-2 rounded-md text-lg font-medium text-white hover:bg-[#2E3C57] transition-colors" onClick={() => closeAllMenus()}>
                                <FaAt className="inline mr-2" /> Email Settings
                            </Link>}
                            {isAdmin && <Link to="/admin/invoicesettings" className="block px-3 py-2 rounded-md text-lg font-medium text-white hover:bg-[#2E3C57] transition-colors" onClick={() => closeAllMenus()}>
                                <FaFileInvoice className="inline mr-2" /> Invoice Settings
                            </Link>}
                            {isAdmin && <Link to="/admin/complaintsmanagement" className="block px-3 py-2 rounded-md text-lg font-medium text-white hover:bg-[#2E3C57] transition-colors" onClick={() => closeAllMenus()}>
                                <FaClipboardList className="inline mr-2" /> Complaints Management
                            </Link>}
                            {isAdmin && <Link to="/admin/admindashboard" className="block px-3 py-2 rounded-md text-lg font-medium text-white hover:bg-[#2E3C57] transition-colors" onClick={() => closeAllMenus()}>
                                <FaTachometerAlt className="inline mr-2" /> Admin Dashboard
                            </Link>}
                            {isAdmin && <Link to="/admin/activitylogs" className="block px-3 py-2 rounded-md text-lg font-medium text-white hover:bg-[#2E3C57] transition-colors" onClick={() => closeAllMenus()}>
                                <FaHistory className="inline mr-2" /> Activity Log
                            </Link>}

                            {!isAdmin && <Link to="/dashboard" className="block px-3 py-2 rounded-md text-lg font-medium text-white hover:bg-[#2E3C57] transition-colors" onClick={() => closeAllMenus()}>
                                <FaChartArea className="inline mr-2" /> Dashboard
                            </Link>}

                            <Link to="/subscription/buy" className="block px-3 py-2 rounded-md text-lg font-medium text-white hover:bg-[#2E3C57] transition-colors" onClick={() => closeAllMenus()}>
                                <FaTags className="inline mr-2" /> Subscriptions
                            </Link>

                            {/* User Profile Links & Logout - MOVED TO BOTTOM AND ADDED ICONS */}
                            {user ? (
                                <div className="mt-4 pt-4 border-t border-gray-700">
                                    <UserDisplay user={user} isAdmin={isAdmin} />

                                    {/* User Links (Mobile Only) */}
                                    {!isAdmin && <Link to="/my-profile" className="block px-3 py-2 text-white hover:bg-[#2E3C57] rounded-md flex items-center gap-2" onClick={() => closeAllMenus()}><FaUserCircle className="text-cyan-400 w-4" /> My Profile</Link>}
                                    {!isAdmin && <Link to="/purchase-history" className="block px-3 py-2 text-white hover:bg-[#2E3C57] rounded-md flex items-center gap-2" onClick={() => closeAllMenus()}><FaHistory className="text-cyan-400 w-4" /> Purchase History</Link>}
                                    {!isAdmin && <Link to="/complaints" className="block px-3 py-2 text-white hover:bg-[#2E3C57] rounded-md flex items-center gap-2" onClick={() => closeAllMenus()}><FaEnvelope className="text-cyan-400 w-4" /> My Complaints</Link>}
                                    <Link to="/change-password" className="block px-3 py-2 text-white hover:bg-[#2E3C57] rounded-md flex items-center gap-2" onClick={() => closeAllMenus()}><FaLock className="text-cyan-400 w-4" /> Change Password</Link>

                                    <button
                                        onClick={() => closeAllMenus(handleLogout)}
                                        className="w-full text-left px-3 py-3 text-red-400 hover:bg-red-800 font-bold transition-colors rounded-lg mt-2 flex items-center gap-2"
                                    >
                                        <FaSignOutAlt className="text-lg" /> Log Out
                                    </button>
                                </div>
                            ) : (
                                // Auth Actions (Not logged in)
                                <div className="pt-2 border-t border-gray-700 flex flex-col gap-2">
                                    <Link to="/login" className="block text-center bg-blue-600 hover:bg-blue-700 py-2 rounded-lg font-semibold transition text-lg" onClick={() => closeAllMenus()}>Login</Link>
                                    <Link to="/register" className="block text-center bg-cyan-500 hover:bg-cyan-600 py-2 rounded-lg font-semibold transition text-lg" onClick={() => closeAllMenus()}>Register</Link>
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