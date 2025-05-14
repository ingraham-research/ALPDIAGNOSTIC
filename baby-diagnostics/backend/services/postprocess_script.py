import numpy as np
import pandas as pd
import sys
import joblib
from io import StringIO
import os

def process_char(file_content):
    df_clean = pd.read_csv(StringIO(file_content))
    time_interval = 1 / 120

    session_time = (df_clean['Elapsed Time (s)'].iloc[-1] - df_clean['Elapsed Time (s)'].iloc[0]) / 60

    active_time = df_clean[(df_clean['JoyX'] != 0) | (df_clean['JoyY'] != 0)].shape[0] * time_interval / 60  
    moving_time = df_clean[(df_clean['WheelVelL'] != 0) | (df_clean['WheelVelR'] != 0)].shape[0] * time_interval / 60

    
    diff_list_R = df_clean['WheelDispR'].diff()
    diff_list_L = df_clean['WheelDispL'].diff()
    diff_list_L = diff_list_L[diff_list_L.abs() > 0.01]
    diff_list_R = diff_list_R[diff_list_R.abs() > 0.01]

    left_wheel_displacement = abs(diff_list_L).sum()
    right_wheel_displacement = abs(diff_list_R).sum()
    path_length = (left_wheel_displacement + right_wheel_displacement) / 2
    pathLengthAvg_Norm = path_length / session_time

    # Direction bins
    histJoyCount6_FR = histJoyCount6_F = histJoyCount6_FL = 0
    histJoyCount6_BL = histJoyCount6_B = histJoyCount6_BR = 0
    total_joy_points = 0

    for i in range(1, len(df_clean)):
        joy_x = df_clean['JoyX'].iloc[i]
        joy_y = df_clean['JoyY'].iloc[i]
        if joy_x == 0 and joy_y == 0:
            continue
        angle = np.degrees(np.arctan2(joy_y, joy_x)) % 360 
        if 0 <= angle < 60:   histJoyCount6_FR += 1 
        elif 60 <= angle < 120:  histJoyCount6_F += 1 
        elif 120 <= angle < 180: histJoyCount6_FL += 1  
        elif 180 <= angle < 240: histJoyCount6_BL += 1  
        elif 240 <= angle < 300: histJoyCount6_B  += 1  
        elif 300 <= angle < 360: histJoyCount6_BR += 1  
        total_joy_points += 1

    if total_joy_points > 0:
        percentage_FR = (histJoyCount6_FR / total_joy_points) 
        percentage_F  = (histJoyCount6_F  / total_joy_points) 
        percentage_FL = (histJoyCount6_FL / total_joy_points) 
        percentage_BL = (histJoyCount6_BL / total_joy_points) 
        percentage_B  = (histJoyCount6_B  / total_joy_points) 
        percentage_BR = (histJoyCount6_BR / total_joy_points) 
    else:
        percentage_FR = percentage_F = percentage_FL = percentage_BL = percentage_B = percentage_BR = np.nan

    # Bout detection
    pause_threshold = 0.1  
    pause_frames = int(pause_threshold * 120)  
    min_joy_threshold = 7

    bout_start_indices = []
    bout_end_indices = []
    bout_durations = []
    move_bout_durations = []
    joy_activations = 0
    joy_attempts = 0
    in_bout = False
    current_bout_start = None
    velocities_in_bout = []

    for i in range(1, len(df_clean)):
        joy_m = df_clean['JoyMag'].iloc[i]
        vel = df_clean['VelMag'].iloc[i]

        if joy_m > 0:
            if not in_bout:
                current_bout_start = i
                in_bout = True
                velocities_in_bout = [vel]  # Start collecting vel
            else:
                velocities_in_bout.append(vel)
        elif in_bout:
            if i - current_bout_start >= pause_frames:
                mean_vel_in_bout = np.mean(velocities_in_bout) if velocities_in_bout else 0
                if np.max(df_clean['JoyMag'].iloc[current_bout_start:i]) >= min_joy_threshold:
                    bout_start_indices.append(current_bout_start)
                    bout_end_indices.append(i)
                    duration = (i - current_bout_start) / 120
                    bout_durations.append(duration)
                    if mean_vel_in_bout >= 0.01:
                        move_bout_durations.append(duration)
                        joy_activations += 1
                    else:
                        joy_attempts += 1
                in_bout = False

    num_bouts = len(bout_start_indices)
    total_joy_movements = joy_activations + joy_attempts
    activation_ratio = (joy_activations / total_joy_movements) if total_joy_movements > 0 else 0

    # perMax stats
    per_max_list = []
    angle_ranges = []
    joy_path_lengths = []
    wheel_path_lengths = []
    edge_threshold = 98.5

    for start, end in zip(bout_start_indices, bout_end_indices):
        bout_df = df_clean.iloc[start:end]
        if bout_df.empty: continue

        # perMax
        percent_at_edge = np.sum(bout_df['JoyMag'] >= edge_threshold) / len(bout_df) * 100
        per_max_list.append(percent_at_edge)

        # angleRange
        angles = np.degrees(np.arctan2(bout_df['JoyY'], bout_df['JoyX'])) % 360

        if not angles.empty:
            max_angle = angles.max()
            min_angle = angles.min()
            raw_diff = max_angle - min_angle
            if raw_diff > 180:
                angle_ranges.append(360 - raw_diff)
            else:
                angle_ranges.append(raw_diff)

        # path lengths
        dx = np.diff(bout_df['JoyX'])
        dy = np.diff(bout_df['JoyY'])
        joy_path = np.sum(np.sqrt(dx**2 + dy**2))
        joy_path_lengths.append(joy_path)

        dl = np.abs(np.diff(bout_df['WheelDispL']))
        dr = np.abs(np.diff(bout_df['WheelDispR']))
        wheel_path = np.sum(dl + dr) / 2
        wheel_path_lengths.append(wheel_path)

    perMaxMean = np.mean(per_max_list) if per_max_list else np.nan
    perMaxStd = np.std(per_max_list) if per_max_list else np.nan
    short_movement_bouts = [d for d in move_bout_durations if d < 2]
    perMove_2s = (len(short_movement_bouts) / len(move_bout_durations)) if move_bout_durations else np.nan

    angleRangeMean = np.nanmean(angle_ranges) if angle_ranges else np.nan
    moveMeanDur = np.nanmean(move_bout_durations) if move_bout_durations else np.nan
    joyCount_Norm = num_bouts / session_time if session_time > 0 else np.nan
    moveCount_Norm = len(move_bout_durations) / session_time if session_time > 0 else np.nan
    pathLengthAvg_Norm = path_length / session_time if session_time > 0 else np.nan

    pathLenMean = np.nanmean(joy_path_lengths)
    pathEfficiency = path_length / pathLenMean

    perFR = percentage_FR * 100
    perF = percentage_F * 100
    perFL = percentage_FL * 100
    perBL = percentage_BL * 100
    perB = percentage_B * 100
    perBR = percentage_BR * 100

    results = {
        "session_time_min": session_time,
        "active_time_min": active_time,
        "moving_time_min": moving_time,
        "avg_path_length": path_length,

        "hist_FR": perFR,
        "hist_F":  perF,
        "hist_FL": perFL,
        "hist_BL": perBL,
        "hist_B":  perB,
        "hist_BR": perBR,

        "path_ft": path_length * 3.28084,

        "histJoyPer6_FR": percentage_FR,
        "histJoyPer6_F":  percentage_F,
        "histJoyPer6_FL": percentage_FL,
        "histJoyPer6_BL": percentage_BL,
        "histJoyPer6_B":  percentage_B,
        "histJoyPer6_BR": percentage_BR,

        "num_bouts": num_bouts,
        "mean_bout_duration_s": np.mean(bout_durations) if bout_durations else np.nan,
        "max_bout_duration_s": np.max(bout_durations) if bout_durations else np.nan,
        "joy_activations": joy_activations,
        "joy_attempts": joy_attempts,
        "activation_ratio": activation_ratio,

        "perMaxMean": perMaxMean,
        "perMaxStd": perMaxStd,
        "perMove_2s": perMove_2s,

        "angleRangeMean": angleRangeMean,
        "moveMeanDur": moveMeanDur,
        "joyCount_Norm": joyCount_Norm,
        "moveCount_Norm": moveCount_Norm,
        "pathLengthAvg_Norm": pathLengthAvg_Norm,
        "pathEfficiency": pathEfficiency
    }

    current_dir = os.path.dirname(__file__)  # directory of the running script
    model_path = os.path.join(current_dir, "rf_model.pkl")
    features_path = os.path.join(current_dir, "rf_features.pkl")
    model = joblib.load(model_path)
    feature_cols = joblib.load(features_path)

    X = pd.DataFrame([results])[feature_cols].fillna(0)

    pred_class = model.predict(X)[0]
    pred_probs = model.predict_proba(X)[0]
    class_prob_dict = dict(zip(model.classes_, pred_probs))

    results["Predicted_Class"] = pred_class
    results["Confidence_Score"] = np.max(pred_probs)

    for label, prob in class_prob_dict.items():
        results[f"Prob_{label}"] = prob

    df_results = pd.DataFrame([results])
    return df_results.to_csv(index=False)

if __name__ == "__main__":
    file_content = sys.stdin.read()
    processed_char = process_char(file_content)
    sys.stdout.write(processed_char)
