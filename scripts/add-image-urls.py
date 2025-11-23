import os
from libsql_experimental import connect

# Load environment variables
db_url = os.getenv('TURSO_DATABASE_URL')
db_token = os.getenv('TURSO_AUTH_TOKEN')

# Connect to database
conn = connect(database=db_url, auth_token=db_token)
cursor = conn.cursor()

# Query all resources with image URLs
cursor.execute("SELECT name, image_url FROM resources WHERE guild_id = 'house-melange' ORDER BY name")
resources = cursor.fetchall()

# Create mapping dictionary
image_map = {}
for row in resources:
    name, image_url = row
    if image_url:
        image_map[name] = image_url

# Print TypeScript-ready additions
print(f"Found {len(image_map)} resources with images\n")
print("Add imageUrl to each resource like this:")
print("imageUrl: '<URL>',")
print("\nHere's the mapping:\n")

for name, url in sorted(image_map.items()):
    print(f"  // {name}")
    print(f"  imageUrl: '{url}',\n")

conn.close()
