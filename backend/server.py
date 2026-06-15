import base64
import io
import time
import sqlite3
import numpy as np
import tensorflow as tf
import cv2
import easyocr
import os
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from PIL import Image
from database import (
    init_db,
    insert_record,
    fetch_history,
    delete_history,
    create_user,
    verify_user,
    get_user_question,
    reset_password
)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

init_db()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
model = tf.keras.models.load_model(os.path.join(BASE_DIR, "mnist_model.h5"))
reader = easyocr.Reader(["en"], gpu=False)

class ImageRequest(BaseModel):
    image: str
    user: str

class RecordRequest(BaseModel):
    user: str
    type: str
    value: str
    confidence: float

class SignupRequest(BaseModel):
    username: str
    password: str
    question: str
    answer: str

class LoginRequest(BaseModel):
    username: str
    password: str

class ResetRequest(BaseModel):
    username: str
    answer: str
    new_password: str

def decode_image(data_url):
    header, encoded = data_url.split(",", 1)
    decoded = base64.b64decode(encoded)
    return Image.open(io.BytesIO(decoded))

@app.post("/api/signup")
async def signup(req: SignupRequest):
    success = create_user(req.username, req.password, req.question, req.answer)
    if not success:
        raise HTTPException(status_code=400, detail="Username already exists")
    return {"status": "success"}

@app.post("/api/login")
async def login(req: LoginRequest):
    valid = verify_user(req.username, req.password)
    if not valid:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return {"status": "success", "username": req.username}

@app.get("/api/forgot-password/{username}")
async def forgot_password(username: str):
    question = get_user_question(username)
    if not question:
        raise HTTPException(status_code=404, detail="Username not found")
    return {"question": question}

@app.post("/api/reset-password")
async def reset_pass(req: ResetRequest):
    success = reset_password(req.username, req.answer, req.new_password)
    if not success:
        raise HTTPException(status_code=400, detail="Incorrect answer")
    return {"status": "success"}

@app.post("/api/predict-digit")
async def predict_digit(req: ImageRequest):
    try:
        img = decode_image(req.image)
        img_np = np.array(img.convert("L"))
        
        if np.mean(img_np) > 127:
            img_np = 255 - img_np
            
        _, thresh = cv2.threshold(img_np, 30, 255, cv2.THRESH_BINARY)
        contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        if contours:
            x, y, w, h = cv2.boundingRect(max(contours, key=cv2.contourArea))
            digit_roi = img_np[y:y+h, x:x+w]
            pad_h = int(max(w, h) * 0.2)
            digit_roi = cv2.copyMakeBorder(digit_roi, pad_h, pad_h, pad_h, pad_h, cv2.BORDER_CONSTANT, value=0)
        else:
            digit_roi = img_np
            
        img_resized = cv2.resize(digit_roi, (28, 28), interpolation=cv2.INTER_AREA)
        img_norm = img_resized / 255.0
        img_input = img_norm.reshape(1, 28, 28, 1)
        
        pred = model.predict(img_input)
        digit = int(np.argmax(pred))
        conf = float(np.max(pred))
        
        insert_record(req.user, "Digit", str(digit), conf, time.strftime("%Y-%m-%d %H:%M:%S"))
        return {"digit": digit, "confidence": conf}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/predict-text")
async def predict_text(req: ImageRequest):
    try:
        img = decode_image(req.image)
        img_np = np.array(img.convert("RGB"))
        
        results = reader.readtext(img_np)
        text = " ".join([r[1] for r in results]).strip()
        
        insert_record(req.user, "OCR", text if text else "None", 1.0, time.strftime("%Y-%m-%d %H:%M:%S"))
        return {"text": text if text else "Not recognized"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/log-history")
async def log_history(req: RecordRequest):
    try:
        insert_record(req.user, req.type, req.value, req.confidence, time.strftime("%Y-%m-%d %H:%M:%S"))
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/history/{user}")
async def get_history(user: str):
    try:
        rows = fetch_history(user)
        history_list = []
        for r in rows:
            history_list.append({
                "type": r[0],
                "value": r[1],
                "confidence": r[2],
                "timestamp": r[3]
            })
        return history_list
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/clear-history/{user}")
async def clear_history(user: str):
    try:
        delete_history(user)
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

frontend_dir = os.path.join(os.path.dirname(BASE_DIR), "frontend")
app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="static")
