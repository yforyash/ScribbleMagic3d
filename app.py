import streamlit as st
import requests
import numpy as np
import tensorflow as tf
from streamlit_drawable_canvas import st_canvas
import cv2
from PIL import Image
import pytesseract
import easyocr
import time
import pandas as pd

from database import init_db, insert_record, fetch_history

# ---------------- CONFIG ----------------
st.set_page_config(page_title="3D Pen + AI Analyzer", layout="wide")

API_URL = "http://127.0.0.1:8000"

# ---------------- INIT DB ----------------
init_db()

# ---------------- SESSION ----------------
if "token" not in st.session_state:
    st.session_state.token = None

if "login_time" not in st.session_state:
    st.session_state.login_time = None

if "user" not in st.session_state:
    st.session_state.user = None

def get_user():
    return st.session_state.user

# ---------------- LOGIN ----------------
if not st.session_state.token:

    st.title("🔐 Login Required")

    username = st.text_input("Username")
    password = st.text_input("Password", type="password")

    if st.button("Login"):
        res = requests.post(
            f"{API_URL}/login",
            data={"username": username, "password": password}
        )

        if res.status_code == 200:
            st.session_state.token = res.json()["access_token"]
            st.session_state.login_time = time.time()
            st.session_state.user = username
            st.success("Login successful")
            st.rerun()
        else:
            st.error("Invalid credentials")

    st.stop()

# ---------------- SESSION EXPIRY ----------------
if time.time() - st.session_state.login_time > 1800:
    st.session_state.token = None
    st.session_state.login_time = None
    st.session_state.user = None
    st.warning("Session expired")
    st.rerun()

# ---------------- HEADER ----------------
st.title("🧠 3D Pen + File + Handwriting AI System")

# ---------------- LOGOUT ----------------
col1, col2 = st.columns([8, 2])
with col2:
    if st.button("🚪 Logout"):
        st.session_state.clear()
        st.rerun()

# ---------------- MODEL ----------------
@st.cache_resource
def load_model():
    return tf.keras.models.load_model("mnist_model.h5")

model = load_model()

# ---------------- OCR ----------------
reader = easyocr.Reader(['en'], gpu=False)

# ---------------- MODE ----------------
mode = st.radio(
    "Select Mode",
    ["🔢 Digit Recognition", "📝 Text Recognition (OCR)"]
)

# ---------------- FILE UPLOAD ----------------
st.header("📁 Upload File")

file = st.file_uploader("Upload image", type=["png", "jpg", "jpeg"])

if file:
    image = Image.open(file)
    st.image(image, use_container_width=True)

    img = np.array(image)
    text = pytesseract.image_to_string(img)

    st.subheader("📄 Extracted Text")
    st.write(text if text.strip() else "No text detected")

    insert_record(get_user(), "OCR_FILE", text, None, time.strftime("%H:%M:%S"))

# ---------------- CANVAS ----------------
st.header("✍️ Handwriting Input")

canvas = st_canvas(
    fill_color="black",
    stroke_width=20,
    stroke_color="white",
    background_color="black",
    height=500,
    width=900,
    drawing_mode="freedraw",
    key="canvas",
)

# ---------------- DIGIT ----------------
col1, col2 = st.columns(2)

with col1:
    if mode == "🔢 Digit Recognition":
        if st.button("Predict Digit"):
            if canvas.image_data is not None:

                img = canvas.image_data
                img = cv2.cvtColor(img.astype(np.uint8), cv2.COLOR_RGBA2GRAY)
                img = 255 - img
                img = cv2.resize(img, (28, 28))
                img = img / 255.0
                img = img.reshape(1, 28, 28, 1)

                pred = model.predict(img)
                digit = int(np.argmax(pred))
                conf = float(np.max(pred))

                st.success(f"Digit: {digit}")
                st.info(f"Confidence: {conf:.2f}")

                insert_record(get_user(), "Digit", str(digit), conf, time.strftime("%H:%M:%S"))

# ---------------- OCR ----------------
def preprocess(img):
    gray = cv2.cvtColor(img, cv2.COLOR_RGBA2GRAY)
    gray = cv2.resize(gray, None, fx=2, fy=2, interpolation=cv2.INTER_CUBIC)
    gray = cv2.GaussianBlur(gray, (3, 3), 0)
    return gray

with col2:
    if mode == "📝 Text Recognition (OCR)":
        if st.button("Read Handwriting"):
            if canvas.image_data is not None:

                img = canvas.image_data.astype(np.uint8)
                processed = preprocess(img)

                result = reader.readtext(processed)

                text = " ".join([r[1] for r in result])

                st.subheader("📝 Recognized Text")
                st.write(text if text.strip() else "Nothing detected")

                insert_record(get_user(), "OCR_HANDWRITING", text, None, time.strftime("%H:%M:%S"))

# ---------------- HISTORY ----------------
st.markdown("---")
st.subheader("📊 History")

rows = fetch_history(get_user())

if len(rows) == 0:
    st.info("No history yet")
else:
    df = pd.DataFrame(rows, columns=["Type", "Value", "Confidence", "Time"])

    st.dataframe(df)

    st.download_button(
        "📥 Download CSV",
        df.to_csv(index=False),
        "history.csv",
        "text/csv"
    )

# ---------------- ANALYTICS ----------------
st.markdown("---")
st.subheader("📊 Analytics")

digit_rows = [r for r in rows if r[0] == "Digit"]

st.metric("🔢 Total Digits", len(digit_rows))
st.metric("📝 OCR Operations", len(rows) - len(digit_rows))

if digit_rows:
    digits = [int(r[1]) for r in digit_rows]

    freq = {}
    for d in digits:
        freq[d] = freq.get(d, 0) + 1

    st.bar_chart(freq)