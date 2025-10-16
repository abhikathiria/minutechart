import React, { useState, useEffect, useRef } from "react";
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useNavigate } from "react-router-dom";
import { FaUserCircle, FaSignInAlt, FaChevronDown, FaTwitter, FaLinkedin, FaUserPlus, FaUserShield, FaWhatsapp, FaGlobe } from "react-icons/fa";
import ProductDashboard from "./pages/ProductDashboard";
import HRDashboard from "./pages/HRDashboard";
import AnalysisDashboard from "./pages/AnalysisDashboard";
import HomeContent from "./pages/HomeContent";
import ScrollToTop from "./ScrollToTop";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Profile from "./pages/Profile";
import MyProfile from "./pages/MyProfile";
import UserList from "./pages/UserList";
import Dashboard from "./pages/Dashboard";
import api from "./api";
import ChangePassword from "./pages/ChangePassword";
import ResetPassword from "./pages/ResetPassword";
import UserModules from "./pages/UserModules";
import TransferModules from "./pages/TransferModules";
import PlanPage from "./pages/PlanPage";
import SubscriptionPage from "./pages/SubscriptionPage";
import PurchaseHistory from "./pages/PurchaseHistory";
import InvoicePrintable from "./pages/InvoicePrintable";
import EmailSettings from "./pages/EmailSettings";
import InvoiceSettingsPage from "./pages/InvoiceSettingsPage";
import Information from "./pages/Information";
import { Toaster } from "react-hot-toast";

function Footer() {
  const [user, setUser] = useState(null);
  useEffect(() => {
    api.get("/account/me")
      .then((response) => setUser(response.data))
      .catch(() => setUser(null));
  }, []);

  return (
    <footer className="bg-[#0F172A] text-gray-300 py-10 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between gap-10">
        <div className="flex flex-col max-w-sm text-center md:text-left">
          <img src="/Ngraphlogo.png" alt="Ngraph Logo" className="h-20 w-64 mx-auto md:mx-0 mb-4" />
          <p className="text-sm leading-relaxed">
            Ngraph is a premium dashboard solution offering real-time insights with elegant visualizations.
            Designed for clarity, speed, and scalability.
          </p>
          <p className="mt-4 text-xs text-gray-500">
            &copy; {new Date().getFullYear()} Ngraph. All rights reserved.
          </p>
        </div>

        <div className="flex flex-col space-y-3 text-center md:text-left">
          <h4 className="text-white font-semibold mb-2">Quick Links</h4>
          {user?.roles?.includes("Admin") ? (
            <>
              <Link to="/" className="hover:text-cyan-400">Home</Link>
              <Link to="/admin/users" className="hover:text-cyan-400">User Settings</Link>
              <Link to="/admin/emailsettings" className="hover:text-cyan-400">Email Settings</Link>
              <Link to="/admin/invoicesettings" className="hover:text-cyan-400">Invoice Settings</Link>
              <Link to="/information" className="hover:text-cyan-400">Information</Link>
              <Link to="/subscription/buy" className="hover:text-cyan-400">Plans</Link>
            </>
          ) : (
            <>
              <Link to="/" className="hover:text-cyan-400">Home</Link>
              <Link to="/dashboard" className="hover:text-cyan-400">Dashboard</Link>
              <Link to="/information" className="hover:text-cyan-400">Information</Link>
              <Link to="/subscription/buy" className="hover:text-cyan-400">Plans</Link>
            </>
          )}
        </div>

        <div className="flex flex-col space-y-3 text-center md:text-left max-w-xs mx-auto md:mx-0">
          <h4 className="text-white font-semibold mb-2">Contact & Social</h4>
          <p>
            Email: <a href="mailto:info@newtechinfosol.in" className="hover:text-cyan-400">info@newtechinfosol.in</a>
          </p>
          <p>
            Phone: <a href="tel:+1234567890" className="hover:text-cyan-400">+91-261-2979903</a>
          </p>
          <div className="flex justify-center md:justify-start space-x-5 mt-4 text-gray-400">
            <a href="http://www.newtechinfosol.in/" target="_blank" rel="noopener noreferrer" className="hover:text-cyan-400" aria-label="Website">
              <FaGlobe className="h-6 w-6" />
            </a>
            <a href="https://www.linkedin.com/company/new-tech-infosol---india/about/" target="_blank" rel="noopener noreferrer" className="hover:text-cyan-400" aria-label="LinkedIn">
              <FaLinkedin className="h-6 w-6" />
            </a>
            <a href="https://wa.me/919978278879?text=Hi%20I%20am%20interested%20in%20Ngraph" target="_blank" rel="noopener noreferrer" className="hover:text-cyan-400" aria-label="WhatsApp">
              <FaWhatsapp className="h-6 w-6" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

function AppContent() {
  const [dashboardOpen, setDashboardOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [adminSettingsOpen, setAdminSettingsOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [companies, setCompanies] = useState([]);
  const navigate = useNavigate();
  const dropdownRef = useRef(null);
  const profileRef = useRef(null);
  const adminSettingsRef = useRef(null);
  const adminSettingsButtonRef = useRef(null);
  const dashboardButtonRef = useRef(null);

  const PublicRoute = ({ children }) => children;

  const PrivateRoute = ({ children }) => {
    if (!user) return <Navigate to="/login" replace />;
    return children;
  };

  const AdminRoute = ({ children }) => {
    if (!user) return <Navigate to="/login" replace />;
    if (!user.roles?.includes("Admin")) return <Navigate to="/" replace />;
    return children;
  };

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
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        dashboardButtonRef.current &&
        !dashboardButtonRef.current.contains(event.target)
      ) {
        setDashboardOpen(false);
      }

      if (
        profileRef.current &&
        !profileRef.current.contains(event.target)
      ) {
        setProfileOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    api.get("/account/me")
      .then((response) => setUser(response.data))
      .catch(() => setUser(null));
  }, []);

  useEffect(() => {
    if (user?.roles?.includes("Admin")) {
      api.get("/admin/users")
        .then((response) => setCompanies(response.data))
        .catch(() => setCompanies([]));
    }
  }, [user]);

  const handleLogout = () => {
    api.post("/account/logout", {})
      .then(() => {
        setUser(null);
        navigate("/");
      });
  };

  return (
    <>
      <ScrollToTop />
      <header className="bg-[#0F172A] text-white shadow-md">
        <div className="w-full px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between h-auto md:h-20 py-4 md:py-0 gap-4 md:gap-0">
          <Link to="/" className="flex items-center">
            <img src="/Ngraphlogo.png" alt="Project Logo" className="h-12 w-auto object-contain" />
          </Link>

          <nav className="flex flex-col md:flex-row items-center gap-4 md:gap-8 text-lg font-medium">
            <Link to="/" className="hover:text-cyan-400">Home</Link>

            {user?.roles?.includes("Admin") ? (
              <div className="relative">
                <button
                  ref={adminSettingsButtonRef}
                  onClick={() => setAdminSettingsOpen(!adminSettingsOpen)}
                  className="flex items-center gap-1 hover:text-cyan-400"
                >
                  Admin Settings <FaChevronDown className="text-sm" />
                </button>
                {adminSettingsOpen && (
                  <div
                    ref={adminSettingsRef}
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
                  </div>
                )}
              </div>
            ) : (
              <Link to="/dashboard" className="hover:text-cyan-400">
                Dashboard
              </Link>
            )}
            <Link
              to="/subscription/buy"
              className="hover:text-cyan-400"
            >
              Subscriptions
            </Link>
          </nav>

          {user ? (
            <div className="flex items-center gap-4 relative">
              {user.roles?.includes("Admin") ? (
                <div className="relative" ref={profileRef}>
                  <button
                    type='button'
                    onClick={() => setProfileOpen(!profileOpen)}
                    className="flex items-center gap-2 hover:text-cyan-400"
                  >
                    <FaUserShield className="text-3xl" />
                    <FaChevronDown className="text-sm" />
                  </button>

                  {profileOpen && (
                    <div className="absolute right-0 mt-2 bg-white text-gray-900 shadow-lg rounded-md w-48 z-50">
                      <div className="block w-full text-left px-4 py-2">
                        <span className="block text-base font-bold">
                          {user.adminName || "Admin Name"}
                        </span>
                        {user.email && (
                          <span className="block text-sm text-gray-500">{user.email}</span>
                        )}
                      </div>
                      <button
                        type='button'
                        onClick={() => {
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
                <div className="relative" ref={profileRef}>
                  <button
                    type='button'
                    onClick={() => setProfileOpen(!profileOpen)}
                    className="flex items-center gap-3 hover:text-cyan-400"
                  >
                    {/* Identity Text */}
                    <div className="flex flex-col items-end text-right leading-tight">
                      <span className="font-semibold text-sm">
                        {user.companyName || user.customerName || "User"}
                      </span>
                      <span className="text-xs text-gray-400 truncate max-w-[140px]">
                        {user.email}
                      </span>
                    </div>

                    {/* Optional icon (keeps UI neat) */}
                    <FaChevronDown className="text-sm" />
                  </button>

                  {profileOpen && (
                    <div className="absolute right-0 mt-2 bg-white text-gray-900 shadow-lg rounded-md w-56 z-50">
                      {/* <div className="block w-full text-left px-4 py-2 border-b">
                        <span className="block text-base font-bold">
                          {user.companyName || user.customerName || "User"}
                        </span>
                        {user.email && (
                          <span className="block text-sm text-gray-500 truncate">
                            {user.email}
                          </span>
                        )}
                      </div> */}

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
                        to="/change-password"
                        className="block px-4 py-2 hover:bg-gray-100"
                        onClick={() => setProfileOpen(false)}
                      >
                        Change Password
                      </Link>
                      <button
                        onClick={() => {
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

      <Routes>
        {/* Public routes */}
        <Route path="/" element={<PublicRoute><HomeContent /></PublicRoute>} />
        <Route path="/login" element={<PublicRoute><Login onLogin={setUser} /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><Register onRegister={setUser} /></PublicRoute>} />
        <Route path="/dashboard" element={<PublicRoute><Dashboard /></PublicRoute>} />
        <Route path="/plan" element={<PublicRoute><PlanPage /></PublicRoute>} />
        <Route path="/subscription/buy" element={<PublicRoute><SubscriptionPage /></PublicRoute>} />
        <Route path="/information" element={<PublicRoute><Information /></PublicRoute>} />

        {/* Admin routes */}
        <Route path="/profile/:id" element={<AdminRoute><Profile /></AdminRoute>} />
        <Route path="/admin/users" element={<AdminRoute><UserList /></AdminRoute>} />
        <Route path="/user/:id/modules" element={<AdminRoute><UserModules /></AdminRoute>} />
        <Route path="/admin/transfer-modules" element={<AdminRoute><TransferModules /></AdminRoute>} />
        <Route path="/admin/emailsettings" element={<AdminRoute><EmailSettings /></AdminRoute>} />
        <Route path="/admin/invoicesettings" element={<AdminRoute><InvoiceSettingsPage /></AdminRoute>} />

        {/* Private routes (logged-in users) */}
        <Route path="/my-profile" element={<PrivateRoute><MyProfile /></PrivateRoute>} />
        <Route path="/purchase-history" element={<PrivateRoute><PurchaseHistory /></PrivateRoute>} />
        <Route path="/reset-password" element={<PrivateRoute><ResetPassword /></PrivateRoute>} />
        <Route path="/change-password" element={<PrivateRoute><ChangePassword /></PrivateRoute>} />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <Footer />
    </>
  );
}


function App() {
  return (
    <Router>
      <AppContent />
      <Toaster position="top-right" />
    </Router>
  );
}

export default App;