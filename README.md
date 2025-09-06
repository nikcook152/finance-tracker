# Personal Finance Tracker

A private, self-hostable web application for tracking personal income and expenses. This project is designed with a security-first mindset, utilizing end-to-end encryption to ensure that your financial data remains completely private and accessible only to you.

## Key Features

* **Transaction Tracking:** Log your income and expenses with titles, amounts, dates, and categories.
* **Full CRUD History:** View, edit, and delete any transaction from your history.
* **Analytics Page:** A dedicated page with charts and summaries for balance over time, expenses by category and monthly summaries.
* **Adjustable Savings Goal:** Set a monthly savings goal and track your progress. The goal is stored historically, so changing it won't affect past analytics.
* **Data Import:** A script to bulk-import transactions from a CSV file.

---

## 🔒 Security Model: End-to-End Encryption

The core security feature of this application is that **your sensitive financial data is never stored in a readable format on the server**. All encryption and decryption happen exclusively in your browser.

Here's how it works:
1.  **Master Password:** When you register, your password becomes your master key. It is **never** sent to the server.
2.  **Key Derivation:** In your browser, a strong encryption key is derived from your master password using a secure algorithm. This key never leaves your device.
3.  **Client-Side Encryption:** Before a transaction is saved, all sensitive details (like the title and amount) are encrypted in your browser using this key.
4.  **Secure Storage:** The server receives and stores only this encrypted "blob" of data. It has no way of reading what's inside.
5.  **Client-Side Decryption:** When you log in and view your data, the encrypted blobs are sent back to your browser, where they are decrypted locally for you to see.

This model ensures that neither the hosting provider, nor a database administrator, nor any third party can ever access your personal financial details.

---

## 🛠️ Tech Stack

This project is built with a modern, reliable, and open-source stack.

* **Frontend:** **SvelteKit** & **TypeScript** for a fast, reactive, and type-safe user interface.
* **Backend:** **NestJS** & **TypeScript** for a robust and scalable API structure.
* **Database:** **PostgreSQL** for reliable and powerful data storage.
* **ORM:** **Prisma** for type-safe database access and easy migrations.
* **Deployment & Infrastructure:**
    * **Docker & Docker Compose:** The entire application is containerized for portability and simple, repeatable deployments.
    * **Nginx:** Used as a high-performance reverse proxy to manage traffic to the frontend and backend services.

---

## 🚀 Deployment

The entire application is designed to be deployed on a single VPS with Docker and Docker Compose installed.

### Prerequisites

* A Linux VPS (e.g., from IONOS, DigitalOcean, etc.).
* **Docker** and **Docker Compose** installed on the VPS.
* **Git** installed on the VPS.
* A firewall (like `ufw`) configured.

### Step-by-Step Guide

1.  **Clone the Repository**
    SSH into your VPS and clone this repository.
    ```bash
    git clone https://github.com/nikcook152/finance-tracker.git
    cd finance-tracker
    ```

2.  **Create Environment File**
    Create a `.env` file in the root of the project. You can copy the example file to get started.
    ```bash
    cp .env.example .env
    ```
    Now, edit the `.env` file and fill in your desired database credentials. **Use a strong, unique password for `DB_PASSWORD`**.

3.  **Open Firewall Port**
    Allow incoming web traffic on the standard HTTP port.
    ```bash
    sudo ufw allow 80
    ```

4.  **Build and Launch**
    Run the following command from the project root. This will build the frontend and backend images, start all containers, and apply any pending database migrations automatically.
    ```bash
    docker compose up --build -d
    ```

Your application is now live! You can access it by navigating to `http://<your_vps_ip>` in your web browser.

### Future Deployments

To deploy any new changes you've pushed to the repository, simply SSH into your VPS, pull the latest code, and run the same command again:
```bash
git pull
docker compose up --build -d
```

---

## 📥 Data Import

This project includes a Python script to bulk-import transactions from a CSV file. This is useful for migrating from another finance tracking system.

### 1. Prepare Your CSV File

Create a CSV file with the following columns:

*   `Title`: A description of the transaction (e.g., "Groceries", "Salary").
*   `Amount`: The transaction amount.
*   `Date`: The date of the transaction in `DD.MM.YYYY` format.
*   `Category`: The category of the transaction (e.g., "Food", "Work").
*   `Expense/Income`: Must be either `Expense` or `Income`.

**Example `transactions.csv`:**
```csv
Title,Amount,Date,Category,Expense/Income
"Monthly Salary",3000,01.08.2025,Work,Income
"Supermarket",75.50,02.08.2025,Food,Expense
"Internet Bill",50,05.08.2025,Utilities,Expense
```

### 2. Run the Import Script

The script requires Python 3 and the `requests` library.

1.  **Install Dependencies:**
    Navigate to the `scripts` directory and install the required library.
    ```bash
    cd scripts
    pip install -r requirements.txt
    ```

2.  **Execute the Script:**
    Run the script from within the `scripts` directory, providing your application username, password, and the path to your CSV file.

    > **Note:** The script assumes the application is running and accessible at `http://localhost`. If you are running it from a different machine, you may need to edit the `API_URL` in `import_transactions.py`.

    ```bash
    python import_transactions.py <your_username> <your_password> <path_to_your_csv_file>
    ```
    For example:
    ```bash
    python import_transactions.py myuser mypassword ../transactions.csv
    ```

The script will log you in, and then go through the CSV file row by row to import each transaction.
