from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class PaymentCreate(BaseModel):
    enrollment_id: int
    amount: float
    month: str
    payment_method: Optional[str] = None
    status: Optional[str] = "Paid"
    fine_amount: Optional[float] = None
    extra_items_fee: Optional[float] = None
    extra_items: Optional[str] = None
    exam_fee_paid_gbp: Optional[float] = None
    exam_fee_paid_mmk: Optional[float] = None
    exam_fee_currency: Optional[str] = "MMK"

class PaymentUpdate(BaseModel):
    amount: Optional[float] = None
    month: Optional[str] = None
    status: Optional[str] = None
    payment_method: Optional[str] = None
    fine_amount: Optional[float] = None
    extra_items_fee: Optional[float] = None
    extra_items: Optional[str] = None
    exam_fee_paid_gbp: Optional[float] = None
    exam_fee_paid_mmk: Optional[float] = None
    exam_fee_currency: Optional[str] = "MMK"
