from fastapi import FastAPI, APIRouter, HTTPException, Header
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
from PIL import Image, ImageDraw, ImageFont
from io import BytesIO

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

# Admin API Key (simple authentication)
ADMIN_API_KEY = os.environ.get('ADMIN_API_KEY', 'admin_secret_key_change_me')

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
    persona_theme: str
    language: str = 'tr'  # 'tr' or 'en'

class GeneratedPersona(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    persona_name: str
    bio_paragraph: str
    traits: List[str]
    share_quote: str
    avatar_base64: str
    persona_theme: str
    language: str = 'tr'
    created_at: datetime = Field(default_factory=datetime.utcnow)

class ShareCardRequest(BaseModel):
    persona_id: str

class StoryPackRequest(BaseModel):
    persona_id: str
    template: str = "default"  # default, minimal, bold

class RemixPersonaRequest(BaseModel):
    original_persona_id: str
    variation_count: int = 3

class PurchaseValidationRequest(BaseModel):
    product_id: str
    purchase_token: str
    user_id: Optional[str] = None

class PersonaThemeUpdate(BaseModel):
    theme_name: str
    enabled: bool
    prompt_override: Optional[str] = None

class PricingConfig(BaseModel):
    persona_single_usd: float = 1.99
    persona_all_usd: float = 6.99
    persona_unlimited_usd: float = 4.99
    persona_single_try: float = 79.0
    persona_all_try: float = 299.0
    persona_unlimited_try: float = 149.0

# Persona themes and their styles
PERSONA_THEMES = {
    "Midnight CEO": {
        "style": "powerful business leader, sophisticated dark suit, confident pose, luxurious office setting, dramatic lighting, cinematic portrait",
        "enabled": True,
        "prompt_override": None
    },
    "Dark Charmer": {
        "style": "mysterious and charismatic, elegant dark fashion, intense gaze, moody atmosphere, artistic portrait, cinematic lighting",
        "enabled": True,
        "prompt_override": None
    },
    "Alpha Strategist": {
        "style": "strategic thinker, sharp professional attire, commanding presence, modern setting, confident expression, high-quality portrait",
        "enabled": True,
        "prompt_override": None
    },
    "Glam Diva": {
        "style": "glamorous and stylish, fashion-forward outfit, radiant expression, luxurious background, editorial style portrait, stunning lighting",
        "enabled": True,
        "prompt_override": None
    }
}

@api_router.get("/")
async def root():
    return {"message": "FIND ME AI API"}

@api_router.get("/health")
async def health_check():
    """Health check endpoint for monitoring"""
    return {"status": "healthy", "service": "FIND ME AI API", "version": "1.0.0"}

@api_router.post("/generate-persona", response_model=GeneratedPersona)
async def generate_persona(request: GeneratePersonaRequest):
    try:
        logger.info(f"Generating persona for theme: {request.persona_theme} in language: {request.language}")
        
        # Check if theme is enabled
        theme_config = PERSONA_THEMES.get(request.persona_theme)
        if not theme_config or not theme_config.get('enabled', True):
            raise HTTPException(status_code=400, detail=f"Persona theme {request.persona_theme} is not available")
        
        # Create quiz answers summary
        quiz_summary = "\n".join([
            f"Q{ans.question_id}: {ans.answer}"
            for ans in request.quiz_answers
        ])
        
        # Language-specific system messages
        system_messages = {
            'tr': """
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
""",
            'en': """
You are FIND ME AI. You analyze the user's personality and create a unique alter ego persona for them.

Output format:
PERSONA NAME: [Stylish and viral name]
BIO: [2-3 sentences, inspiring, cinematic language]
TRAITS:
- [Trait 1]
- [Trait 2]
- [Trait 3]
- [Trait 4]
- [Trait 5]
SHARE QUOTE: [Short, powerful, shareable quote]

Tone: Confident, emotional, cinematic, highly shareable.
"""
        }
        
        user_prompts = {
            'tr': f"""
Persona Teması: {request.persona_theme}

Kullanıcı Quiz Cevapları:
{quiz_summary}

Bu bilgilere dayanarak kullanıcı için {request.persona_theme} temalı bir persona oluştur.
Tüm çıktıyı Türkçe olarak ver.
""",
            'en': f"""
Persona Theme: {request.persona_theme}

User Quiz Answers:
{quiz_summary}

Based on this information, create a {request.persona_theme} themed persona for the user.
Provide all output in English.
"""
        }
        
        # Generate persona text using Emergent LLM
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=str(uuid.uuid4()),
            system_message=system_messages.get(request.language, system_messages['en'])
        ).with_model("openai", "gpt-4o")
        
        user_message = UserMessage(
            text=user_prompts.get(request.language, user_prompts['en'])
        )
        
        response = await chat.send_message(user_message)
        logger.info(f"Persona text generated: {response[:100]}...")
        
        # Parse the response
        persona_data = parse_persona_response(response, request.language)
        
        # Generate avatar using OpenAI image generation
        image_gen = OpenAIImageGeneration(api_key=EMERGENT_LLM_KEY)
        
        style_desc = theme_config['prompt_override'] or theme_config['style']
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
            raise HTTPException(status_code=500, detail="Avatar could not be generated")
        
        # Convert to base64
        avatar_base64 = base64.b64encode(images[0]).decode('utf-8')
        
        # Create persona object
        persona = GeneratedPersona(
            persona_name=persona_data['name'],
            bio_paragraph=persona_data['bio'],
            traits=persona_data['traits'],
            share_quote=persona_data['quote'],
            avatar_base64=avatar_base64,
            persona_theme=request.persona_theme,
            language=request.language
        )
        
        # Save to database
        await db.personas.insert_one(persona.dict())
        
        logger.info(f"Persona created successfully: {persona.id}")
        return persona
        
    except Exception as e:
        logger.error(f"Error generating persona: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error generating persona: {str(e)}")

@api_router.post("/generate-share-card")
async def generate_share_card(request: ShareCardRequest):
    """Generate a 9:16 share card with PIL/Pillow"""
    try:
        # Get persona from database
        persona = await db.personas.find_one({"id": request.persona_id})
        if not persona:
            raise HTTPException(status_code=404, detail="Persona not found")
        
        # Create 9:16 canvas (1080x1920 for high quality)
        width, height = 1080, 1920
        card = Image.new('RGB', (width, height), color='#0a0a0a')
        draw = ImageDraw.Draw(card)
        
        # Load avatar from base64
        avatar_data = base64.b64decode(persona['avatar_base64'])
        avatar_img = Image.open(BytesIO(avatar_data))
        
        # Resize and position avatar
        avatar_size = 800
        avatar_img = avatar_img.resize((avatar_size, avatar_size), Image.Resampling.LANCZOS)
        avatar_position = ((width - avatar_size) // 2, 200)
        card.paste(avatar_img, avatar_position)
        
        # Add gradient overlay at bottom
        gradient = Image.new('RGBA', (width, 600), color=(0, 0, 0, 0))
        gradient_draw = ImageDraw.Draw(gradient)
        for y in range(600):
            alpha = int((y / 600) * 200)
            gradient_draw.rectangle([(0, y), (width, y + 1)], fill=(10, 10, 10, alpha))
        card.paste(gradient, (0, height - 600), gradient)
        
        # Add text (using default font, in production use custom fonts)
        try:
            # Try to use a nice font if available
            font_large = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 60)
            font_medium = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 40)
            font_small = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 30)
        except:
            font_large = ImageFont.load_default()
            font_medium = ImageFont.load_default()
            font_small = ImageFont.load_default()
        
        # Persona name
        name_text = persona['persona_name']
        name_bbox = draw.textbbox((0, 0), name_text, font=font_large)
        name_width = name_bbox[2] - name_bbox[0]
        draw.text(((width - name_width) // 2, height - 500), name_text, fill='#FFFFFF', font=font_large)
        
        # Quote
        quote_text = f'"{persona["share_quote"]}"'
        # Wrap text if too long
        words = quote_text.split()
        lines = []
        current_line = []
        for word in words:
            current_line.append(word)
            line_text = ' '.join(current_line)
            bbox = draw.textbbox((0, 0), line_text, font=font_medium)
            if bbox[2] - bbox[0] > width - 100:
                current_line.pop()
                if current_line:
                    lines.append(' '.join(current_line))
                current_line = [word]
        if current_line:
            lines.append(' '.join(current_line))
        
        y_position = height - 380
        for line in lines[:3]:  # Max 3 lines
            bbox = draw.textbbox((0, 0), line, font=font_medium)
            line_width = bbox[2] - bbox[0]
            draw.text(((width - line_width) // 2, y_position), line, fill='#00FFFF', font=font_medium)
            y_position += 50
        
        # Watermark
        watermark = "FIND ME AI"
        watermark_bbox = draw.textbbox((0, 0), watermark, font=font_small)
        watermark_width = watermark_bbox[2] - watermark_bbox[0]
        draw.text(((width - watermark_width) // 2, height - 100), watermark, fill='#707070', font=font_small)
        
        # Convert to base64
        buffer = BytesIO()
        card.save(buffer, format='PNG', quality=95)
        card_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
        
        return {
            "share_card_base64": card_base64,
            "persona_id": request.persona_id
        }
        
    except Exception as e:
        logger.error(f"Error generating share card: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error generating share card: {str(e)}")

@api_router.get("/personas", response_model=List[GeneratedPersona])
async def get_personas():
    try:
        personas = await db.personas.find().sort("created_at", -1).to_list(100)
        return [GeneratedPersona(**persona) for persona in personas]
    except Exception as e:
        logger.error(f"Error fetching personas: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching personas: {str(e)}")

@api_router.get("/personas/{persona_id}", response_model=GeneratedPersona)
async def get_persona(persona_id: str):
    try:
        persona = await db.personas.find_one({"id": persona_id})
        if not persona:
            raise HTTPException(status_code=404, detail="Persona not found")
        return GeneratedPersona(**persona)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching persona: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching persona: {str(e)}")

# Admin Endpoints
@api_router.post("/admin/persona/toggle")
async def admin_toggle_persona(update: PersonaThemeUpdate, x_admin_key: str = Header(None)):
    if x_admin_key != ADMIN_API_KEY:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    if update.theme_name not in PERSONA_THEMES:
        raise HTTPException(status_code=404, detail="Persona theme not found")
    
    PERSONA_THEMES[update.theme_name]['enabled'] = update.enabled
    if update.prompt_override:
        PERSONA_THEMES[update.theme_name]['prompt_override'] = update.prompt_override
    
    return {"message": f"Persona {update.theme_name} updated", "config": PERSONA_THEMES[update.theme_name]}

@api_router.get("/admin/stats")
async def admin_stats(x_admin_key: str = Header(None)):
    if x_admin_key != ADMIN_API_KEY:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    try:
        total_personas = await db.personas.count_documents({})
        personas_by_theme = {}
        for theme in PERSONA_THEMES.keys():
            count = await db.personas.count_documents({"persona_theme": theme})
            personas_by_theme[theme] = count
        
        return {
            "total_personas": total_personas,
            "personas_by_theme": personas_by_theme,
            "active_themes": [k for k, v in PERSONA_THEMES.items() if v['enabled']]
        }
    except Exception as e:
        logger.error(f"Error fetching stats: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching stats: {str(e)}")

@api_router.get("/admin/pricing")
async def get_pricing(x_admin_key: str = Header(None)):
    if x_admin_key != ADMIN_API_KEY:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    # Get from database or return default
    pricing = await db.config.find_one({"type": "pricing"})
    if not pricing:
        return PricingConfig().dict()
    return pricing

@api_router.put("/admin/pricing")
async def update_pricing(pricing: PricingConfig, x_admin_key: str = Header(None)):
    if x_admin_key != ADMIN_API_KEY:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    await db.config.update_one(
        {"type": "pricing"},
        {"$set": {**pricing.dict(), "type": "pricing"}},
        upsert=True
    )
    return {"message": "Pricing updated", "pricing": pricing}

@api_router.post("/purchase/validate")
async def validate_purchase(request: PurchaseValidationRequest):
    """Validate Google Play purchase"""
    try:
        # In production, validate with Google Play API
        # For now, simple validation
        logger.info(f"Validating purchase: {request.product_id} for user {request.user_id}")
        
        # Save purchase to database
        purchase_record = {
            "id": str(uuid.uuid4()),
            "product_id": request.product_id,
            "purchase_token": request.purchase_token,
            "user_id": request.user_id,
            "validated_at": datetime.utcnow(),
            "status": "valid"
        }
        
        await db.purchases.insert_one(purchase_record)
        
        return {
            "valid": True,
            "product_id": request.product_id,
            "message": "Purchase validated successfully"
        }
    except Exception as e:
        logger.error(f"Error validating purchase: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error validating purchase: {str(e)}")

# ============================================
# PHASE 3: VIRAL GROWTH FEATURES
# ============================================

@api_router.post("/generate-story-pack")
async def generate_story_pack(request: StoryPackRequest):
    """Generate 3-slide story pack for Instagram/TikTok"""
    try:
        # Get persona from database
        persona = await db.personas.find_one({"id": request.persona_id})
        if not persona:
            raise HTTPException(status_code=404, detail="Persona not found")
        
        logger.info(f"Generating story pack for persona: {request.persona_id}")
        
        # Canvas size: 1080x1920 (9:16)
        width, height = 1080, 1920
        slides = []
        
        # Load avatar
        avatar_data = base64.b64decode(persona['avatar_base64'])
        avatar_img = Image.open(BytesIO(avatar_data))
        
        try:
            font_large = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 70)
            font_medium = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 50)
            font_small = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 40)
            font_tiny = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 30)
        except:
            font_large = ImageFont.load_default()
            font_medium = ImageFont.load_default()
            font_small = ImageFont.load_default()
            font_tiny = ImageFont.load_default()
        
        # SLIDE 1: Avatar + Persona Name
        slide1 = Image.new('RGB', (width, height), color='#0a0a0a')
        draw1 = ImageDraw.Draw(slide1)
        
        # Add gradient background
        for y in range(height):
            alpha = int((y / height) * 100)
            color = (10 + alpha//3, 10 + alpha//5, 30 + alpha//2)
            draw1.rectangle([(0, y), (width, y + 1)], fill=color)
        
        # Resize and center avatar
        avatar_size = 700
        avatar_resized = avatar_img.resize((avatar_size, avatar_size), Image.Resampling.LANCZOS)
        avatar_position = ((width - avatar_size) // 2, 300)
        
        # Create circular mask
        mask = Image.new('L', (avatar_size, avatar_size), 0)
        mask_draw = ImageDraw.Draw(mask)
        mask_draw.ellipse([(0, 0), (avatar_size, avatar_size)], fill=255)
        
        slide1.paste(avatar_resized, avatar_position, mask)
        
        # Add persona name
        name_text = persona['persona_name']
        name_bbox = draw1.textbbox((0, 0), name_text, font=font_large)
        name_width = name_bbox[2] - name_bbox[0]
        draw1.text(((width - name_width) // 2, 1100), name_text, fill='#FFFFFF', font=font_large)
        
        # Add theme
        theme_text = persona['persona_theme']
        theme_bbox = draw1.textbbox((0, 0), theme_text, font=font_small)
        theme_width = theme_bbox[2] - theme_bbox[0]
        draw1.text(((width - theme_width) // 2, 1200), theme_text, fill='#00FFFF', font=font_small)
        
        # Watermark
        watermark = "FIND ME AI"
        watermark_bbox = draw1.textbbox((0, 0), watermark, font=font_tiny)
        watermark_width = watermark_bbox[2] - watermark_bbox[0]
        draw1.text(((width - watermark_width) // 2, height - 100), watermark, fill='#707070', font=font_tiny)
        
        # Convert to base64
        buffer1 = BytesIO()
        slide1.save(buffer1, format='PNG', quality=95)
        slide1_base64 = base64.b64encode(buffer1.getvalue()).decode('utf-8')
        slides.append(slide1_base64)
        
        # SLIDE 2: Traits + Bio
        slide2 = Image.new('RGB', (width, height), color='#0a0a0a')
        draw2 = ImageDraw.Draw(slide2)
        
        # Add gradient
        for y in range(height):
            alpha = int((y / height) * 100)
            color = (10 + alpha//3, 10 + alpha//5, 30 + alpha//2)
            draw2.rectangle([(0, y), (width, y + 1)], fill=color)
        
        # Title
        title = "PERSONALITY TRAITS"
        title_bbox = draw2.textbbox((0, 0), title, font=font_medium)
        title_width = title_bbox[2] - title_bbox[0]
        draw2.text(((width - title_width) // 2, 200), title, fill='#00FFFF', font=font_medium)
        
        # Traits
        y_pos = 350
        for i, trait in enumerate(persona['traits'][:5], 1):
            # Trait number
            draw2.ellipse([(100, y_pos), (150, y_pos + 50)], fill='#FF3366')
            num_bbox = draw2.textbbox((0, 0), str(i), font=font_small)
            num_width = num_bbox[2] - num_bbox[0]
            draw2.text((125 - num_width//2, y_pos + 5), str(i), fill='#FFFFFF', font=font_small)
            
            # Trait text - word wrap
            words = trait.split()
            lines = []
            current_line = []
            for word in words:
                current_line.append(word)
                line_text = ' '.join(current_line)
                bbox = draw2.textbbox((0, 0), line_text, font=font_small)
                if bbox[2] - bbox[0] > width - 250:
                    current_line.pop()
                    if current_line:
                        lines.append(' '.join(current_line))
                    current_line = [word]
            if current_line:
                lines.append(' '.join(current_line))
            
            for line in lines[:2]:  # Max 2 lines per trait
                draw2.text((180, y_pos), line, fill='#FFFFFF', font=font_small)
                y_pos += 55
            
            y_pos += 80
        
        # Watermark
        draw2.text(((width - watermark_width) // 2, height - 100), watermark, fill='#707070', font=font_tiny)
        
        buffer2 = BytesIO()
        slide2.save(buffer2, format='PNG', quality=95)
        slide2_base64 = base64.b64encode(buffer2.getvalue()).decode('utf-8')
        slides.append(slide2_base64)
        
        # SLIDE 3: CTA (Call-to-Action)
        slide3 = Image.new('RGB', (width, height), color='#0a0a0a')
        draw3 = ImageDraw.Draw(slide3)
        
        # Gradient
        for y in range(height):
            alpha = int((y / height) * 150)
            color = (20 + alpha//2, 10 + alpha//4, 40 + alpha//3)
            draw3.rectangle([(0, y), (width, y + 1)], fill=color)
        
        # Quote at top
        quote_text = f'"{persona["share_quote"]}"'
        words = quote_text.split()
        lines = []
        current_line = []
        for word in words:
            current_line.append(word)
            line_text = ' '.join(current_line)
            bbox = draw3.textbbox((0, 0), line_text, font=font_small)
            if bbox[2] - bbox[0] > width - 100:
                current_line.pop()
                if current_line:
                    lines.append(' '.join(current_line))
                current_line = [word]
        if current_line:
            lines.append(' '.join(current_line))
        
        y_pos = 400
        for line in lines[:4]:
            bbox = draw3.textbbox((0, 0), line, font=font_small)
            line_width = bbox[2] - bbox[0]
            draw3.text(((width - line_width) // 2, y_pos), line, fill='#00FFFF', font=font_small)
            y_pos += 60
        
        # CTA text
        cta_lines = [
            "DISCOVER YOUR",
            "ALTER EGO",
            "",
            "TAG A FRIEND",
            "AND I'LL GENERATE",
            "THEIR PERSONA TOO!"
        ]
        
        y_pos = 1000
        for line in cta_lines:
            if line == "":
                y_pos += 30
                continue
            bbox = draw3.textbbox((0, 0), line, font=font_medium)
            line_width = bbox[2] - bbox[0]
            fill_color = '#FF3366' if 'TAG' in line or 'FRIEND' in line else '#FFFFFF'
            draw3.text(((width - line_width) // 2, y_pos), line, fill=fill_color, font=font_medium)
            y_pos += 70
        
        # App name
        app_text = "FIND ME AI"
        app_bbox = draw3.textbbox((0, 0), app_text, font=font_large)
        app_width = app_bbox[2] - app_bbox[0]
        draw3.text(((width - app_width) // 2, height - 200), app_text, fill='#FFFFFF', font=font_large)
        
        buffer3 = BytesIO()
        slide3.save(buffer3, format='PNG', quality=95)
        slide3_base64 = base64.b64encode(buffer3.getvalue()).decode('utf-8')
        slides.append(slide3_base64)
        
        logger.info(f"Story pack generated successfully: 3 slides")
        
        return {
            "persona_id": request.persona_id,
            "slide_1_base64": slides[0],
            "slide_2_base64": slides[1],
            "slide_3_base64": slides[2],
            "template": request.template
        }
        
    except Exception as e:
        logger.error(f"Error generating story pack: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error generating story pack: {str(e)}")

@api_router.post("/remix-persona")
async def remix_persona(request: RemixPersonaRequest):
    """Generate variations of an existing persona"""
    try:
        # Get original persona
        original = await db.personas.find_one({"id": request.original_persona_id})
        if not original:
            raise HTTPException(status_code=404, detail="Original persona not found")
        
        logger.info(f"Remixing persona: {request.original_persona_id}")
        
        variations = []
        
        # Generate variations with different creative prompts
        variation_styles = [
            "more dramatic and intense",
            "softer and more approachable",
            "edgier and more rebellious"
        ]
        
        for i in range(min(request.variation_count, 3)):
            style = variation_styles[i]
            
            # Create variation prompt
            system_message = f"""
You are FIND ME AI. Create a VARIATION of the given persona with a {style} tone.

Keep the SAME persona theme but change:
- Persona name (make it different but related)
- Bio (rewrite with {style} approach)
- Traits (adjust to match {style} vibe)
- Quote (new quote with {style} energy)

Output format (in {original.get('language', 'tr')}):
PERSONA NAME: [New stylish name]
BIO: [2-3 sentences with {style} tone]
TRAITS:
- [Trait 1]
- [Trait 2]
- [Trait 3]
- [Trait 4]
- [Trait 5]
SHARE QUOTE: [New powerful quote]
"""
            
            chat = LlmChat(
                api_key=EMERGENT_LLM_KEY,
                session_id=str(uuid.uuid4()),
                system_message=system_message
            ).with_model("openai", "gpt-4o")
            
            user_message = UserMessage(
                text=f"""
Original Persona: {original['persona_name']}
Theme: {original['persona_theme']}
Original Bio: {original['bio_paragraph']}

Create a {style} variation of this persona.
"""
            )
            
            response = await chat.send_message(user_message)
            persona_data = parse_persona_response(response, original.get('language', 'tr'))
            
            # Create variation object
            variation = {
                "id": str(uuid.uuid4()),
                "original_persona_id": request.original_persona_id,
                "persona_name": persona_data['name'],
                "bio_paragraph": persona_data['bio'],
                "traits": persona_data['traits'],
                "share_quote": persona_data['quote'],
                "avatar_base64": original['avatar_base64'],  # Reuse original avatar
                "persona_theme": original['persona_theme'],
                "language": original.get('language', 'tr'),
                "variation_style": style,
                "created_at": datetime.utcnow()
            }
            
            # Save variation
            await db.persona_variations.insert_one(variation)
            variations.append(variation)
            
            logger.info(f"Variation {i+1} created: {variation['id']}")
        
        return {
            "original_persona_id": request.original_persona_id,
            "variations": [
                {
                    "id": v["id"],
                    "persona_name": v["persona_name"],
                    "bio_paragraph": v["bio_paragraph"],
                    "traits": v["traits"],
                    "share_quote": v["share_quote"],
                    "avatar_base64": v["avatar_base64"],
                    "variation_style": v["variation_style"]
                }
                for v in variations
            ]
        }
        
    except Exception as e:
        logger.error(f"Error remixing persona: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error remixing persona: {str(e)}")


def parse_persona_response(response: str, language: str = 'tr') -> dict:
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
        
        # Language-specific keywords
        keywords = {
            'tr': {
                'name': ['PERSONA ADI:', 'PERSONA NAME:'],
                'bio': ['BİO:', 'BIO:'],
                'traits': ['ÖZELLİKLER:', 'TRAITS:', 'FEATURES:'],
                'quote': ['PAYLAŞIM SÖZÜ:', 'SHARE QUOTE:', 'QUOTE:']
            },
            'en': {
                'name': ['PERSONA NAME:', 'PERSONA ADI:'],
                'bio': ['BIO:', 'BİO:'],
                'traits': ['TRAITS:', 'FEATURES:', 'ÖZELLİKLER:'],
                'quote': ['SHARE QUOTE:', 'QUOTE:', 'PAYLAŞIM SÖZÜ:']
            }
        }
        
        kw = keywords.get(language, keywords['en'])
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
            
            # Check for section headers
            if any(line.startswith(k) for k in kw['name']):
                for k in kw['name']:
                    if line.startswith(k):
                        persona_data['name'] = line.split(':', 1)[1].strip()
                        break
            elif any(line.startswith(k) for k in kw['bio']):
                current_section = 'bio'
                for k in kw['bio']:
                    if line.startswith(k):
                        bio_text = line.split(':', 1)[1].strip()
                        if bio_text:
                            persona_data['bio'] = bio_text
                        break
            elif any(line.startswith(k) for k in kw['traits']):
                current_section = 'traits'
            elif any(line.startswith(k) for k in kw['quote']):
                current_section = 'quote'
                for k in kw['quote']:
                    if line.startswith(k):
                        quote_text = line.split(':', 1)[1].strip()
                        if quote_text:
                            persona_data['quote'] = quote_text
                        break
            elif line.startswith('-') and current_section == 'traits':
                trait = line.lstrip('- ').strip()
                if trait:
                    persona_data['traits'].append(trait)
            elif current_section == 'bio' and not any(line.startswith(k) for klist in kw.values() for k in klist):
                persona_data['bio'] += ' ' + line
            elif current_section == 'quote' and not any(line.startswith(k) for klist in kw.values() for k in klist):
                persona_data['quote'] += ' ' + line
        
        # Fallbacks
        if not persona_data['name']:
            persona_data['name'] = 'Mysterious Persona' if language == 'en' else 'Gizemli Persona'
        if not persona_data['bio']:
            persona_data['bio'] = 'A unique and fascinating individual.' if language == 'en' else 'Benzersiz ve büyüleyici bir birey.'
        if not persona_data['traits']:
            persona_data['traits'] = ['Unique', 'Mysterious', 'Charismatic', 'Powerful', 'Inspiring'] if language == 'en' else ['Benzersiz', 'Gizemli', 'Karizmatik', 'Güçlü', 'İlham Verici']
        if not persona_data['quote']:
            persona_data['quote'] = 'Be yourself, everyone else is taken.' if language == 'en' else 'Kendin ol, diğerleri zaten alınmış.'
            
        return persona_data
        
    except Exception as e:
        logger.error(f"Error parsing persona response: {str(e)}")
        return {
            'name': 'Mysterious Persona' if language == 'en' else 'Gizemli Persona',
            'bio': 'A unique and fascinating individual.' if language == 'en' else 'Benzersiz ve büyüleyici bir birey.',
            'traits': ['Unique', 'Mysterious', 'Charismatic', 'Powerful', 'Inspiring'] if language == 'en' else ['Benzersiz', 'Gizemli', 'Karizmatik', 'Güçlü', 'İlham Verici'],
            'quote': 'Be yourself, everyone else is taken.' if language == 'en' else 'Kendin ol, diğerleri zaten alınmış.'
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

@api_router.get("/download-source")
async def download_source():
    """Temporary endpoint to download source code"""
    from fastapi.responses import FileResponse
    import os
    file_path = "/tmp/find-me-ai-github.tar.gz"
    if os.path.exists(file_path):
        return FileResponse(
            path=file_path,
            media_type='application/gzip',
            filename='find-me-ai-source.tar.gz'
        )
    raise HTTPException(status_code=404, detail="Source file not found")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
