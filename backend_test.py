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
    return "https://selfie-persona.preview.emergentagent.com"

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
    
    def run_all_tests(self):
        """Run all API tests in sequence"""
        print("🚀 Starting FIND ME AI Backend API Tests")
        print(f"🔗 Testing against: {self.base_url}")
        print("=" * 60)
        
        # Test 1: Health Check
        health_ok = self.test_health_check()
        
        # Test 2: Generate Persona (with long timeout)
        persona_id = self.test_generate_persona()
        
        # Test 3: List Personas
        list_ok = self.test_list_personas()
        
        # Test 4: Get Persona by ID (if we have an ID from generation)
        get_by_id_ok = self.test_get_persona_by_id(persona_id) if persona_id else False
        
        # Summary
        print("=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result["success"])
        
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests}")
        print(f"Failed: {total_tests - passed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        
        print("\nDetailed Results:")
        for result in self.test_results:
            status = "✅" if result["success"] else "❌"
            print(f"{status} {result['test']}: {result['details']}")
        
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