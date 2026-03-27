import streamlit as st
import pandas as pd
import numpy as np
import tensorflow as tf

# Page config
st.set_page_config(page_title="Digit Recognition Demo", layout="centered")

st.title("✋ Sensor-based Digit Recognition")
st.write("Upload a CSV file to predict the digit")

# Load TFLite model (cached)
@st.cache_resource
def load_model():
    interpreter = tf.lite.Interpreter(model_path="model_quantized.tflite")
    interpreter.allocate_tensors()
    return interpreter

interpreter = load_model()
input_details = interpreter.get_input_details()
output_details = interpreter.get_output_details()

# File upload
uploaded_file = st.file_uploader("📂 Upload CSV file", type=["csv"])

if uploaded_file is not None:
    try:
        # Read CSV
        data = pd.read_csv(uploaded_file)
        st.subheader("📊 Uploaded Data Preview")
        st.dataframe(data.head())

        X = data.values.astype(np.float32)

        # 🔧 Fix shape (36 x 6)
        if X.shape[0] < 36:
            X = np.pad(X, ((0, 36 - X.shape[0]), (0, 0)))
        elif X.shape[0] > 36:
            X = X[:36, :]

        if X.shape[1] < 6:
            X = np.pad(X, ((0, 0), (0, 6 - X.shape[1])))
        elif X.shape[1] > 6:
            X = X[:, :6]

        # Reshape for model
        X = np.expand_dims(X, axis=0)
        X = np.expand_dims(X, axis=-1)

        # Prediction button
        if st.button("🔍 Predict Digit"):
            interpreter.set_tensor(input_details[0]['index'], X)
            interpreter.invoke()
            output = interpreter.get_tensor(output_details[0]['index'])

            pred = int(np.argmax(output))
            confidence = float(np.max(output))

            st.success(f"✅ Predicted Digit: {pred}")
            st.info(f"📈 Confidence: {confidence:.2f}")

    except Exception as e:
        st.error(f"❌ Error processing file: {e}")

else:
    st.warning("⚠️ Please upload a CSV file to proceed")