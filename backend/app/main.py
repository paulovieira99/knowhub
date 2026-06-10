from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routers import auth, entries, attachments
from app.services.bootstrap import bootstrap_admin_user


@asynccontextmanager
async def lifespan(app: FastAPI):
    await bootstrap_admin_user()
    yield


app = FastAPI(title="KnowHub API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(entries.router)
app.include_router(attachments.router)


@app.get("/api/health")
async def health():
    return {"status": "ok"}
