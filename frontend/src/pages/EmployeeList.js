//////////////////////////////////////////////////////////////////////////////////////
// ✅ EmployeeList.js with sorting/filter buttons on each column
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import UploadDownloadSection from "../components/UploadDownloadSection";
import {
  FaUserTie,
  FaClock,
  FaUsers,
  FaTrashAlt,
  FaPen,
  FaSortUp,
  FaSortDown,
  FaSearch,
} from "react-icons/fa";

function EmployeeList() {
  const [employees, setEmployees] = useState([]);
  const [newEmp, setNewEmp] = useState({
    employee_id: "",
    employee_name: "",
    role: "",
    weekly_hours: "",
  });
  const [showModal, setShowModal] = useState(false);
  const [editEmp, setEditEmp] = useState(null);
  const [sortKey, setSortKey] = useState("employee_id");
  const [sortOrder, setSortOrder] = useState("asc");
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [showBenchedOnly, setShowBenchedOnly] = useState(false);
  const token = localStorage.getItem("token");

  const fetchEmployees = () => {
    const token = localStorage.getItem("token");

    fetch("http://localhost:8000/employees", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error("Unauthorized or failed to fetch");
        }
        return res.json();
      })
      .then((data) => {
        setEmployees(data);
      })
      .catch((err) => console.error("Error fetching employees:", err));
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const sortBy = (key) => {
    const order = sortKey === key && sortOrder === "asc" ? "desc" : "asc";
    setSortKey(key);
    setSortOrder(order);
    const sorted = [...employees].sort((a, b) => {
      if (a[key] < b[key]) return order === "asc" ? -1 : 1;
      if (a[key] > b[key]) return order === "asc" ? 1 : -1;
      return 0;
    });
    setEmployees(sorted);
  };

  const getSortIcon = (key) =>
    sortKey === key ? (
      sortOrder === "asc" ? (
        <FaSortUp className="inline ml-1" />
      ) : (
        <FaSortDown className="inline ml-1" />
      )
    ) : null;

  const filteredEmployees = employees.filter((e) => {
    const query = searchTerm.toLowerCase();
    return (
      query === "" ||
      e.employee_id.toString().includes(query) ||
      e.employee_name.toLowerCase().includes(query) ||
      e.role?.toLowerCase().includes(query)
    );
  });

  const total = employees.length;
  const benched = employees.filter((e) => e.current_load === 0).length;
  const avgLoad =
    total > 0
      ? Math.round(
          employees.reduce(
            (sum, e) =>
              sum +
              (e.weekly_hours > 0
                ? (e.current_load / e.weekly_hours) * 100
                : 0),
            0
          ) / total
        )
      : 0;

  const handleEmpChange = (e) => {
    setNewEmp({ ...newEmp, [e.target.name]: e.target.value });
  };

  const handleAddEmployee = (e) => {
    e.preventDefault();
    fetch("http://localhost:8000/employees", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(newEmp),
    })
      .then((res) => res.json())
      .then(() => {
        setNewEmp({
          employee_id: "",
          employee_name: "",
          role: "",
          weekly_hours: "",
        });
        setShowModal(false);
        fetchEmployees();
      })
      .catch((err) => console.error("Error adding employee:", err));
  };

  const handleEdit = (emp) => {
    setEditEmp({ ...emp });
  };
  const statsVariants = {
    hidden: { opacity: 0, y: 40 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { delay: 0.2, duration: 0.8 },
    },
  };

  const tableRowVariants = {
    hidden: { opacity: 0 },
    visible: (i) => ({
      opacity: 1,
      transition: { delay: i * 0.04 },
    }),
  };
  const handleUpdate = (e) => {
    e.preventDefault();
    fetch(`http://localhost:8000/employees/${editEmp.employee_id}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(editEmp),
    })
      .then((res) => res.json())
      .then(() => {
        setEditEmp(null);
        fetchEmployees();
      })
      .catch((err) => console.error("Error updating employee:", err));
  };

  const handleDelete = (id) => {
    if (window.confirm("Are you sure you want to delete this employee?")) {
      fetch(`http://localhost:8000/employees/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(() => fetchEmployees())
        .catch((err) => console.error("Failed to delete", err));
    }
  };

  return (
    <div className="min-h-screen text-white bg-gradient-to-b from-[#39a0ca] to-[#161748]  m-0 p-0">
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-4xl font-bold">👥 All Employees</h2>
          <button
            onClick={() => setShowModal(true)}
            className="bg-pink-500 hover:bg-pink-400 text-white font-bold px-4 py-2 rounded shadow"
          >
            + Add Employee
          </button>
        </div>

        <UploadDownloadSection />

        <div className="mb-6 flex items-center gap-3">
          <FaSearch className="text-white text-lg" />
          <input
            placeholder="Search by ID, Name or Role"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="p-2 rounded w-full max-w-xs text-black"
          />
        </div>

        {/* ✅ Stats Section with Motion  */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10"
          variants={statsVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Total Employees */}
          <motion.div
            variants={statsVariants}
            className="bg-white/10 rounded-xl p-4 flex items-center gap-4"
          >
            <div>
              <p className="text-sm uppercase text-pink-200">Total Employees</p>
              <h3 className="text-2xl font-bold">{total}</h3>
            </div>
          </motion.div>

          {/* Benched */}
          <motion.div
            variants={statsVariants}
            onClick={() => setShowBenchedOnly(!showBenchedOnly)}
            className={`bg-white/10 rounded-xl p-4 flex items-center gap-4 cursor-pointer transition hover:bg-white/20 ${
              showBenchedOnly ? "ring-2 ring-blue-300" : ""
            }`}
          >
            <FaUserTie className="text-blue-300 text-3xl" />
            <div>
              <p className="text-sm uppercase text-blue-200">Benched</p>
              <h3 className="text-2xl font-bold">{benched}</h3>
              {showBenchedOnly && (
                <span className="text-xs text-blue-100 underline">
                  Clear Filter
                </span>
              )}
            </div>
          </motion.div>

          {/* Avg Load */}
          <motion.div
            variants={statsVariants}
            className="bg-white/10 rounded-xl p-4 flex items-center gap-4"
          >
            <FaClock className="text-purple-300 text-3xl" />
            <div>
              <p className="text-sm uppercase text-purple-200">Avg Load %</p>
              <h3 className="text-2xl font-bold">{avgLoad}%</h3>
            </div>
          </motion.div>
        </motion.div>

        {/* Edit Employee */}
        {editEmp && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white text-black rounded-xl p-8 w-full max-w-lg">
              <h3 className="text-2xl font-semibold mb-4">✏️ Edit Employee</h3>
              <form onSubmit={handleUpdate} className="space-y-4">
                <input
                  name="employee_name"
                  placeholder="Full Name"
                  value={editEmp.employee_name}
                  onChange={(e) =>
                    setEditEmp({ ...editEmp, employee_name: e.target.value })
                  }
                  required
                  className="w-full p-2 border rounded"
                />
                <label className="block">
                  Role:
                  <select
                    name="role"
                    value={editEmp.role}
                    onChange={(e) =>
                      setEditEmp({ ...editEmp, role: e.target.value })
                    }
                    required
                    className="w-full p-2 mt-1 border rounded"
                  >
                    <option value="">--Select Role--</option>
                    <option value="Frontend Developer">
                      Frontend Developer
                    </option>
                    <option value="Backend Developer">Backend Developer</option>
                    <option value="Designer">Designer</option>
                    <option value="QA Engineer">QA Engineer</option>
                    <option value="Project Manager">Project Manager</option>
                    <option value="Data Analyst">Data Analyst</option>
                    <option value="Database Admin">Database Admin</option>
                  </select>
                </label>

                <div className="flex justify-end gap-4">
                  <button
                    type="button"
                    onClick={() => setEditEmp(null)}
                    className="px-4 py-2 bg-gray-300 rounded"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#161748] text-white rounded"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        {/* ✅ Employee Table with animated rows */}
        <table className="w-full table-auto bg-white bg-opacity-10 backdrop-blur-sm rounded-xl text-white mb-10">
          <thead>
            <tr className="text-pink-200 text-left">
              <th className="px-4 py-3"></th>
              <th
                className="px-4 py-3 cursor-pointer"
                onClick={() => sortBy("employee_id")}
              >
                ID {getSortIcon("employee_id")}
              </th>
              <th
                className="px-4 py-3 cursor-pointer"
                onClick={() => sortBy("employee_name")}
              >
                Name {getSortIcon("employee_name")}
              </th>
              <th
                className="px-4 py-3 cursor-pointer"
                onClick={() => sortBy("role")}
              >
                Role {getSortIcon("role")}
              </th>
              <th
                className="px-4 py-3 cursor-pointer"
                onClick={() => sortBy("average_rating")}
              >
                Avg Performance Rating {getSortIcon("average_rating")}
              </th>

              <th
                className="px-4 py-3 cursor-pointer"
                onClick={() => sortBy("current_load")}
              >
                Load % {getSortIcon("current_load")}
              </th>
              <th
                className="px-4 py-3 cursor-pointer"
                onClick={() => sortBy("task_count")}
              >
                # Tasks {getSortIcon("task_count")}
              </th>
            </tr>
          </thead>

          <tbody>
            {employees
              .filter((e) => {
                const query = searchTerm.toLowerCase();
                const matchesSearch =
                  query === "" ||
                  e.employee_id.toString().includes(query) ||
                  e.employee_name.toLowerCase().includes(query) ||
                  e.role?.toLowerCase().includes(query);
                const isBenched = !showBenchedOnly || e.current_load === 0;
                return matchesSearch && isBenched;
              })
              .map((emp, i) => {
                const rawLoad = emp.current_load ?? 0;
                const taskCount = emp.task_count ?? 0;
                const load =
                  emp.weekly_hours > 0
                    ? Math.round((rawLoad / emp.weekly_hours) * 100)
                    : 0;
                return (
                  <motion.tr
                    key={emp.employee_id}
                    custom={i}
                    variants={tableRowVariants}
                    initial="hidden"
                    animate="visible"
                    className="hover:bg-white/20 transition cursor-pointer"
                    onClick={() => navigate(`/employees/${emp.employee_id}`)}
                  >
                    <td
                      className="px-4 py-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(emp)}
                          className="text-white hover:text-yellow-300"
                        >
                          <FaPen size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(emp.employee_id)}
                          className="text-white hover:text-red-400"
                        >
                          <FaTrashAlt size={14} />
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-2">{emp.employee_id}</td>
                    <td className="px-4 py-2">{emp.employee_name}</td>
                    <td className="px-4 py-2">{emp.role || "-"}</td>
                    <td className="px-4 py-2">
                      {emp.average_rating !== null
                        ? emp.average_rating.toFixed(2)
                        : "N/A"}
                    </td>
                    <td className="px-4 py-2">{load}%</td>
                    <td className="px-4 py-2">{taskCount}</td>
                  </motion.tr>
                );
              })}
          </tbody>
        </table>

        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white text-black rounded-xl p-8 w-full max-w-lg">
              <h3 className="text-2xl font-semibold mb-4">
                ➕ Add New Employee
              </h3>
              <form onSubmit={handleAddEmployee} className="space-y-4">
                <input
                  name="employee_id"
                  type="number"
                  placeholder="Employee ID"
                  value={newEmp.employee_id}
                  onChange={handleEmpChange}
                  required
                  className="w-full p-2 border rounded"
                />
                <input
                  name="employee_name"
                  placeholder="Full Name"
                  value={newEmp.employee_name}
                  onChange={handleEmpChange}
                  required
                  className="w-full p-2 border rounded"
                />
                <label className="block">
                  Role:
                  <select
                    name="role"
                    value={newEmp.role}
                    onChange={handleEmpChange}
                    required
                    className="w-full p-2 mt-1 border rounded"
                  >
                    <option value="">--Select Role--</option>
                    <option value="Frontend Developer">
                      Frontend Developer
                    </option>
                    <option value="Backend Developer">Backend Developer</option>
                    <option value="Designer">Designer</option>
                    <option value="QA Engineer">QA Engineer</option>
                    <option value="Project Manager">Project Manager</option>
                    <option value="Data Analyst">Data Analyst</option>
                    <option value="Database Admin">Database Admin</option>
                  </select>
                </label>
                <input
                  name="weekly_hours"
                  type="number"
                  placeholder="Weekly Hours"
                  value={newEmp.weekly_hours}
                  onChange={handleEmpChange}
                  required
                  className="w-full p-2 border rounded"
                />

                <div className="flex justify-end gap-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 bg-gray-300 rounded"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#161748] text-white rounded"
                  >
                    Add Employee
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default EmployeeList;
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
