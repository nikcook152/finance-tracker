# Personal Finance Tracker

A private, self-hostable web application for tracking personal income and expenses. This project is designed with a security-first mindset, utilizing end-to-end encryption to ensure that your financial data remains completely private and accessible only to you.

## Key Features

* **Transaction Tracking:** Log your income and expenses with titles, amounts, dates, and categories.
* **Full CRUD History:** View, edit, and delete any transaction from your history.
* **Analytics Page:** A dedicated page with charts and summaries for balance over time, expenses by category and monthly summaries.
* **Adjustable Savings Goal:** Set a monthly savings goal and track your progress. The goal is stored historically, so changing it won't affect past analytics.
* **End-to-End Encryption:** All sensitive transaction data is encrypted client-side before being sent to the server.

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

### HTTPS Configuration (Recommended for Production)

The Nginx configuration includes a prepared HTTPS server block (commented out). To enable HTTPS:

1. Obtain SSL certificates (e.g., using Let's Encrypt/Certbot)
2. Mount the certificates into the Nginx container
3. Uncomment the HTTPS server block in `nginx/nginx.conf`
4. Update the CORS origin to use `https://`

---

## 📥 Data Import

> ⚠️ **Important:** The data import script is **not compatible with E2E encryption**. With encryption enabled, transaction data must be encrypted client-side before being sent to the API.

### Options for Importing Transactions

1. **Use the Web Interface (Recommended)** - Encryption is handled automatically
2. **Manual Entry** - Add transactions through the dashboard form
3. **Modify the Import Script** - Implement Python encryption using the same parameters (PBKDF2, AES-GCM)

For reference, the import script is located in `scripts/import_transactions.py` and supports:
- Environment variable configuration (`FINANCE_API_URL`, `FINANCE_USERNAME`, `FINANCE_PASSWORD`)
- Interactive credential prompts
- CSV file parsing

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