from transformers import pipeline
from standards_labels import SENSITIVE_LABELS_BY_STANDARD, DEFAULT_LABEL_KEYS
import langdetect
import torch


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

        try:
            lang = langdetect.detect(text)
        except:
            lang = "unknown"

        print(f"Detected language: {lang}")

        label_keys, candidates = self._build_candidates(label_keys)

        chunks = self.split_text(text)
        all_scores = []

        for chunk in chunks:
            res = self.pipe(
                sequences=chunk,
                candidate_labels=candidates,
                multi_label=True,
                hypothesis_template="This text contains {}."
            )

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


        final.sort(key=lambda x: x[1], reverse=True)
        if final[0][0] != "Non-sensitive":
            final = [x for x in final if x[0] != "Non-sensitive"]

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

