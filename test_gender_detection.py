#!/usr/bin/env python3
"""
Simple test script to verify gender detection functionality
"""
import sys
import os
sys.path.append('/app/backend')

# Test the gender detection function
try:
    from server import detect_gender_from_image, DEEPFACE_AVAILABLE
    print(f"DeepFace available: {DEEPFACE_AVAILABLE}")
    
    # Test with a simple base64 image (1x1 pixel)
    import base64
    from PIL import Image
    from io import BytesIO
    
    # Create a simple test image
    img = Image.new('RGB', (100, 100), color='white')
    buffer = BytesIO()
    img.save(buffer, format='JPEG')
    test_image_b64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
    
    print("Testing gender detection with simple image...")
    result = detect_gender_from_image(test_image_b64)
    print(f"Result: {result}")
    
    print("Gender detection test completed successfully!")
    
except Exception as e:
    print(f"Error testing gender detection: {e}")
    import traceback
    traceback.print_exc()