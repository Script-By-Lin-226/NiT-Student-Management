from pydantic import BaseModel
from typing import Optional


class RoomBase(BaseModel):
    room_id: int
    room_name: str
    capacity: int
    is_active: bool = True


class AdminRoomCreate(BaseModel):
    room_name: str
    capacity: int
    is_active: bool = True


class AdminRoomUpdate(BaseModel):
    room_name: Optional[str] = None
    capacity: Optional[int] = None
    is_active: Optional[bool] = None