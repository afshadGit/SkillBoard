// src/pages/ProjectDetails.js
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { FaPen, FaTrashAlt } from "react-icons/fa";
import AssignModal from "../components/AssignModal";
import { FaCheck } from "react-icons/fa"; // make sure this is imported

function ProjectDetails() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [techOptions, setTechOptions] = useState([]);
  const [refresh, setRefresh] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [candidateLists, setCandidateLists] = useState({});
  const [selectedCandidates, setSelectedCandidates] = useState({});
  const [editTaskData, setEditTaskData] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [newTask, setNewTask] = useState({
    tech_stack_id: "",
    estimated_hours: "",
    deadline: "",
    start_date: "",
  });

  const [assigningTask, setAssigningTask] = useState(null);

  const openAssignModal = (task) => {
    setAssigningTask(task);
    fetchCandidates(task.task_id, true);
  };

  const closeAssignModal = () => {
    setAssigningTask(null);
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      alert("No token found — please log in again.");
      return;
    }

    fetch(`http://localhost:8000/projects/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then((data) => setProject(data))
      .catch(async (err) => {
        const errorText = await err?.response?.text?.();
        console.error("❌ Error fetching projects:", err, errorText);
      });

    fetch("http://localhost:8000/tech_stack", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then((data) => setTechOptions(data))
      .catch(async (err) => {
        const errorText = await err?.response?.text?.();
        console.error("❌ Error fetching projects:", err, errorText);
      });
  }, [id]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      alert("No token found — please log in again.");
      return;
    }

    fetch(`http://localhost:8000/projects/${id}/tasks`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.json())

      .then((data) => {
        setTasks(data);
        data.forEach((task) => {
          if (!task.employee_id && !candidateLists[task.task_id]) {
            fetch(`http://localhost:8000/tasks/${task.task_id}/candidates`, {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            })
              .then((res) => res.json())
              .then((candidates) => {
                setCandidateLists((prev) => ({
                  ...prev,
                  [task.task_id]: candidates,
                }));
              });
          }
        });
      });
  }, [id, refresh]);

  const toggleCompletion = (taskId) => {
    const token = localStorage.getItem("token");
    if (!token) {
      alert("No token found — please log in again.");
      return;
    }

    fetch(`http://localhost:8000/tasks/${taskId}/toggle-completion`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }).then(() => setRefresh(!refresh));
  };

  // const fetchCandidates = (taskId) => {
  //   const token = localStorage.getItem("token");

  //   if (candidateLists[taskId]) return;

  //   fetch(`http://localhost:8000/tasks/${taskId}/candidates`, {
  //     headers: {
  //       Authorization: `Bearer ${token}`,
  //     },
  //   })
  //     .then((res) => res.json())
  //     .then((data) => {
  //       setCandidateLists((prev) => ({ ...prev, [taskId]: data }));
  //     });
  // };

  const fetchCandidates = (taskId) => {
    const token = localStorage.getItem("token");

    if (!token) {
      console.error("⚠️ No token found in localStorage.");
      alert("You must log in to fetch candidates.");
      return;
    }

    fetch(`http://localhost:8000/tasks/${taskId}/candidates`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`❌ ${res.status} ${res.statusText}`);
        }
        return res.json();
      })
      .then((data) => {
        console.log("✅ Candidates fetched:", data);
        setCandidateLists((prev) => ({ ...prev, [taskId]: data }));
      })
      .catch((err) => {
        console.error("❌ Error fetching candidates:", err);
        alert(
          "Error fetching candidates — likely due to an expired or missing token."
        );
      });
  };

  const handleUnassign = (taskId) => {
    const token = localStorage.getItem("token");
    if (!token) {
      alert("No token found — please log in again.");
      return;
    }

    fetch(`http://localhost:8000/tasks/${taskId}/unassign`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }).then(() => {
      setCandidateLists((prev) => {
        const newList = { ...prev };
        delete newList[taskId];
        return newList;
      });
      setRefresh(!refresh);
    });
  };

  const handleAssign = (taskId, employeeIds, hours) => {
  if (!employeeIds || employeeIds.length === 0) {
    alert("❌ Please select at least one employee to assign.");
    return;
  }

  if (!hours || hours.length !== employeeIds.length) {
    alert("❌ Please enter hours for each selected employee.");
    return;
  }

  // Check for missing or non-positive hour values
  const missingOrInvalid = hours.some((h) => !h || parseFloat(h) <= 0);
  if (missingOrInvalid) {
    alert("❌ All selected employees must have valid hour values greater than 0.");
    return;
  }

  // 🚨 Check if assigned hours exceed total task hours
  const task = tasks.find((t) => t.task_id === taskId);
  const totalAssigned = hours.reduce((sum, h) => sum + parseFloat(h), 0);
  if (totalAssigned > task.estimated_hours) {
    alert(`❌ Assigned hours (${totalAssigned}) exceed task's limit (${task.estimated_hours}).`);
    return;
  }

  const token = localStorage.getItem("token");
  if (!token) {
    alert("No token found - please log in again.");
    return;
  }

  fetch(`http://localhost:8000/tasks/assign`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      task_id: taskId,
      employee_ids: employeeIds,
      hours: hours.map((h) => parseFloat(h)),
      start_date: new Date().toISOString().split("T")[0],
    }),
  })
    .then((res) => {
      if (!res.ok) throw new Error("Failed to assign task");
      return res.json();
    })
    .then(() => {
      setCandidateLists((prev) => {
        const updated = { ...prev };
        delete updated[taskId];
        return updated;
      });

      setRefresh((prev) => !prev);
    })
    .catch((err) => {
      console.error("❌ Assignment error:", err);
      alert("❌ Task assignment failed. Please check employee limits or provided hours.");
    });
};


  const handleTaskChange = (e) => {
    setNewTask({ ...newTask, [e.target.name]: e.target.value });
  };

  const handleAddTask = (e) => {
    e.preventDefault();

    const token = localStorage.getItem("token");

    fetch(`http://localhost:8000/projects/${id}/tasks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(newTask),
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error("❌ Task creation failed");
        }
        return res.json();
      })
      .then(() => {
        setNewTask({
          tech_stack_id: "",
          estimated_hours: "",
          deadline: "",
          start_date: "",
        });
        setShowTaskModal(false);
        setRefresh(!refresh);
      })
      .catch((err) => {
        console.error("🛑 Task creation error:", err);
      });
  };
  const token = localStorage.getItem("token"); // grab your JWT token

  const handleEditTask = (task) => {
    setEditTaskData({
      task_id: task.task_id,
      estimated_hours: task.estimated_hours,
      start_date: task.start_date,
      deadline: task.deadline,
    });
    setShowEditModal(true);
  };

  const handleEditChange = (e) => {
    setEditTaskData({ ...editTaskData, [e.target.name]: e.target.value });
  };

  const handleDeleteTask = (taskId) => {
    if (window.confirm("Are you sure you want to delete this task?")) {
      fetch(`http://localhost:8000/tasks/${taskId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`, // 🔐 ADD THIS
        },
      }).then(() => setRefresh((prev) => !prev));
    }
  };

  const submitTaskEdit = () => {
    fetch(`http://localhost:8000/tasks/${editTaskData.task_id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`, // 🔐 ADD THIS
      },
      body: JSON.stringify(editTaskData),
    })
      .then((res) => res.json())
      .then(() => {
        setShowEditModal(false);
        setRefresh((prev) => !prev); // trigger task list reload
      })
      .catch((err) => console.error("Edit task failed:", err));
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#B262D1] to-[#161748]  text-white px-6 py-10">
      {project && (
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-3xl font-bold mb-1">
              📋 {project.project_name}
            </h2>
            <p>
              <strong>Client:</strong> {project.client_name}
            </p>
            <p>
              <strong>Start:</strong> {project.start_date} |{" "}
              <strong>Deadline:</strong> {project.deadline}
            </p>
          </div>
          <button
            onClick={() => setShowTaskModal(true)}
            className="bg-[#39a0ca] hover:bg-[#2c89b0] text-white font-semibold px-4 py-2 rounded-lg shadow"
          >
            + Add Task
          </button>
        </div>
      )}

      <table className="min-w-full table-auto bg-white bg-opacity-10 text-white rounded-xl">
        <thead>
          <tr>
            <th className="px-4 py-2 text-center">Actions</th>
            <th className="px-4 py-2">Complete</th>
            <th className="px-4 py-2">Task</th>
            <th className="px-4 py-2">Assigned To</th>
            <th className="px-4 py-2">Hours</th>
            <th className="px-4 py-2">Start</th>
            <th className="px-4 py-2">Deadline</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => (
            <tr
              key={task.task_id}
              className={`transition ${
                task.completed
                  ? "opacity-50 pointer-events-none"
                  : "hover:bg-white/20"
              }`}
            >
              <td className="text-center px-4 py-2">
                <div className="flex justify-center gap-2 pointer-events-auto">
                  <button
                    onClick={() => handleEditTask(task)}
                    className="text-white hover:text-yellow-300"
                  >
                    <FaPen size={14} />
                  </button>
                  <button
                    onClick={() => handleDeleteTask(task.task_id)}
                    className="text-white hover:text-red-400"
                  >
                    <FaTrashAlt size={14} />
                  </button>
                </div>
              </td>

              <td className="text-center">
                <div className="pointer-events-auto">
                  <div
                    onClick={() =>
                      task.employee_id && toggleCompletion(task.task_id)
                    }
                    className={`flex items-center justify-center h-full text-lg transition-transform duration-200
      ${
        !task.employee_id
          ? "opacity-30 cursor-not-allowed"
          : "cursor-pointer hover:scale-110"
      }
    `}
                    title={
                      !task.employee_id
                        ? "Assign this task before completing it"
                        : "Toggle completion"
                    }
                  >
                    <FaCheck
                      className={
                        task.completed ? "text-green-400" : "text-white"
                      }
                    />
                  </div>
                </div>
              </td>

              <td className="text-center">{task.tech_stack_name}</td>
              <td className="text-center">
                {task.employee_id ? (
                  <a
                    href={`/employees/${task.employee_id}`}
                    className="text-blue-300 underline hover:text-blue-500"
                    title={`Go to ${task.employee_name}'s profile`}
                  >
                    {task.employee_name}
                  </a>
                ) : (
                  <button
                    onClick={() => openAssignModal(task)}
                    className="bg-[#39a0ca] hover:bg-[#2c89b0] text-white px-3 py-1 rounded"
                  >
                    Assign
                  </button>
                )}
              </td>

              <td className="text-center">{task.estimated_hours}</td>
              <td className="text-center">{task.start_date || "-"}</td>
              <td className="text-center">{task.deadline}</td>
              <td className="text-center">
                {task.employee_id && (
                  <button
                    onClick={() => handleUnassign(task.task_id)}
                    className="bg-red-300 text-red-800 px-2 py-1 rounded hover:bg-red-400"
                  >
                    Unassign
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Add Task Modal */}
      {showTaskModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md relative text-black">
            <button
              onClick={() => setShowTaskModal(false)}
              className="absolute top-2 right-3 text-gray-600 hover:text-black text-xl"
            >
              &times;
            </button>
            <h3 className="text-lg font-bold mb-4">+ Add New Task</h3>
            <form onSubmit={handleAddTask} className="space-y-4">
              <select
                name="tech_stack_id"
                value={newTask.tech_stack_id}
                onChange={handleTaskChange}
                required
                className="w-full border border-gray-300 rounded px-3 py-2"
              >
                <option value="">Select Tech Stack</option>
                {techOptions.map((stack) => (
                  <option key={stack.tech_stack_id} value={stack.tech_stack_id}>
                    {stack.tech_stack_name}
                  </option>
                ))}
              </select>
              <input
                name="estimated_hours"
                type="number"
                placeholder="Estimated Hours"
                value={newTask.estimated_hours}
                onChange={handleTaskChange}
                required
                className="w-full border border-gray-300 rounded px-3 py-2"
              />
              <input
                name="start_date"
                type="date"
                value={newTask.start_date || ""}
                onChange={handleTaskChange}
                required
                className="w-full border border-gray-300 rounded px-3 py-2"
              />

              <input
                name="deadline"
                type="date"
                value={newTask.deadline}
                onChange={handleTaskChange}
                required
                className="w-full border border-gray-300 rounded px-3 py-2"
              />
              <button
                type="submit"
                className="w-full bg-[#f95d9b] hover:bg-[#e84a8b] text-white font-semibold py-2 rounded"
              >
                Add Task
              </button>
            </form>
          </div>
        </div>
      )}

      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white text-black rounded-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">✏️ Edit Task</h3>
            <div className="space-y-4">
              <label className="block">
                Estimated Hours:
                <input
                  name="estimated_hours"
                  type="number"
                  value={editTaskData.estimated_hours}
                  onChange={handleEditChange}
                  className="w-full border rounded px-3 py-2"
                />
              </label>
              <label className="block">
                Start Date:
                <input
                  name="start_date"
                  type="date"
                  value={editTaskData.start_date}
                  onChange={handleEditChange}
                  className="w-full border rounded px-3 py-2"
                />
              </label>
              <label className="block">
                Deadline:
                <input
                  name="deadline"
                  type="date"
                  value={editTaskData.deadline}
                  onChange={handleEditChange}
                  className="w-full border rounded px-3 py-2"
                />
              </label>
              <div className="flex justify-end gap-4">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 bg-gray-300 rounded"
                >
                  Cancel
                </button>
                <button
                  onClick={submitTaskEdit}
                  className="px-4 py-2 bg-blue-600 text-white rounded"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {assigningTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white text-black rounded-xl p-6 w-full max-w-lg relative">
            <button
              onClick={closeAssignModal}
              className="absolute top-2 right-4 text-2xl"
            >
              &times;
            </button>
            <h3 className="text-xl font-bold mb-4">
              Assign Task: {assigningTask.tech_stack_name}
            </h3>
            {candidateLists[assigningTask.task_id] ? (
              <AssignModal
                candidates={candidateLists[assigningTask.task_id]}
                taskTitle={assigningTask.tech_stack_name}
                taskHours={assigningTask.estimated_hours}
                onConfirm={(ids, hours) => {
                  handleAssign(assigningTask.task_id, ids, hours);
                  closeAssignModal();
                }}
                onCancel={closeAssignModal}
              />
            ) : (
              <p>Loading candidates...</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default ProjectDetails;
/////////////////////////////////////////////////////////////////////////
