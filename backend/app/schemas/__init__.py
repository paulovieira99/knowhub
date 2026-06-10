from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr


# --- Auth ---
class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    username: str
    email: str
    created_at: datetime

    model_config = {"from_attributes": True}


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# --- Tags ---
class TagOut(BaseModel):
    id: int
    name: str

    model_config = {"from_attributes": True}


# --- Attachments ---
class AttachmentOut(BaseModel):
    id: int
    filename: str
    stored_name: str
    mime_type: Optional[str]
    size_bytes: Optional[int]
    created_at: datetime

    model_config = {"from_attributes": True}


# --- Entries ---
class EntryCreate(BaseModel):
    title: str
    content: str = ""
    entry_type: str = "note"  # note | code | tip | file | image
    language: Optional[str] = None
    is_pinned: bool = False
    tags: List[str] = []


class EntryUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    entry_type: Optional[str] = None
    language: Optional[str] = None
    is_pinned: Optional[bool] = None
    tags: Optional[List[str]] = None


class EntryOut(BaseModel):
    id: int
    title: str
    content: str
    entry_type: str
    language: Optional[str]
    is_pinned: bool
    created_at: datetime
    updated_at: datetime
    tags: List[TagOut] = []
    attachments: List[AttachmentOut] = []

    model_config = {"from_attributes": True}


class EntryListItem(BaseModel):
    id: int
    title: str
    content: str
    entry_type: str
    language: Optional[str]
    is_pinned: bool
    created_at: datetime
    updated_at: datetime
    tags: List[TagOut] = []

    model_config = {"from_attributes": True}


class PaginatedEntries(BaseModel):
    items: List[EntryListItem]
    total: int
    page: int
    page_size: int
