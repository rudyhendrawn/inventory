from typing import Optional, List, Dict, Any
from db.pool import fetch_all, fetch_one, execute
from schemas.users import UserCreate, UserUpdate
from datetime import datetime, timezone

class UserRepository:
    
    @staticmethod
    def get_all(active_only: bool = True, limit: int = 50, offset: int = 0, search: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Get all users with optional filtering
        """
        where_conditions = []
        params = []

        if active_only:
            where_conditions.append("active = %s")
            params.append(True)

        if search:
            where_conditions.append("(name LIKE %s OR email LIKE %s)")
            search_param = f"%{search}%"
            params.extend([search_param, search_param])

        where_clause = "WHERE " + " AND ".join(where_conditions) if where_conditions else ""

        query = f"""
            SELECT id, m365_oid, name, email, role, active, created_at
            FROM users
            {where_clause}
            ORDER BY name
            LIMIT %s OFFSET %s
            """

        params.extend([limit, offset])

        return fetch_all(query, tuple(params))
    
    @staticmethod
    def count(active_only: bool = True, search: Optional[str] = None) -> int:
        """
        Count users with optional filtering
        """
        where_conditions = []
        params = []

        if active_only:
            where_conditions.append("active = %s")
            params.append(True)

        if search:
            where_conditions.append("(name LIKE %s OR email LIKE %s)")
            search_params = f"%{search}%"
            params.extend([search_params, search_params])

        where_clause = "WHERE " + " AND ".join(where_conditions) if where_conditions else ""

        query = f"SELECT COUNT(*) as count FROM users {where_clause}"
        result = fetch_one(query, tuple(params))

        if result:
            return result['count']
        else:
            return 0

    @staticmethod
    def get_by_id(user_id: int) -> Optional[Dict[str, Any]]:
        """
        Get a user by internal ID
        """
        query = """
            SELECT id, m365_oid, name, email, role, active, created_at
            FROM users
            WHERE id = %s
            """
        result = fetch_one(query, (user_id,))

        return result

    @staticmethod
    def get_by_oid(m365_oid: str) -> Optional[Dict[str, Any]]:
        """
        Get auser by Microsoft 365 Object ID
        """
        query = """
            SELECT id, m365_oid, name, email, role, active, created_at
            FROM users
            WHERE m365_oid = %s
            """
        result = fetch_one(query, (m365_oid,))

        return result

    @staticmethod
    def get_by_email(email: str) -> Optional[Dict[str, Any]]:
        """
        Get a user by email
        """
        query = """
            SELECT id, m365_oid, name, email, role, active, created_at
            FROM users
            WHERE email = %s
            """
        result = fetch_one(query, (email,))

        return result

    @staticmethod
    def create(user_data: UserCreate) -> Optional[Dict[str, Any]]:
        """
        Create a new user
        """
        query = """
            INSERT INTO users (m365_oid, name, email, role, active, created_at)
            VALUES (%s, %s, %s, %s, %s, %s)
            """
        result = execute(
            query,
            (
                user_data.m365_oid,
                user_data.name,
                user_data.email,
                user_data.role.value,
                user_data.active,
                datetime.now(timezone.utc)
            )
        )

        # If execute returns the last inserted ID
        if result:
            return UserRepository.get_by_id(result)
        
        # Alternative: get by unique identifier if ID not returned
        return UserRepository.get_by_oid(user_data.m365_oid)

    @staticmethod
    def update(user_id: int, user_data: UserUpdate) -> Optional[Dict[str, Any]]:
        """
        Update an existing user
        """
        set_clauses = []
        params = []

        if user_data.name is not None:
            set_clauses.append("name = %s")
            params.append(user_data.name)

        if user_data.email is not None:
            set_clauses.append("email = %s")
            params.append(user_data.email)

        if user_data.role is not None:
            set_clauses.append("role = %s")
            params.append(user_data.role.value)
        
        if user_data.active is not None:
            set_clauses.append("active = %s")
            params.append(user_data.active)
        
        if not set_clauses:
            # Nothing to update
            result = UserRepository.get_by_id(user_id)
            return result
        
        params.append(user_id)
        query = f"UPDATE users SET {', '.join(set_clauses)} WHERE id = %s"
        rows_affected = execute(query, tuple(params))

        if rows_affected > 0:
            result = UserRepository.get_by_id(user_id)
            return result
        
        return None

    @staticmethod
    def delete(user_id: int) -> bool:
        """
        Soft delete user (set active = False)
        """
        query = "UPDATE users SET active = %s WHERE id = %s"
        rows_affected = execute(query, (False, user_id))

        if rows_affected > 0:
            return True

        return False

    @staticmethod
    def exists_by_email(email: str, exclude_id: Optional[int] = None) -> bool:
        """
        Check if a user exists by email
        """
        if exclude_id:
            result = fetch_one(
                "SELECT COUNT(*) as count FROM users WHERE email = %s AND id != %s",
                (email, exclude_id)
            )
        else:
            result = fetch_one(
                "SELECT COUNT(*) as count FROM users WHERE email = %s",
                (email,)
            )
        
        if result and result['count'] > 0:
            return True
        
        return False

    @staticmethod
    def exists_by_oid(m365_oid: str, exclude_id: Optional[int] = None) -> bool:
        """
        Check if user with Microsoft 365 Object ID exists
        """
        if exclude_id:
            result = fetch_one(
                "SELECT COUNT(*) as count FROM users WHERE m365_oid = %s AND id != %s",
                (m365_oid, exclude_id)
            )
        else:
            result = fetch_one(
                "SELECT COUNT(*) as count FROM users WHERE m365_oid = %s",
                (m365_oid,)
            )
        
        if result and result['count'] > 0:
            return True

        return False
    
    @staticmethod
    def de_activate_user(user_id: int, active: int) -> bool:
        """
        Deactivate or activate user (set active = 1)
        """
        query = "UPDATE users SET active = %s WHERE id = %s"
        rows_affected = execute(query, (active, user_id))

        if rows_affected > 0:
            return True
        
        return False