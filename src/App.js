import React, { useState, useEffect, useRef } from "react";
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from "react-router-dom";
import { FaUserCircle, FaSignInAlt, FaChevronDown, FaTwitter, FaLinkedin, FaUserPlus, FaUserShield } from "react-icons/fa";
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
import PlanPage from "./pages/PlanPage";
import RenewPage from "./pages/RenewPage";
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
          <img src="/Nchartlogo.png" alt="Nchart Logo" className="h-20 w-64 mx-auto md:mx-0 mb-4" />
          <p className="text-sm leading-relaxed">
            Nchart is a premium dashboard solution offering real-time insights with elegant visualizations.
            Designed for clarity, speed, and scalability.
          </p>
          <p className="mt-4 text-xs text-gray-500">
            &copy; {new Date().getFullYear()} Nchart. All rights reserved.
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
              <Link to="/contact" className="hover:text-cyan-400">Contact Us</Link>
            </>
          ) : (
            <>
              <Link to="/" className="hover:text-cyan-400">Home</Link>
              <Link to="/product" className="hover:text-cyan-400">Product Dashboard</Link>
              <Link to="/hr" className="hover:text-cyan-400">HR Dashboard</Link>
              <Link to="/contact" className="hover:text-cyan-400">Contact Us</Link>
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
            <a href="https://twitter.com/nchart" target="_blank" rel="noopener noreferrer" className="hover:text-cyan-400" aria-label="Twitter">
              <FaTwitter className="h-6 w-6" />
            </a>
            <a href="https://linkedin.com/company/nchart" target="_blank" rel="noopener noreferrer" className="hover:text-cyan-400" aria-label="LinkedIn">
              <FaLinkedin className="h-6 w-6" />
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
            <img src="/Nchartlogo.png" alt="Project Logo" className="h-12 w-auto object-contain" />
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
              <div className="relative">
                <button
                  ref={dashboardButtonRef}
                  onClick={() => setDashboardOpen(!dashboardOpen)}
                  className="flex items-center gap-1 hover:text-cyan-400"
                >
                  Dashboard <FaChevronDown className="text-sm" />
                </button>
                {dashboardOpen && (
                  <div
                    ref={dropdownRef}
                    className="absolute left-0 mt-2 bg-white text-gray-900 shadow-lg rounded-md w-48 z-50"
                  >
                    <Link
                      to="/dashboard"
                      className="block px-4 py-2 hover:bg-gray-100"
                      onClick={() => setDashboardOpen(false)}
                    >
                      Test Dashboard
                    </Link>
                    <Link
                      to="/analysis"
                      className="block px-4 py-2 hover:bg-gray-100"
                      onClick={() => setDashboardOpen(false)}
                    >
                      Analysis Dashboard
                    </Link>
                    <Link
                      to="/product"
                      className="block px-4 py-2 hover:bg-gray-100"
                      onClick={() => setDashboardOpen(false)}
                    >
                      Product Dashboard
                    </Link>
                    <Link
                      to="/hr"
                      className="block px-4 py-2 hover:bg-gray-100"
                      onClick={() => setDashboardOpen(false)}
                    >
                      HR Dashboard
                    </Link>
                  </div>
                )}
              </div>
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
                    onClick={() => setProfileOpen(!profileOpen)}
                    className="flex items-center gap-2 hover:text-cyan-400"
                  >
                    <FaUserCircle className="text-3xl" />
                    <FaChevronDown className="text-sm" />
                  </button>
                  {profileOpen && (
                    <div className="absolute right-0 mt-2 bg-white text-gray-900 shadow-lg rounded-md w-48 z-50">
                      <Link
                        to={`/my-profile`}
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
        <Route path="/" element={<HomeContent />} />
        <Route path="/login" element={<Login onLogin={setUser} />} />
        <Route path="/register" element={<Register onRegister={setUser} />} />
        <Route path="/profile/:id" element={<Profile />} />
        <Route path="/my-profile" element={<MyProfile />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/product" element={<ProductDashboard />} />
        <Route path="/analysis" element={<AnalysisDashboard />} />
        <Route path="/hr" element={<HRDashboard />} />
        <Route path="/admin/users" element={<UserList />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/change-password" element={<ChangePassword />} />
        <Route path="/user/:id/modules" element={<UserModules />} />
        <Route path="/plan" element={<PlanPage />} />
        <Route path="/subscription/buy" element={<RenewPage />} />
        <Route path="/purchase-history" element={<PurchaseHistory />} />
        <Route path="/invoice-printable/:invoiceId" element={<InvoicePrintable noLayout />} />
        <Route path="/admin/emailsettings" element={<EmailSettings />} />
        <Route path="/admin/invoicesettings" element={<InvoiceSettingsPage />} />
        <Route path="/information" element={<Information />} />


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
