from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import Optional
from db.pool import fetch_all, fetch_one, execute
from app.dependencies import get_current_user, require_role

router = APIRouter(prefix="/items", tags=["items"])

@router.get("/")
def list_items(
    q: Optional[str] = Query(None, description="Search by sku/name"),
    limit: int = 50,
    offset: int = 0,
    user=Depends(get_current_user)
):
    if q:
        like = f"%{q}%"
        sql = """
            SELECT i.id, i.sku, i.name, i.category_id, i.unit_id, i.owner_user_id,i.barcode, i.min_stock, i.image_url, i.active
            FROM items i
            WHERE (i.sku LIKE %s OR i.name LIKE %s) AND i.active = 1
            ORDER BY i.name LIMIT %s OFFSET %s"""
        return fetch_all(sql, (like, like, limit, offset))
    else:
        sql = """SELECT id, sku, name, category_id, unit_id, owner_user_id,barcode, min_stock, image_url, active
            FROM items
            WHERE active = 1
            ORDER BY name LIMIT %s OFFSET %s"""
        return fetch_all(sql, (limit, offset))

@router.get("/{item_id}")
def get_item(item_id: int, user=Depends(get_current_user)):
    row = fetch_one(
        """SELECT id, sku, name, category_id, unit_id, owner_user_id, barcode, min_stock, image_url, active
           FROM items WHERE id = %s""", (item_id,),
    )

    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")

    return row

@router.post("", dependencies=[Depends(require_role("ADMIN"))])
def create_item(payload: dict):
    required = ("sku", "name", "category_id", "unit_id")
    
    for k in required:
        if k not in payload:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=f"Missing required field: {k}")
        
    execute(
        "INSERT INTO items (sku, name, category_id, unit_id, owner_user_id, barcode, min_stock, image_url, active) \
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)",
        (
            payload.get("sku"),
            payload.get("name"),
            payload.get("category_id"),
            payload.get("unit_id"),
            payload.get("owner_user_id"),
            payload.get("barcode"),
            payload.get("min_stock"),
            payload.get("image_url"),
            payload.get("active"),
        )
    )

    item = fetch_one("SELECT id, sku, name, category_id, unit_id, owner_user_id, barcode, min_stock, image_url, active \
                     FROM items WHERE sku = %s", (payload.get("sku"),))

    return item

@router.put("/{item_id}", dependencies=[Depends(require_role("ADMIN"))])
def update_item(item_id: int, payload: dict):
    fields, params = [], []
    for k in ("sku", "name", "category_id", "unit_id", "owner_user_id", "barcode", "min_stock", "image_url", "active"):
        if k in payload:
            fields.append(f"{k} = %s")
            params.append(payload[k])
    
    if not fields:
        message = {"update": False}
        return message
    
    params.append(item_id)
    sql = f"UPDATE items SET {', '.join(fields)} WHERE id = %s"
    execute(sql, tuple(params))
    item = fetch_one("SELECT id, sku, name, category_id, unit_id, owner_user_id, barcode, min_stock, image_url, active \
                     FROM items WHERE id = %s", (item_id,))
    
    return item

@router.delete("/{item_id}", dependencies=[Depends(require_role("ADMIN"))])
def soft_delete_item(item_id: int):
    execute("UPDATE items SET active = 0 WHERE id = %s", (item_id,))
    message = {"deleted": True}
    
    return message