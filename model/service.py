from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Optional
from classifier import ZeroShotClassifier
from standards_labels import SENSITIVE_LABELS_BY_STANDARD

app = FastAPI(title="Zero-shot DSPM service")
clf = ZeroShotClassifier()

# ===== Models =====
class TextRequest(BaseModel):
    text: str
    labels: Optional[List[str]] = None

class StandardRequest(BaseModel):
    text: str
    standard: Optional[str] = None  # PCI_DSS / HIPAA / GDPR / ...

class ESClassifyRequest(BaseModel):
    index: str
    query: Optional[dict] = None
    size: Optional[int] = 100
    text_field: Optional[str] = "content"
    labels: Optional[List[str]] = None
    update_index: Optional[bool] = False

class ESStandardRequest(BaseModel):
    index: str
    query: Optional[dict] = None
    size: Optional[int] = 100
    text_field: Optional[str] = "content"
    standard: Optional[str] = None
    update_index: Optional[bool] = False

# ===== APIs =====

@app.post("/classify")
async def classify(req: TextRequest):
    labels = req.labels or SENSITIVE_LABELS_BY_STANDARD
    res = clf.classify_text(req.text, label_keys=labels)
    return {"result": res}

@app.post("/classify_by_standard")
async def classify_by_standard(req: StandardRequest):
    res = clf.classify_by_standard(req.text, req.standard)
    return res