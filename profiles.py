"""Supplier profile management.

Each supplier profile defines how to extract table data from their PDFs:
- headers: list of column names (in order)
- header_marker: text that marks the start of the table data
- stop_marker: text that marks the end of the table data (optional)
- ocr: whether the PDF needs OCR (scanned documents)
"""

import json
from dataclasses import dataclass, field, asdict
from pathlib import Path

PROFILES_DIR = Path(__file__).parent / "profiles"


@dataclass
class SupplierProfile:
    name: str
    headers: list[str]
    header_marker: str
    stop_marker: str = ""
    ocr: bool = False

    def to_dict(self) -> dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict) -> "SupplierProfile":
        return cls(
            name=data["name"],
            headers=data["headers"],
            header_marker=data["header_marker"],
            stop_marker=data.get("stop_marker", ""),
            ocr=data.get("ocr", False),
        )


def _profile_path(name: str) -> Path:
    safe = "".join(c if c.isalnum() or c in " -_" else "_" for c in name).strip()
    return PROFILES_DIR / f"{safe}.json"


def save_profile(profile: SupplierProfile) -> None:
    PROFILES_DIR.mkdir(exist_ok=True)
    _profile_path(profile.name).write_text(
        json.dumps(profile.to_dict(), ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def load_profile(name: str) -> SupplierProfile | None:
    path = _profile_path(name)
    if not path.exists():
        return None
    data = json.loads(path.read_text(encoding="utf-8"))
    return SupplierProfile.from_dict(data)


def list_profiles() -> list[SupplierProfile]:
    if not PROFILES_DIR.exists():
        return []
    profiles = []
    for f in sorted(PROFILES_DIR.glob("*.json")):
        data = json.loads(f.read_text(encoding="utf-8"))
        profiles.append(SupplierProfile.from_dict(data))
    return profiles


def delete_profile(name: str) -> bool:
    path = _profile_path(name)
    if path.exists():
        path.unlink()
        return True
    return False
