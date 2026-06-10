from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text, or_, and_, delete
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.entry import Entry, Tag, entry_tags
from app.schemas import EntryCreate, EntryUpdate, EntryOut, EntryListItem, PaginatedEntries

router = APIRouter(prefix="/api/entries", tags=["entries"])


async def resolve_tags(tag_names: List[str], db: AsyncSession) -> List[Tag]:
    tags = []
    for name in set(tag_names):
        name = name.strip().lower()
        if not name:
            continue
        result = await db.execute(select(Tag).where(Tag.name == name))
        tag = result.scalar_one_or_none()
        if not tag:
            tag = Tag(name=name)
            db.add(tag)
            await db.flush()
        tags.append(tag)
    return tags


@router.get("", response_model=PaginatedEntries)
async def list_entries(
    q: Optional[str] = Query(None, description="Full-text search"),
    entry_type: Optional[str] = Query(None),
    tag: Optional[str] = Query(None),
    pinned: Optional[bool] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    base = (
        select(Entry)
        .options(selectinload(Entry.tags))
        .where(Entry.user_id == current_user.id)
    )
    count_q = select(func.count(Entry.id)).where(Entry.user_id == current_user.id)

    filters = []

    if q and q.strip():
        term = q.strip()
        ts_query = func.plainto_tsquery("portuguese", term)
        pattern = f"%{term}%"
        search_filter = or_(
            Entry.search_vec.op("@@")(ts_query),
            Entry.title.ilike(pattern),
            Entry.content.ilike(pattern),
        )
        filters.append(search_filter)

    if entry_type:
        filters.append(Entry.entry_type == entry_type)

    if pinned is not None:
        filters.append(Entry.is_pinned == pinned)

    if tag:
        base = base.join(entry_tags).join(Tag).where(Tag.name == tag.lower())
        count_q = count_q.join(entry_tags).join(Tag).where(Tag.name == tag.lower())

    if filters:
        base = base.where(and_(*filters))
        count_q = count_q.where(and_(*filters))

    # Order: pinned first, then by relevance or updated
    if q and q.strip():
        term = q.strip()
        ts_query = func.plainto_tsquery("portuguese", term)
        base = base.order_by(
            Entry.is_pinned.desc(),
            func.ts_rank(Entry.search_vec, ts_query).desc(),
            Entry.updated_at.desc(),
        )
    else:
        base = base.order_by(Entry.is_pinned.desc(), Entry.updated_at.desc())

    total = (await db.execute(count_q)).scalar_one()
    items = (await db.execute(base.offset((page - 1) * page_size).limit(page_size))).scalars().all()

    return PaginatedEntries(
        items=[EntryListItem.model_validate(e) for e in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("", response_model=EntryOut, status_code=201)
async def create_entry(
    payload: EntryCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    tags = await resolve_tags(payload.tags, db)
    entry = Entry(
        user_id=current_user.id,
        title=payload.title,
        content=payload.content,
        entry_type=payload.entry_type,
        language=payload.language,
        is_pinned=payload.is_pinned,
        tags=tags,
    )
    db.add(entry)
    await db.flush()
    await db.refresh(entry, ["tags", "attachments"])
    return EntryOut.model_validate(entry)


@router.get("/{entry_id}", response_model=EntryOut)
async def get_entry(
    entry_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Entry)
        .options(selectinload(Entry.tags), selectinload(Entry.attachments))
        .where(Entry.id == entry_id, Entry.user_id == current_user.id)
    )
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    return EntryOut.model_validate(entry)


@router.put("/{entry_id}", response_model=EntryOut)
async def update_entry(
    entry_id: int,
    payload: EntryUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Entry)
        .options(selectinload(Entry.tags), selectinload(Entry.attachments))
        .where(Entry.id == entry_id, Entry.user_id == current_user.id)
    )
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")

    if payload.title is not None:
        entry.title = payload.title
    if payload.content is not None:
        entry.content = payload.content
    if payload.entry_type is not None:
        entry.entry_type = payload.entry_type
    if payload.language is not None:
        entry.language = payload.language
    if payload.is_pinned is not None:
        entry.is_pinned = payload.is_pinned
    if payload.tags is not None:
        entry.tags = await resolve_tags(payload.tags, db)

    await db.flush()
    await db.refresh(entry, ["tags", "attachments"])
    return EntryOut.model_validate(entry)


@router.delete("/{entry_id}", status_code=204)
async def delete_entry(
    entry_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Entry).where(Entry.id == entry_id, Entry.user_id == current_user.id)
    )
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    await db.delete(entry)


@router.get("/tags/all", response_model=List[str])
async def list_tags(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Tag.name)
        .join(entry_tags)
        .join(Entry)
        .where(Entry.user_id == current_user.id)
        .distinct()
        .order_by(Tag.name)
    )
    return [row[0] for row in result.all()]
