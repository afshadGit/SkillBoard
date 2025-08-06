from fastapi import FastAPI, HTTPException, Path, Body, Depends, status
from pydantic import BaseModel, conint
from datetime import datetime, timedelta
from typing import List, Optional
import pyodbc
from src.dbConnect import connect_to_db
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm, HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from passlib.context import CryptContext
from file_routes import router as file_router

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(file_router)

SECRET_KEY = "skillboard-secret-key"  # 🔐 brah
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

auth_scheme = HTTPBearer()


def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_user_by_username(username: str):
    conn = connect_to_db()
    cursor = conn.cursor()
    cursor.execute("SELECT user_id, username, hashed_password FROM users WHERE username = ?", (username,))
    row = cursor.fetchone()
    conn.close()
    if row:
        return {"user_id": row[0], "username": row[1], "hashed_password": row[2]}
    return None

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(auth_scheme)):
    token = credentials.credentials  # extract actual token
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise credentials_exception
        return {"user_id": int(user_id)}
    except JWTError:
        raise credentials_exception

def calculate_employee_load(db, employee_id):
    result = db.execute(text("""
        SELECT SUM(hours_allocated) FROM employee_tasks
        WHERE employee_id = :eid
    """), {"eid": employee_id}).scalar()
    return result or 0

class TaskEdit(BaseModel):
    estimated_hours: int
    deadline: str
    start_date: Optional[str] = None

class EmployeeCreate(BaseModel):
    employee_id: int
    employee_name: str
    role: str
    weekly_hours: int
   

class ProjectCreate(BaseModel):
    project_name: str
    client_name: str
    start_date: str
    deadline: str
    project_type: str

class TaskAssignmentRequest(BaseModel):
    task_id: int
    employee_ids: Optional[List[int]] = None
    hours: Optional[List[float]] = None
    start_date: Optional[str] = None

class TaskCreate(BaseModel):
    tech_stack_id: int
    estimated_hours: int
    deadline: str

class ReviewCreate(BaseModel):
    employee_id: int
    task_id: int
    rating: conint(ge=1, le=5)
    comment: Optional[str] = None

class ReviewOut(BaseModel):
    review_id: int
    employee_id: int
    task_id: int
    rating: int
    comment: Optional[str]
    reviewed_at: datetime

{
  "workload_distribution": [
    { "name": "Frontend Dev", "value": 28 },
    { "name": "Backend API", "value": 32 },
    { "name": "Design", "value": 15 }
  ]
}


@app.get("/")
def read_root():
    return {"message": "SkillBoard backend is running!"}

@app.get("/projects")
def get_projects(current_user: dict = Depends(get_current_user)):
    conn = connect_to_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT project_id, project_name, client_name, start_date, deadline 
        FROM projects WHERE user_id = ?
    """, (current_user["user_id"],))
    rows = cursor.fetchall()
    conn.close()
    return [
        {
            "project_id": row[0],
            "project_name": row[1],
            "client_name": row[2],
            "start_date": row[3],
            "deadline": row[4],
        }
        for row in rows
    ]



@app.get("/projects/{project_id}")
def get_project(project_id: int, current_user: dict = Depends(get_current_user)):
    try:
        conn = connect_to_db()
        cursor = conn.cursor()

        # 🔐 Validate ownership
        cursor.execute("SELECT * FROM projects WHERE project_id = ? AND user_id = ?", (project_id, current_user["user_id"]))
        row = cursor.fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Project not found")

        columns = [column[0] for column in cursor.description]
        return dict(zip(columns, row))

    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal Server Error")
    finally:
        conn.close()


# @app.get("/projects/{project_id}/tasks")
# def get_tasks_by_project(project_id: int):
#     conn = connect_to_db()
#     cursor = conn.cursor()
#     cursor.execute("""
#         SELECT 
#             t.task_id,
#             t.employee_id,
#             ISNULL(e.employee_name, '') AS employee_name,
#             t.estimated_hours,
#             t.start_date,
#             t.deadline,
#             ts.tech_stack_name,
#             t.completed
#         FROM tasks t
#         JOIN tech_stack ts ON t.tech_stack_id = ts.tech_stack_id
#         LEFT JOIN employees e ON t.employee_id = e.employee_id
#         WHERE t.project_id = ?
#     """, project_id)
#     rows = cursor.fetchall()
#     conn.close()
#     return [
#         {
#             "task_id": row.task_id,
#             "employee_id": row.employee_id,
#             "employee_name": row.employee_name,
#             "estimated_hours": row.estimated_hours,
#             "start_date": row.start_date,
#             "deadline": row.deadline,
#             "tech_stack_name": row.tech_stack_name,
#             "completed": bool(row.completed)
#         } for row in rows
#     ]

@app.get("/projects/{project_id}/tasks")
def get_tasks_by_project(project_id: int, current_user: dict = Depends(get_current_user)):
    conn = connect_to_db()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT 
            t.task_id,
            t.employee_id,
            ISNULL(e.employee_name, '') AS employee_name,
            t.estimated_hours,
            t.start_date,
            t.deadline,
            ts.tech_stack_name,
            t.completed
        FROM tasks t
        JOIN projects p ON t.project_id = p.project_id
        JOIN tech_stack ts ON t.tech_stack_id = ts.tech_stack_id
        LEFT JOIN employees e ON t.employee_id = e.employee_id
        WHERE p.user_id = ? AND p.project_id = ?
    """, (current_user["user_id"], project_id))

    rows = cursor.fetchall()
    conn.close()

    return [
        {
            "task_id": row.task_id,
            "employee_id": row.employee_id,
            "employee_name": row.employee_name,
            "estimated_hours": row.estimated_hours,
            "start_date": row.start_date,
            "deadline": row.deadline,
            "tech_stack_name": row.tech_stack_name,
            "completed": bool(row.completed)
        }
        for row in rows
    ]


@app.post("/projects")
def add_project(data: ProjectCreate, current_user: dict = Depends(get_current_user)):
    conn = connect_to_db()
    cursor = conn.cursor()
    try:
        start_date = datetime.strptime(data.start_date, "%Y-%m-%d")
        deadline = datetime.strptime(data.deadline, "%Y-%m-%d")
        cursor.execute("""
            INSERT INTO projects (project_name, client_name, start_date, deadline, user_id)
            OUTPUT INSERTED.project_id
            VALUES (?, ?, ?, ?, ?)
        """, (data.project_name, data.client_name, data.start_date, data.deadline, current_user["user_id"]))
        project_id = cursor.fetchone()[0]

        tech_ids_added = set()

        if data.project_type != "Other":
            cursor.execute("""
                SELECT tech_stack_id, estimated_hours, deadline_offset
                FROM project_to_tasks_map
                WHERE project_type = ?
            """, (data.project_type,))
            presets = cursor.fetchall()

            for tech_id, hours, offset in presets:
                task_deadline = start_date + timedelta(days=offset)
                cursor.execute("""
                    INSERT INTO tasks (project_id, tech_stack_id, estimated_hours, deadline, employee_id, completed)
                    VALUES (?, ?, ?, ?, NULL, 0)
                """, (project_id, tech_id, hours, task_deadline.strftime('%Y-%m-%d')))
                tech_ids_added.add(tech_id)

        cursor.execute("SELECT tech_stack_id FROM tech_stack WHERE tech_stack_name = 'Supervising'")
        supervising_id = cursor.fetchone()[0]

        if data.project_type != "Other" and supervising_id not in tech_ids_added:
            cursor.execute("""
                INSERT INTO tasks (project_id, tech_stack_id, estimated_hours, deadline, employee_id, completed)
                VALUES (?, ?, 2, ?, NULL, 0)
            """, (project_id, supervising_id, deadline.strftime('%Y-%m-%d')))

        conn.commit()
        return {"message": "Project and tasks created", "project_id": project_id}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail="Project creation failed")
    finally:
        conn.close()
        
@app.get("/employees")
def get_all_employees(current_user: dict = Depends(get_current_user)):
    conn = connect_to_db()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT 
            e.employee_id, 
            e.employee_name, 
            e.role, 
            e.weekly_hours,

            -- SUM of hours for incomplete tasks
            ISNULL(SUM(CASE WHEN t.completed = 0 THEN t.estimated_hours ELSE 0 END), 0) AS current_load,

            -- COUNT of incomplete tasks
            ISNULL(SUM(CASE WHEN t.completed = 0 THEN 1 ELSE 0 END), 0) AS task_count,

            -- AVG rating
            AVG(CAST(r.rating AS FLOAT)) AS avg_rating

        FROM employees e
        LEFT JOIN tasks t ON e.employee_id = t.employee_id
        LEFT JOIN reviews r ON e.employee_id = r.employee_id
        WHERE e.user_id = ?
        GROUP BY 
            e.employee_id, 
            e.employee_name, 
            e.role, 
            e.weekly_hours
    """, (current_user["user_id"],))

    rows = cursor.fetchall()
    conn.close()

    return [
        {
            "employee_id": row[0],
            "employee_name": row[1],
            "role": row[2],
            "weekly_hours": row[3],
            "current_load": row[4],
            "task_count": row[5],
            "average_rating": round(row[6], 2) if row[6] is not None else None
        }
        for row in rows
    ]

@app.get("/employees/{employee_id}")
def get_employee_profile(employee_id: int, current_user: dict = Depends(get_current_user)):
    # conn = connect_to_db()
    # cursor = conn.cursor()

    # # Fetch employee base info
    # cursor.execute("""
    #     SELECT employee_id, employee_name, role, weekly_hours
    #     FROM employees
    #     WHERE employee_id = ?
    # """, (employee_id,))
    # emp = cursor.fetchone()

    # if not emp:
    #     raise HTTPException(status_code=404, detail="Employee not found")
    conn = connect_to_db()
    cursor = conn.cursor()

    # 🔐 Ensure this employee belongs to the user
    cursor.execute("""
        SELECT employee_id, employee_name, role, weekly_hours
        FROM employees
        WHERE employee_id = ? AND user_id = ?
    """, (employee_id, current_user["user_id"]))
    emp = cursor.fetchone()

    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    # Accurate current load for INCOMPLETE tasks only
    cursor.execute("""
        SELECT ISNULL(SUM(estimated_hours), 0)
        FROM tasks
        WHERE employee_id = ? AND completed = 0
    """, (employee_id,))
    current_load = cursor.fetchone()[0]

    # Fetch tasks + most recent review (if any)
    cursor.execute("""
        SELECT 
            t.task_id, ts.tech_stack_name, t.estimated_hours, t.start_date, 
            t.deadline, p.project_name, t.completed, p.project_id,
            r.rating, r.comment
        FROM tasks t
        JOIN tech_stack ts ON t.tech_stack_id = ts.tech_stack_id
        JOIN projects p ON t.project_id = p.project_id
        LEFT JOIN (
            SELECT task_id, rating, comment
            FROM reviews
            WHERE review_id IN (
                SELECT MAX(review_id)
                FROM reviews
                GROUP BY task_id
            )
        ) r ON t.task_id = r.task_id
        WHERE t.employee_id = ?
    """, (employee_id,))
    tasks = cursor.fetchall()

    # Get average rating
    cursor.execute("""
        SELECT AVG(CAST(rating AS FLOAT))
        FROM reviews
        WHERE employee_id = ?
    """, (employee_id,))
    avg_rating = cursor.fetchone()[0]

    cursor.close()
    conn.close()

    return {
        "employee_id": emp[0],
        "employee_name": emp[1],
        "role": emp[2],
        "weekly_hours": emp[3],
        "current_load": current_load,
        "average_rating": round(avg_rating, 2) if avg_rating is not None else None,
        "tasks": [
            {
                "task_id": t[0],
                "tech_stack": t[1],
                "estimated_hours": t[2],
                "start_date": t[3],
                "deadline": t[4],
                "project_name": t[5],
                "completed": t[6],
                "project_id": t[7],
                "reviewed": t[8] is not None,
                "review_rating": t[8],
                "review_comment": t[9],
            } for t in tasks
        ]
    }

# @app.post("/tasks/assign")
# def assign_task(data: dict = Body(...), current_user: dict = Depends(get_current_user)):
#     task_id = data.get("task_id")
#     employee_ids = data.get("employee_ids", [])
#     custom_hours = data.get("custom_hours")
#     total_hours = data.get("task_hours")
#     start_date = data.get("start_date") or datetime.now().strftime("%Y-%m-%d")

#     if not task_id or not total_hours:
#         raise HTTPException(status_code=400, detail="Missing task_id or task_hours")

#     if not employee_ids:
#         raise HTTPException(status_code=400, detail="No employees selected")

#     conn = connect_to_db()
#     cursor = conn.cursor()

#     try:
#         # 🔐 Validate task and ownership
#         cursor.execute("""
#             SELECT t.project_id, p.user_id, t.tech_stack_id, t.deadline
#             FROM tasks t
#             JOIN projects p ON t.project_id = p.project_id
#             WHERE t.task_id = ?
#         """, (task_id,))
#         row = cursor.fetchone()

#         if not row or row[1] != current_user["user_id"]:
#             raise HTTPException(status_code=403, detail="Unauthorized or task not found")

#         project_id, _, tech_stack_id, deadline = row

#         # ✋ Require custom hours if multiple employees
#         if len(employee_ids) > 1:
#             if not custom_hours or not any(float(custom_hours.get(str(eid), 0)) > 0 for eid in employee_ids):
#                 raise HTTPException(status_code=400, detail="Must provide specific hours when assigning multiple employees")

#         # ✅ Prepare hours distribution
#         distribution = {}
#         if custom_hours:
#             for eid in employee_ids:
#                 hours = float(custom_hours.get(str(eid), 0))
#                 distribution[eid] = hours
#         else:
#             eid = employee_ids[0]
#             distribution[eid] = float(total_hours)

#         # 🚦 Capacity check
#         for eid, hours in distribution.items():
#             cursor.execute("SELECT weekly_hours FROM employees WHERE employee_id = ? AND user_id = ?", (eid, current_user["user_id"]))
#             emp = cursor.fetchone()
#             if not emp:
#                 raise HTTPException(status_code=404, detail=f"Employee ID {eid} not found")
#             weekly_hours = emp[0]

#             cursor.execute("""
#                 SELECT ISNULL(SUM(estimated_hours), 0)
#                 FROM tasks WHERE employee_id = ? AND completed = 0
#             """, (eid,))
#             current_load = cursor.fetchone()[0]

#             if current_load + hours > weekly_hours:
#                 raise HTTPException(status_code=400, detail=f"Employee {eid} would be overloaded")

#         # 🛠 Assign tasks
#         for eid, hours in distribution.items():
#             cursor.execute("""
#                 INSERT INTO tasks (project_id, tech_stack_id, estimated_hours, start_date, deadline, employee_id, completed)
#                 VALUES (?, ?, ?, ?, ?, ?, 0)
#             """, (project_id, tech_stack_id, hours, start_date, deadline, eid))

#         # 🧹 Clean placeholder
#         cursor.execute("DELETE FROM tasks WHERE task_id = ?", (task_id,))
#         conn.commit()

#         return {"message": "Task assigned successfully"}

#     except Exception as e:
#         conn.rollback()
#         print("❌ Assignment Error:", e)
#         raise HTTPException(status_code=500, detail="Task assignment failed")
#     finally:
#         conn.close()

@app.post("/tasks/assign")
def assign_task(data: TaskAssignmentRequest, current_user: dict = Depends(get_current_user)):
    conn = connect_to_db()
    cursor = conn.cursor()
    try:
        # 🔐 Check if task belongs to the user
        cursor.execute("""
            SELECT t.project_id, t.tech_stack_id, t.estimated_hours, t.deadline
            FROM tasks t 
            JOIN projects p ON t.project_id = p.project_id 
            WHERE t.task_id = ? AND p.user_id = ?
        """, (data.task_id, current_user["user_id"]))
        task = cursor.fetchone()

        if not task:
            raise HTTPException(status_code=403, detail="Unauthorized access to task")

        project_id, tech_id, total_hours, deadline = task

        if not data.employee_ids:
            raise HTTPException(status_code=400, detail="No employee IDs provided")

        if len(data.employee_ids) == 1:
            emp_id = data.employee_ids[0]
            cursor.execute("""
                UPDATE tasks SET employee_id = ?, start_date = ?
                WHERE task_id = ?
            """, (emp_id, data.start_date, data.task_id))
        else:
            if not data.hours or len(data.hours) != len(data.employee_ids):
                raise HTTPException(status_code=400, detail="Invalid hours list")
            for emp_id, hrs in zip(data.employee_ids, data.hours):
                cursor.execute("""
                    INSERT INTO tasks (project_id, tech_stack_id, estimated_hours, start_date, deadline, employee_id, completed, user_id)
                    VALUES (?, ?, ?, ?, ?, ?, 0, ?)
                """, (project_id, tech_id, hrs, data.start_date, deadline, emp_id, current_user["user_id"]))
            cursor.execute("DELETE FROM tasks WHERE task_id = ?", (data.task_id,))

        conn.commit()
        return {"message": "Task assignment successful"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@app.get("/tasks/{task_id}/candidates")
def get_matching_employees(task_id: int, current_user: dict = Depends(get_current_user)):
    conn = connect_to_db()
    cursor = conn.cursor()

    # Confirm task belongs to user
    cursor.execute("""
        SELECT t.tech_stack_id, t.estimated_hours
        FROM tasks t
        JOIN projects p ON t.project_id = p.project_id
        WHERE t.task_id = ? AND p.user_id = ?
    """, (task_id, current_user["user_id"]))
    result = cursor.fetchone()

    if not result:
        raise HTTPException(status_code=404, detail="Task not found or unauthorized")

    tech_stack_id, est_hours = result

    # 🔐 Scope employees to current user
    cursor.execute("""
        SELECT e.employee_id, e.employee_name, e.weekly_hours,
               ISNULL(SUM(t.estimated_hours), 0) AS current_load, r.avg_rating
        FROM employees e
        JOIN employee_tech_stack ets ON e.employee_id = ets.employee_id
        LEFT JOIN tasks t ON e.employee_id = t.employee_id
        LEFT JOIN (
            SELECT employee_id, AVG(CAST(rating AS FLOAT)) AS avg_rating
            FROM reviews
            GROUP BY employee_id
        ) r ON e.employee_id = r.employee_id
        WHERE ets.tech_stack_id = ? AND e.user_id = ?
        GROUP BY 
            e.employee_id, e.employee_name, e.weekly_hours, r.avg_rating
    """, (tech_stack_id, current_user["user_id"]))

    matches = cursor.fetchall()
    conn.close()

    return [
        {
            "employee_id": row[0],
            "employee_name": row[1],
            "weekly_hours": row[2],
            "current_workload": row[3],
            "tentative_workload": row[3] + est_hours,
            "over_capacity": (row[3] + est_hours) > row[2],
            "average_rating": round(row[4], 2) if row[4] is not None else None,
            "load_percent": round((row[3] / row[2]) * 100, 0) if row[2] > 0 else 0
        } for row in matches
    ]

@app.post("/projects/{project_id}/tasks")
def add_task_to_project(project_id: int, task: TaskCreate, current_user: dict = Depends(get_current_user)):
    conn = connect_to_db()
    cursor = conn.cursor()
    try:
        # 🔒 Step 1: Confirm project belongs to the current user
        cursor.execute("SELECT user_id FROM projects WHERE project_id = ?", (project_id,))
        owner = cursor.fetchone()
        if not owner or owner[0] != current_user["user_id"]:
            raise HTTPException(status_code=403, detail="Unauthorized to add tasks to this project")

        # ✅ Step 2: Proceed with task insert
        cursor.execute("""
            INSERT INTO tasks (project_id, tech_stack_id, estimated_hours, deadline, employee_id, completed)
            VALUES (?, ?, ?, ?, NULL, 0)
        """, (
            project_id,
            task.tech_stack_id,
            task.estimated_hours,
            task.deadline
        ))
        conn.commit()
        return {"message": "Task added successfully"}

    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@app.get("/tech_stack")
def get_tech_stack():
    conn = connect_to_db()
    cursor = conn.cursor()
    cursor.execute("SELECT tech_stack_id, tech_stack_name FROM tech_stack")
    rows = cursor.fetchall()
    conn.close()
    return [{"tech_stack_id": r[0], "tech_stack_name": r[1]} for r in rows]

# @app.patch("/tasks/{task_id}/unassign")
# def unassign_task(task_id: int, current_user: dict = Depends(get_current_user)):
#     conn = connect_to_db()
#     cursor = conn.cursor()
#     try:
#         cursor.execute("""
#             SELECT p.user_id
#             FROM tasks t
#             JOIN projects p ON t.project_id = p.project_id
#             WHERE t.task_id = ?
#         """, (task_id,))
#         owner = cursor.fetchone()
#         if not owner or owner[0] != current_user["user_id"]:
#             raise HTTPException(status_code=403, detail="Unauthorized")

#         cursor.execute("UPDATE tasks SET employee_id = NULL WHERE task_id = ?", (task_id,))
#         conn.commit()
#         return {"message": "Task unassigned successfully"}
#     except Exception as e:
#         conn.rollback()
#         raise HTTPException(status_code=500, detail=str(e))
#     finally:
#         conn.close()

@app.patch("/tasks/{task_id}/unassign")
def unassign_task(task_id: int, current_user: dict = Depends(get_current_user)):
    conn = connect_to_db()
    cursor = conn.cursor()
    try:
        # Check if the task exists and belongs to the current user
        cursor.execute("""
            SELECT p.user_id
            FROM tasks t
            JOIN projects p ON t.project_id = p.project_id
            WHERE t.task_id = ?
        """, (task_id,))
        row = cursor.fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Task not found")

        if row[0] != current_user["user_id"]:
            raise HTTPException(status_code=403, detail="Unauthorized")

        # Perform unassignment
        cursor.execute("""
            UPDATE tasks
            SET employee_id = NULL
            WHERE task_id = ?
        """, (task_id,))
        
        conn.commit()
        return {"message": "Task unassigned successfully"}
        
    except Exception as e:
        conn.rollback()
        print("❌ Error during unassign:", e)
        raise HTTPException(status_code=500, detail="Failed to unassign task")
    finally:
        conn.close()


@app.patch("/tasks/{task_id}/toggle-completion")
def toggle_completion(task_id: int, current_user: dict = Depends(get_current_user)):
    conn = connect_to_db()
    cursor = conn.cursor()
    try:
        # 🔐 Step 1: Confirm task belongs to the current user
        cursor.execute("""
            SELECT t.completed
            FROM tasks t
            JOIN projects p ON t.project_id = p.project_id
            WHERE t.task_id = ? AND p.user_id = ?
        """, (task_id, current_user["user_id"]))
        row = cursor.fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Task not found or unauthorized")

        # ✅ Step 2: Toggle completion status
        new_status = 0 if row[0] else 1
        cursor.execute("UPDATE tasks SET completed = ? WHERE task_id = ?", (new_status, task_id))
        conn.commit()
        return {"completed": new_status}

    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


# 🔁 Assign tech stack to newly added employee
def assign_skills_to_new_employee(employee_id: int, role: str, db_conn):
    RolesToTaskTypeMap = {
        'Frontend Developer': ['Frontend Dev', 'UI Design', 'Design', 'Feature'],
        'Backend Developer': ['Backend API', 'Security Review', 'Database Setup', 'Testing', 'Planning', 'Data Analysis', 'Feature'],
        'QA Engineer': ['Testing', 'Security Review'],
        'Designer': ['Design', 'UI Design'],
        'Database Admin': ['Database Setup'],
        'Project Manager': ['Planning', 'Supervising'],
        'Data Analyst': ['Data Analysis', 'Planning'],
        'Feature Developer': ['Feature'],
        'Supervisor': ['Supervising', 'Planning'],
    }

    skill_name_to_id = {
        'Frontend Dev': 1, 'UI Design': 2, 'Design': 3, 'Feature': 4,
        'Backend API': 5, 'Security Review': 6, 'Database Setup': 7,
        'Testing': 8, 'Planning': 9, 'Data Analysis': 10, 'Supervising': 11
    }

    skills = RolesToTaskTypeMap.get(role, [])
    cursor = db_conn.cursor()
    for skill in skills:
        skill_id = skill_name_to_id.get(skill)
        if skill_id:
            cursor.execute(
                "INSERT INTO employee_tech_stack (employee_id, tech_stack_id) VALUES (?, ?)",
                (employee_id, skill_id)
            )
    db_conn.commit()

# @app.post("/employees")
# def add_employee(data: EmployeeCreate, current_user: dict = Depends(get_current_user)):
#     conn = connect_to_db()
#     cursor = conn.cursor()
#     try:
#         cursor.execute("""
#             INSERT INTO employees (employee_id, employee_name, role,  weekly_hours, user_id)
#             VALUES (?, ?, ?, ?, 40, ?)
#         """, (data.employee_id, data.employee_name, data.role,  current_user["user_id"]))

#         # ✅ Add skills dynamically based on role
#         assign_skills_to_new_employee(data.employee_id, data.role, conn)

#         conn.commit()
#         return {"message": "Employee added"}
#     except Exception as e:
#         print("❌ Error inserting employee:", e)
#         conn.rollback()
#         raise HTTPException(status_code=500, detail=str(e))
#     finally:
#         conn.close()

@app.post("/employees")
def add_employee(data: EmployeeCreate, current_user: dict = Depends(get_current_user)):
    conn = connect_to_db()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            INSERT INTO employees (employee_id, employee_name, role, weekly_hours, user_id)
            VALUES (?, ?, ?, ?, ?)
        """, (data.employee_id, data.employee_name, data.role, data.weekly_hours, current_user["user_id"]))

        assign_skills_to_new_employee(data.employee_id, data.role, conn)

        conn.commit()
        return {"message": "Employee added"}
    except Exception as e:
        print("❌ Error inserting employee:", e)
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()



@app.patch("/employees/{employee_id}/release")
def release_employee(employee_id: int, current_user: dict = Depends(get_current_user)):
    conn = connect_to_db()
    cursor = conn.cursor()
    try:
        # 🔒 Ownership check
        cursor.execute("SELECT 1 FROM employees WHERE employee_id = ? AND user_id = ?", (employee_id, current_user["user_id"]))
        if not cursor.fetchone():
            raise HTTPException(status_code=403, detail="Unauthorized")

        cursor.execute("UPDATE tasks SET employee_id = NULL WHERE employee_id = ?", (employee_id,))
        conn.commit()
        return {"message": "Employee released from all tasks"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@app.get("/stats/total-projects")
def get_total_projects(current_user: dict = Depends(get_current_user)):
    conn = connect_to_db()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM projects WHERE user_id = ?", (current_user["user_id"],))
    count = cursor.fetchone()[0]
    conn.close()
    return {"total_projects": count}

@app.get("/stats/task-completion")
def get_task_completion(current_user: dict = Depends(get_current_user)):
    conn = connect_to_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT COUNT(*) 
        FROM tasks t
        JOIN projects p ON t.project_id = p.project_id
        WHERE p.user_id = ?
    """, (current_user["user_id"],))
    total = cursor.fetchone()[0]

    cursor.execute("""
        SELECT COUNT(*) 
        FROM tasks t
        JOIN projects p ON t.project_id = p.project_id
        WHERE p.user_id = ? AND t.completed = 1
    """, (current_user["user_id"],))
    done = cursor.fetchone()[0]

    conn.close()
    return {"completed": done, "total": total}


@app.get("/stats/employee-availability")
def get_employee_availability(current_user: dict = Depends(get_current_user)):
    conn = connect_to_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT weekly_hours, 
               ISNULL(SUM(t.estimated_hours), 0) AS current_load
        FROM employees e
        LEFT JOIN tasks t ON e.employee_id = t.employee_id
        WHERE e.user_id = ?
        GROUP BY e.employee_id, weekly_hours
    """, (current_user["user_id"],))
    rows = cursor.fetchall()
    conn.close()

    available = sum(1 for row in rows if float(row[1]) < 35)
    loaded = len(rows) - available

    return {
        "available": available,
        "overloaded": loaded
    }


@app.get("/analytics")
def get_analytics(current_user: dict = Depends(get_current_user)):
    conn = connect_to_db()
    cursor = conn.cursor()

    try:
        # Total Projects
        cursor.execute("SELECT COUNT(*) FROM projects WHERE user_id = ?", (current_user["user_id"],))
        total_projects = cursor.fetchone()[0]

        # Employee availability
        cursor.execute("""
            SELECT weekly_hours, 
                   ISNULL(SUM(t.estimated_hours), 0) AS current_load
            FROM employees e
            LEFT JOIN tasks t ON e.employee_id = t.employee_id
            WHERE e.user_id = ?
            GROUP BY e.employee_id, weekly_hours
        """, (current_user["user_id"],))
        employee_rows = cursor.fetchall()

        threshold = 0.95
        available = 0
        overloaded = 0
        for weekly, current in employee_rows:
            if weekly > 0:
                load = current / weekly
                if load < threshold:
                    available += 1
                else:
                    overloaded += 1

        # Benched = 0 hours of incomplete tasks
        cursor.execute("""
            SELECT e.employee_id,
                   ISNULL(SUM(CASE WHEN t.completed = 0 THEN t.estimated_hours ELSE 0 END), 0) AS incomplete_load
            FROM employees e
            LEFT JOIN tasks t ON e.employee_id = t.employee_id
            WHERE e.user_id = ?
            GROUP BY e.employee_id
        """, (current_user["user_id"],))
        rows = cursor.fetchall()
        benched = sum(1 for r in rows if r[1] == 0)
        active = len(rows) - benched

        # Tasks
        cursor.execute("""
            SELECT COUNT(*) FROM tasks t
            JOIN projects p ON t.project_id = p.project_id
            WHERE t.completed = 1 AND p.user_id = ?
        """, (current_user["user_id"],))
        tasks_completed = cursor.fetchone()[0]

        cursor.execute("""
            SELECT COUNT(*) FROM tasks t
            JOIN projects p ON t.project_id = p.project_id
            WHERE p.user_id = ?
        """, (current_user["user_id"],))
        total_tasks = cursor.fetchone()[0]
        tasks_pending = total_tasks - tasks_completed

        # Workload by Tech Stack
        cursor.execute("""
            SELECT ts.tech_stack_name, ISNULL(SUM(t.estimated_hours), 0) as total_hours
            FROM tech_stack ts
            LEFT JOIN tasks t ON ts.tech_stack_id = t.tech_stack_id
            JOIN projects p ON t.project_id = p.project_id
            WHERE p.user_id = ?
            GROUP BY ts.tech_stack_name
        """, (current_user["user_id"],))
        workload_rows = cursor.fetchall()
        workload_distribution = [
            {"name": row[0], "value": row[1]} for row in workload_rows if row[1] > 0
        ]

        return {
            "total_projects": total_projects,
            "employees_benched": benched,
            "employees_active": active,
            "employees_available": available,
            "employees_overloaded": overloaded,
            "tasks_completed": tasks_completed,
            "tasks_pending": tasks_pending,
            "workload_distribution": workload_distribution
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analytics error: {str(e)}")
    finally:
        conn.close()




@app.get("/analytics/bench")
def get_bench_vs_active(current_user: dict = Depends(get_current_user)):
    conn = connect_to_db()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT
                SUM(CASE WHEN current_load = 0 THEN 1 ELSE 0 END) AS benched,
                SUM(CASE WHEN current_load > 0 THEN 1 ELSE 0 END) AS active
            FROM (
                SELECT e.employee_id, ISNULL(SUM(t.estimated_hours), 0) AS current_load
                FROM employees e
                LEFT JOIN tasks t ON e.employee_id = t.employee_id
                WHERE e.user_id = ?
                GROUP BY e.employee_id
            ) x
        """, (current_user["user_id"],))
        row = cursor.fetchone()
        return {"benched": row.benched, "active": row.active}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@app.get("/stats/projects")
def get_project_stats(current_user: dict = Depends(get_current_user)):
    from datetime import date, timedelta
    conn = connect_to_db()
    cursor = conn.cursor()
    try:
        today = date.today()
        near_deadline = today + timedelta(days=7)

        cursor.execute("SELECT COUNT(*) FROM projects WHERE user_id = ?", (current_user["user_id"],))
        total_projects = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM projects WHERE deadline <= ? AND user_id = ?", (near_deadline, current_user["user_id"]))
        near_due = cursor.fetchone()[0]

        cursor.execute("""
            SELECT COUNT(*) 
            FROM tasks t 
            JOIN projects p ON t.project_id = p.project_id 
            WHERE p.user_id = ?
        """, (current_user["user_id"],))
        task_count = cursor.fetchone()[0]

        return {
            "total": total_projects,
            "nearDue": near_due,
            "taskCount": task_count
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@app.put("/employees/{employee_id}")
def update_employee(employee_id: int, data: EmployeeCreate, current_user: dict = Depends(get_current_user)):
    conn = connect_to_db()
    cursor = conn.cursor()

    try:
        cursor.execute("SELECT 1 FROM employees WHERE employee_id = ? AND user_id = ?", (employee_id, current_user["user_id"]))
        if not cursor.fetchone():
            raise HTTPException(status_code=403, detail="Unauthorized")
    
        cursor.execute("""
            UPDATE employees
            SET employee_name = ?, role = ?
            WHERE employee_id = ?
        """, (data.employee_name, data.role, employee_id))
        conn.commit()
        return {"message": "Employee updated"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@app.delete("/employees/{employee_id}")
def delete_employee(employee_id: int, current_user: dict = Depends(get_current_user)):
    conn = connect_to_db()
    cursor = conn.cursor()

    try:
        cursor.execute("SELECT 1 FROM employees WHERE employee_id = ? AND user_id = ?", (employee_id, current_user["user_id"]))
        if not cursor.fetchone():
            raise HTTPException(status_code=403, detail="Unauthorized")

        cursor.execute("DELETE FROM employee_tech_stack WHERE employee_id = ?", (employee_id,))
        cursor.execute("DELETE FROM tasks WHERE employee_id = ?", (employee_id,))
        cursor.execute("DELETE FROM employees WHERE employee_id = ?", (employee_id,))
        conn.commit()
        return {"message": "Employee deleted"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@app.put("/tasks/{task_id}")
def update_task(task_id: int, data: TaskEdit, current_user: dict = Depends(get_current_user)):
    conn = connect_to_db()
    cursor = conn.cursor()

    try:
        # ✅ Confirm task belongs to current user
        cursor.execute("""
            SELECT 1
            FROM tasks t
            JOIN projects p ON t.project_id = p.project_id
            WHERE t.task_id = ? AND p.user_id = ?
        """, (task_id, current_user["user_id"]))
        if not cursor.fetchone():
            raise HTTPException(status_code=403, detail="Unauthorized")

        # ✅ Now update only editable fields
        cursor.execute("""
            UPDATE tasks
            SET estimated_hours = ?, deadline = ?, start_date = ?
            WHERE task_id = ?
        """, (data.estimated_hours, data.deadline, data.start_date, task_id))

        conn.commit()
        return {"message": "Task updated"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@app.delete("/tasks/{task_id}")
def delete_task(task_id: int, current_user: dict = Depends(get_current_user)):
    conn = connect_to_db()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            SELECT 1
            FROM tasks t
            JOIN projects p ON t.project_id = p.project_id
            WHERE t.task_id = ? AND p.user_id = ?
        """, (task_id, current_user["user_id"]))
        if not cursor.fetchone():
            raise HTTPException(status_code=403, detail="Unauthorized")

        cursor.execute("DELETE FROM tasks WHERE task_id = ?", (task_id,))
        conn.commit()
        return {"message": "Task deleted"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@app.put("/projects/{project_id}")
def update_project(project_id: int, data: ProjectCreate, current_user: dict = Depends(get_current_user)):
    conn = connect_to_db()
    cursor = conn.cursor()

    try:
        cursor.execute("SELECT user_id FROM projects WHERE project_id = ?", (project_id,))
        owner = cursor.fetchone()
        if not owner or owner[0] != current_user["user_id"]:
            raise HTTPException(status_code=403, detail="Unauthorized")

        cursor.execute("""
            UPDATE projects
            SET project_name = ?, client_name = ?, start_date = ?, deadline = ?
            WHERE project_id = ?
        """, (data.project_name, data.client_name, data.start_date, data.deadline, project_id))
        conn.commit()
        return {"message": "Project updated"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@app.delete("/projects/{project_id}")
def delete_project(project_id: int, current_user: dict = Depends(get_current_user)):
    conn = connect_to_db()
    cursor = conn.cursor()

    try:
        cursor.execute("SELECT user_id FROM projects WHERE project_id = ?", (project_id,))
        owner = cursor.fetchone()
        if not owner or owner[0] != current_user["user_id"]:
            raise HTTPException(status_code=403, detail="Unauthorized")
        
        cursor.execute("DELETE FROM tasks WHERE project_id = ?", (project_id,))
        cursor.execute("DELETE FROM projects WHERE project_id = ?", (project_id,))
        conn.commit()
        return {"message": "Project deleted"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@app.post("/tasks")
def create_task(task: dict, current_user: dict = Depends(get_current_user)):
    conn = connect_to_db()
    cursor = conn.cursor()

    try:
        cursor.execute("SELECT 1 FROM projects WHERE project_id = ? AND user_id = ?", (task["project_id"], current_user["user_id"]))
        if not cursor.fetchone():
            raise HTTPException(status_code=403, detail="Unauthorized project")
        
        cursor.execute("""
            INSERT INTO tasks (tech_stack_id, project_id, estimated_hours, deadline, start_date, completed, user_id)
            VALUES (?, ?, ?, ?, ?, 0, ?)
        """, (
            task["tech_stack_id"],
            task["project_id"],
            task["estimated_hours"],
            task["deadline"],
            task.get("start_date"),
            current_user["user_id"]  # ✅ This line fixes your NULL problem
        ))
        conn.commit()
        return {"message": "Task created"}
    except Exception as e:
        print("❌ Task creation failed:", e)
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

# @app.put("/tasks/{task_id}")
# def update_task(task_id: int, task: dict):
#     conn = connect_to_db()
#     cursor = conn.cursor()

#     try:
#         cursor.execute("""
#             UPDATE tasks
#             SET tech_stack_id = ?, project_id = ?, estimated_hours = ?, deadline = ?, start_date = ?, completed = ?
#             WHERE task_id = ?
#         """, (
#             task["tech_stack_id"],
#             task["project_id"],
#             task["estimated_hours"],
#             task["deadline"],
#             task.get("start_date"),
#             task.get("completed", 0),
#             task_id
#         ))
#         conn.commit()
#         return {"message": "Task updated"}
#     except Exception as e:
#         print("❌ Task update failed:", e)
#         conn.rollback()
#         raise HTTPException(status_code=500, detail=str(e))
#     finally:
#         conn.close()

@app.get("/stats/dept-workload")
def get_department_workload_stats(current_user: dict = Depends(get_current_user)):
    conn = connect_to_db()
    cursor = conn.cursor()
    try:
        # Get total employees per role
        cursor.execute("""
            SELECT role, COUNT(*) 
            FROM employees 
            WHERE user_id = ?
            GROUP BY role
        """, (current_user["user_id"],))
        total_rows = cursor.fetchall()
        role_totals = {row[0]: row[1] for row in total_rows}

        # Get how many employees per role have at least one task assigned
        cursor.execute("""
            SELECT e.role, COUNT(DISTINCT t.employee_id)
            FROM tasks t
            JOIN employees e ON t.employee_id = e.employee_id
            WHERE e.user_id = ?
            GROUP BY e.role
        """, (current_user["user_id"],))
        working_rows = cursor.fetchall()
        role_working = {row[0]: row[1] for row in working_rows}

        # Combine into structured list
        stats = []
        for role, total in role_totals.items():
            working = role_working.get(role, 0)
            stats.append({
                "role": role,
                "total": total,
                "working": working
            })

        return stats

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()
    
@app.get("/stats/dashboard")
def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    conn = connect_to_db()
    cursor = conn.cursor()

    # ✅ Project Completion Stats
    cursor.execute("""
        SELECT p.project_name,
            SUM(CASE WHEN t.completed = 1 THEN 1 ELSE 0 END) AS completed,
            COUNT(t.task_id) - SUM(CASE WHEN t.completed = 1 THEN 1 ELSE 0 END) AS remaining
        FROM projects p
        LEFT JOIN tasks t ON p.project_id = t.project_id
        WHERE p.user_id = ?
        GROUP BY p.project_name
    """, (current_user["user_id"],))
    project_progress = [
        {"project_name": row[0], "completed": row[1], "remaining": row[2]}
        for row in cursor.fetchall()
    ]

    # ✅ Monthly Project Creation Trends
    cursor.execute("""
        SELECT FORMAT(start_date, 'yyyy-MM') AS month, COUNT(*) AS count
        FROM projects
        WHERE user_id = ?
        GROUP BY FORMAT(start_date, 'yyyy-MM')
        ORDER BY month
    """, (current_user["user_id"],))
    monthly_trends = [{"month": row[0], "count": row[1]} for row in cursor.fetchall()]

    conn.close()
    return {
        "project_progress": project_progress,
        "monthly_project_trends": monthly_trends
    }

# @app.post("/reviews")
# def submit_review(review: dict):
#     conn = connect_to_db()
#     cursor = conn.cursor()
#     cursor.execute("""
#         INSERT INTO reviews (employee_id, task_id, rating, comment)
#         VALUES (?, ?, ?, ?)
#     """, (
#         review.get("employee_id"),
#         review.get("task_id"),
#         review.get("rating"),
#         review.get("comment", None)
#     ))
#     conn.commit()
#     conn.close()
#     return {"message": "Review submitted successfully"}

@app.post("/reviews")
def submit_review(review: dict, current_user: dict = Depends(get_current_user)):
    conn = connect_to_db()
    cursor = conn.cursor()
    try:
        employee_id = review.get("employee_id")
        task_id = review.get("task_id")

        # 🔒 Step 1: Confirm employee belongs to current user
        cursor.execute("SELECT 1 FROM employees WHERE employee_id = ? AND user_id = ?", (employee_id, current_user["user_id"]))
        if not cursor.fetchone():
            raise HTTPException(status_code=403, detail="Unauthorized: This employee doesn't belong to you")

        # 🔒 Step 2: Confirm task belongs to one of your projects
        cursor.execute("""
            SELECT 1
            FROM tasks t
            JOIN projects p ON t.project_id = p.project_id
            WHERE t.task_id = ? AND p.user_id = ?
        """, (task_id, current_user["user_id"]))
        if not cursor.fetchone():
            raise HTTPException(status_code=403, detail="Unauthorized: This task doesn't belong to you")

        # ✅ Insert the review
        cursor.execute("""
            INSERT INTO reviews (employee_id, task_id, rating, comment)
            VALUES (?, ?, ?, ?)
        """, (
            employee_id,
            task_id,
            review.get("rating"),
            review.get("comment", None)
        ))
        conn.commit()
        return {"message": "Review submitted successfully"}

    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

# @app.get("/employees/{employee_id}/reviews")
# def get_reviews(employee_id: int):
#     conn = connect_to_db()
#     cursor = conn.cursor()

#     cursor.execute("""
#         SELECT review_id, task_id, rating, comment, reviewed_at
#         FROM reviews
#         WHERE employee_id = ?
#         ORDER BY reviewed_at DESC
#     """, (employee_id,))

#     rows = cursor.fetchall()
#     cursor.close()
#     conn.close()

#     reviews = [{
#         "review_id": r[0],
#         "task_id": r[1],
#         "rating": r[2],
#         "comment": r[3],
#         "reviewed_at": r[4]
#     } for r in rows]

#     return reviews

@app.get("/employees/{employee_id}/reviews")
def get_reviews(employee_id: int, current_user: dict = Depends(get_current_user)):
    conn = connect_to_db()
    cursor = conn.cursor()

    # 🔐 Check employee ownership
    cursor.execute("SELECT 1 FROM employees WHERE employee_id = ? AND user_id = ?", (employee_id, current_user["user_id"]))
    if not cursor.fetchone():
        raise HTTPException(status_code=403, detail="Unauthorized")

    cursor.execute("""
        SELECT review_id, task_id, rating, comment, reviewed_at
        FROM reviews
        WHERE employee_id = ?
        ORDER BY reviewed_at DESC
    """, (employee_id,))

    rows = cursor.fetchall()
    cursor.close()
    conn.close()

    reviews = [ {
        "review_id": r[0],
        "task_id": r[1],
        "rating": r[2],
        "comment": r[3],
        "reviewed_at": r[4]
    } for r in rows ]

    return reviews



# @app.get("/employees/{employee_id}/suggested_tasks")
# def suggest_tasks(employee_id: int):
#     conn = connect_to_db()
#     cursor = conn.cursor()

#     # Step 1: Get employee's tech_stack_ids
#     cursor.execute("""
#         SELECT tech_stack_id
#         FROM employee_tech_stack
#         WHERE employee_id = ?
#     """, employee_id)
#     tech_ids = [row.tech_stack_id for row in cursor.fetchall()]

#     if not tech_ids:
#         raise HTTPException(status_code=404, detail="No tech skills found")

@app.get("/employees/{employee_id}/suggested_tasks")
def suggest_tasks(employee_id: int, current_user: dict = Depends(get_current_user)):
    conn = connect_to_db()
    cursor = conn.cursor()

    # 🔐 Confirm ownership of employee
    cursor.execute("SELECT 1 FROM employees WHERE employee_id = ? AND user_id = ?", (employee_id, current_user["user_id"]))
    if not cursor.fetchone():
        raise HTTPException(status_code=403, detail="Unauthorized")

    tech_ids = [row.tech_stack_id for row in cursor.fetchall()]
    # Step 2: Get matching unassigned, incomplete tasks
    placeholders = ",".join("?" * len(tech_ids))
    cursor.execute(f"""
        SELECT t.task_id, t.estimated_hours, t.start_date, t.deadline, t.project_id,
               p.project_name, ts.tech_stack_name
        FROM tasks t
        JOIN projects p ON t.project_id = p.project_id
        JOIN tech_stack ts ON t.tech_stack_id = ts.tech_stack_id
        WHERE t.employee_id IS NULL
          AND t.completed = 0
          AND t.tech_stack_id IN ({placeholders})
        ORDER BY t.deadline ASC
    """, *tech_ids)

    tasks = [
        {
            "task_id": row.task_id,
            "project_name": row.project_name,
            "tech_stack": row.tech_stack_name,
            "estimated_hours": row.estimated_hours,
            "start_date": row.start_date,
            "deadline": row.deadline
        }
        for row in cursor.fetchall()
    ]
    conn.close()
    return tasks

@app.post("/auth/register")
def register(form_data: OAuth2PasswordRequestForm = Depends()):
    conn = connect_to_db()
    cursor = conn.cursor()
    existing = get_user_by_username(form_data.username)
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")
    hashed_pw = get_password_hash(form_data.password)
    cursor.execute("INSERT INTO users (username, hashed_password) VALUES (?, ?)", (form_data.username, hashed_pw))
    conn.commit()
    conn.close()
    return {"message": "User registered"}

@app.post("/auth/login")
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = get_user_by_username(form_data.username)
    if not user or not verify_password(form_data.password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    access_token = create_access_token(data={"sub": str(user["user_id"])})
    return {"access_token": access_token, "token_type": "bearer"}
