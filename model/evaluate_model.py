import json
import requests
from sklearn.metrics import classification_report, confusion_matrix, precision_recall_fscore_support, roc_auc_score
from sklearn.preprocessing import LabelBinarizer
import numpy as np
import logging
from typing import Dict, List
import matplotlib.pyplot as plt
import seaborn as sns
from pathlib import Path

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

API_URL = "http://localhost:8000/classify_by_standard"
OUTPUT_DIR = Path("./evaluation_results")

def setup_style():
    """Configure matplotlib/seaborn for professional output."""
    sns.set_style("whitegrid")
    plt.rcParams['figure.figsize'] = (12, 8)
    plt.rcParams['font.size'] = 11
    plt.rcParams['font.family'] = 'sans-serif'
    plt.rcParams['axes.labelsize'] = 12
    plt.rcParams['axes.titlesize'] = 14
    plt.rcParams['xtick.labelsize'] = 10
    plt.rcParams['ytick.labelsize'] = 10
    OUTPUT_DIR.mkdir(exist_ok=True)

def plot_confusion_matrix(y_true: List, y_pred: List, unique_labels: set):
    """Export confusion matrix as image."""
    cm = confusion_matrix(y_true, y_pred, labels=sorted(unique_labels))
    plt.figure(figsize=(10, 8))
    sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', cbar=True,
                xticklabels=sorted(unique_labels),
                yticklabels=sorted(unique_labels))
    plt.title('Confusion Matrix', fontsize=16, fontweight='bold')
    plt.ylabel('True Label', fontsize=12)
    plt.xlabel('Predicted Label', fontsize=12)
    plt.tight_layout()
    plt.savefig(OUTPUT_DIR / 'confusion_matrix.png', dpi=300, bbox_inches='tight')
    logger.info(f"Saved: {OUTPUT_DIR / 'confusion_matrix.png'}")
    plt.close()

def plot_metrics_comparison(y_true: List, y_pred: List, unique_labels: set):
    """Export classification metrics bar chart."""
    precision, recall, f1, _ = precision_recall_fscore_support(
        y_true, y_pred, labels=sorted(unique_labels), zero_division=0
    )
    
    x = np.arange(len(sorted(unique_labels)))
    width = 0.25
    
    fig, ax = plt.subplots(figsize=(14, 6))
    ax.bar(x - width, precision, width, label='Precision', color='#1f77b4')
    ax.bar(x, recall, width, label='Recall', color='#ff7f0e')
    ax.bar(x + width, f1, width, label='F1-Score', color='#2ca02c')
    
    ax.set_ylabel('Score', fontsize=12, fontweight='bold')
    ax.set_xlabel('Class', fontsize=12, fontweight='bold')
    ax.set_title('Classification Metrics by Class', fontsize=16, fontweight='bold')
    ax.set_xticks(x)
    ax.set_xticklabels(sorted(unique_labels), rotation=45, ha='right')
    ax.legend(fontsize=11)
    ax.set_ylim([0, 1.1])
    ax.grid(axis='y', alpha=0.3)
    
    plt.tight_layout()
    plt.savefig(OUTPUT_DIR / 'metrics_comparison.png', dpi=300, bbox_inches='tight')
    logger.info(f"Saved: {OUTPUT_DIR / 'metrics_comparison.png'}")
    plt.close()

def plot_confidence_distribution(confidence_scores: List):
    """Export confidence score distribution."""
    fig, ax = plt.subplots(figsize=(12, 6))
    ax.hist(confidence_scores, bins=30, color='#2ca02c', alpha=0.7, edgecolor='black')
    ax.axvline(np.mean(confidence_scores), color='red', linestyle='--', linewidth=2, label=f'Mean: {np.mean(confidence_scores):.3f}')
    ax.axvline(np.median(confidence_scores), color='orange', linestyle='--', linewidth=2, label=f'Median: {np.median(confidence_scores):.3f}')
    
    ax.set_xlabel('Confidence Score', fontsize=12, fontweight='bold')
    ax.set_ylabel('Frequency', fontsize=12, fontweight='bold')
    ax.set_title('Confidence Score Distribution', fontsize=16, fontweight='bold')
    ax.legend(fontsize=11)
    ax.grid(axis='y', alpha=0.3)
    
    plt.tight_layout()
    plt.savefig(OUTPUT_DIR / 'confidence_distribution.png', dpi=300, bbox_inches='tight')
    logger.info(f"Saved: {OUTPUT_DIR / 'confidence_distribution.png'}")
    plt.close()

def plot_class_distribution(y_true: List, y_pred: List, unique_labels: set):
    """Export class distribution comparison."""
    true_counts = {label: np.sum(np.array(y_true) == label) for label in sorted(unique_labels)}
    pred_counts = {label: np.sum(np.array(y_pred) == label) for label in sorted(unique_labels)}
    
    x = np.arange(len(sorted(unique_labels)))
    width = 0.35
    
    fig, ax = plt.subplots(figsize=(14, 6))
    ax.bar(x - width/2, [true_counts[label] for label in sorted(unique_labels)], width, label='True', color='#1f77b4')
    ax.bar(x + width/2, [pred_counts[label] for label in sorted(unique_labels)], width, label='Predicted', color='#ff7f0e')
    
    ax.set_ylabel('Count', fontsize=12, fontweight='bold')
    ax.set_xlabel('Class', fontsize=12, fontweight='bold')
    ax.set_title('Class Distribution: True vs Predicted', fontsize=16, fontweight='bold')
    ax.set_xticks(x)
    ax.set_xticklabels(sorted(unique_labels), rotation=45, ha='right')
    ax.legend(fontsize=11)
    ax.grid(axis='y', alpha=0.3)
    
    plt.tight_layout()
    plt.savefig(OUTPUT_DIR / 'class_distribution.png', dpi=300, bbox_inches='tight')
    logger.info(f"Saved: {OUTPUT_DIR / 'class_distribution.png'}")
    plt.close()

def export_misclassified_samples(data: List, y_true: List, y_pred: List, confidence_scores: List):
    """Export misclassified samples to JSON file."""
    misclassified = []
    
    for i, (sample, true_label, pred_label, confidence) in enumerate(zip(data, y_true, y_pred, confidence_scores)):
        if true_label != pred_label:
            misclassified.append({
                "index": i,
                "text": sample["text"],
                "true_label": true_label,
                "predicted_label": pred_label,
                "confidence_score": confidence
            })
    
    misclassified_file = OUTPUT_DIR / 'misclassified_samples.json'
    with open(misclassified_file, 'w', encoding='utf-8') as f:
        json.dump(misclassified, f, ensure_ascii=False, indent=2)
    
    logger.info(f"Exported {len(misclassified)} misclassified samples to: {misclassified_file}")
    print(f"\nMisclassified Samples: {len(misclassified)} / {len(data)} ({len(misclassified)/len(data)*100:.2f}%)")

def evaluate_model(dataset_path: str = "evaluation_dataset.json"):
    """Evaluate model on dataset with comprehensive metrics."""
    
    # Load dataset
    with open(dataset_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    logger.info(f"Loaded {len(data)} samples from {dataset_path}")
    
    y_true = []
    y_pred = []
    confidence_scores = []
    
    # Classify each sample
    for i, sample in enumerate(data):
        try:
            r = requests.post(API_URL, json={
                "text": sample["text"],
                "standard": None
            })
            
            if r.status_code != 200:
                logger.warning(f"API error for sample {i}: {r.status_code}")
                y_pred.append("Unclassified")
                confidence_scores.append(0.0)
                continue
            
            res = r.json()
            labels = res.get("labels", [])
            scores = res.get("scores", [])
            
            if labels and scores:
                max_idx = 0
                pred = labels[max_idx]
                confidence_scores.append(scores[max_idx])
            else:
                pred = "Non-sensitive"
                confidence_scores.append(0.0)
            
            y_true.append(sample["label"])
            y_pred.append(pred)
            
            if (i + 1) % 50 == 0:
                logger.info(f"Processed {i+1}/{len(data)} samples")
        
        except Exception as e:
            logger.error(f"Error processing sample {i}: {e}")
            y_true.append(sample["label"])
            y_pred.append("Unclassified")
            confidence_scores.append(0.0)
    
    # Generate comprehensive metrics
    logger.info("\n" + "="*80)
    logger.info("CLASSIFICATION REPORT")
    logger.info("="*80)
    print("\nClassification Report:\n")
    print(classification_report(y_true, y_pred, zero_division=0))
    
    # Confusion matrix
    logger.info("\n" + "="*80)
    logger.info("CONFUSION MATRIX")
    logger.info("="*80)
    print("\nConfusion Matrix:\n")
    cm = confusion_matrix(y_true, y_pred)
    print(cm)
    
    # Additional metrics
    logger.info("\n" + "="*80)
    logger.info("ADDITIONAL METRICS")
    logger.info("="*80)
    
    precision, recall, f1, _ = precision_recall_fscore_support(
        y_true, y_pred, average='weighted', zero_division=0
    )
    print(f"\nWeighted Precision: {precision:.4f}")
    print(f"Weighted Recall: {recall:.4f}")
    print(f"Weighted F1-Score: {f1:.4f}")
    print(f"Mean Confidence Score: {np.mean(confidence_scores):.4f}")
    
    # Per-class metrics
    print("\n" + "="*80)
    print("PER-CLASS DETAILED METRICS")
    print("="*80)
    
    unique_labels = set(y_true)
    for label in sorted(unique_labels):
        mask = np.array(y_true) == label
        if np.sum(mask) > 0:
            class_precision, class_recall, class_f1, _ = precision_recall_fscore_support(
                np.array(y_true)[mask], np.array(y_pred)[mask], 
                labels=[label], zero_division=0
            )
            print(f"\n{label}:")
            print(f"  Support: {np.sum(mask)}")
            print(f"  Precision: {class_precision[0]:.4f}")
            print(f"  Recall: {class_recall[0]:.4f}")
            print(f"  F1-Score: {class_f1[0]:.4f}")
    
    # Export visualizations
    logger.info("\n" + "="*80)
    logger.info("EXPORTING VISUALIZATIONS")
    logger.info("="*80)
    setup_style()
    plot_confusion_matrix(y_true, y_pred, unique_labels)
    plot_metrics_comparison(y_true, y_pred, unique_labels)
    plot_confidence_distribution(confidence_scores)
    plot_class_distribution(y_true, y_pred, unique_labels)
    
    # Export misclassified samples
    logger.info("\n" + "="*80)
    logger.info("EXPORTING MISCLASSIFIED SAMPLES")
    logger.info("="*80)
    export_misclassified_samples(data, y_true, y_pred, confidence_scores)
    
    logger.info(f"All results saved to: {OUTPUT_DIR}")

if __name__ == "__main__":
    evaluate_model()
