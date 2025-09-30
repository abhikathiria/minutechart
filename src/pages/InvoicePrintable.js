import React, { useEffect, useState } from "react";
import { useParams, useLocation } from "react-router-dom";
import axios from "../api";

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

export default function InvoicePrintable() {
  const { invoiceId } = useParams();
  const query = useQuery();
  const token = query.get("token");

  const [inv, setInv] = useState(null);

  useEffect(() => {
    if (!token || !invoiceId) return;

    const fetchData = async () => {
      try {
        const res = await axios.get(`/subscription/invoice-data/${invoiceId}`, {
          params: { token },
        });
        setInv(res.data);
      } catch (err) {
        console.error("Failed to fetch invoice data", err);
      }
    };

    fetchData();
  }, [token, invoiceId]);

  if (!inv) return <div style={{ padding: 30 }}>Loading invoice...</div>;

  const logoUrl = inv.LogoUrl || "/minutechartlogo.png";

  return (
    <div style={{ fontFamily: "'Noto Sans', Arial, sans-serif", color: "#222" }}>
      <style>{`
        body { margin:0; padding:0; }
        .header { display:flex; width:100%; color:white; }
        .header-left { flex:2; background:#000; padding:22px; }
        .header-left h2 { margin:0; font-size:18px; }
        .header-left p { margin:3px 0; font-size:11px; color:#fff; }
        .header-right { flex:1; background:#DAA520; display:flex; justify-content:center; align-items:center; font-size:28px; font-weight:700; }
        .section { padding:24px; }
        .row { display:flex; justify-content:space-between; margin-bottom:20px; }
        .gold { color:#DAA520; font-weight:700; }
        table { width:100%; border-collapse:collapse; font-size:13px; }
        table th, table td { border:1px solid #ddd; padding:10px; text-align:center; }
        table th { background:#000; color:#fff; font-weight:700; }
        .totals { width:38%; float:right; margin-top:10px; font-size:13px; }
        .totals td { padding:8px; }
        .terms { margin-top:40px; font-size:12px; line-height:1.4; color:#333; }
        .signature { margin-top:60px; text-align:right; font-size:14px; }
        .footer { background:#000; color:#fff; text-align:center; padding:18px; margin-top:40px; }
      `}</style>

      {/* Header */}
      <div className="header">
        <div className="header-left">
          <h2>New Tech Infosol</h2>
          <p>+91-261-2979903</p>
          <p>info@newtechinfosol.in</p>
          <p>Surat-395007</p>
        </div>
        <div className="header-right">INVOICE</div>
      </div>

      {/* Invoice Info */}
      <div className="section">
        <div className="row">
          <div>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>INVOICE TO:</div>
            <div className="gold" style={{ fontSize: 16 }}>
              {inv.user.customerName}
            </div>
            <div>Company: {inv.user.companyName}</div>
            <div>Phone: {inv.user.phone}</div>
            <div>Email: {inv.user.email}</div>
          </div>

          <div style={{ textAlign: "right" }}>
            <div style={{ fontWeight: 700 }}>INVOICE NO: #{inv.InvoiceNumber}</div>
            <div>
              Invoice Date:{" "}
              {new Date(inv.PaymentDate).toLocaleDateString("en-GB")}
            </div>
            {inv.PlanEndDate && (
              <div>
                Due Date: {new Date(inv.PlanEndDate).toLocaleDateString("en-GB")}
              </div>
            )}
          </div>
        </div>

        {/* Items Table */}
        <table>
          <thead>
            <tr>
              <th style={{ width: "6%" }}>SL NO</th>
              <th style={{ width: "56%", textAlign: "left", paddingLeft: 12 }}>
                DESCRIPTION
              </th>
              <th style={{ width: "12%" }}>PRICE</th>
              <th style={{ width: "8%" }}>QTY.</th>
              <th style={{ width: "18%" }}>TOTAL</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>1</td>
              <td style={{ textAlign: "left", paddingLeft: 12 }}>
                {inv.plan.name} ({inv.plan.durationDays} days)
              </td>
              <td>₹{Number(inv.Amount).toFixed(2)}</td>
              <td>1</td>
              <td>₹{Number(inv.Amount).toFixed(2)}</td>
            </tr>

            <tr>
              <td colSpan={4} style={{ textAlign: "left", fontWeight: 700, paddingLeft: 12 }}>
                THANK YOU FOR YOUR BUSINESS WITH US!
              </td>
              <td style={{ fontWeight: 700, textAlign: "right", paddingRight: 12 }}>
                GRAND TOTAL<br />₹{Number(inv.Amount).toFixed(2)}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Totals */}
        <table className="totals">
          <tbody>
            <tr>
              <td style={{ textAlign: "left" }}>TAX (0%)</td>
              <td style={{ textAlign: "right" }}>₹0.00</td>
            </tr>
            <tr>
              <td style={{ textAlign: "left", fontWeight: 700 }}>NET TOTAL</td>
              <td style={{ textAlign: "right", fontWeight: 700 }}>
                ₹{Number(inv.Amount).toFixed(2)}
              </td>
            </tr>
          </tbody>
        </table>

        <div style={{ clear: "both" }} />

        {/* Terms */}
        <div className="terms">
          <div style={{ fontWeight: 700 }}>Terms & Conditions:</div>
          <div>
            Once the subscription is activated you cannot deactivate it. We look forward to future
            projects!
          </div>
        </div>

        {/* Signature */}
        <div className="signature">
          <div>__________________________</div>
          <div>Signature</div>
        </div>
      </div>

      {/* Footer */}
      <div className="footer">
        <img src={logoUrl} alt="logo" style={{ height: 36 }} />
      </div>
    </div>
  );
}
