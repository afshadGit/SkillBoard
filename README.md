# 💼 SkillBoard
_A Workload & Performance Management System for Teams_

![SkillBoard Logo](./frontend/public/skillboard-logo.png)

## 📄 Description

SkillBoard is a full-stack workload and performance management platform built during our internship at Systems Ltd. It allows team managers to assign tasks, track workload, visualize performance trends, and manage employees efficiently — all via a clean and intuitive UI.

## ✨ Features

- 🔐 Login system with user-isolated data
- 📋 Project & task management with deadline and workload tracking
- ✅ Assign tasks to one or more employees
- ⚖️ Load balancing with weekly hour validation
- 📈 Visual analytics on dashboard
- 📤 Excel import/export for employees and project tasks
- 📊 Role-based employee stats and task completion rates
- 💾 FastAPI backend with MS SQL Server integration
- 🎨 React + Tailwind CSS frontend with animated UI

## 🛠️ Tech Stack

- Frontend: React.js, Tailwind CSS
- Backend: FastAPI (Python)
- Database: Microsoft SQL Server
- Auth: JWT Authentication
- File Handling: Pandas + OpenPyXL (for Excel I/O)

## 📁 Folder Structure

- `/frontend` - React frontend
  - `/pages` - All routed views (ProjectDetails, EmployeeList, etc.)
  - `/components` - Shared UI components (modals, layout, upload section)
  - `/assets` - Logos/images
- `/backend` - FastAPI backend
  - `main.py` - All core API routes
  - `auth_utils.py` - JWT login functions
  - `file_routes.py` - Excel upload/download logic
  - `dbConnect.py` - MSSQL connection handler
  - `MainQuery.sql` - Main SQL script

## 🚀 Run Locally

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate  # On Windows
pip install -r requirements.txt
uvicorn main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm start
```

Ensure MS SQL Server is running and the `.env` file contains the correct DB connection string.

## 👥 Team

- Afshad Yazdi Sidhwa
- Adeenah Rauf Tabani

## 🪪 License

Internal internship project built at Systems Ltd (June-July 2025). For educational and demonstration purposes.
*change this*