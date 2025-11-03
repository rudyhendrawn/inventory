# Inventory Manager (Personal Use) — Requirements, Design & Server Setup

> Stack: **FastAPI (Python)** backend • **React Native** mobile app • **MySQL** DB • **LAN‑only access** on **Ubuntu Server 24.04**

---

## 1) Scope & Key Goals

- Track items, stock levels, movements (in/out/adjustments) across one or more locations.
- Simple purchase and issue flows (optional lightweight sales/issuance).
- Works only inside the organization network (no public internet exposure).
- Low‑maintenance, small user base (1–20 users), minimal training.
- Simplified to anonymous operation without user accounts or authentication.

## 2) Functional Requirements

### 2.1 Master Data

- Create/read/update/archive **Items** (SKU, name, barcode, category, unit, min stock, image/attachment).
- **Categories** and **Units** management.
- **Locations** (e.g., Warehouse, Store Room). Optional: hierarchical (Main → Sub‑location / Rack / Bin).
- **Suppliers** (name, contact). Optional: **Customers** if you issue to external parties.

### 2.2 Inventory Operations

- **Goods Receipt (IN)**: increase stock with reference (PO, or manual receipt).
- **Goods Issue (OUT)**: decrease stock with reason (usage, transfer, damage, etc.).
- **Stock Adjustment**: correct stock to physical count (with note & reason).
- **Transfers (optional)**: move stock between locations.
- **Reorder Hints**: flag items below minimum stock.

### 2.3 Simple Procurement / Issuance (Optional)

- **Purchase Orders (PO)** → items, qty, cost, status (Draft → Approved → Received).
- **Requests/Issues** → requests, approval, then issue from stock.

### 2.4 Search & Reporting

- Global search by SKU/name/barcode.
- Current stock by item/location; transaction history (filter by date/item/location/type).
- Download CSV (items, stock, transactions).

### 2.5 Security & LAN Constraint

- API **only reachable from LAN** subnets; reverse proxy blocks other IPs.
- Full audit trail of critical actions (simplified without user tracking).

## 3) Non‑Functional Requirements

- **Performance**: typical request < 300ms under light load (1–20 users).
- **Reliability**: durable DB; daily backups; transaction integrity.
- **Maintainability**: clean modular API, typed models, migrations (Alembic).
- **Portability**: run via `systemd` services on Ubuntu 24.04.

---

## 5) Architecture Overview

```
  React Front-end  (MSAL RN)  ── (OIDC PKCE)──>  Microsoft Entra ID (M365)
        │                                   ▲
        ▼  HTTPS + Bearer JWT (access token) │
   Nginx reverse proxy  (LAN allowlist) ─────┘
        │
        ▼
   FastAPI (uvicorn workers)
        │
        ▼
      MySQL 8
```

- **Auth flow (high level)**
  1. RN app uses **MSAL for React Native** (PKCE) to sign in and obtain **ID token + access token**.
  2. The app calls FastAPI with **Bearer access token** in header.
  3. FastAPI validates token signature & claims (issuer/tenant, audience, expiry) using Entra metadata (JWKS).

---

## 6) Microsoft 365 / Entra ID Setup

1. **Register two apps in Entra ID** (Azure Portal → App registrations):
   - **Mobile App** (public client):
     - Redirect URIs → \`\` (per MSAL RN docs) and any platform URIs required.
     - Allow public client flows.
   - **Backend API** (web/confidential):
     - Expose an API → set **Application ID URI** (e.g., `api://inventory.local`).
     - Add a scope (e.g., `access_as_user`).
2. **Grant RN app permission** to call the API scope and **admin consent**.
3. **Collect config**: Tenant ID, Client IDs (mobile & API), Issuer URL, JWKS URL.
4. **FastAPI**: configure OIDC validation (audience = your API’s Application ID URI; issuer = your tenant v2.0 endpoint).

---

## 7) Data Model (ERD + DDL)

### 7.1 ERD (textual)

- **users** (id, m365_oid, name, email, role, active, created_at) — has many **items** (optional)
- **locations** (id, name, code, active)
- **categories** (id, name)
- **units** (id, name, symbol, multiplier)
- **items** (id, sku, name, category_id→categories, unit_id→units, owner_user_id→users (nullable), barcode, min_stock, image_url, active)
- **stock_levels** (id, item_id→items, location_id→locations, qty_on_hand, updated_at)
- **stock_tx** (id, item_id, location_id, tx_type[IN|OUT|ADJ|XFER], qty, ref, note, tx_at, user_id)
- **purchase_orders** (id, supplier_name, code, status, ordered_at, received_at, note)
- **issues** (id, code, status, requested_by, approved_by, issued_at, note)
- **issue_items** (id, issue_id→issues, item_id, qty)
- **attachments** (id, entity_type, entity_id, file_url, note)
- **audit_log** (id, actor_user_id, action, entity_type, entity_id, payload_json, created_at)

### 7.2 Minimal SQL DDL (MySQL 8)

```sql
CREATE TABLE users (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  m365_oid VARCHAR(64) NOT NULL UNIQUE, -- Entra object id
  name VARCHAR(120) NOT NULL,
  email VARCHAR(160) NOT NULL UNIQUE,
  role ENUM('ADMIN','STAFF','AUDITOR') NOT NULL DEFAULT 'STAFF',
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE locations (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(80) NOT NULL,
  code VARCHAR(24) NOT NULL UNIQUE,
  active TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB;

CREATE TABLE categories (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(80) NOT NULL UNIQUE
) ENGINE=InnoDB;

CREATE TABLE units (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(40) NOT NULL UNIQUE,
  symbol VARCHAR(16) NOT NULL,
  multiplier DECIMAL(12,6) NOT NULL DEFAULT 1.0 -- for conversion if needed
) ENGINE=InnoDB;

CREATE TABLE items (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  sku VARCHAR(40) NOT NULL UNIQUE,
  name VARCHAR(160) NOT NULL,
  category_id BIGINT NOT NULL,
  unit_id BIGINT NOT NULL,
  barcode VARCHAR(64),
  min_stock DECIMAL(18,6) NOT NULL DEFAULT 0,
  image_url VARCHAR(255),
  active TINYINT(1) NOT NULL DEFAULT 1,
  CONSTRAINT fk_items_category FOREIGN KEY (category_id) REFERENCES categories(id),
  CONSTRAINT fk_items_unit FOREIGN KEY (unit_id) REFERENCES units(id)
) ENGINE=InnoDB;

CREATE TABLE stock_levels (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  item_id BIGINT NOT NULL,
  location_id BIGINT NOT NULL,
  qty_on_hand DECIMAL(18,6) NOT NULL DEFAULT 0,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_item_location (item_id, location_id), -- ensures one row per item/location
  CONSTRAINT fk_sl_item FOREIGN KEY (item_id) REFERENCES items(id),
  CONSTRAINT fk_sl_loc FOREIGN KEY (location_id) REFERENCES locations(id)
) ENGINE=InnoDB;

CREATE TABLE stock_tx (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  item_id BIGINT NOT NULL,
  location_id BIGINT NOT NULL,
  tx_type ENUM('IN','OUT','ADJ','XFER') NOT NULL,
  qty DECIMAL(18,6) NOT NULL,
  ref VARCHAR(80),
  note VARCHAR(255),
  tx_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  user_id BIGINT NOT NULL,
  CONSTRAINT fk_tx_item FOREIGN KEY (item_id) REFERENCES items(id),
  CONSTRAINT fk_tx_loc FOREIGN KEY (location_id) REFERENCES locations(id),
  CONSTRAINT fk_tx_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE purchase_orders (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  supplier_name VARCHAR(160) NOT NULL,
  code VARCHAR(40) NOT NULL UNIQUE,
  status ENUM('DRAFT','APPROVED','RECEIVED','CANCELLED') NOT NULL DEFAULT 'DRAFT',
  ordered_at DATETIME,
  received_at DATETIME,
  note VARCHAR(255)
) ENGINE=InnoDB;

CREATE TABLE issues (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(40) NOT NULL UNIQUE,
  status ENUM('DRAFT','APPROVED','ISSUED','CANCELLED') NOT NULL DEFAULT 'DRAFT',
  requested_by BIGINT,
  approved_by BIGINT,
  issued_at DATETIME,
  note VARCHAR(255),
  CONSTRAINT fk_issue_req FOREIGN KEY (requested_by) REFERENCES users(id),
  CONSTRAINT fk_issue_app FOREIGN KEY (approved_by) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE issue_items (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  issue_id BIGINT NOT NULL,
  item_id BIGINT NOT NULL,
  qty DECIMAL(18,6) NOT NULL,
  CONSTRAINT fk_i_items_issue FOREIGN KEY (issue_id) REFERENCES issues(id),
  CONSTRAINT fk_i_items_item FOREIGN KEY (item_id) REFERENCES items(id)
) ENGINE=InnoDB;

CREATE TABLE attachments (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  entity_type VARCHAR(40) NOT NULL, -- e.g., 'ITEM','PO','ISSUE'
  entity_id BIGINT NOT NULL,
  file_url VARCHAR(255) NOT NULL,
  note VARCHAR(255)
) ENGINE=InnoDB;

CREATE TABLE audit_log (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  actor_user_id BIGINT NOT NULL,
  action VARCHAR(80) NOT NULL,
  entity_type VARCHAR(40) NOT NULL,
  entity_id BIGINT,
  payload_json JSON,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_audit_entity (entity_type, entity_id),
  CONSTRAINT fk_audit_user FOREIGN KEY (actor_user_id) REFERENCES users(id)
) ENGINE=InnoDB;
```

> **Stock integrity rule**: modify `stock_levels.qty_on_hand` only via **stored procedure** or application service that also inserts a row into `stock_tx` within the same transaction.

---

## 8) API Design (sample)

- `POST /auth/login` (handled by RN & Entra; backend only validates tokens).
- `GET /me` → current user profile & role.
- Items: `GET /items`, `POST /items`, `GET /items/{id}`, `PUT /items/{id}`, `DELETE /items/{id}` (soft delete/archive).
- Stock: `GET /stock?item_id=&location_id=`, `POST /stock/in`, `POST /stock/out`, `POST /stock/adjust`, `POST /stock/transfer`.
- Master: `GET/POST/PUT` for categories, units, locations, suppliers.
- PO: `POST /po`, `POST /po/{id}/approve`, `POST /po/{id}/receive`.
- Reports: `GET /reports/stock`, `GET /reports/tx` (CSV when `?format=csv`).

**AuthN/Z**

- Require `Authorization: Bearer <access_token>`.
- Role guard: Only Admin may mutate master data; Staff may do stock ops.

---

## 9) Ubuntu 24.04 Server Setup (LAN‑only)

> Assumes fresh VM and sudo access; replace variables in ALL‑CAPS.

### 9.1 Base packages & firewall

```bash
sudo apt update && sudo apt -y upgrade
sudo apt -y install build-essential curl git ufw unzip

# Firewall: allow only LAN (replace 192.168.10.0/24)
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow from 192.168.10.0/24 to any port 22 proto tcp
sudo ufw allow from 192.168.10.0/24 to any port 80,443 proto tcp
sudo ufw enable
sudo ufw status
```

### 9.2 Install Python & virtual env (system Python 3.12 is default on 24.04)

```bash
python3 --version  # expect 3.12.x
sudo apt -y install python3-venv python3-dev
# optional: faster installer
pipx ensurepath || true; python3 -m pip install --user pipx && ~/.local/bin/pipx ensurepath
```

### 9.3 FastAPI app skeleton

```bash
sudo mkdir -p /opt/inventory/api && sudo chown -R $USER:$USER /opt/inventory
cd /opt/inventory/api
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install fastapi uvicorn[standard] python-jose[cryptography] httpx pydantic-settings mysqlclient orjson

cat > app.py <<'PY'
from fastapi import FastAPI
app = FastAPI(title="Inventory API")
@app.get("/health")
def health():
    return {"ok": True}
PY
```

### 9.4 MySQL 8 install & secure

```bash
sudo apt -y install mysql-server
sudo systemctl enable --now mysql
sudo mysql_secure_installation  # set root password, remove test DB, etc.

# Create DB & user
sudo mysql <<'SQL'
CREATE DATABASE inventory CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
CREATE USER 'inv_user'@'%' IDENTIFIED BY 'STRONG_PASSWORD_HERE';
GRANT ALL PRIVILEGES ON inventory.* TO 'inv_user'@'%';
FLUSH PRIVILEGES;
SQL

# Bind only to LAN interface (optional hardening)
sudo sed -i 's/^bind-address.*/bind-address = 192.168.10.5/' /etc/mysql/mysql.conf.d/mysqld.cnf
sudo systemctl restart mysql
```

### 9.5 Nginx reverse proxy (LAN only)

```bash
sudo apt -y install nginx
# Allow only LAN subnet
sudo tee /etc/nginx/sites-available/inventory.conf >/dev/null <<'NGX'
server {
  listen 80;
  server_name inventory.lan;

  # deny non-LAN traffic
  allow 192.168.10.0/24;
  deny all;

  location / {
    proxy_pass http://127.0.0.1:8000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
NGX
sudo ln -s /etc/nginx/sites-available/inventory.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### 9.6 systemd service for FastAPI (uvicorn)

```bash
sudo tee /etc/systemd/system/inventory-api.service >/dev/null <<'UNIT'
[Unit]
Description=Inventory FastAPI Service
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=/opt/inventory/api
Environment="PATH=/opt/inventory/api/.venv/bin"
ExecStart=/opt/inventory/api/.venv/bin/uvicorn app:app --host 127.0.0.1 --port 8000 --workers 2
Restart=always

[Install]
WantedBy=multi-user.target
UNIT

sudo chown -R www-data:www-data /opt/inventory
sudo systemctl daemon-reload
sudo systemctl enable --now inventory-api
systemctl status inventory-api
```

> **Why 127.0.0.1?** The API listens only on localhost; Nginx handles LAN traffic and blocks non‑LAN IPs.

### 9.7 Environment variables

Create `/opt/inventory/api/.env` (use `pydantic-settings`):

```
DB_URI=mysql+mysqlclient://inv_user:STRONG_PASSWORD_HERE@192.168.10.5/inventory
OIDC_TENANT_ID=...
OIDC_AUDIENCE=api://inventory.local
OIDC_ISSUER=https://login.microsoftonline.com/<TENANT_ID>/v2.0
JWKS_URL=https://login.microsoftonline.com/<TENANT_ID>/discovery/v2.0/keys
```

---

## 10) React Native App Notes

- Use \`\` for Entra ID login (PKCE).
- After sign‑in, store access token securely (Keychain/Keystore) and send it as `Authorization: Bearer` header.
- API base URL: `http://inventory.lan/` (ensure device can resolve DNS or host file; or use IP).
- Barcode: add `react-native-camera`/`vision-camera` plugin for scanning (optional feature).

**Minimal request**

```js
const res = await fetch('http://inventory.lan/items', {
  headers: { Authorization: `Bearer ${accessToken}` }
});
```

---

## 11) Token Validation (FastAPI)

- Fetch Entra **OpenID configuration** & **JWKS** on startup and cache keys.
- Validate: signature, `iss`, `aud`, `exp`, and presence of `oid` claim → map to `users.m365_oid`.
- On first login, auto‑provision a `users` row with default role if email domain matches your org.

---

## 12) Backups & Monitoring

- **MySQL**: nightly `mysqldump` to local disk + rsync to NAS.
- **Logs**: `journalctl -u inventory-api -f` for live API logs; Nginx access/error logs.
- **Health**: `/health` endpoint; optional `fail2ban` for Nginx.

---

## 13) Phased Implementation Plan

1. Stand up server (Sections 9.1–9.6) and create DB with DDL (7.2).
2. Implement auth validation & `/me`, then master data (items, categories, locations, units).
3. Implement stock IN/OUT/ADJ flows + consistent stock update service.
4. Add PO/Issue modules; then reporting & CSV export.
5. Add barcode scanning and attachments if needed.

---

## 14) Nice‑to‑Haves (later)

- Role‑based UI in RN, offline queue for transactions if Wi‑Fi drops.
- Read replicas (MySQL) if reporting grows.
- WireGuard site‑to‑site to access API from remote offices, still private.

---

### Appendix A — Sample Stock Update (pseudo)

```sql
-- inside one DB transaction
INSERT INTO stock_tx(item_id,location_id,tx_type,qty,ref,note,user_id)
VALUES(:item_id,:loc_id,'IN',:qty,:ref,:note,:user_id);

INSERT INTO stock_levels(item_id,location_id,qty_on_hand)
VALUES(:item_id,:loc_id,:qty)
ON DUPLICATE KEY UPDATE qty_on_hand = qty_on_hand + VALUES(qty_on_hand);
```

### Appendix B — Simple RBAC (FastAPI dependency pseudo)

```python
from fastapi import Depends, HTTPException

def require_role(*roles):
    def wrapper(user=Depends(current_user)):
        if user.role not in roles:
            raise HTTPException(status_code=403, detail="forbidden")
        return user
    return wrapper
```

---

## How to run the project in development mode

```
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Directory Structure

```
/opt/inventory/api/
├─ app/
│  ├─ main.py                     # FastAPI app factory + routers mounting
│  ├─ dependencies.py             # DI helpers (db session, current_user, RBAC)
│  ├─ middleware.py               # logging, CORS (LAN only), request id
│  ├─ routers/
│  │  ├─ auth.py                  # /auth endpoints (token debug, /me)
│  │  ├─ items.py                 # CRUD + search
│  │  ├─ stock.py                 # in/out/adjust/transfer ops
│  │  ├─ master.py                # categories, units, locations
│  │  ├─ po.py                    # purchase orders (with supplier_name)
│  │  └─ reports.py               # CSV exports, summaries
│  └─ __init__.py
│
├─ core/
│  ├─ config.py                   # Pydantic Settings (DB_URI, OIDC, etc.)
│  ├─ logging.py                  # structlog / std logging config
│  ├─ security/
│  │  ├─ oidc.py                  # Entra OIDC validation (issuer, aud, JWKS cache)
│  │  └─ rbac.py                  # role checks, decorators
│  └─ __init__.py
│
├─ db/
│  ├─ session.py                  # session generator for DI
│  ├─ models/                     # SQL models
│  │  ├─ user.py
│  │  ├─ item.py                  # + owner_user_id FK (nullable)
│  │  ├─ category.py
│  │  ├─ unit.py
│  │  ├─ location.py
│  │  ├─ stock.py                 # stock_levels, stock_tx
│  │  ├─ purchase_order.py        # supplier_name, status, dates
│  │  └─ audit.py
│  ├─ repositories/               # DB access (no business rules)
│  │  ├─ user_repo.py
│  │  ├─ item_repo.py
│  │  ├─ stock_repo.py
│  │  ├─ po_repo.py
│  │  └─ ...
│  └─ __init__.py
│
├─ domain/                        # Business logic (pure services)
│  ├─ services/
│  │  ├─ stock_service.py         # single source of truth for qty updates (+tx)
│  │  ├─ item_service.py
│  │  ├─ po_service.py
│  │  └─ report_service.py
│  ├─ rules.py                    # invariants (e.g., stock integrity)
│  └─ __init__.py
│
├─ schemas/                       # Pydantic request/response models
│  ├─ auth.py
│  ├─ items.py
│  ├─ stock.py
│  ├─ master.py
│  ├─ po.py
│  └─ common.py
│
├─ migrations/                    # Alembic (autogenerated + hand-tuned)
│  ├─ versions/
│  └─ env.py
│
├─ tests/
│  ├─ conftest.py                 # test DB, fixtures
│  ├─ test_auth.py
│  ├─ test_items.py
│  ├─ test_stock.py
│  └─ ...
│
├─ scripts/                       # admin/ops helpers
│  ├─ seed_data.py
│  └─ backup.sh
│
├─ .env.example                   # template env vars
├─ alembic.ini
├─ pyproject.toml                 # or requirements.txt
└─ README.md
```

---

## Properly Configure Your API in Entra ID

Follow these steps to expose your API correctly:

### Step 1: Configure the API App Registration

Go to Azure Portal → Entra ID → App registrations

Find your API app (the one with ID 6d7e2d54-e45e-49f1-9f4e-919ce695a15b)

Click on Expose an API

Set the Application ID URI:

- Click Add next to "Application ID URI"
- Use: api://6d7e2d54-e45e-49f1-9f4e-919ce695a15b (should match your client ID)
- Click Save

Add a scope:

- Click + Add a scope
- Scope name: access_as_user
- Who can consent: Admins and users
- Admin consent display name: Access Inventory API
- Admin consent description: Allows the app to access the Inventory API on behalf of the signed-in user
- User consent display name: Access Inventory API
- User consent description: Allows the app to access the Inventory API on your behalf
- State: Enabled
- Click Add scope

### Step 2: Configure the Web App Registration

Go to Azure Portal → Entra ID → App registrations

Find your Web App (the one you're using for the front-end)

Go to API permissions

- Click + Add a permission
- Select My APIs tab
- Find your API app (6d7e2d54-e45e-49f1-9f4e-919ce695a15b)
- Select Delegated permissions
- Check access_as_user
- Click Add permissions
- Click Grant admin consent (if you're an admin)

### Step 3: Update Authentication Settings

In your Web App registration:

Go to Authentication

Under Platform configurations, add Single-page application:

- Redirect URI: http://localhost:5173

Under Implicit grant and hybrid flows, enable:

- ✅ Access tokens
- ✅ ID tokens