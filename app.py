import streamlit as st
import numpy as np
import tensorflow as tf
from streamlit_drawable_canvas import st_canvas
import cv2
from PIL import Image
import pytesseract

st.set_page_config(page_title="3D Pen AI Text Analyzer", layout="wide")

st.title("🧠 3D Pen + File + Handwriting Text Analyzer")

# ---------------- MODEL ----------------
@st.cache_resource
def load_model():
    return tf.keras.models.load_model("mnist_model.h5")

model = load_model()

# ---------------- FILE UPLOAD ----------------
st.header("📁 Upload File (Image / Document)")

file = st.file_uploader("Upload image", type=["png", "jpg", "jpeg"])

if file:
    image = Image.open(file)
    st.image(image, use_column_width=True)

    img = np.array(image)
    text = pytesseract.image_to_string(img)

    st.subheader("📄 Extracted Text")
    st.write(text if text.strip() else "No text detected")

# ---------------- HANDWRITING / 3D PEN INPUT ----------------
st.header("✍️ 3D Pen / Handwriting Input Area")

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

col1, col2 = st.columns(2)

# ---------------- DIGIT MODEL (OLD) ----------------
with col1:
    if st.button("🔢 Predict Digit (ML Model)"):
        if canvas.image_data is not None:
            img = canvas.image_data

            img = cv2.cvtColor(img.astype(np.uint8), cv2.COLOR_RGBA2GRAY)
            img = 255 - img
            img = cv2.resize(img, (28, 28))
            img = img / 255.0
            img = img.reshape(1, 28, 28, 1)

            pred = model.predict(img)
            digit = np.argmax(pred)
            conf = np.max(pred)

            st.success(f"Digit: {digit}")
            st.info(f"Confidence: {conf:.2f}")

# ---------------- OCR FOR HANDWRITING ----------------
with col2:
    if st.button("🧠 Read Handwriting (Text OCR)"):
        if canvas.image_data is not None:

            img = canvas.image_data.astype(np.uint8)
            img = cv2.cvtColor(img, cv2.COLOR_RGBA2BGR)

            text = pytesseract.image_to_string(img)

            st.subheader("📝 Recognized Text")
            st.write(text if text.strip() else "Nothing detected")