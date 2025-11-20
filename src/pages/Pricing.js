import React, { useEffect, useState, useCallback } from "react";
import api from "../api";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2, Pencil, Plus, X } from "lucide-react";

// --- Utility Components (Modernized) ---

// Modernized Button with better focus and hover states
const Button = ({ children, onClick, variant = "default", className = "", ...props }) => {
  const base = "flex items-center justify-center gap-2 px-4 py-2 rounded-xl font-semibold transition-all duration-200 active:scale-[0.98] disabled:opacity-50 " + className;
  const styles = variant === "destructive"
    ? "bg-red-600 text-white shadow-red-500/30 hover:bg-red-700"
    : variant === "outline"
    ? "border border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-blue-500/50"
    : variant === "secondary"
    ? "bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-2 focus:ring-gray-500/50"
    : "bg-blue-600 text-white shadow-blue-500/30 hover:bg-blue-700 focus:ring-2 focus:ring-blue-500/50";
  return <button onClick={onClick} className={`${base} ${styles}`} {...props}>{children}</button>;
};

// Modernized Card with subtle shadow and border
const Card = ({ children, className = "" }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3 }}
    className={`bg-white rounded-xl shadow-lg hover:shadow-xl border border-gray-100 transition-shadow duration-300 ${className}`}
  >
    {children}
  </motion.div>
);

// Modernized Input
const Input = (props) => (
  <input
    {...props}
    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors duration-200 outline-none"
  />
);

// Modernized Switch (Tailwind style toggle)
const Switch = ({ checked, onCheckedChange }) => (
  <button
    onClick={() => onCheckedChange(!checked)}
    className={`${checked ? 'bg-blue-600' : 'bg-gray-200'} relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
  >
    <span
      className={`${checked ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
    />
  </button>
);

// Modernized Dialog (Modal) with backdrop and smooth animation
const Dialog = ({ open, onOpenChange, children }) => (
  <AnimatePresence>
    {open && (
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => onOpenChange(false)} // Close when clicking backdrop
      >
        <motion.div
          className="relative"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()} // Prevent closing when clicking content
        >
          {children}
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

const DialogContent = ({ children, className = "" }) => (
  <div className={`p-6 bg-white rounded-2xl shadow-2xl w-full max-w-xl ${className}`}>
    {children}
  </div>
);

const DialogHeader = ({ children }) => <div className="mb-4">{children}</div>;
const DialogTitle = ({ children }) => <h2 className="text-2xl font-bold text-gray-800">{children}</h2>;


// --- Main Pricing Component ---

export default function Pricing() {
  const [plans, setPlans] = useState([]);
  const [open, setOpen] = useState(false);
  const [editPlan, setEditPlan] = useState(null);
  const [loading, setLoading] = useState(true);

  const initialPlanState = {
    name: "",
    monthlyPrice: 0,
    annualPrice: 0,
    dashboardLimit: 0,
    refreshRateMinutes: 0,
    excelExport: false,
    prioritySupport: false,
    dashboardAddonEnabled: false,
    addonPrice: 0,
    addonDashboards: 0
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/pricing");
      setPlans(res.data);
    } catch (error) {
      console.error("Failed to load plans:", error);
      // Handle error display
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async () => {
    if (!editPlan.name || editPlan.monthlyPrice === undefined) {
      alert("Plan Name and Monthly Price are required.");
      return;
    }

    try {
      if (editPlan.id) {
        await api.put(`/pricing/${editPlan.id}`, editPlan);
      } else {
        await api.post(`/pricing`, editPlan);
      }
      setOpen(false);
      load();
    } catch (error) {
      console.error("Failed to save plan:", error);
      alert(`Failed to save plan: ${error.message}`);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this pricing plan?")) {
      try {
        await api.delete(`/pricing/${id}`);
        load();
      } catch (error) {
        console.error("Failed to delete plan:", error);
        alert(`Failed to delete plan: ${error.message}`);
      }
    }
  };

  const openEditor = (plan) => {
    setEditPlan(plan ? { ...plan } : initialPlanState);
    setOpen(true);
  };

  const handleInputChange = (e, key, type = 'text') => {
    let value = e.target.value;
    if (type === 'number') {
      value = Number(value);
    }
    setEditPlan({ ...editPlan, [key]: value });
  };

  const PlanEditor = () => (
    <div className="space-y-5">
      <Input
        placeholder="Plan Name"
        value={editPlan.name || ""}
        onChange={(e) => handleInputChange(e, 'name')}
      />

      <div className="grid grid-cols-2 gap-4">
        <Input
          type="number"
          value={editPlan.monthlyPrice || 0}
          placeholder="Monthly Price (₹)"
          onChange={(e) => handleInputChange(e, 'monthlyPrice', 'number')}
        />
        <Input
          type="number"
          value={editPlan.annualPrice || 0}
          placeholder="Annual Price (₹)"
          onChange={(e) => handleInputChange(e, 'annualPrice', 'number')}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          type="number"
          value={editPlan.dashboardLimit || 0}
          placeholder="Dashboard Limit"
          onChange={(e) => handleInputChange(e, 'dashboardLimit', 'number')}
        />
        <Input
          type="number"
          value={editPlan.refreshRateMinutes || 0}
          placeholder="Refresh Rate (min)"
          onChange={(e) => handleInputChange(e, 'refreshRateMinutes', 'number')}
        />
      </div>

      {/* Feature Toggles */}
      <div className="space-y-3 pt-2">
        <FeatureToggle
          label="Excel Export"
          checked={editPlan.excelExport}
          onCheckedChange={(v) => setEditPlan({ ...editPlan, excelExport: v })}
        />
        <FeatureToggle
          label="Priority Support"
          checked={editPlan.prioritySupport}
          onCheckedChange={(v) => setEditPlan({ ...editPlan, prioritySupport: v })}
        />
        <FeatureToggle
          label="Enable Addons"
          checked={editPlan.dashboardAddonEnabled}
          onCheckedChange={(v) => setEditPlan({ ...editPlan, dashboardAddonEnabled: v })}
        />
      </div>

      {/* Addon Fields (Conditional) */}
      <AnimatePresence>
        {editPlan.dashboardAddonEnabled && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-2 gap-4 overflow-hidden pt-2"
          >
            <Input
              type="number"
              value={editPlan.addonPrice || 0}
              placeholder="Addon Price (₹)"
              onChange={(e) => handleInputChange(e, 'addonPrice', 'number')}
            />
            <Input
              type="number"
              value={editPlan.addonDashboards || 0}
              placeholder="Addon Dashboards"
              onChange={(e) => handleInputChange(e, 'addonDashboards', 'number')}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <Button className="w-full mt-6" onClick={handleSave}>
        {editPlan.id ? "Update Plan" : "Create Plan"}
      </Button>
    </div>
  );

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b pb-4">
        <h1 className="text-3xl font-extrabold text-gray-900">✨ Manage Pricing Plans</h1>
        <Button onClick={() => openEditor(null)} className="mt-4 sm:mt-0 shadow-lg">
          <Plus size={18} /> Add New Plan
        </Button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center h-40 text-gray-500">
          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Loading Plans...
        </div>
      )}

      {/* Empty State */}
      {!loading && plans.length === 0 && (
        <div className="text-center p-20 bg-gray-50 rounded-xl border border-dashed">
          <p className="text-gray-500 mb-4">No pricing plans found.</p>
          <Button onClick={() => openEditor(null)} variant="outline">
            Create the First Plan
          </Button>
        </div>
      )}

      {/* Plan List (Table for Desktop, Cards for Mobile) */}
      {!loading && plans.length > 0 && (
        <>
          {/* Desktop Table View */}
          <div className="hidden lg:block">
            <PlanTable plans={plans} openEditor={openEditor} handleDelete={handleDelete} />
          </div>

          {/* Mobile Card View */}
          <div className="lg:hidden grid grid-cols-1 md:grid-cols-2 gap-6">
            <AnimatePresence>
              {plans.map((p) => (
                <PlanCard key={p.id} plan={p} openEditor={openEditor} handleDelete={handleDelete} />
              ))}
            </AnimatePresence>
          </div>
        </>
      )}

      {/* Editor Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <div className="absolute top-4 right-4">
            <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
              <X size={24} />
            </button>
          </div>
          <DialogHeader>
            <DialogTitle>{editPlan?.id ? "Edit Pricing Plan" : "Create New Pricing Plan"}</DialogTitle>
          </DialogHeader>
          {editPlan && <PlanEditor />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// --- Sub-Components for Display ---

const FeatureToggle = ({ label, checked, onCheckedChange }) => (
  <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-100">
    <span className="font-medium text-gray-700">{label}</span>
    <Switch checked={checked} onCheckedChange={onCheckedChange} />
  </div>
);

const PlanCard = ({ plan: p, openEditor, handleDelete }) => (
  <Card className="p-6 h-full flex flex-col justify-between">
    <div className="space-y-4">
      <h3 className="text-2xl font-bold text-blue-600">{p.name}</h3>
      <div className="grid grid-cols-2 gap-y-2 text-sm text-gray-600">
        <PlanDetail label="Monthly Price" value={`₹${p.monthlyPrice}`} />
        <PlanDetail label="Annual Price" value={`₹${p.annualPrice}`} />
        <PlanDetail label="Dashboards" value={p.dashboardLimit} />
        <PlanDetail label="Refresh Rate" value={`${p.refreshRateMinutes} min`} />
        <PlanDetail label="Excel Export" value={p.excelExport ? "Yes" : "No"} isFeature={true} />
        <PlanDetail label="Priority Support" value={p.prioritySupport ? "Yes" : "No"} isFeature={true} />
        <PlanDetail
          label="Addons"
          value={p.dashboardAddonEnabled ? `Yes (+${p.addonDashboards})` : "No"}
          isFeature={true}
        />
      </div>
    </div>
    <div className="flex gap-3 mt-6 pt-4 border-t border-gray-100">
      <Button onClick={() => openEditor(p)} className="flex-1" variant="outline"><Pencil size={16} /> Edit</Button>
      <Button onClick={() => handleDelete(p.id)} className="flex-1" variant="destructive"><Trash2 size={16} /> Delete</Button>
    </div>
  </Card>
);

const PlanDetail = ({ label, value, isFeature = false }) => (
  <div className="flex items-center">
    <span className={`w-1/2 ${isFeature ? 'font-medium' : 'text-gray-500'}`}>{label}:</span>
    <span className={`w-1/2 ${isFeature ? (value === 'Yes' ? 'text-green-600 font-semibold' : 'text-red-500') : 'text-gray-900 font-medium'}`}>{value}</span>
  </div>
);


const PlanTable = ({ plans, openEditor, handleDelete }) => (
  <Card className="p-0 overflow-hidden">
    <table className="min-w-full divide-y divide-gray-200">
      <thead className="bg-gray-50">
        <tr>
          {['Plan Name', 'Monthly', 'Annual', 'Dashboards', 'Refresh (min)', 'Export', 'Support', 'Addon'].map((header) => (
            <th key={header} className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
              {header}
            </th>
          ))}
          <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-200">
        <AnimatePresence>
          {plans.map((p) => (
            <motion.tr
              key={p.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.2 }}
              className="hover:bg-gray-50 transition-colors"
            >
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{p.name}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">₹{p.monthlyPrice}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">₹{p.annualPrice}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{p.dashboardLimit}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{p.refreshRateMinutes}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                <StatusPill status={p.excelExport} />
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                <StatusPill status={p.prioritySupport} />
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {p.dashboardAddonEnabled ? `+${p.addonDashboards}` : 'No'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div className="flex justify-end space-x-2">
                  <Button onClick={() => openEditor(p)} variant="secondary" className="p-2 h-auto w-auto">
                    <Pencil size={16} />
                  </Button>
                  <Button onClick={() => handleDelete(p.id)} variant="destructive" className="p-2 h-auto w-auto">
                    <Trash2 size={16} />
                  </Button>
                </div>
              </td>
            </motion.tr>
          ))}
        </AnimatePresence>
      </tbody>
    </table>
  </Card>
);

const StatusPill = ({ status }) => (
  <span
    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
      status ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
    }`}
  >
    {status ? 'Yes' : 'No'}
  </span>
);