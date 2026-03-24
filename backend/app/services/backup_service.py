import pandas as pd
import io
from datetime import datetime
from fastapi import Request, UploadFile
from fastapi.responses import StreamingResponse, JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, insert, String, Text, Integer, Float, Boolean, DateTime, Date, and_
from app.models.model import (
    User, AcademicYear, Course, Enrollment, Payment, 
    Room, TimeTable, Grade, Attendance, StaffAttendance, 
    ParentStudent, ActivityLog
)
from app.services.rbac_portal import validating_admin_role
from app.core.timezone_utils import get_now_local
import json

class BackupService:
    @staticmethod
    async def export_to_excel(request: Request, session: AsyncSession):
        if not await validating_admin_role(request):
            return JSONResponse({"status_code": 403, "message": "Unauthorized"}, status_code=403)

        # Tables to export
        models = [
            (User, "Users"),
            (AcademicYear, "AcademicYears"),
            (Course, "Courses"),
            (Room, "Rooms"),
            (Enrollment, "Enrollments"),
            (Payment, "Payments"),
            (TimeTable, "Timetables"),
            (Grade, "Grades"),
            (Attendance, "Attendances"),
            (StaffAttendance, "StaffAttendances"),
            (ParentStudent, "ParentStudentLinks"),
            (ActivityLog, "ActivityLogs")
        ]

        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            for model, sheet_name in models:
                result = await session.execute(select(model))
                items = result.scalars().all()
                
                # Convert to list of dicts
                data = []
                for item in items:
                    d = {c.name: getattr(item, c.name) for c in model.__table__.columns}
                    # Convert datetimes and dates to strings
                    from datetime import date as py_date
                    for k, v in d.items():
                        if isinstance(v, datetime):
                            d[k] = v.strftime("%Y-%m-%d %H:%M:%S")
                        elif isinstance(v, py_date):
                            d[k] = v.strftime("%Y-%m-%d")
                        elif isinstance(v, (pd.Timestamp, pd.Timedelta)):
                            d[k] = str(v)
                    data.append(d)
                
                df = pd.DataFrame(data)
                df.to_excel(writer, sheet_name=sheet_name, index=False)

        output.seek(0)
        filename = f"backup_{get_now_local().strftime('%Y%m%d_%H%M%S')}.xlsx"
        
        return StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )

    @staticmethod
    async def import_from_excel(file: UploadFile, request: Request, session: AsyncSession):
        if not await validating_admin_role(request):
            return JSONResponse({"status_code": 403, "message": "Unauthorized"}, status_code=403)

        from app.security.password_hashing import hash_password
        try:
            contents = await file.read()
            df_dict = pd.read_excel(io.BytesIO(contents), sheet_name=None)
            
            # Order is important for foreign key constraints
            import_order = [
                ("Rooms", Room),
                ("AcademicYears", AcademicYear),
                ("Users", User),
                ("Courses", Course),
                ("Enrollments", Enrollment),
                ("Payments", Payment),
                ("Timetables", TimeTable),
                ("Grades", Grade),
                ("Attendances", Attendance),
                ("StaffAttendances", StaffAttendance),
                ("ParentStudentLinks", ParentStudent),
                ("ActivityLogs", ActivityLog)
            ]

            stats = {}
            from datetime import date as py_date

            # Helper to normalize column names
            def normalize_key(k):
                if not isinstance(k, str): return str(k)
                # Remove spaces, dashes, dots and convert to lowercase
                return k.lower().replace(" ", "_").replace("-", "_").replace(".", "_").strip()

            for sheet_name, model in import_order:
                if sheet_name in df_dict:
                    df = df_dict[sheet_name]
                    records_raw = df.to_dict('records')
                    count = 0
                    
                    for record_raw in records_raw:
                        # Normalize all keys in record
                        record = {normalize_key(k): v for k, v in record_raw.items()}

                        # Map common misspellings or aliases
                        if model == User:
                            # Handle date_of_birth vs data_of_birth
                            if 'date_of_birth' in record:
                                record['data_of_birth'] = record.pop('date_of_birth')
                            
                            # Handle NRC/nrc
                            if 'NRC' in record:
                                record['nrc'] = record.pop('NRC')

                        if model == ParentStudent:
                            # Ensure relationship_label exists
                            if 'relationship' in record and 'relationship_label' not in record:
                                record['relationship_label'] = record.pop('relationship')
                        
                        # Clean NaN/Null values explicitly and handle Timestamps
                        clean_record = {}
                        model_columns = {c.name for c in model.__table__.columns}
                        
                        for k, v in record.items():
                            if k not in model_columns:
                                continue
                                
                            if pd.isna(v):
                                clean_record[k] = None
                            elif hasattr(v, 'to_pydatetime'):
                                clean_record[k] = v.to_pydatetime()
                            else:
                                clean_record[k] = v
                        
                        if model == User:
                            # Required fields fallbacks
                            if not record.get('data_of_birth') or pd.isna(record.get('data_of_birth')):
                                # Use a neutral default if missing to prevent DB failure
                                record['data_of_birth'] = datetime(2000, 1, 1)
                            if (not record.get('username') or pd.isna(record.get('username'))) and record.get('email'):
                                email_str = str(record.get('email'))
                                if '@' in email_str:
                                    record['username'] = email_str.split('@')[0]
                                else:
                                    record['username'] = email_str
                        
                        record = clean_record

                        # Special case: Password hashing for Users
                        if model == User and record.get('password_hash'):
                            # If it doesn't look like a bcrypt hash (starts with $2b$ or $2a$), hash it
                            ph = str(record['password_hash'])
                            if not (ph.startswith("$2b$") or ph.startswith("$2a$")):
                                record['password_hash'] = await hash_password(ph)

                        # Convert objects
                        for col in model.__table__.columns:
                            val = record.get(col.name)
                            if val is not None:
                                # Ensure correct data types
                                try:
                                    if isinstance(col.type, (String, Text)):
                                        if pd.isna(val) or val is None:
                                            record[col.name] = None
                                        elif isinstance(val, (float, int)):
                                            # Clean numbers for text fields (phone, ids)
                                            if isinstance(val, float) and val.is_integer():
                                                record[col.name] = str(int(val)).strip()
                                            else:
                                                record[col.name] = str(val).strip()
                                        else:
                                            record[col.name] = str(val).strip()
                                    
                                    elif isinstance(col.type, Integer):
                                        if pd.isna(val) or val is None:
                                            record[col.name] = None
                                        else:
                                            record[col.name] = int(float(val))
                                            
                                    elif isinstance(col.type, Float):
                                        if pd.isna(val) or val is None:
                                            record[col.name] = None
                                        else:
                                            record[col.name] = float(val)
                                            
                                    elif isinstance(col.type, Boolean):
                                        if pd.isna(val) or val is None:
                                            record[col.name] = getattr(col, 'default', None)
                                        else:
                                            # Convert common values to bool
                                            v_upper = str(val).upper()
                                            if v_upper in ('1', '1.0', 'TRUE', 'YES', 'Y'):
                                                record[col.name] = True
                                            elif v_upper in ('0', '0.0', 'FALSE', 'NO', 'N'):
                                                record[col.name] = False
                                            else:
                                                record[col.name] = bool(val)
                                                
                                    elif isinstance(col.type, (DateTime, Date)):
                                        if pd.isna(val) or val is None:
                                            record[col.name] = None
                                        elif isinstance(val, str):
                                            try:
                                                if len(val) > 10:
                                                    dt = datetime.strptime(val, "%Y-%m-%d %H:%M:%S")
                                                else:
                                                    dt = datetime.strptime(val, "%Y-%m-%d")
                                                
                                                record[col.name] = dt if isinstance(col.type, DateTime) else dt.date()
                                            except:
                                                record[col.name] = None # Fallback
                                        elif hasattr(val, 'date'): # Already a datetime-like (pd.Timestamp)
                                            record[col.name] = val if isinstance(col.type, DateTime) else val.date()
                                except:
                                    pass

                        try:
                            # Use nested transaction to protect individual record failures
                            async with session.begin_nested():
                                pk_name = [c.name for c in model.__table__.primary_key.columns][0]
                                unique_cols = [c.name for c in model.__table__.columns if c.unique]
                                
                                obj = None
                                
                                # 1. Try finding by email/user_code for Users (Strongest Natural Keys)
                                if model == User:
                                    if record.get('email'):
                                        r = await session.execute(select(User).where(User.email == record['email']))
                                        obj = r.scalars().first()
                                    elif record.get('user_code'):
                                        r = await session.execute(select(User).where(User.user_code == record['user_code']))
                                        obj = r.scalars().first()
                                
                                # 2. Try finding by composite unique constraints (e.g. ParentStudent)
                                if not obj and model == ParentStudent:
                                    if record.get('parent_id') and record.get('student_id'):
                                        r = await session.execute(select(ParentStudent).where(
                                            and_(ParentStudent.parent_id == record['parent_id'], 
                                                 ParentStudent.student_id == record['student_id'])
                                        ))
                                        obj = r.scalars().first()

                                # 3. Try finding by single unique columns
                                if not obj and unique_cols:
                                    for uc in unique_cols:
                                        if record.get(uc):
                                            r = await session.execute(select(model).where(getattr(model, uc) == record[uc]))
                                            obj = r.scalars().first()
                                            if obj: break

                                # 4. Try finding by Primary Key
                                if not obj and pk_name in record and record[pk_name] is not None:
                                    try:
                                        pk_val = int(record[pk_name])
                                        r = await session.execute(select(model).where(getattr(model, pk_name) == pk_val))
                                        obj = r.scalars().first()
                                    except:
                                        pass

                                if obj:
                                    # Update existing
                                    for k, v in record.items():
                                        if k != pk_name: # Don't update PK
                                            setattr(obj, k, v)
                                    count += 1
                                else:
                                    # Create new
                                    session.add(model(**record))
                                    count += 1
                        except Exception as e:
                            print(f"Error importing record into {sheet_name}: {str(e)}")
                    
                    # Commit each table
                    await session.commit()
                    stats[sheet_name] = count
            
            await session.commit()
            return JSONResponse({
                "status_code": 200, 
                "message": "Data imported successfully", 
                "data": stats
            })

        except Exception as e:
            import traceback
            traceback.print_exc()
            return JSONResponse({
                "status_code": 500, 
                "message": f"Import failed: {str(e)}"
            }, status_code=500)
