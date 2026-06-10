import os
import uuid
import aiofiles
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.config import settings
from app.core.database import get_db
from app.core.security import get_current_user, get_current_user_flexible
from app.models.user import User
from app.models.entry import Entry, Attachment
from app.schemas import AttachmentOut

router = APIRouter(prefix="/api/attachments", tags=["attachments"])


@router.post("/{entry_id}", response_model=AttachmentOut, status_code=201)
async def upload_attachment(
    entry_id: int,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Entry).where(Entry.id == entry_id, Entry.user_id == current_user.id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Entry not found")

    content = await file.read()
    if len(content) > settings.MAX_UPLOAD_SIZE:
        raise HTTPException(status_code=413, detail="File too large (max 50MB)")

    ext = os.path.splitext(file.filename or "")[1]
    stored_name = f"{uuid.uuid4().hex}{ext}"
    dest = os.path.join(settings.UPLOAD_DIR, stored_name)
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

    async with aiofiles.open(dest, "wb") as f:
        await f.write(content)

    attachment = Attachment(
        entry_id=entry_id,
        user_id=current_user.id,
        filename=file.filename or stored_name,
        stored_name=stored_name,
        mime_type=file.content_type,
        size_bytes=len(content),
    )
    db.add(attachment)
    await db.flush()
    await db.refresh(attachment)
    return AttachmentOut.model_validate(attachment)


@router.get("/file/{stored_name}")
async def serve_attachment(
    stored_name: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_flexible),
):
    result = await db.execute(
        select(Attachment).where(
            Attachment.stored_name == stored_name,
            Attachment.user_id == current_user.id,
        )
    )
    attachment = result.scalar_one_or_none()
    if not attachment:
        raise HTTPException(status_code=404, detail="File not found")

    path = os.path.join(settings.UPLOAD_DIR, stored_name)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="File not found on disk")

    return FileResponse(path, filename=attachment.filename, media_type=attachment.mime_type)


@router.delete("/{attachment_id}", status_code=204)
async def delete_attachment(
    attachment_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Attachment).where(
            Attachment.id == attachment_id,
            Attachment.user_id == current_user.id,
        )
    )
    attachment = result.scalar_one_or_none()
    if not attachment:
        raise HTTPException(status_code=404, detail="Attachment not found")

    path = os.path.join(settings.UPLOAD_DIR, attachment.stored_name)
    if os.path.exists(path):
        os.remove(path)

    await db.delete(attachment)
