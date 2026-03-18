from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class PaymentCreate(BaseModel):
    enrollment_id: int
    amount: float
    month: str
    payment_method: Optional[str] = None
    status: Optional[str] = "Paid"

class PaymentUpdate(BaseModel):
    amount: Optional[float] = None
    month: Optional[str] = None
    status: Optional[str] = None
    payment_method: Optional[str] = None
