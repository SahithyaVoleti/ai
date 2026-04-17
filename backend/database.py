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
    # Prefer DB in the backend directory where it was initialized
    current_dir = os.path.dirname(os.path.abspath(__file__))
    db_path = os.path.join(current_dir, DB_NAME)
    
    # If not in backend, check project root as fallback
    if not os.path.exists(db_path):
        project_root = os.path.dirname(current_dir)
        db_path = os.path.join(project_root, DB_NAME)
        
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn, 'sqlite'


def init_db(app):
    """Initializes the database and underlying services likes bcrypt."""
    # Initialize Bcrypt with the app context
    bcrypt.init_app(app)
    
    conn, db_type = get_db_connection()
    c = conn.cursor()
    
    print(f"[DB] Initializing Database ({db_type})...")

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
                resume_score REAL,
                plan_id TEXT DEFAULT 'free',
                interviews_remaining INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        c.execute('''
            CREATE TABLE IF NOT EXISTS interviews (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                overall_score REAL,
                details JSONB,
                video_path TEXT,
                status TEXT DEFAULT 'started'
            )
        ''')

        c.execute('''
            CREATE TABLE IF NOT EXISTS orders (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                order_id TEXT NOT NULL,
                payment_id TEXT,
                amount REAL,
                status TEXT DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')

        # PostgreSQL Migrations
        pg_migrations = [
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS resume_score REAL",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS plan_id TEXT DEFAULT 'free'",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS register_no TEXT",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS branch TEXT",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS domain TEXT",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS interviews_remaining INTEGER DEFAULT 0",
            "ALTER TABLE interviews ADD COLUMN IF NOT EXISTS video_path TEXT",
            "ALTER TABLE interviews ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'started'",
            "ALTER TABLE interviews ADD COLUMN IF NOT EXISTS module_name TEXT"
        ]
        for mig in pg_migrations:
            try:
                c.execute(mig)
            except Exception as e:
                print(f"PostgreSQL Migration Error: {e}")
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
                resume_score REAL,
                plan_id TEXT DEFAULT 'free',
                interviews_remaining INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        c.execute('''
            CREATE TABLE IF NOT EXISTS interviews (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                overall_score REAL,
                details TEXT,
                video_path TEXT,
                status TEXT DEFAULT 'started',
                module_name TEXT
            )
        ''')
        
        # Migrations for SQLite (Columns added later)
        migrations = [
            "ALTER TABLE users ADD COLUMN photo TEXT",
            "ALTER TABLE users ADD COLUMN college_name TEXT",
            "ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'candidate'",
            "ALTER TABLE users ADD COLUMN year TEXT",
            "ALTER TABLE users ADD COLUMN register_no TEXT",
            "ALTER TABLE users ADD COLUMN branch TEXT",
            "ALTER TABLE users ADD COLUMN domain TEXT",
            "ALTER TABLE users ADD COLUMN resume_score REAL",
            "ALTER TABLE users ADD COLUMN plan_id TEXT DEFAULT 'free'",
            "ALTER TABLE users ADD COLUMN interviews_remaining INTEGER DEFAULT 0",
            "ALTER TABLE interviews ADD COLUMN video_path TEXT",
            "ALTER TABLE interviews ADD COLUMN status TEXT DEFAULT 'started'"
        ]
        for mig in migrations:
            try:
                c.execute(mig)
            except sqlite3.OperationalError:
                pass 
            try:
                c.execute("ALTER TABLE interviews ADD COLUMN module_name TEXT")
            except sqlite3.OperationalError:
                pass 
            try:
                c.execute("ALTER TABLE users ADD COLUMN interviews_remaining INTEGER DEFAULT 1")
            except sqlite3.OperationalError:
                pass 
            try:
                c.execute("ALTER TABLE users ADD COLUMN resume_score REAL")
            except sqlite3.OperationalError:
                pass 
            try:
                c.execute("ALTER TABLE interviews ADD COLUMN status TEXT DEFAULT 'started'")
            except sqlite3.OperationalError:
                pass 
            try:
                c.execute("ALTER TABLE interviews ADD COLUMN video_path TEXT")
            except sqlite3.OperationalError:
                pass 

        c.execute('''
            CREATE TABLE IF NOT EXISTS interviews (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                overall_score REAL,
                details JSON,
                video_path TEXT,
                status TEXT DEFAULT 'started',
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        ''')
    
    conn.commit()
    conn.close()
    print(f"[OK] Database initialized: {db_type}")

def create_user(name, email, phone, password, photo=None, college_name=None, role='candidate', year=None, register_no=None, branch=None, domain=None):
    conn, db_type = get_db_connection()
    c = conn.cursor()
    try:
        # Normalize email to lowercase
        email_normalized = email.lower() if email else None
        hashed_pw = bcrypt.generate_password_hash(password).decode('utf-8')
        
        query = "INSERT INTO users (name, email, phone, password, photo, college_name, role, year, register_no, branch, domain, resume_score, plan_id, interviews_remaining) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        params = (name, email_normalized, phone, hashed_pw, photo, college_name, role, year, register_no, branch, domain, 0.0, '1', 1)
        
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
        
    # Normalize identifier if it looks like an email
    normalized_id = identifier.lower() if '@' in identifier else identifier
    
    query = "SELECT id, name, email, phone, password, resume_path, resume_score, photo, college_name, role, year, branch, domain, plan_id, interviews_remaining FROM users WHERE email=? OR phone=?"
    if db_type == 'postgres':
        query = query.replace('?', '%s')

    c.execute(query, (normalized_id, normalized_id))
    row = c.fetchone()
    conn.close()
    
    if row:
        # Convert to a standard dictionary to support .get() and .keys() everywhere
        user = dict(row)
        
        # Check password
        stored_pw = user.get('password')
        if stored_pw and bcrypt.check_password_hash(stored_pw, password):
             return {
                 "id": user.get('id'),
                 "name": user.get('name'),
                 "email": user.get('email'),
                 "phone": user.get('phone'),
                 "resume_path": user.get('resume_path'),
                 "photo": user.get('photo'),
                 "college_name": user.get('college_name'),
                 "role": user.get('role', 'candidate'),
                 "year": user.get('year', 'N/A'),
                 "branch": user.get('branch'),
                 "domain": user.get('domain'),
                 "resume_score": user.get('resume_score'),
                 "plan_id": user.get('plan_id', 'free'), 'interviews_remaining': user.get('interviews_remaining', 0)
             }
    return None

def create_order_log(user_id, order_id, amount):
    conn, db_type = get_db_connection()
    c = conn.cursor()
    try:
        query = "INSERT INTO orders (user_id, order_id, amount, status) VALUES (?, ?, ?, ?)"
        params = (user_id, order_id, amount, 'pending')
        if db_type == 'postgres':
            query = query.replace('?', '%s')
        c.execute(query, params)
        conn.commit()
    except Exception as e:
        print(f"Order Log Error: {e}")
    finally:
        conn.close()

def finalize_order(user_id, order_id, payment_id, credits_to_add, plan_id):
    conn, db_type = get_db_connection()
    c = conn.cursor()
    try:
        # 1. Update Order Status
        q1 = "UPDATE orders SET payment_id=?, status=? WHERE order_id=?"
        p1 = (payment_id, 'paid', order_id)
        
        # 2. Update User Plan & Credits
        q2 = "UPDATE users SET plan_id=?, interviews_remaining = interviews_remaining + ? WHERE id=?"
        p2 = (plan_id, credits_to_add, user_id)

        if db_type == 'postgres':
            q1 = q1.replace('?', '%s')
            q2 = q2.replace('?', '%s')
            
        c.execute(q1, p1)
        c.execute(q2, p2)
        conn.commit()
        return True
    except Exception as e:
        print(f"Finalize Order Error: {e}")
        return False
    finally:
        conn.close()

def decrement_user_credits(user_id):
    """
    Safely decrements a user's interview credits.
    Returns True if successful, False if no credits remain.
    """
    conn, db_type = get_db_connection()
    c = conn.cursor()
    try:
        # Check current balance
        q_check = "SELECT interviews_remaining FROM users WHERE id = ?"
        if db_type == 'postgres': q_check = q_check.replace('?', '%s')
        c.execute(q_check, (user_id,))
        row = c.fetchone()
        
        if not row: return False
        
        balance = row[0] if isinstance(row, tuple) else row.get('interviews_remaining', 0)
        
        if balance <= 0:
            return False
            
        # Decrement
        q_update = "UPDATE users SET interviews_remaining = interviews_remaining - 1 WHERE id = ?"
        if db_type == 'postgres': q_update = q_update.replace('?', '%s')
        c.execute(q_update, (user_id,))
        conn.commit()
        return True
    except Exception as e:
        print(f"Credit Decrement Error: {e}")
        return False
    finally:
        conn.close()

def has_interview_credits(user_id):
    """
    Checks if a user has at least one interview credit remaining.
    """
    conn, db_type = get_db_connection()
    c = conn.cursor()
    try:
        query = "SELECT interviews_remaining FROM users WHERE id = ?"
        if db_type == 'postgres': query = query.replace('?', '%s')
        c.execute(query, (user_id,))
        row = c.fetchone()
        if not row: return False
        
        # Consistent access for sqlite/postgres row types
        balance = row[0] if isinstance(row, tuple) else row.get('interviews_remaining', 0)
        return balance > 0
    except Exception as e:
        print(f"Has Credits Error: {e}")
        return False
    finally:
        conn.close()

def delete_user(user_id):
    conn, db_type = get_db_connection()
    c = conn.cursor()
    try:
        query = "DELETE FROM users WHERE id = ?"
        if db_type == 'postgres': query = query.replace('?', '%s')
        c.execute(query, (user_id,))
        conn.commit()
        return True
    except Exception as e:
        print(f"Delete User Error: {e}")
        return False
    finally:
        conn.close()

def update_user_plan(user_id, plan_id):
    conn, db_type = get_db_connection()
    c = conn.cursor()
    try:
        query = "UPDATE users SET plan_id=? WHERE id=?"
        params = (plan_id, user_id)
        if db_type == 'postgres':
            query = query.replace('?', '%s')
        c.execute(query, params)
        conn.commit()
        return True
    except Exception as e:
        print(f"Update Plan Error: {e}")
        return False
    finally:
        conn.close()

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
            
        sql += ", register_no=?, branch=?, domain=?"
        params.append(register_no)
        params.append(branch)
        params.append(domain)
        
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

    query = "SELECT id, name, email, phone, resume_path, resume_score, photo, college_name, role, year, register_no, branch, domain, plan_id, interviews_remaining FROM users WHERE id=?"
    if db_type == 'postgres':
        query = query.replace('?', '%s')

    c.execute(query, (user_id,))
    user = c.fetchone()
    conn.close()
    
    if user:
        # Convert row to dict for consistent access
        u = dict(user)
        return {
             "id": u['id'],
             "name": u['name'],
             "email": u['email'],
             "phone": u['phone'],
             "resume_path": u['resume_path'],
             "resume_score": u.get('resume_score'),
             "photo": u['photo'],
             "college_name": u['college_name'],
             "role": u.get('role', 'candidate'),
             "year": u.get('year', 'N/A'),
             "register_no": u.get('register_no'),
             "branch": u.get('branch'),
             "plan_id": u.get('plan_id', '1'),
             "interviews_remaining": u.get('interviews_remaining', 0)
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

def update_resume_score(user_id, score):
    conn, db_type = get_db_connection()
    c = conn.cursor()
    query = "UPDATE users SET resume_score = ? WHERE id = ?"
    if db_type == 'postgres':
        query = query.replace('?', '%s')
    c.execute(query, (float(score), user_id))
    conn.commit()
    conn.close()

def save_interview(user_id, score, details_json, video_path=None, interview_id=None):
    conn, db_type = get_db_connection()
    c = conn.cursor()
    
    one_minute_ago = (datetime.datetime.now() - datetime.timedelta(seconds=60)).isoformat()
    try:
        # If interview_id is provided, we update the existing 'started' record
        if interview_id:
            query_update = "UPDATE interviews SET overall_score=?, details=?, video_path=?, status='completed' WHERE id=? AND user_id=?"
            if db_type == 'postgres':
                query_update = query_update.replace('?', '%s')
            
            c.execute(query_update, (score, json.dumps(details_json), video_path, interview_id, user_id))
            conn.commit()
            return interview_id

        # Fallback to legacy behavior if no ID is provided (though we should avoid this now)
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
        query_insert = "INSERT INTO interviews (user_id, date, overall_score, details, video_path, status, module_name) VALUES (?, ?, ?, ?, ?, 'completed', ?)"
        if db_type == 'postgres':
            query_insert = query_insert.replace('?', '%s')
            query_insert += " RETURNING id"
            
        c.execute(query_insert, (user_id, now, score, json.dumps(details_json), video_path, details_json.get('module_name')))
        
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

def start_interview_session(user_id, module_name=None):
    """Creates a record in the interviews table with status 'started'."""
    conn, db_type = get_db_connection()
    c = conn.cursor()
    try:
        now = datetime.datetime.now().isoformat()
        query = "INSERT INTO interviews (user_id, date, status, module_name) VALUES (?, ?, 'started', ?)"
        if db_type == 'postgres':
            query = query.replace('?', '%s') + " RETURNING id"
            c.execute(query, (user_id, now, module_name))
            session_id = c.fetchone()[0]
        else:
            c.execute(query, (user_id, now, module_name))
            session_id = c.lastrowid
            
        conn.commit()
        return session_id
    except Exception as e:
        print(f"Error starting interview session: {e}")
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
            "details": details,
            "video_path": r.get('video_path'),
            "status": r.get('status', 'started')
        })
    return results

def terminate_interview_session(interview_id):
    """Updates an interview status to 'terminated' due to violations."""
    conn, db_type = get_db_connection()
    c = conn.cursor()
    try:
        query = "UPDATE interviews SET status = 'terminated' WHERE id = ?"
        if db_type == 'postgres':
            query = query.replace('?', '%s')
        c.execute(query, (interview_id,))
        conn.commit()
        return True
    except Exception as e:
        print(f"Error terminating interview session {interview_id}: {e}")
        return False
    finally:
        conn.close()

def get_user_by_email(email):
    conn, db_type = get_db_connection()
    c = conn.cursor()
    query = "SELECT id, name, email FROM users WHERE email=?"
    if db_type == 'postgres':
        query = query.replace('?', '%s')
    c.execute(query, (email.lower(),))
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
            
        c.execute(query, (hashed_pw, email.lower()))
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
            "details": details if details is not None else {},
            "video_path": row.get('video_path')
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
            u.id, u.name, u.email, u.phone, u.college_name, u.role, u.resume_path, u.year, u.register_no, u.branch, u.plan_id, u.interviews_remaining,
            COUNT(i.id) as total_interviews,
            MAX(i.overall_score) as best_score,
            AVG(i.overall_score) as avg_score,
            MAX(i.date) as last_interview_date
        FROM users u
        LEFT JOIN interviews i ON u.id = i.user_id
        WHERE u.role = 'candidate'
        GROUP BY u.id, u.name, u.email, u.phone, u.college_name, u.role, u.resume_path, u.year, u.register_no, u.branch, u.plan_id, u.interviews_remaining
        ORDER BY last_interview_date DESC
    '''
    
    c.execute(query)
    rows = c.fetchall()
    
    results = []
    for r in rows:
        candidate = dict(r)
        
        # Calculate readiness tag based on the best interview
        user_id = candidate['id']
        
        # Get all completed interviews for this user to find the best one
        c.execute("SELECT overall_score, details FROM interviews WHERE user_id = ? AND status = 'completed' ORDER BY overall_score DESC LIMIT 1", (user_id,))
        best_row = c.fetchone()
        
        tag = "No Assessment"
        if best_row:
            score = best_row[0]
            details = best_row[1]
            if isinstance(details, str):
                details = json.loads(details)
            
            # Re-use the technical vs non-technical logic
            tech_cats = {'Technical', 'Technical Core', 'Technical Advanced', 'Technical Hr', 'Coding', 'Resume Skills', 'Resume Projects', 'Scenario Technical', 'Case Study'}
            tech_scores = []
            soft_scores = []
            
            def sf_local(v):
                try:
                    if v is None: return 0.0
                    if isinstance(v, (int, float)): return float(v)
                    import re
                    m = re.search(r'(\d+(\.\d+)?)', str(v))
                    return float(m.group(1)) if m else 0.0
                except: return 0.0

            evals = details.get('evaluations', [])
            for e in evals:
                cat = e.get('type', 'General').replace('_', ' ').title()
                val = sf_local(e.get('score', 0))
                if cat in tech_cats: tech_scores.append(val)
                else: soft_scores.append(val)
            
            t_avg = (sum(tech_scores) / len(tech_scores)) if tech_scores else 0
            s_avg = (sum(soft_scores) / len(soft_scores)) if soft_scores else 0
            
            if score >= 80 or (t_avg >= 7.5 and s_avg >= 7.5): tag = "Placement Ready"
            elif score < 50: tag = "Needs Training"
            elif t_avg >= 7.5: tag = "Good in Technical"
            elif s_avg >= 7.5: tag = "Good in Soft Skills"
            else: tag = "Developing"
            
        candidate['readiness_tag'] = tag
        results.append(candidate)
    
    conn.close()
    return results

def get_admin_stats():
    conn, db_type = get_db_connection()
    c = conn.cursor()
    
    # 1. Total Enrolled (Registered)
    c.execute("SELECT COUNT(*) FROM users WHERE role='candidate'")
    total_enrolled = c.fetchone()[0] or 0
    
    # 2. Total Attempts (All records in interviews table)
    c.execute("SELECT COUNT(*) FROM interviews")
    total_attempts = c.fetchone()[0] or 0
    
    # 3. Started Assessment (Unique users who have at least one record)
    c.execute("SELECT COUNT(DISTINCT user_id) FROM interviews")
    students_started = c.fetchone()[0] or 0
    
    # 4. Successfully Completed (Unique users who have at least one 'completed' record)
    c.execute("SELECT COUNT(DISTINCT user_id) FROM interviews WHERE status='completed'")
    students_completed = c.fetchone()[0] or 0
    
    # 5. Terminated Count
    c.execute("SELECT COUNT(*) FROM interviews WHERE status='terminated'")
    terminated_count = c.fetchone()[0] or 0
    
    import datetime
    today_str = datetime.datetime.now().strftime('%Y-%m-%d')
    if db_type == 'postgres':
        query_today = "SELECT COUNT(*) FROM interviews WHERE CAST(date AS TEXT) LIKE %s"
    else:
        query_today = "SELECT COUNT(*) FROM interviews WHERE date LIKE ?"
    c.execute(query_today, (f"{today_str}%",))
    today_interviews = c.fetchone()[0] or 0

    # 8.6 Top Performer (All Time)
    c.execute("""
        SELECT u.name, u.college_name, i.overall_score, u.photo, u.branch, u.year
        FROM interviews i
        JOIN users u ON i.user_id = u.id
        WHERE i.status = 'completed'
        ORDER BY i.overall_score DESC
        LIMIT 5
    """)
    top_rows = c.fetchall()
    top_performer = None
    top_scorers = []
    for r in top_rows:
        item = {
            "name": r[0],
            "college": r[1],
            "score": r[2],
            "image": r[3],
            "branch": r[4],
            "year": r[5]
        }
        top_scorers.append(item)
    if top_scorers:
        top_performer = top_scorers[0]

    # 9. Daily Volume (Graph Data)
    if db_type == 'postgres':
        c.execute("""
            SELECT date_trunc('day', date)::date as day, COUNT(*) 
            FROM interviews 
            WHERE date >= CURRENT_DATE - INTERVAL '30 days'
            GROUP BY day 
            ORDER BY day ASC
        """)
    else:
        c.execute("""
            SELECT date(date) as day, COUNT(*) 
            FROM interviews 
            WHERE date >= date('now', '-30 days')
            GROUP BY day 
            ORDER BY day ASC
        """)
    daily_rows = c.fetchall()
    daily_volume = [{"date": str(r[0]), "count": r[1]} for r in daily_rows]

    # Avg Scores
    c.execute("SELECT AVG(overall_score) FROM interviews WHERE status='completed'")
    avg_overall = c.fetchone()[0] or 0
    avg_tech = 0
    avg_non_tech = 0
    year_performance = {}

    # 9. Categorized Counts — fetch best score per user, then look up details separately
    if db_type == 'postgres':
        c.execute("""
            SELECT DISTINCT ON (user_id) user_id, overall_score as best_score, details
            FROM interviews
            WHERE status='completed'
            ORDER BY user_id, overall_score DESC
        """)
    else:
        c.execute("SELECT user_id, MAX(overall_score) as best_score, details FROM interviews WHERE status='completed' GROUP BY user_id")
    all_best_interviews = c.fetchall()
    
    cat_counts = {
        "placement_ready": 0,
        "needs_training": 0,
        "good_technical": 0,
        "good_non_technical": 0,
        "developing": 0
    }
    
    tech_cats = {'Technical', 'Technical Core', 'Technical Advanced', 'Technical Hr', 'Coding', 'Resume Skills', 'Resume Projects', 'Scenario Technical', 'Case Study'}

    def sf(v):
        """Safe float conversion for scores."""
        try:
            if v is None: return 0.0
            if isinstance(v, (int, float)): return float(v)
            import re as _re
            m = _re.search(r'(\d+(\.\d+)?)', str(v))
            return float(m.group(1)) if m else 0.0
        except: return 0.0

    for row in all_best_interviews:
        score = row[1]
        details = row[2]
        if isinstance(details, str): details = json.loads(details)
        
        evals = details.get('evaluations', [])
        ts = []; ss = []
        for e in evals:
            cat = e.get('type', 'General').replace('_', ' ').title()
            val = sf(e.get('score', 0))
            if cat in tech_cats: ts.append(val)
            else: ss.append(val)
        
        ta = (sum(ts) / len(ts)) if ts else 0
        sa = (sum(ss) / len(ss)) if ss else 0
        
        if score >= 80 or (ta >= 7.5 and sa >= 7.5): cat_counts["placement_ready"] += 1
        elif score < 50: cat_counts["needs_training"] += 1
        elif ta >= 7.5: cat_counts["good_technical"] += 1
        elif sa >= 7.5: cat_counts["good_non_technical"] += 1
        else: cat_counts["developing"] += 1

    conn.close()
    
    return {
        "total_enrolled": total_enrolled,
        "total_attempts": total_attempts,
        "students_started": students_started,
        "students_completed": students_completed,
        "students_interviewed": students_completed,
        "terminated_count": terminated_count,
        "students_dropped": students_started - students_completed,
        "placement_ready_count": cat_counts["placement_ready"],
        "needs_training_count": cat_counts["needs_training"],
        "good_technical_count": cat_counts["good_technical"],
        "good_non_technical_count": cat_counts["good_non_technical"],
        "year_performance": year_performance,
        "skill_breakdown": {
            "technical": avg_tech,
            "non_technical": avg_non_tech
        },
        "avg_score": round(avg_overall, 1) if avg_overall else 0,
        "performance_categories": cat_counts,
        "today_interviews": today_interviews,
        "top_performer": top_performer,
        "top_scorers": top_scorers,
        "daily_volume": daily_volume
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
            i.id, i.date, i.overall_score, i.video_path,
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

def update_interview_video(interview_id, video_path):
    conn, db_type = get_db_connection()
    c = conn.cursor()
    try:
        query = "UPDATE interviews SET video_path = ? WHERE id = ?"
        if db_type == 'postgres':
            query = query.replace('?', '%s')
        c.execute(query, (video_path, interview_id))
        conn.commit()
        return c.rowcount > 0
    except Exception as e:
        print(f"Error updating interview video: {e}")
        return False
    finally:
        conn.close()

def decrement_user_credits(user_id):
    conn, db_type = get_db_connection()
    c = conn.cursor()
    try:
        query = "UPDATE users SET interviews_remaining = interviews_remaining - 1 WHERE id=? AND interviews_remaining > 0"
        params = (user_id,)
        if db_type == 'postgres':
            query = query.replace('?', '%s')
        c.execute(query, params)
        conn.commit()
        return c.rowcount > 0
    except Exception as e:
        print(f"Credit Decrement Error: {e}")
        return False
    finally:
        conn.close()

def has_interview_credits(user_id):
    """Checks if a user has at least one interview remaining."""
    conn, db_type = get_db_connection()
    c = conn.cursor()
    try:
        query = "SELECT interviews_remaining FROM users WHERE id=?"
        if db_type == 'postgres': query = query.replace('?', '%s')
        c.execute(query, (user_id,))
        row = c.fetchone()
        return row and row[0] > 0
    except: return False
    finally: conn.close()

def consume_interview_credit(user_id):
    """Decrements a user's interview credits by 1."""
    conn, db_type = get_db_connection()
    c = conn.cursor()
    try:
        if db_type == 'postgres': 
            query = "UPDATE users SET interviews_remaining = interviews_remaining - 1 WHERE id=%s AND interviews_remaining > 0"
        else: 
            query = "UPDATE users SET interviews_remaining = interviews_remaining - 1 WHERE id=? AND interviews_remaining > 0"
        c.execute(query, (user_id,))
        success = c.rowcount > 0
        conn.commit()
        return success
    except Exception as e:
        print(f"Error consuming credit: {e}")
        return False
    finally: conn.close()
