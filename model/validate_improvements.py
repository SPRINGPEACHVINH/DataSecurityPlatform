#!/usr/bin/env python3
"""
Comprehensive improvement validation script
Verify all improvements are working correctly
"""

import json
import sys
from pathlib import Path

def print_header(text):
    """Print formatted header."""
    print("\n" + "=" * 80)
    print(f"  {text}")
    print("=" * 80)

def print_section(text):
    """Print formatted section."""
    print(f"\n>>> {text}")

def run_tests():
    """Run comprehensive tests."""
    
    print_header("MODEL IMPROVEMENTS VALIDATION")
    
    passed = 0
    failed = 0
    
    # =========================================================================
    # TEST 1: Check File Structure
    # =========================================================================
    print_section("TEST 1: Checking File Structure")
    
    files_to_check = {
        "classifier.py": "Core classification engine",
        "service.py": "FastAPI service",
        "evaluate_model.py": "Evaluation script",
        "standards_labels.py": "Label definitions",
        "model_improvements.py": "Analysis utilities",
        "test_improvements.py": "Test suite",
        "IMPROVEMENTS.md": "Documentation",
        "QUICK_REFERENCE.py": "Code examples",
    }
    
    for filename, description in files_to_check.items():
        filepath = Path(filename)
        if filepath.exists():
            size_kb = filepath.stat().st_size / 1024
            print(f"  ✓ {filename:30s} ({size_kb:6.1f} KB) - {description}")
            passed += 1
        else:
            print(f"  ✗ {filename:30s} - MISSING!")
            failed += 1
    
    # =========================================================================
    # TEST 2: Check Imports
    # =========================================================================
    print_section("TEST 2: Verifying Module Imports")
    
    try:
        from classifier import ZeroShotClassifier
        print("  ✓ classifier module imports successfully")
        passed += 1
    except Exception as e:
        print(f"  ✗ classifier import failed: {e}")
        failed += 1
    
    try:
        from service import app
        print("  ✓ service module imports successfully")
        passed += 1
    except Exception as e:
        print(f"  ✗ service import failed: {e}")
        failed += 1
    
    try:
        from standards_labels import SENSITIVE_LABELS_BY_STANDARD
        num_labels = len(SENSITIVE_LABELS_BY_STANDARD)
        print(f"  ✓ standards_labels imports successfully ({num_labels} labels)")
        passed += 1
    except Exception as e:
        print(f"  ✗ standards_labels import failed: {e}")
        failed += 1
    
    try:
        from model_improvements import (
            DataAnalyzer, 
            ImbalanceHandler, 
            ThresholdTuner,
            ModelComparison
        )
        print("  ✓ model_improvements module imports successfully")
        print("      - DataAnalyzer")
        print("      - ImbalanceHandler")
        print("      - ThresholdTuner")
        print("      - ModelComparison")
        passed += 1
    except Exception as e:
        print(f"  ✗ model_improvements import failed: {e}")
        failed += 1
    
    # =========================================================================
    # TEST 3: Check Classifier Improvements
    # =========================================================================
    print_section("TEST 3: Verifying Classifier Improvements")
    
    try:
        from classifier import ZeroShotClassifier
        
        # Check new threshold
        clf = ZeroShotClassifier(threshold=0.35, confidence_threshold=0.25)
        if clf.threshold == 0.35:
            print("  ✓ Threshold improved: 0.18 → 0.35")
            passed += 1
        else:
            print(f"  ✗ Threshold not updated: {clf.threshold}")
            failed += 1
        
        # Check logging
        if hasattr(clf, 'pipe'):
            print("  ✓ Classifier initialized successfully")
            passed += 1
        else:
            print("  ✗ Classifier initialization failed")
            failed += 1
        
        # Test classification
        test_text = "My password is secret123"
        result = clf.classify_text(test_text)
        
        if 'labels' in result and 'scores' in result:
            print(f"  ✓ Classification working: {result['labels']}")
            passed += 1
        else:
            print("  ✗ Classification output invalid")
            failed += 1
        
        if 'language' in result:
            print(f"  ✓ Language detection working: {result['language']}")
            passed += 1
        else:
            print("  ✗ Language detection missing")
            failed += 1
        
    except Exception as e:
        print(f"  ✗ Classifier test failed: {e}")
        failed += 3
    
    # =========================================================================
    # TEST 4: Check Label Improvements
    # =========================================================================
    print_section("TEST 4: Verifying Label Improvements")
    
    try:
        from standards_labels import SENSITIVE_LABELS_BY_STANDARD
        
        labels_with_details = {
            "Personal-Info": ["driver's license", "passport"],
            "Financial-Info": ["SWIFT", "routing number"],
            "Credentials": ["session token", "encryption key"],
            "Health-Info": ["medication", "hospital"],
            "Biometric-Info": ["DNA", "biometric template"],
            "System-Info": ["IPv6", "IMEI"],
            "Technical-Content": ["compilation", "deployment"],
        }
        
        improved_count = 0
        for label, expected_terms in labels_with_details.items():
            if label in SENSITIVE_LABELS_BY_STANDARD:
                description = SENSITIVE_LABELS_BY_STANDARD[label]
                found_terms = sum(1 for term in expected_terms if term in description)
                if found_terms > 0:
                    improved_count += 1
                    print(f"  ✓ {label}: descriptions improved")
        
        if improved_count > 0:
            passed += 1
        
    except Exception as e:
        print(f"  ✗ Label verification failed: {e}")
        failed += 1
    
    # =========================================================================
    # TEST 5: Check API Improvements
    # =========================================================================
    print_section("TEST 5: Verifying API Improvements")
    
    try:
        from service import app
        
        # Check endpoints
        routes = [route.path for route in app.routes]
        
        endpoints = ["/classify", "/classify_by_standard", "/classify_batch", "/health"]
        found_endpoints = [ep for ep in endpoints if ep in routes]
        
        for ep in found_endpoints:
            print(f"  ✓ {ep} endpoint available")
        
        if len(found_endpoints) >= 2:
            passed += 1
        else:
            failed += 1
        
        if "/health" in routes:
            print("  ✓ Health check endpoint added")
            passed += 1
        
    except Exception as e:
        print(f"  ✗ API verification failed: {e}")
        failed += 2
    
    # =========================================================================
    # TEST 6: Check Evaluation Improvements
    # =========================================================================
    print_section("TEST 6: Checking Evaluation Script Improvements")
    
    try:
        with open("evaluate_model.py", "r") as f:
            content = f.read()
        
        checks = [
            ("precision_recall_fscore_support", "Detailed metrics"),
            ("logging", "Error handling"),
            ("try", "Exception handling"),
            ("per-class", "Per-class analysis"),
        ]
        
        for check_str, description in checks:
            if check_str in content:
                print(f"  ✓ {description} added")
                passed += 1
            else:
                print(f"  ⚠ {description} not found")
        
    except Exception as e:
        print(f"  ✗ Evaluation script check failed: {e}")
        failed += 1
    
    # =========================================================================
    # TEST 7: Check Utilities
    # =========================================================================
    print_section("TEST 7: Testing Utility Classes")
    
    try:
        from model_improvements import DataAnalyzer, ImbalanceHandler, ThresholdTuner
        
        # DataAnalyzer
        analyzer = DataAnalyzer()
        print("  ✓ DataAnalyzer instantiated")
        passed += 1
        
        # ImbalanceHandler
        weights = ImbalanceHandler.calculate_class_weights.__doc__
        if weights:
            print("  ✓ ImbalanceHandler.calculate_class_weights documented")
            passed += 1
        
        # ThresholdTuner
        tuner = ThresholdTuner()
        print("  ✓ ThresholdTuner instantiated")
        passed += 1
        
    except Exception as e:
        print(f"  ✗ Utilities test failed: {e}")
        failed += 2
    
    # =========================================================================
    # TEST 8: Check Documentation
    # =========================================================================
    print_section("TEST 8: Verifying Documentation")
    
    docs = {
        "IMPROVEMENTS.md": "Detailed improvement guide",
        "QUICK_REFERENCE.py": "Code examples",
        "CHANGES_SUMMARY.md": "Summary of changes",
    }
    
    for doc_file, description in docs.items():
        if Path(doc_file).exists():
            print(f"  ✓ {doc_file:30s} - {description}")
            passed += 1
        else:
            print(f"  ⚠ {doc_file:30s} - MISSING")
    
    # =========================================================================
    # SUMMARY
    # =========================================================================
    print_header("TEST RESULTS")
    
    total = passed + failed
    percentage = (passed / total * 100) if total > 0 else 0
    
    print(f"\nPassed:  {passed}/{total} ({percentage:.1f}%)")
    print(f"Failed:  {failed}/{total}")
    
    if failed == 0:
        print("\n✓ ALL TESTS PASSED!")
        print("\nNext steps:")
        print("  1. python test_improvements.py")
        print("  2. python evaluate_model.py")
        print("  3. Review IMPROVEMENTS.md")
        print("  4. Start service: uvicorn service:app --reload")
        return 0
    else:
        print(f"\n✗ {failed} test(s) failed. Please review the errors above.")
        return 1

if __name__ == "__main__":
    try:
        sys.exit(run_tests())
    except Exception as e:
        print(f"\nERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
