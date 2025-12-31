# standards_labels.py
# Optimized label hypotheses for zero-shot classification (XNLI)

SENSITIVE_LABELS_BY_STANDARD = {

    "Personal-Info":
        (
            "This text contains personal identity information such as a person's full name, date of birth, gender, "
            "national identification number (CCCD/CMND), passport number, social security number, or driver's license number."
        ),

    "Financial-Info":
        (
            "This text contains financial or payment-related information such as bank account numbers, credit or debit card numbers, "
            "transaction histories, invoices, billing details, SWIFT codes, or IBAN numbers."
        ),

    "Health-Info":
        (
            "This text contains medical or health-related information including diseases, medical conditions, diagnoses, "
            "laboratory test results, prescriptions, medications, treatment records, or healthcare provider information."
        ),

    "Credentials":
        (
            "This text contains authentication or security credentials such as passwords, one-time passwords (OTP), private keys, "
            "API keys, access tokens, secret credentials, SSH keys, or SSL certificates."
        ),

    "System-Info":
        (
            "This text contains device or system-related identifiers such as IP addresses, MAC addresses, device IDs, IMEI numbers, "
            "system logs, authentication logs, GPS coordinates, or hardware fingerprints."
        ),

    "Non-sensitive":
        (
            "This text contains only publicly available, general information, news, documentation, or instructions "
            "that does not reveal or expose any personal identities, financial details, health conditions, "
            "biometric data, authentication credentials, system identifiers, or any other confidential information."
        )
}

DEFAULT_LABEL_KEYS = list(SENSITIVE_LABELS_BY_STANDARD.keys())