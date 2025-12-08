# standards_labels.py
# MAPPING: key -> descriptive hypothesis (model sẽ nhận mô tả này)
# Lưu ý: mô tả nên viết ngắn gọn, rõ nghĩa, ở dạng câu hoàn chỉnh

SENSITIVE_LABELS_BY_STANDARD = {
    "Personal-Identity": "Personal identity information such as full name, national ID, CCCD/CMND, passport number.",
    "Contact-Info": "Contact information such as phone number, email address, home address.",
    "Financial-Info": "Financial information such as bank account, credit card number, transactions.",
    "Health-Info": "Medical or health-related information such as diseases, medical results, prescriptions, or treatment records.",
    "Credentials": "Authentication credentials such as passwords, OTP codes, API keys, or login tokens.",
    "Location-Info": "Location or tracking information such as GPS coordinates, real-time location, or movement history.",
    "Biometric-Info": "Biometric identifiers such as fingerprints, facial data, retina scan, or voice patterns.",
    "Non-sensitive": "The text does not contain any sensitive information."
}

DEFAULT_LABEL_KEYS = list(SENSITIVE_LABELS_BY_STANDARD.keys())

