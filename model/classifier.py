from transformers import pipeline
from standards_labels import SENSITIVE_LABELS_BY_STANDARD, DEFAULT_LABEL_KEYS
import langdetect
import torch
import re
import time

MODEL_MULTI = "joeddav/xlm-roberta-large-xnli"


class ZeroShotClassifier:
    def __init__(self, threshold=0.18):
        print("Loading multilingual zero-shot model (supports EN + VI)...")
        self.pipe = pipeline(
            "zero-shot-classification",
            model=MODEL_MULTI,
            device=0 if torch.cuda.is_available() else -1
        )
        self.threshold = threshold

    def _build_candidates(self, label_keys):
        if not label_keys:
            label_keys = DEFAULT_LABEL_KEYS
        candidates = [SENSITIVE_LABELS_BY_STANDARD[k] for k in label_keys]
        return label_keys, candidates

    def classify_text(self, text, label_keys=None):
        start_time = time.time()
        
        # if self._is_technical_narrative(text):
        #     return {
        #         "sequence": text[:2000],
        #         "labels": ["Technical-Content"],
        #         "scores": [0.95],
        #         "chunks": 1,
        #         "source": "rule-based-narrative"
        #     }

        # if self._is_technical_content(text):
        #     return {
        #         "sequence": text[:2000],
        #         "labels": ["Technical-Content"],
        #         "scores": [1.0],
        #         "chunks": 1,
        #         "source": "rule-based-code"
        #     }

        try:
            lang = langdetect.detect(text)
        except:
            lang = "unknown"

        print(f"Detected language: {lang}")

        label_keys, candidates = self._build_candidates(label_keys)

        chunks = self.split_text(text)
        print(f"[TIMER] Text split into {len(chunks)} chunks")
        all_scores = []

        for idx, chunk in enumerate(chunks):
            chunk_start = time.time()
            res = self.pipe(
                sequences=chunk,
                candidate_labels=candidates,
                multi_label=True,
                hypothesis_template="This text contains {}."
            )
            chunk_time = time.time() - chunk_start
            print(f"[TIMER] Chunk {idx+1}/{len(chunks)} processed in {chunk_time:.3f}s")

            desc_to_key = {SENSITIVE_LABELS_BY_STANDARD[k]: k for k in label_keys}

            for desc, score in zip(res["labels"], res["scores"]):
                key = desc_to_key.get(desc, desc)
                all_scores.append((key, score))

        merged = {}
        for k, s in all_scores:
            merged[k] = max(merged.get(k, 0), s)

        final = [(k, s) for k, s in merged.items() if s >= self.threshold]

        if not final:
            if merged:
                final = [max(merged.items(), key=lambda x: x[1])]
            else:
                final = [("Non-sensitive", 0.0)]

        # Check if Non-sensitive is highest or no sensitive label >= 0.85
        non_sensitive_score = None
        sensitive_labels = []
        
        for label, score in final:
            if label == "Non-sensitive":
                non_sensitive_score = score
            else:
                sensitive_labels.append((label, score))
        
        # If Non-sensitive is highest or no sensitive label >= 0.85, use Non-sensitive
        if non_sensitive_score is not None:
            max_sensitive_score = max([s for _, s in sensitive_labels], default=0)
            if non_sensitive_score >= max_sensitive_score or max_sensitive_score < 0.85:
                final = [("Non-sensitive", non_sensitive_score)]
            else:
                # Remove Non-sensitive if sensitive labels are stronger
                final = sensitive_labels
        
        # If still no sensitive labels >= 0.85, classify as Non-sensitive
        if not final or (final[0][0] != "Non-sensitive" and final[0][1] < 0.85):
            final = [("Non-sensitive", final[0][1] if final else 0.0)]

        final.sort(key=lambda x: x[1], reverse=True)

        total_time = time.time() - start_time
        print(f"[TIMER] Total classification time: {total_time:.3f}s - Labels: {final[0][0]} (score: {final[0][1]:.4f})")

        return {
            "sequence": text[:2000] + ("..." if len(text) > 2000 else ""),
            "labels": [k for k, _ in final],
            "scores": [s for _, s in final],
            "chunks": len(chunks)
        }


    def classify_batch(self, texts, label_keys=None):
        results = []
        for t in texts:
            results.append(self.classify_text(t, label_keys))
        return results

    def classify_by_standard(self, text, standard=None):
        if standard and standard in SENSITIVE_LABELS_BY_STANDARD:
            keys = [standard, "Non-sensitive"]
        else:
            keys = None
        return self.classify_text(text, keys)
    
    def split_text(self, text, max_words=350): 
        words = text.split()
        chunks = []
        for i in range(0, len(words), max_words):
            chunk = " ".join(words[i:i + max_words])
            chunks.append(chunk)
        return chunks

    # def _is_technical_content(self, text: str) -> bool:
    #     patterns = [
    #         r"^sudo\s+",                       
    #         r"\bapt\s+(install|update|upgrade)\b",
    #         r"\byum\s+install\b",
    #         r"\bpip(\d*)\s+install\b",
    #         r"\bnpm\s+(install|run)\b",
    #         r"\byarn\s+(add|install)\b",
    #         r"\bdocker\s+(run|build|pull|push)\b",
    #         r"\bkubectl\b",
    #         r"\bpython\d*\b",
    #         r"\bnode\b",
    #         r"\bjava\b",
    #         r"#!/bin/(bash|sh)",
    #         r"\.sh\b",
    #         r"\.py\b",
    #         r"\.js\b",
    #         r"\.yml\b|\.(yaml)",
    #         r"&&|\|\|",                        
    #         r"https?://\S+",                   
    #     ]
    #     for pattern in patterns:
    #         if re.search(pattern, text, re.IGNORECASE | re.MULTILINE):
    #             return True
    #     return False
    
    # def _is_technical_narrative(self, text: str) -> bool:
    #     patterns = [
    #         r"\blệnh\s+sudo\b",
    #         r"\blệnh\s+apt\b",
    #         r"\blệnh\s+pip\b",
    #         r"\blệnh\s+docker\b",
    #         r"\blệnh\s+git\b",
    #         r"\bcâu\s+lệnh\b",
    #         r"\bchạy\s+lệnh\b",
    #         r"\bcài\s+đặt\b.*\b(phần mềm|python|pip)\b",
    #     ]
    #     for pattern in patterns:
    #         if re.search(pattern, text, re.IGNORECASE):
    #             return True
    #     return False

