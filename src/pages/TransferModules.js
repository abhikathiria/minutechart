import React, { useState, useEffect } from "react";
import api from "../api";

export default function TransferModules() {
    const [users, setUsers] = useState([]);
    const [sourceUser, setSourceUser] = useState("");
    const [targetUser, setTargetUser] = useState("");
    const [modules, setModules] = useState([]);
    const [selected, setSelected] = useState([]);
    const [duplicates, setDuplicates] = useState([]);

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        const res = await api.get("/admin/users");
        setUsers(res.data);
    };

    const loadModules = async (userId) => {
        const res = await api.get(`/admin/user/${userId}/queries`);
        setModules(res.data);
    };

    const handleTransfer = async () => {
        if (!sourceUser || !targetUser || selected.length === 0)
            return alert("Select users and modules first!");

        const res = await api.post("/admin/transfer-modules", {
            sourceUserId: sourceUser,
            targetUserId: targetUser,
            moduleIds: selected,
        });

        if (res.data.duplicates?.length) {
            setDuplicates(res.data.duplicates);
        } else {
            alert("Modules transferred successfully!");
        }
    };

    const handleReplace = async () => {
        await api.post("/admin/transfer-modules", {
            sourceUserId: sourceUser,
            targetUserId: targetUser,
            moduleIds: selected,
            replaceExisting: true,
        });
        alert("Modules replaced successfully!");
        setDuplicates([]);
    };

    const handleDuplicateAction = async (action) => {
        const res = await api.post("/admin/transfer-modules", {
            sourceUserId: sourceUser,
            targetUserId: targetUser,
            moduleIds: selected,
            action,
        });

        alert(res.data.message);
        setDuplicates([]);
    };

    return (
        <div className="p-8">
            <h1 className="text-2xl font-bold mb-6">Transfer Modules</h1>

            <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="flex-1">
                    <label className="block font-semibold mb-2">Source User</label>
                    <select
                        value={sourceUser}
                        onChange={(e) => {
                            setSourceUser(e.target.value);
                            loadModules(e.target.value);
                        }}
                        className="w-full p-2 border rounded"
                    >
                        <option value="">Select User</option>
                        {users.map((u) => (
                            <option key={u.id} value={u.id}>
                                {u.companyName} ({u.customerName})
                            </option>
                        ))}
                    </select>
                </div>

                <div className="flex-1">
                    <label className="block font-semibold mb-2">Target User</label>
                    <select
                        value={targetUser}
                        onChange={(e) => setTargetUser(e.target.value)}
                        className="w-full p-2 border rounded"
                    >
                        <option value="">Select User</option>
                        {users.map((u) => (
                            <option key={u.id} value={u.id}>
                                {u.companyName} ({u.customerName})
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {modules.length > 0 && (
                <div className="border p-4 rounded bg-white">
                    <h2 className="font-semibold mb-3">Select Modules to Transfer</h2>
                    <div className="space-y-2 max-h-[50vh] overflow-auto">
                        {modules.map((m) => (
                            <label key={m.userQueryId} className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={selected.includes(m.userQueryId)}
                                    onChange={() =>
                                        setSelected((prev) =>
                                            prev.includes(m.userQueryId)
                                                ? prev.filter((id) => id !== m.userQueryId)
                                                : [...prev, m.userQueryId]
                                        )
                                    }
                                />
                                <span className="font-medium">{m.userTitle}</span>
                            </label>
                        ))}
                    </div>

                    <button
                        onClick={handleTransfer}
                        className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                    >
                        Transfer Selected
                    </button>
                </div>
            )}

            {/* Duplicates Modal */}
            {duplicates.length > 0 && (
                <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50 p-4">
                    <div className="bg-white rounded-xl p-6 max-w-lg w-full">
                        <h3 className="text-lg font-bold mb-4">Duplicate Modules Found</h3>
                        <p className="mb-4 text-gray-700">
                            Some modules already exist in the target user:
                        </p>
                        <ul className="mb-4 text-sm text-gray-600 list-disc list-inside">
                            {duplicates.map((d) => (
                                <li key={d.userQueryId}>{d.userTitle}</li>
                            ))}
                        </ul>
                        <div className="flex flex-wrap justify-end gap-3">
                            <button
                                onClick={() => setDuplicates([])}
                                className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleDuplicateAction("ignore")}
                                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                            >
                                Ignore Duplicates
                            </button>
                            <button
                                onClick={() => handleDuplicateAction("replace")}
                                className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600"
                            >
                                Replace Existing
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
