from typing import Optional, List, Dict, Any
from db.pool import fetch_all, fetch_one, execute
from schemas.items import ItemCreate, ItemUpdate

class ItemRepository:
    @staticmethod
    def get_all(
        active_only: bool = True,
        limit: int = 50,
        offset: int = 0,
        search: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Get all items with optional filters.
        """
        try:
            where_conditions = []
            params = []

            if active_only:
                where_conditions.append("active = %s")
                params.append(True)

            if search:
                where_conditions.append("(sku LIKE %s OR name LIKE %s)")
                search_param = f"%{search}%"
                params.extend([search_param, search_param])

            where_clause = "WHERE " + " AND ".join(where_conditions) if where_conditions else ""

            query = f"""
                SELECT id, sku, name, category_id, unit_id, owner_user_id, qrcode, min_stock, image_url, active
                FROM items
                {where_clause}
                ORDER BY name
                LIMIT %s OFFSET %s
                """
            params.extend([limit, offset])

            return fetch_all(query, tuple(params))
        except Exception as e:
            raise RuntimeError(str(e))
        
    @staticmethod
    def get_by_id(item_id: int) -> Optional[Dict[str, Any]]:
        """
        Get an item by its ID.
        """
        try:
            if not isinstance(item_id, int) or item_id <= 0:
                raise ValueError("Invalid item ID")
            
            query = """
                SELECT id, sku, name, category_id, unit_id, owner_user_id, qrcode, min_stock, image_url, active
                FROM items
                WHERE id = %s
                """
            return fetch_one(query, (item_id,))
        except Exception as e:
            raise RuntimeError(str(e))
        
    @staticmethod
    def get_by_sku(sku: str) -> Optional[Dict[str, Any]]:
        """
        Get an item by its SKU.
        """
        try:
            if not sku or not sku.strip():
                raise ValueError("SKU must not be empty")
            
            query = """
                SELECT id, sku, name, category_id, unit_id, owner_user_id, qrcode, min_stock, image_url, active
                FROM items
                WHERE sku = %s
                """
            return fetch_one(query, (sku.strip().upper(),))
        except Exception as e:
            raise RuntimeError(str(e))
        
    @staticmethod
    def create(item_data: ItemCreate) -> Optional[Dict[str, Any]]:
        """
        Create a new item.
        """
        try:
            query = """
                INSERT INTO items (sku, name, category_id, unit_id, owner_user_id, qrcode, min_stock, image_url, active)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                """
            execute(query, (
                item_data.sku.strip().upper(),
                item_data.name,
                item_data.category_id,
                item_data.unit_id,
                item_data.owner_user_id,
                item_data.qrcode,
                item_data.min_stock,
                item_data.image_url,
                item_data.active,
            ))
            
            return ItemRepository.get_by_sku(item_data.sku)
        except Exception as e:
            raise RuntimeError(str(e))
        
    @staticmethod
    def update(item_id: int, item_data: ItemUpdate) -> Optional[Dict[str, Any]]:
        """
        Update an existing item.
        """
        try:
            if not isinstance(item_id, int) or item_id <= 0:
                raise ValueError("Invalid item ID")
            
            set_clauses = []
            params = []

            if item_data.sku is not None:
                set_clauses.append("sku = %s")
                params.append(item_data.sku.strip().upper())
            if item_data.name is not None:
                set_clauses.append("name = %s")
                params.append(item_data.name)
            if item_data.category_id is not None:
                set_clauses.append("category_id = %s")
                params.append(item_data.category_id)
            if item_data.unit_id is not None:
                set_clauses.append("unit_id = %s")
                params.append(item_data.unit_id)
            if item_data.owner_user_id is not None:
                set_clauses.append("owner_user_id = %s")
                params.append(item_data.owner_user_id)
            if item_data.qrcode is not None:
                set_clauses.append("qrcode = %s")
                params.append(item_data.qrcode)
            if item_data.min_stock is not None:
                set_clauses.append("min_stock = %s")
                params.append(item_data.min_stock)
            if item_data.image_url is not None:
                set_clauses.append("image_url = %s")
                params.append(item_data.image_url)
            if item_data.active is not None:
                set_clauses.append("active = %s")
                params.append(item_data.active)

            if not set_clauses:
                raise ValueError("No fields to update")
            
            set_clause = ", ".join(set_clauses)
            params.append(item_id)

            query = f"""
                UPDATE items
                SET {set_clause}
                WHERE id = %s
                """
            rows_affected = execute(query, tuple(params))

            if rows_affected > 0:
                return ItemRepository.get_by_id(item_id)
            else:
                return None
        except Exception as e:
            raise RuntimeError(str(e))
        
    @staticmethod
    def delete(item_id: int) -> bool:
        """
        Soft delete an item by setting its active status to False.
        """
        try:
            if not isinstance(item_id, int) or item_id <= 0:
                raise ValueError("Invalid item ID")
            
            query = "UPDATE items SET active = %s WHERE id = %s"
            rows_affected = execute(query, (False, item_id))

            if rows_affected > 0:
                return True
            else:
                return False
        except Exception as e:
            raise RuntimeError(str(e))

    @staticmethod
    def exists_by_id(item_id: int) -> bool:
        """
        Check if an item exists by its ID.
        """
        try:
            if not isinstance(item_id, int) or item_id <= 0:
                raise ValueError("Invalid item ID")
            
            result = fetch_one("SELECT COUNT(*) as count FROM items WHERE id = %s", (item_id,))
            if result and result.get("count", 0) > 0:
                return True
            else:
                return False
        except Exception as e:
            raise RuntimeError(str(e))

    @staticmethod
    def exists_by_sku(sku: str, exclude_id: Optional[int] = None) -> bool:
        """
        Check if an item exists by its SKU.
        """
        try:
            if not sku or not sku.strip():
                raise ValueError("SKU must not be empty")
            
            if exclude_id:
                result = fetch_one("SELECT COUNT(*) as count FROM items WHERE sku = %s AND id != %s", 
                                   (sku.strip().upper(), exclude_id))
            else:
                result = fetch_one("SELECT COUNT(*) as count FROM items WHERE sku = %s", 
                                   (sku.strip().upper(),))
                
            if result and result.get("count", 0) > 0:
                return True
            else:
                return False
        except Exception as e:
            raise RuntimeError(str(e))
        
    @staticmethod
    def count(active_only: bool = True, search: Optional[str] = None) -> int:
        """
        Count total items with optional filters.
        """
        try:
            where_conditions = []
            params = []

            if active_only:
                where_conditions.append("active = %s")
                params.append(True)

            if search:
                where_conditions.append("(sku LIKE %s OR name LIKE %s)")
                search_param = f"%{search}%"
                params.extend([search_param, search_param])

            where_clause = "WHERE " + " AND ".join(where_conditions) if where_conditions else ""

            query = f"SELECT COUNT(*) as count FROM items {where_clause}"
            result = fetch_one(query, tuple(params))

            return result.get("count", 0) if result else 0
        except Exception as e:
            raise RuntimeError(str(e))