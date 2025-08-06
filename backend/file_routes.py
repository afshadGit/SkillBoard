# 📂 file_routes.py — handles Excel upload/download for SkillBoard
from fastapi import APIRouter, UploadFile, File, Depends
from fastapi.responses import StreamingResponse, JSONResponse
from io import BytesIO
import pandas as pd
import openpyxl
from auth_utils import get_current_user
from src.dbConnect import connect_to_db  # ✅ Use your existing MSSQL connection

router = APIRouter()

# ✅ Upload Employees
@router.post("/upload/employees")
def upload_employees(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    if not file.filename.endswith((".csv", ".xlsx")):
        return JSONResponse(status_code=400, content={"error": "Only .csv or .xlsx allowed"})

    try:
        contents = file.file.read()
        df = pd.read_csv(BytesIO(contents)) if file.filename.endswith(".csv") else pd.read_excel(BytesIO(contents))

        # 🔄 Normalize column names (strip, lowercase, underscores)
        df.columns = df.columns.str.strip().str.lower().str.replace(" ", "_")

        # 🔁 Map common variations to expected names
        column_map = {
            "name": "employee_name",  # Support 'Name' as 'employee_name'
            "employee_name": "employee_name",
            "weekly_hours": "weekly_hours",
            "role": "role"
        }
        df.rename(columns=column_map, inplace=True)

        required_columns = {"employee_name", "role", "weekly_hours"}
        if not required_columns.issubset(df.columns):
            return JSONResponse(status_code=422, content={"error": f"Missing required headers: {required_columns}"})

        conn = connect_to_db()
        if conn is None:
            return JSONResponse(status_code=500, content={"error": "Database connection failed"})
        cursor = conn.cursor()

        for _, row in df.iterrows():
            cursor.execute("""
                INSERT INTO employees (user_id, employee_name, role, weekly_hours)
                VALUES (?, ?, ?, ?)
            """, current_user["user_id"], row["employee_name"], row["role"], row["weekly_hours"])

        conn.commit()
        conn.close()

        return {"message": "Employees uploaded successfully."}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

@router.get("/download/employees")
def download_employees(current_user: dict = Depends(get_current_user)):
    try:
        conn = connect_to_db()
        if conn is None:
            return JSONResponse(status_code=500, content={"error": "Database connection failed"})
        cursor = conn.cursor()

        cursor.execute("""
            SELECT
                e.employee_id,
                e.employee_name,
                e.role,
                ts.tech_stack_name AS task_name,
                p.project_name,
                t.start_date,
                t.deadline,
                CAST(t.estimated_hours * 100.0 / NULLIF(e.weekly_hours, 0) AS DECIMAL(5,0)) AS load_percentage
            FROM employees e
            LEFT JOIN tasks t ON e.employee_id = t.employee_id
            LEFT JOIN projects p ON t.project_id = p.project_id
            LEFT JOIN tech_stack ts ON t.tech_stack_id = ts.tech_stack_id
            WHERE t.user_id = ?
        """, current_user["user_id"])

        rows = cursor.fetchall()
        columns = [desc[0] for desc in cursor.description]
        df = pd.DataFrame.from_records(rows, columns=columns)

        df.fillna('', inplace=True)

        buffer = BytesIO()
        with pd.ExcelWriter(buffer, engine="openpyxl") as writer:
            df.to_excel(writer, index=False)
        buffer.seek(0)

        return StreamingResponse(buffer,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": "attachment; filename=employees.xlsx"})
    except Exception as e:
        print("⛔ Excel download error:", e)
        return JSONResponse(status_code=500, content={"error": str(e)})

# # ✅ Download Projects
# @router.get("/download/projects")
# def download_projects(current_user: dict = Depends(get_current_user)):
#     try:
#         conn = connect_to_db()
#         if conn is None:
#             return JSONResponse(status_code=500, content={"error": "Database connection failed"})
#         cursor = conn.cursor()

#         # ✅ Fetch Projects (using valid column names only)
#         cursor.execute("""
#             SELECT project_id, project_name, client_name, start_date, deadline
#             FROM projects
#             WHERE user_id = ?
#         """, current_user["user_id"])
#         projects = cursor.fetchall()
#         df_projects = pd.DataFrame.from_records(
#             projects,
#             columns=["Project ID", "Name", "Client", "Start Date", "Deadline"]
#         )

#         # ✅ Fetch Tasks linked to each project
#         cursor.execute("""
#             SELECT t.task_id, t.task_title, t.task_hours, t.project_id, e.employee_name
#             FROM tasks t
#             LEFT JOIN employees e ON t.employee_id = e.employee_id
#             INNER JOIN projects p ON t.project_id = p.project_id
#             WHERE p.user_id = ?
#         """, current_user["user_id"])
#         tasks = cursor.fetchall()
#         df_tasks = pd.DataFrame.from_records(
#             tasks,
#             columns=["Task ID", "Title", "Hours", "Project ID", "Assigned To"]
#         )

#         # ✅ Write both DataFrames to separate sheets
#         buffer = BytesIO()
#         with pd.ExcelWriter(buffer, engine="openpyxl") as writer:
#             df_projects.to_excel(writer, sheet_name="Projects", index=False)
#             df_tasks.to_excel(writer, sheet_name="Tasks", index=False)
#         buffer.seek(0)

#         return StreamingResponse(buffer,
#                                  media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
#                                  headers={"Content-Disposition": "attachment; filename=projects.xlsx"})
#     except Exception as e:
#         print("⛔ Download Error:", e)
#         return JSONResponse(status_code=500, content={"error": str(e)})
