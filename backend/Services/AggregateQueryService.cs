using Microsoft.EntityFrameworkCore;
using minutechart.DTOs;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace minutechart.Services
{
    public enum AggregateFunction
    {
        Sum,
        Avg,
        Min,
        Max,
        Count
    }

    public class AggregateQueryService
    {
        public async Task<List<TopResultDto>> GetAggregatedEntitiesAsync(
    DbContext db,
    Dictionary<string, (string UserTable, string UserField)> mapping,
    string idKey,
    string nameKey,
    string valueKey,
    AggregateFunction aggregateFunc,
    int topN = 5,
    DateTime? from = null,
    DateTime? to = null,
    string dateKey = null)   // ✅ new param
        {
            if (!mapping.ContainsKey(idKey) || !mapping.ContainsKey(nameKey) || !mapping.ContainsKey(valueKey))
                return new List<TopResultDto>();

            var entityID = mapping[idKey];
            var entityName = mapping[nameKey];
            var metricField = mapping[valueKey];

            if (string.IsNullOrEmpty(entityID.UserTable) || string.IsNullOrEmpty(entityID.UserField) ||
                string.IsNullOrEmpty(entityName.UserTable) || string.IsNullOrEmpty(entityName.UserField) ||
                string.IsNullOrEmpty(metricField.UserTable) || string.IsNullOrEmpty(metricField.UserField))
                return new List<TopResultDto>();

            string aliasEntityID = "t1";
            string aliasEntityName = "t2";
            string aliasMetric = "t3";

            string joinSQL = $@"
    FROM {entityID.UserTable} {aliasEntityID}
    INNER JOIN {entityName.UserTable} {aliasEntityName}
        ON {aliasEntityID}.{entityID.UserField} = {aliasEntityName}.{entityID.UserField}
    INNER JOIN {metricField.UserTable} {aliasMetric}
        ON {aliasEntityID}.{entityID.UserField} = {aliasMetric}.{entityID.UserField}";

            // ✅ Date filter only if dateKey is provided
            string dateFilter = "";
            if (!string.IsNullOrEmpty(dateKey) &&
                mapping.TryGetValue(dateKey, out var dateMapping) &&
                !string.IsNullOrEmpty(dateMapping.UserField) &&
                from.HasValue && to.HasValue)
            {
                var fromDate = from.Value.Date;
                var toDate = to.Value.Date.AddDays(1).AddTicks(-1);

                string dateAlias = dateMapping.UserTable switch
                {
                    var t when t == entityID.UserTable => aliasEntityID,
                    var t when t == entityName.UserTable => aliasEntityName,
                    var t when t == metricField.UserTable => aliasMetric,
                    _ => aliasMetric // fallback if not directly joined
                };

                dateFilter = $@"AND ({dateAlias}.{dateMapping.UserField} >= '{fromDate:yyyy-MM-dd}'
                    AND {dateAlias}.{dateMapping.UserField} <= '{toDate:yyyy-MM-dd}')";
            }

            string aggFuncSql = aggregateFunc switch
            {
                AggregateFunction.Sum => "SUM",
                AggregateFunction.Avg => "AVG",
                AggregateFunction.Min => "MIN",
                AggregateFunction.Max => "MAX",
                AggregateFunction.Count => "COUNT",
                _ => "SUM"
            };

            var sql = $@"
    SELECT TOP {topN}
        {aliasEntityID}.{entityID.UserField} AS EntityID,
        {aliasEntityName}.{entityName.UserField} AS EntityName,
        {aggFuncSql}(CAST({aliasMetric}.{metricField.UserField} AS decimal(18,2))) AS MetricValue
    {joinSQL}
    WHERE {aliasEntityID}.{entityID.UserField} IS NOT NULL
      AND {aliasEntityName}.{entityName.UserField} IS NOT NULL
      {dateFilter}
    GROUP BY {aliasEntityID}.{entityID.UserField}, {aliasEntityName}.{entityName.UserField}
    ORDER BY {aggFuncSql}({aliasMetric}.{metricField.UserField}) DESC";

            Console.WriteLine("---- FINAL SQL ----\n" + sql);

            return await db.Set<TopResultDto>().FromSqlRaw(sql).ToListAsync();
        }
    }
}
