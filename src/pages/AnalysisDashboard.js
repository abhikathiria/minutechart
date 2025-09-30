// src/pages/AnalysisDashboard.jsx
import React, { useState, useEffect } from "react";
import api from "../api";
import ModuleForm from "../components/modules/ModuleForm";
import ModuleChart from "../components/modules/ModuleChart";

export default function AnalysisDashboard() {
  const [modules, setModules] = useState([]);          // saved modules metadata
  const [selected, setSelected] = useState(null);      // selected module metadata or { isNew: true }
  const [previewResult, setPreviewResult] = useState(null);
  const userId = window.__USER_ID__ || null; // provide from server/auth

  useEffect(() => {
    if (!userId) return;
    loadModules();
  }, [userId]);

  async function loadModules() {
    try {
      const res = await api.get(`/api/query/list/${userId}`);
      setModules(res.data || []);
    } catch (err) {
      console.error("Failed to load modules", err);
      setModules([]);
    }
  }

  function handleAddModule() {
    setPreviewResult(null);
    setSelected({ isNew: true, userQueryId: null, userTitle: "", userQueryText: "", chartType: "table" });
  }

  function handleSelectModule(m) {
    // open existing module in form
    setPreviewResult(null);
    setSelected(m);
  }

  // called from ModuleForm when Save & Execute completes
  function onSavedAndExecuted(savedMeta, executedResult) {
    // add or update list
    setModules(prev => {
      const existing = prev.find(x => x.userQueryId === savedMeta.userQueryId);
      if (existing) {
        return prev.map(x => x.userQueryId === savedMeta.userQueryId ? savedMeta : x);
      }
      return [savedMeta, ...prev];
    });
    setSelected(savedMeta);
    setPreviewResult(executedResult);
  }

  return (
    <div className="min-h-screen flex">
      <aside className="w-72 border-r p-4">
        <button onClick={handleAddModule}
          className="w-full mb-4 px-3 py-2 bg-blue-600 text-white rounded">+ Add Module</button>

        <div className="text-sm text-gray-600 mb-2">Your Modules</div>
        <ul>
          {modules.length === 0 && <li className="text-gray-500">No modules yet — click Add Module</li>}
          {modules.map(m => (
            <li key={m.userQueryId}
              className={`p-2 mb-1 rounded cursor-pointer ${selected && selected.userQueryId === m.userQueryId ? "bg-gray-200" : "hover:bg-gray-50"}`}
              onClick={() => handleSelectModule(m)}>
              <div className="font-medium">{m.userTitle}</div>
              <div className="text-xs text-gray-500">{m.chartType}</div>
            </li>
          ))}
        </ul>
      </aside>

      <main className="flex-1 p-6">
        {selected ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <ModuleForm
                moduleMeta={selected}
                userId={userId}
                onSavedAndExecuted={onSavedAndExecuted}
                onCancel={() => { setSelected(null); setPreviewResult(null); }}
              />
            </div>

            <div>
              <h3 className="mb-2 font-semibold">Preview / Result</h3>
              {previewResult ? (
                <ModuleChart chartType={selected.chartType} result={previewResult} />
              ) : (
                <div className="p-6 border rounded text-gray-500">Run Execute or Save & Execute to see results here.</div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-gray-600">Select a module from the left or click “Add Module” to create one.</div>
        )}
      </main>
    </div>
  );
}
