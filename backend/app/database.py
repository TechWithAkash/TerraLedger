import logging
import os
import re

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import declarative_base

from app.config import settings

logger = logging.getLogger(__name__)

raw_url = os.getenv("DATABASE_URL", settings.DATABASE_URL)

# Handle Render & Heroku postgres:// and postgresql:// URL schemes
if raw_url.startswith("postgres://"):
    db_url = re.sub(r"^postgres://", "postgresql+asyncpg://", raw_url)
elif raw_url.startswith("postgresql://"):
    db_url = re.sub(r"^postgresql://", "postgresql+asyncpg://", raw_url)
else:
    db_url = raw_url

# asyncpg handles ssl differently (e.g. ?sslmode=require -> ?ssl=require)
if "asyncpg" in db_url and "sslmode=require" in db_url:
    db_url = db_url.replace("sslmode=require", "ssl=require")

connect_args = {}
if "sqlite" in db_url:
    connect_args["check_same_thread"] = False

engine = create_async_engine(
    db_url,
    echo=False,
    connect_args=connect_args,
    pool_pre_ping=True,
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

Base = declarative_base()


async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
