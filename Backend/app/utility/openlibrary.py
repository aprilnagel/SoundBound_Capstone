import requests

BASE_WORK_URL = "https://openlibrary.org/works/{work_key}.json"


def fetch_openlibrary_work(openlib_work_key: str):
    """
    Fetch metadata for a book from the Open Library Works API.
    Returns a normalized dict or None if the request fails.
    """

    url = BASE_WORK_URL.format(work_key=openlib_work_key)
    resp = requests.get(url, headers={"User-Agent": "YourApp/1.0"})

    if resp.status_code != 200:
        return None

    data = resp.json()

    return {
        "title": data.get("title"),
        "description": extract_description(data),
        "subjects": data.get("subjects", []),
        "openlib_work_key": openlib_work_key
    }


def extract_description(data):
    """
    Open Library descriptions can be:
    - a string
    - an object with a 'value' field
    - missing entirely
    """
    desc = data.get("description")

    if isinstance(desc, str):
        return desc

    if isinstance(desc, dict):
        return desc.get("value")

    return None