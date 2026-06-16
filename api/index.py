import time
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import os
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

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

try:
    init_db()
except Exception:
    pass

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

frontend_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend")
if os.path.exists(frontend_path):
    app.mount("/", StaticFiles(directory=frontend_path, html=True), name="static")
