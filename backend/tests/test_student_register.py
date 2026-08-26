import pytest
from datetime import date
from pydantic import ValidationError
from app.schemas.user import StudentRegister

def test_student_register_schema_validation_success():
    # Complete payload with all required student information
    payload = {
        "username": "John Doe",
        "email": "john.doe@example.com",
        "date_of_birth": "2005-05-15",
        "phone": "+95912345678",
        "nrc": "12/DAGAMA(N)123456",
        "gender": "Male",
        "parent_name": "U Doe",
        "parent_phone": "+95987654321",
        "address": "Yangon, Myanmar",
        "profile_picture": "data:image/png;base64,samplephoto",
        "department": "College",
        "course_code": "CRS0001",
        "how_did_you_hear": "Facebook",
        "student_type": "New Student",
        "signature": "data:image/png;base64,samplesig"
    }
    user = StudentRegister(**payload)
    assert user.username == "John Doe"
    assert user.email == "john.doe@example.com"
    assert user.date_of_birth == date(2005, 5, 15)
    assert user.phone == "+95912345678"
    assert user.nrc == "12/DAGAMA(N)123456"
    assert user.gender == "Male"
    assert user.parent_name == "U Doe"
    assert user.parent_phone == "+95987654321"
    assert user.address == "Yangon, Myanmar"
    assert user.profile_picture == "data:image/png;base64,samplephoto"
    assert user.department == "College"
    assert user.course_code == "CRS0001"
    assert user.how_did_you_hear == "Facebook"
    assert user.student_type == "New Student"
    assert user.signature == "data:image/png;base64,samplesig"

def test_student_register_schema_requires_all_fields():
    # Incomplete payload should raise ValidationError
    incomplete_payload = {
        "username": "Jane Doe",
        "email": "jane.doe@example.com"
    }
    with pytest.raises(ValidationError):
        StudentRegister(**incomplete_payload)
