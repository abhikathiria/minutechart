import React, { useState, useEffect } from "react";
import api from "../api";
import Select from "react-select";

// ✅ Normalize SQL data types into canonical categories
const normalizeType = (sqlType) => {
  if (!sqlType) return "string";
  const t = sqlType.toLowerCase();

  if (t.includes("char") || t.includes("text") || t.includes("ntext")) return "string";
  if (t.includes("int")) return "int";
  if (t.includes("decimal") || t.includes("numeric") || t.includes("float") || t.includes("money")) return "decimal";
  if (t.includes("date") || t.includes("time")) return "date";

  return "string";
};

export default function AnalysisSchemaMappingForm({ onSaved, existingMapping = {} }) {
  const [userFields, setUserFields] = useState([]);
  const [canonicalFields, setCanonicalFields] = useState([]);
  const [mappings, setMappings] = useState({});

  useEffect(() => {
    api.get("/dashboard/schema-mapping")
      .then(res => {
        const canonical = res.data.canonicalFields || [];
        setCanonicalFields(canonical);

        const options = (res.data.userFields || [])
          .map(f => ({
            value: `${f.table}.${f.column}`,
            label: `${f.table}.${f.column} (${f.dataType})`,
            Table: f.table,
            Field: f.column,
            DataType: normalizeType(f.dataType) // ✅ normalized
          }))
          .sort((a, b) => a.label.toLowerCase().localeCompare(b.label.toLowerCase()));
        setUserFields(options);

        // Pre-fill with existing mapping
        const initialMappings = {};
        canonical.forEach(f => {
          const fieldName = f.name || f;
          if (existingMapping[fieldName]) {
            initialMappings[fieldName] = {
              Table: existingMapping[fieldName].Table || existingMapping[fieldName].table || "",
              Field: existingMapping[fieldName].Field || existingMapping[fieldName].field || ""
            };
          } else {
            initialMappings[fieldName] = { Table: "", Field: "" };
          }
        });
        setMappings(initialMappings);
      })
      .catch(err => console.error("Error fetching schema fields:", err));
  }, [existingMapping]);

  const handleChange = (key, selected) => {
    setMappings(prev => ({
      ...prev,
      [key]: selected ? { Table: selected.Table, Field: selected.Field } : { Table: "", Field: "" }
    }));
  };

  const handleSave = async () => {
    try {
      await api.post("/dashboard/save-schema-mapping", mappings);
      if (onSaved) onSaved();
      alert("Mapping saved successfully!");
    } catch (err) {
      console.error("Error saving schema mapping:", err);
      alert("Failed to save mapping. Check console for details.");
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 p-4">
      <h2 className="text-2xl font-bold text-center mb-4">
        Setup Your Schema Mapping
      </h2>

      {canonicalFields.map(f => {
        const fieldName = f.name || f;
        const fieldType = (f.type || "string").toLowerCase();

        // ✅ Filter user fields by normalized type
        const filteredOptions = userFields.filter(uf => uf.DataType === fieldType);

        return (
          <div key={fieldName} className="border rounded p-4 shadow-sm">
            <label className="block mb-1 font-semibold">
              {fieldName}{" "}
              <span className="text-gray-500 text-sm">({fieldType})</span>
            </label>
            <Select
              value={
                userFields.find(
                  uf => uf.Table === mappings[fieldName].Table && uf.Field === mappings[fieldName].Field
                ) || null
              }
              onChange={selected => handleChange(fieldName, selected)}
              options={filteredOptions}
              isClearable
              placeholder={`Select a ${fieldType} field...`}
            />
          </div>
        );
      })}

      <div className="text-center mt-4">
        <button
          onClick={handleSave}
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition"
        >
          Save Mapping
        </button>
      </div>
    </div>
  );
}
