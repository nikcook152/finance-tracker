"""
Transaction Import Script for Finance Tracker

⚠️  IMPORTANT: E2E Encryption Compatibility Notice ⚠️

This import script is NOT compatible with the E2E encryption feature.
With E2E encryption enabled, transaction data (title, amount, category) must be 
encrypted client-side before being sent to the API.

Options for importing transactions:
1. Use the web interface (recommended) - encryption is handled automatically
2. Temporarily disable encryption in your local development environment
3. Implement encryption in Python using the cryptography library with the same 
   parameters as the frontend (PBKDF2 with 100,000 iterations, AES-GCM)

If you need bulk import, consider:
- Creating a temporary bypass endpoint (development only)
- Using the frontend's add transaction form
- Exporting from your old system and manually entering transactions

See README.md for more details on the E2E encryption implementation.
"""

import csv
import requests
import argparse
from datetime import datetime

# Define the API endpoint
API_URL = 'http://xxx/api'

def login(username, password):
    """Authenticate and get a JWT token."""
    try:
        response = requests.post(f'{API_URL}/auth/login', json={'email': username, 'password': password})
        response.raise_for_status()
        return response.json().get('accessToken')
    except requests.exceptions.RequestException as e:
        print(f"Error during login: {e}")
        return None

def import_transactions(token, file_path):
    """
    Import transactions from a CSV file.
    
    NOTE: This function is provided for reference but will NOT work with E2E encryption.
    The backend expects 'encryptedData' and 'iv' fields instead of 'title', 'amount', 'category'.
    """
    print("=" * 60)
    print("⚠️  WARNING: E2E Encryption Incompatible")
    print("=" * 60)
    print("This script cannot import transactions with E2E encryption enabled.")
    print("Transaction data must be encrypted client-side before sending to API.")
    print("Please use the web interface to add transactions manually.")
    print("=" * 60)
    return

    # Original code below (kept for reference, will not execute)
    if not token:
        print("Authentication token is missing. Cannot proceed.")
        return

    headers = {'Authorization': f'Bearer {token}'}

    with open(file_path, 'r', encoding='utf-8') as csvfile:
        reader = csv.DictReader(csvfile, delimiter='\t')
        for row in reader:
            try:
                # Convert date from DD.MM.YYYY to YYYY-MM-DDTHH:MM:SS.sssZ
                date_obj = datetime.strptime(row['Date'], '%d.%m.%Y')
                formatted_date = date_obj.isoformat() + 'Z'

                # Replace comma with a period and remove currency symbols for float conversion
                amount_str = row['Amount'].replace(',', '.').replace('€', '')
                
                # Assign a default category if it's missing
                category = row['Category'] if row['Category'] else 'Uncategorized'

                # NOTE: This format is NOT compatible with E2E encryption
                # The API expects: { encryptedData: string, iv: string, date: string, type: string }
                transaction_data = {
                    'title': row['Title'],
                    'amount': float(amount_str),
                    'date': formatted_date,
                    'category': category,
                    'type': row['Expense/Income'].upper()
                }

                response = requests.post(f'{API_URL}/transactions', headers=headers, json=transaction_data)
                response.raise_for_status()
                print(f"Successfully imported transaction: {row['Title']}")

            except requests.exceptions.RequestException as e:
                print(f"Error importing transaction '{row['Title']}': {e}")
            except (ValueError, KeyError) as e:
                print(f"Skipping row due to data error: {row} - {e}")


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Import transactions from a CSV file.')
    parser.add_argument('username', help='Your application username')
    parser.add_argument('password', help='Your application password')
    parser.add_argument('file_path', help='Path to the CSV file')

    args = parser.parse_args()

    print("Attempting to log in...")
    auth_token = login(args.username, args.password)

    if auth_token:
        print("Login successful. Starting import...")
        import_transactions(auth_token, args.file_path)
        print("Import process finished.")