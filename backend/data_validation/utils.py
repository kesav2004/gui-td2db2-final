import csv

def generate_csv_from_request(data):
    file_path = 'input.csv'
    with open(file_path, mode='w', newline='') as file:
        writer = csv.writer(file)
        headers = ['table', 'keys', 'predicate', 'include_fields', 'groupby_fields']
        writer.writerow(headers)
        row = [
            f"{data['source_schema']}.{data['source_table']}",
            data['keys'],
            data.get('predicate', ''),
            ",".join(data.get('include_fields', [])),
            ",".join(data.get('groupby_fields', []))
        ]
        writer.writerow(row)
    return file_path
