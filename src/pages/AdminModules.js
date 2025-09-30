import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import api from "../api";
import ModuleForm from "../components/modules/ModuleForm";
import ModuleChart from "../components/modules/ModuleChart";

export default function AdminModules() {
  const { id: userId } = useParams(); // <-- from /admin/users/:id/modules
  const [queries, setQueries] = useState([]);
  const [editingQuery, setEditingQuery] = useState(null);
  const [results, setResults] = useState({});
  const [messages, setMessages] = useState({});
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    loadQueries();
  }, []);

  const loadQueries = async () => {
    try {
      const res = await api.get(`/admin/users/${userId}/queries`);
      setQueries(res.data || []);
    } catch (err) {
      console.error("Failed to load queries", err);
      setQueries([]);
    }
  };

  const executeQuery = async (queryText, queryId, showMessage = true) => {
    try {
      const res = await api.post(`/admin/users/${userId}/execute-query`, {
        sql: queryText,
      });

      if (res.data.success) {
        setResults((prev) => ({ ...prev, [queryId]: res.data.data }));
        if (showMessage) {
          setMessages((prev) => ({ ...prev, [queryId]: "Query executed successfully" }));
        }
      } else {
        if (showMessage) {
          setMessages((prev) => ({
            ...prev,
            [queryId]: res.data.message || "Error executing query",
          }));
        }
      }
    } catch (err) {
      console.error("Error executing query", err);
      if (showMessage) {
        setMessages((prev) => ({ ...prev, [queryId]: "Error executing query" }));
      }
    }
  };

  const saveQuery = async (queryObj) => {
    try {
      const res = await api.post(`/admin/users/${userId}/save-query`, queryObj);
      const savedQuery = res.data;

      setQueries((prev) => {
        const exists = prev.find((q) => q.userQueryId === savedQuery.userQueryId);
        if (exists) {
          return prev.map((q) =>
            q.userQueryId === savedQuery.userQueryId ? savedQuery : q
          );
        }
        return [savedQuery, ...prev];
      });

      await executeQuery(savedQuery.userQueryText, savedQuery.userQueryId, true);
      setShowModal(false);
      setEditingQuery(null);
    } catch (err) {
      console.error("Error saving query", err);
      setMessages((prev) => ({
        ...prev,
        [queryObj.UserQueryId]: "Error saving query",
      }));
    }
  };

  const deleteQuery = async (queryId) => {
    try {
      await api.delete(`/admin/users/${userId}/delete-query/${queryId}`);
      setQueries((prev) => prev.filter((q) => q.userQueryId !== queryId));
      setResults((prev) => {
        const copy = { ...prev };
        delete copy[queryId];
        return copy;
      });
      setMessages((prev) => {
        const copy = { ...prev };
        delete copy[queryId];
        return copy;
      });
      setShowModal(false);
      setEditingQuery(null);
    } catch (err) {
      console.error("Error deleting query", err);
      alert("Failed to delete module.");
    }
  };

  const handleAddModule = () => {
    const newQuery = {
      userQueryId: 0,
      userTitle: "",
      userQueryText: "",
      visualizationType: "table",
    };
    setEditingQuery(newQuery);
    setMessages((prev) => ({ ...prev, [newQuery.userQueryId]: "" }));
    setShowModal(true);
  };

  return (
    <div className="min-h-screen p-6">
      <h1 className="text-2xl font-bold mb-4">Manage Modules for User {userId}</h1>
      <button
        onClick={handleAddModule}
        className="mb-4 px-4 py-2 bg-blue-600 text-white rounded"
      >
        + Add Module
      </button>

      {queries.length === 0 ? (
        <p>No modules yet for this user.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {queries.map((q) => (
            <div key={q.userQueryId} className="bg-white rounded-xl shadow p-4">
              <h3
                className="font-semibold text-lg cursor-pointer hover:text-blue-600"
                onClick={() => {
                  setEditingQuery(q);
                  setShowModal(true);
                }}
              >
                {q.userTitle || "Untitled Module"}
              </h3>
              <div className="mt-2">
                {results[q.userQueryId] ? (
                  <ModuleChart data={results[q.userQueryId]} type={q.visualizationType} />
                ) : (
                  <p className="text-gray-400 text-sm">No data yet.</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <ModuleForm
          query={editingQuery}
          onSave={saveQuery}
          onExecute={(sql) => executeQuery(sql, editingQuery.userQueryId, true)}
          onCancel={() => {
            setShowModal(false);
            setEditingQuery(null);
          }}
          onDelete={deleteQuery}
          message={messages[editingQuery?.userQueryId]}
        />
      )}
    </div>
  );
}
