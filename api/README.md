# API Project

This backend is intentionally minimal. It now only keeps the WeChat official-account draft saving API used by the `md-to-wechat` tool.

## Prerequisites

- Python 3.8 or higher
- pip (Python package installer)

## Setup

1. Create and activate a virtual environment:
```bash
# Create virtual environment
python3 -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Set up environment variables:
```bash
# Optional: protect the draft endpoint
BACKEND_ACCESS_KEY=your_backend_access_key
```

4. Run the development server:
```bash
uvicorn main:app --reload
```

The server will start at `http://localhost:8000`

## Available API

- `POST /api/mp/draft`: Save a WeChat article draft.
  - Requires `X-Backend-Key` when `BACKEND_ACCESS_KEY` is configured.
  - Expects a client-provided WeChat `access_token`.

## Deployment

Use the unified deploy script from the repo root to ship frontend and backend together:

```bash
./scripts/deploy.sh user@your-server
```

Useful variants:

```bash
# frontend only
./scripts/deploy-web.sh user@your-server

# backend only
./scripts/deploy-api.sh user@your-server

# custom remote paths or service name
REMOTE_WEB_DIR=/data/mysite \
REMOTE_API_DIR=/data/mysite-api \
REMOTE_API_SERVICE=mysite-api.service \
./scripts/deploy.sh user@your-server
```

Notes:
- The deploy script syncs backend source code to the remote host, excluding `.env` and local cache folders.
- By default it creates or reuses a remote virtualenv, installs `requirements.txt`, and restarts the configured `systemd` service.
- Set `SKIP_API_RESTART=1` if the remote host does not use `systemd`, or `SKIP_WEB_BUILD=1` if you already built the frontend locally.
