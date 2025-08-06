import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import ProjectList from "./pages/ProjectList";
import ProjectDetails from "./pages/ProjectDetails";
import EmployeeProfile from "./pages/EmployeeProfile";
import EmployeeList from "./pages/EmployeeList";
import Home from "./pages/Home";
import Layout from "./components/Layout";
import LoginPage from "./pages/LoginPage";

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<Home />} />
          <Route path="/projects" element={<ProjectList />} />
          <Route path="/projects/:id" element={<ProjectDetails />} />
          <Route path="/employees" element={<EmployeeList />} />
          <Route path="/employees/:employee_id" element={<EmployeeProfile />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
