from typing import Optional
from core.logging import get_logger
from domain.services.category_service import CategoryService
from app.dependencies import require_role
from schemas.users import UserRole
from fastapi import APIRouter, Depends, Query, Path, HTTPException, status
from schemas.categories import Category, CategoryCreate, CategoryUpdate

logger = get_logger(__name__)
router = APIRouter(prefix="/categories", tags=["Categories"])

@router.get("/", response_model=list[Category])
def list_categories(
    page: int = Query(1, ge=1, description="Page number for pagination"),
    page_size: int = Query(50, ge=1, le=100, description="Number of categories per page"),
    search: Optional[str] = Query(None, description="Search term for category name"),
    current_user: UserRole = Depends(require_role([UserRole.ADMIN, UserRole.STAFF]))
) -> list[Category]:
    categories_data = CategoryService.get_all_categories(
        page=page,
        page_size=page_size,
        search=search
    )
    return categories_data

@router.get("/{category_id}", response_model=Category)
def get_category(
    category_id: int = Path(..., gt=0, description="The ID of the category to retrieve"),
    current_user: UserRole = Depends(require_role([UserRole.ADMIN, UserRole.STAFF]))
) -> Category:
    category_data = CategoryService.get_category_by_id(category_id)
    return category_data

@router.post("/", response_model=Category, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_role([UserRole.ADMIN, UserRole.STAFF]))])
def create_category(
    category_data: CategoryCreate,
    current_user: UserRole = Depends(require_role([UserRole.ADMIN, UserRole.STAFF]))
) -> Category:
    try:
        logger.info(f"Category creation requested by {current_user}: {category_data.name}")
        response = CategoryService.create_category(category_data)
        return response
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating category: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Internal server error: {str(e)}")

@router.put("/{category_id}", response_model=Category, dependencies=[Depends(require_role([UserRole.ADMIN, UserRole.STAFF]))])
def update_category(
    category_data: CategoryUpdate,
    category_id: int = Path(..., gt=0, description="The ID of the category to update"),
    current_user: UserRole = Depends(require_role([UserRole.ADMIN, UserRole.STAFF]))
) -> Category:
    try:
        logger.info(f"Category update requested by {current_user}: {category_id}")
        response = CategoryService.update_category(category_id, category_data)
        return response
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating category: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Internal server error: {str(e)}")