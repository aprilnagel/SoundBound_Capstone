import requests

BASE_WORK_URL = "https://openlibrary.org/works/{work_key}.json"
BASE_EDITIONS_URL = "https://openlibrary.org/works/{work_key}/editions.json?limit=50"
BASE_AUTHOR_URL = "https://openlibrary.org/authors/{author_key}.json"


def fetch_openlibrary_work(openlib_work_key: str):
    """
    Fetch full metadata for a book from Open Library by merging:
    - Work API (subjects, description, covers, author keys)
    - Edition API (ISBNs, author names, publish year)
    - Author API (fallback for author names)

    Always normalizes the work key so it accepts:
    - "OL82563W"
    - "/works/OL82563W"
    """

    # -------------------------
    # Normalize Work ID
    # -------------------------
    openlib_work_key = openlib_work_key.split("/")[-1]

    # -------------------------
    # 1. Fetch Work metadata
    # -------------------------
    work_url = BASE_WORK_URL.format(work_key=openlib_work_key)
    resp = requests.get(work_url, headers={"User-Agent": "YourApp/1.0"})

    if resp.status_code != 200:
        return None

    work = resp.json()

    # Normalize description
    description = extract_description(work)

    # Extract subjects
    subjects = work.get("subjects", [])

    # Extract cover ID (WORK covers)
    covers = work.get("covers") or []
    cover_id = covers[0] if covers else None

    # Extract author keys
    author_keys = [
        a["author"]["key"].split("/")[-1]
        for a in work.get("authors", [])
        if "author" in a and "key" in a["author"]
    ]

    # -------------------------
    # 2. Fetch Edition metadata
    # -------------------------
    edition_url = BASE_EDITIONS_URL.format(work_key=openlib_work_key)
    ed_resp = requests.get(edition_url, headers={"User-Agent": "YourApp/1.0"})

    edition_data = {}
    if ed_resp.status_code == 200:
        editions = ed_resp.json().get("entries", [])

        # Prefer editions with ISBNs
        for ed in editions:
            isbn_list = ed.get("isbn_13") or ed.get("isbn_10")
            if isbn_list:
                edition_data = ed
                break

        # Fallback to first edition
        if not edition_data and editions:
            edition_data = editions[0]

    # -------------------------
    # 2b. Edition cover fallback (NOW edition_data exists)
    # -------------------------
    if not cover_id:
        ed_covers = edition_data.get("covers") or []
        if ed_covers:
            cover_id = ed_covers[0]

    # Extract ISBNs
    isbn_list = edition_data.get("isbn_13") or edition_data.get("isbn_10") or []

    # Extract publish year
    publish_year = edition_data.get("publish_date")

    # Extract author names from edition (if present)
    edition_author_names = []
    if "authors" in edition_data:
        for a in edition_data["authors"]:
            if "name" in a:
                edition_author_names.append(a["name"])

    # -------------------------
    # 3. Fallback: Fetch author names from Author API
    # -------------------------
    if not edition_author_names:
        edition_author_names = fetch_author_names(author_keys)

    # -------------------------
    # 4. Build cover URL
    # -------------------------
    cover_url = None
    if cover_id:
        cover_url = f"https://covers.openlibrary.org/b/id/{cover_id}-L.jpg"

    # -------------------------
    # 5. Return normalized metadata
    # -------------------------
    return {
        "title": work.get("title"),
        "description": description,
        "subjects": subjects,
        "author_names": edition_author_names,
        "author_keys": author_keys,
        "isbn_list": isbn_list,
        "first_publish_year": publish_year,
        "cover_id": cover_id,
        "cover_url": cover_url,
        "openlib_work_key": openlib_work_key,
        "openlib_id": openlib_work_key,
    }


def extract_description(data):
    """Normalize Open Library description field."""
    desc = data.get("description")

    if isinstance(desc, str):
        return desc

    if isinstance(desc, dict):
        return desc.get("value")

    return None


def fetch_author_names(author_keys):
    """Fetch author names from the Author API."""
    names = []

    for key in author_keys:
        url = BASE_AUTHOR_URL.format(author_key=key)
        resp = requests.get(url, headers={"User-Agent": "YourApp/1.0"})

        if resp.status_code == 200:
            data = resp.json()
            if "name" in data:
                names.append(data["name"])

    return names