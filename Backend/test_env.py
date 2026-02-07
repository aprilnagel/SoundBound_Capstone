from dotenv import load_dotenv
load_dotenv()

import os

print("ID:", os.getenv("SPOTIFY_CLIENT_ID"))
print("SECRET:", os.getenv("SPOTIFY_CLIENT_SECRET"))