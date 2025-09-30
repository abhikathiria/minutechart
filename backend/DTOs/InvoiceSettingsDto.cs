using System.Collections.Generic;

namespace minutechart.DTOs
{
    public class InvoiceSettingsDto
    {
        // Company Info
        public string CompanyLogoPath { get; set; } = string.Empty;
        public string CompanyName { get; set; } = string.Empty;
        public string CompanyAddress { get; set; } = string.Empty;
        public string CompanyPhone { get; set; } = string.Empty;
        public string CompanyEmail { get; set; } = string.Empty;
        public string CompanyWebsite { get; set; } = string.Empty;
        public string GstNumber { get; set; } = string.Empty;

        // Owner / Personal Info
        public string OwnerName { get; set; } = string.Empty;
        public string OwnerSignaturePath { get; set; } = string.Empty;
        public string PayableTo { get; set; } = string.Empty;
        public string OtherDetails { get; set; } = string.Empty;

        // Bank Info
        public string BankName { get; set; } = string.Empty;
        public string BranchName { get; set; } = string.Empty;
        public string BankAccountNumber { get; set; } = string.Empty;
        public string IFSC { get; set; } = string.Empty;

        // Tax Info
        public decimal CgstPercent { get; set; }
        public decimal SgstPercent { get; set; }
        public string TermsAndConditions { get; set; }

        // Display toggles
        public bool ShowGst { get; set; }
        public bool ShowBankDetails { get; set; }
        public bool ShowWebsite { get; set; }
        public bool ShowSignature { get; set; }
        public bool ShowNotes { get; set; }
        public bool ShowTermsAndConditions { get; set; }

        // Invoice Columns
        public List<InvoiceColumnDto> Columns { get; set; } = new();
    }

    public class InvoiceColumnDto
    {
        public int? Id { get; set; }                // 0 => new column
        public string ColumnKey { get; set; } = string.Empty;
        public string ColumnName { get; set; } = string.Empty;
        public bool IsVisible { get; set; }
        public int Order { get; set; }            // keeps frontend using "order"
    }
}
