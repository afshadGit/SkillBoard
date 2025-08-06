// src/components/AssignModal.js
import React, { useState } from "react";

function AssignModal({
  candidates,
  onConfirm,
  onCancel,
  taskTitle,
  taskHours,
}) {
  const [selectedIds, setSelectedIds] = useState([]);
  const [hours, setHours] = useState({});

  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((eid) => eid !== id) : [...prev, id]
    );
  };

  const handleHoursChange = (id, value) => {
    setHours((prev) => ({ ...prev, [id]: value }));
  };

  const handleSubmit = () => {
    const hoursArray = selectedIds.map((id) => parseFloat(hours[id]) || 0);
    onConfirm(selectedIds, hoursArray);
  };

  return (
    <div>
      <h4 className="font-semibold mb-2">Estimated hours: {taskHours} hrs</h4>
      <p className="text-sm text-gray-600 mb-2">
        Select employees & assign hours
      </p>
      <ul className="space-y-2 max-h-64 overflow-y-auto">
        {candidates.map((emp) => (
          <li key={emp.employee_id} className="flex items-center gap-4">
            <input
              type="checkbox"
              checked={selectedIds.includes(emp.employee_id)}
              onChange={() => toggleSelect(emp.employee_id)}
            />
            <span className="flex-1 text-sm">
              {emp.employee_name} — Load: {emp.load_percent ?? 0}% | Rating:{" "}
              {emp.average_rating ?? "N/A"}
            </span>
            <input
              type="number"
              placeholder="Hours"
              value={hours[emp.employee_id] || ""}
              onChange={(e) =>
                handleHoursChange(emp.employee_id, e.target.value)
              }
              className="border rounded px-2 py-1 w-20"
            />
          </li>
        ))}
      </ul>
      <div className="mt-4 flex justify-end gap-4">
        <button
          onClick={onCancel}
          className="bg-gray-300 text-black px-4 py-2 rounded"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Assign
        </button>
      </div>
    </div>
  );
}

export default AssignModal;
