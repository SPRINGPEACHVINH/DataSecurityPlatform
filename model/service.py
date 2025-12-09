from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Optional
from classifier import ZeroShotClassifier
from es_client import get_es_client, fetch_docs, update_doc
from config import DEFAULT_LABELS
from standards_labels import SENSITIVE_LABELS_BY_STANDARD

app = FastAPI(title="Zero-shot DSPM service")
clf = ZeroShotClassifier()
es = get_es_client()

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
    labels = req.labels or DEFAULT_LABELS
    res = clf.classify_text(req.text, label_keys=labels)
    return {"result": res}

@app.post("/classify_by_standard")
async def classify_by_standard(req: StandardRequest):
    res = clf.classify_by_standard(req.text, req.standard)
    return res

@app.post("/classify_from_es")
async def classify_from_es(req: ESClassifyRequest):
    docs = fetch_docs(es, req.index, req.query, size=req.size)
    results = []
    for d in docs:
        text = d["_source"].get(req.text_field, "")
        if not text:
            continue
        res = clf.classify_text(text, label_keys=req.labels)
        item = {"id": d["_id"], "labels": res["labels"], "scores": res["scores"]}
        results.append(item)
        if req.update_index:
            update_doc(es, req.index, d["_id"], {"sensitive_labels": item})
    return {"count": len(results), "results": results}

@app.post("/classify_from_es_standard")
async def classify_from_es_standard(req: ESStandardRequest):
    docs = fetch_docs(es, req.index, req.query, size=req.size)
    results = []
    for d in docs:
        text = d["_source"].get(req.text_field, "")
        if not text:
            continue
        res = clf.classify_by_standard(text, req.standard)
        item = {
            "id": d["_id"],
            "standard": req.standard,
            "labels": res["labels"],
            "scores": res["scores"]
        }
        results.append(item)
        if req.update_index:
            update_doc(es, req.index, d["_id"], {"sensitive_labels": item})
    return {"count": len(results), "results": results}
