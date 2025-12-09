from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime
import base64

# Import Emergent integrations
from emergentintegrations.llm.chat import LlmChat, UserMessage
from emergentintegrations.llm.openai.image_generation import OpenAIImageGeneration

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Emergent LLM Key
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Define Models
class QuizAnswer(BaseModel):
    question_id: int
    answer: str

class GeneratePersonaRequest(BaseModel):
    selfie_base64: str
    quiz_answers: List[QuizAnswer]
    persona_theme: str  # Midnight CEO, Dark Charmer, Alpha Strategist, Glam Diva

class GeneratedPersona(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    persona_name: str
    bio_paragraph: str
    traits: List[str]
    share_quote: str
    avatar_base64: str
    persona_theme: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

class GenerateAvatarRequest(BaseModel):
    persona_theme: str
    persona_description: str

# Persona themes and their styles
PERSONA_THEMES = {
    "Midnight CEO": "powerful business leader, sophisticated dark suit, confident pose, luxurious office setting, dramatic lighting, cinematic portrait",
    "Dark Charmer": "mysterious and charismatic, elegant dark fashion, intense gaze, moody atmosphere, artistic portrait, cinematic lighting",
    "Alpha Strategist": "strategic thinker, sharp professional attire, commanding presence, modern setting, confident expression, high-quality portrait",
    "Glam Diva": "glamorous and stylish, fashion-forward outfit, radiant expression, luxurious background, editorial style portrait, stunning lighting"
}

@api_router.get("/")
async def root():
    return {"message": "FIND ME AI API"}

@api_router.post("/generate-persona", response_model=GeneratedPersona)
async def generate_persona(request: GeneratePersonaRequest):
    try:
        logger.info(f"Generating persona for theme: {request.persona_theme}")
        
        # Create quiz answers summary
        quiz_summary = "\n".join([
            f"Q{ans.question_id}: {ans.answer}"
            for ans in request.quiz_answers
        ])
        
        # Generate persona text using Emergent LLM
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=str(uuid.uuid4()),
            system_message="""
Sen FIND ME AI'sın. Kullanıcının kişiliğini analiz edip onlara özel bir alter ego persona oluşturuyorsun.

Çıktı formatı:
PERSONA ADI: [Stilize ve viral bir isim]
BİO: [2-3 cümle, ilham verici, sinematik dil]
ÖZELLİKLER:
- [Özellik 1]
- [Özellik 2]
- [Özellik 3]
- [Özellik 4]
- [Özellik 5]
PAYLAŞIM SÖZÜ: [Kısa, güçlü, paylaşılabilir bir söz]

Ton: Kendinden emin, duygusal, sinematik, son derece paylaşılabilir.
"""
        ).with_model("openai", "gpt-4o")
        
        user_message = UserMessage(
            text=f"""
Persona Teması: {request.persona_theme}

Kullanıcı Quiz Cevapları:
{quiz_summary}

Bu bilgilere dayanarak kullanıcı için {request.persona_theme} temalı bir persona oluştur.
Tüm çıktıyı Türkçe olarak ver.
"""
        )
        
        response = await chat.send_message(user_message)
        logger.info(f"Persona text generated: {response[:100]}...")
        
        # Parse the response
        persona_data = parse_persona_response(response)
        
        # Generate avatar using OpenAI image generation
        image_gen = OpenAIImageGeneration(api_key=EMERGENT_LLM_KEY)
        
        style_desc = PERSONA_THEMES.get(request.persona_theme, "professional portrait")
        image_prompt = f"""
Create a semi-realistic cinematic portrait avatar in 9:16 portrait orientation.
Style: {style_desc}
High quality studio lighting, clean soft background, social media ready, professional photography.
Focus on face and upper body, portrait orientation.
"""
        
        logger.info(f"Generating avatar with prompt: {image_prompt[:100]}...")
        images = await image_gen.generate_images(
            prompt=image_prompt,
            model="gpt-image-1",
            number_of_images=1
        )
        
        if not images or len(images) == 0:
            raise HTTPException(status_code=500, detail="Avatar oluşturulamadı")
        
        # Convert to base64
        avatar_base64 = base64.b64encode(images[0]).decode('utf-8')
        
        # Create persona object
        persona = GeneratedPersona(
            persona_name=persona_data['name'],
            bio_paragraph=persona_data['bio'],
            traits=persona_data['traits'],
            share_quote=persona_data['quote'],
            avatar_base64=avatar_base64,
            persona_theme=request.persona_theme
        )
        
        # Save to database
        await db.personas.insert_one(persona.dict())
        
        logger.info(f"Persona created successfully: {persona.id}")
        return persona
        
    except Exception as e:
        logger.error(f"Error generating persona: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Persona oluşturulurken hata: {str(e)}")

@api_router.get("/personas", response_model=List[GeneratedPersona])
async def get_personas():
    try:
        personas = await db.personas.find().sort("created_at", -1).to_list(100)
        return [GeneratedPersona(**persona) for persona in personas]
    except Exception as e:
        logger.error(f"Error fetching personas: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Personalar alınırken hata: {str(e)}")

@api_router.get("/personas/{persona_id}", response_model=GeneratedPersona)
async def get_persona(persona_id: str):
    try:
        persona = await db.personas.find_one({"id": persona_id})
        if not persona:
            raise HTTPException(status_code=404, detail="Persona bulunamadı")
        return GeneratedPersona(**persona)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching persona: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Persona alınırken hata: {str(e)}")

def parse_persona_response(response: str) -> dict:
    """Parse the LLM response to extract persona data"""
    try:
        lines = response.strip().split('\n')
        persona_data = {
            'name': '',
            'bio': '',
            'traits': [],
            'quote': ''
        }
        
        current_section = None
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
                
            if line.startswith('PERSONA ADI:') or line.startswith('PERSONA NAME:'):
                persona_data['name'] = line.split(':', 1)[1].strip()
            elif line.startswith('BİO:') or line.startswith('BIO:'):
                current_section = 'bio'
                bio_text = line.split(':', 1)[1].strip()
                if bio_text:
                    persona_data['bio'] = bio_text
            elif line.startswith('ÖZELLİKLER:') or line.startswith('TRAITS:') or line.startswith('FEATURES:'):
                current_section = 'traits'
            elif line.startswith('PAYLAŞIM SÖZÜ:') or line.startswith('SHARE QUOTE:') or line.startswith('QUOTE:'):
                current_section = 'quote'
                quote_text = line.split(':', 1)[1].strip()
                if quote_text:
                    persona_data['quote'] = quote_text
            elif line.startswith('-') and current_section == 'traits':
                trait = line.lstrip('- ').strip()
                if trait:
                    persona_data['traits'].append(trait)
            elif current_section == 'bio' and not line.startswith(('PERSONA', 'BİO', 'ÖZELLİK', 'PAYLAŞIM', 'TRAITS', 'QUOTE')):
                persona_data['bio'] += ' ' + line
            elif current_section == 'quote' and not line.startswith(('PERSONA', 'BİO', 'ÖZELLİK', 'PAYLAŞIM', 'TRAITS', 'QUOTE')):
                persona_data['quote'] += ' ' + line
        
        # Fallbacks
        if not persona_data['name']:
            persona_data['name'] = 'Mysterious Persona'
        if not persona_data['bio']:
            persona_data['bio'] = 'A unique and fascinating individual.'
        if not persona_data['traits']:
            persona_data['traits'] = ['Unique', 'Mysterious', 'Charismatic', 'Powerful', 'Inspiring']
        if not persona_data['quote']:
            persona_data['quote'] = 'Be yourself, everyone else is taken.'
            
        return persona_data
        
    except Exception as e:
        logger.error(f"Error parsing persona response: {str(e)}")
        return {
            'name': 'Mysterious Persona',
            'bio': 'A unique and fascinating individual.',
            'traits': ['Unique', 'Mysterious', 'Charismatic', 'Powerful', 'Inspiring'],
            'quote': 'Be yourself, everyone else is taken.'
        }

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
