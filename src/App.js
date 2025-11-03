// import React, { useState, useEffect, useRef } from "react";
// import { BrowserRouter as Router, Routes, Route, Link, Navigate, useNavigate } from "react-router-dom";
// import { FaArrowRight, FaSignInAlt, FaChevronDown, FaTwitter, FaLinkedin, FaUserPlus, FaUserShield, FaWhatsapp, FaGlobe } from "react-icons/fa";
// import ProductDashboard from "./pages/ProductDashboard";
// import HRDashboard from "./pages/HRDashboard";
// import AnalysisDashboard from "./pages/AnalysisDashboard";
// import HomeContent from "./pages/HomeContent";
// import ScrollToTop from "./ScrollToTop";
// import Login from "./pages/Login";
// import Register from "./pages/Register";
// import Profile from "./pages/Profile";
// import MyProfile from "./pages/MyProfile";
// import UserList from "./pages/UserList";
// import Dashboard from "./pages/Dashboard";
// import api from "./api";
// import ChangePassword from "./pages/ChangePassword";
// import ResetPassword from "./pages/ResetPassword";
// import UserModules from "./pages/UserModules";
// import TransferModules from "./pages/TransferModules";
// import PlanPage from "./pages/PlanPage";
// import SubscriptionPage from "./pages/SubscriptionPage";
// import PurchaseHistory from "./pages/PurchaseHistory";
// import InvoicePrintable from "./pages/InvoicePrintable";
// import EmailSettings from "./pages/EmailSettings";
// import InvoiceSettingsPage from "./pages/InvoiceSettingsPage";
// import Information from "./pages/Information";
// import Header from "./components/Header";
// import Complaints from "./pages/Complaints";
// import ComplaintsManagement from "./pages/ComplaintsManagement";
// import { Toaster } from "react-hot-toast";

// function Footer() {
//     const [user, setUser] = useState(null);
//     const currentYear = new Date().getFullYear();

//     useEffect(() => {
//         // Fetch user data for conditional links
//         api.get("/account/me")
//             .then((response) => setUser(response.data))
//             .catch(() => setUser(null));
//     }, []);

//     // Determine links based on user role
//     const getQuickLinks = (user) => {
//         const isAdmin = user?.roles?.includes("Admin");
//         const baseLinks = [
//             { to: "/", label: "Home" },
//             { to: "/dashboard", label: "Dashboard", adminOnly: false },
//             { to: "/subscription/buy", label: "Plans & Pricing" },
//             { to: "/information", label: "Information" },
//         ];

//         const adminLinks = [
//             { to: "/admin/users", label: "User Settings" },
//             { to: "/admin/emailsettings", label: "Email Settings" },
//             { to: "/admin/invoicesettings", label: "Invoice Settings" },
//             { to: "/admin/complaintsmanagement", label: "Complaints Management" },
//         ];
        
//         if (isAdmin) {
//             return [...baseLinks.slice(0, 1), ...adminLinks, ...baseLinks.slice(2)];
//         }
//         return baseLinks.filter(link => !link.adminOnly);
//     };
    
//     const quickLinks = getQuickLinks(user);

//     return (
//         // Use id for FAB alignment adjustment (if needed by other components)
//         <footer id="app-footer" className="bg-[#151D33] text-gray-300 border-t border-indigo-900 py-12 sm:py-16 px-4 sm:px-6">
//             <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-10 sm:gap-16">
                
//                 {/* Column 1: Branding and Description */}
//                 <div className="flex flex-col md:col-span-1 lg:col-span-2 max-w-lg text-center sm:text-left">
//                     <img src="/Group 22.png" alt="NGraph Logo" className="h-16 sm:h-20 w-auto mx-auto sm:mx-0 mb-4" />
//                     <p className="text-base sm:text-lg leading-relaxed text-indigo-200/80">
//                         Ngraph is a premium dashboard solution offering real-time insights with elegant visualizations.
//                         Designed for clarity, speed, and scalability.
//                     </p>
//                     <p className="mt-6 text-sm text-indigo-400 font-semibold">
//                         Ready to start visualizing your data?
//                         <Link to="/register" className="text-cyan-400 hover:text-cyan-300 ml-2 underline flex items-center justify-center sm:justify-start">
//                             Register Today <FaArrowRight className="ml-1 text-xs"/>
//                         </Link>
//                     </p>
//                 </div>

//                 {/* Column 2: Quick Links (Responsive List) */}
//                 <div className="flex flex-col text-center sm:text-left">
//                     <h4 className="text-white font-extrabold mb-4 text-xl border-b border-indigo-700 pb-2">Navigation</h4>
//                     <ul className="space-y-3">
//                         {quickLinks.map((item, index) => (
//                             <li key={index}>
//                                 <Link 
//                                     to={item.to} 
//                                     className="text-indigo-300 hover:text-cyan-400 transition text-base block"
//                                 >
//                                     {item.label}
//                                 </Link>
//                             </li>
//                         ))}
//                     </ul>
//                 </div>

//                 {/* Column 3: Contact & Social */}
//                 <div className="flex flex-col text-center sm:text-left">
//                     <h4 className="text-white font-extrabold mb-4 text-xl border-b border-indigo-700 pb-2">Reach Us</h4>
//                     <address className="not-italic text-base space-y-3">
//                         <p className="text-indigo-300">
//                             Email: <a href="mailto:info@ntillp.com" className="hover:text-cyan-400">info@ntillp.com</a>
//                         </p>
//                         <p className="text-indigo-300">
//                             Contact: <a href="tel:+919978278879" className="hover:text-cyan-400">+91 99782 78879</a>
//                         </p>
//                     </address>
                    
//                     {/* Social Icons (Larger targets on mobile) */}
//                     <div className="flex justify-center sm:justify-start space-x-5 mt-6 text-indigo-400">
//                         <a href="http://www.newtechinfosol.in/" target="_blank" rel="noopener noreferrer" className="hover:text-cyan-400 p-2 rounded-full hover:bg-indigo-700 transition" aria-label="Website">
//                             <FaGlobe className="h-6 w-6" />
//                         </a>
//                         <a href="https://www.linkedin.com/company/new-tech-infosol---india/about/" target="_blank" rel="noopener noreferrer" className="hover:text-cyan-400 p-2 rounded-full hover:bg-indigo-700 transition" aria-label="LinkedIn">
//                             <FaLinkedin className="h-6 w-6" />
//                         </a>
//                         <a href="https://wa.me/919978278879?text=Hi%20I%20am%20interested%20in%20Ngraph" target="_blank" rel="noopener noreferrer" className="hover:text-cyan-400 p-2 rounded-full hover:bg-indigo-700 transition" aria-label="WhatsApp">
//                             <FaWhatsapp className="h-6 w-6" />
//                         </a>
//                     </div>
//                 </div>
//             </div>
            
//             {/* Copyright Strip */}
//             <div className="max-w-7xl mx-auto border-t border-indigo-800 mt-10 pt-6 text-center">
//                 <p className="text-xs sm:text-sm text-indigo-400">
//                     &copy; {currentYear} Ngraph. All rights reserved. Built by New Tech Infosol.
//                 </p>
//             </div>
//         </footer>
//     );
// }

// // --- AppContent and App Wrapper (Remains Unchanged) ---

// function AppContent() {
//     // ... (rest of AppContent remains the same) ...
//     const [dashboardOpen, setDashboardOpen] = useState(false);
//     const [user, setUser] = useState(null);
//     const [companies, setCompanies] = useState([]);
//     const navigate = useNavigate();
//     const dashboardButtonRef = useRef(null);
  
//     const PublicRoute = ({ children }) => children;
  
//     const PrivateRoute = ({ children }) => {
//       if (!user) return <Navigate to="/login" replace />;
//       return children;
//     };
  
//     const AdminRoute = ({ children }) => {
//       if (!user) return <Navigate to="/login" replace />;
//       if (!user.roles?.includes("Admin")) return <Navigate to="/" replace />;
//       return children;
//     };
  
//     useEffect(() => {
//       api.get("/account/me")
//         .then((response) => setUser(response.data))
//         .catch(() => setUser(null));
//     }, []);
  
//     useEffect(() => {
//       if (user?.roles?.includes("Admin")) {
//         api.get("/admin/users")
//           .then((response) => setCompanies(response.data))
//           .catch(() => setCompanies([]));
//       }
//     }, [user]);
  
//     const handleLogout = () => {
//       api.post("/account/logout", {})
//         .then(() => {
//           setUser(null);
//           navigate("/");
//         });
//     };
  
//     return (
//       <>
//         <ScrollToTop />
//         <Header user={user} onLogout={handleLogout} />
  
//         <Routes>
//           {/* Public routes */}
//           <Route path="/" element={<PublicRoute><HomeContent /></PublicRoute>} />
//           <Route path="/login" element={<PublicRoute><Login onLogin={setUser} /></PublicRoute>} />
//           <Route path="/register" element={<PublicRoute><Register onRegister={setUser} /></PublicRoute>} />
//           <Route path="/dashboard" element={<PublicRoute><Dashboard /></PublicRoute>} />
//           <Route path="/plan" element={<PublicRoute><PlanPage /></PublicRoute>} />
//           <Route path="/subscription/buy" element={<PublicRoute><SubscriptionPage /></PublicRoute>} />
//           <Route path="/information" element={<PublicRoute><Information /></PublicRoute>} />
  
//           {/* Admin routes */}
//           <Route path="/profile/:id" element={<AdminRoute><Profile /></AdminRoute>} />
//           <Route path="/admin/users" element={<AdminRoute><UserList /></AdminRoute>} />
//           <Route path="/user/:id/modules" element={<AdminRoute><UserModules /></AdminRoute>} />
//           <Route path="/admin/transfer-modules" element={<AdminRoute><TransferModules /></AdminRoute>} />
//           <Route path="/admin/emailsettings" element={<AdminRoute><EmailSettings /></AdminRoute>} />
//           <Route path="/admin/invoicesettings" element={<AdminRoute><InvoiceSettingsPage /></AdminRoute>} />
//           <Route path="/admin/complaintsmanagement" element={<AdminRoute><ComplaintsManagement /></AdminRoute>} />
  
//           {/* Private routes (logged-in users) */}
//           <Route path="/my-profile" element={<PrivateRoute><MyProfile /></PrivateRoute>} />
//           <Route path="/purchase-history" element={<PrivateRoute><PurchaseHistory /></PrivateRoute>} />
//           <Route path="/reset-password" element={<PrivateRoute><ResetPassword /></PrivateRoute>} />
//           <Route path="/change-password" element={<PrivateRoute><ChangePassword /></PrivateRoute>} />
//           <Route path="/complaints" element={<PrivateRoute><Complaints /></PrivateRoute>} />
  
//           {/* Catch-all */}
//           <Route path="*" element={<Navigate to="/" replace />} />
//         </Routes>
  
//         <Footer />
//       </>
//     );
//   }
  
//   function App() {
//     return (
//       <Router>
//         <AppContent />
//         <Toaster position="top-right" />
//       </Router>
//     );
//   }
  
//   export default App;

import React, { useState, useEffect, memo, useRef } from "react";
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useNavigate } from "react-router-dom";
import { FaArrowRight, FaSignInAlt, FaChevronDown, FaTwitter, FaLinkedin, FaUserPlus, FaUserShield, FaWhatsapp, FaGlobe, FaHome, FaChartArea, FaTags, FaInfoCircle, FaUsers, FaAt, FaFileInvoice, FaClipboardList, FaEnvelope, FaPhone } from "react-icons/fa";
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
    const currentYear = new Date().getFullYear();

    // Memoize the Link component for cleaner JSX
    const FooterLink = memo(({ to, label, icon: Icon }) => (
        <li className="min-h-[40px] flex items-center justify-center sm:justify-start">
            <Link
                to={to}
                className="text-gray-300 hover:text-cyan-400 transition text-base font-normal flex items-center gap-2"
            >
                {Icon && <Icon className="w-4 h-4 text-cyan-500/80 shrink-0" />} {label}
            </Link>
        </li>
    ));

    useEffect(() => {
        // Fetch user data for conditional links (only run once on mount)
        api.get("/account/me")
            .then((response) => setUser(response.data))
            .catch(() => setUser(null));
    }, []);

    // Determine links based on user role (Memoized for efficiency)
    const getQuickLinks = (user) => {
        const isAdmin = user?.roles?.includes("Admin");
        const baseLinks = [
            { to: "/", label: "Home", icon: FaHome },
            { to: "/dashboard", label: "Dashboard", icon: FaChartArea },
            { to: "/subscription/buy", label: "Plans & Pricing", icon: FaTags },
            { to: "/information", label: "Information", icon: FaInfoCircle },
        ];

        // const adminLinks = [
        //     { to: "/admin/users", label: "User Management", icon: FaUsers },
        //     { to: "/admin/emailsettings", label: "Email Settings", icon: FaAt },
        //     { to: "/admin/invoicesettings", label: "Invoice Settings", icon: FaFileInvoice },
        //     { to: "/admin/complaintsmanagement", label: "Complaints Management", icon: FaClipboardList },
        // ];
        
        // if (isAdmin) {
        //     // Admin gets Home + Admin Links + Plans/Info
        //     return [baseLinks[0], ...adminLinks, baseLinks[2], baseLinks[3]];
        // }
        // Standard user gets all non-admin base links
        return baseLinks;
    };
    
    const quickLinks = getQuickLinks(user);

    return (
        <footer id="app-footer" className="bg-[#0F172A] text-gray-300 border-t border-indigo-900 py-12 sm:py-16 px-4">
            <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 sm:gap-16">
                <div className="flex flex-col md:col-span-2 max-w-lg text-center sm:text-left mx-auto md:mx-0 w-full">
                    <img src="/Group 22.png" alt="NGraph Logo" className="h-16 sm:h-20 w-auto mx-auto sm:mx-0 mb-4 object-contain" />
                        <p className="text-base sm:text-lg leading-relaxed text-gray-400">
                            <strong className="text-white italic">NGraph</strong> provides a premium dashboard solution, transforming your raw data into real-time, elegant visualizations designed for clarity, speed, and scalability.
                        </p>
                    <p className="mt-6 text-base text-cyan-400 font-semibold">
                        Ready to start visualizing your data?
                        <Link to="/register" className="text-cyan-400 hover:text-white mt-1 underline flex items-center justify-center sm:justify-start transition">
                            Register Today <FaArrowRight className="ml-2 text-sm"/>
                        </Link>
                    </p>
                </div>

                <div className="flex flex-col text-center sm:text-left">
                    <h4 className="text-white font-extrabold mb-5 text-xl border-b-2 border-cyan-500/50 pb-2">Navigation</h4>
                    <ul className="space-y-2">
                        {quickLinks.map((item, index) => (
                            <FooterLink key={index} to={item.to} label={item.label} icon={item.icon} />
                        ))}
                    </ul>
                </div>

                {/* Column 3: Contact & Social */}
                {/* ... (rest of the contact column remains the same) ... */}
                <div className="flex flex-col text-center sm:text-left">
                    <h4 className="text-white font-extrabold mb-5 text-xl border-b-2 border-cyan-500/50 pb-2">Get In Touch</h4>
                    <address className="not-italic text-base space-y-3">
                        {/* Email */}
                        <div className="flex items-center gap-3 justify-center sm:justify-start">
                            <FaEnvelope className="w-5 h-5 text-cyan-500 shrink-0" />
                            <a href="mailto:info@ntillp.com" className="text-gray-300 hover:text-cyan-400 transition">info@ntillp.com</a>
                        </div>
                        
                        {/* Phone */}
                        {/* <div className="flex items-center gap-3 justify-center sm:justify-start">
                            <FaPhone className="w-5 h-5 text-cyan-500 shrink-0" />
                            <a href="tel:+919978278879" className="text-gray-300 hover:text-cyan-400 transition">+91 99782 78879</a>
                        </div> */}
                    </address>
                    
                    {/* Social Icons (Stylized and larger touch targets) */}
                    <div className="flex justify-center sm:justify-start space-x-4 mt-8">
                        {/* Website */}
                        <a href="http://www.newtechinfosol.in/" target="_blank" rel="noopener noreferrer" className="text-white bg-indigo-700/50 hover:bg-cyan-500 p-3 rounded-full transition duration-300 shadow-lg" aria-label="Website">
                            <FaGlobe className="h-6 w-6" />
                        </a>
                        {/* LinkedIn */}
                        <a href="https://www.linkedin.com/company/new-tech-infosol---india/about/" target="_blank" rel="noopener noreferrer" className="text-white bg-indigo-700/50 hover:bg-cyan-500 p-3 rounded-full transition duration-300 shadow-lg" aria-label="LinkedIn">
                            <FaLinkedin className="h-6 w-6" />
                        </a>
                        {/* WhatsApp */}
                        <a href="https://wa.me/919978278879?text=Hi%20I%20am%20interested%20in%20Ngraph" target="_blank" rel="noopener noreferrer" className="text-white bg-indigo-700/50 hover:bg-cyan-500 p-3 rounded-full transition duration-300 shadow-lg" aria-label="WhatsApp">
                            <FaWhatsapp className="h-6 w-6" />
                        </a>
                    </div>
                </div>
            </div>
            
            {/* Copyright Strip */}
            <div className="max-w-7xl mx-auto border-t border-indigo-700 mt-12 pt-6 text-center">
                <p className="text-sm text-gray-500 font-medium">
                    &copy; {currentYear} **Ngraph**. All rights reserved. Built by New Tech Infosol.
                </p>
            </div>
        </footer>
    );
}

function AppContent() {
    // ... (Your existing AppContent logic) ...
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