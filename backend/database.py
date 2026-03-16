import sqlite3
import datetime
import json
import os
from flask_bcrypt import Bcrypt

# Try importing psycopg2 for PostgreSQL support
try:
    import psycopg2
    from psycopg2.extras import RealDictCursor
except ImportError:
    psycopg2 = None

DB_NAME = "ai_interviewer.db"
bcrypt = Bcrypt()

def get_db_connection():
    """
    Returns a database connection and the type ('postgres' or 'sqlite').
    Strictly follows the preferred order: Variables -> URL -> SQLite Fallback.
    """
    # 1. Try connecting using individual variables (Highly Specific)
    db_host = os.environ.get('DB_HOST')
    if db_host and psycopg2:
        try:
            port = int(os.environ.get('DB_PORT', 5432))
            conn = psycopg2.connect(
                host=db_host,
                user=os.environ.get('DB_USER'),
                password=os.environ.get('DB_PASSWORD'),
                dbname=os.environ.get('DB_NAME'),
                port=port,
                connect_timeout=5  # Don't hang the app
            )
            return conn, 'postgres'
        except Exception as e:
            print(f"⚠️ PostgreSQL Var Connection Failed: {e}. Trying DATABASE_URL...")

    # 2. Try connecting using DATABASE_URL string (Cloud Native)
    db_url = os.environ.get('DATABASE_URL')
    if db_url and psycopg2:
        try:
            conn = psycopg2.connect(db_url, connect_timeout=5)
            return conn, 'postgres'
        except Exception as e:
            print(f"⚠️ PostgreSQL URL Connection Failed: {e}. Falling back to Local SQLite.")
    
    # 3. Final Fallback to SQLite (Development/Offline Mode)
    # Always look for DB in the project root (parent of backend folder)
    current_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(current_dir)
    db_path = os.path.join(project_root, DB_NAME)
    
    # If project_root is basically the same as current_dir (root install), fallback to current
    if not os.path.exists(project_root) or "backend" not in current_dir:
        db_path = os.path.join(os.getcwd(), DB_NAME)
        
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn, 'sqlite'


def init_db(app):
    bcrypt.init_app(app)
    conn, db_type = get_db_connection()
    c = conn.cursor()
    
    print(f"🔌 Initializing Database ({db_type})...")

    if db_type == 'postgres':
        # PostgreSQL Schema
        c.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT UNIQUE,
                phone TEXT UNIQUE,
                password TEXT NOT NULL,
                photo TEXT, 
                resume_path TEXT,
                college_name TEXT,
                role TEXT DEFAULT 'candidate',
                year TEXT,
                register_no TEXT,
                branch TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        c.execute('''
            CREATE TABLE IF NOT EXISTS interviews (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                overall_score REAL,
                details JSONB
            )
        ''')
    else:
        # SQLite Schema
        c.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT UNIQUE,
                phone TEXT UNIQUE,
                password TEXT NOT NULL,
                photo TEXT, 
                resume_path TEXT,
                college_name TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Migrations for SQLite (Columns added later)
        migrations = [
            "ALTER TABLE users ADD COLUMN photo TEXT",
            "ALTER TABLE users ADD COLUMN college_name TEXT",
            "ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'candidate'",
            "ALTER TABLE users ADD COLUMN year TEXT",
            "ALTER TABLE users ADD COLUMN register_no TEXT",
            "ALTER TABLE users ADD COLUMN branch TEXT"
        ]
        for mig in migrations:
            try:
                c.execute(mig)
            except sqlite3.OperationalError:
                pass 

        c.execute('''
            CREATE TABLE IF NOT EXISTS interviews (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                overall_score REAL,
                details JSON,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        ''')
    
    conn.commit()
    conn.close()
    print(f"✅ Database initialized: {db_type}")

def create_user(name, email, phone, password, photo=None, college_name=None, role='candidate', year=None, register_no=None, branch=None):
    conn, db_type = get_db_connection()
    c = conn.cursor()
    try:
        hashed_pw = bcrypt.generate_password_hash(password).decode('utf-8')
        
        query = "INSERT INTO users (name, email, phone, password, photo, college_name, role, year, register_no, branch) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        params = (name, email, phone, hashed_pw, photo, college_name, role, year, register_no, branch)
        
        if db_type == 'postgres':
            query = query.replace('?', '%s') + " RETURNING id"
            c.execute(query, params)
            user_id = c.fetchone()[0]
        else:
            c.execute(query, params)
            user_id = c.lastrowid
            
        conn.commit()
        return user_id, None
    except Exception as e:
        # Catch generic exception because IntegrityError location varies
        err_msg = str(e).lower()
        if "unique" in err_msg or "duplicate" in err_msg or "constraint" in err_msg:
             return None, "Email or Phone already exists"
        return None, str(e)
    finally:
        conn.close()

def authenticate_user(identifier, password):
    conn, db_type = get_db_connection()
    # Use dict cursor for consistent access if postgres, sqlite uses Row which is dict-like
    if db_type == 'postgres':
        c = conn.cursor(cursor_factory=RealDictCursor)
    else:
        c = conn.cursor()
        
    query = "SELECT id, name, email, phone, password, resume_path, photo, college_name, role, year FROM users WHERE email=? OR phone=?"
    if db_type == 'postgres':
        query = query.replace('?', '%s')

    c.execute(query, (identifier, identifier))
    user = c.fetchone()
    conn.close()
    
    # Access by key is safer now
    if user:
        # Check password (handle dict vs Row access)
        stored_pw = user['password']
        if bcrypt.check_password_hash(stored_pw, password):
             return {
                 "id": user['id'],
                 "name": user['name'],
                 "email": user['email'],
                 "phone": user['phone'],
                 "resume_path": user['resume_path'],
                 "photo": user['photo'],
                 "college_name": user['college_name'],
                 "role": user['role'] if 'role' in user.keys() else 'candidate',
                 "year": user['year'] if 'year' in user.keys() else 'N/A'
             }
    return None

def update_user_profile(user_id, name, email, phone, college_name, year, photo=None, resume_path=None, register_no=None, branch=None):
    conn, db_type = get_db_connection()
    c = conn.cursor()
    try:
        sql = "UPDATE users SET name=?, email=?, phone=?, college_name=?, year=?"
        params = [name, email, phone, college_name, year]
        
        if photo:
            sql += ", photo=?"
            params.append(photo)
        if resume_path:
            sql += ", resume_path=?"
            params.append(resume_path)
            
        sql += ", register_no=?, branch=?"
        params.append(register_no)
        params.append(branch)
        
        sql += " WHERE id=?"
        params.append(user_id)
        
        if db_type == 'postgres':
            sql = sql.replace('?', '%s')
            
        c.execute(sql, tuple(params))
        conn.commit()
        return True, None
    except Exception as e:
        err_msg = str(e).lower()
        if "unique" in err_msg or "duplicate" in err_msg:
            return False, "Email or Phone already exists"
        return False, str(e)
    finally:
        conn.close()

def get_user_by_id(user_id):
    conn, db_type = get_db_connection()
    if db_type == 'postgres':
        c = conn.cursor(cursor_factory=RealDictCursor)
    else:
        c = conn.cursor()

    query = "SELECT id, name, email, phone, resume_path, photo, college_name, role, year, register_no, branch FROM users WHERE id=?"
    if db_type == 'postgres':
        query = query.replace('?', '%s')

    c.execute(query, (user_id,))
    user = c.fetchone()
    conn.close()
    
    if user:
        return {
             "id": user['id'],
             "name": user['name'],
             "email": user['email'],
             "phone": user['phone'],
             "resume_path": user['resume_path'],
             "photo": user['photo'],
             "college_name": user['college_name'],
             "role": user['role'] if 'role' in user.keys() else 'candidate',
             "year": user['year'] if 'year' in user.keys() else 'N/A',
             "register_no": user['register_no'] if 'register_no' in user.keys() else None,
             "branch": user['branch'] if 'branch' in user.keys() else None
        }
    return None

def get_user_photo(user_id):
    conn, db_type = get_db_connection()
    c = conn.cursor()
    query = "SELECT photo FROM users WHERE id=?"
    if db_type == 'postgres':
        query = query.replace('?', '%s')
    c.execute(query, (user_id,))
    row = c.fetchone()
    conn.close()
    if row: return row[0]
    return None

def update_resume_path(user_id, path):
    conn, db_type = get_db_connection()
    c = conn.cursor()
    query = "UPDATE users SET resume_path = ? WHERE id = ?"
    if db_type == 'postgres':
        query = query.replace('?', '%s')
    c.execute(query, (path, user_id))
    conn.commit()
    conn.close()

def save_interview(user_id, score, details_json):
    conn, db_type = get_db_connection()
    c = conn.cursor()
    
    one_minute_ago = (datetime.datetime.now() - datetime.timedelta(seconds=60)).isoformat()
    try:
        query_check = "SELECT id FROM interviews WHERE user_id=? AND overall_score=? AND date > ?"
        if db_type == 'postgres':
            query_check = query_check.replace('?', '%s')
            
        c.execute(query_check, (user_id, score, one_minute_ago))
        existing = c.fetchone()
        
        if existing:
            print(f"⚠️ Duplicate interview submission detected for user {user_id}. Skipping insert.")
            conn.close()
            return
            
        now = datetime.datetime.now().isoformat()
        query_insert = "INSERT INTO interviews (user_id, date, overall_score, details) VALUES (?, ?, ?, ?)"
        if db_type == 'postgres':
            query_insert = query_insert.replace('?', '%s')
            query_insert += " RETURNING id"
            
        c.execute(query_insert, (user_id, now, score, json.dumps(details_json)))
        
        if db_type == 'postgres':
            inserted_id = c.fetchone()[0]
        else:
            inserted_id = c.lastrowid
            
        conn.commit()
        return inserted_id
    except Exception as e:
        print(f"Error saving interview: {e}")
        return None
    finally:
        conn.close()

def get_user_interviews(user_id):
    conn, db_type = get_db_connection()
    if db_type == 'postgres':
        c = conn.cursor(cursor_factory=RealDictCursor)
    else:
        c = conn.cursor()
        
    query = "SELECT * FROM interviews WHERE user_id = ? ORDER BY date DESC"
    if db_type == 'postgres':
        query = query.replace('?', '%s')
        
    c.execute(query, (user_id,))
    rows = c.fetchall()
    conn.close()
    
    results = []
    for r in rows:
        details = r['details']
        if isinstance(details, str):
            details = json.loads(details)
            
        results.append({
            "id": r['id'],
            "date": r['date'],
            "overall_score": r['overall_score'],
            "details": details
        })
    return results

def get_user_by_email(email):
    conn, db_type = get_db_connection()
    c = conn.cursor()
    query = "SELECT id, name, email FROM users WHERE email=?"
    if db_type == 'postgres':
        query = query.replace('?', '%s')
    c.execute(query, (email,))
    user = c.fetchone()
    conn.close()
    if user:
        return {"id": user[0], "name": user[1], "email": user[2]}
    return None

def update_password(email, new_password):
    conn, db_type = get_db_connection()
    c = conn.cursor()
    try:
        hashed_pw = bcrypt.generate_password_hash(new_password).decode('utf-8')
        query = "UPDATE users SET password = ? WHERE email = ?"
        if db_type == 'postgres':
            query = query.replace('?', '%s')
            
        c.execute(query, (hashed_pw, email))
        conn.commit()
        return c.rowcount > 0
    except Exception as e:
        print(f"Update PW Error: {e}")
        return False
    finally:
        conn.close()

def get_interview_by_id(interview_id):
    conn, db_type = get_db_connection()
    if db_type == 'postgres':
        c = conn.cursor(cursor_factory=RealDictCursor)
    else:
        c = conn.cursor()
        
    query = '''
        SELECT i.*, u.name as user_name 
        FROM interviews i 
        JOIN users u ON i.user_id = u.id 
        WHERE i.id = ?
    '''
    if db_type == 'postgres':
        query = query.replace('?', '%s')
        
    c.execute(query, (interview_id,))
    row = c.fetchone()
    conn.close()
    
    if row:
        details = row['details']
        if isinstance(details, str):
            details = json.loads(details)
            
        return {
            "id": row['id'],
            "user_id": row['user_id'],
            "candidate_name": row['user_name'],
            "date": row['date'],
            "overall_score": row['overall_score'],
            "details": details if details is not None else {}
        }
    return None

def get_all_candidates_summary():
    conn, db_type = get_db_connection()
    if db_type == 'postgres':
        c = conn.cursor(cursor_factory=RealDictCursor)
    else:
        c = conn.cursor()
    
    query = '''
        SELECT 
            u.id, u.name, u.email, u.phone, u.college_name, u.role, u.resume_path, u.year, u.register_no, u.branch,
            COUNT(i.id) as total_interviews,
            MAX(i.overall_score) as best_score,
            AVG(i.overall_score) as avg_score,
            MAX(i.date) as last_interview_date
        FROM users u
        LEFT JOIN interviews i ON u.id = i.user_id
        WHERE u.role = 'candidate'
        GROUP BY u.id, u.name, u.email, u.phone, u.college_name, u.role, u.resume_path, u.year, u.register_no, u.branch
        ORDER BY last_interview_date DESC
    '''
    # Note: Postgres requires GROUP BY to include all non-aggregated columns. SQLite is loose.
    # I added the extra columns to GROUP BY above to be safe for Postgres.
    
    c.execute(query)
    rows = c.fetchall()
    conn.close()
    
    results = []
    for r in rows:
        results.append(dict(r))
    return results

def get_admin_stats():
    conn, db_type = get_db_connection()
    c = conn.cursor()
    
    # Total Enrolled
    c.execute("SELECT COUNT(*) FROM users WHERE role='candidate'")
    total_enrolled = c.fetchone()[0] or 0
    
    # Students Interviewed
    c.execute("SELECT COUNT(DISTINCT user_id) FROM interviews")
    students_interviewed = c.fetchone()[0] or 0
    
    # Total Attempts
    c.execute("SELECT COUNT(*) FROM interviews")
    total_attempts = c.fetchone()[0] or 0
    
    # Global Avg Score
    c.execute("SELECT AVG(overall_score) FROM interviews")
    avg_score = c.fetchone()[0]
    
    conn.close()
    
    return {
        "total_enrolled": total_enrolled,
        "students_interviewed": students_interviewed,
        "total_attempts": total_attempts,
        "avg_score": round(avg_score, 1) if avg_score else 0
    }

def delete_user(user_id):
    conn, db_type = get_db_connection()
    c = conn.cursor()
    try:
        query_del_int = "DELETE FROM interviews WHERE user_id=?"
        query_del_usr = "DELETE FROM users WHERE id=?"
        
        if db_type == 'postgres':
            query_del_int = query_del_int.replace('?', '%s')
            query_del_usr = query_del_usr.replace('?', '%s')
            
        c.execute(query_del_int, (user_id,))
        c.execute(query_del_usr, (user_id,))
        conn.commit()
        return True
    except Exception as e:
        print(f"Delete Error: {e}")
        return False
    finally:
        conn.close()

def get_best_interview_id(user_id):
    conn, db_type = get_db_connection()
    c = conn.cursor()
    query = "SELECT id FROM interviews WHERE user_id=? ORDER BY overall_score DESC LIMIT 1"
    if db_type == 'postgres':
        query = query.replace('?', '%s')
    c.execute(query, (user_id,))
    row = c.fetchone()
    conn.close()
    if row:
        return row[0]
    return None

def get_all_interviews_admin():
    conn, db_type = get_db_connection()
    if db_type == 'postgres':
        c = conn.cursor(cursor_factory=RealDictCursor)
    else:
        c = conn.cursor()
        
    query = '''
        SELECT 
            i.id, i.date, i.overall_score, 
            u.name as candidate_name, u.email as candidate_email, u.year
        FROM interviews i
        JOIN users u ON i.user_id = u.id
        ORDER BY i.date DESC
        LIMIT 100
    '''
    # Postgres doesn't need LIMIT syntax change usually
    
    c.execute(query)
    rows = c.fetchall()
    conn.close()
    
    results = []
    for r in rows:
        results.append(dict(r))
    return results
