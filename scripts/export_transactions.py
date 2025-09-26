import csv
import requests
import argparse
from datetime import datetime

# Define the API endpoint
API_URL = 'http://xxx/api'

# Call: python export_transactions.py your_email@example.com your_password C:\path\to\your\exported_transactions.csv

def login(username, password):
    """Authenticate and get a JWT token."""
    try:
        response = requests.post(f'{API_URL}/auth/login', json={'email': username, 'password': password})
        response.raise_for_status()
        return response.json().get('accessToken')
    except requests.exceptions.RequestException as e:
        print(f"Error during login: {e}")
        return None

def export_transactions(token, file_path):
    """Export all transactions to a CSV file."""
    if not token:
        print("Authentication token is missing. Cannot proceed.")
        return

    headers = {'Authorization': f'Bearer {token}'}

    try:
        response = requests.get(f'{API_URL}/transactions', headers=headers)
        response.raise_for_status()
        transactions = response.json()

        with open(file_path, 'w', newline='', encoding='utf-8') as csvfile:
            fieldnames = ['Title', 'Amount', 'Date', 'Category', 'Expense/Income']
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames, delimiter='\t')

            writer.writeheader()
            for t in transactions:
                # Format date from ISO format (YYYY-MM-DDTHH:MM:SS.sssZ) to DD.MM.YYYY
                date_obj = datetime.fromisoformat(t['date'].replace('Z', '+00:00'))
                formatted_date = date_obj.strftime('%d.%m.%Y')

                # Format amount to use a comma for the decimal separator
                amount_str = str(t['amount']).replace('.', ',')

                writer.writerow({
                    'Title': t['title'],
                    'Amount': f"{amount_str} €",
                    'Date': formatted_date,
                    'Category': t['category'],
                    'Expense/Income': t['type']
                })
        
        print(f"Successfully exported {len(transactions)} transactions to {file_path}")

    except requests.exceptions.RequestException as e:
        print(f"Error exporting transactions: {e}")
    except (IOError, KeyError) as e:
        print(f"Error writing to file or processing data: {e}")


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Export transactions to a CSV file.')
    parser.add_argument('username', help='Your application username')
    parser.add_argument('password', help='Your application password')
    parser.add_argument('file_path', help='Path to the output CSV file')

    args = parser.parse_args()

    print("Attempting to log in...")
    auth_token = login(args.username, args.password)

    if auth_token:
        print("Login successful. Starting export...")
        export_transactions(auth_token, args.file_path)
        print("Export process finished.")
