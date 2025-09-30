using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using minutechart.Data;
using minutechart.Models;
using minutechart.DTOs;

namespace minutechart.Services
{
    public class SchemaMappingService
    {
        private readonly MinutechartDbContext _mainDb;
        private readonly UserManager<AppUser> _userManager;

        public SchemaMappingService(MinutechartDbContext mainDb, UserManager<AppUser> userManager)
        {
            _mainDb = mainDb;
            _userManager = userManager;
        }

        public async Task<Dictionary<string, (string Table, string Field)>> GetMappingsAsync(AppUser user)
        {
            var mappings = await _mainDb.SchemaMappings
                .Where(m => m.AppUserId == user.Id)
                .ToListAsync();

            return mappings.ToDictionary(
                m => m.CanonicalField,
                m => (m.UserTable, m.UserField)
            );
        }

        public async Task SaveMappingsAsync(AppUser user, Dictionary<string, SchemaMappingDto> mappings)
{
    var existing = _mainDb.SchemaMappings.Where(m => m.AppUserId == user.Id);
    _mainDb.SchemaMappings.RemoveRange(existing);

    foreach (var kv in mappings)
    {
        _mainDb.SchemaMappings.Add(new SchemaMapping
        {
            AppUserId = user.Id,
            CanonicalField = kv.Key,
            UserTable = kv.Value.Table,
            UserField = kv.Value.Field
        });
    }

    await _mainDb.SaveChangesAsync();
}
    }
}
