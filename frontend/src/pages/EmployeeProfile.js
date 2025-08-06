// src/pages/EmployeeProfile.js
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

function EmployeeProfile() {
  const { employee_id } = useParams();
  const [employee, setEmployee] = useState(null);
  const navigate = useNavigate();
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewTask, setReviewTask] = useState(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [suggestedTasks, setSuggestedTasks] = useState([]);

  const fetchProfile = () => {
    const token = localStorage.getItem("token");

    fetch(`http://localhost:8000/employees/${employee_id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then((data) => setEmployee(data))
      .catch((err) => console.error("Failed to fetch employee profile:", err));

    fetch(`http://localhost:8000/employees/${employee_id}/suggested_tasks`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then((data) => setSuggestedTasks(data))
      .catch((err) => console.error("Failed to fetch suggested tasks:", err));
  };

  const handleSelfAssign = (taskId) => {
    const token = localStorage.getItem("token");
    const today = new Date().toISOString().split("T")[0];

    fetch("http://localhost:8000/tasks/assign", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        task_id: taskId,
        employee_ids: [parseInt(employee_id)],
        start_date: today,
      }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Assignment failed");
        return res.json();
      })
      .then(() => {
        fetchProfile(); // refresh tasks + suggestions
      })
      .catch((err) => alert("Error assigning task: " + err.message));
  };

  useEffect(() => {
    fetchProfile();
  }, [employee_id]);

  // const handleUnassign = (taskId) => {
  //   fetch(`http://localhost:8000/tasks/${taskId}/unassign`, {
  //     method: "PATCH",
  //   })
  //     .then((res) => {
  //       if (!res.ok) throw new Error("Unassign failed");
  //       return res.json();
  //     })
  //     .then(() => fetchProfile())
  //     .catch((err) => console.error("Error unassigning task:", err));
  // };

  const handleUnassign = (taskId) => {
    const token = localStorage.getItem("token");

    fetch(`http://localhost:8000/tasks/${taskId}/unassign`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`, // ✅ Missing before
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Unassign failed");
        return res.json();
      })
      .then(() => fetchProfile())
      .catch((err) => console.error("Error unassigning task:", err));
  };

  const handleReleaseEmployee = () => {
    fetch(`http://localhost:8000/employees/${employee_id}/release`, {
      method: "PATCH",
    })
      .then((res) => {
        if (!res.ok) throw new Error("Release failed");
        return res.json();
      })
      .then(() => fetchProfile())
      .catch((err) => console.error("Error releasing employee:", err));
  };

  const openReviewModal = (task) => {
    setReviewTask(task);
    setShowReviewModal(true);
  };

  const closeReviewModal = () => {
    setShowReviewModal(false);
    setReviewTask(null);
    setRating(0);
    setComment("");
  };

  const submitReview = () => {
    if (!reviewTask || !rating) return;

    const token = localStorage.getItem("token");

    fetch("http://localhost:8000/reviews", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        task_id: reviewTask.task_id,
        employee_id: employee_id,
        rating: parseFloat(rating),
        comment,
      }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to submit review");
        return res.json();
      })
      .then(() => {
        alert("Review submitted!");
        closeReviewModal();
        fetchProfile();
      })
      .catch((err) => alert(err.message));
  };

  if (!employee) return <div className="text-white p-10">Loading...</div>;

  const totalAssignedHours = employee.tasks
    .filter((task) => !task.completed)
    .reduce((sum, task) => sum + task.estimated_hours, 0);

  const loadPercentage =
    employee.weekly_hours > 0
      ? ((totalAssignedHours / employee.weekly_hours) * 100).toFixed(0)
      : "0";

  // 🔄 Group tasks by project name
  const groupedTasks = employee.tasks.reduce((acc, task) => {
    const key = `${task.project_id}||${task.project_name}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(task);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#741F7A] to-[#161748] text-white px-6 py-10">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="bg-white bg-opacity-10 p-6 rounded-xl shadow-lg max-w-3xl mx-auto"
      >
        <h2 className="text-3xl font-bold text-pink-200 mb-4">
          👤 {employee.employee_name}'s Profile
        </h2>
        <div className="space-y-1 text-lg">
          <p>
            <strong>Role:</strong> {employee.role}
          </p>
          <p>
            <strong>Avg Performance:</strong>{" "}
            {employee.average_rating !== null
              ? `${employee.average_rating} / 5`
              : "N/A"}
          </p>

          <p>
            <strong>Weekly Hours:</strong> {employee.weekly_hours}
          </p>
          <p>
            <strong>Current Load:</strong>{" "}
            {employee.weekly_hours > 0
              ? Math.round(
                  (employee.current_load / employee.weekly_hours) * 100
                ) + "%"
              : "0%"}
          </p>
        </div>

        <button
          onClick={handleReleaseEmployee}
          className="mt-6 bg-red-200 hover:bg-red-300 text-red-900 font-medium px-4 py-2 rounded-lg border border-red-400 transition"
        >
          🚫 Release Employee (Unassign from all tasks)
        </button>

        <h3 className="text-2xl font-semibold mt-10 mb-4 text-white">
          Projects
        </h3>
        {suggestedTasks.length > 0 && (
          <div className="mt-12">
            <h3 className="text-2xl font-semibold mb-4 text-pink-100">
              Suggested Tasks
            </h3>
            <div className="space-y-4">
              {suggestedTasks.map((task, i) => (
                <motion.div
                  key={task.task_id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="p-4 bg-white bg-opacity-10 rounded-lg shadow text-white"
                >
                  <p className="font-semibold">
                    📌 {task.tech_stack} —{" "}
                    <span className="italic">{task.project_name}</span>
                  </p>
                  <p className="text-sm">
                    Estimated: {task.estimated_hours} hrs | Start:{" "}
                    {task.start_date || "-"} | Deadline: {task.deadline}
                  </p>
                  <button
                    onClick={() => handleSelfAssign(task.task_id)}
                    className="mt-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold px-4 py-2 rounded shadow border border-blue-400"
                  >
                    Assign Me
                  </button>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {Object.entries(groupedTasks).map(([combinedKey, tasks], groupIdx) => {
          const [projectId, projectName] = combinedKey.split("||");

          return (
            <motion.div
              key={projectName}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: groupIdx * 0.1 }}
              className="mb-6 bg-white bg-opacity-5 rounded-xl p-4"
            >
              {suggestedTasks.length > 0 && (
                <div className="mt-12">
                  <h3 className="text-2xl font-semibold mb-4 text-pink-100">
                    Suggested Tasks
                  </h3>
                  <div className="space-y-4">
                    {suggestedTasks.map((task, i) => (
                      <motion.div
                        key={task.task_id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="p-4 bg-white bg-opacity-10 rounded-lg shadow text-white"
                      >
                        <p className="font-semibold">
                          📌 {task.tech_stack} —{" "}
                          <span className="italic">{task.project_name}</span>
                        </p>
                        <p className="text-sm">
                          Estimated: {task.estimated_hours} hrs | Start:{" "}
                          {task.start_date || "-"} | Deadline: {task.deadline}
                        </p>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              <h4
                className="text-xl font-bold text-purple-300 mb-3 italic cursor-pointer hover:underline"
                onClick={() => navigate(`/projects/${projectId}`)}
              >
                📎 {projectName}
              </h4>

              <div className="space-y-4">
                {tasks.map((task, i) => (
                  <motion.div
                    key={task.task_id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={`p-4 rounded-lg shadow flex flex-col sm:flex-row sm:justify-between sm:items-center transition ${
                      task.completed
                        ? "bg-white bg-opacity-5 text-white/50"
                        : "bg-white bg-opacity-10 text-white hover:scale-[1.01] hover:bg-white/20"
                    }`}
                  >
                    <div
                      className={
                        task.completed ? "text-white/50" : "text-white"
                      }
                    >
                      <p className="font-semibold text-base flex items-center gap-2">
                        Task #{task.task_id} – {task.tech_stack}
                        {task.completed && (
                          <span className="inline-block bg-green-500 text-white text-xs px-2 py-1 rounded-full mr-2">
                            Completed
                          </span>
                        )}
                        {task.reviewed && (
                          <div className="text-sm text-blue-200 mt-2 pl-2 border-l-2 border-blue-400">
                            <p>⭐ Rating: {task.review_rating} / 5</p>
                            {task.review_comment && (
                              <p className="italic">“{task.review_comment}”</p>
                            )}
                          </div>
                        )}
                      </p>
                      <p className="text-sm">
                        Estimated Weekly Hours: {task.estimated_hours} hrs |
                        Start: {task.start_date || "N/A"} | Deadline:{" "}
                        {task.deadline}
                      </p>
                    </div>
                    {task.completed && !task.reviewed && (
                      <button
                        onClick={() => openReviewModal(task)}
                        className="mt-3 sm:mt-0 sm:ml-4 bg-blue-500 hover:bg-blue-600 text-white font-semibold px-3 py-1 rounded shadow border border-blue-600 transition"
                      >
                        Review
                      </button>
                    )}
                    {!task.completed && (
                      <button
                        onClick={() => handleUnassign(task.task_id)}
                        className="mt-3 sm:mt-0 sm:ml-4 bg-pink-200 hover:bg-pink-300 text-pink-900 font-semibold px-3 py-1 rounded shadow border border-pink-300 transition"
                      >
                        Unassign
                      </button>
                    )}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          );
        })}

        {showReviewModal && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
            <div className="bg-white text-black rounded-lg p-6 shadow-lg max-w-md w-full">
              <h3 className="text-lg font-bold mb-4">
                Review Task #{openReviewModal.task_id} –{" "}
                {openReviewModal.tech_stack}
              </h3>

              <label className="block mb-2">Rating (1–5):</label>
              <select
                value={rating}
                onChange={(e) => setRating(parseInt(e.target.value))}
                className="mb-4 p-2 border rounded w-full"
              >
                <option value={0}>Select a rating</option>
                {[1, 2, 3, 4, 5].map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>

              <label className="block mb-2">Comment (optional):</label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full border rounded p-2 mb-4"
              />

              <div className="flex justify-end gap-3">
                <button
                  onClick={closeReviewModal}
                  className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  onClick={submitReview}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Submit
                </button>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

export default EmployeeProfile;
