import csv
import requests
import argparse
from datetime import datetime

# Define the API endpoint
API_URL = 'http://localhost/api'

def login(username, password):
    """Authenticate and get a JWT token."""
    try:
        response = requests.post(f'{API_URL}/auth/login', json={'username': username, 'password': password})
        response.raise_for_status()
        return response.json().get('access_token')
    except requests.exceptions.RequestException as e:
        print(f"Error during login: {e}")
        return None

def import_transactions(token, file_path):
    """Import transactions from a CSV file."""
    if not token:
        print("Authentication token is missing. Cannot proceed.")
        return

    headers = {'Authorization': f'Bearer {token}'}

    with open(file_path, 'r', encoding='utf-8') as csvfile:
        reader = csv.DictReader(csvfile)
        for row in reader:
            try:
                # Convert date from DD.MM.YYYY to YYYY-MM-DDTHH:MM:SS.sssZ
                date_obj = datetime.strptime(row['Date'], '%d.%m.%Y')
                formatted_date = date_obj.isoformat() + 'Z'

                transaction_data = {
                    'title': row['Title'],
                    'amount': float(row['Amount']),
                    'date': formatted_date,
                    'category': row['Category'],
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
