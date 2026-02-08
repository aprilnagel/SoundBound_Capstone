import base64
import requests
from flask import current_app

SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token"
SPOTIFY_TRACK_URL = "https://api.spotify.com/v1/tracks/{id}"
SPOTIFY_AUDIO_FEATURES_URL = "https://api.spotify.com/v1/audio-features/{id}"
SPOTIFY_ARTIST_URL = "https://api.spotify.com/v1/artists/{id}"


# ---------------- TOKEN ---------------- #

def get_spotify_token():
    """
    Client Credentials Flow.
    Returns a valid access token or None.
    """
    client_id = current_app.config["SPOTIFY_CLIENT_ID"]
    client_secret = current_app.config["SPOTIFY_CLIENT_SECRET"]

    auth_str = f"{client_id}:{client_secret}"
    b64_auth = base64.b64encode(auth_str.encode()).decode()

    headers = {
        "Authorization": f"Basic {b64_auth}",
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "SoundBound/1.0"
    }

    data = {"grant_type": "client_credentials"}

    resp = requests.post(SPOTIFY_TOKEN_URL, headers=headers, data=data)
    if resp.status_code != 200:
        return None

    return resp.json().get("access_token")


# ---------------- TRACK METADATA ---------------- #

def fetch_spotify_track(spotify_id):
    """
    Fetch a track's metadata from Spotify.
    Returns a normalized dict or None.
    """
    token = get_spotify_token()
    if not token:
        return None

    headers = {"Authorization": f"Bearer {token}", "User-Agent": "SoundBound/1.0"}

    resp = requests.get(SPOTIFY_TRACK_URL.format(id=spotify_id), headers=headers)
    if resp.status_code != 200:
        return None

    data = resp.json()

    return {
        "title": data.get("name"),
        "artists": [a["name"] for a in data.get("artists", [])],
        "album": data.get("album", {}).get("name"),
        "preview_url": data.get("preview_url"),
        "spotify_id": spotify_id,
        "artist_ids": [a["id"] for a in data.get("artists", [])]
    }


# ---------------- AUDIO FEATURES ---------------- #

def fetch_audio_features(spotify_id):
    """
    Fetch audio features (energy, valence, tempo, etc.)
    Returns a dict or None.
    """
    token = get_spotify_token()
    if not token:
        return None

    headers = {"Authorization": f"Bearer {token}", "User-Agent": "SoundBound/1.0"}

    resp = requests.get(SPOTIFY_AUDIO_FEATURES_URL.format(id=spotify_id), headers=headers)
    if resp.status_code != 200:
        return None

    return resp.json()


# ---------------- GENRES ---------------- #

def fetch_artist_genres(artist_id):
    """
    Fetch genres for a given artist.
    Returns a list of strings.
    """
    token = get_spotify_token()
    print("TOKEN:", token)
    if not token:
        return []

    headers = {"Authorization": f"Bearer {token}", "User-Agent": "SoundBound/1.0"}

    resp = requests.get(SPOTIFY_ARTIST_URL.format(id=artist_id), headers=headers)
    if resp.status_code != 200:
        return []

    return resp.json().get("genres", [])


def fetch_genres_for_artists(artist_ids):
    """
    Fetch and merge genres for all artists on a track.
    Returns a deduplicated list.
    """
    genres = []
    for artist_id in artist_ids:
        g = fetch_artist_genres(artist_id)
        if g:
            genres.extend(g)

    return list(set(genres))