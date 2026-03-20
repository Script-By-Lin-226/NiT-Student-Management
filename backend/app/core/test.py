from passlib.context import CryptContext

pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")
hashed = pwd.hash("NiT@2026")

print(hashed)