// DynamicPlanInvoicePdfGenerator.cs
using System;
using System.IO;
using System.Net;
using System.Linq;
using iTextSharp.text;
using iTextSharp.text.pdf;
using minutechart.Models;
using minutechart.Helpers;

public static class DynamicPlanInvoicePdfGenerator
{
    private static readonly string DefaultLogoPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "images", "default", "company-logo-default.png");
    private static readonly string DefaultSignaturePath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "images", "default", "owner-signature-default.png");

    public static byte[] GeneratePdf(CompanyInvoiceSetting company, PlanInvoice invoice, AppUser user)
    {
        using (var ms = new MemoryStream())
        {
            var document = new Document(PageSize.A4, 25, 25, 20, 20);
            PdfWriter.GetInstance(document, ms);
            document.Open();

            var fontPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "fonts", "NotoSans-Regular.ttf");
            Console.WriteLine($"Current Directory: {Directory.GetCurrentDirectory()}");
            Console.WriteLine($"Font path: {fontPath}, Exists: {File.Exists(fontPath)}");
            var bf = BaseFont.CreateFont(fontPath, BaseFont.IDENTITY_H, BaseFont.EMBEDDED);

            // Fonts
            var regular = new Font(bf, 9, Font.NORMAL, BaseColor.BLACK);
            var bold = new Font(bf, 9, Font.BOLD, BaseColor.BLACK);
            var whiteRegular = new Font(bf, 9, Font.NORMAL, BaseColor.WHITE);
            var whiteBold = new Font(bf, 9, Font.BOLD, BaseColor.WHITE);
            var titleFont = new Font(bf, 16, Font.BOLD, BaseColor.BLACK);
            var orange = new Font(bf, 9, Font.BOLD, new BaseColor(255, 153, 0));
            var orangeBold = new Font(bf, 9, Font.BOLD, new BaseColor(255, 153, 0));

            // ---------------- Header ----------------
            PdfPTable headerTable = new PdfPTable(2);
            headerTable.WidthPercentage = 100;
            headerTable.SetWidths(new float[] { 1f, 3f });

            // Logo
            if (!string.IsNullOrEmpty(company.CompanyLogoPath))
            {
                var logoImg = Image.GetInstance(new Uri(company.CompanyLogoPath));
                logoImg.ScaleToFit(80f, 80f);

                headerTable.AddCell(new PdfPCell(logoImg)
                {
                    Border = Rectangle.NO_BORDER,
                    HorizontalAlignment = Element.ALIGN_LEFT
                });
            }
            else
            {
                var fallback = Image.GetInstance(DefaultLogoPath);
                fallback.ScaleToFit(80f, 80f);
                headerTable.AddCell(new PdfPCell(fallback) { Border = Rectangle.NO_BORDER });
            }

            // Company Info
            var companyInfo = new Paragraph();
            companyInfo.Add(new Chunk(company.CompanyName + "\n", bold));
            companyInfo.Add(new Chunk(company.CompanyAddress + "\n", regular));
            companyInfo.Add(new Chunk(company.CompanyPhone + "\n", regular));
            companyInfo.Add(new Chunk(company.CompanyEmail + "\n", regular));
            if (company.ShowWebsite && !string.IsNullOrEmpty(company.CompanyWebsite))
                companyInfo.Add(new Chunk(company.CompanyWebsite + "\n", regular));
            if (!string.IsNullOrEmpty(company.GstNumber))
                companyInfo.Add(new Chunk("GSTN:: " + company.GstNumber + "\n", regular));

            headerTable.AddCell(new PdfPCell(companyInfo)
            {
                Border = Rectangle.NO_BORDER,
                HorizontalAlignment = Element.ALIGN_LEFT,
                PaddingTop = 4f,
                PaddingBottom = 4f
            });
            document.Add(headerTable);

            // Black line separator
            var blackLine = new Paragraph(new Chunk(new iTextSharp.text.pdf.draw.LineSeparator(1f, 100f, BaseColor.BLACK, Element.ALIGN_CENTER, -1)));
            document.Add(blackLine);

            // ---------------- Title (Centered) ----------------
            Paragraph title = new Paragraph("INVOICE", titleFont);
            title.Alignment = Element.ALIGN_CENTER;
            document.Add(title);
            document.Add(new Paragraph(" "));

            // ---------------- Bill To + Invoice Info ----------------
            PdfPTable billTable = new PdfPTable(2);
            billTable.WidthPercentage = 100;
            billTable.SetWidths(new float[] { 3f, 1.5f });

            // Left - Bill To
            var billTo = new Paragraph();
            billTo.Add(new Chunk("Bill To\n", bold));
            billTo.Add(new Chunk(user.CustomerName + "\n", regular));
            billTo.Add(new Chunk(user.CompanyName + "\n", regular));
            billTo.Add(new Chunk(user.Email + "\n", regular));
            billTo.Add(new Chunk(user.PhoneNumber + "\n", regular));
            if (!string.IsNullOrEmpty(user.GST))
                billTo.Add(new Chunk("GSTN:: " + user.GST + "\n", regular));
            billTable.AddCell(new PdfPCell(billTo)
            {
                Border = Rectangle.NO_BORDER,
                HorizontalAlignment = Element.ALIGN_LEFT,
                PaddingTop = 4f,
                PaddingBottom = 4f
            });

            // Right - Invoice Number + Date in orange
            var invoiceInfo = new Paragraph();
            invoiceInfo.Add(new Chunk(invoice.InvoiceNumber + "\n", orange));
            invoiceInfo.Add(new Chunk(invoice.PaymentDate.ToString("dd-MM-yyyy") + "\n", orange));
            billTable.AddCell(new PdfPCell(invoiceInfo)
            {
                Border = Rectangle.NO_BORDER,
                HorizontalAlignment = Element.ALIGN_RIGHT,
                PaddingTop = 4f,
                PaddingBottom = 4f
            });

            document.Add(billTable);
            document.Add(new Paragraph(" "));

            // ---------------- Items Table ----------------
            var visibleColumns = company.Columns
                .Where(c => c.IsVisible)
                .OrderBy(c => c.SortOrder)
                .ToList();

            PdfPTable itemsTable = new PdfPTable(visibleColumns.Count);
            itemsTable.WidthPercentage = 100;

            // Assign widths dynamically (fallback equal widths if not predefined)
            float[] widths = visibleColumns.Select(c =>
            {
                return c.ColumnKey.ToLower() switch
                {
                    "srno" => 1f,
                    "details" => 4f,
                    "quantity" => 1f,
                    "rate" => 2f,
                    "amount" => 2f,
                    _ => 2f
                };
            }).ToArray();
            itemsTable.SetWidths(widths);

            // Headers with alignment rules
            foreach (var col in visibleColumns)
            {
                int align = Element.ALIGN_LEFT; // default

                switch (col.ColumnKey.ToLower())
                {
                    case "srno": align = Element.ALIGN_CENTER; break;
                    case "details": align = Element.ALIGN_LEFT; break;
                    case "quantity":
                    case "rate":
                    case "amount":
                        align = Element.ALIGN_RIGHT; break;
                }

                AddTableHeader(itemsTable, col.ColumnName, whiteBold, align);
            }

            decimal finalAmountCharged = invoice.NetAmount; // Total amount user paid
            decimal prorationCredit = invoice.ProrationCredit;
            decimal gstPercentTotal = company.SgstPercent + company.CgstPercent;

            /* * The Plan's gross value for this billing period (before tax split or proration).
             * This value will be used for the "Rate" and "Amount" line items.
             */
            decimal basePriceBeforeCredit = finalAmountCharged + prorationCredit;


            // 2. Determine Taxable Value (The value to calculate GST on)
            decimal taxableValue;
            decimal sgstValue = 0;
            decimal cgstValue = 0;

            if (company.ShowGst && gstPercentTotal > 0)
            {
                // A. Calculate the exact price before GST
                decimal preTaxExact = basePriceBeforeCredit / (1 + (gstPercentTotal / 100m));

                // B. Calculate the exact total tax amount required:
                decimal exactTaxTotal = basePriceBeforeCredit - preTaxExact;

                // C. Split the exact tax into two equal components and round the tax values.
                decimal exactTaxSplit = exactTaxTotal / 2m;

                // Set SGST and CGST equal
                sgstValue = Math.Round(exactTaxSplit, 2);
                cgstValue = Math.Round(exactTaxSplit, 2);

                // D. Re-calculate the Taxable Value (Sub Total) to enforce the exact sum.
                // This value absorbs the small remainder to ensure the entire sum is exact.
                taxableValue = basePriceBeforeCredit - (sgstValue + cgstValue);

                // Example: 299.00 gross, 18% tax (9% split)
                // preTaxExact = 253.38983...
                // exactTaxTotal = 45.61016...
                // exactTaxSplit = 22.80508...
                // sgstValue = 22.81
                // cgstValue = 22.81
                // taxableValue = 299.00 - 45.62 = 253.38
                // The expected output is achieved: 253.38 + 22.81 + 22.81 = 299.00
            }
            else
            {
                // If GST is hidden, the Taxable Value is considered the full Base Price.
                taxableValue = basePriceBeforeCredit;
            }

            // 3. Determine the final Sub Total value to display
            // Sub Total = Amount (Rate x Quantity), which should be the price before tax/credit display logic.
            // It always equals the single line item amount, which we set to basePriceBeforeCredit.
            decimal subTotalDisplay = taxableValue;

            // Grand Total
            decimal grandTotal = 0;

            // Start with Sub Total
            grandTotal = subTotalDisplay;

            // Add GST if applicable
            if (company.ShowGst)
            {
                grandTotal += sgstValue + cgstValue;
                // Recalculate based on fixed rules: GrandTotal = SubTotal + SGST + CGST
            }

            // Subtract Proration Credit if applicable
            if (prorationCredit > 0)
            {
                grandTotal -= prorationCredit;
                // Recalculate based on fixed rules: GrandTotal = (SubTotal + GST) - ProrationCredit
            }

            // Final cleanup
            grandTotal = Math.Max(0, Math.Round(grandTotal, 2));


            // Single Line Item Example
            foreach (var col in visibleColumns)
            {
                Phrase cellPhrase;

                switch (col.ColumnKey.ToLower())
                {
                    case "srno":
                        cellPhrase = new Phrase("1", regular);
                        itemsTable.AddCell(new PdfPCell(cellPhrase)
                        {
                            HorizontalAlignment = Element.ALIGN_CENTER,
                            VerticalAlignment = Element.ALIGN_MIDDLE
                        });
                        break;

                    case "details":
                        {
                            var planDetails = new Paragraph();

                            // Plan Name in bold
                            planDetails.Add(new Chunk($"{invoice.Plan?.Name ?? ""} Subscription Plan", bold));

                            // Duration
                            if (invoice.Plan != null)
                                planDetails.Add(new Chunk($"\nBilling Cycle: {invoice.BillingCycle} days\n", regular));

                            // Plan Start & End Dates
                            if (invoice.PlanStartDate.HasValue && invoice.PlanEndDate.HasValue)
                            {
                                planDetails.Add(new Chunk($"Start Date: {invoice.PlanStartDate.Value:dd-MM-yyyy}\n", regular));
                                planDetails.Add(new Chunk($"End Date: {invoice.PlanEndDate.Value:dd-MM-yyyy}\n", regular));
                            }

                            if (invoice.Plan != null)
                            {
                                if (invoice.Plan.DashboardLimit > 0)
                                    planDetails.Add(new Chunk($"DashboardLimit: {invoice.Plan.DashboardLimit}\n", regular));

                                // 2. Refresh Rate Minutes (int): Remove the extra `?.` before .ToString()
                                if (invoice.Plan.RefreshRateMinutes > 0)
                                    planDetails.Add(new Chunk($"Refresh Rate (in min): {invoice.Plan.RefreshRateMinutes}\n", regular));

                                // 3. Excel Export (bool): Check bool directly
                                if (invoice.Plan.ExcelExport)
                                    planDetails.Add(new Chunk($"Excel Export: {invoice.Plan.ExcelExport}\n", regular));

                                // 4. Priority Support (bool): Check bool directly
                                if (invoice.Plan.PrioritySupport)
                                    planDetails.Add(new Chunk($"Priority Support: {invoice.Plan.PrioritySupport}\n", regular));

                                // 5. Dashboard Addon Enabled (bool)
                                if (invoice.Plan.DashboardAddonEnabled)
                                {
                                    // AddonDashboards and AddonPrice are non-nullable and accessed directly after null check
                                    planDetails.Add(new Chunk($"Dashboard Add Ons: {invoice.Plan.AddonDashboards} @ ₹ {invoice.Plan.AddonPrice:N2}", regular));
                                }
                            }

                            var cell = new PdfPCell(planDetails)
                            {
                                HorizontalAlignment = Element.ALIGN_LEFT,
                                VerticalAlignment = Element.ALIGN_TOP,
                                PaddingTop = 4f,
                                PaddingBottom = 4f
                            };

                            itemsTable.AddCell(cell);
                            break;
                        }

                    case "quantity":
                        cellPhrase = new Phrase("1", bold);
                        itemsTable.AddCell(new PdfPCell(cellPhrase)
                        {
                            HorizontalAlignment = Element.ALIGN_RIGHT,
                            VerticalAlignment = Element.ALIGN_MIDDLE
                        });
                        break;

                    case "rate":
                        cellPhrase = new Phrase("₹ " + taxableValue.ToString("N2"), bold);
                        itemsTable.AddCell(new PdfPCell(cellPhrase)
                        {
                            HorizontalAlignment = Element.ALIGN_RIGHT,
                            VerticalAlignment = Element.ALIGN_MIDDLE
                        });
                        break;

                    case "amount":
                        cellPhrase = new Phrase("₹ " + taxableValue.ToString("N2"), bold);
                        itemsTable.AddCell(new PdfPCell(cellPhrase)
                        {
                            HorizontalAlignment = Element.ALIGN_RIGHT,
                            VerticalAlignment = Element.ALIGN_MIDDLE
                        });
                        break;

                    default:
                        cellPhrase = new Phrase("-", regular);
                        itemsTable.AddCell(new PdfPCell(cellPhrase)
                        {
                            VerticalAlignment = Element.ALIGN_MIDDLE
                        });
                        break;
                }
            }

            document.Add(itemsTable);

            // ---------------- Orange Box: Terms & Conditions + Totals ----------------
            PdfPTable orangeBox = new PdfPTable(1);
            orangeBox.WidthPercentage = 100;

            // ---------- Top orange line ----------
            PdfPCell topLine = new PdfPCell(new Phrase(new Chunk(
                new iTextSharp.text.pdf.draw.LineSeparator(1f, 100f, new BaseColor(255, 153, 0), Element.ALIGN_CENTER, -2)
            )))
            {
                Border = Rectangle.NO_BORDER,
                Padding = 0
            };
            orangeBox.AddCell(topLine);

            // ---------- Header Row: Terms & SubTotal ----------
            PdfPTable headerRow = new PdfPTable(2);
            headerRow.WidthPercentage = 100;
            headerRow.SetWidths(new float[] { 2f, 1f });

            if (company.ShowTermsAndConditions)
            {
                // Left: Terms & Conditions Header
                PdfPCell termsHeader = new PdfPCell(new Phrase("Terms & Conditions", bold))
                {
                    Border = Rectangle.NO_BORDER,
                    HorizontalAlignment = Element.ALIGN_LEFT,
                    VerticalAlignment = Element.ALIGN_MIDDLE,
                    PaddingTop = 0,
                    PaddingBottom = 0
                };
                headerRow.AddCell(termsHeader);
            }
            else
            {
                // Empty cell if hidden, so subtotal still aligns right
                headerRow.AddCell(new PdfPCell() { Border = Rectangle.NO_BORDER });
            }

            // Right: SubTotal Table
            PdfPTable subTotalTable = new PdfPTable(2);
            subTotalTable.WidthPercentage = 100;
            subTotalTable.SetWidths(new float[] { 1.3f, 1f });
            subTotalTable.DefaultCell.Border = Rectangle.NO_BORDER;
            subTotalTable.DefaultCell.PaddingTop = 0;
            subTotalTable.DefaultCell.PaddingBottom = 0;

            AddTotalRow(subTotalTable, "Sub Total", subTotalDisplay, bold, bold);

            PdfPCell subTotalCell = new PdfPCell(subTotalTable)
            {
                Border = Rectangle.NO_BORDER,
                HorizontalAlignment = Element.ALIGN_RIGHT,
                VerticalAlignment = Element.ALIGN_MIDDLE, // Center vertically
                PaddingTop = 0,
                PaddingBottom = 0
            };

            // Add cells to headerRow
            headerRow.AddCell(subTotalCell);

            // Wrap headerRow into a single cell to place inside orangeBox
            PdfPCell headerRowCell = new PdfPCell(headerRow)
            {
                Border = Rectangle.NO_BORDER,
                PaddingTop = 2f, // small top padding
                PaddingBottom = 2f, // small bottom padding
                FixedHeight = 25f // ensures it has space between top and bottom orange lines
            };
            orangeBox.AddCell(headerRowCell);

            // ---------- Bottom orange line ----------
            PdfPCell bottomLine = new PdfPCell(new Phrase(new Chunk(
                new iTextSharp.text.pdf.draw.LineSeparator(1f, 100f, new BaseColor(255, 153, 0), Element.ALIGN_CENTER, -2)
            )))
            {
                Border = Rectangle.NO_BORDER,
                Padding = 0
            };
            orangeBox.AddCell(bottomLine);

            // ---------- Content Row: Terms bullets + Remaining totals ----------
            PdfPTable contentRow = new PdfPTable(2);
            contentRow.WidthPercentage = 100;
            contentRow.SetWidths(new float[] { 2f, 1f });

            if (company.ShowTermsAndConditions)
            {
                // Left: Terms bullets
                PdfPTable termsTable = new PdfPTable(1);
                termsTable.WidthPercentage = 100;
                termsTable.DefaultCell.Border = Rectangle.NO_BORDER;
                termsTable.DefaultCell.PaddingTop = 2f;
                termsTable.DefaultCell.PaddingBottom = 2f;

                string[] termsLines = company.TermsAndConditions.Split('\n');
                foreach (var line in termsLines)
                {
                    if (!string.IsNullOrWhiteSpace(line))
                    {
                        Phrase bulletLine = new Phrase();
                        bulletLine.Add(new Chunk("• ", regular));
                        bulletLine.Add(new Chunk(line.Trim(), regular));

                        termsTable.AddCell(new PdfPCell(bulletLine)
                        {
                            Border = Rectangle.NO_BORDER,
                            HorizontalAlignment = Element.ALIGN_LEFT,
                            PaddingTop = 2f,
                            PaddingBottom = 2f
                        });
                    }
                }

                PdfPCell termsCell = new PdfPCell(termsTable)
                {
                    Border = Rectangle.NO_BORDER,
                    VerticalAlignment = Element.ALIGN_TOP
                };
                contentRow.AddCell(termsCell);
            }
            else
            {
                // If hidden, add an empty cell so layout remains intact
                contentRow.AddCell(new PdfPCell() { Border = Rectangle.NO_BORDER });
            }

            // Right: Totals (SGST, CGST, Grand Total)
            PdfPTable totalsTable = new PdfPTable(2);
            totalsTable.WidthPercentage = 100;
            totalsTable.SetWidths(new float[] { 1.3f, 1f });
            totalsTable.DefaultCell.Border = Rectangle.NO_BORDER;
            totalsTable.DefaultCell.PaddingTop = 2f;
            totalsTable.DefaultCell.PaddingBottom = 2f;

            // SGST
            if (company.ShowGst && company.SgstPercent > 0)
                AddTotalRow(totalsTable, $"(+) SGST: {company.SgstPercent}%", sgstValue, regular, regular);

            // CGST
            if (company.ShowGst && company.CgstPercent > 0)
                AddTotalRow(totalsTable, $"(+) CGST: {company.CgstPercent}%", cgstValue, regular, regular);

            if (invoice.ProrationCredit > 0)
                AddTotalRow(totalsTable, "(-) Proration Credit", invoice.ProrationCredit, regular, regular);

            PdfPCell grandLabel = new PdfPCell(new Phrase("Grand Total", bold))
            {
                Border = Rectangle.NO_BORDER,
                HorizontalAlignment = Element.ALIGN_LEFT,
                PaddingTop = 4f,
                PaddingBottom = 4f
            };

            PdfPCell grandValue = new PdfPCell(new Phrase("₹ " + grandTotal.ToString("N2"), bold))
            {
                Border = Rectangle.NO_BORDER,
                HorizontalAlignment = Element.ALIGN_RIGHT,
                PaddingTop = 4f,
                PaddingBottom = 4f
            };

            totalsTable.AddCell(grandLabel);
            totalsTable.AddCell(grandValue);

            PdfPCell totalsCell = new PdfPCell(totalsTable)
            {
                Border = Rectangle.NO_BORDER,
                HorizontalAlignment = Element.ALIGN_RIGHT,
                VerticalAlignment = Element.ALIGN_TOP
            };
            contentRow.AddCell(totalsCell);

            // Add contentRow to orangeBox
            PdfPCell contentRowCell = new PdfPCell(contentRow)
            {
                Border = Rectangle.NO_BORDER,
                Padding = 0
            };
            orangeBox.AddCell(contentRowCell);

            // ✅ Finally, add orangeBox to document
            document.Add(orangeBox);
            // Spacer
            document.Add(new Paragraph(" "));


            // ---------------- Amount in Words ----------------
            Phrase amtWords = new Phrase();
            amtWords.Add(new Chunk("Amount In Words : ", bold));
            amtWords.Add(new Chunk(NumberToWordsHelper.ToWords((long)grandTotal) + " Rupees Only", regular));
            document.Add(new Paragraph(amtWords));

            document.Add(new Paragraph(" "));

            // ---------------- Signature ----------------
            if (company.ShowSignature)
            {
                PdfPTable sigTable = new PdfPTable(1);
                sigTable.WidthPercentage = 40;
                sigTable.HorizontalAlignment = Element.ALIGN_RIGHT;

                if (company.ShowSignature && !string.IsNullOrEmpty(company.OwnerSignaturePath))
                {
                    var sigImg = Image.GetInstance(new Uri(company.OwnerSignaturePath));
                    sigImg.ScaleToFit(120f, 60f);

                    sigTable.AddCell(new PdfPCell(sigImg)
                    {
                        Border = Rectangle.NO_BORDER,
                        HorizontalAlignment = Element.ALIGN_RIGHT,
                        Padding = 0
                    });
                }

                PdfPCell nameCell = new PdfPCell(new Phrase(company.OwnerName, regular))
                {
                    Border = Rectangle.NO_BORDER,
                    HorizontalAlignment = Element.ALIGN_RIGHT,
                    PaddingTop = 5
                };
                sigTable.AddCell(nameCell);

                PdfPCell sigTextCell = new PdfPCell(new Phrase("Signature", bold))
                {
                    Border = Rectangle.NO_BORDER,
                    HorizontalAlignment = Element.ALIGN_RIGHT
                };
                sigTable.AddCell(sigTextCell);

                document.Add(sigTable);
            }

            document.Add(new Paragraph(" "));

            // ---------------- Bank Details ----------------
            if (company.ShowBankDetails)
            {
                PdfPTable bankTable = new PdfPTable(3);
                bankTable.WidthPercentage = 100;
                bankTable.SetWidths(new float[] { 1f, 1f, 1f });

                // Payable To
                var payableTo = new Paragraph();
                payableTo.Add(new Chunk("Payable To\n", bold));
                payableTo.Add(new Chunk(company.CompanyName, regular));
                bankTable.AddCell(new PdfPCell(payableTo)
                {
                    Border = Rectangle.NO_BORDER,
                    HorizontalAlignment = Element.ALIGN_LEFT,
                    PaddingTop = 4f,
                    PaddingBottom = 4f
                });

                // Banking Details
                var bankingInfo = new Paragraph();
                bankingInfo.Add(new Chunk("Banking Details\n", bold));
                bankingInfo.Add(new Chunk("Bank: " + company.BankName + "\n", regular));
                bankingInfo.Add(new Chunk("Branch: " + company.BranchName + "\n", regular));
                bankingInfo.Add(new Chunk("A/C No.: " + company.BankAccountNumber + "\n", regular));
                bankingInfo.Add(new Chunk("IFSC CODE: " + company.IFSC, regular));
                bankTable.AddCell(new PdfPCell(bankingInfo)
                {
                    Border = Rectangle.NO_BORDER,
                    HorizontalAlignment = Element.ALIGN_LEFT,
                    PaddingTop = 4f,
                    PaddingBottom = 4f
                });

                // Other Details
                var otherInfo = new Paragraph();
                otherInfo.Add(new Chunk("Other Details\n", bold));
                otherInfo.Add(new Chunk(company.OtherDetails, regular));
                bankTable.AddCell(new PdfPCell(otherInfo)
                {
                    Border = Rectangle.NO_BORDER,
                    HorizontalAlignment = Element.ALIGN_LEFT,
                    PaddingTop = 4f,
                    PaddingBottom = 4f
                });

                // ✅ Add border to all cells automatically
                foreach (PdfPCell cell in bankTable.Rows.SelectMany(r => r.GetCells()))
                {
                    if (cell != null) cell.Border = Rectangle.BOX;
                }

                document.Add(bankTable);
            }

            document.Close();
            return ms.ToArray();
        }
    }

    // Orange line helper
    private static Paragraph OrangeLine()
    {
        return new Paragraph(new Chunk(
            new iTextSharp.text.pdf.draw.LineSeparator(2f, 100f, new BaseColor(255, 153, 0), Element.ALIGN_CENTER, -1)
        ));
    }

    private static void AddTableHeader(PdfPTable table, string text, Font font, int alignment)
    {
        PdfPCell cell = new PdfPCell(new Phrase(text, font))
        {
            BackgroundColor = new BaseColor(255, 153, 0),
            VerticalAlignment = Element.ALIGN_MIDDLE,
            HorizontalAlignment = alignment,
            FixedHeight = 25f // Increased height
        };
        table.AddCell(cell);
    }


    private static void AddTotalRow(PdfPTable table, string label, decimal value, Font labelFont, Font valueFont)
    {
        PdfPCell labelCell = new PdfPCell(new Phrase(label, labelFont))
        {
            Border = Rectangle.NO_BORDER,
            HorizontalAlignment = Element.ALIGN_LEFT,
            PaddingTop = 4f,
            PaddingBottom = 4f
        };

        PdfPCell valueCell = new PdfPCell(new Phrase("₹ " + value.ToString("N2"), valueFont))
        {
            Border = Rectangle.NO_BORDER,
            HorizontalAlignment = Element.ALIGN_RIGHT,
            PaddingTop = 4f,
            PaddingBottom = 4f
        };

        table.AddCell(labelCell);
        table.AddCell(valueCell);
    }

    // Helper to create a cell with a default image, or an error message if the default is missing
    private static PdfPCell GetDefaultImageCell(string defaultPath, float scaleX, float scaleY)
    {
        if (!File.Exists(defaultPath))
        {
            // Fallback if even the default path is invalid/missing
            return new PdfPCell(new Phrase("Default Image Missing", new Font(BaseFont.CreateFont(), 8, Font.ITALIC, BaseColor.RED)));
        }

        var img = iTextSharp.text.Image.GetInstance(defaultPath);
        img.ScaleToFit(scaleX, scaleY);

        return new PdfPCell(img)
        {
            Border = Rectangle.NO_BORDER,
            HorizontalAlignment = Element.ALIGN_RIGHT,
            Padding = 0
        };
    }
}