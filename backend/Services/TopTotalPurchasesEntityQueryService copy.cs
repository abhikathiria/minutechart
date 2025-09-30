using Microsoft.EntityFrameworkCore;
using minutechart.DTOs;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace minutechart.Services
{
    public class TopTotalPurchasesEntityQueryService
    {
        public async Task<List<TopResultDto>> GetTopTotalPurchasesEntitiesAsync(
            DbContext db,
            Dictionary<string, (string UserTable, string UserField)> mapping,
            string idKey,
            string nameKey,
            string salesKey,
            DateTime? from = null,
            DateTime? to = null)
        {
            // ✅ Ensure mappings exist
            if (!mapping.ContainsKey(idKey) || !mapping.ContainsKey(nameKey) || !mapping.ContainsKey(salesKey))
            {
                Console.WriteLine($"❌ Missing mapping keys for {idKey}, {nameKey}, or {salesKey}");
                return new List<TopResultDto>();
            }

            var entityID = mapping[idKey];
            var entityName = mapping[nameKey];
            var totalPurchases = mapping[salesKey];

            // ✅ Ensure UserFields are not empty
            if (string.IsNullOrEmpty(entityID.UserTable) || string.IsNullOrEmpty(entityID.UserField) ||
                string.IsNullOrEmpty(entityName.UserTable) || string.IsNullOrEmpty(entityName.UserField) ||
                string.IsNullOrEmpty(totalPurchases.UserTable) || string.IsNullOrEmpty(totalPurchases.UserField))
            {
                Console.WriteLine($"❌ Mapping UserFields missing for {idKey}, {nameKey}, or {salesKey}");
                return new List<TopResultDto>();
            }

            // Aliases
            string aliasEntityID = "t1";
            string aliasEntityName = "t2";
            string aliasTotalPurchases = "t3";

            // Joins
            string joinSQL = $@"
                FROM {entityID.UserTable} {aliasEntityID}
                INNER JOIN {entityName.UserTable} {aliasEntityName} 
                    ON {aliasEntityID}.{entityID.UserField} = {aliasEntityName}.{entityID.UserField}
                INNER JOIN {totalPurchases.UserTable} {aliasTotalPurchases} 
                    ON {aliasEntityID}.{entityID.UserField} = {aliasTotalPurchases}.{entityID.UserField}";

            // Date filter (optional)
            string dateFilter = "";
            if (mapping.TryGetValue("TransactionDate", out var transactionDateMapping) &&
                !string.IsNullOrEmpty(transactionDateMapping.UserField) &&
                from.HasValue && to.HasValue)
            {
                var fromDate = from.Value.Date;
                var toDate = to.Value.Date.AddDays(1).AddTicks(-1);

                string transactionDateAlias = transactionDateMapping.UserTable switch
                {
                    var t when t == entityID.UserTable => aliasEntityID,
                    var t when t == entityName.UserTable => aliasEntityName,
                    var t when t == totalPurchases.UserTable => aliasTotalPurchases,
                    _ => "tX" // fallback
                };

                dateFilter = $@"AND ({transactionDateAlias}.{transactionDateMapping.UserField} >= '{fromDate:yyyy-MM-dd}'
                                  AND {transactionDateAlias}.{transactionDateMapping.UserField} <= '{toDate:yyyy-MM-dd}')";
            }

            // Final SQL
            var sql = $@"
                SELECT TOP 5
                    {aliasEntityID}.{entityID.UserField} AS EntityID,
                    {aliasEntityName}.{entityName.UserField} AS EntityName,
                    SUM(CAST({aliasTotalPurchases}.{totalPurchases.UserField} AS decimal(18,2))) AS TotalPurchases
                {joinSQL}
                WHERE {aliasEntityID}.{entityID.UserField} IS NOT NULL
                  AND {aliasEntityName}.{entityName.UserField} IS NOT NULL
                  AND {aliasTotalPurchases}.{totalPurchases.UserField} <> 0
                  {dateFilter}
                GROUP BY {aliasEntityID}.{entityID.UserField}, {aliasEntityName}.{entityName.UserField}
                ORDER BY SUM({aliasTotalPurchases}.{totalPurchases.UserField}) DESC";

            Console.WriteLine("---- FINAL SQL ----\n" + sql);

            try
            {
                return await db.Set<TopResultDto>().FromSqlRaw(sql).ToListAsync();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ SQL execution failed: {ex.Message}");
                return new List<TopResultDto>();
            }
        }
    }
}
