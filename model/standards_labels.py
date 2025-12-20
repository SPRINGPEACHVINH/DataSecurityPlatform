# standards_labels.py
# Mapping: label_key -> descriptive hypothesis for zero-shot classification

SENSITIVE_LABELS_BY_STANDARD = {

    "Personal-Identity":
        "Personal identity information such as full name, date of birth, gender, national ID number, CCCD/CMND, or passport number.",

    "Contact-Info":
        "Contact information such as phone number, email address, home address, or social media account.",

    "Financial-Info":
        "Financial or payment information such as bank account number, credit card number, transaction details, or billing records.",

    "Health-Info":
        "Medical or health-related information such as diseases, diagnoses, medical test results, prescriptions, or treatment history.",

    "Credentials":
        "Authentication or security credentials such as passwords, OTP codes, private keys, API keys, or access tokens.",

    "Location-Info":
        "Location or tracking information such as GPS coordinates, IP-based location, real-time position, or movement history.",

    "Biometric-Info":
        "Biometric identifiers such as fingerprints, facial recognition data, iris or retina scans, or voiceprints.",

    "Employment-Info":
        "Employment or education information such as job title, company name, salary, employee ID, student ID, or academic records.",

    "Legal-Info":
        "Legal or contractual information such as contracts, agreements, lawsuits, court records, or legal disputes.",

    "Device-System-Info":
        "Device or system identifiers such as IP address, MAC address, device ID, system logs, or hardware fingerprints.",

    "Non-sensitive":
        "The text does not contain any personal, confidential, or sensitive information."
}

DEFAULT_LABEL_KEYS = list(SENSITIVE_LABELS_BY_STANDARD.keys())
