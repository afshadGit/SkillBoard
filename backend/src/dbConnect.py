import pyodbc

def connect_to_db():
    try:
        conn = pyodbc.connect(
            "Driver={ODBC Driver 17 for SQL Server};"
            "Server=AFSHAD;"
            "Database=WorkDB;"
            "Trusted_Connection=yes;"
        )
        return conn
    except pyodbc.Error as e:
        print("Connection failed:", e)
        return None
