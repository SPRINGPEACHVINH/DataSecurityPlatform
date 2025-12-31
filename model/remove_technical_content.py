#!/usr/bin/env python3
"""
Script to remove all 'System-Info' samples from evaluation dataset.
"""
import json
import logging
from pathlib import Path

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def remove_technical_content(input_file: str = "evaluation_dataset_mapped_2.json", 
                            output_file: str = "evaluation_dataset.json"):
    """
    Remove all samples with label 'System-Info' from dataset.
    
    Args:
        input_file: Path to input JSON file
        output_file: Path to output JSON file (cleaned)
    """
    
    # Load dataset
    with open(input_file, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    logger.info(f"Loaded {len(data)} samples from {input_file}")
    
    # Filter out technical-content
    filtered_data = [sample for sample in data if sample.get("label") != "System-Info"]
    
    removed_count = len(data) - len(filtered_data)
    logger.info(f"Removed {removed_count} 'System-Info' samples")
    logger.info(f"Remaining samples: {len(filtered_data)}")
    
    # Show breakdown by label
    label_counts = {}
    for sample in filtered_data:
        label = sample.get("label", "Unknown")
        label_counts[label] = label_counts.get(label, 0) + 1
    
    logger.info("\nRemaining samples by label:")
    for label, count in sorted(label_counts.items()):
        logger.info(f"  {label}: {count}")
    
    # Save cleaned dataset
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(filtered_data, f, ensure_ascii=False, indent=2)
    
    logger.info(f"\nSaved cleaned dataset to: {output_file}")

if __name__ == "__main__":
    remove_technical_content()
