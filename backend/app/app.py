from fastapi import FastAPI
from contextlib import asynccontextmanager
from app.controller.v1.authentication_route import router as auth_router
from app.controller.v1.admin_route import router as admin_router
from app.controller.v1.portal_route import router as portal_router
from app.controller.v1.staff_route import router as staff_router
from app.middleware.authentication_middleware import AuthMiddleware
from starlette.middleware.cors import CORSMiddleware
from app.core.database_initialization import init_db

@asynccontextmanager
async def life_cycle(app: FastAPI):
    print("Starting the application...")
    await init_db()
    yield
    print("Stopping the application...")

app = FastAPI(lifespan=life_cycle)

app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(portal_router)
app.include_router(staff_router)

app.add_middleware(AuthMiddleware)

app.add_middleware(
    CORSMiddleware,
    # Allow local dev frontends on any port (3000/3001/etc.)
    allow_origin_regex=r"^http://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Hello World"}
