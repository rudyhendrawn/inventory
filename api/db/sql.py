import MySQLdb
from contextlib import contextmanager
from db.connection import get_db_connection

@contextmanager
def get_cursor(dict_rows: bool = True):
    connection = get_db_connection()
    try:
        cursor = connection.cursor(MySQLdb.cursors.DictCursor if dict_rows else None)
        yield connection, cursor
        connection.commit()
    except Exception as e:
        connection.rollback()
        raise
    finally:
        try:
            cursor.close()
        except Exception:
            pass
        connection.close()

def select(sql: str, params: tuple = ()):
    with get_cursor(dict_rows=True) as (_, cursor):
        cursor.execute(sql, params)
        return cursor.fetchall()
    
def select_one(sql: str, params: tuple = ()):
    rows = select(sql, params)
    return rows[0] if rows else None

def execute(sql: str, params: tuple = ()):
    with get_cursor(dict_rows=True) as (connection, cursor):
        cursor.execute(sql, params)
        return cursor.lastrowid