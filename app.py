import streamlit as st
import numpy as np
import tensorflow as tf
from streamlit_drawable_canvas import st_canvas
import cv2

st.set_page_config(page_title="Digit Recognition", layout="centered")

st.title("✍️ Draw Digit Recognition (Real Working)")

# Load MNIST-trained model
@st.cache_resource
def load_model():
    model = tf.keras.models.load_model("mnist_model.h5")
    return model

model = load_model()

canvas = st_canvas(
    fill_color="black",
    stroke_width=15,
    stroke_color="white",
    background_color="black",
    height=280,
    width=280,
    drawing_mode="freedraw",
    key="canvas",
)

if st.button("🔍 Predict"):
    if canvas.image_data is not None:

        img = canvas.image_data

        # grayscale
        img = cv2.cvtColor(img.astype(np.uint8), cv2.COLOR_RGBA2GRAY)

        # invert
        img = 255 - img

        # resize to 28x28
        img = cv2.resize(img, (28, 28))

        # normalize
        img = img / 255.0

        # reshape
        img = img.reshape(1, 28, 28, 1)

        pred = model.predict(img)
        digit = int(np.argmax(pred))
        conf = float(np.max(pred))

        st.success(f"✅ Predicted: {digit}")
        st.info(f"Confidence: {conf:.2f}")