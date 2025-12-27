import React, { useState, useEffect, memo, useRef } from "react";
import { useLocation } from "react-router-dom";
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useNavigate } from "react-router-dom";
import { FaArrowRight, FaSpinner, FaSignInAlt, FaChevronDown, FaTwitter, FaLinkedin, FaUserPlus, FaUserShield, FaWhatsapp, FaGlobe, FaHome, FaChartArea, FaTags, FaInfoCircle, FaUsers, FaAt, FaFileInvoice, FaClipboardList, FaEnvelope, FaPhone } from "react-icons/fa";
import ProductDashboard from "./pages/ProductDashboard";
import HRDashboard from "./pages/HRDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import HomeContent from "./pages/HomeContent";
import AboutContent from "./pages/AboutContent";
import ServiceContent from "./pages/ServiceContent";
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
import ModuleSuggestionsHistory from "./pages/ModuleSuggestionsHistory"
import ActivityLogs from "./pages/ActivityLogs";
import { Toaster } from "react-hot-toast";
import SuperAdminUserList from "./pages/SuperAdminUserList";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import Pricing from "./pages/Pricing";
import UserPricingPage from "./pages/UserPricingPage";
import CommissionPage from "./pages/CommissionPage";
import AdminCommissionPage from "./pages/AdminCommissionPage";
import AdminPayoutDetails from "./pages/AdminPayoutDetails";
import SubscriptionAddonPage from "./pages/SubscriptionAddonPage";
import ReportRenderer from './pages/ReportRenderer';
import SalesAnalyticsPage from "./pages/SalesAnalyticsPage";
import SalesModules from "./pages/SalesModules";
import ProductionAnalyticsPage from "./pages/ProductionAnalyticsPage";
import ProductionModules from "./pages/ProductionModules";
import ScreenLoader from "./components/ScreenLoader";
import UserToolsPage from "./pages/UserToolsPage";
import ExpenseModules from "./pages/ExpenseModules";
import ExpenseAnalyticsPage from "./pages/ExpenseAnalyticsPage";
import FinanceModules from "./pages/FinanceModules";
import FinanceAnalyticsPage from "./pages/FinanceAnalyticsPage";
import AdminProfile from "./pages/AdminProfile";
import MyAdminProfile from "./pages/MyAdminProfile";
import ERPModules from "./pages/ERPModules"
import CatalogsModules from "./pages/Catalogs/CatalogsModules";
import CatalogsProductModules from "./pages/Catalogs/CatalogsProductModules";
import CatalogsLayout from "./pages/Catalogs/CatalogsLayout";
import CatalogsMain from "./pages/Catalogs/CatalogsMain";
import CatalogsProducts from "./pages/Catalogs/CatalogsProducts";

const FooterLink = memo(({ to, label }) => (
    <li className="mb-2">
        <Link
            to={to}
            className="text-gray-400 hover:text-teal-400 transition text-base font-normal block"
        >
            {label}
        </Link>
    </li>
));

// --- Main Footer Component ---

function Footer({ user }) {
    const currentYear = new Date().getFullYear();

    const roles = user?.roles || [];
    const isUser = roles.includes("User");
    const isSuperAdmin = roles.includes("SuperAdmin");
    const isAdmin = roles.includes("Admin");
    const isAnyAdmin = isAdmin || isSuperAdmin;

    const companyLinks = [];

    // GUEST USER (not logged in)
    if (!user) {
        companyLinks.push(
            { to: "/", label: "Home" },
            { to: "/login", label: "Login" },
            { to: "/register", label: "Register" },
        );
    }

    // USER
    if (isUser) {
        companyLinks.push(
            { to: "/", label: "Home" },
            { to: "/information", label: "Information" },
            { to: "/pricing", label: "Pricing" },
        );
    }

    // ADMIN
    if (isAdmin && !isSuperAdmin) {
        companyLinks.push(
            { to: "/", label: "Home" },
            { to: "/information", label: "Information" },
            { to: "/pricing", label: "Pricing" },
        );
    }

    // SUPER ADMIN
    if (isSuperAdmin) {
        companyLinks.push(
            { to: "/", label: "Home" },
            { to: "/information", label: "Information" },
            { to: "/pricing", label: "Pricing Display" },
        );
    }

    const productLinks = [];

    // GUEST USER (not logged in)
    if (!user) {
        productLinks.push(
            { to: "/information", label: "Information" },
            { to: "/pricing", label: "Pricing" },
        );
    }

    // USER
    if (isUser) {
        productLinks.push(
            { to: "/dashboard", label: "Custom Dashboard" },
            { to: "/expenseanalytics/:id", label: "Expense Dashboard" },
            { to: "/financeanalytics/:id", label: "Finance Dashboard" },
            { to: "/productionanalytics/:id", label: "Production Dashboard" },
            { to: "/salesanalytics/:id", label: "Sales Dashboard" },
        );
    }

    // ADMIN
    if (isAdmin && !isSuperAdmin) {
        productLinks.push(
            { to: "/admin/users", label: "User Management" },
            { to: "/admin/complaintsmanagement", label: "Complaints" },
            { to: "/admin/admindashboard", label: "Admin Dashboard" },
            { to: "/admin/my-commission", label: "Commission" },
        );
    }

    // SUPER ADMIN
    if (isSuperAdmin) {
        productLinks.push(
            { to: "/superadmin/user-management", label: "Users Management" },
            { to: "/admin/emailsettings", label: "Email Settings" },
            { to: "/admin/invoicesettings", label: "Invoice Settings" },
            { to: "/superadmin/pricing", label: "Pricing Settings" },
            { to: "/superadmin/admin-commission", label: "Admin Commission" },
        );
    }

    // Placeholder handler for the subscription form
    const handleSubscribe = (e) => {
        e.preventDefault();
        const email = e.target.elements.email.value;
        if (email) {
            // alert(`Subscribing ${email}... (API integration needed)`);
            alert(`This feature is currently under development.`);
            e.target.elements.email.value = '';
        }
    };

    return (
        <footer id="app-footer" className="bg-[#0b0d10] text-gray-300 border-t border-indigo-900 py-12 sm:py-16 px-4">
            <div className="max-w-7xl mx-auto">
                <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-6 lg:gap-12">

                    {/* Column 1: Logo (Wider column on mobile) */}
                    <div className="col-span-2 sm:col-span-3 lg:col-span-2 flex flex-col items-center sm:items-start text-center sm:text-left">
                        {/* Placeholder for NGraph Logo (use the logo you defined in Header) */}
                        <img src="/Group 22.png" alt="NGraph Logo" className="h-12 sm:h-16 w-auto mb-6" />
                        <p className="text-base text-teal-500 font-semibold">
                            Ready to start visualizing your data?
                            <Link to="/register" className="text-teal-500 hover:text-white mt-1 underline flex items-center justify-center sm:justify-start transition">
                                Register Today <FaArrowRight className="ml-2 text-sm" />
                            </Link>
                        </p>
                    </div>

                    {/* Column 2: Company */}
                    <div className="flex flex-col text-center sm:text-left">
                        <h4 className="text-white font-extrabold mb-4 text-lg border-b border-gray-700/50 pb-2">Company</h4>
                        <ul>
                            {companyLinks.map((item, i) => (
                                <FooterLink key={i} to={item.to} label={item.label} />
                            ))}
                        </ul>
                    </div>

                    {/* Column 3: Product */}
                    <div className="flex flex-col text-center sm:text-left">
                        <h4 className="text-white font-extrabold mb-4 text-lg border-b border-gray-700/50 pb-2">Product</h4>
                        <ul>
                            {productLinks.map((item, i) => (
                                <FooterLink key={i} to={item.to} label={item.label} />
                            ))}
                        </ul>
                    </div>

                    {/* Column 4: Subscribe (Takes remaining space on lg screens) */}
                    <div className="col-span-2 lg:col-span-2 flex flex-col text-center sm:text-left">
                        <h4 className="text-white font-extrabold mb-4 text-lg border-b border-gray-700/50 pb-2">Subscribe</h4>
                        <p className="text-gray-400 text-sm mb-4">
                            Stay ahead with insights on data visualization and business intelligence trends.
                        </p>
                        <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-2">
                            <input
                                type="email"
                                name="email"
                                placeholder="Enter email address"
                                className="w-full p-2 border border-gray-600 rounded-lg bg-gray-900 text-white placeholder-gray-500 focus:border-teal-400 focus:ring-1 focus:ring-teal-400 transition"
                                required
                            />
                            <button
                                type="submit"
                                className="px-4 py-2 bg-teal-500 text-black font-semibold rounded-lg hover:bg-teal-400 transition flex-shrink-0"
                            >
                                Submit
                            </button>
                        </form>
                        <p className="text-xs text-gray-500 mt-2">
                            By subscribing, you agree to our privacy policy and email communications.
                        </p>
                    </div>
                </div>

                {/* --- Bottom Footer Strip --- */}
                <div className="max-w-full mx-auto border-t border-gray-700 mt-12 pt-6 flex flex-col sm:flex-row justify-between items-center text-center sm:text-left">

                    {/* Copyright & Legal Links */}
                    <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-4">
                        <p className="text-sm text-gray-500 font-medium">
                            &copy; {currentYear} NGraph. All rights reserved.
                        </p>
                        <div className="flex space-x-3 text-sm font-medium">
                            {/* <a href="/privacy-policy" className="text-gray-400 hover:text-white transition">Privacy policy</a> */}
                            {/* <a href="/terms-of-service" className="text-gray-400 hover:text-white transition">Terms of service</a> */}
                            {/* <a href="/cookies-settings" className="text-gray-400 hover:text-white transition">Cookies settings</a> */}
                        </div>
                    </div>

                    {/* Social Icons (Adapted from current code but visually aligned to the image) */}
                    <div className="flex justify-center space-x-4 mt-6 sm:mt-0">
                        {/* LinkedIn (from imported icons) */}
                        <a href="https://www.linkedin.com/company/new-tech-infosol---india/about/" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-teal-400 transition" aria-label="LinkedIn">
                            <FaLinkedin className="h-6 w-6" />
                        </a>
                        {/* YouTube (Using FaPlay from imported icons) */}
                        <a href="http://www.newtechinfosol.in/" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-teal-400 transition" aria-label="Website">
                            <FaGlobe className="h-6 w-6" />
                        </a>
                        {/* Twitter/X (Using a placeholder icon) */}
                        <a href="https://wa.me/919978278879?text=Hi%20I%20am%20interested%20in%20NGraph" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-teal-400 transition" aria-label="WhatsApp">
                            {/* FaTwitter */}
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
    const [user, setUser] = useState(null);
    const [loadingUser, setLoadingUser] = useState(true);
    const [companies, setCompanies] = useState([]);
    const navigate = useNavigate();
    const dashboardButtonRef = useRef(null);
    const location = useLocation();
    // const hideMainHeader =
    //     location.pathname.startsWith("/salesanalytics") ||
    //     location.pathname.startsWith("/financeanalytics") ||
    //     location.pathname.startsWith("/expenseanalytics") ||
    //     location.pathname.startsWith("/productionanalytics");

    const PublicRoute = ({ children }) => children;

    const PrivateRoute = ({ children }) => {
        if (loadingUser) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-[#0d1117]">
                    {/* Spinner */}
                    <div className="w-12 h-12 border-4 border-blue-300 border-t-blue-700 rounded-full animate-spin"></div>

                    {/* Message */}
                    <p className="text-4xl font-medium text-blue-900 text-center px-4">
                        Loading...
                    </p>
                </div>
            );
        }
        if (!user) return <Navigate to="/login" replace />;
        return children;
    };


    // SuperAdminRoute: Only accessible by SuperAdmins
    const SuperAdminRoute = ({ children }) => {
        if (loadingUser) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-[#0d1117]">
                    {/* Spinner */}
                    <div className="w-12 h-12 border-4 border-blue-300 border-t-blue-700 rounded-full animate-spin"></div>

                    {/* Message */}
                    <p className="text-4xl font-medium text-blue-900 text-center px-4">
                        Loading...
                    </p>
                </div>
            );
        }
        if (!user) return <Navigate to="/login" replace />;
        if (!user.roles?.includes("SuperAdmin")) return <Navigate to="/" replace />;
        return children;
    };

    // AdminRoute: Accessible by both SuperAdmins and Admins (Union logic)
    const AdminRoute = ({ children }) => {
        if (loadingUser) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-[#0d1117]">
                    {/* Spinner */}
                    <div className="w-12 h-12 border-4 border-blue-300 border-t-blue-700 rounded-full animate-spin"></div>

                    {/* Message */}
                    <p className="text-4xl font-medium text-blue-900 text-center px-4">
                        Loading...
                    </p>
                </div>
            );
        }

        if (!user) return <Navigate to="/login" replace />;

        const isSuperAdmin = user.roles?.includes("SuperAdmin");
        const isAdmin = user.roles?.includes("Admin");

        if (!isSuperAdmin && !isAdmin) return <Navigate to="/" replace />;

        return children;
    };


    // AdminRestrictedRoute: Accessible by SuperAdmins only (for the routes you removed from standard Admin)
    const AdminRestrictedRoute = ({ children }) => {
        if (loadingUser) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-[#0d1117]">
                    {/* Spinner */}
                    <div className="w-12 h-12 border-4 border-blue-300 border-t-blue-700 rounded-full animate-spin"></div>

                    {/* Message */}
                    <p className="text-4xl font-medium text-blue-900 text-center px-4">
                        Loading...
                    </p>
                </div>
            );
        }
        if (!user) return <Navigate to="/login" replace />;
        if (!user.roles?.includes("SuperAdmin")) return <Navigate to="/" replace />;
        return children;
    };


    useEffect(() => {
        api.get("/account/me")
            .then(res => setUser(res.data))
            .catch(() => setUser(null))
            .finally(() => setLoadingUser(false));
    }, []);


    useEffect(() => {
        // Check for SuperAdmin OR Admin when deciding whether to fetch user list
        if (user?.roles?.includes("SuperAdmin") || user?.roles?.includes("Admin")) {
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
            {/* {!hideMainHeader && (
                <Header user={user} onLogout={handleLogout} />
            )} */}

            <Header user={user} onLogout={handleLogout} />


            <Routes>
                {/* Public routes */}
                <Route path="/" element={<PublicRoute><HomeContent /></PublicRoute>} />
                <Route path="/about" element={<PublicRoute><AboutContent /></PublicRoute>} />
                <Route path="/service" element={<PublicRoute><ServiceContent /></PublicRoute>} />
                <Route path="//privacy-policy" element={<PublicRoute><PrivacyPolicy /></PublicRoute>} />
                <Route path="/terms-of-service" element={<PublicRoute><TermsOfService /></PublicRoute>} />
                <Route path="/login" element={<PublicRoute><Login onLogin={setUser} /></PublicRoute>} />
                <Route path="/register" element={<PublicRoute><Register onRegister={setUser} /></PublicRoute>} />
                <Route path="/plan" element={<PublicRoute><PlanPage /></PublicRoute>} />
                <Route path="/subscription/buy" element={<PublicRoute><SubscriptionPage /></PublicRoute>} />
                <Route path="/pricing" element={<PublicRoute><UserPricingPage /></PublicRoute>} />
                <Route path="/information" element={<PublicRoute><Information /></PublicRoute>} />

                {/* Admin and SuperAdmin routes (Accessible by both roles) */}
                <Route path="/profile/:id" element={<AdminRoute><Profile /></AdminRoute>} />
                <Route path="/admin/users" element={<AdminRoute><UserList /></AdminRoute>} />
                <Route path="/user/:id/modules" element={<AdminRoute><UserModules /></AdminRoute>} />
                <Route path="/admin/transfer-modules" element={<AdminRoute><TransferModules /></AdminRoute>} />
                <Route path="/admin/complaintsmanagement" element={<AdminRoute><ComplaintsManagement /></AdminRoute>} />
                <Route path="/admin/admindashboard/:adminId?" element={<AdminRoute><AdminDashboard isViewerSuperAdmin={user?.roles?.includes("SuperAdmin")} /></AdminRoute>} />
                <Route path="/admin/activitylogs" element={<AdminRoute><ActivityLogs isViewerSuperAdmin={user?.roles?.includes("SuperAdmin")} /></AdminRoute>} />
                <Route path="/admin/my-commission" element={<AdminRoute><AdminCommissionPage /></AdminRoute>} />
                <Route path="/admin/payout-details" element={<AdminRoute><AdminPayoutDetails /></AdminRoute>} />
                <Route path="/user/:id/sales-modules" element={<AdminRoute><SalesModules /></AdminRoute>} />
                <Route path="/user/:id/production-modules" element={<AdminRoute><ProductionModules /></AdminRoute>} />
                <Route path="/user/:id/expense-modules" element={<AdminRoute><ExpenseModules /></AdminRoute>} />
                <Route path="/user/:id/finance-modules" element={<AdminRoute><FinanceModules /></AdminRoute>} />
                <Route path="/user/:id/tools" element={<AdminRoute><UserToolsPage /></AdminRoute>} />
                <Route path="/my-admin-profile" element={<AdminRoute><MyAdminProfile /></AdminRoute>} />
                <Route path="/user/:id/erp-modules" element={<AdminRoute><ERPModules /></AdminRoute>} />
                <Route path="/erp/:id/catalogs" element={<AdminRoute><CatalogsModules /></AdminRoute>} />
                <Route path="/erp/:id/catalogs/product" element={<AdminRoute><CatalogsProductModules /></AdminRoute>} />

                {/* SuperAdmin ONLY routes (The routes removed from standard Admin) */}
                <Route path="/superadmin/user-management" element={<AdminRestrictedRoute><SuperAdminUserList isViewerSuperAdmin={user?.roles?.includes("SuperAdmin")} /></AdminRestrictedRoute>} />
                <Route path="/admin/emailsettings" element={<AdminRestrictedRoute><EmailSettings /></AdminRestrictedRoute>} />
                <Route path="/admin/invoicesettings" element={<AdminRestrictedRoute><InvoiceSettingsPage /></AdminRestrictedRoute>} />
                <Route path="/superadmin/pricing" element={<AdminRestrictedRoute><Pricing /></AdminRestrictedRoute>} />
                <Route path="/superadmin/admin-commission" element={<AdminRestrictedRoute><CommissionPage /></AdminRestrictedRoute>} />
                <Route path="/adminprofile/:id" element={<AdminRestrictedRoute><AdminProfile /></AdminRestrictedRoute>} />

                {/* Private routes (logged-in users) */}
                <Route path="/my-profile" element={<PrivateRoute><MyProfile /></PrivateRoute>} />
                <Route path="/purchase-history" element={<PrivateRoute><PurchaseHistory /></PrivateRoute>} />
                <Route path="/reset-password" element={<PrivateRoute><ResetPassword /></PrivateRoute>} />
                <Route path="/change-password" element={<PrivateRoute><ChangePassword /></PrivateRoute>} />
                <Route path="/complaints" element={<PrivateRoute><Complaints /></PrivateRoute>} />
                <Route path="/suggestions-history" element={<PrivateRoute><ModuleSuggestionsHistory /></PrivateRoute>} />
                <Route path="/subscription/addon" element={<PrivateRoute><SubscriptionAddonPage /></PrivateRoute>} />
                <Route path="/report/render" element={<PrivateRoute><ReportRenderer /></PrivateRoute>} />
                <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
                <Route path="/salesanalytics/:id" element={<PrivateRoute><SalesAnalyticsPage /></PrivateRoute>} />
                <Route path="/productionanalytics/:id" element={<PrivateRoute><ProductionAnalyticsPage /></PrivateRoute>} />
                <Route path="/expenseanalytics/:id" element={<PrivateRoute><ExpenseAnalyticsPage /></PrivateRoute>} />
                <Route path="/financeanalytics/:id" element={<PrivateRoute><FinanceAnalyticsPage /></PrivateRoute>} />

                <Route path="/catalogs" element={<PrivateRoute><CatalogsLayout /></PrivateRoute>}>
                    <Route index element={<PrivateRoute><CatalogsMain /></PrivateRoute>} />
                    <Route path="products" element={<PrivateRoute><CatalogsProducts /></PrivateRoute>} />
                </Route>

                {/* Catch-all */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>

            <Footer user={user} />
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