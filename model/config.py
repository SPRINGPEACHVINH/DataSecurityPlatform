import os

BATCH_SIZE = int(os.getenv("BATCH_SIZE", "8"))
THRESHOLD = float(os.getenv("THRESHOLD", "0.18"))
DEFAULT_LABELS = [
    "Personal-Identity",
    "Contact-Info",
    "Financial-Info",
    "Health-Info",
    "Credentials",
    "Location-Info",
    "Biometric-Info",
    "Non-sensitive",
]
