import os
import sys
import numpy as np
import pandas as pd
import tensorflow as tf
import re

EXPECTED_TIMESTEPS = 36
EXPECTED_FEATURES = 6

if len(sys.argv) != 2:
    print("Usage: python3 predict_tflite.py <path_to_csv_folder>")
    sys.exit(1)

test_folder = sys.argv[1]

# Load TFLite model
interpreter = tf.lite.Interpreter(model_path="model_quantized.tflite")
interpreter.allocate_tensors()

input_details = interpreter.get_input_details()
output_details = interpreter.get_output_details()

correct = 0
total = 0

for file in os.listdir(test_folder):
    if not file.endswith(".csv"):
        continue

    # ---- get label from filename ----
    match = re.search(r"_digit_(\d)", file)
    if not match:
        print(f"Skipping {file} (no label in filename)")
        continue
    y_true = int(match.group(1))

    file_path = os.path.join(test_folder, file)
    data = pd.read_csv(file_path)

    # ---- read features ----
    X = data.values.astype(np.float32)

    # ---- fix timesteps ----
    if X.shape[0] < EXPECTED_TIMESTEPS:
        X = np.pad(X, ((0, EXPECTED_TIMESTEPS - X.shape[0]), (0, 0)))
    elif X.shape[0] > EXPECTED_TIMESTEPS:
        X = X[:EXPECTED_TIMESTEPS, :]

    # ---- fix features ----
    if X.shape[1] < EXPECTED_FEATURES:
        X = np.pad(X, ((0, 0), (0, EXPECTED_FEATURES - X.shape[1])))
    elif X.shape[1] > EXPECTED_FEATURES:
        X = X[:, :EXPECTED_FEATURES]

    # ✅ FINAL SHAPE FIX (THIS WAS MISSING)
    X = np.expand_dims(X, axis=0)   # batch
    X = np.expand_dims(X, axis=-1)  # channel

    # ---- inference ----
    interpreter.set_tensor(input_details[0]['index'], X)
    interpreter.invoke()
    output = interpreter.get_tensor(output_details[0]['index'])

    y_pred = int(np.argmax(output))

    result = "Correct" if y_pred == y_true else "Wrong"
    print(f"{file} → Predicted: {y_pred}, Actual: {y_true} ({result})")

    if y_pred == y_true:
        correct += 1
    total += 1

accuracy = (correct / total) * 100 if total > 0 else 0
print(f"\n✅ Final Accuracy: {accuracy:.2f}%")
