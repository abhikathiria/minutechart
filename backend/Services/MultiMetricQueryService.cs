// using Microsoft.EntityFrameworkCore;
// using minutechart.DTOs;
// using System;
// using System.Collections.Generic;
// using System.Linq;
// using System.Threading.Tasks;

// namespace minutechart.Services
// {
//     public class MultiMetricQueryService
//     {
//         public async Task<List<CashFlowResultDto>> GetCashFlowAsync(
//             DbContext db,
//             Dictionary<string, (string UserTable, string UserField)> mapping,
//             DateTime? from = null,
//             DateTime? to = null)
//         {
//             if (!mapping.ContainsKey("CashIn") || !mapping.ContainsKey("CashOut"))
//                 return new List<CashFlowResultDto>();

//             var cashIn = mapping["CashIn"];
//             var cashOut = mapping["CashOut"];

//             string alias = "t1";

//             string dateFilter = "";
//             if (mapping.TryGetValue("TransactionDate", out var transactionDateMapping) &&
//                 !string.IsNullOrEmpty(transactionDateMapping.UserField) &&
//                 from.HasValue && to.HasValue)
//             {
//                 var fromDate = from.Value.Date;
//                 var toDate = to.Value.Date.AddDays(1).AddTicks(-1);

//                 dateFilter = $@"WHERE {alias}.{transactionDateMapping.UserField} >= '{fromDate:yyyy-MM-dd}'
//                              AND {alias}.{transactionDateMapping.UserField} <= '{toDate:yyyy-MM-dd}'";
//             }

//             var sql = $@"
//             SELECT 
//                 SUM(CAST({alias}.{cashIn.UserField} AS decimal(18,2))) AS TotalCashIn,
//                 SUM(CAST({alias}.{cashOut.UserField} AS decimal(18,2))) AS TotalCashOut
//             FROM {cashIn.UserTable} {alias}
//             {dateFilter}";

//             Console.WriteLine("---- CASH FLOW SQL ----\n" + sql);

//             return await db.Set<CashFlowResultDto>().FromSqlRaw(sql).ToListAsync();
//         }
//     }
// }
