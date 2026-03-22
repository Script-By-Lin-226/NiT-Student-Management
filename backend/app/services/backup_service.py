import pandas as pd
import io
from datetime import datetime
from fastapi import Request, UploadFile
from fastapi.responses import StreamingResponse, JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, insert, String, Text, Integer, Float, Boolean, DateTime, Date
from app.models.model import (
    User, AcademicYear, Course, Enrollment, Payment, 
    Room, TimeTable, Grade, Attendance, StaffAttendance, 
    ParentStudent, ActivityLog
)
from app.services.rbac_portal import validating_admin_role
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
        filename = f"backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
        
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

            for sheet_name, model in import_order:
                if sheet_name in df_dict:
                    df = df_dict[sheet_name]
                    records = df.to_dict('records')
                    count = 0
                    
                    for record in records:
                        # Map common misspellings or aliases
                        if model == User:
                            # Handle date_of_birth vs data_of_birth
                            if 'date_of_birth' in record and record['date_of_birth'] is not None:
                                record['data_of_birth'] = record.pop('date_of_birth')
                        
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
                                            # Defend with default if nullable?
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
                            async with session.begin_nested():
                                # Try to find by primary key or unique code
                                pk_name = [c.name for c in model.__table__.primary_key.columns][0]
                                unique_cols = [c.name for c in model.__table__.columns if c.unique]
                                
                                stmt = select(model)
                                if pk_name in record and record[pk_name] is not None:
                                    # Ensure pk_name is int if it's an Integer column
                                    try:
                                        pk_val = int(record[pk_name])
                                        stmt = stmt.where(getattr(model, pk_name) == pk_val)
                                    except:
                                        stmt = stmt.where(getattr(model, pk_name) == record[pk_name])
                                elif unique_cols:
                                    if model == User:
                                        # Use email or user_code if available
                                        if record.get('email'):
                                            stmt = stmt.where(User.email == record['email'])
                                        elif record.get('user_code'):
                                            stmt = stmt.where(User.user_code == record['user_code'])
                                        else:
                                            # Skip if no unique way to find
                                            session.add(model(**record))
                                            count += 1
                                            continue
                                    else:
                                        stmt = stmt.where(getattr(model, unique_cols[0]) == record.get(unique_cols[0]))
                                else:
                                    session.add(model(**record))
                                    count += 1
                                    continue
                                
                                result = await session.execute(stmt)
                                obj = result.scalars().first()
                                
                                if obj:
                                    for k, v in record.items():
                                        if k != pk_name: # Don't update PK
                                            setattr(obj, k, v)
                                    count += 1
                                else:
                                    session.add(model(**record))
                                    count += 1
                        except Exception as e:
                            print(f"Error importing record into {sheet_name}: {e}")
                            # The nested transaction rolls back automatically
                    
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
            return JSONResponse({
                "status_code": 500, 
                "message": f"Import failed: {str(e)}"
            }, status_code=500)
