# Password hashing utilities
from passlib.context import CryptContext

password_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def hash_password(password: str) -> str:
    return password_context.hash(password[:72])
    
async def verify_password(plain_password: str, hashed_password: str) -> bool:
    return password_context.verify(plain_password, hashed_password)
    