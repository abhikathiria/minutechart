import React, { useState, useEffect } from "react";
import api from "../api";
import { toast } from "react-hot-toast";
import { Loader2 } from "lucide-react";

function AdminPayoutDetails() {
  const [form, setForm] = useState({
    accountHolderName: "",
    bankAccountNumber: "",
    ifsc: "",
    upiId: "",
  });

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    api
      .get("/reseller-payment/me")
      .then((res) => {
        setForm(res.data || {});
      })
      .catch(() => toast.error("Failed to load payout details"))
      .finally(() => setInitialLoading(false));
  }, []);

  const save = () => {
    setLoading(true);
    api
      .post("/reseller-payment/save", form)
      .then(() => toast.success("Saved"))
      .catch(() => toast.error("Failed to save"))
      .finally(() => setLoading(false));
  };

  const field = (label, key, placeholder = "") => (
    <div className="space-y-1">
      <label className="text-sm font-medium text-gray-300">{label}</label>
      <input
        type="text"
        placeholder={placeholder}
        className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-gray-200 
        focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/30 outline-none transition"
        value={form[key] || ""}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#06070a] to-[#0b1220] p-6 md:p-10 text-white flex justify-center">
      <div className="w-full max-w-2xl bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-xl">
        <h2 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-red-300 to-pink-400 mb-6">
          Payout Details
        </h2>

        {initialLoading ? (
          <div className="flex items-center gap-3 text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin" />
            Loading…
          </div>
        ) : (
          <>
            <div className="grid gap-6">
              {field("Account Holder Name", "accountHolderName", "e.g. John Doe")}
              {field("Bank Account Number", "bankAccountNumber", "e.g. 123456789")}
              {field("IFSC Code", "ifsc", "e.g. HDFC0001234")}
            </div>

            <div className="my-6 flex items-center gap-3">
              <div className="flex-grow border-t border-white/10"></div>
              <span className="text-gray-400 text-sm">OR</span>
              <div className="flex-grow border-t border-white/10"></div>
            </div>

            {field("UPI ID", "upiId", "e.g. johndoe@upi")}

            <button
              onClick={save}
              disabled={loading}
              className="mt-8 w-full py-3 rounded-xl bg-gradient-to-r from-red-600 to-pink-600 text-white 
              font-semibold text-lg shadow-lg hover:opacity-90 active:scale-[0.98] transition disabled:opacity-50 flex justify-center items-center gap-2"
            >
              {loading && <Loader2 className="w-5 h-5 animate-spin" />}
              {loading ? "Saving…" : "Save Details"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default AdminPayoutDetails;
