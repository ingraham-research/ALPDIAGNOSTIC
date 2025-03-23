import sys
import pandas as pd
from io import StringIO
import numpy as np

# Function to process the session data
def process_session_data(file_content):
    # Step 1: Read CSV from the content passed via stdin
    df = pd.read_csv(StringIO(file_content))
    
    # Step 2: Process the CSV data
    df_clean = pd.DataFrame()

    # Processing the data as before
    df_clean['Timestamp (UTC)'] = pd.to_datetime(df['Timestamp (UTC)'], format='%Y-%m-%d_%H:%M:%S.%f')
    df_clean['Elapsed Time (s)'] = (df_clean['Timestamp (UTC)'] - df_clean['Timestamp (UTC)'].iloc[0]).dt.total_seconds()
    df_clean['Elapsed Time (min)'] = df_clean['Elapsed Time (s)'] / 60

    df_clean['WheelDispR'] = df['Right Wheel Displacement']
    df_clean['WheelDispL'] = df['Left Wheel Displacement']
    df_clean['JoyX'] = df['Joystick X']
    df_clean['JoyY'] = df['Joystick Y']
    df_clean['WheelVelR'] = df['Right Wheel Velocity']
    df_clean['WheelVelL'] = df['Left Wheel Velocity']

    df_clean.loc[np.abs(df_clean['JoyX']) <= 3, 'JoyX'] = 0
    df_clean.loc[np.abs(df_clean['JoyY']) <= 3, 'JoyY'] = 0
    df_clean.loc[np.abs(df_clean['WheelVelR']) <= 0.02, 'WheelVelR'] = 0
    df_clean.loc[np.abs(df_clean['WheelVelL']) <= 0.02, 'WheelVelL'] = 0

    df_clean['JoyX'] = df_clean['JoyX'].rolling(window=5, min_periods=1).mean() 
    df_clean['JoyY'] = df_clean['JoyY'].rolling(window=5, min_periods=1).mean()
    df_clean['WheelVelR'] = df_clean['WheelVelR'].rolling(window=5, min_periods=1).mean()
    df_clean['WheelVelL'] = df_clean['WheelVelL'].rolling(window=5, min_periods=1).mean()

    df_clean['JoyMag'] = np.sqrt(df_clean['JoyX'] ** 2 + df_clean['JoyY'] ** 2)
    df_clean['VelMag'] = np.sqrt(df_clean['WheelVelL'] ** 2 + df_clean['WheelVelR'] ** 2)
    df_clean['DispMag'] = np.sqrt(df_clean['WheelDispL'] ** 2 + df_clean['WheelDispR'] ** 2)
    df_clean['AvgVel'] = (df_clean['WheelVelL'] + df_clean['WheelVelR']) / 2

    # Step 3: Return the processed CSV data
    return df_clean.to_csv(index=False)  # This returns the processed CSV as a string
