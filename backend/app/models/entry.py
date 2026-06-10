from sqlalchemy import (
    Integer, String, Text, Boolean, DateTime, ForeignKey, Table, Column, func
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base

entry_tags = Table(
    "entry_tags",
    Base.metadata,
    Column("entry_id", Integer, ForeignKey("entries.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", Integer, ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True),
)


class Tag(Base):
    __tablename__ = "tags"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)

    entries = relationship("Entry", secondary=entry_tags, back_populates="tags")


class Entry(Base):
    __tablename__ = "entries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    title: Mapped[str] = mapped_column(Text, nullable=False)
    content: Mapped[str] = mapped_column(Text, default="")
    entry_type: Mapped[str] = mapped_column(String(32), default="note")
    language: Mapped[str | None] = mapped_column(String(32), nullable=True)
    is_pinned: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="entries")
    tags = relationship("Tag", secondary=entry_tags, back_populates="entries")
    attachments = relationship("Attachment", back_populates="entry", cascade="all, delete-orphan")


class Attachment(Base):
    __tablename__ = "attachments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    entry_id: Mapped[int] = mapped_column(Integer, ForeignKey("entries.id", ondelete="CASCADE"))
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    filename: Mapped[str] = mapped_column(Text, nullable=False)
    stored_name: Mapped[str] = mapped_column(Text, nullable=False)
    mime_type: Mapped[str | None] = mapped_column(Text, nullable=True)
    size_bytes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    entry = relationship("Entry", back_populates="attachments")
    user = relationship("User", back_populates="attachments")
