using System;
using System.Collections.Generic;

namespace minutechart.Models
{
    public class CompanyInvoiceSetting
    {
        public int Id { get; set; }

        // ---------------- Company Details ----------------
        public string CompanyLogoPath { get; set; } = string.Empty;
        public string CompanyName { get; set; } = string.Empty;
        public string CompanyAddress { get; set; } = string.Empty;
        public string CompanyPhone { get; set; } = string.Empty;
        public string CompanyEmail { get; set; } = string.Empty;
        public string CompanyWebsite { get; set; } = string.Empty;
        public string GstNumber { get; set; } = string.Empty;

        // ---------------- Owner / Personal Details ----------------
        public string OwnerName { get; set; } = string.Empty;
        public string OwnerSignaturePath { get; set; } = string.Empty;
        public string PayableTo { get; set; } = string.Empty;
        public string OtherDetails { get; set; } = string.Empty;

        // ---------------- Bank Details ----------------
        public string BankName { get; set; } = string.Empty;
        public string BranchName { get; set; } = string.Empty;
        public string BankAccountNumber { get; set; } = string.Empty;
        public string IFSC { get; set; } = string.Empty;

        // ---------------- Amount / Tax ----------------
        public decimal CgstPercent { get; set; } = 9m;
        public decimal SgstPercent { get; set; } = 9m;

        // ---------------- Terms & Conditions ----------------
        public string TermsAndConditions { get; set; } = string.Empty;

        // ---------------- Toggles / Options ----------------
        public bool ShowGst { get; set; } = true;
        public bool ShowBankDetails { get; set; } = true;
        public bool ShowWebsite { get; set; } = true;
        public bool ShowSignature { get; set; } = true;
        public bool ShowNotes { get; set; } = true;
        public bool ShowTermsAndConditions { get; set; } = true;

        // ---------------- Invoice Columns ----------------
        public List<InvoiceColumnSetting> Columns { get; set; } = new List<InvoiceColumnSetting>();

        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
