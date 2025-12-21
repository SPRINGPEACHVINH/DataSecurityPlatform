# standards_labels.py
# Optimized label hypotheses for zero-shot classification (XNLI)

SENSITIVE_LABELS_BY_STANDARD = {

    "Personal-Identity":
        "This text contains personal identity information such as a person's full name, date of birth, gender, national identification number (CCCD/CMND), or passport number.",

    "Contact-Info":
        "This text contains personal contact information such as phone numbers, email addresses, home addresses, mailing addresses, or social media account details.",

    "Financial-Info":
        "This text contains financial or payment-related information such as bank account numbers, credit or debit card numbers, transaction histories, invoices, or billing details.",

    "Health-Info":
        "This text contains medical or health-related information including diseases, medical conditions, diagnoses, laboratory test results, prescriptions, or treatment records.",

    "Credentials":
        "This text contains authentication or security credentials such as passwords, one-time passwords (OTP), private keys, API keys, access tokens, or secret credentials.",

    "Location-Info":
        "This text contains precise or historical location information such as GPS coordinates, IP-based location data, real-time location, or movement and travel history.",

    "Biometric-Info":
        "This text contains biometric identifiers such as fingerprints, facial recognition data, iris scans, retina scans, or voice recognition information.",

    "Employment-Info":
        "This text contains employment or education-related information such as job titles, employer names, salary details, employee identifiers, student IDs, or academic records.",

    "Legal-Info":
        "This text contains legal or contractual information such as contracts, agreements, legal documents, court records, lawsuits, or compliance-related materials.",

    "Device-System-Info":
        "This text contains device or system-related identifiers such as IP addresses, MAC addresses, device IDs, system logs, authentication logs, or hardware fingerprints.",
        
    "Technical-Content":
        "This text contains technical content such as source code, shell commands, configuration scripts, software installation instructions, or system administration commands.",

    "Non-sensitive":
        "This text contains only general, technical, or informational content and does not include any personal, financial, health, or confidential data."
}

DEFAULT_LABEL_KEYS = list(SENSITIVE_LABELS_BY_STANDARD.keys())
