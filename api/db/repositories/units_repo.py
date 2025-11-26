from typing import Optional, List, Dict, Any
from db.pool import fetch_all, fetch_one, execute
from schemas.units import UnitCreate, UnitUpdate


class UnitsRepository:

    @staticmethod
    def get_all(
        limit: int = 100,
        offset: int = 0,
        search: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        try:
            where_conditions = []
            params = []

            if search:
                where_conditions.append("(name LIKE %s or symbol LIKE %s)")
                search_param = f"%{search}%"
                params.extend([search_param, search_param])
            
            where_clause = "WHERE " + " AND ".join(where_conditions) if where_conditions else ""
           
            query = f"""
                SELECT id, name, symbol, multiplier
                FROM units
                {where_clause}
                ORDER BY name
                LIMIT %s OFFSET %s
            """
            params.extend([limit, offset])
            rows = fetch_all(query, tuple(params))

            return rows
        except Exception as e:
            raise RuntimeError(f"Error fetching all units: {e}")

    @staticmethod
    def count(search: Optional[str] = None) -> int:
        try:
            where_conditions = []
            params = []

            if search:
                where_conditions.append("(name LIKE %s or symbol LIKE %s)")
                search_param = f"%{search}%"
                params.extend([search_param, search_param])
            
            where_clause = "WHERE " + " AND ".join(where_conditions) if where_conditions else ""
           
            query = f"""
                SELECT COUNT(*) AS count
                FROM units
                {where_clause}
            """
            row = fetch_one(query, tuple(params))

            return row['count'] if row else 0
        except Exception as e:
            raise RuntimeError(f"Error counting units: {e}")

    @staticmethod
    def get_by_id(unit_id: int) -> Optional[Dict[str, Any]]:
        try:
            if not isinstance(unit_id, int) or unit_id <= 0:
                raise ValueError("unit_id must be a positive integer"
                                 )
            query = "SELECT * FROM units WHERE id = %s"
            row = fetch_one(query, (unit_id,))
            
            return row
        except Exception as e:
            raise RuntimeError(f"Error fetching unit by id {unit_id}: {e}")
        
    @staticmethod
    def get_by_name(name: str) -> Optional[Dict[str, Any]]:
        try:
            if not name or name.strip() == "":
                raise ValueError("name must be a non-empty string")
            
            query = "SELECT * FROM units WHERE name = %s"
            row = fetch_one(query, (name,))

            return row
        except Exception as e:
            raise RuntimeError(f"Error fetching unit by name '{name}': {e}")
        
    @staticmethod
    def get_by_symbol(symbol: str) -> Optional[Dict[str, Any]]:
        try:
            if not symbol or symbol.strip() == "":
                raise ValueError("symbol must be a non-empty string")
            
            query = "SELECT * FROM units WHERE symbol = %s"
            row = fetch_one(query, (symbol,))

            return row
        except Exception as e:
            raise RuntimeError(f"Error fetching unit by symbol '{symbol}': {e}")
        
    @staticmethod
    def create(unit_data: UnitCreate) -> Dict[str, Any]:
        try:
            query = """
                INSERT INTO units (name, symbol, description)
                VALUES (%s, %s, %s)
            """
            execute(query, (unit_data.name, unit_data.symbol, unit_data.multiplier))

            create_unit = UnitsRepository.get_by_name(unit_data.name)
            if not create_unit:
                raise RuntimeError("Failed to retrieve the newly created unit.")
            
            return create_unit
        except Exception as e:
            raise RuntimeError(f"Error creating unit: {e}")
        
    @staticmethod
    def update(unit_id: int, unit_data: UnitUpdate) -> Optional[Dict[str, Any]]:
        try:
            if not isinstance(unit_id, int) or unit_id <= 0:
                raise ValueError("unit_id must be a positive integer")
            
            # Dynamic update query
            set_clause = []
            params = []

            if unit_data.name is not None:
                set_clause.append("name = %s")
                params.append(unit_data.name)

            if unit_data.symbol is not None:
                set_clause.append("symbol = %s")
                params.append(unit_data.symbol)

            if unit_data.multiplier is not None:
                set_clause.append("description = %s")
                params.append(unit_data.multiplier)

            if not set_clause:
                # Nothing to update
                unit = UnitsRepository.get_by_id(unit_id)
                return unit

            params.append(unit_id)
            query = f"""
                UPDATE units
                SET {', '.join(set_clause)}
                WHERE id = %s
            """

            rows_affected = execute(query, tuple(params))

            if rows_affected > 0:
                return UnitsRepository.get_by_id(unit_id)
            
            return None
        except Exception as e:
            raise RuntimeError(f"Error updating unit with id {unit_id}: {e}")

    @staticmethod
    def delete(unit_id: int) -> bool:
        try:
            if not isinstance(unit_id, int) or unit_id <= 0:
                raise ValueError("unit_id must be a positive integer")
            
            check_query = "SELECT id FROM units WHERE id = %s"
            result = fetch_one(check_query, (unit_id,))

            if result and result['count'] > 0:
                raise RuntimeError(f"Cannot delete unit with id {unit_id} as it is referenced by other records.")
            
            query = "DELETE FROM units WHERE id = %s"
            rows_affected = execute(query, (unit_id,))

            return rows_affected > 0
        except Exception as e:
            raise RuntimeError(f"Error deleting unit {unit_id}: {str(e)}")
        
    @staticmethod
    def exists_by_name(name: str, exclude_id: Optional[int] = None) -> bool:
        try:
            if not name or name.strip() == "":
                raise ValueError("name must be a non-empty string")
            
            if exclude_id:
                result = fetch_one("SELECT COUNT(*) AS count FROM units WHERE name = %s AND id != %s", (name.strip(), exclude_id))
            else:
                result = fetch_one("SELECT COUNT(*) AS count FROM units WHERE name = %s", (name.strip(),))

            if result and result['count'] > 0:
                return True
            
            return False
        except Exception as e:
            raise RuntimeError(f"Error checking existence of unit name '{name}': {e}")
        
    @staticmethod
    def exists_by_symbol(symbol: str, exclude_id: Optional[int] = None) -> bool:
        try:
            if not symbol or symbol.strip() == "":
                raise ValueError("symbol must be a non-empty string")
            
            if exclude_id:
                result = fetch_one("SELECT COUNT(*) AS count FROM units WHERE symbol = %s AND id != %s", (symbol.strip(), exclude_id))
            else:
                result = fetch_one("SELECT COUNT(*) AS count FROM units WHERE symbol = %s", (symbol.strip(),))

            if result and result['count'] > 0:
                return True
            
            return False
        except Exception as e:
            raise RuntimeError(f"Error checking existence of unit symbol '{symbol}': {e}")

    @staticmethod
    def exists_by_id(unit_id: int) -> bool:
        try:
            query = """
                SELECT COUNT(1) as count
                FROM units
                WHERE id = %s
                """
            
            result = fetch_one(query, (unit_id,))
            if result is not None:
                return result['count'] > 0
            else:
                return False
        except Exception as e:
            raise RuntimeError(f"Error checking if unit exists by ID: {str(e)}")