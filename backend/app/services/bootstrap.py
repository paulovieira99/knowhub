import logging

from sqlalchemy import func, select

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.core.security import hash_password
from app.models.user import User

logger = logging.getLogger(__name__)


async def bootstrap_admin_user() -> None:
    """Cria o primeiro usuário admin se configurado e o banco estiver vazio."""
    username = settings.BOOTSTRAP_ADMIN_USERNAME
    email = settings.BOOTSTRAP_ADMIN_EMAIL
    password = settings.BOOTSTRAP_ADMIN_PASSWORD

    if not all([username, email, password]):
        return

    async with AsyncSessionLocal() as db:
        count = (await db.execute(select(func.count(User.id)))).scalar_one()
        if count > 0:
            return

        existing = await db.execute(
            select(User).where((User.username == username) | (User.email == email))
        )
        if existing.scalar_one_or_none():
            return

        db.add(User(
            username=username,
            email=email,
            hashed_pw=hash_password(password),
        ))
        await db.commit()
        logger.info("Bootstrap admin user created: %s", username)
