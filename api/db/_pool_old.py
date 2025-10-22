# import MySQLdb
# import MySQLdb.cursors
# # from DBUtils import PooledDB
# from typing import Optional, Generator, Any
# from contextlib import contextmanager
# from core.config import settings

# _pool: PooledDB = None

# def init_pool() -> PooledDB:
#     """Initialize the database connection pool (synchronous)."""
#     global _pool

#     if _pool is None:
#         _pool = PooledDB(
#             creator=MySQLdb,
#             maxconnections=settings.DB_POOL_MAX,
#             mincached=settings.DB_POOL_MIN,
#             blocking=True,
#             host=settings.DB_HOST,
#             port=settings.DB_PORT,
#             user=settings.DB_USER,
#             passwd=settings.DB_PASSWORD,
#             db=settings.DB_NAME,
#             charset='utf8mb4',
#         )

#     return _pool
    
# def close_pool() -> None:
#     """Close the connection pool."""
#     global _pool

#     if _pool is not None:
#         _pool = None

# def get_conn():
#     """Get a connection from the pool."""
#     if _pool is None:
#         init_pool()
    
#     if _pool is None:
#         raise RuntimeError("Database connection pool is not initialized")

#     return _pool.get_connection()

# @contextmanager
# def get_db_cursor(dictionary: bool = True):
#     """Context manager for cursor with auto-commit/rollback."""
#     conn = get_conn()
#     if dictionary:
#         cursor = conn.cursor(MySQLdb.cursors.DictCursor)
#     else:
#         cursor = conn.cursor()

#     try:
#         yield cursor
#         conn.commit()
#     except Exception:
#         conn.rollback()
#         raise
#     finally:
#         cursor.close()
#         conn.close()

# @contextmanager
# def get_db_transaction() -> Generator[MySQLdb.Connection, None, None]:
#     """
#     Context manager for database transaction.
#     Provides direct connection access for multiple operations.
#     """
#     connection = get_conn()
#     try:
#         # Disable autocommit for transaction
#         connection.autocommit(False)
#         yield connection
#         connection.commit()
#     except Exception:
#         connection.rollback()
#         raise
#     finally:
#         connection.close()

# @contextmanager
# def get_transaction_cursor(dictionary: bool = True) -> Generator[MySQLdb.cursors.BaseCursor, None, None]:
#     """
#     Context manager for transactional operations with cursor.
#     Use this when we need multiple SQL operations in one transaction.
#     """
#     with get_db_transaction() as connection:
#         if dictionary:
#             cursor = connection.cursor(MySQLdb.cursors.DictCursor)
#         else:
#             cursor = connection.cursor()

#         try:
#             yield cursor
#         finally:
#             cursor.close()


# # Helpers for raw queries
# def fetch_all(sql: str, params: tuple = ()) -> list[dict]:
#     """Execute SELECT and return all rows. """
#     with get_db_cursor() as cursor:
#         cursor.execute(sql, params)
#         return cursor.fetchall()
    
# def fetch_one(sql: str, params: tuple = ()) -> Optional[dict]:
#     """Execute SELECT and return one row or None."""
#     with get_db_cursor(dictionary=True) as cursor:
#         cursor.execute(sql, params)
#         return cursor.fetchone()

# def execute(sql: str, params: tuple = ()):
#     """Execute INSER/UPDATE/DELETE and return affected row count."""
#     with get_db_cursor(dictionary=True) as cursor:
#         cursor.execute(sql, params)
#         return cursor.rowcount

# def execute_many(sql: str, seq_of_params: list[tuple]) -> int:
#     """Execute batch operations."""
#     with get_db_cursor(dictionary=True) as cursor:
#         cursor.executemany(sql, seq_of_params)
#         return cursor.rowcount
    
# def execute_transaction(operations: list[tuple[str, tuple]]) -> list[Any]:
#     """
#     Execute multiple SQL operations in a single transaction.

#     Args:
#         operations: List of (sql, params) tuples.

#     Returns:
#         List of results (rowcount for DML, lastrowid for INSERT).
#     """
#     results = []

#     with get_transaction_cursor() as cursor:
#         for sql, params in operations:
#             cursor.execute(sql, params)
#             if sql.strip().upper().startswith("INSERT"):
#                 results.append(cursor.lastrowid)
#             else:
#                 results.append(cursor.rowcount)

#     return results