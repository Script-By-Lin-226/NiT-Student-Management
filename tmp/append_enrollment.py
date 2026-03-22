import os

Path = r'c:\Users\Script-Kid\Desktop\NiT-Student-Management\backend\app\services\admin_panel.py'
Code = '''
    async def update_enrollment(request: Request, session: AsyncSession, enrollment_id: int, payload: AdminEnrollmentUpdate):
        if not await validating_admin_role(request, allow_sales=True):
            return JSONResponse({"status_code": 403, "message": "You are not authorized to perform this action"}, status_code=403)

        enroll_r = await session.execute(select(Enrollment).where(Enrollment.enrollment_id == enrollment_id))
        enroll = enroll_r.scalars().first()
        if not enroll:
            return JSONResponse({"status_code": 404, "message": "Enrollment not found"}, status_code=404)

        if payload.batch_no is not None:
            enroll.batch_no = payload.batch_no
        if payload.payment_plan is not None:
            enroll.payment_plan = payload.payment_plan
        if payload.downpayment is not None:
            enroll.downpayment = payload.downpayment
        if payload.installment_amount is not None:
            enroll.installment_amount = payload.installment_amount
        if payload.status is not None:
            enroll.status = payload.status

        await session.commit()
        await session.refresh(enroll)
        await _log_activity(request, session, "Update Enrollment", f"Enrollment {enrollment_id} updated with new plan/batch details")
        return JSONResponse({"status_code": 200, "message": "Enrollment updated successfully"})
'''

with open(Path, 'a') as f:
    f.write(Code)
