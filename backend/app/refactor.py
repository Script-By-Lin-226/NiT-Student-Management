import sys
import re

file_path = r'c:\Users\Script-Kid\Desktop\NiT-Student-Management\backend\app\services\admin_panel.py'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace all validating_admin_role(request) with allow_sales=True
content = content.replace('if not await validating_admin_role(request):', 'if not await validating_admin_role(request, allow_sales=True):')

# Revert specific restricted functions
content = content.replace(
    'async def seed_sample_data(request: Request, session: AsyncSession):\n        \"\"\"Create a small set of sample records for quickly testing admin CRUD.\"\"\"\n        if not await validating_admin_role(request, allow_sales=True):',
    'async def seed_sample_data(request: Request, session: AsyncSession):\n        \"\"\"Create a small set of sample records for quickly testing admin CRUD.\"\"\"\n        if not await validating_admin_role(request):'
)

content = content.replace(
    'async def purge_all_data_except_admin(request: Request, session: AsyncSession):\n        if not await validating_admin_role(request, allow_sales=True):',
    'async def purge_all_data_except_admin(request: Request, session: AsyncSession):\n        if not await validating_admin_role(request):'
)

# Add ActivityLog import
if 'ActivityLog' not in content:
    content = content.replace('User, AcademicYear, Attendance, Course, Enrollment, Grade, ParentStudent, StaffAttendance, Room, TimeTable, Payment', 'User, AcademicYear, Attendance, Course, Enrollment, Grade, ParentStudent, StaffAttendance, Room, TimeTable, Payment, ActivityLog')

# Add _log_activity helper
helper = '''
async def _log_activity(request: Request, session: AsyncSession, action: str, details: str):
    from app.services.rbac_portal import _get_user
    try:
        user_info = _get_user(request)
        if user_info and user_info.get(\"user_id\"):
            al = ActivityLog(
                user_id=user_info.get(\"user_id\"),
                action=action,
                details=details
            )
            session.add(al)
    except Exception as e:
        print(\"_log_activity error:\", e)

class AdminPanelService:'''

if '_log_activity' not in content:
    content = content.replace('class AdminPanelService:', helper)

# Add log_activity to create_student
original_create_student = '        await session.flush()\n        \n        # Auto-enroll if course is given'
new_create_student = '        await session.flush()\n        await _log_activity(request, session, "Create Student", f"Student {user_code} created")\n        \n        # Auto-enroll if course is given'
if new_create_student not in content:
    content = content.replace(original_create_student, new_create_student)

# Add log_activity to create_payment
original_create_payment = '        session.add(payment)\n        await session.commit()'
new_create_payment = '        session.add(payment)\n        await _log_activity(request, session, "Create Payment", f"Payment of {payload.amount} for {enrollment.enrollment_code}")\n        await session.commit()'
if new_create_payment not in content:
    content = content.replace(original_create_payment, new_create_payment)

# Add get_activity_logs endpoint function logic
logs_endpoint = '''
    async def get_activity_logs(request: Request, session: AsyncSession):
        if not await validating_admin_role(request):
            return {"message": "You are not authorized to perform this action"}
            
        from sqlalchemy.orm import joinedload
        query = select(ActivityLog).options(joinedload(ActivityLog.user)).order_by(ActivityLog.timestamp.desc())
        result = await session.execute(query)
        logs = result.scalars().all()
        
        data = []
        for log in logs:
            data.append({
                "log_id": log.log_id,
                "user_id": log.user_id,
                "username": log.user.username if log.user else "Unknown",
                "role": log.user.role if log.user else "Unknown",
                "action": log.action,
                "details": log.details,
                "timestamp": log.timestamp.isoformat() if log.timestamp else None
            })
            
        return JSONResponse({"status_code": 200, "message": "Activity logs fetched", "data": data})

'''

if 'def get_activity_logs' not in content:
    content = content.replace('class AdminPanelService:', 'class AdminPanelService:\n' + logs_endpoint)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Done!')
