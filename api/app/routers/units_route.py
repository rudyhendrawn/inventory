from typing import Optional
from fastapi import APIRouter, Depends, Query, Path, HTTPException, status
from app.dependencies import get_current_user, require_role
from domain.services.unit_service import UnitService
from schemas.units import UnitCreate, UnitUpdate, UnitResponse, UnitListResponse

router = APIRouter(prefix="/units", tags=["units"])

@router.get("/", response_model=UnitListResponse)
def list_units(
    page: int = Query(1, ge=1, description="Page number for pagination"),
    page_size: int = Query(10, ge=1, le=100, description="Number of units per page"),
    search: Optional[str] = Query(None, description="Search term to filter units by name or symbol"),
) -> UnitListResponse:
    try:
        response = UnitService.get_all_units(
            page=page,
            page_size=page_size,
            search=search
        )

        return response
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=str(e)
        )
    

@router.get("/{unit_id}", response_model=UnitResponse)
def get_unit(
    unit_id: int = Path(..., description="The ID of the unit to retrieve"),
) -> UnitResponse:
    """
    Retrieve a single unit by its ID.
    """
    try:
        response = UnitService.get_unit_by_id(unit_id)

        return response
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=str(e)
        )

@router.post("/", response_model=UnitResponse, dependencies=[Depends(require_role("admin"))])
def create_unit(
    unit_data: UnitCreate,
) -> UnitResponse:
    """
    Create a new unit.
    """
    try:
        response = UnitService.create_unit(unit_data)
        return response
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.put("/{unit_id}", response_model=UnitResponse, dependencies=[Depends(require_role("admin"))])
def update_unit(
    unit_data: UnitUpdate,
    unit_id: int = Path(..., description="The ID of the unit to update"),
) -> UnitResponse:
    """
    Update an existing unit.
    """
    try:
        response = UnitService.update_unit(unit_id, unit_data)
        return response
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.delete("/{unit_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_role("admin"))])
def delete_unit(
    unit_id: int = Path(..., description="The ID of the unit to delete"),
) -> None:
    """
    Delete an existing unit.
    """
    try:
        UnitService.delete_unit(unit_id)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
    
    return None

