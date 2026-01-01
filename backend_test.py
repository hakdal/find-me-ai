#!/usr/bin/env python3
"""
Backend API Testing for FIND ME AI Phase 3 - Viral Features
Tests all backend endpoints including new Story Pack and Remix features
"""

import requests
import json
import time
import sys
from typing import Dict, Any, Optional

# Get backend URL from frontend .env
def get_backend_url():
    try:
        with open('/app/frontend/.env', 'r') as f:
            for line in f:
                if line.startswith('EXPO_PUBLIC_BACKEND_URL'):
                    url = line.split('=')[1].strip().strip('"')
                    return url
    except:
        pass
    return "https://alter-ego-app-1.preview.emergentagent.com"

BACKEND_URL = get_backend_url()

class APITester:
    def __init__(self, base_url: str):
        self.base_url = base_url
        self.session = requests.Session()
        self.test_results = []
        
    def log_test(self, test_name: str, success: bool, details: str, response_data: Any = None):
        """Log test results"""
        result = {
            "test": test_name,
            "success": success,
            "details": details,
            "response_data": response_data,
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
        }
        self.test_results.append(result)
        
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        print(f"   Details: {details}")
        if not success and response_data:
            print(f"   Response: {response_data}")
        print()
        
    def test_health_check(self) -> bool:
        """Test GET /api/ endpoint"""
        try:
            response = self.session.get(f"{self.base_url}/api/", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("message") == "FIND ME AI API":
                    self.log_test("Health Check", True, "API is responding correctly", data)
                    return True
                else:
                    self.log_test("Health Check", False, f"Unexpected response message: {data}", data)
                    return False
            else:
                self.log_test("Health Check", False, f"HTTP {response.status_code}: {response.text}", response.text)
                return False
                
        except Exception as e:
            self.log_test("Health Check", False, f"Request failed: {str(e)}")
            return False
    
    def test_generate_persona(self) -> Optional[str]:
        """Test POST /api/generate-persona endpoint with long timeout"""
        test_payload = {
            "selfie_base64": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
            "quiz_answers": [
                {"question_id": 1, "answer": "Sakin kalır ve çözüm ararım"},
                {"question_id": 2, "answer": "Arkadaşlarla dışarıda, sosyal"},
                {"question_id": 3, "answer": "Başarı ve tanınma"},
                {"question_id": 4, "answer": "Hesaplı riskler alırım"},
                {"question_id": 5, "answer": "Cesaret ve kararlılık"}
            ],
            "persona_theme": "Midnight CEO"
        }
        
        try:
            print("🔄 Starting persona generation (this may take 30-60 seconds)...")
            start_time = time.time()
            
            response = self.session.post(
                f"{self.base_url}/api/generate-persona",
                json=test_payload,
                timeout=120  # 2 minute timeout for AI generation
            )
            
            elapsed_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                
                # Validate required fields
                required_fields = ["id", "persona_name", "bio_paragraph", "traits", "share_quote", "avatar_base64"]
                missing_fields = [field for field in required_fields if field not in data]
                
                if missing_fields:
                    self.log_test("Generate Persona", False, f"Missing required fields: {missing_fields}", data)
                    return None
                
                # Validate data types and content
                if not isinstance(data["traits"], list) or len(data["traits"]) == 0:
                    self.log_test("Generate Persona", False, "Traits should be a non-empty list", data)
                    return None
                
                if not data["avatar_base64"] or len(data["avatar_base64"]) < 100:
                    self.log_test("Generate Persona", False, "Avatar base64 seems invalid or too short", data)
                    return None
                
                self.log_test("Generate Persona", True, 
                            f"Persona generated successfully in {elapsed_time:.1f}s. ID: {data['id']}", 
                            {k: v if k != "avatar_base64" else f"[base64 image {len(v)} chars]" for k, v in data.items()})
                return data["id"]
                
            else:
                self.log_test("Generate Persona", False, 
                            f"HTTP {response.status_code} after {elapsed_time:.1f}s: {response.text}", 
                            response.text)
                return None
                
        except requests.exceptions.Timeout:
            self.log_test("Generate Persona", False, "Request timed out after 120 seconds")
            return None
        except Exception as e:
            self.log_test("Generate Persona", False, f"Request failed: {str(e)}")
            return None
    
    def test_list_personas(self) -> bool:
        """Test GET /api/personas endpoint"""
        try:
            response = self.session.get(f"{self.base_url}/api/personas", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                
                if isinstance(data, list):
                    self.log_test("List Personas", True, f"Retrieved {len(data)} personas", f"Count: {len(data)}")
                    return True
                else:
                    self.log_test("List Personas", False, "Response should be a list", data)
                    return False
            else:
                self.log_test("List Personas", False, f"HTTP {response.status_code}: {response.text}", response.text)
                return False
                
        except Exception as e:
            self.log_test("List Personas", False, f"Request failed: {str(e)}")
            return False
    
    def test_get_persona_by_id(self, persona_id: str) -> bool:
        """Test GET /api/personas/{id} endpoint"""
        if not persona_id:
            self.log_test("Get Persona by ID", False, "No persona ID provided for testing")
            return False
            
        try:
            response = self.session.get(f"{self.base_url}/api/personas/{persona_id}", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                
                if data.get("id") == persona_id:
                    self.log_test("Get Persona by ID", True, f"Retrieved persona: {data.get('persona_name', 'Unknown')}", 
                                {k: v if k != "avatar_base64" else f"[base64 image {len(v)} chars]" for k, v in data.items()})
                    return True
                else:
                    self.log_test("Get Persona by ID", False, f"ID mismatch. Expected: {persona_id}, Got: {data.get('id')}", data)
                    return False
            elif response.status_code == 404:
                self.log_test("Get Persona by ID", False, f"Persona not found (404) - ID: {persona_id}", response.text)
                return False
            else:
                self.log_test("Get Persona by ID", False, f"HTTP {response.status_code}: {response.text}", response.text)
                return False
                
        except Exception as e:
            self.log_test("Get Persona by ID", False, f"Request failed: {str(e)}")
            return False

    def get_existing_personas(self) -> list:
        """Get existing personas from database for testing"""
        try:
            response = self.session.get(f"{self.base_url}/api/personas", timeout=10)
            if response.status_code == 200:
                personas = response.json()
                print(f"📋 Found {len(personas)} existing personas in database")
                return personas
            else:
                print(f"⚠️  Could not fetch personas: {response.status_code}")
                return []
        except Exception as e:
            print(f"⚠️  Error fetching personas: {e}")
            return []

    def test_story_pack_generation(self, persona_id: str) -> bool:
        """Test POST /api/generate-story-pack endpoint (Phase 3 feature)"""
        if not persona_id:
            self.log_test("Story Pack Generation", False, "No persona ID provided for testing")
            return False
            
        test_payload = {
            "persona_id": persona_id,
            "template": "default"
        }
        
        try:
            print("🎨 Starting story pack generation (expected: 30-40 seconds)...")
            start_time = time.time()
            
            response = self.session.post(
                f"{self.base_url}/api/generate-story-pack",
                json=test_payload,
                timeout=60  # Allow extra time for safety
            )
            
            elapsed_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                
                # Validate required fields
                required_fields = ["persona_id", "slide_1_base64", "slide_2_base64", "slide_3_base64", "template"]
                missing_fields = [field for field in required_fields if field not in data]
                
                if missing_fields:
                    self.log_test("Story Pack Generation", False, f"Missing required fields: {missing_fields}", data)
                    return False
                
                # Validate base64 images
                for i in range(1, 4):
                    slide_key = f'slide_{i}_base64'
                    if not data[slide_key] or len(data[slide_key]) < 100:
                        self.log_test("Story Pack Generation", False, f"Slide {i} base64 data invalid (too short)", data)
                        return False
                
                self.log_test("Story Pack Generation", True, 
                            f"Generated 3 slides in {elapsed_time:.1f}s. Template: {data['template']}", 
                            {k: v if 'base64' not in k else f"[base64 image {len(v)} chars]" for k, v in data.items()})
                return True
                
            elif response.status_code == 404:
                self.log_test("Story Pack Generation", False, f"Persona not found (404) - ID: {persona_id}", response.text)
                return False
            else:
                self.log_test("Story Pack Generation", False, 
                            f"HTTP {response.status_code} after {elapsed_time:.1f}s: {response.text}", 
                            response.text)
                return False
                
        except requests.exceptions.Timeout:
            self.log_test("Story Pack Generation", False, "Request timed out after 60 seconds")
            return False
        except Exception as e:
            self.log_test("Story Pack Generation", False, f"Request failed: {str(e)}")
            return False

    def test_remix_persona(self, persona_id: str) -> bool:
        """Test POST /api/remix-persona endpoint (Phase 3 feature)"""
        if not persona_id:
            self.log_test("Remix Persona", False, "No persona ID provided for testing")
            return False
            
        test_payload = {
            "original_persona_id": persona_id,
            "variation_count": 3
        }
        
        try:
            print("🎭 Starting persona remix (expected: 90-120 seconds for 3 AI calls)...")
            start_time = time.time()
            
            response = self.session.post(
                f"{self.base_url}/api/remix-persona",
                json=test_payload,
                timeout=150  # Allow extra time for 3 AI calls
            )
            
            elapsed_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                
                # Validate response structure
                if 'original_persona_id' not in data or 'variations' not in data:
                    self.log_test("Remix Persona", False, "Missing required fields in response", data)
                    return False
                
                variations = data['variations']
                if len(variations) != 3:
                    self.log_test("Remix Persona", False, f"Expected 3 variations, got {len(variations)}", data)
                    return False
                
                # Validate each variation
                for i, variation in enumerate(variations, 1):
                    required_fields = ['id', 'persona_name', 'bio_paragraph', 'traits', 'share_quote', 'avatar_base64', 'variation_style']
                    missing_fields = [field for field in required_fields if field not in variation]
                    
                    if missing_fields:
                        self.log_test("Remix Persona", False, f"Variation {i} missing fields: {missing_fields}", variation)
                        return False
                
                variation_names = [v['persona_name'] for v in variations]
                variation_styles = [v['variation_style'] for v in variations]
                
                self.log_test("Remix Persona", True, 
                            f"Generated 3 variations in {elapsed_time:.1f}s. Names: {variation_names}, Styles: {variation_styles}", 
                            {k: v if k != 'variations' else f"[{len(v)} variations]" for k, v in data.items()})
                return True
                
            elif response.status_code == 404:
                self.log_test("Remix Persona", False, f"Persona not found (404) - ID: {persona_id}", response.text)
                return False
            else:
                self.log_test("Remix Persona", False, 
                            f"HTTP {response.status_code} after {elapsed_time:.1f}s: {response.text}", 
                            response.text)
                return False
                
        except requests.exceptions.Timeout:
            self.log_test("Remix Persona", False, "Request timed out after 150 seconds")
            return False
        except Exception as e:
            self.log_test("Remix Persona", False, f"Request failed: {str(e)}")
            return False
    
    def run_all_tests(self):
        """Run all API tests in sequence including Phase 3 viral features"""
        print("🚀 Starting FIND ME AI Phase 3 Backend API Tests")
        print(f"🔗 Testing against: {self.base_url}")
        print("=" * 70)
        
        # Test 1: Health Check
        health_ok = self.test_health_check()
        if not health_ok:
            print("❌ Health check failed - stopping tests")
            return False
        
        # Get existing personas for Phase 3 testing
        existing_personas = self.get_existing_personas()
        test_persona_id = None
        
        if existing_personas:
            # Use existing persona for Phase 3 tests
            test_persona_id = existing_personas[0]['id']
            print(f"🎯 Using existing persona for Phase 3 tests: {test_persona_id}")
            print(f"   Persona: {existing_personas[0].get('persona_name', 'Unknown')}")
        else:
            # Generate new persona if none exist
            print("🔄 No existing personas found, generating new one...")
            test_persona_id = self.test_generate_persona()
        
        # Test 2: List Personas
        list_ok = self.test_list_personas()
        
        # Test 3: Get Persona by ID (if we have an ID)
        get_by_id_ok = self.test_get_persona_by_id(test_persona_id) if test_persona_id else False
        
        # PHASE 3 VIRAL FEATURES TESTING
        print("\n" + "=" * 70)
        print("🎉 PHASE 3 VIRAL FEATURES TESTING")
        print("=" * 70)
        
        # Test 4: Story Pack Generation (Phase 3)
        story_pack_ok = False
        if test_persona_id:
            story_pack_ok = self.test_story_pack_generation(test_persona_id)
        else:
            self.log_test("Story Pack Generation", False, "No persona ID available for testing")
        
        # Test 5: Remix Persona (Phase 3)
        remix_ok = False
        if test_persona_id:
            remix_ok = self.test_remix_persona(test_persona_id)
        else:
            self.log_test("Remix Persona", False, "No persona ID available for testing")
        
        # Summary
        print("\n" + "=" * 70)
        print("📊 COMPREHENSIVE TEST SUMMARY")
        print("=" * 70)
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result["success"])
        
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests}")
        print(f"Failed: {total_tests - passed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        
        # Categorize results
        core_tests = ["Health Check", "Generate Persona", "List Personas", "Get Persona by ID"]
        phase3_tests = ["Story Pack Generation", "Remix Persona"]
        
        print(f"\n📋 Core API Tests:")
        for result in self.test_results:
            if result['test'] in core_tests:
                status = "✅" if result["success"] else "❌"
                print(f"  {status} {result['test']}: {result['details']}")
        
        print(f"\n🎉 Phase 3 Viral Features:")
        for result in self.test_results:
            if result['test'] in phase3_tests:
                status = "✅" if result["success"] else "❌"
                print(f"  {status} {result['test']}: {result['details']}")
        
        # Check Phase 3 specific success
        phase3_results = [r for r in self.test_results if r['test'] in phase3_tests]
        phase3_passed = sum(1 for r in phase3_results if r['success'])
        
        print(f"\n🎯 Phase 3 Features Status: {phase3_passed}/{len(phase3_results)} passed")
        
        return passed_tests == total_tests

def main():
    """Main test execution"""
    tester = APITester(BACKEND_URL)
    
    try:
        success = tester.run_all_tests()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n⚠️  Tests interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n💥 Unexpected error: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()