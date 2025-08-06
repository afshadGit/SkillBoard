import React from "react";
import { Link, useNavigate } from "react-router-dom";

function Layout({ children }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  return (
    <div className="min-h-screen">
      {/* 🔝 Top Navigation Bar */}
      <header className="bg-gray-900 shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <a href="/" className="flex items-center">
            <img
              src="/skillboard-logo.png"
              alt="SkillBoard Logo"
              className="h-10 w-auto"
            />
          </a>
          <nav className="space-x-6 flex items-center">
            <Link
              to="/"
              className="text-white hover:text-indigo-600 font-medium"
            >
              Home
            </Link>
            <Link
              to="/projects"
              className="text-white hover:text-indigo-600 font-medium"
            >
              Projects
            </Link>
            <Link
              to="/employees"
              className="text-white hover:text-indigo-600 font-medium"
            >
              Employees
            </Link>

            <button
              onClick={handleLogout}
              className="ml-4 bg-purple-700 hover:bg-purple-900 text-white font-medium px-3 py-1 rounded transition"
            >
              Logout
            </button>
          </nav>
        </div>
      </header>

      {/* 🔽 Page Content */}
      <main>{children}</main>
    </div>
  );
}

export default Layout;
