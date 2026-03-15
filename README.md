# Personal Finance Tracker

A private, self-hostable web application for tracking personal income and expenses. This project is designed with a security-first mindset, utilizing end-to-end encryption to ensure that your financial data remains completely private and accessible only to you.

## Key Features

* **Transaction Tracking:** Log your income and expenses with titles, amounts, dates, and categories.
* **Full CRUD History:** View, edit, and delete any transaction from your history.
* **Analytics Page:** A dedicated page with charts and summaries for balance over time, expenses by category and monthly summaries.
* **Adjustable Savings Goal:** Set a monthly savings goal and track your progress. The goal is stored historically, so changing it won't affect past analytics.
* **End-to-End Encryption:** All sensitive transaction data is encrypted client-side before being sent to the server.

---

## 🏗️ Architecture Overview

### System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Internet                                        │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Nginx Reverse Proxy                                  │
│                         (Port 8090 external)                                 │
│                                                                              │
│   ┌─────────────────────┐         ┌─────────────────────┐                   │
│   │   /api/* routes     │         │   /* routes         │                   │
│   │   → backend:3000    │         │   → frontend:3000   │                   │
│   └─────────────────────┘         └─────────────────────┘                   │
└─────────────────────────────────────────────────────────────────────────────┘
                         │                              │
                         ▼                              ▼
┌────────────────────────────────────┐   ┌────────────────────────────────────┐
│      Backend API (NestJS)          │   │      Frontend (SvelteKit)          │
│      Internal Port: 3000           │   │      Internal Port: 3000           │
│                                    │   │                                    │
│  ┌──────────────────────────────┐  │   │  ┌──────────────────────────────┐  │
│  │     Authentication Module    │  │   │  │     Svelte Components        │  │
│  │     - JWT Strategy           │  │   │  │     - Dashboard              │  │
│  │     - HttpOnly Cookies       │  │   │  │     - Analytics              │  │
│  │     - Account Lockout        │  │   │  │     - Login/Register         │  │
│  └──────────────────────────────┘  │   │  └──────────────────────────────┘  │
│                                    │   │                                    │
│  ┌──────────────────────────────┐  │   │  ┌──────────────────────────────┐  │
│  │     Transactions Module      │  │   │  │     Crypto Layer             │  │
│  │     - CRUD Operations        │  │   │  │     - PBKDF2 Key Derivation  │  │
│  │     - User Ownership         │  │   │  │     - AES-GCM Encryption     │  │
│  └──────────────────────────────┘  │   │  │     - Local Salt Storage     │  │
│                                    │   │  └──────────────────────────────┘  │
│  ┌──────────────────────────────┐  │   │                                    │
│  │     Analytics Module         │  │   │  ┌──────────────────────────────┐  │
│  │     - Savings Goals          │  │   │  │     Auth Store               │  │
│  │     - Historical Data        │  │   │  │     - Session State          │  │
│  └──────────────────────────────┘  │   │  │     - Encryption Key (mem)   │  │
│                                    │   │  └──────────────────────────────┘  │
│  ┌──────────────────────────────┐  │   │                                    │
│  │     Prisma ORM               │  │   └────────────────────────────────────┘
│  │     - Type-safe Queries      │  │   
│  │     - Connection Pooling     │  │   
│  └──────────────────────────────┘  │   
└────────────────────────────────────┘   
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      PostgreSQL Database                                     │
│                      Internal Port: 5432                                     │
│                                                                              │
│   ┌───────────────┐  ┌───────────────┐  ┌───────────────┐                   │
│   │    Users      │  │ Transactions  │  │ SavingsGoals  │                   │
│   │ - id          │  │ - id          │  │ - id          │                   │
│   │ - email       │  │ - encryptedData│  │ - amount      │                   │
│   │ - passwordHash│  │ - iv          │  │ - userId      │                   │
│   │ - failedLogin │  │ - date        │  │ - createdAt   │                   │
│   │ - lockedUntil │  │ - type        │  └───────────────┘                   │
│   └───────────────┘  │ - userId      │                                        │
│                      └───────────────┘                                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Request Flow

#### 1. User Authentication Flow
```
User Browser                    Frontend                     Backend                    Database
    │                              │                           │                          │
    │─── Enter Credentials ───────▶│                           │                          │
    │                              │                           │                          │
    │                              │─── Derive encryption key ─▶│                          │
    │                              │    (PBKDF2 + salt)        │                          │
    │                              │                           │                          │
    │                              │─── POST /api/auth/login ─▶│                          │
    │                              │    (email, password)      │                          │
    │                              │                           │─── Validate user ───────▶│
    │                              │                           │─── Check lockout ───────▶│
    │                              │                           │─── Verify password ─────▶│
    │                              │                           │                          │
    │◀──── Set-Cookie: access_token ──────────────────────────│                          │
    │◀──── Set-Cookie: refresh_token ─────────────────────────│                          │
    │                              │                           │                          │
    │                              │◀── Store key in memory ───│                          │
```

#### 2. Transaction Creation Flow (E2E Encryption)
```
User Browser                    Frontend                     Backend                    Database
    │                              │                           │                          │
    │─── Enter transaction ───────▶│                           │                          │
    │    (title, amount, category) │                           │                          │
    │                              │                           │                          │
    │                              │─── Encrypt data ──────────▶│                          │
    │                              │    AES-GCM with user key  │                          │
    │                              │    → ciphertext + iv      │                          │
    │                              │                           │                          │
    │                              │─── POST /api/transactions ─▶│                         │
    │                              │    {encryptedData, iv,    │                          │
    │                              │     date, type}           │                          │
    │                              │                           │─── Store encrypted ─────▶│
    │                              │                           │                          │
    │◀────── Success response ─────────────────────────────────│                          │
```

#### 3. Transaction Retrieval Flow
```
User Browser                    Frontend                     Backend                    Database
    │                              │                           │                          │
    │─── View dashboard ──────────▶│                           │                          │
    │                              │                           │                          │
    │                              │─── GET /api/transactions ─▶│                          │
    │                              │    Cookie: access_token   │                          │
    │                              │                           │─── Validate JWT ────────▶│
    │                              │                           │─── Fetch transactions ──▶│
    │                              │                           │                          │
    │                              │◀── Return encrypted data ──│                          │
    │                              │    [{encryptedData, iv,   │                          │
    │                              │      date, type}, ...]    │                          │
    │                              │                           │                          │
    │                              │─── Decrypt each record ───▶│                          │
    │                              │    using memory key       │                          │
    │                              │                           │                          │
    │◀─── Display decrypted data ──│                           │                          │
    │    (title, amount, category) │                           │                          │
```

### Docker Network Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Docker Default Network                                │
│                     (finance-tracker_default)                                │
│                                                                              │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐  │
│   │   nginx     │    │   frontend  │    │    api      │    │     db      │  │
│   │  Port 8090  │    │  Port 3000  │    │  Port 3000  │    │  Port 5432  │  │
│   │  (external) │    │ (internal)  │    │ (internal)  │    │ (internal)  │  │
│   └──────┬──────┘    └──────┬──────┘    └──────┬──────┘    └──────┬──────┘  │
│          │                  │                  │                  │         │
│          │                  │                  │                  │         │
│          └──────────────────┼──────────────────┼──────────────────┘         │
│                             │                  │                            │
│                    ┌────────┴────────┐  ┌──────┴──────┐                     │
│                    │  HTTP traffic   │  │  Prisma     │                     │
│                    │  (reverse proxy)│  │  queries    │                     │
│                    └─────────────────┘  └─────────────┘                     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                          │
                                          │ (optional)
                                          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     External Nginx Proxy Network                             │
│                     (nginx-proxy)                                            │
│                                                                              │
│   Used for integration with external reverse proxy / SSL termination        │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key Architectural Decisions

| Decision | Rationale |
|----------|-----------|
| **Nginx as single entry point** | All traffic goes through Nginx, enabling unified security headers, logging, and SSL termination |
| **No exposed database port** | Database is only accessible from the API container via internal Docker network |
| **Client-side encryption** | Server never sees plaintext financial data; encryption key never leaves browser |
| **HttpOnly cookies for JWT** | Prevents XSS-based token theft; cookies are not accessible to JavaScript |
| **Non-root containers** | Limits impact of potential container escape vulnerabilities |
| **Separate access/refresh tokens** | Short-lived access tokens (15min) reduce exposure if compromised; refresh tokens enable seamless UX |

---

## 🔒 Security Model

### End-to-End Encryption

The core security feature of this application is that **your sensitive financial data is never stored in a readable format on the server**. All encryption and decryption happen exclusively in your browser.

#### How It Works

1. **Master Password:** When you register or log in, your password becomes your master key. It is **never sent to the server** in plain text - only used locally for key derivation.

2. **Key Derivation (PBKDF2):** In your browser, a strong 256-bit AES encryption key is derived from your master password using PBKDF2 (Password-Based Key Derivation Function 2) with:
   - 100,000 iterations for computational resistance against brute-force attacks
   - SHA-256 as the hash function
   - A cryptographically random 128-bit salt (stored in localStorage per user account)

3. **Client-Side Encryption (AES-GCM):** Before a transaction is saved, all sensitive details (title, amount, category) are:
   - Serialized to JSON
   - Encrypted using AES-GCM (Advanced Encryption Standard in Galois/Counter Mode)
   - A unique 96-bit initialization vector (IV) is generated for each encryption operation

4. **Secure Storage:** The server receives and stores only:
   - `encryptedData`: The AES-GCM encrypted blob containing `{title, amount, category}`
   - `iv`: The initialization vector (needed for decryption, but useless without the key)
   - `date`: Kept unencrypted for server-side sorting
   - `type`: Kept unencrypted (INCOME/EXPENSE) for server-side filtering

5. **Client-Side Decryption:** When you view your data, the encrypted blobs are sent to your browser, where they are decrypted locally using your derived key.

#### What's Encrypted vs. Unencrypted

| Field | Encrypted | Reason |
|-------|-----------|--------|
| Title | ✅ Yes | Sensitive financial description |
| Amount | ✅ Yes | Sensitive financial value |
| Category | ✅ Yes | Sensitive spending patterns |
| Date | ❌ No | Needed for server-side sorting/filtering |
| Type (Income/Expense) | ❌ No | Needed for server-side filtering |

This model ensures that neither the hosting provider, nor a database administrator, nor any third party can ever access your personal financial details.

---

### Authentication & Session Management

#### HttpOnly Cookie-Based Authentication

JWT tokens are stored in **HttpOnly cookies**, not localStorage. This provides protection against:
- **XSS (Cross-Site Scripting)** attacks that could steal tokens
- **JavaScript-based token theft** since cookies are not accessible to client-side scripts

#### Token Strategy

| Token Type | Lifetime | Purpose |
|------------|----------|---------|
| Access Token | 15 minutes | API authentication |
| Refresh Token | 7 days | Obtain new access tokens |

The short-lived access token minimizes the window of opportunity if a token is somehow compromised. The refresh token allows seamless re-authentication without requiring the user to log in again.

#### Account Lockout Protection

After 5 consecutive failed login attempts, the account is temporarily locked for 30 minutes. This protects against:
- Brute-force password attacks
- Credential stuffing attacks
- Targeted account takeover attempts

---

### Infrastructure Security

#### Network Isolation

All services run in an isolated Docker network. **No ports are exposed to the public internet:**

| Service | External Access | Internal Access |
|---------|-----------------|-----------------|
| Frontend (SvelteKit) | ❌ No | Via Nginx reverse proxy |
| Backend API (NestJS) | ❌ No | Via Nginx reverse proxy |
| Database (PostgreSQL) | ❌ No | API container only |
| Nginx | ✅ Yes (port 8090) | Reverse proxy to frontend/backend |

#### Non-Root Containers

Both frontend and backend Docker containers run as a non-root user (`app`). This limits the potential impact of a container escape vulnerability.

#### Security Headers

The application sets multiple security headers via:
- **Helmet middleware** in the NestJS backend
- **Nginx configuration** for additional headers

Headers include:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`

#### Input Validation

All user inputs are validated using `class-validator` decorators:
- Email validation with proper format checking
- Password minimum length of 8 characters
- Request payload validation via NestJS ValidationPipe

---

## 🛠️ Tech Stack

This project is built with a modern, reliable, and open-source stack.

### Frontend
- **SvelteKit** - Fast, reactive framework with server-side rendering
- **TypeScript** - Type-safe development
- **Web Crypto API** - Native browser cryptography (no external dependencies)

### Backend
- **NestJS** - Robust, modular Node.js framework
- **TypeScript** - Type-safe development
- **Prisma** - Type-safe ORM with migration support
- **bcrypt** - Secure password hashing
- **JWT** - JSON Web Tokens for authentication
- **Helmet** - Security headers middleware
- **class-validator** - Request validation

### Database
- **PostgreSQL** - Reliable, ACID-compliant relational database

### Infrastructure
- **Docker & Docker Compose** - Containerized deployment
- **Nginx** - High-performance reverse proxy
- **Alpine Linux** - Minimal container images for reduced attack surface

---

## 🚀 Deployment

The entire application is designed to be deployed on a single VPS with Docker and Docker Compose installed.

### Prerequisites

* A Linux VPS (e.g., from IONOS, DigitalOcean, etc.)
* **Docker** and **Docker Compose** installed on the VPS
* **Git** installed on the VPS
* A firewall (like `ufw`) configured

### Step-by-Step Guide

1. **Clone the Repository**
   SSH into your VPS and clone this repository.
   ```bash
   git clone https://github.com/nikcook152/finance-tracker.git
   cd finance-tracker
   ```

2. **Create Environment File**
   Create a `.env` file in the root of the project. You can copy the example file to get started.
   ```bash
   cp env.example .env
   ```
   
   Now, edit the `.env` file with your configuration:
   ```bash
   # Database Credentials
   DB_USER=your_db_user
   DB_PASSWORD=your_secure_password  # Use a strong, unique password!
   DB_NAME=finance_tracker
   
   # JWT Secret Key (generate a secure random string)
   # Example: openssl rand -base64 32
   JWT_SECRET=your_256_bit_random_secret_key
   
   # CORS Allowed Origins (comma-separated)
   CORS_ORIGIN=https://yourdomain.com
   ```

3. **Open Firewall Port**
   Allow incoming web traffic on the configured port.
   ```bash
   sudo ufw allow 8090
   ```

4. **Build and Launch**
   Run the following command from the project root. This will build the frontend and backend images, start all containers, and apply any pending database migrations automatically.
   ```bash
   docker compose up --build -d
   ```

Your application is now live! You can access it by navigating to `http://<your_vps_ip>:8090` in your web browser.

### Future Deployments

To deploy any new changes you've pushed to the repository:
```bash
git pull
docker compose up --build -d
```

### Installation on openSUSE MicroOS Server

This guide covers the deployment of the Finance Tracker on an openSUSE MicroOS server using Podman (a daemonless container runtime). MicroOS uses `transactional-update` for system changes, which requires a different approach than traditional Linux distributions.

#### Installing Prerequisites

MicroOS requires using `transactional-update` to install packages that persist across updates. Install the required software:

```bash
transactional-update pkg install podman podman-compose firewalld git
```

After installation, reboot the system to activate the new packages:
```bash
reboot
```

#### Configuring the Firewall

Enable and start firewalld, then open port 8090 for the application:

```bash
# Enable and start firewalld
systemctl enable --now firewalld

# Open port 8090 for web traffic
firewall-cmd --permanent --add-port=8090/tcp
firewall-cmd --reload

# Verify the port is open
firewall-cmd --list-ports
```

#### Deploying the Application

1. **Clone the Repository**
   ```bash
   git clone https://github.com/nikcook152/finance-tracker.git
   cd finance-tracker
   ```

2. **Create Environment File**
   ```bash
   cp env.example .env
   ```

   Edit the `.env` file with your configuration:
   ```bash
   # Database Credentials
   DB_USER=your_db_user
   DB_PASSWORD=your_secure_password
   DB_NAME=finance_tracker
   
   # JWT Secret Key
   JWT_SECRET=your_256_bit_random_secret_key
   
   # CORS Allowed Origins
   CORS_ORIGIN=https://yourdomain.com
   ```

3. **Build and Launch**
   ```bash
   podman-compose up --build -d
   ```

Your application is now running! Access it at `http://<your_server_ip>:8090`.

#### Future Deployments on MicroOS

To deploy updates:
```bash
git pull
podman-compose down
podman-compose up --build -d
```

#### Rollback Capability

MicroOS integrates with Snapper for automatic system snapshots. If a deployment causes issues, you can rollback to a previous state using:
```bash
snapper list
snapper rollback <snapshot_number>
```

This provides an additional layer of safety when updating your deployment.

### HTTPS Configuration (Recommended for Production)

The Nginx configuration includes a prepared HTTPS server block (commented out). To enable HTTPS:

1. Obtain SSL certificates (e.g., using Let's Encrypt/Certbot)
2. Mount the certificates into the Nginx container
3. Uncomment the HTTPS server block in `nginx/nginx.conf`
4. Update the CORS origin to use `https://`

---

## 📥 Data Import

The import script (`scripts/import_transactions.py`) supports End-to-End encryption. Transaction data is encrypted client-side using the same encryption parameters as the web interface before being sent to the API.

### Prerequisites

Install the required Python dependencies:
```bash
pip install -r scripts/requirements.txt
```

### CSV Format

The import script expects a tab-separated CSV file with the following columns:
```
Date    Title   Amount Category    Expense/Income
01.01.2024  Grocery Shopping  -50.00  Food   Expense
15.01.2024  Salary Payment    3000.00 Income   INCOME
```

### Usage

**Interactive mode (recommended for security):**
```bash
python scripts/import_transactions.py transactions.csv
```

**With command-line arguments:**
```bash
python scripts/import_transactions.py transactions.csv -u your@email.com -p yourpassword -e your@email.com
```

**Using environment variables:**
```bash
export FINANCE_API_URL=http://localhost:8090/api
export FINANCE_USERNAME=your@email.com
export FINANCE_PASSWORD=yourpassword
export FINANCE_EMAIL=your@email.com
python scripts/import_transactions.py transactions.csv
```

### Important: Salt Management

For imported transactions to be readable by the web interface, you must use the **same encryption salt** that was created when you first logged in through the browser.

**Retrieving your existing salt:**
1. Open your browser's DevTools (F12)
2. Go to the **Application** tab → **Local Storage**
3. Find the key `finance_tracker_salt_<your_email>`
4. Copy the value and set it via the `FINANCE_SALT` environment variable:

```bash
export FINANCE_SALT=<copied_salt_value>
python scripts/import_transactions.py transactions.csv
```

If you don't set `FINANCE_SALT`, a new salt will be generated. Transactions imported with a new salt will NOT be readable in the web interface (you'll see decryption errors), but they will be stored correctly in the database.

### Environment Variables

| Variable | Description |
|----------|-------------|
| `FINANCE_API_URL` | API URL (default: `http://localhost:8090/api`) |
| `FINANCE_USERNAME` | Your login email |
| `FINANCE_PASSWORD` | Your password |
| `FINANCE_EMAIL` | Your email (for salt derivation) |
| `FINANCE_SALT` | Base64-encoded salt (optional, for existing users) |

### Security Note

- Credentials passed via command-line arguments may be visible in the process list
- Use interactive mode or environment variables for better security
- The encryption key is derived from your password using PBKDF2 (100,000 iterations) - same as the web interface

---

## 🔧 Local Development

### Prerequisites

- Node.js 20+
- PostgreSQL 15+
- npm or yarn

### Backend Setup

```bash
cd backend
npm install
cp .env.example .env  # Configure your database connection
npx prisma generate
npx prisma migrate dev
npm run start:dev
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend will be available at `http://localhost:5173` and will proxy API requests to the backend at `http://localhost:3000`.

### Running Tests

```bash
# Backend unit tests
cd backend
npm run test

# Backend e2e tests
npm run test:e2e

# Frontend tests (if configured)
cd frontend
npm run test
```

---

## 📊 Analytics Features

The application provides comprehensive analytics:

- **Balance Over Time** - Track your net worth progression
- **Monthly Summary** - Income vs. expenses comparison
- **Category Breakdown** - See where your money goes
- **Savings Goal Tracking** - Monitor progress toward your monthly savings target

All analytics are calculated **client-side** after decryption, ensuring your financial patterns remain private.

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

## 📝 License

This project is open source. See the LICENSE file for details.