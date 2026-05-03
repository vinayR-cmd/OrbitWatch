import time
from typing import List, Dict, Optional

class TLECache:
    def __init__(self, ttl_seconds: int = 7200):  # 2 hour default
        self.ttl_seconds = ttl_seconds
        self.store = {}

    def get(self, key: str) -> list[dict] | None:
        """Return cached value if not expired, else None."""
        if key not in self.store:
            return None
            
        timestamp, value = self.store[key]
        if time.time() - timestamp > self.ttl_seconds:
            # Expired
            del self.store[key]
            return None
            
        return value

    def set(self, key: str, value: list[dict]) -> None:
        """Store value with current timestamp."""
        self.store[key] = (time.time(), value)

    def make_key(self, altitude_km: float, inclination_deg: float) -> str:
        """Round to nearest 25 for bucketing: e.g. alt=550.3 -> key='alt_550_inc_55'"""
        alt_bucket = round(altitude_km / 25.0) * 25
        inc_bucket = round(inclination_deg / 25.0) * 25
        return f"alt_{alt_bucket}_inc_{inc_bucket}"

# Module-level singleton
tle_cache = TLECache()
