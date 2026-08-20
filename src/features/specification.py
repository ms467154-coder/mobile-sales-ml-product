"""Conservative parsing for semi-structured product specification text."""
from __future__ import annotations
import re
import numpy as np


def parse_specification(text):
    """Parse only explicit hardware tokens; return missing values otherwise.

    The supplied Product Specification field is not assumed to be meaningful.
    This parser intentionally returns missing values when no documented token
    is present rather than treating arbitrary text as a categorical feature.
    """
    s = str(text)
    ram = re.search(r"(?i)\b(\d+)\s*GB\s*RAM\b|\bRAM\s*[:\-]?\s*(\d+)\s*GB", s)
    storage = re.search(r"(?i)\b(\d+(?:\.\d+)?)\s*(GB|TB)\s*(?:SSD|HDD|Storage|ROM)\b|\b(?:SSD|HDD|Storage|ROM)\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*(GB|TB)", s)
    processor = re.search(r"(?i)\b((?:intel|amd|apple|qualcomm|mediatek|snapdragon|ryzen|core\s*i\d|m\d)[^,;|()]*)", s)
    generation = re.search(r"(?i)\b(\d{1,2})(?:st|nd|rd|th)\s*Gen\b", s)
    text_lower = s.lower()
    brand = None
    for candidate in ["apple", "samsung", "oneplus", "xiaomi", "redmi", "vivo", "oppo", "realme", "motorola", "nokia", "dell", "hp", "lenovo", "asus", "acer", "msi", "infinix", "iqoo", "poco", "google", "nothing"]:
        if candidate in text_lower:
            brand = candidate
            break
    return {
        "spec_ram_gb": float(ram.group(1) or ram.group(2)) if ram else np.nan,
        "spec_storage_raw": (storage.group(1) or storage.group(3)) if storage else np.nan,
        "spec_storage_unit": (storage.group(2) or storage.group(4)).upper() if storage else "__MISSING__",
        "spec_processor_family": processor.group(1).strip()[:80] if processor else "__MISSING__",
        "spec_generation": int(generation.group(1)) if generation else np.nan,
        "spec_brand_token": brand or "__MISSING__",
    }
