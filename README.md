# ⬡ KnowHub

Base de conhecimento pessoal — alternativa ao Obsidian com busca full-text, editor Markdown e suporte a imagens inline.

## Stack

| Camada    | Tecnologia                           |
|-----------|--------------------------------------|
| Backend   | Python 3.12 + FastAPI + asyncpg      |
| Banco     | PostgreSQL 16 com pg_trgm + tsvector |
| Frontend  | React 18 + Vite + CodeMirror 6       |
| Auth      | JWT (python-jose) + bcrypt           |
| Proxy     | Nginx                                |
| Deploy    | Docker Compose                       |

## Funcionalidades

- **Autenticação** — registro e login com JWT
- **Notas Markdown** — código, tabelas, imagens inline e sintaxe Obsidian `![[imagem.png]]`
- **Editor** — CodeMirror 6 com preview Markdown
- **Busca full-text** — PostgreSQL `tsvector` + trigram fallback
- **Tags** — filtragem por tag na sidebar
- **Anexos** — upload de arquivos com imagens embutidas na nota
- **Fixar notas** — aparecem no topo da lista
- **100% local** — seus dados ficam na sua máquina

## Início rápido

### 1. Clonar e configurar

```bash
git clone https://github.com/paulovieira99/knowhub.git
cd knowhub

# Opção A — gerar .env com segredos aleatórios
chmod +x scripts/setup-env.sh
./scripts/setup-env.sh

# Opção B — manual
cp .env.example .env
# Edite .env e defina POSTGRES_PASSWORD e SECRET_KEY fortes
```

Gere segredos manualmente, se preferir:

```bash
openssl rand -hex 24   # POSTGRES_PASSWORD
openssl rand -hex 32   # SECRET_KEY
```

### 2. Subir com Docker Compose

```bash
docker compose up -d --build
```

### 3. Acessar

Abra **http://localhost:3000** e crie sua conta na tela de registro.

## Variáveis de ambiente

| Variável            | Obrigatória | Descrição                                      |
|---------------------|-------------|------------------------------------------------|
| `POSTGRES_PASSWORD` | Sim         | Senha do PostgreSQL                            |
| `SECRET_KEY`        | Sim         | Segredo JWT (mín. 32 caracteres recomendado)   |
| `PORT`              | Não         | Porta exposta no host (padrão: `3000`)          |
| `CORS_ORIGINS`      | Não         | Origens permitidas, separadas por vírgula       |

Use `.env.example` como referência para criar o seu `.env` local.

## Comandos úteis

```bash
# Logs em tempo real
docker compose logs -f

# Parar
docker compose down

# Parar e apagar dados (cuidado!)
docker compose down -v

# Backup do banco
docker exec knowhub_postgres pg_dump -U knowhub knowhub > backup.sql
```

## Estrutura do projeto

```
knowhub/
├── backend/
│   ├── app/
│   │   ├── core/       # config, database, security
│   │   ├── models/
│   │   ├── routers/
│   │   ├── schemas/
│   │   └── main.py
│   ├── migrations/
│   └── Dockerfile
├── frontend/
│   ├── src/
│   └── Dockerfile
├── nginx/
├── scripts/
│   └── setup-env.sh
├── docker-compose.yml
└── .env.example
```

## Desenvolvimento local (sem Docker)

```bash
# Backend
cd backend
pip install -r requirements.txt
export DATABASE_URL=postgresql+asyncpg://knowhub:senha@localhost/knowhub
export SECRET_KEY="$(openssl rand -hex 32)"
uvicorn app.main:app --reload

# Frontend
cd frontend
npm install --legacy-peer-deps
npm run dev
```

## Licença

MIT — veja [LICENSE](LICENSE).
