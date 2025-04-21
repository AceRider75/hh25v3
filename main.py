import os
from dotenv import load_dotenv
import tempfile
import shutil
import whisper
import io
from fastapi import FastAPI, File, UploadFile, HTTPException, Query
from fastapi.staticfiles import StaticFiles
from fastapi.responses import StreamingResponse, HTMLResponse, JSONResponse
from pydantic import BaseModel
from groq import Groq
from gtts import gTTS
from PIL import Image
import requests
import base64
from typing import Optional, List, Dict, Any
from huggingface_hub import InferenceClient

# Load environment variables
load_dotenv()

# WARNING: Hardcoding API keys is insecure. Replace with environment variable loading.
# api_key = os.environ.get("GROQ_API_KEY")
# Replace with your key or env var loading

# --- Globals --- 
# Initialize Groq client with API key from environment variable
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

# Load Whisper model (Choose model size based on resources/accuracy needs: "tiny", "base", "small", "medium", "large")
# Downloads the model on first run
try:
    print("Loading Whisper model...")
    # Using "base" model for faster loading and less resource usage.
    # Consider "small" or "medium" for better accuracy if resources allow.
    whisper_model = whisper.load_model("base") 
    print("Whisper model loaded.")
except Exception as e:
    print(f"Error loading Whisper model: {e}")
    # Handle cases where model loading fails (e.g., no internet on first run)
    whisper_model = None 

app = FastAPI()

# --- Mount Static Files --- Must be defined before routes that might overlap
app.mount("/static", StaticFiles(directory="static"), name="static")

class TextInput(BaseModel):
    text: str

# --- Configuration ---
# WARNING: Hardcoding API keys is insecure. Replace with environment variable loading.
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if not GROQ_API_KEY:
    raise ValueError("GROQ_API_KEY environment variable is not set")
LLM_MODEL = "llama3-8b-8192" # Or choose another model like mixtral-8x7b-32768
WHISPER_MODEL = "base"
MAX_HISTORY_MESSAGES = 10 # Limit the number of messages sent to the API

# Simple in-memory conversation history (reset on server restart)
conversation_history: List[Dict[str, Any]] = []

# Initialize Hugging Face client with API key from environment variable
hf_client = InferenceClient(token=os.getenv("HUGGINGFACE_API_KEY"))

# Initialize Hugging Face client
HF_API_TOKEN = os.getenv("HUGGINGFACE_API_KEY")
if not HF_API_TOKEN:
    raise ValueError("HUGGINGFACE_API_KEY environment variable is not set")
HF_client = InferenceClient(token=HF_API_TOKEN)

# --- Helper Functions --- 
def _limit_history(history: List[Dict[str, Any]], max_messages: int) -> List[Dict[str, Any]]:
    """Keeps the most recent messages within the specified limit."""
    return history[-max_messages:]

def _filter_string_history(history: List[Dict[str, Any]]) -> List[Dict[str, str]]:
    """Filters history to include only messages with string content for standard LLM calls."""
    string_history = []
    for msg in history:
        if isinstance(msg.get("content"), str):
            string_history.append(msg) # Type assertion needed if using strict typing
    return string_history

async def _text_to_speech_response(text: str, lang: str = 'en'):
    """Generates MP3 audio stream from text using gTTS and returns StreamingResponse."""
    try:
        tts = gTTS(text=text, lang=lang)
        mp3_fp = io.BytesIO()
        tts.write_to_fp(mp3_fp)
        mp3_fp.seek(0)
        return StreamingResponse(mp3_fp, media_type="audio/mpeg")
    except Exception as e:
        print(f"Error during speech synthesis helper: {e}")
        raise HTTPException(status_code=500, detail=f"TTS Generation Error: {str(e)}")

# --- API Endpoints --- 
@app.get("/", response_class=HTMLResponse)
async def get_index():
    """Serves the main HTML page."""
    try:
        with open("index.html", "r") as f:
            html_content = f.read()
        return HTMLResponse(content=html_content)
    except FileNotFoundError:
         raise HTTPException(status_code=404, detail="index.html not found")
    except Exception as e:
        print(f"Error reading index.html: {e}")
        raise HTTPException(status_code=500, detail="Could not load page.")

@app.post("/process_text")
async def process_text(
    input_data: TextInput,
    output_format: str = Query("text", enum=["text", "audio"]),
    lang: str = Query("en")
):
    """Processes text input, maintains history, instructs LLM on response language, and returns text or audio response."""
    global conversation_history
    try:
        # Add user message to history
        conversation_history.append({"role": "user", "content": input_data.text})
        limited_history = _limit_history(conversation_history, MAX_HISTORY_MESSAGES)
        
        # Filter history for API call (only string content)
        api_history = _filter_string_history(limited_history)

        # --- Add System Prompt for Language --- 
        # Map lang code to a language name if needed, or use the code directly
        # Simple approach: use the code directly if models understand it, 
        # otherwise map common codes to names.
        # Example mapping (expand as needed):
        lang_map = {"en": "English", "es": "Spanish", "fr": "French", "de": "German", "it": "Italian", "pt": "Portuguese", "hi": "Hindi", "ja": "Japanese", "ko": "Korean"}
        response_lang_name = lang_map.get(lang, lang) # Fallback to code if not in map
        system_prompt = {"role": "system", "content": f"Please respond ONLY in {response_lang_name}."}
        messages_for_api = [system_prompt] + api_history
        # --- End System Prompt --- 
        
        # Process text with Groq using filtered history and system prompt
        chat_completion = client.chat.completions.create(
            messages=messages_for_api, # Send history with system prompt
            model=LLM_MODEL,
        )
        
        response_text = chat_completion.choices[0].message.content

        # Add assistant response (string) to the main history
        # Store the actual response without the system prompt part
        conversation_history.append({"role": "assistant", "content": response_text})
        conversation_history = _limit_history(conversation_history, MAX_HISTORY_MESSAGES) 

        if output_format.lower() == "audio":
            # Pass lang to TTS
            return await _text_to_speech_response(response_text, lang=lang)
        else:
            # Return the actual response text
            return JSONResponse(content={"response": response_text})

    except HTTPException:
         raise
    except Exception as e:
        print(f"Error processing text: {e}")
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

@app.post("/process_audio")
async def process_audio(
    file: UploadFile = File(...),
    output_format: str = Query("text", enum=["text", "audio"]),
    lang: str = Query("en")
):
    """Processes audio input, maintains history, instructs LLM on response language, and returns text or audio response."""
    global conversation_history
    if not whisper_model:
        raise HTTPException(status_code=503, detail="Whisper model is not available.")

    transcription = ""
    temp_file_path = ""
    # Use a context manager for the TemporaryDirectory to ensure cleanup
    with tempfile.TemporaryDirectory() as temp_dir:
        temp_file_path = os.path.join(temp_dir, file.filename or "audio.tmp") # Use default if no filename

        try:
            # Use async file operations if possible, but shutil is sync
            with open(temp_file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
        except Exception as e:
            print(f"Error saving temporary file: {e}")
            raise HTTPException(status_code=500, detail="Error saving uploaded file.")
        finally:
            await file.close() # Ensure original file handle is closed

        try:
            print(f"Transcribing {file.filename or 'audio file'}... (lang={lang})" )
            result = whisper_model.transcribe(temp_file_path, language=lang if lang != "auto" else None)
            transcription = result["text"]
            print(f"Transcription: {transcription}")
        except Exception as e:
            print(f"Error during transcription: {e}")
            raise HTTPException(status_code=500, detail=f"Error during transcription: {str(e)}")

    if transcription:
        try:
            # Add user message (transcription) to history
            conversation_history.append({"role": "user", "content": transcription})
            limited_history = _limit_history(conversation_history, MAX_HISTORY_MESSAGES)

            # Filter history for API call (only string content)
            api_history = _filter_string_history(limited_history)
            
            # --- Add System Prompt for Language --- 
            lang_map = {"en": "English", "es": "Spanish", "fr": "French", "de": "German", "it": "Italian", "pt": "Portuguese", "hi": "Hindi", "ja": "Japanese", "ko": "Korean"}
            response_lang_name = lang_map.get(lang, lang)
            system_prompt = {"role": "system", "content": f"Please respond ONLY in {response_lang_name}."}
            messages_for_api = [system_prompt] + api_history
            # --- End System Prompt --- 

            # Process transcription with Groq using filtered history and system prompt
            chat_completion = client.chat.completions.create(
                messages=messages_for_api, # Send history with system prompt
                model=LLM_MODEL,
            )
            
            response_text = chat_completion.choices[0].message.content

            # Add assistant response to the main history
            conversation_history.append({"role": "assistant", "content": response_text})
            conversation_history = _limit_history(conversation_history, MAX_HISTORY_MESSAGES)

            if output_format.lower() == "audio":
                print("Generating audio response...")
                return await _text_to_speech_response(response_text, lang=lang)
            else:
                return JSONResponse(content={"response": response_text})

        except HTTPException:
             raise
        except Exception as e:
            print(f"Error processing audio with Groq or TTS: {e}")
            raise HTTPException(status_code=500, detail=f"Error after transcription: {str(e)}")
    else:
        raise HTTPException(status_code=400, detail="Transcription failed or resulted in empty text.")

@app.post("/process_image")
async def process_image(
    file: UploadFile = File(...),
    output_format: str = Query("text", enum=["text", "audio"]),
    lang: str = Query("en")
):
    """Processes image upload using Hugging Face's image captioning model."""
    global conversation_history
    try:
        # Read the image file
        contents = await file.read()
        image = Image.open(io.BytesIO(contents))
        
        # Convert image to bytes for API
        img_byte_arr = io.BytesIO()
        image.save(img_byte_arr, format=image.format or 'PNG')
        img_byte_arr = img_byte_arr.getvalue()
        
        # Add user message to history
        user_message = {"role": "user", "content": "[User uploaded an image]"}
        conversation_history.append(user_message)
        conversation_history = _limit_history(conversation_history, MAX_HISTORY_MESSAGES)
        
        # Get image caption from Hugging Face
        caption = HF_client.image_to_text(img_byte_arr)
        
        # Add assistant response to history
        assistant_message = {"role": "assistant", "content": caption}
        conversation_history.append(assistant_message)
        conversation_history = _limit_history(conversation_history, MAX_HISTORY_MESSAGES)
        
        if output_format.lower() == "audio":
            return await _text_to_speech_response(caption, lang=lang)
        else:
            return JSONResponse(content={"response": caption})
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error processing image: {e}")
        raise HTTPException(status_code=500, detail=f"Error processing image: {str(e)}")

@app.post("/clear_history")
async def clear_history():
    """Clears the conversation history on the backend."""
    global conversation_history
    conversation_history = []
    return {"status": "success"}

# We will add more endpoints here later for handling text, audio, image inputs, etc. 

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 