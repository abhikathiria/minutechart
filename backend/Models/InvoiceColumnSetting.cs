using System.ComponentModel.DataAnnotations.Schema;

namespace minutechart.Models
{
    public class InvoiceColumnSetting
    {
        public int Id { get; set; }

        // FK to CompanyInvoiceSetting
        public int CompanyInvoiceSettingId { get; set; }

        public string ColumnKey { get; set; } = string.Empty;   // e.g. "srno", "details", "amount"
        public string ColumnName { get; set; } = string.Empty;  // label shown in UI
        public bool IsVisible { get; set; } = true;

        // Use SortOrder to avoid collision with LINQ method names
        public int SortOrder { get; set; } = 0;

        [ForeignKey(nameof(CompanyInvoiceSettingId))]
        public CompanyInvoiceSetting? CompanyInvoiceSetting { get; set; }
    }
}
