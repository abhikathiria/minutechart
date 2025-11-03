// import React, { useEffect, useState } from "react";
// import { useParams, useNavigate, Link } from "react-router-dom";
// import { FaDatabase, FaServer, FaUser, FaKey, FaClock } from "react-icons/fa";
// import { Loader } from "lucide-react";
// import api from "../api";

// export default function Profile() {
//   const { id } = useParams();
//   const navigate = useNavigate();

//   const [form, setForm] = useState({
//     serverName: "",
//     databaseName: "",
//     dbUsername: "",
//     dbPassword: "",
//     refreshTime: 60000,
//     customerGST: "",
//     customerCode: "",
//   });

//   const [companyName, setCompanyName] = useState("");
//   const [loading, setLoading] = useState(true);
//   const [saving, setSaving] = useState(false);
//   const [message, setMessage] = useState(null);
//   const [error, setError] = useState(null);
//   const [tables, setTables] = useState(null);
//   const [showPassword, setShowPassword] = useState(false);

//   useEffect(() => {
//     async function loadProfile() {
//       if (!id) {
//         setError("No user selected.");
//         setLoading(false);
//         return;
//       }

//       setLoading(true);
//       try {
//         const userRes = await api.get("/admin/users");
//         const users = userRes.data;
//         const targetUser = users.find((u) => u.id === id);
//         if (targetUser) {
//           setCompanyName(targetUser.companyName || "");
//         }

//         const profileRes = await api.get(`/admin/user/${id}/profile`);
//         const data = profileRes.data;

//         setForm({
//           companyName: data.companyName || targetUser.companyName || "",
//           customerGST: data.customerGST || "",
//           customerCode: data.customerCode || "",
//           serverName: data.serverName || "",
//           databaseName: data.databaseName || "",
//           dbUsername: data.dbUsername || "",
//           dbPassword: "",
//           refreshTime: data.refreshTime ?? 60000,
//         });
//       } catch (err) {
//         setError("Failed to load profile: " + (err.response?.data?.message || err.message));
//       } finally {
//         setLoading(false);
//       }
//     }

//     loadProfile();
//   }, [id]);

//   const onChange = (e) => {
//     const { name, value } = e.target;
//     setForm((prev) => ({ ...prev, [name]: value }));
//   };

//   const onSubmit = async (e) => {
//     e.preventDefault();
//     setMessage(null);
//     setError(null);
//     setTables(null);
//     setSaving(true);

//     try {
//       const payload = {
//         companyName: form.companyName,
//         customerGST: form.customerGST,
//         serverName: form.serverName,
//         databaseName: form.databaseName,
//         dbUsername: form.dbUsername,
//         dbPassword: form.dbPassword,
//         refreshTime: Number(form.refreshTime) || 60000,
//       };

//       const res = await api.post(`/admin/user/${id}/profile`, payload, { withCredentials: true });
//       const body = res.data;

//       setMessage(body?.message ?? "Profile saved successfully.");
//       if (Array.isArray(body?.tables)) {
//         setTables(body.tables);
//       }
//       setForm((prev) => ({ ...prev, dbPassword: "" }));

//       setTimeout(() => {
//         navigate("/admin/users", { state: { keepFilters: true } });
//       }, 1500);
//     } catch (err) {
//       const body = err.response?.data;
//       const details = body?.details ? ` — ${body.details}` : "";
//       setError(`${body?.message ?? "Error saving profile"}${details}`);
//     } finally {
//       setSaving(false);
//     }
//   };

//   if (loading) {
//           return (
//               <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-purple-50 to-indigo-50">
//                   <div className="text-xl text-gray-700 font-medium flex items-center gap-2">
//                        <Loader className="animate-spin w-5 h-5"/> Loading User Database Profile...
//                   </div>
//               </div>
//           );
//       }

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 py-12 px-4">
//       {/* Top header */}
//       <div className="max-w-4xl mx-auto bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl shadow-lg text-white p-6 mb-8 flex items-center justify-between">
//         <div>
//           <h1 className="text-2xl font-bold">Profile Setup</h1>
//           <p className="text-sm opacity-90">Database settings for {companyName}</p>
//         </div>
//         <Link
//           to="/admin/users"
//           state={{ keepFilters: true }}
//           className="px-4 py-2 bg-white text-indigo-700 rounded-lg font-semibold hover:bg-gray-100 transition"
//         >
//           ⬅ Back to Users
//         </Link>
//       </div>
//       <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden grid grid-cols-1 md:grid-cols-3">
//         {/* Left Profile Panel */}
//         <div className="bg-gradient-to-br from-indigo-600 to-purple-600 text-white p-6 flex flex-col justify-center items-center">
//           <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center text-3xl font-bold mb-4">
//             {companyName?.[0] || "C"}
//           </div>
//           <h2 className="text-lg font-semibold">{companyName || "Company"}</h2>
//           <p className="text-sm text-white/80">Database Connection Profile</p>
//         </div>

//         {/* Right Form */}
//         <div className="md:col-span-2 p-8">
//           {message && (
//             <div className="mb-4 text-green-800 bg-green-100 p-3 rounded-lg border border-green-200">
//               {message}
//             </div>
//           )}
//           {error && (
//             <div className="mb-4 text-red-800 bg-red-100 p-3 rounded-lg border border-red-200">
//               {error}
//             </div>
//           )}

//           <form onSubmit={onSubmit} className="space-y-5">
//             <div>
//               <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
//                 <FaKey /> Customer GST
//               </label>
//               <input
//                 name="customerGST"
//                 value={form.customerGST}
//                 onChange={onChange}
//                 placeholder="Customer GST"
//                 className="w-full border rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
//               />
//             </div>
//             {/* Customer Code */}
//             <div>
//               <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
//                 <FaUser /> Customer Code
//               </label>
//               <input
//                 name="customerCode"
//                 value={form.customerCode}
//                 readOnly
//                 className="w-full border rounded-xl px-4 py-2 bg-gray-100 focus:outline-none"
//               />
//             </div>
//             {/* Server */}
//             <div>
//               <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
//                 <FaServer /> Server / Host
//               </label>
//               <input
//                 name="serverName"
//                 value={form.serverName}
//                 onChange={onChange}
//                 required
//                 placeholder="192.168.1.10,1433 or server\\instance"
//                 className="w-full border rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
//               />
//             </div>

//             {/* Database */}
//             <div>
//               <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
//                 <FaDatabase /> Database Name
//               </label>
//               <input
//                 name="databaseName"
//                 value={form.databaseName}
//                 onChange={onChange}
//                 required
//                 placeholder="Client database name"
//                 className="w-full border rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
//               />
//             </div>

//             {/* Username */}
//             <div>
//               <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
//                 <FaUser /> DB Username
//               </label>
//               <input
//                 name="dbUsername"
//                 value={form.dbUsername}
//                 onChange={onChange}
//                 required
//                 placeholder="DB username"
//                 className="w-full border rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
//               />
//             </div>

//             {/* Password */}
//             <div>
//               <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
//                 <FaKey /> DB Password
//               </label>
//               <div className="relative">
//                 <input
//                   name="dbPassword"
//                   type={showPassword ? "text" : "password"}
//                   value={form.dbPassword}
//                   onChange={onChange}
//                   placeholder="DB password"
//                   className="w-full border rounded-xl px-4 py-2 pr-16 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
//                 />
//                 <button
//                   type="button"
//                   onClick={() => setShowPassword((prev) => !prev)}
//                   className="absolute right-4 top-2 text-sm text-indigo-600 hover:underline"
//                 >
//                   {showPassword ? "Hide" : "Show"}
//                 </button>
//               </div>
//             </div>

//             {/* Refresh Time */}
//             <div>
//               <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
//                 <FaClock /> Refresh Time (ms)
//               </label>
//               <input
//                 name="refreshTime"
//                 type="number"
//                 min="60000"
//                 value={form.refreshTime}
//                 onChange={onChange}
//                 className="w-full border rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
//               />
//               <p className="text-xs text-gray-500 mt-1">
//                 Minimum recommended 60000 (60 seconds).
//               </p>
//             </div>

//             <button
//               type="submit"
//               disabled={saving}
//               className="bg-indigo-600 hover:bg-indigo-700 transition text-white px-6 py-2 rounded-xl font-semibold shadow"
//             >
//               {saving ? "Saving…" : "Save & Test Connection"}
//             </button>
//           </form>

//           {tables?.length > 0 && (
//             <div className="mt-8">
//               <h3 className="font-semibold mb-3 text-gray-800">
//                 Sample Tables
//               </h3>
//               <div className="flex flex-wrap gap-2">
//                 {tables.map((t, i) => (
//                   <span
//                     key={i}
//                     className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-sm font-medium"
//                   >
//                     {t}
//                   </span>
//                 ))}
//               </div>
//             </div>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }


import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { FaDatabase, FaServer, FaUser, FaKey, FaClock, FaEye, FaEyeSlash, FaArrowLeft } from "react-icons/fa";
import { Loader, Save, CheckCircle, XCircle } from "lucide-react";
import api from "../api";

// --- Helper Component for Input Fields ---
const InputGroup = ({ label, name, value, onChange, icon: Icon, placeholder, required, readOnly, type = "text", info = "", ...props }) => (
  <div>
    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
      <Icon className="w-4 h-4 text-indigo-500" /> {label}
      {required && <span className="text-red-500 text-xs">*</span>}
    </label>
    <input
      name={name}
      type={type}
      value={value}
      onChange={onChange}
      required={required}
      readOnly={readOnly}
      placeholder={placeholder}
      className={`w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none transition duration-150 ${readOnly ? 'bg-gray-100 text-gray-600' : 'bg-white'}`}
      {...props}
    />
    {info && <p className="text-xs text-gray-500 mt-1">{info}</p>}
  </div>
);

// --- Main Component ---
export default function Profile() {
  const { id } = useParams();
  const navigate = useNavigate();

  // State initialization (kept identical to original)
  const [form, setForm] = useState({
    serverName: "",
    databaseName: "",
    dbUsername: "",
    dbPassword: "",
    refreshTime: 60000,
    customerGST: "",
    customerCode: "",
  });

  const [companyName, setCompanyName] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [tables, setTables] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  // --- Data Loading Effect ---
  useEffect(() => {
    async function loadProfile() {
      if (!id) {
        setError("No user selected.");
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // Fetch user data to get company name and customer code
        const userRes = await api.get("/admin/users");
        const users = userRes.data;
        const targetUser = users.find((u) => u.id === id);

        if (!targetUser) {
          setError("Target user not found.");
          setLoading(false);
          return;
        }

        setCompanyName(targetUser.companyName || "N/A");
        setCustomerName(targetUser.customerName || "N/A");
        setEmail(targetUser.email || "N/A");
        setPhoneNumber(targetUser.phoneNumber || "N/A");

        // Fetch user profile settings
        const profileRes = await api.get(`/admin/user/${id}/profile`);
        const data = profileRes.data;

        setForm({
          customerGST: data.customerGST || "",
          customerCode: data.customerCode || targetUser.customerCode || "",
          serverName: data.serverName || "",
          databaseName: data.databaseName || "",
          dbUsername: data.dbUsername || "",
          dbPassword: "", // Never pre-fill password
          refreshTime: data.refreshTime ?? 60000,
        });

      } catch (err) {
        setError("Failed to load profile: " + (err.response?.data?.message || err.message));
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [id]);

  // --- Input Change Handler ---
  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // --- Form Submission Handler ---
  const onSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);
    setError(null);
    setTables(null);
    setSaving(true);

    try {
      const payload = {
        // FIX: Include companyName from state, as required by the API
        companyName: companyName,
        customerGST: form.customerGST,
        customerCode: form.customerCode,
        serverName: form.serverName,
        databaseName: form.databaseName,
        dbUsername: form.dbUsername,
        // Only send the password if the user typed something
        dbPassword: form.dbPassword,
        refreshTime: Number(form.refreshTime) || 60000,
      };

      const res = await api.post(`/admin/user/${id}/profile`, payload, { withCredentials: true });
      const body = res.data;

      setMessage(body?.message ?? "Profile saved successfully. Connection validated!");
      if (Array.isArray(body?.tables)) {
        setTables(body.tables);
      }
      // Clear password field after successful save for security
      setForm((prev) => ({ ...prev, dbPassword: "" }));

      // Redirect upon success (original functionality kept)
      setTimeout(() => {
        navigate("/admin/users", { state: { keepFilters: true } });
      }, 1500);

    } catch (err) {
      const body = err.response?.data;
      const details = body?.details ? ` — ${body.details}` : "";
      setError(`${body?.message ?? "Error saving profile or connecting to DB"}${details}`);
    } finally {
      setSaving(false);
    }
  };

  // --- Loading State Render ---
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-2xl text-indigo-600 font-semibold flex items-center gap-3 p-6 bg-white rounded-xl shadow-lg">
          <Loader className="animate-spin w-6 h-6" />
          Loading User Database Profile...
        </div>
      </div>
    );
  }

  // --- Main Component Render ---
  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6 lg:p-10">
      <div className="max-w-6xl mx-auto">
        {/* Header Section: Elevated and Clear */}
        <header className="bg-white rounded-xl shadow-2xl p-6 mb-8 border-t-4 border-indigo-500">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-extrabold text-gray-800">
                <span className="text-indigo-600">Database</span> Connection Setup
              </h1>
              <p className="text-lg text-gray-500 mt-1">
                Configure connectivity for <span className="font-semibold text-indigo-700">{companyName}</span>
              </p>
            </div>
            <Link
              to="/admin/users"
              state={{ keepFilters: true }}
              className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition shadow-md"
            >
              <FaArrowLeft className="w-4 h-4" /> Back to Users
            </Link>
          </div>
        </header>

        {/* Main Content: Two-Column Layout (Responsive) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Left Panel: Status and User Info */}
          <div className="lg:col-span-1 space-y-6">

            {/* User Info Card */}
            <div className="bg-white rounded-xl shadow-xl p-6 border border-gray-200 text-center">
              <div className="w-24 h-24 mx-auto rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-4xl font-bold mb-4 border-4 border-indigo-300 shadow-inner">
                {companyName?.[0]?.toUpperCase() || "C"}
              </div>
              <h2 className="text-xl font-bold text-gray-800 break-words">{companyName || "Company Name"}</h2>
              <p className="text-sm text-gray-500 mt-1">
                Customer Name: <span className="font-mono text-gray-600 text-xs break-all">{customerName}</span>
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Customer Email: <span className="font-mono text-gray-600 text-xs break-all">{email}</span>
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Contact Number: <span className="font-mono text-gray-600 text-xs break-all">{phoneNumber}</span>
              </p>
              <p className="text-sm text-gray-500 mt-1">
                User ID: <span className="font-mono text-gray-600 text-xs break-all">{id}</span>
              </p>
            </div>

            {/* Connection Status & Tables */}
            <div className="bg-white rounded-xl shadow-xl p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2 border-b pb-2">
                Connection Status
              </h3>

              {/* Message Feedback */}
              {message && (
                <div className="text-green-700 bg-green-50 p-3 rounded-lg border border-green-200 flex items-center gap-2 font-medium mb-3">
                  <CheckCircle className="w-5 h-5 flex-shrink-0" />
                  <span className="text-sm">{message}</span>
                </div>
              )}

              {error && (
                <div className="text-red-700 bg-red-50 p-3 rounded-lg border border-red-200 flex items-start gap-2 font-medium mb-3">
                  <XCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <span className="text-sm break-words">{error}</span>
                </div>
              )}

              {!message && !error && (
                <p className="text-sm text-gray-500 italic">
                  Save the form to test the database connection and view status here.
                </p>
              )}

              {/* Sample Tables */}
              {tables?.length > 0 && (
                <div className="mt-4 border-t pt-4">
                  <h4 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <FaDatabase className="w-4 h-4 text-indigo-500" /> Found Sample Tables
                  </h4>
                  <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-1 bg-gray-50 rounded-lg">
                    {tables.map((t, i) => (
                      <span
                        key={i}
                        className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium whitespace-nowrap"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>


          {/* Right Form Panel: Input Fields (2/3 width on desktop) */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-2xl p-8 border border-gray-200">
            <h3 className="text-2xl font-bold text-gray-700 mb-6 border-b pb-2">
              Connection & Customer Details
            </h3>

            <form onSubmit={onSubmit} className="space-y-6">

              {/* Customer Info Group */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 border-b pb-6">
                <InputGroup
                  label="Customer GST"
                  name="customerGST"
                  value={form.customerGST}
                  onChange={onChange}
                  icon={FaKey}
                  placeholder="Customer's GST"
                />
                <InputGroup
                  label="Customer Code"
                  name="customerCode"
                  value={form.customerCode}
                  icon={FaUser}
                  readOnly
                />
              </div>

              {/* Database Credentials Group */}
              <div className="space-y-6 border-b pb-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <InputGroup
                    label="Server / Host"
                    name="serverName"
                    value={form.serverName}
                    onChange={onChange}
                    icon={FaServer}
                    required
                    placeholder="e.g., 192.168.1.10:1433 or server\instance"
                  />
                  <InputGroup
                    label="Database Name"
                    name="databaseName"
                    value={form.databaseName}
                    onChange={onChange}
                    icon={FaDatabase}
                    required
                    placeholder="Client database name"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <InputGroup
                    label="DB Username"
                    name="dbUsername"
                    value={form.dbUsername}
                    onChange={onChange}
                    icon={FaUser}
                    required
                    placeholder="Database connection username"
                  />

                  <div>
                    <div className="relative">
                      <InputGroup
                        label="DB Password"
                        name="dbPassword"
                        type={showPassword ? "text" : "password"}
                        value={form.dbPassword}
                        onChange={onChange}
                        icon={FaKey}
                        required
                        placeholder="Database connection password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute right-0 top-0 h-full px-3 text-gray-400 hover:text-indigo-600 transition"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <FaEyeSlash /> : <FaEye />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Refresh Time Group */}
              <div>
                <InputGroup
                  label="Refresh Time (ms)"
                  name="refreshTime"
                  type="number"
                  min="60000"
                  value={form.refreshTime}
                  onChange={onChange}
                  icon={FaClock}
                  info="Minimum recommended value is 60000 milliseconds (60 seconds)."
                  required
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 transition text-white px-6 py-3 rounded-lg font-bold text-lg shadow-lg hover:shadow-xl disabled:bg-gray-400 disabled:cursor-not-allowed mt-8"
              >
                {saving ? (
                  <>
                    <Loader className="animate-spin w-5 h-5" /> Saving & Testing...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" /> Save & Test Connection
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
