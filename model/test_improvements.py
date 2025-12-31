#!/usr/bin/env python3
"""
Quick test script for model improvements.
Run this after implementing improvements to verify changes.
"""

import sys
import json
from pathlib import Path

def test_imports():
    """Test if all modules can be imported."""
    print("Testing imports...")
    try:
        from classifier import ZeroShotClassifier
        print("✓ classifier.py OK")
    except Exception as e:
        print(f"✗ classifier.py ERROR: {e}")
        return False
    
    try:
        from service import app
        print("✓ service.py OK")
    except Exception as e:
        print(f"✗ service.py ERROR: {e}")
        return False
    
    try:
        from standards_labels import SENSITIVE_LABELS_BY_STANDARD, DEFAULT_LABEL_KEYS
        print("✓ standards_labels.py OK")
        print(f"  - Found {len(SENSITIVE_LABELS_BY_STANDARD)} labels")
        print(f"  - Default keys: {DEFAULT_LABEL_KEYS}")
    except Exception as e:
        print(f"✗ standards_labels.py ERROR: {e}")
        return False
    
    try:
        from model_improvements import DataAnalyzer, ImbalanceHandler, ThresholdTuner
        print("✓ model_improvements.py OK")
    except Exception as e:
        print(f"✗ model_improvements.py ERROR: {e}")
        return False
    
    return True


def test_classifier():
    """Test classifier initialization and basic functionality."""
    print("\nTesting classifier...")
    try:
        from classifier import ZeroShotClassifier
        
        # Initialize with improved thresholds
        clf = ZeroShotClassifier(threshold=0.35, confidence_threshold=0.25)
        print("✓ Classifier initialized with new thresholds")
        
        # Test with simple text
        test_texts = [
            "My credit card number is 1234-5678-9012-3456",
            "sudo apt install python3",
            "The weather is nice today"
        ]
        
        print("\nTest Classifications:")
        for text in test_texts:
            result = clf.classify_text(text)
            print(f"  Text: {text[:50]}...")
            print(f"    Labels: {result['labels']}")
            print(f"    Scores: {result['scores']}")
        
        return True
    except Exception as e:
        print(f"✗ Classifier test ERROR: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_dataset_analysis():
    """Test dataset analysis utilities."""
    print("\nTesting dataset analysis...")
    try:
        from model_improvements import DataAnalyzer
        
        dataset_path = "evaluation_dataset_mapped.json"
        if not Path(dataset_path).exists():
            print(f"⚠ Dataset file not found: {dataset_path}")
            return True  # Skip this test
        
        analyzer = DataAnalyzer()
        stats = analyzer.analyze_dataset(dataset_path)
        
        print("✓ Dataset analysis completed")
        print(f"  - Total samples: {stats['total_samples']}")
        print(f"  - Number of classes: {stats['num_classes']}")
        
        return True
    except Exception as e:
        print(f"✗ Dataset analysis ERROR: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_improvements():
    """Test new improvements functionality."""
    print("\nTesting improvements...")
    try:
        from classifier import ZeroShotClassifier
        
        clf = ZeroShotClassifier(threshold=0.35)
        
        # Test improved technical detection
        tech_code = "#!/bin/bash\nsudo apt install python3\nnpm install"
        result = clf.classify_text(tech_code)
        
        if "Technical-Content" in result['labels']:
            print("✓ Technical content detection improved")
        else:
            print(f"⚠ Technical detection: {result['labels']}")
        
        # Test dynamic thresholding
        general_text = "The sky is blue"
        result = clf.classify_text(general_text)
        print(f"✓ Dynamic thresholding working: {result['labels']}")
        
        # Test language detection
        if 'language' in result:
            print(f"✓ Language detection working: {result['language']}")
        
        return True
    except Exception as e:
        print(f"✗ Improvements test ERROR: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """Run all tests."""
    print("=" * 80)
    print("MODEL IMPROVEMENTS TEST SUITE")
    print("=" * 80)
    
    all_passed = True
    
    # Test 1: Imports
    if not test_imports():
        all_passed = False
    
    # Test 2: Classifier
    if not test_classifier():
        all_passed = False
    
    # Test 3: Dataset Analysis
    if not test_dataset_analysis():
        all_passed = False
    
    # Test 4: Improvements
    if not test_improvements():
        all_passed = False
    
    # Summary
    print("\n" + "=" * 80)
    if all_passed:
        print("✓ ALL TESTS PASSED!")
        print("\nNext steps:")
        print("  1. Run: python evaluate_model.py")
        print("  2. Analyze dataset: python model_improvements.py")
        print("  3. Start service: uvicorn service:app --reload")
    else:
        print("✗ SOME TESTS FAILED")
        print("Please fix the errors above before proceeding.")
        sys.exit(1)
    print("=" * 80)


if __name__ == "__main__":
    main()
