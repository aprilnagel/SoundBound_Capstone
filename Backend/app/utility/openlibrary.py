import requests
import re

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

    editions = []
    if ed_resp.status_code == 200:
        editions = ed_resp.json().get("entries", [])

    # -------------------------
    # ⭐ NEW LOGIC: earliest year + ALL ISBNs + latest ISBN
    # -------------------------
    earliest_year = None
    latest_year = None
    latest_isbn = None
    all_isbns = []

    for ed in editions:
        # Collect ALL ISBNs
        if ed.get("isbn_13"):
            all_isbns.extend(ed["isbn_13"])
        if ed.get("isbn_10"):
            all_isbns.extend(ed["isbn_10"])

        # Extract ANY year from this edition
        raw = ed.get("publish_date") or ed.get("first_publish_year")
        if raw:
            match = re.search(r"\b(\d{4})\b", str(raw))
            if match:
                yr = int(match.group(1))

                # Track earliest year
                if earliest_year is None or yr < earliest_year:
                    earliest_year = yr

                # Track latest year + ISBN
                if latest_year is None or yr > latest_year:
                    latest_year = yr
                    latest_isbn = (
                        (ed.get("isbn_13") or [None])[0]
                        or (ed.get("isbn_10") or [None])[0]
                    )

    # Final normalized values
    first_publish_year = earliest_year
    isbn_list = all_isbns

    # -------------------------
    # 2b. Edition cover fallback (keep your original logic)
    # -------------------------
    edition_data = editions[0] if editions else {}
    if not cover_id:
        ed_covers = edition_data.get("covers") or []
        if ed_covers:
            cover_id = ed_covers[0]

    # Extract author names from edition
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
        "isbn_list": isbn_list,              # ⭐ ALL ISBNs
        "latest_isbn": latest_isbn,          # ⭐ NEW: LATEST EDITION ISBN
        "first_publish_year": first_publish_year,  # ⭐ EARLIEST YEAR
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