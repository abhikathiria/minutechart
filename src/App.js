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
import Header from "./components/Header";
import Complaints from "./pages/Complaints";
import ComplaintsManagement from "./pages/ComplaintsManagement";
import { Toaster } from "react-hot-toast";

function Footer() {
  const [user, setUser] = useState(null);
  useEffect(() => {
    api.get("/account/me")
      .then((response) => setUser(response.data))
      .catch(() => setUser(null));
  }, []);

  return (
    <footer className="bg-[#0F172A] text-gray-300 py-8 sm:py-10 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between gap-8 sm:gap-10">
        <div className="flex flex-col max-w-sm text-center md:text-left">
          <img src="/Group 22.png" alt="NGraph Logo" className="h-16 sm:h-20 w-auto mx-auto md:mx-0 mb-4" />
          <p className="text-sm sm:text-base leading-relaxed">
            Ngraph is a premium dashboard solution offering real-time insights with elegant visualizations.
            Designed for clarity, speed, and scalability.
          </p>
          <p className="mt-4 text-xs sm:text-sm text-gray-500">
            &copy; {new Date().getFullYear()} Ngraph. All rights reserved.
          </p>
        </div>

        <div className="flex flex-col space-y-3 text-center md:text-left">
          <h4 className="text-white font-semibold mb-2 text-base sm:text-lg">Quick Links</h4>
          {user?.roles?.includes("Admin") ? (
            <>
              <Link to="/" className="hover:text-cyan-400 text-sm sm:text-base min-h-[44px] flex items-center justify-center md:justify-start">Home</Link>
              <Link to="/admin/users" className="hover:text-cyan-400 text-sm sm:text-base min-h-[44px] flex items-center justify-center md:justify-start">User Settings</Link>
              <Link to="/admin/emailsettings" className="hover:text-cyan-400 text-sm sm:text-base min-h-[44px] flex items-center justify-center md:justify-start">Email Settings</Link>
              <Link to="/admin/invoicesettings" className="hover:text-cyan-400 text-sm sm:text-base min-h-[44px] flex items-center justify-center md:justify-start">Invoice Settings</Link>
              <Link to="/information" className="hover:text-cyan-400 text-sm sm:text-base min-h-[44px] flex items-center justify-center md:justify-start">Information</Link>
              <Link to="/subscription/buy" className="hover:text-cyan-400 text-sm sm:text-base min-h-[44px] flex items-center justify-center md:justify-start">Plans</Link>
            </>
          ) : (
            <>
              <Link to="/" className="hover:text-cyan-400 text-sm sm:text-base min-h-[44px] flex items-center justify-center md:justify-start">Home</Link>
              <Link to="/dashboard" className="hover:text-cyan-400 text-sm sm:text-base min-h-[44px] flex items-center justify-center md:justify-start">Dashboard</Link>
              <Link to="/information" className="hover:text-cyan-400 text-sm sm:text-base min-h-[44px] flex items-center justify-center md:justify-start">Information</Link>
              <Link to="/subscription/buy" className="hover:text-cyan-400 text-sm sm:text-base min-h-[44px] flex items-center justify-center md:justify-start">Plans</Link>
            </>
          )}
        </div>

        <div className="flex flex-col space-y-3 text-center md:text-left max-w-xs mx-auto md:mx-0">
          <h4 className="text-white font-semibold mb-2 text-base sm:text-lg">Contact & Social</h4>
          <p className="text-sm sm:text-base">
            Email: <a href="mailto:info@ntillp.com" className="hover:text-cyan-400">info@ntillp.com</a>
          </p>
          <div className="flex justify-center md:justify-start space-x-4 sm:space-x-5 mt-4 text-gray-400">
            <a href="http://www.newtechinfosol.in/" target="_blank" rel="noopener noreferrer" className="hover:text-cyan-400 min-h-[44px] min-w-[44px] flex items-center justify-center" aria-label="Website">
              <FaGlobe className="h-5 w-5 sm:h-6 sm:w-6" />
            </a>
            <a href="https://www.linkedin.com/company/new-tech-infosol---india/about/" target="_blank" rel="noopener noreferrer" className="hover:text-cyan-400 min-h-[44px] min-w-[44px] flex items-center justify-center" aria-label="LinkedIn">
              <FaLinkedin className="h-5 w-5 sm:h-6 sm:w-6" />
            </a>
            <a href="https://wa.me/919978278879?text=Hi%20I%20am%20interested%20in%20Ngraph" target="_blank" rel="noopener noreferrer" className="hover:text-cyan-400 min-h-[44px] min-w-[44px] flex items-center justify-center" aria-label="WhatsApp">
              <FaWhatsapp className="h-5 w-5 sm:h-6 sm:w-6" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

function AppContent() {
  const [dashboardOpen, setDashboardOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [companies, setCompanies] = useState([]);
  const navigate = useNavigate();
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
      <Header user={user} onLogout={handleLogout} />

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
        <Route path="/admin/complaintsmanagement" element={<AdminRoute><ComplaintsManagement /></AdminRoute>} />

        {/* Private routes (logged-in users) */}
        <Route path="/my-profile" element={<PrivateRoute><MyProfile /></PrivateRoute>} />
        <Route path="/purchase-history" element={<PrivateRoute><PurchaseHistory /></PrivateRoute>} />
        <Route path="/reset-password" element={<PrivateRoute><ResetPassword /></PrivateRoute>} />
        <Route path="/change-password" element={<PrivateRoute><ChangePassword /></PrivateRoute>} />
        <Route path="/complaints" element={<PrivateRoute><Complaints /></PrivateRoute>} />

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