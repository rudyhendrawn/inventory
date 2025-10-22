import MySQLdb
import MySQLdb.cursors
import threading
import queue
from typing import Optional, Generator, Any
from contextlib import contextmanager
from core.config import settings

class ConnectionPool:
    def __init__(self, min_connection: int = 5, max_connection: int = 20):
        self._min_connection = min_connection
        self._max_connection = max_connection
        self._pool = queue.Queue(maxsize=max_connection)
        self._lock = threading.Lock()
        self._current_connections = 0

        # Pre-create minimum connections
        for _ in range(min_connection):
            self._pool.put(self._create_connection())
            self._current_connections += 1

    def _create_connection(self):
        connection = MySQLdb.connect(
            host=settings.DB_HOST,
            port=settings.DB_PORT,
            user=settings.DB_USER,
            passwd=settings.DB_PASSWORD,
            db=settings.DB_NAME,
            charset='utf8mb4',
            cursorclass=MySQLdb.cursors.DictCursor
        )

        return connection
    
    def get_connection(self):
        """Get a connection from the pool."""
        try:
            # Try to get an existing connection (non-blocking)
            connection = self._pool.get_nowait()

            # Test if connection is still alive
            try:
                connection.ping()
                return connection
            except MySQLdb.OperationalError:
                # Connection is dead, create a new one
                return self._create_connection()
            
        except queue.Empty:
            # No available connection in the pool
            with self._lock:
                if self._current_connections < self._max_connection:
                    # Create a new connection
                    self._current_connections += 1

                    return self._create_connection()
                
                else:
                    # Wait for a connection to be returned
                    return self._pool.get(block=True)
                
    def return_connection(self, connection):
        """Return a connection to the pool."""
        try:
            # Test connection before returning to pool
            connection.ping()
            self._pool.put_nowait(connection)
        except (queue.Full, MySQLdb.OperationalError):
            # Pool is full or connection is bad, just close it
            try:
                connection.close()
            except:
                pass
            with self._lock:
                self._current_connections -= 1

# Global pool instance
_pool: Optional[ConnectionPool] = None

def init_pool() -> ConnectionPool:
    """Intialize the database connection pool."""
    global _pool

    if _pool is None:
        _pool = ConnectionPool(
            min_connection=settings.DB_POOL_MIN,
            max_connection=settings.DB_POOL_MAX
        )
    
    return _pool

def close_pool() -> None:
    """Close the connection pool."""
    global _pool

    if _pool is not None:
        # Close all connections in the pool
        while not _pool._pool.empty():
            conn = _pool._pool.get()
            try:
                conn.close()
            except:
                pass
        _pool = None

def get_conn():
    """Get a connection from the pool."""
    if _pool is None:
        init_pool()
    
    if _pool is None:
        raise RuntimeError("Database connection pool is not initialized")

    return _pool.get_connection()

@contextmanager
def get_db_cursor(dictionary: bool = True):
    """Context manager for cursor with auto-commit/rollback."""
    connection = get_conn()
    if dictionary:
        cursor = connection.cursor(MySQLdb.cursors.DictCursor)
    else:
        cursor = connection.cursor()

    try:
        yield cursor
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        cursor.close()
        if _pool is not None:
            _pool.return_connection(connection)

@contextmanager
def get_db_transaction() -> Generator[MySQLdb.Connection, None, None]:
    """
    Context manager for database transaction.
    Provides direct connection access for multiple operations.
    """
    connection = get_conn()
    try:
        # Disable autocommit for transaction
        connection.autocommit(False)
        yield connection
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.autocommit(True) # Reset autocommit
        if _pool is not None:
            _pool.return_connection(connection) # Return to pool

@contextmanager
def get_transaction_cursor(dictionary: bool = True) -> Generator[MySQLdb.cursors.BaseCursor, None, None]:
    """
    Context manager for a cursor within a transaction.
    """
    with get_db_transaction() as connection:
        if dictionary:
            cursor  = connection.cursor(MySQLdb.cursors.DictCursor)
        else:
            cursor = connection.cursor()

        try:
            yield cursor
        finally:
            cursor.close()

def fetch_all(sql: str, params: tuple = ()) -> list[dict]:
    """Fetch all rows for a query."""
    with get_db_cursor(dictionary=True) as cursor:
        cursor.execute(sql, params)
        results = cursor.fetchall()
        
        return results
    
def fetch_one(sql: str, params: tuple = ()) -> Optional[dict]:
    """Fetch a single row for a query."""
    with get_db_cursor(dictionary=True) as cursor:
        cursor.execute(sql, params)
        result = cursor.fetchone()
        
        return result
    
def execute(sql: str, params: tuple = ()) -> int:
    """Execute an INSERT/UPDATE/DELETE query."""
    with get_db_cursor(dictionary=False) as cursor:
        cursor.execute(sql, params)
        
        return cursor.rowcount
    
def execute_many(sql: str, params_list: list[tuple]) -> int:
    """Execute multiple INSERT/UPDATE/DELETE queries."""
    with get_db_cursor(dictionary=False) as cursor:
        cursor.executemany(sql, params_list)
        
        return cursor.rowcount
    
def execute_transaction(operations: list[tuple[str, tuple]]) -> list[Any]:
    """
    Execute multiple SQL operations in a single transaction.
    Each operation is a tuple of (sql, params).
    Returns a list of results for each operation.
    """
    results = []

    with get_db_transaction() as connection:
        cursor = connection.cursor()
        try:
            for sql, params in operations:
                cursor.execute(sql, params)
                if sql.strip().upper().startswith("INSERT"):
                    results.append(cursor.lastrowid)
                else:
                    results.append(cursor.rowcount)
        except Exception:
            connection.rollback()
            raise
        finally:
            cursor.close()

    return results