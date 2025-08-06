-- Step 1: Drop child tables first
DROP TABLE IF EXISTS reviews;
DROP TABLE IF EXISTS employee_tech_stack;
DROP TABLE IF EXISTS tasks;
DROP TABLE IF EXISTS project_to_tasks_map;

-- Step 2: Drop base tables next
DROP TABLE IF EXISTS employees;
DROP TABLE IF EXISTS projects;
DROP TABLE IF EXISTS tech_stack;
DROP TABLE IF EXISTS users;


-- Users
CREATE TABLE users (
    user_id INT IDENTITY(1,1) PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    created_at DATETIME DEFAULT GETDATE()
);

-- Create employees table
CREATE TABLE employees (
  employee_id INT PRIMARY KEY,
  employee_name VARCHAR(60) NOT NULL,
  role VARCHAR(20),
  weekly_hours INT,
  user_id INT FOREIGN KEY REFERENCES users(user_id)
);

-- Create Projects table
CREATE TABLE projects (
  project_id INT IDENTITY(1,1) PRIMARY KEY,
  project_name VARCHAR(30) NOT NULL,
  client_name VARCHAR(60) NOT NULL,
  start_date DATE,
  deadline DATE,
  user_id INT FOREIGN KEY REFERENCES users(user_id)
);

-- Create Tech Stack/tech_stack table
CREATE TABLE tech_stack (
  tech_stack_id INT IDENTITY(1,1) PRIMARY KEY,
  tech_stack_name VARCHAR(50) UNIQUE NOT NULL
);

-- Create employeetech_stack table
CREATE TABLE employee_tech_stack (
  employee_id INT FOREIGN KEY REFERENCES employees(employee_id),
  tech_stack_id INT FOREIGN KEY REFERENCES tech_stack(tech_stack_id),
  PRIMARY KEY (employee_id, tech_stack_id)
);

-- Create tasks table using tech_stack_id
CREATE TABLE tasks (
  task_id INT IDENTITY(1,1) PRIMARY KEY,
  employee_id INT FOREIGN KEY REFERENCES employees(employee_id),
  estimated_hours INT,
  start_date DATE DEFAULT GETDATE(),
  deadline DATE,
  tech_stack_id INT FOREIGN KEY REFERENCES tech_stack(tech_stack_id),
  project_id INT FOREIGN KEY REFERENCES projects(project_id),
  completed BIT DEFAULT 0,
  user_id INT FOREIGN KEY REFERENCES users(user_id)
);

-- New: Reviews table for post-task employee feedback
CREATE TABLE reviews (
  review_id INT IDENTITY(1,1) PRIMARY KEY,
  employee_id INT FOREIGN KEY REFERENCES employees(employee_id),
  task_id INT FOREIGN KEY REFERENCES tasks(task_id),
  rating INT CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  reviewed_at DATETIME DEFAULT GETDATE()
);

-- ProjectToTasksMap rewritten to use tech_stack_id
CREATE TABLE project_to_tasks_map (
  project_type VARCHAR(100),
  tech_stack_id INT FOREIGN KEY REFERENCES tech_stack(tech_stack_id),
  estimated_hours INT,
  deadline_offset INT,
  PRIMARY KEY (project_type, tech_stack_id)
);


-- ✅ Extended Sample Data for Testing SkillBoard

INSERT INTO users ( username, hashed_password, created_at)
VALUES (
	'zafar.ahmed',
	'$2b$12$JAjvNDrqv/sbRh6vhzMpBOwC5V4j.9RkQia/WmofijkIoX9pdk9wu',
	GETDATE()
);

-- 👨‍💻 EMPLOYEES (30 Total)
INSERT INTO employees (employee_id, employee_name, role, weekly_hours, user_id) VALUES
(1, 'Ahsan Ali', 'Backend Developer', 40, 1),
(2, 'Sara Khan', 'Frontend Developer', 40, 1),
(3, 'Zainab Hussain', 'QA Engineer', 40, 1),
(4, 'Tariq Aziz', 'Designer', 35, 1),
(5, 'Sana Malik', 'Database Admin', 40, 1),
(6, 'Hamza Ahmed', 'Project Manager', 40, 1),
(7, 'Nida Noor', 'Feature Developer', 30, 1),
(8, 'Faisal Mehmood', 'Supervisor', 35, 1),
(9, 'Bilal Rafiq', 'Feature Developer', 40, 1),
(10, 'Aimen Javed', 'QA Engineer', 40, 1),
(11, 'Kiran Shah', 'Designer', 35, 1),
(12, 'Hassan Farooq', 'Project Manager', 40, 1),
(13, 'Yasir Iqbal', 'Frontend Developer', 38, 1),
(14, 'Rabia Saeed', 'Data Analyst', 40, 1),
(15, 'Omer Shafi', 'Backend Developer', 40, 1),
(16, 'Shazia Adeel', 'UI Designer', 30, 1),
(17, 'Naveed Bhatti', 'Database Admin', 35, 1),
(18, 'Mariam Zafar', 'Supervisor', 35, 1),
(19, 'Zeeshan Haider', 'Feature Developer', 40, 1),
(20, 'Amna Jamil', 'QA Engineer', 38, 1),
(21, 'Farhan Nazir', 'Backend Developer', 40, 1),
(22, 'Lubna Tariq', 'Project Manager', 40, 1),
(23, 'Rehan Asif', 'Data Analyst', 35, 1),
(24, 'Samra Yousuf', 'Frontend Developer', 40, 1),
(25, 'Taha Qureshi', 'Designer', 35, 1),
(26, 'Hiba Khalid', 'Feature Developer', 30, 1),
(27, 'Zara Sheikh', 'Supervisor', 35, 1),
(28, 'Aliya Butt', 'QA Engineer', 38, 1),
(29, 'Danish Imran', 'Project Manager', 40, 1),
(30, 'Musa Noorani', 'Backend Developer', 40, 1);

-- 🏗 PROJECTS (10 Total)
INSERT INTO projects (project_name, client_name, start_date, deadline, user_id) VALUES
('Internal Dashboard', 'ABC Corp', '2025-06-01', '2025-07-01', 1),
('Analytics Tool', 'XYZ Ltd', '2025-06-05', '2025-07-10', 1),
('E-commerce Portal', 'ShopEase', '2025-06-10', '2025-07-20', 1),
('Employee Tracker', 'TechStars', '2025-06-15', '2025-07-25', 1),
('Client Feedback Portal', 'MNO Pvt Ltd', '2025-06-26', '2025-07-20', 1),
('Performance Metrics Tool', 'Initech Solutions', '2025-07-01', '2025-08-01', 1),
('Finance Manager', 'Uptick LLC', '2025-07-05', '2025-08-10', 1),
('Project Timeline Visualizer', 'VisualSoft', '2025-07-07', '2025-08-15', 1),
('AI Chat Assistant', 'NextGenAI', '2025-07-10', '2025-08-20', 1),
('CRM Redesign', 'WaveTech', '2025-07-12', '2025-08-25', 1);

-- Insert tech_stack
INSERT INTO tech_stack (tech_stack_name) VALUES 
('Frontend Dev'), ('UI Design'), ('Design'), ('Feature'),
('Backend API'), ('Security Review'), ('Database Setup'),
('Testing'), ('Planning'), ('Data Analysis'), ('Supervising');


-- 🧩 TASKS (All with user_id = 1)
INSERT INTO tasks (employee_id, estimated_hours, start_date, deadline, tech_stack_id, project_id, user_id) VALUES
(NULL, 6, '2025-06-11', '2025-06-25', 1, 1, 1),
(NULL, 5, '2025-06-12', '2025-06-27', 2, 1, 1),
(NULL, 4, '2025-06-13', '2025-06-30', 3, 1, 1),
(NULL, 5, '2025-06-14', '2025-07-01', 4, 1, 1),

(NULL, 7, '2025-06-13', '2025-06-26', 1, 2, 1),
(NULL, 6, '2025-06-15', '2025-06-28', 5, 2, 1),
(NULL, 5, '2025-06-17', '2025-07-01', 6, 2, 1),

(NULL, 4, '2025-06-16', '2025-06-30', 9, 3, 1),
(NULL, 5, '2025-06-18', '2025-07-05', 7, 3, 1),
(NULL, 6, '2025-06-20', '2025-07-08', 10, 3, 1),
(NULL, 4, '2025-06-21', '2025-07-10', 11, 3, 1),

(NULL, 6, '2025-06-19', '2025-07-03', 7, 4, 1),
(NULL, 5, '2025-06-20', '2025-07-07', 8, 4, 1),
(NULL, 5, '2025-06-22', '2025-07-10', 6, 4, 1),

(NULL, 4, '2025-06-21', '2025-06-26', 4, 5, 1),
(NULL, 3, '2025-06-22', '2025-06-27', 3, 5, 1),
(NULL, 2, '2025-06-23', '2025-06-28', 2, 5, 1),
(NULL, 6, '2025-06-25', '2025-07-01', 1, 5, 1),
(NULL, 4, '2025-06-26', '2025-07-03', 4, 5, 1),

(NULL, 5, '2025-06-27', '2025-07-07', 10, 6, 1),
(NULL, 4, '2025-06-28', '2025-07-10', 9, 6, 1),

(NULL, 6, '2025-06-29', '2025-07-14', 1, 7, 1),
(NULL, 4, '2025-06-30', '2025-07-17', 3, 7, 1),

(NULL, 6, '2025-07-01', '2025-07-21', 5, 8, 1),
(NULL, 4, '2025-07-02', '2025-07-25', 2, 8, 1),

(NULL, 5, '2025-07-03', '2025-07-29', 4, 9, 1),
(NULL, 3, '2025-07-04', '2025-08-01', 10, 9, 1),

(NULL, 6, '2025-07-05', '2025-08-05', 9, 10, 1),
(NULL, 5, '2025-07-06', '2025-08-08', 6, 10, 1);



-- 🔧 EMPLOYEE-TECH STACK
-- Note: Add at least 1-2 mappings per employee (example shown only for first 12 for brevity)
-- 🔧 EMPLOYEE-TECH STACK (FULL MAPPING for 30 employees based on role)
INSERT INTO employee_tech_stack (employee_id, tech_stack_id) VALUES
-- Backend Developer (IDs: 1, 15, 21, 30)
(1, 5), (1, 6), (1, 7), (1, 10),
(15, 5), (15, 7),
(21, 5), (21, 6),
(30, 5),
-- Frontend Developer (IDs: 2, 13, 23)
(2, 1), (2, 2), (2, 4),
(13, 1), (13, 2),
(23, 1), (23, 4),
-- QA Engineer (IDs: 3, 10, 20, 28)
(3, 2), (3, 3),
(10, 6), (10, 8),
(20, 6),
(28, 8),
-- Designer (IDs: 4, 11, 24)
(4, 6), (4, 8),
(11, 2), (11, 3),
(24, 3),
-- Database Admin (IDs: 5, 17)
(5, 9), (5, 11),
(17, 7),
-- Project Manager (IDs: 6, 12, 22, 29)
(6, 10),
(12, 9), (12, 11),
(22, 9),
(29, 11),
-- Feature Developer (IDs: 7, 9, 19, 25)
(7, 7),
(9, 4),
(19, 4),
(25, 4),
-- Supervisor (IDs: 8, 18, 26)
(8, 1),
(18, 11),
(26, 9),
-- Data Analyst (IDs: 14, 23)
(14, 10),
(23, 10);

-- ProjectToTasksMap using tech_stack_id
INSERT INTO project_to_tasks_map (project_type, tech_stack_id, estimated_hours, deadline_offset) VALUES
-- Web App Project
('Web App', 2, 6, 5),    -- UI Design
('Web App', 1, 8, 7),    -- Frontend Dev
('Web App', 5, 10, 10),  -- Backend API
('Web App', 8, 5, 11),   -- Testing

-- Dashboard Project
('Dashboard', 1, 7, 7),    -- Frontend Dev
('Dashboard', 5, 9, 10),   -- Backend API
('Dashboard', 7, 5, 8),    -- Database Setup
('Dashboard', 8, 4, 13),   -- Testing

-- Analytics Tool
('Analytics Tool', 10, 8, 7),  -- Data Analysis
('Analytics Tool', 9, 6, 5),   -- Planning
('Analytics Tool', 3, 7, 6);   -- Design

-- Sample review entries'
-- INSERT INTO reviews (employee_id, task_id, rating, comment) VALUES
-- (2, 5, 4, 'Completed on time with good quality'),
-- (1, 3, 5, 'Excellent backend logic and efficient'),
-- (3, 7, 3, 'Met requirements but missed a few edge cases'),
-- (2, 6, 5, 'Great design and attention to detail'),
-- (4, 8, 2, 'Late submission and inconsistent format');

-- Sample queries
SELECT * FROM projects;
SELECT * FROM tasks;
SELECT * FROM employees;
SELECT * FROM project_to_tasks_map;
SELECT * FROM tech_stack;
SELECT * FROM employee_tech_stack;
SELECT * FROM reviews;
SELECT * FROM users;

-- Disable constraints
ALTER TABLE reviews NOCHECK CONSTRAINT ALL;
ALTER TABLE employee_tech_stack NOCHECK CONSTRAINT ALL;
ALTER TABLE tasks NOCHECK CONSTRAINT ALL;
ALTER TABLE project_to_tasks_map NOCHECK CONSTRAINT ALL;
ALTER TABLE employees NOCHECK CONSTRAINT ALL;
ALTER TABLE projects NOCHECK CONSTRAINT ALL;
ALTER TABLE tech_stack NOCHECK CONSTRAINT ALL;
ALTER TABLE users NOCHECK CONSTRAINT ALL;

-- Delete and reset
DELETE FROM reviews;
DBCC CHECKIDENT ('reviews', RESEED, 0);

DELETE FROM employee_tech_stack;

DELETE FROM tasks;
DBCC CHECKIDENT ('tasks', RESEED, 0);

DELETE FROM project_to_tasks_map;

DELETE FROM employees;
DBCC CHECKIDENT ('employees', RESEED, 0);

DELETE FROM projects;
DBCC CHECKIDENT ('projects', RESEED, 0);

DELETE FROM tech_stack;
DBCC CHECKIDENT ('tech_stack', RESEED, 0);

DELETE FROM users;
DBCC CHECKIDENT ('users', RESEED, 0);

-- Re-enable constraints
ALTER TABLE reviews CHECK CONSTRAINT ALL;
ALTER TABLE employee_tech_stack CHECK CONSTRAINT ALL;
ALTER TABLE tasks CHECK CONSTRAINT ALL;
ALTER TABLE project_to_tasks_map CHECK CONSTRAINT ALL;
ALTER TABLE employees CHECK CONSTRAINT ALL;
ALTER TABLE projects CHECK CONSTRAINT ALL;
ALTER TABLE tech_stack CHECK CONSTRAINT ALL;
ALTER TABLE users CHECK CONSTRAINT ALL;
