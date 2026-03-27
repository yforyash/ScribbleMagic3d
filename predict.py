import numpy as np
import pandas as pd
import tensorflow as tf
import sys

def load_and_prepare(csv_path, timesteps=36, channels=6):
    df = pd.read_csv(csv_path, header=None)
    data = df.values

    if data.shape != (timesteps, channels):
        print(f"Error: Expected shape (36,6), but got {data.shape}")
        sys.exit()

    data = data.reshape(1, timesteps, channels, 1).astype(np.float32)
    return data

def predict(csv_path):
    interpreter = tf.lite.Interpreter(model_path="model.tflite")
    interpreter.allocate_tensors()

    input_details = interpreter.get_input_details()
    output_details = interpreter.get_output_details()

    x = load_and_prepare(csv_path, timesteps=input_details[0]['shape'][1],
                         channels=input_details[0]['shape'][2])

    interpreter.set_tensor(input_details[0]['index'], x)
    interpreter.invoke()

    output_data = interpreter.get_tensor(output_details[0]['index'])
    predicted_class = int(np.argmax(output_data))
    
    print("\n------------------------------")
    print(f"📄 File: {csv_path}")
    print(f"✅ Predicted Digit: {predicted_class}")
    print(f"📊 Model Output: {output_data}")
    print("------------------------------")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 predict.py <csv_file_path>")
    else:
        predict(sys.argv[1])
