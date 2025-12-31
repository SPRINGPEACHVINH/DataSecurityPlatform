#!/usr/bin/env python3
"""
Script to count samples for each label in evaluation dataset.
"""
import json
from pathlib import Path
from collections import Counter

def count_labels(input_file: str = "evaluation_dataset_balanced.json"):
    """
    Count samples for each label in dataset.
    
    Args:
        input_file: Path to input JSON file
    """
    
    # Load dataset
    if not Path(input_file).exists():
        print(f"Error: File '{input_file}' not found!")
        return
    
    with open(input_file, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    print(f"Total samples: {len(data)}")
    print("=" * 80)
    
    # Count labels
    label_counts = Counter(sample.get("label", "Unknown") for sample in data)
    
    # Sort by count (descending)
    sorted_labels = sorted(label_counts.items(), key=lambda x: x[1], reverse=True)
    
    # Display results
    print(f"{'Label':<40} {'Count':<10} {'Percentage'}")
    print("-" * 80)
    
    for label, count in sorted_labels:
        percentage = (count / len(data)) * 100
        print(f"{label:<40} {count:<10} {percentage:>6.2f}%")
    
    print("=" * 80)
    print(f"Total unique labels: {len(label_counts)}")

if __name__ == "__main__":
    count_labels()
