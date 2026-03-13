"""
Transaction Import Script for Finance Tracker

This script imports transactions from a CSV file into your finance tracker.
It is compatible with the E2E encryption feature by encrypting transaction data
client-side before sending to the API, using the same parameters as the frontend.

Usage:
    python import_transactions.py <file_path> -u <username> -p <password> -e <email>

Required CSV format (tab-separated):
    Date    Title   Amount Category    Expense/Income
    01.01.2024  Grocery Shopping  -50.00  Food   Expense

SECURITY NOTE:
- API_URL should be set via environment variable
- Credentials should be entered interactively or via environment variables
- Avoid passing credentials as command-line arguments (visible in process list)
- The email is used to derive the encryption salt (same as frontend)
"""

import csv
import requests
import os
import getpass
import json
import base64
from datetime import datetime
from dotenv import load_dotenv

# Import cryptography library for E2E encryption
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.backends import default_backend

# Load environment variables from .env file if present
load_dotenv()

# Get API URL from environment variable with fallback
API_URL = os.environ.get('FINANCE_API_URL', 'http://localhost:8090/api')

# ============================================================
# E2E Encryption - Constants matching frontend crypto.ts
# ============================================================
PBKDF2_ITERATIONS = 100000
SALT_LENGTH = 16  # 128 bits
IV_LENGTH = 12    # 96 bits for AES-GCM
KEY_LENGTH = 32   # 256 bits (AES-256)


def generate_salt() -> bytes:
    """Generate a cryptographically secure random salt."""
    return os.urandom(SALT_LENGTH)


def salt_to_base64(salt: bytes) -> str:
    """Convert salt bytes to base64 string."""
    return base64.b64encode(salt).decode('ascii')


def base64_to_salt(base64_str: str) -> bytes:
    """Convert base64 string back to salt bytes."""
    return base64.b64decode(base64_str)


def derive_key(password: str, salt: bytes) -> bytes:
    """
    Derive an encryption key from a password using PBKDF2.
    This matches the frontend's deriveKey function using Web Crypto API.
    """
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=KEY_LENGTH,
        salt=salt,
        iterations=PBKDF2_ITERATIONS,
        backend=default_backend()
    )
    return kdf.derive(password.encode('utf-8'))


def encrypt_data(plaintext: str, key: bytes) -> tuple[str, str]:
    """
    Encrypt data using AES-GCM.
    Returns (ciphertext_base64, iv_base64) tuple.
    This matches the frontend's encrypt function.
    """
    # Generate random IV
    iv = os.urandom(IV_LENGTH)
    
    # Create AES-GCM cipher
    aesgcm = AESGCM(key)
    
    # Encrypt the data
    ciphertext = aesgcm.encrypt(iv, plaintext.encode('utf-8'), None)
    
    # Encode to base64
    ciphertext_b64 = base64.b64encode(ciphertext).decode('ascii')
    iv_b64 = base64.b64encode(iv).decode('ascii')
    
    return ciphertext_b64, iv_b64


def encrypt_transaction_data(title: str, amount: float, category: str, key: bytes) -> tuple[str, str]:
    """
    Encrypt transaction data (title, amount, category) into a single encrypted payload.
    Returns (encryptedData, iv) for the API.
    """
    # Create JSON object matching frontend's EncryptedTransactionData
    data = {
        "title": title,
        "amount": amount,
        "category": category
    }
    
    # Encrypt the JSON string
    return encrypt_data(json.dumps(data), key)


# ============================================================
# Authentication & Import Functions
# ============================================================

def login(session, username, password):
    """Authenticate and get session with cookies."""
    try:
        response = session.post(
            f'{API_URL}/auth/login', 
            json={'email': username, 'password': password},
        )
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"Error during login: {e}")
        return None


def get_or_create_salt(email: str) -> bytes:
    """
    Get or create a salt for the user.
    In a real implementation, this would check localStorage equivalent.
    For the import script, we generate a new salt and store it locally.
    
    NOTE: If you've already used the app, your salt is stored in your browser's
    localStorage. You can retrieve it by:
    1. Opening browser DevTools (F12)
    2. Going to Application tab > Local Storage
    3. Looking for key 'finance_tracker_salt_<your_email>'
    
    If found, you can set FINANCE_SALT env var with the base64-encoded salt.
    """
    # Check for existing salt in environment variable
    salt_b64 = os.environ.get('FINANCE_SALT')
    if salt_b64:
        print("Using salt from FINANCE_SALT environment variable")
        return base64_to_salt(salt_b64)
    
    # Check for salt file (created by previous run)
    salt_file = f".salt_{email.replace('@', '_at_')}"
    if os.path.exists(salt_file):
        with open(salt_file, 'r') as f:
            salt_b64 = f.read().strip()
            print(f"Loaded salt from {salt_file}")
            return base64_to_salt(salt_b64)
    
    # Generate new salt and save it
    salt = generate_salt()
    salt_b64 = salt_to_base64(salt)
    with open(salt_file, 'w') as f:
        f.write(salt_b64)
    print(f"Generated new salt and saved to {salt_file}")
    print(f"IMPORTANT: If using the web interface, you may need to clear localStorage")
    print(f"           or export your salt: {salt_b64}")
    
    return salt


def import_transactions(session, file_path, email, password):
    """
    Import transactions from a CSV file with E2E encryption.
    """
    print("=" * 60)
    print("E2E Encryption Import Mode")
    print("=" * 60)
    
    # Get or create salt for this user
    salt = get_or_create_salt(email)
    
    # Derive encryption key from password and salt
    print("Deriving encryption key...")
    encryption_key = derive_key(password, salt)
    print("Encryption key derived successfully.")
    print("=" * 60)
    
    # Read CSV and import transactions
    success_count = 0
    error_count = 0
    
    with open(file_path, 'r', encoding='utf-8') as csvfile:
        reader = csv.DictReader(csvfile, delimiter='\t')
        
        for row_num, row in enumerate(reader, 1):
            try:
                # Parse date - convert from DD.MM.YYYY to YYYY-MM-DDTHH:MM:SS.sssZ
                date_str = row.get('Date', '').strip()
                date_obj = datetime.strptime(date_str, '%d.%m.%Y')
                formatted_date = date_obj.isoformat() + 'Z'
                
                # Parse amount - replace comma with period and remove currency symbols
                amount_str = row.get('Amount', '0').replace(',', '.').replace('€', '').replace('$', '').strip()
                amount = float(amount_str)
                
                # Get title and category
                title = row.get('Title', '').strip()
                category = row.get('Category', 'Uncategorized').strip()
                
                if not title:
                    print(f"Row {row_num}: Skipping - missing title")
                    error_count += 1
                    continue
                
                # Determine transaction type
                type_str = row.get('Expense/Income', 'EXPENSE').strip().upper()
                if type_str in ['EXPENSE', 'INCOME']:
                    transaction_type = type_str
                elif type_str.lower() in ['expense', 'e']:
                    transaction_type = 'EXPENSE'
                elif type_str.lower() in ['income', 'i']:
                    transaction_type = 'INCOME'
                else:
                    transaction_type = 'EXPENSE'  # Default
                
                # Encrypt the sensitive data (title, amount, category)
                encrypted_data, iv = encrypt_transaction_data(
                    title, 
                    abs(amount) if transaction_type == 'INCOME' else amount,
                    category,
                    encryption_key
                )
                
                # Build API payload (matching CreateTransactionDto)
                transaction_payload = {
                    'encryptedData': encrypted_data,
                    'iv': iv,
                    'date': formatted_date,
                    'type': transaction_type
                }
                
                # Send to API
                response = session.post(
                    f'{API_URL}/transactions',
                    json=transaction_payload
                )
                response.raise_for_status()
                
                print(f"Row {row_num}: Successfully imported - {title}")
                success_count += 1
                
            except requests.exceptions.RequestException as e:
                print(f"Row {row_num}: Error importing '{row.get('Title', 'unknown')}': {e}")
                error_count += 1
            except (ValueError, KeyError) as e:
                print(f"Row {row_num}: Data error in row {row}: {e}")
                error_count += 1
            except Exception as e:
                print(f"Row {row_num}: Unexpected error: {e}")
                error_count += 1
    
    # Print summary
    print("=" * 60)
    print(f"Import complete: {success_count} succeeded, {error_count} failed")
    print("=" * 60)
    
    return success_count, error_count


if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(
        description='Import transactions from a CSV file with E2E encryption.',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python import_transactions.py transactions.csv -u user@example.com -p mypass -e user@example.com
  python import_transactions.py transactions.csv  # Interactive mode

CSV Format (tab-separated):
  Date<Title<Amount<Category<Expense/Income
  01.01.2024<Grocery Shopping<-50.00<Food<Expense

Note: The email is used to derive the encryption salt (must match your web interface email).
If you get decryption errors, your salt may be different - check FINANCE_SALT environment variable.
        """
    )
    parser.add_argument('file_path', help='Path to the CSV file')
    parser.add_argument('--username', '-u', help='Your application username/email (or set FINANCE_USERNAME env var)')
    parser.add_argument('--password', '-p', help='Your application password (or set FINANCE_PASSWORD env var)')
    parser.add_argument('--email', '-e', help='Your email (required for encryption salt - or set FINANCE_EMAIL env var)')
    parser.add_argument('--api-url', help='API URL (or set FINANCE_API_URL env var)')

    args = parser.parse_args()

    # Get API URL from args or environment
    if args.api_url:
        API_URL = args.api_url
    else:
        API_URL = os.environ.get('FINANCE_API_URL', 'http://localhost:8090/api')

    # Get credentials from args or environment, or prompt
    username = args.username or os.environ.get('FINANCE_USERNAME')
    password = args.password or os.environ.get('FINANCE_PASSWORD')
    email = args.email or os.environ.get('FINANCE_EMAIL')

    if not username:
        username = input("Enter username/email: ")
    if not password:
        password = getpass.getpass("Enter password: ")
    if not email:
        email = os.environ.get('FINANCE_EMAIL')
        if not email:
            email = input("Enter email (for encryption salt): ")

    # Create session for cookie management
    session = requests.Session()

    print(f"Attempting to log in to {API_URL}...")
    result = login(session, username, password)

    if result:
        print("Login successful. Starting import...")
        import_transactions(session, args.file_path, email, password)
        print("Import process finished.")
    else:
        print("Login failed. Cannot proceed with import.")