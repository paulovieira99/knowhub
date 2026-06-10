#!/usr/bin/env python3
"""
Gerencia usuários do KnowHub via linha de comando.

Exemplos (Docker):
  docker compose exec backend python scripts/manage_users.py create \\
    --username joao --email joao@empresa.com --password 'SenhaForte123'

  docker compose exec backend python scripts/manage_users.py list
  docker compose exec backend python scripts/manage_users.py deactivate --username joao
  docker compose exec backend python scripts/manage_users.py activate --username joao
"""
from __future__ import annotations

import argparse
import asyncio
import sys
from pathlib import Path

# Permite executar como: python scripts/manage_users.py
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.core.security import hash_password
from app.models.entry import Entry  # noqa: F401 — registra modelos SQLAlchemy
from app.models.user import User


async def create_user(username: str, email: str, password: str) -> None:
    if len(password) < 6:
        print("Erro: senha deve ter pelo menos 6 caracteres.", file=sys.stderr)
        sys.exit(1)

    async with AsyncSessionLocal() as db:
        existing = await db.execute(
            select(User).where((User.username == username) | (User.email == email))
        )
        if existing.scalar_one_or_none():
            print("Erro: usuário ou e-mail já existe.", file=sys.stderr)
            sys.exit(1)

        user = User(username=username, email=email, hashed_pw=hash_password(password))
        db.add(user)
        await db.commit()
        print(f"Usuário criado: {username} ({email})")


async def list_users() -> None:
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).order_by(User.id))
        users = result.scalars().all()
        if not users:
            print("Nenhum usuário cadastrado.")
            return
        print(f"{'ID':<5} {'Usuário':<20} {'E-mail':<30} {'Ativo':<6} {'Criado em'}")
        print("-" * 80)
        for u in users:
            created = u.created_at.strftime("%Y-%m-%d %H:%M") if u.created_at else "-"
            print(f"{u.id:<5} {u.username:<20} {u.email:<30} {'sim' if u.is_active else 'não':<6} {created}")


async def set_active(username: str, active: bool) -> None:
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.username == username))
        user = result.scalar_one_or_none()
        if not user:
            print(f"Erro: usuário '{username}' não encontrado.", file=sys.stderr)
            sys.exit(1)
        user.is_active = active
        await db.commit()
        state = "ativado" if active else "desativado"
        print(f"Usuário {username} {state}.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Gerencia usuários do KnowHub")
    sub = parser.add_subparsers(dest="command", required=True)

    create = sub.add_parser("create", help="Criar usuário")
    create.add_argument("--username", required=True)
    create.add_argument("--email", required=True)
    create.add_argument("--password", required=True)

    sub.add_parser("list", help="Listar usuários")

    deactivate = sub.add_parser("deactivate", help="Desativar usuário")
    deactivate.add_argument("--username", required=True)

    activate = sub.add_parser("activate", help="Reativar usuário")
    activate.add_argument("--username", required=True)

    args = parser.parse_args()

    if args.command == "create":
        asyncio.run(create_user(args.username, args.email, args.password))
    elif args.command == "list":
        asyncio.run(list_users())
    elif args.command == "deactivate":
        asyncio.run(set_active(args.username, False))
    elif args.command == "activate":
        asyncio.run(set_active(args.username, True))


if __name__ == "__main__":
    main()
