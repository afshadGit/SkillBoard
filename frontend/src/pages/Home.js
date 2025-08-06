

// src/pages/Home.js
import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Particles from "react-tsparticles";
import { loadSlim } from "tsparticles-slim";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from "recharts";
import homeLogo from "../assets/home-logo.png";

const COLORS = ["#39a0ca", "#f95d9b"];
const TASK_COLORS = ["#16a34a", "#d1d5db"];
const PURPLE_PINK_PALETTE = [
  "#d16ba5",
  "#c777b9",
  "#ba83ca",
  "#aa8fd8",
  "#9a9ae1",
  "#8aa7ec",
  "#79b3f4",
  "#69bff8",
];

function Home() {
  const navigate = useNavigate();
  const [projectCount, setProjectCount] = useState(0);
  const [employeePie, setEmployeePie] = useState([]);
  const [benchPie, setBenchPie] = useState([]);
  const [taskPie, setTaskPie] = useState([]);
  const [workloadPie, setWorkloadPie] = useState([]);
  const [deptStats, setDeptStats] = useState([]);
  const statsRef = useRef(null);
  const [projectProgress, setProjectProgress] = useState([]);
  const [monthlyTrends, setMonthlyTrends] = useState([]);

  const token = localStorage.getItem("token");

  useEffect(() => {
    const token = localStorage.getItem("token");
    fetch("http://localhost:8000/stats/dashboard", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        setProjectProgress(data.project_progress);
        setMonthlyTrends(data.monthly_project_trends);
      })
      .catch((err) => console.error("Dashboard stats fetch failed:", err));
  }, [token]);

  useEffect(() => {
    const token = localStorage.getItem("token");

    fetch("http://localhost:8000/stats/dept-workload", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          const fixed = data.map((item) => ({
            role: item.role,
            total: Number(item.total),
            working: Number(item.working),
          }));
          setDeptStats(fixed);
        } else {
          console.error("Expected array, got:", data);
        }
      })
      .catch((err) => console.error("Dept workload fetch failed:", err));
  }, [token]);
useEffect(() => {
  const token = localStorage.getItem("token");

  fetch("http://localhost:8000/analytics", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
    .then((res) => {
      if (!res.ok) {
        throw new Error(`Fetch failed with status ${res.status}`);
      }
      return res.json();
    })
    .then((data) => {
      console.log("✅ Analytics response:", data);

      setProjectCount(data.total_projects);
      setEmployeePie([
        { name: "Available", value: data.employees_available },
        { name: "Fully Loaded", value: data.employees_overloaded },
      ]);
      setTaskPie([
        { name: "Completed", value: data.tasks_completed },
        { name: "Pending", value: data.tasks_pending },
      ]);
      setBenchPie([
        { name: "Benched", value: data.employees_benched },
        { name: "Active", value: data.employees_active },
      ]);
      setWorkloadPie(data.workload_distribution);
    })
    .catch((err) => {
      console.error("❌ Analytics fetch failed:", err);
    });
}, []);


  const particlesInit = async (engine) => {
    await loadSlim(engine);
  };

  const scrollToStats = () => {
    statsRef.current.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen text-white">
      {/* Hero Section */}
      <section className="h-screen flex flex-col items-center justify-center pt-8 text-center px-6 relative overflow-hidden bg-[#161748]">
        <Particles
          id="tsparticles"
          init={particlesInit}
          options={{
            fullScreen: { enable: false },
            background: { color: { value: "#161748" } },
            particles: {
              number: { value: 50 },
              color: { value: "#ffffff" },
              shape: { type: "circle" },
              opacity: { value: 0.1 },
              size: { value: 3 },
              move: { enable: true, speed: 1 },
            },
          }}
          className="absolute inset-0 z-0"
        />

        <motion.img
          initial={{ opacity: 0, y: -40 }}
          animate={{ opacity: 1, y: -60 }}
          transition={{ duration: 1 }}
          src={homeLogo}
          alt="SkillBoard Logo"
          className="w-[36rem] h-auto z-10"
        />

        <motion.div
          initial={{ opacity: 0, y: 0 }}
          animate={{ opacity: 1, y: -60 }}
          transition={{ delay: 0.8, duration: 1 }}
          className="flex gap-6 mt-8 z-10"
        >
          <button
            onClick={() => navigate("/projects")}
            className="w-50 bg-transparent border-2 border-white text-white font-semibold px-6 py-3 rounded-xl hover:bg-white/10 transition duration-300"
          >
            View Projects
          </button>
          <button
            onClick={() => navigate("/employees")}
            className="w-50 bg-transparent border-2 border-white text-white font-semibold px-6 py-3 rounded-xl hover:bg-white/10 transition duration-300"
          >
            View Employees
          </button>
         
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, y: -40 }}
          transition={{ delay: 1.2, duration: 1 }}
          className="absolute bottom-10 z-10 cursor-pointer"
          onClick={scrollToStats}
        >
          <svg
            className="w-6 h-6 animate-bounce text-white"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </motion.div>
      </section>
      <section
        ref={statsRef}
        className="relative py-14 px-4 bg-gradient-to-b from-[#161748] via-[#161748] to-[#0f102e]"
      >
        <div className="absolute inset-0 bg-white/10 backdrop-blur-md z-0"></div>

        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1 }}
          className="relative z-10 max-w-7xl mx-auto"
        >
          {/* 🔢 Top Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              {
                label: "Total Projects",
                value: projectCount,
                color: "#4f46e5",
                icon: "📁",
              },
              {
                label: "Total Employees",
                value:
                  (employeePie[0]?.value || 0) + (employeePie[1]?.value || 0),
                color: "#38bdf8",
                icon: "🧑‍💼",
              },
              {
                label: "Benched Employees",
                value: benchPie[0]?.value || 0,
                color: "#facc15",
                icon: "💤",
              },
              {
                label: "Pending Tasks",
                value: taskPie[1]?.value || 0,
                color: "#f97316",
                icon: "⌛",
              },
            ].map((card, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="bg-white/10 rounded-lg px-4 py-5 text-center shadow"
              >
                <div className="text-2xl mb-2">{card.icon}</div>
                <p className="text-xs uppercase tracking-widest text-gray-300 mb-1">
                  {card.label}
                </p>
                <h3
                  className="text-2xl font-bold"
                  style={{ color: card.color }}
                >
                  {card.value}
                </h3>
              </motion.div>
            ))}
          </div>

          {/* 📊 Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* 📉 Department Workload */}
            <div className="lg:col-span-2 bg-white/10 p-4 rounded-lg shadow">
              <h4 className="text-sm font-semibold mb-3">
                Department Workload
              </h4>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart
                  data={deptStats.map((d) => ({
                    ...d,
                    benched: d.total - d.working,
                  }))}
                  margin={{ top: 10, right: 20, bottom: 60, left: 0 }}
                >
                  <XAxis
                    dataKey="role"
                    stroke="#fff"
                    angle={-45}
                    textAnchor="end"
                    interval={0}
                  />
                  <YAxis stroke="#fff" allowDecimals={false} />
                  <Tooltip formatter={(value) => `${value} employees`} />
                  <Legend verticalAlign="top" />
                  <Bar
                    dataKey="working"
                    stackId="a"
                    fill="#f95d9b"
                    name="Working"
                  />
                  <Bar
                    dataKey="benched"
                    stackId="a"
                    fill="#d1d5db"
                    name="Benched"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* 🍩 Employee Availability */}
            <div className="bg-white/10 p-4 rounded-lg shadow text-center">
              <h4 className="text-sm font-semibold mb-3">
                Employee Availability
              </h4>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={employeePie}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    stroke="none"
                  >
                    {employeePie.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 📈 Bottom Graphs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* ✅ Project Completion */}
            <div className="bg-white/10 p-4 rounded-lg shadow text-center">
              <h4 className="text-sm font-semibold mb-3">Project Completion</h4>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={projectProgress}>
                  <XAxis dataKey="project_name" stroke="#fff" />
                  <YAxis stroke="#fff" allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar
                    dataKey="completed"
                    stackId="a"
                    fill="#16a34a"
                    name="Completed Tasks"
                  />
                  <Bar
                    dataKey="remaining"
                    stackId="a"
                    fill="#d1d5db"
                    name="Remaining Tasks"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* 📅 Monthly Trends - Line Chart */}
            <div className="bg-white/10 p-4 rounded-lg shadow text-center">
              <h4 className="text-sm font-semibold mb-3">
                Projects Created Monthly
              </h4>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={monthlyTrends}>
                  <XAxis dataKey="month" stroke="#fff" />
                  <YAxis stroke="#fff" allowDecimals={false} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#38bdf8"
                    strokeWidth={2.5}
                    name="Projects"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </motion.div>
      </section>
    </div>
  );
}

export default Home;

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// // src/pages/Home.js
// import React, { useEffect, useState, useRef } from "react";
// import { useNavigate } from "react-router-dom";
// import { motion } from "framer-motion";
// import Particles from "react-tsparticles";
// import { loadSlim } from "tsparticles-slim";
// import {
//   BarChart,
//   Bar,
//   XAxis,
//   YAxis,
//   Tooltip,
//   ResponsiveContainer,
//   PieChart,
//   Pie,
//   Cell,
//   Legend,
// } from "recharts";

// const COLORS = ["#39a0ca", "#f95d9b"];
// const TASK_COLORS = ["#16a34a", "#d1d5db"];
// const PURPLE_PINK_PALETTE = [
//   "#d16ba5",
//   "#c777b9",
//   "#ba83ca",
//   "#aa8fd8",
//   "#9a9ae1",
//   "#8aa7ec",
//   "#79b3f4",
//   "#69bff8",
// ];

// function Home() {
//   const navigate = useNavigate();
//   const [projectCount, setProjectCount] = useState(0);
//   const [employeePie, setEmployeePie] = useState([]);
//   const [taskPie, setTaskPie] = useState([]);
//   const [workloadPie, setWorkloadPie] = useState([]);
//   const statsRef = useRef(null);
//   const [deptStats, setDeptStats] = useState([]);

//   useEffect(() => {
//     fetch("http://localhost:8000/stats/dept-workload")
//       .then((res) => res.json())
//       .then((data) => setDeptStats(data));
//   }, []);

//   useEffect(() => {
//     fetch("http://localhost:8000/analytics")
//       .then((res) => res.json())
//       .then((data) => {
//         setProjectCount(data.total_projects);
//         setEmployeePie([
//           { name: "Available", value: data.employees_available },
//           { name: "Fully Loaded", value: data.employees_overloaded },
//         ]);
//         setTaskPie([
//           { name: "Completed", value: data.tasks_completed },
//           { name: "Pending", value: data.tasks_pending },
//         ]);
//         setWorkloadPie(data.workload_distribution);
//       });
//   }, []);

//   const particlesInit = async (engine) => {
//     await loadSlim(engine); // instead of loadFull()
//   };

//   const scrollToStats = () => {
//     statsRef.current.scrollIntoView({ behavior: "smooth" });
//   };

//   return (
//     <div className="min-h-screen text-white">
//       {/* Hero Section */}
//       <section className="h-screen flex flex-col items-center justify-center text-center px-6 relative overflow-hidden bg-[#161748]">
//         {/* Animated Background */}
//         <Particles
//           id="tsparticles"
//           init={particlesInit}
//           options={{
//             fullScreen: { enable: false },
//             background: { color: { value: "#161748" } },
//             particles: {
//               number: { value: 50 },
//               color: { value: "#ffffff" },
//               shape: { type: "circle" },
//               opacity: { value: 0.1 },
//               size: { value: 3 },
//               move: { enable: true, speed: 1 },
//             },
//           }}
//           className="absolute inset-0 z-0"
//         />

//         <motion.h1
//           initial={{ opacity: 0, y: -40 }}
//           animate={{ opacity: 1, y: 0 }}
//           transition={{ duration: 1 }}
//           className="text-7xl font-bold mb-4 z-10"
//           style={{ fontFamily: "'Cascadia Code', monospace" }}
//         >
//           Welcome to SkillBoard
//         </motion.h1>

//         <motion.p
//           initial={{ opacity: 0 }}
//           animate={{ opacity: 1 }}
//           transition={{ delay: 0.4, duration: 1 }}
//           className="text-lg text-[#d0d0ff] max-w-xl z-10"
//         >
//           Empowering project managers with clear, cute, and efficient workload
//           tracking.
//         </motion.p>
//         <motion.div
//           initial={{ opacity: 0, y: 20 }}
//           animate={{ opacity: 1, y: 0 }}
//           transition={{ delay: 0.8, duration: 1 }}
//           className="flex gap-6 mt-8 z-10"
//         >
//           <button
//             onClick={() => navigate("/projects")}
//             className="bg-transparent border-2 border-[#39a0ca] text-white font-semibold px-6 py-3 rounded-xl hover:bg-white/10 transition duration-300"
//           >
//             View Projects
//           </button>
//           <button
//             onClick={() => navigate("/employees")}
//             className="bg-transparent border-2 border-[#f95d9b] text-white font-semibold px-6 py-3 rounded-xl hover:bg-white/10 transition duration-300"
//           >
//             View Employees
//           </button>
//         </motion.div>

//         {/* Scroll Down Arrow */}
//         <motion.div
//           initial={{ opacity: 0 }}
//           animate={{ opacity: 1 }}
//           transition={{ delay: 1.2, duration: 1 }}
//           className="absolute bottom-10 z-10 cursor-pointer"
//           onClick={scrollToStats}
//         >
//           <svg
//             className="w-6 h-6 animate-bounce text-white"
//             fill="none"
//             stroke="currentColor"
//             strokeWidth="2"
//             viewBox="0 0 24 24"
//           >
//             <path
//               strokeLinecap="round"
//               strokeLinejoin="round"
//               d="M19 9l-7 7-7-7"
//             />
//           </svg>
//         </motion.div>
//       </section>

//       {/* Stats Section */}
//       <section
//         ref={statsRef}
//         className="relative py-16 px-4 bg-gradient-to-br from-[#161748] via-[#161748] to-[#161748]"
//       >
//         {/* Translucent Overlay */}
//         <div className="absolute inset-0 bg-white/10 backdrop-blur-sm z-0"></div>

//         <motion.div
//           initial={{ opacity: 0, y: 50 }}
//           whileInView={{ opacity: 1, y: 0 }}
//           viewport={{ once: true }}
//           transition={{ duration: 1 }}
//           className="relative z-10 flex flex-col md:flex-row items-center justify-center gap-12"
//         >
//           {/* Employee Availability */}
//           <div className="text-center">
//             <h4 className="text-xl font-semibold mb-4">
//               Employee Availability
//             </h4>
//             <ResponsiveContainer width={250} height={250}>
//               <PieChart>
//                 <Pie
//                   data={employeePie}
//                   dataKey="value"
//                   nameKey="name"
//                   cx="50%"
//                   cy="50%"
//                   innerRadius={50}
//                   outerRadius={80}
//                   stroke="none"
//                 >
//                   {employeePie.map((_, index) => (
//                     <Cell
//                       key={`cell-${index}`}
//                       fill={COLORS[index % COLORS.length]}
//                     />
//                   ))}
//                 </Pie>
//                 <Tooltip />
//                 <Legend />
//               </PieChart>
//             </ResponsiveContainer>
//           </div>

//           {/* Workload Distribution */}
//           {/* <div className="text-center w-full max-w-md mx-auto">
//             <h4 className="text-xl font-semibold mb-4">
//               Workload Distribution
//             </h4>

//             <div className="flex justify-center">
//               <ResponsiveContainer width={300} height={300}>
//                 <PieChart>
//                   <Pie
//                     data={workloadPie}
//                     dataKey="value"
//                     nameKey="name"
//                     cx="50%"
//                     cy="50%"
//                     innerRadius={60}
//                     outerRadius={100}
//                     stroke="none"
//                   >
//                     {workloadPie.map((_, index) => (
//                       <Cell
//                         key={`cell-${index}`}
//                         fill={
//                           PURPLE_PINK_PALETTE[
//                             index % PURPLE_PINK_PALETTE.length
//                           ]
//                         }
//                       />
//                     ))}
//                   </Pie>
//                   <Tooltip />
//                 </PieChart>
//               </ResponsiveContainer>
//             </div> */}

//           {/* Legend */}
//           {/* <div className="flex flex-wrap justify-center gap-4 mt-4">
//               {workloadPie.map((entry, index) => (
//                 <div key={index} className="flex items-center gap-2">
//                   <div
//                     className="w-3 h-3 rounded-full"
//                     style={{
//                       backgroundColor:
//                         PURPLE_PINK_PALETTE[index % PURPLE_PINK_PALETTE.length],
//                     }}
//                   ></div>
//                   <span className="text-sm text-white">
//                     {entry.name} ({entry.value})
//                   </span>
//                 </div>
//               ))}
//             </div>
//           </div> */}

//           {/* Department Workload Bar Chart */}
//           <div className="text-center w-full max-w-lg mx-auto">
//             <h4 className="text-xl font-semibold mb-4">Department Workload</h4>

//             <div className="bg-white/10 p-4 rounded-xl w-full h-72">
//               <ResponsiveContainer width="100%" height="100%">
//                 <BarChart data={deptStats}>
//                   <XAxis dataKey="role" stroke="#fff" />
//                   <YAxis allowDecimals={false} stroke="#fff" />
//                   <Tooltip />
//                   <Bar dataKey="total" fill="#d1d5db" barSize={30} />
//                   <Bar dataKey="working" fill="#f95d9b" barSize={20} />
//                 </BarChart>
//               </ResponsiveContainer>
//             </div>
//           </div>

//           {/* Task Completion */}
//           <div className="text-center">
//             <h4 className="text-xl font-semibold mb-4">Task Completion</h4>
//             <ResponsiveContainer width={250} height={250}>
//               <PieChart>
//                 <Pie
//                   data={taskPie}
//                   dataKey="value"
//                   nameKey="name"
//                   cx="50%"
//                   cy="50%"
//                   innerRadius={50}
//                   outerRadius={80}
//                   stroke="none"
//                 >
//                   {taskPie.map((_, index) => (
//                     <Cell
//                       key={`cell-${index}`}
//                       fill={TASK_COLORS[index % TASK_COLORS.length]}
//                     />
//                   ))}
//                 </Pie>
//                 <Tooltip />
//                 <Legend />
//               </PieChart>
//             </ResponsiveContainer>
//           </div>
//         </motion.div>
//       </section>
//     </div>
//   );
// }

// export default Home;

// // src/pages/Home.js
// import React, { useEffect, useState } from "react";
// import { useNavigate } from "react-router-dom";
// import {
//   PieChart,
//   Pie,
//   Cell,
//   ResponsiveContainer,
//   Tooltip,
//   Legend,
// } from "recharts";
// import { motion } from "framer-motion";

// const PURPLE_PINK_PALETTE = [
//   "#d16ba5",
//   "#c777b9",
//   "#ba83ca",
//   "#aa8fd8",
//   "#9a9ae1",
//   "#8aa7ec",
//   "#79b3f4",
//   "#69bff8",
// ];

// function Home() {
//   const navigate = useNavigate();
//   const [projectCount, setProjectCount] = useState(0);
//   const [employeePie, setEmployeePie] = useState([]);
//   const [taskPie, setTaskPie] = useState([]);
//   const [workloadPie, setWorkloadPie] = useState([]);

//   useEffect(() => {
//     fetch("http://localhost:8000/analytics")
//       .then((res) => res.json())
//       .then((data) => {
//         setProjectCount(data.total_projects);
//         setEmployeePie([
//           { name: "Available", value: data.employees_available },
//           { name: "Fully Loaded", value: data.employees_overloaded },
//         ]);
//         setTaskPie([
//           { name: "Completed", value: data.tasks_completed },
//           { name: "Pending", value: data.tasks_pending },
//         ]);
//         setWorkloadPie(data.workload_distribution);
//       });
//   }, []);

//   const COLORS = ["#39a0ca", "#f95d9b"];
//   const TASK_COLORS = ["#16a34a", "#d1d5db"];

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-[#f95d9b] via-[#161748] to-[#39a0ca] text-white">
//       <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
//         <motion.h1
//           initial={{ opacity: 0, y: -50 }}
//           animate={{ opacity: 1, y: 0 }}
//           transition={{ duration: 0.8 }}
//           className="text-6xl font-bold mb-6"
//         >
//           Welcome to SkillBoard
//         </motion.h1>
//         <motion.p
//           initial={{ opacity: 0 }}
//           animate={{ opacity: 1 }}
//           transition={{ delay: 0.4, duration: 0.8 }}
//           className="text-xl text-[#e5e5ff] max-w-xl mb-10"
//         >
//           Empowering project managers with clear, cute, and efficient workload
//           tracking. Dive into your teams and projects now!
//         </motion.p>
//         <motion.div
//           initial={{ opacity: 0, y: 20 }}
//           animate={{ opacity: 1, y: 0 }}
//           transition={{ delay: 0.7, duration: 0.8 }}
//           className="flex gap-6"
//         >
//           <button
//             onClick={() => navigate("/projects")}
//             className="bg-[#39a0ca] hover:bg-[#2c89b0] text-white font-semibold px-8 py-3 rounded-xl shadow-lg text-lg"
//           >
//             View Projects
//           </button>
//           <button
//             onClick={() => navigate("/employees")}
//             className="bg-[#f95d9b] hover:bg-[#e84a8b] text-white font-semibold px-8 py-3 rounded-xl shadow-lg text-lg"
//           >
//             View Employees
//           </button>
//         </motion.div>
//       </div>

//       {/* Divider segment */}
//       <motion.div
//         className="w-full h-[200px] bg-white bg-opacity-10 backdrop-blur-md flex items-center justify-center"
//         initial={{ opacity: 0, y: 100 }}
//         whileInView={{ opacity: 1, y: 0 }}
//         viewport={{ once: true }}
//         transition={{ duration: 1 }}
//       >
//         <h2 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-400 via-purple-500 to-blue-500">
//           SkillBoard Stats
//         </h2>
//       </motion.div>

//       {/* Stats Charts */}
//       <div className="grid grid-cols-1 md:grid-cols-3 gap-12 px-6 py-16 max-w-6xl mx-auto">
//         {/* Employee Availability */}
//         <motion.div
//           initial={{ opacity: 0, scale: 0.8 }}
//           whileInView={{ opacity: 1, scale: 1 }}
//           viewport={{ once: true }}
//           transition={{ duration: 0.6 }}
//           className="bg-white bg-opacity-10 p-6 rounded-xl shadow-md text-center"
//         >
//           <h4 className="text-xl font-semibold mb-4">Employee Availability</h4>
//           <ResponsiveContainer width={250} height={250}>
//             <PieChart>
//               <Pie
//                 data={employeePie}
//                 dataKey="value"
//                 nameKey="name"
//                 cx="50%"
//                 cy="50%"
//                 innerRadius={50}
//                 outerRadius={80}
//                 stroke="none"
//               >
//                 {employeePie.map((_, index) => (
//                   <Cell
//                     key={`cell-${index}`}
//                     fill={COLORS[index % COLORS.length]}
//                   />
//                 ))}
//               </Pie>
//               <Tooltip />
//               <Legend />
//             </PieChart>
//           </ResponsiveContainer>
//         </motion.div>

//         {/* Workload Distribution */}
//         <motion.div
//           initial={{ opacity: 0, scale: 0.8 }}
//           whileInView={{ opacity: 1, scale: 1 }}
//           viewport={{ once: true }}
//           transition={{ duration: 0.6, delay: 0.2 }}
//           className="bg-white bg-opacity-10 p-6 rounded-xl shadow-md text-center"
//         >
//           <h4 className="text-xl font-semibold mb-4">Workload Distribution</h4>
//           <ResponsiveContainer width={300} height={300}>
//             <PieChart>
//               <Pie
//                 data={workloadPie}
//                 dataKey="value"
//                 nameKey="name"
//                 cx="50%"
//                 cy="50%"
//                 innerRadius={60}
//                 outerRadius={100}
//                 stroke="none"
//               >
//                 {workloadPie.map((_, index) => (
//                   <Cell
//                     key={`cell-${index}`}
//                     fill={
//                       PURPLE_PINK_PALETTE[index % PURPLE_PINK_PALETTE.length]
//                     }
//                   />
//                 ))}
//               </Pie>
//               <Tooltip />
//               <Legend />
//             </PieChart>
//           </ResponsiveContainer>
//         </motion.div>

//         {/* Task Completion */}
//         <motion.div
//           initial={{ opacity: 0, scale: 0.8 }}
//           whileInView={{ opacity: 1, scale: 1 }}
//           viewport={{ once: true }}
//           transition={{ duration: 0.6, delay: 0.4 }}
//           className="bg-white bg-opacity-10 p-6 rounded-xl shadow-md text-center"
//         >
//           <h4 className="text-xl font-semibold mb-4">Task Completion</h4>
//           <ResponsiveContainer width={250} height={250}>
//             <PieChart>
//               <Pie
//                 data={taskPie}
//                 dataKey="value"
//                 nameKey="name"
//                 cx="50%"
//                 cy="50%"
//                 innerRadius={50}
//                 outerRadius={80}
//                 stroke="none"
//               >
//                 {taskPie.map((_, index) => (
//                   <Cell
//                     key={`cell-${index}`}
//                     fill={TASK_COLORS[index % TASK_COLORS.length]}
//                   />
//                 ))}
//               </Pie>
//               <Tooltip />
//               <Legend />
//             </PieChart>
//           </ResponsiveContainer>
//         </motion.div>
//       </div>
//     </div>
//   );
// }

// // export default Home;

// ////////////////////////////////////////////////////////////////////////////////////////////////////////////////
