import os
import pandas as pd
import numpy as np

data_folder = "data"

for file in os.listdir(data_folder):
    if file.endswith(".csv"):
        file_path = os.path.join(data_folder, file)
        df = pd.read_csv(file_path, header=None)

        if df.shape[0] < 36:
            pad_rows = 36 - df.shape[0]
            df = pd.concat([df, pd.DataFrame(np.zeros((pad_rows, df.shape[1])))], ignore_index=True)
            df.to_csv(file_path, header=False, index=False)
            print(f"Padded '{file}' with {pad_rows} rows.")
        elif df.shape[0] > 36:
            original_rows = df.shape[0]
            df = df.iloc[:36, :]
            df.to_csv(file_path, header=False, index=False)
            print(f"Truncated '{file}' from {original_rows} to 36 rows.")
        else:
            print(f"No changes needed for '{file}'.")
