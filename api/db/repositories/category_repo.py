from typing import Optional, List, Dict, Any
from db.pool import fetch_all, fetch_one, execute
from schemas.categories import CategoryCreate, CategoryUpdate

class CategoryRepository:
    @staticmethod
    def get_all(
        limit: int = 50,
        offset: int = 0,
        search: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        try:
            where_conditions = []
            params = []

            if search:
                where_conditions.append("name LIKE %s")
                params.append(f"%{search}%")
        
            where_clause = "WHERE " + " AND ".join(where_conditions) if where_conditions else ""
            query = f"""
                SELECT id, name
                FROM categories
                {where_clause}
                ORDER BY name
                LIMIT %s OFFSET %s
                """
            
            params.extend([limit, offset])

            category_list = fetch_all(query, tuple(params))
            return category_list
        except Exception as e:
            raise RuntimeError(f"Error fetching all categories: {str(e)}")
        
    @staticmethod
    def get_by_id(category_id: int) -> Optional[Dict[str, Any]]:
        try:
            if not isinstance(category_id, int) or category_id <= 0:
                raise ValueError("Invalid category ID")
            
            query = """
                SELECT id, name
                FROM categories
                WHERE id = %s
                """
            
            cat_id = fetch_one(query, (category_id,))
            return cat_id
        except Exception as e:
            raise RuntimeError(f"Error fetching category by ID: {str(e)}")
        
    @staticmethod
    def exists_by_name(name: str) -> bool:
        try:
            query = """
                SELECT COUNT(1) as count
                FROM categories
                WHERE name = %s
                """
            
            result = fetch_one(query, (name,))
            if result is not None:
                return result['count'] > 0
            else:
                return False
        except Exception as e:
            raise RuntimeError(f"Error checking if category exists by name: {str(e)}")

    @staticmethod
    def exists_by_id(category_id: int) -> bool:
        try:
            query = """
                SELECT COUNT(1) as count
                FROM categories
                WHERE id = %s
                """
            
            result = fetch_one(query, (category_id,))
            if result is not None:
                return result['count'] > 0
            else:
                return False
        except Exception as e:
            raise RuntimeError(f"Error checking if category exists by ID: {str(e)}")

    @staticmethod
    def create(category: CategoryCreate) -> int:
        try:
            query = """
                INSERT INTO categories (name)
                VALUES (%s)
                RETURNING id
                """
            
            new_id = fetch_one(query, (category.name,))

            if new_id is None:
                raise RuntimeError("Failed to create category")

            return new_id['id']
        except Exception as e:
            raise RuntimeError(f"Error creating category: {str(e)}")
        
    @staticmethod
    def update(category_id: int, category: CategoryUpdate) -> None:
        try:
            if not isinstance(category_id, int) or category_id <= 0:
                raise ValueError("Invalid category ID")
            
            query = """
                UPDATE categories
                SET name = %s
                WHERE id = %s
                """
            execute(query, (category.name, category_id))
        except Exception as e:
            raise RuntimeError(f"Error updating category: {str(e)}")
        
    @staticmethod
    def delete(category_id: int) -> bool:
        try:
            if not isinstance(category_id, int) or category_id <= 0:
                raise ValueError("Invalid category ID")
            
            query = "DELETE FROM categories WHERE id = %s"
            rows_affected = execute(query, (category_id,))

            return rows_affected > 0
        except Exception as e:
            raise RuntimeError(f"Error deleting category: {str(e)}")