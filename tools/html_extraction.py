"""
HTML extraction utilities for Trenfy.
Used by Steam and other web-scraped trend sources.
"""

from typing import Any
from bs4 import BeautifulSoup


def extract_text(html: str, selector: str = "body") -> str:
    """Extract visible text from HTML content using a CSS selector."""
    soup = BeautifulSoup(html, "lxml")
    element = soup.select_one(selector)
    if element is None:
        return ""
    return element.get_text(separator=" ", strip=True)


def extract_links(html: str, base_url: str = "") -> list[dict[str, str]]:
    """Extract all anchor links from HTML content."""
    soup = BeautifulSoup(html, "lxml")
    links = []
    for a in soup.find_all("a", href=True):
        href = a["href"]
        if href.startswith("/") and base_url:
            href = base_url.rstrip("/") + href
        links.append({"text": a.get_text(strip=True), "url": href})
    return links


def extract_elements(html: str, selector: str) -> list[Any]:
    """Return a list of BeautifulSoup Tag objects matching a CSS selector."""
    soup = BeautifulSoup(html, "lxml")
    return soup.select(selector)
