from transformers import pipeline
from standards_labels import SENSITIVE_LABELS_BY_STANDARD, DEFAULT_LABEL_KEYS
from config import BATCH_SIZE
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

        # Xác định ngôn ngữ chỉ để log
        try:
            lang = langdetect.detect(text)
        except:
            lang = "unknown"

        print(f"Detected language: {lang}")

        label_keys, candidates = self._build_candidates(label_keys)

        res = self.pipe(
            sequences=text,
            candidate_labels=candidates,
            multi_label=True,
            hypothesis_template="This text contains {}."
        )

        desc_to_key = {SENSITIVE_LABELS_BY_STANDARD[k]: k for k in label_keys}

        final = []
        for desc, score in zip(res["labels"], res["scores"]):
            key = desc_to_key.get(desc, desc)
            final.append((key, score))

        final = [x for x in final if x[1] >= self.threshold]

        if not final:
            best = max(final, key=lambda x: x[1])
            final = [best]

        final.sort(key=lambda x: x[1], reverse=True)

        return {
            "sequence": text[:2000] + ("..." if len(text) > 2000 else ""),
            "labels": [k for k, _ in final],
            "scores": [s for _, s in final],
            "chunks": 1
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
