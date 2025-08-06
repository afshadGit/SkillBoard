import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaListUl,
  FaClock,
  FaTasks,
  FaSearch,
  FaSortUp,
  FaSortDown,
} from "react-icons/fa";
import { motion } from "framer-motion";

function ProjectList() {
  const [projects, setProjects] = useState([]);

  const [stats, setStats] = useState({ total: 0, nearDue: 0, taskCount: 0 });
  const [showModal, setShowModal] = useState(false);
  const [newProject, setNewProject] = useState({
    project_name: "",
    client_name: "",
    start_date: "",
    deadline: "",
    project_type: "",
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [sortKey, setSortKey] = useState("project_id");
  const [sortOrder, setSortOrder] = useState("asc");
  const navigate = useNavigate();
  const [showNearDeadlineOnly, setShowNearDeadlineOnly] = useState(false);

  const handleDownloadProjects = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("http://localhost:8000/download/projects", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to download file");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "projects.xlsx");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error downloading:", error);
      alert("Failed to download project data.");
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("token");

    fetch("http://localhost:8000/projects", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then((data) => setProjects(data))
      .catch((err) => console.error("Failed to fetch projects:", err));

    fetch("http://localhost:8000/stats/projects", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then((data) => setStats(data))
      .catch((err) => console.error("Failed to fetch project stats:", err));
  }, []); // ✅ useEffect only includes fetch logic
  const handleChange = (e) => {
    setNewProject({ ...newProject, [e.target.name]: e.target.value });
  };

  const handleAddProject = (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");

    fetch("http://localhost:8000/projects", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`, // ✅ added
      },
      body: JSON.stringify(newProject),
    })
      .then((res) => res.json())
      .then(() => {
        setShowModal(false);
        setNewProject({
          project_name: "",
          client_name: "",
          start_date: "",
          deadline: "",
          project_type: "",
        });

        // ✅ Refresh projects
        return fetch("http://localhost:8000/projects", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      })
      .then((res) => res.json())
      .then((data) => setProjects(data))
      .catch((err) => console.error("Failed to create project:", err));
  };

  const sortBy = (key) => {
    const order = sortKey === key && sortOrder === "asc" ? "desc" : "asc";
    setSortKey(key);
    setSortOrder(order);

    const isDateField = key === "start_date" || key === "deadline";
    const getComparableValue = (val) => (isDateField ? new Date(val) : val);

    const sorted = [...projects].sort((a, b) => {
      const aVal = getComparableValue(a[key]);
      const bVal = getComparableValue(b[key]);
      if (aVal < bVal) return order === "asc" ? -1 : 1;
      if (aVal > bVal) return order === "asc" ? 1 : -1;
      return 0;
    });

    setProjects(sorted);
  };

  const getSortIcon = (key) =>
    sortKey === key ? (
      sortOrder === "asc" ? (
        <FaSortUp className="inline ml-1" />
      ) : (
        <FaSortDown className="inline ml-1" />
      )
    ) : null;

  if (!Array.isArray(projects)) {
    console.error("❌ Projects is not an array:", projects);
    return null;
  }
  const filteredProjects = projects.filter((p) => {
    const query = searchTerm.toLowerCase();
    const matchesSearch =
      query === "" ||
      p.project_name.toLowerCase().includes(query) ||
      p.client_name.toLowerCase().includes(query);

    const matchesDeadline =
      !showNearDeadlineOnly ||
      (new Date(p.deadline) - new Date() <= 7 * 24 * 60 * 60 * 1000 &&
        new Date(p.deadline) >= new Date());

    return matchesSearch && matchesDeadline;
  });

  const toggleNearDeadlineFilter = () => {
    setShowNearDeadlineOnly(!showNearDeadlineOnly);
  };

  return (
    <div className="min-h-screen text-white bg-gradient-to-b from-[#3e4d9a] via-[#161748] to-[#39a0ca] m-0 p-0">
      <div className="max-w-6xl mx-auto px-6 py-10">
        {/* Title & Add Project */}
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-4xl font-bold">All Projects</h2>
          <button
            onClick={() => setShowModal(true)}
            className="bg-pink-500 hover:bg-pink-400 text-white font-bold px-4 py-2 rounded shadow"
          >
            + Add Project
          </button>
        </div>

        {/* 🔍 Search Bar Animation */}
        <motion.div
          className="mb-6 flex items-center gap-3"
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
        >
          <FaSearch className="text-white text-lg" />
          <input
            placeholder="Search by Project or Client"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="p-2 rounded w-full max-w-xs text-black"
          />
        </motion.div>

        {/* 📊 Stats with Animation */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.15 } },
          }}
        >
          {[
            {
              icon: <FaListUl className="text-pink-300 text-3xl" />,
              label: "Total Projects",
              value: stats.total,
              color: "text-pink-200",
            },
            {
              icon: <FaClock className="text-blue-300 text-3xl" />,
              label: "Near Deadline",
              value: stats.nearDue,
              color: "text-blue-200",
            },
            {
              icon: <FaTasks className="text-purple-300 text-3xl" />,
              label: "Total Tasks",
              value: stats.taskCount,
              color: "text-purple-200",
            },
          ].map((card, index) => (
            <motion.div
              key={index}
              className={`bg-white/10 rounded-xl p-4 flex items-center gap-4 cursor-pointer ${
                card.label === "Near Deadline" && "hover:bg-white/20"
              }`}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.2 }}
              onClick={
                card.label === "Near Deadline"
                  ? toggleNearDeadlineFilter
                  : undefined
              }
            >
              {card.icon}
              <div>
                <p className={`text-sm uppercase ${card.color}`}>
                  {card.label}
                </p>
                <h3 className="text-2xl font-bold">{card.value}</h3>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* 📋 Animated Project Table */}
        <motion.table
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="w-full table-auto bg-white bg-opacity-10 backdrop-blur-sm rounded-xl text-white mb-10"
        >
          <thead>
            <tr className="text-pink-200 text-left">
              <th className="px-4 py-3">ID</th>
              <th
                className="px-4 py-3 cursor-pointer"
                onClick={() => sortBy("project_name")}
              >
                Project Name {getSortIcon("project_name")}
              </th>
              <th
                className="px-4 py-3 cursor-pointer"
                onClick={() => sortBy("client_name")}
              >
                Client {getSortIcon("client_name")}
              </th>
              <th
                className="px-4 py-3 cursor-pointer"
                onClick={() => sortBy("start_date")}
              >
                Start Date {getSortIcon("start_date")}
              </th>
              <th
                className="px-4 py-3 cursor-pointer"
                onClick={() => sortBy("deadline")}
              >
                Deadline {getSortIcon("deadline")}
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredProjects.map((proj, index) => (
              <motion.tr
                key={proj.project_id}
                className="hover:bg-white/20 transition cursor-pointer"
                onClick={() => navigate(`/projects/${proj.project_id}`)}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <td className="px-4 py-2">{proj.project_id}</td>
                <td className="px-4 py-2">{proj.project_name}</td>
                <td className="px-4 py-2">{proj.client_name}</td>
                <td className="px-4 py-2">{proj.start_date}</td>
                <td className="px-4 py-2">{proj.deadline}</td>
              </motion.tr>
            ))}
          </tbody>
        </motion.table>

        {/* Add Project Modal (conditionally rendered) */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white text-black rounded-xl p-8 w-full max-w-lg">
              <h3 className="text-2xl font-semibold mb-4">
                ➕ Add New Project
              </h3>
              <form onSubmit={handleAddProject} className="space-y-4">
                <input
                  name="project_name"
                  placeholder="Project Name"
                  value={newProject.project_name}
                  onChange={handleChange}
                  required
                  className="w-full p-2 border rounded"
                />
                <input
                  name="client_name"
                  placeholder="Client Name"
                  value={newProject.client_name}
                  onChange={handleChange}
                  required
                  className="w-full p-2 border rounded"
                />
                <input
                  name="start_date"
                  type="date"
                  value={newProject.start_date}
                  onChange={handleChange}
                  required
                  className="w-full p-2 border rounded"
                />
                <input
                  name="deadline"
                  type="date"
                  value={newProject.deadline}
                  onChange={handleChange}
                  required
                  className="w-full p-2 border rounded"
                />
                <label className="block">
                  Project Type:
                  <select
                    name="project_type"
                    value={newProject.project_type}
                    onChange={handleChange}
                    required
                    className="w-full p-2 mt-1 border rounded"
                  >
                    <option value="">--Select Type--</option>
                    <option value="Web App">Web App</option>
                    <option value="Dashboard">Dashboard</option>
                    <option value="Analytics Tool">Analytics Tool</option>
                    <option value="Other">Other (No predefined tasks)</option>
                  </select>
                </label>
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
                    Create Project
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

export default ProjectList;

// // src/pages/ProjectList.js
// import React, { useEffect, useState } from "react";
// import { useNavigate } from "react-router-dom";

// function ProjectList() {
//   const [projects, setProjects] = useState([]);
//   const [showModal, setShowModal] = useState(false);
//   const [newProject, setNewProject] = useState({
//     project_name: "",
//     client_name: "",
//     start_date: "",
//     deadline: "",
//     project_type: "",
//   });
//   const navigate = useNavigate();

//   useEffect(() => {
//     fetch("http://localhost:8000/projects")
//       .then((res) => res.json())
//       .then((data) => setProjects(data))
//       .catch((err) => console.error("Failed to fetch projects:", err));
//   }, []);

//   const handleChange = (e) => {
//     setNewProject({ ...newProject, [e.target.name]: e.target.value });
//   };

//   const handleAddProject = (e) => {
//     e.preventDefault();
//     fetch("http://localhost:8000/projects", {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify(newProject),
//     })
//       .then((res) => res.json())
//       .then(() => {
//         setShowModal(false);
//         setNewProject({
//           project_name: "",
//           client_name: "",
//           start_date: "",
//           deadline: "",
//           project_type: "",
//         });
//         return fetch("http://localhost:8000/projects");
//       })
//       .then((res) => res.json())
//       .then((data) => setProjects(data))
//       .catch((err) => console.error("Failed to create project:", err));
//   };

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-[#f95d9b] via-[#161748] to-[#39a0ca] text-white py-12 px-6">
//       <div className="flex justify-between items-center max-w-6xl mx-auto mb-8">
//         <h1 className="text-4xl font-bold">All Projects</h1>
//         <button
//           onClick={() => setShowModal(true)}
//           className="bg-[#f95d9b] hover:bg-[#e84a8b] text-white font-semibold px-5 py-2 rounded-xl shadow-md transition"
//         >
//           Add Project
//         </button>
//       </div>

//       {showModal && (
//         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
//           <div className="bg-white text-black rounded-xl p-8 w-full max-w-lg">
//             <h3 className="text-2xl font-semibold mb-4">➕ Add New Project</h3>
//             <form onSubmit={handleAddProject} className="space-y-4">
//               <input
//                 name="project_name"
//                 placeholder="Project Name"
//                 value={newProject.project_name}
//                 onChange={handleChange}
//                 required
//                 className="w-full p-2 border rounded"
//               />
//               <input
//                 name="client_name"
//                 placeholder="Client Name"
//                 value={newProject.client_name}
//                 onChange={handleChange}
//                 required
//                 className="w-full p-2 border rounded"
//               />
//               <input
//                 name="start_date"
//                 type="date"
//                 value={newProject.start_date}
//                 onChange={handleChange}
//                 required
//                 className="w-full p-2 border rounded"
//               />
//               <input
//                 name="deadline"
//                 type="date"
//                 value={newProject.deadline}
//                 onChange={handleChange}
//                 required
//                 className="w-full p-2 border rounded"
//               />
//               <label className="block">
//                 Project Type:
//                 <select
//                   name="project_type"
//                   value={newProject.project_type}
//                   onChange={handleChange}
//                   required
//                   className="w-full p-2 mt-1 border rounded"
//                 >
//                   <option value="">--Select Type--</option>
//                   <option value="Web App">Web App</option>
//                   <option value="Dashboard">Dashboard</option>
//                   <option value="Analytics Tool">Analytics Tool</option>
//                   <option value="Other">Other (No predefined tasks)</option>
//                 </select>
//               </label>
//               <div className="flex justify-end gap-4">
//                 <button
//                   type="button"
//                   onClick={() => setShowModal(false)}
//                   className="px-4 py-2 bg-gray-300 rounded"
//                 >
//                   Cancel
//                 </button>
//                 <button
//                   type="submit"
//                   className="px-4 py-2 bg-[#161748] text-white rounded"
//                 >
//                   Create Project
//                 </button>
//               </div>
//             </form>
//           </div>
//         </div>
//       )}

//       <div className="max-w-6xl mx-auto overflow-x-auto">
//         <table className="w-full text-left border-separate border-spacing-y-2">
//           <thead className="bg-[#161748] text-white">
//             <tr>
//               <th className="px-4 py-3 rounded-l-lg">ID</th>
//               <th className="px-4 py-3">Project Name</th>
//               <th className="px-4 py-3">Client</th>
//               <th className="px-4 py-3">Start Date</th>
//               <th className="px-4 py-3">Deadline</th>
//               <th className="px-4 py-3 rounded-r-lg">Details</th>
//             </tr>
//           </thead>
//           <tbody>
//             {projects.map((proj) => (
//               <tr
//                 key={proj.project_id}
//                 className="bg-white/10 text-white hover:bg-white/20 transition"
//               >
//                 <td className="px-4 py-3">{proj.project_id}</td>
//                 <td className="px-4 py-3">{proj.project_name}</td>
//                 <td className="px-4 py-3">{proj.client_name}</td>
//                 <td className="px-4 py-3">{proj.start_date}</td>
//                 <td className="px-4 py-3">{proj.deadline}</td>
//                 <td className="px-4 py-3">
//                   <button
//                     onClick={() => navigate(`/projects/${proj.project_id}`)}
//                     className="bg-[#39a0ca] hover:bg-[#2c89b0] text-white px-4 py-2 rounded-lg"
//                   >
//                     View
//                   </button>
//                 </td>
//               </tr>
//             ))}
//           </tbody>
//         </table>
//       </div>
//     </div>
//   );
// }

// export default ProjectList;
