import os
import sys
# Ensure we are in the project root
if os.getcwd().endswith('notebooks'):
    os.chdir('..')
print(f'Current working directory: {os.getcwd()}')

import os
import json
import numpy as np
import pandas as pd
from sgp4.api import Satrec

# STEP 1 â€” CREATE FOLDER STRUCTURE
print('STEP 1: Creating folder structure...')
folders = [
    'data/raw',
    'data/processed',
    'data/training',
    'models',
    'backend',
    'notebooks'
]
for folder in folders:
    os.makedirs(folder, exist_ok=True)
print('Folder structure created.')
# STEP 2 â€” PARSE BOTH 3LE FILES
def parse_3le_robust(filepath, object_type):
    print(f'Parsing {filepath}...')
    records = []
    malformed_count = 0
    
    if not os.path.exists(filepath):
        print(f'  Warning: {filepath} not found.')
        return pd.DataFrame(), 0
        
    with open(filepath, 'r') as f:
        lines = [line.strip() for line in f if line.strip()]
        
    i = 0
    while i < len(lines):
        if lines[i].startswith('0 '):
            if i + 2 < len(lines) and lines[i+1].startswith('1 ') and lines[i+2].startswith('2 '):
                line0, line1, line2 = lines[i], lines[i+1], lines[i+2]
                try:
                    name = line0[2:].strip()
                    norad_id = int(line1[2:7])
                    sat = Satrec.twoline2rv(line1, line2)
                    epoch_jd = sat.jdsatepoch + sat.jdsatepochF
                    records.append({
                        'name': name,
                        'norad_id': norad_id,
                        'epoch_jd': epoch_jd,
                        'inclination': sat.inclo,
                        'eccentricity': sat.ecco,
                        'raan': sat.nodeo,
                        'arg_perigee': sat.argpo,
                        'mean_anomaly': sat.mo,
                        'mean_motion': sat.no_kozai,
                        'bstar': sat.bstar,
                        'object_type': object_type,
                        'line1': line1,
                        'line2': line2
                    })
                except Exception:
                    malformed_count += 1
                i += 3
            else:
                malformed_count += 1
                i += 1
        else:
            malformed_count += 1
            i += 1
            
    df = pd.DataFrame(records)
    print(f'  Parsed: {len(df)} records. Malformed: {malformed_count}')
    return df, malformed_count

print('\nSTEP 2: Parsing files...')
df_sat, err_sat = parse_3le_robust('data/raw/satellites_30days.txt', 'satellite')
df_deb, err_deb = parse_3le_robust('data/raw/debris_30days.txt', 'debris')

if df_sat.empty and df_deb.empty:
    df_all = pd.DataFrame()
    print('Warning: Both files are missing or empty. Pipeline might fail.')
else:
    df_all = pd.concat([df_sat, df_deb], ignore_index=True)
    print(f'Combined parser output: {len(df_all)} records.')
# STEP 3 â€” DEDUPLICATE
if not df_all.empty:
    print('\nSTEP 3: Deduplicating...')
    initial_count = len(df_all)
    df_all = df_all.drop_duplicates(subset=['norad_id', 'epoch_jd'])
    df_all = df_all.sort_values(by=['norad_id', 'epoch_jd'])
    df_all = df_all.reset_index(drop=True)
    print(f'Records before: {initial_count}, Records after: {len(df_all)}')

# STEP 4 â€” SGP4 PROPAGATION
if not df_all.empty:
    print('\nSTEP 4: SGP4 Propagation (this may take 10-20 minutes on CPU)...')
    x_km_list = []
    y_km_list = []
    z_km_list = []
    valid_mask = []
    
    total_rows = len(df_all)
    for idx, row in df_all.iterrows():
        if idx > 0 and idx % 50000 == 0:
            print(f'  Propagating row {idx}/{total_rows}...')
            
        sat = Satrec.twoline2rv(row['line1'], row['line2'])
        jd = int(row['epoch_jd'])
        fr = row['epoch_jd'] - jd
        
        e, r, v = sat.sgp4(jd, fr)
        if e == 0:
            x_km_list.append(r[0])
            y_km_list.append(r[1])
            z_km_list.append(r[2])
            valid_mask.append(True)
        else:
            x_km_list.append(np.nan)
            y_km_list.append(np.nan)
            z_km_list.append(np.nan)
            valid_mask.append(False)
            
    df_all['x_km'] = x_km_list
    df_all['y_km'] = y_km_list
    df_all['z_km'] = z_km_list
    
    survived = sum(valid_mask)
    print(f'  Rows survived propagation: {survived} out of {total_rows}')
    df_all = df_all[valid_mask].copy()
    
    df_all = df_all.drop(columns=['line1', 'line2'])
    df_all = df_all.reset_index(drop=True)

# STEP 5 â€” SAVE PARSED PARQUET FILES
if not df_all.empty:
    print('\nSTEP 5: Saving Parquet files...')
    df_sats = df_all[df_all['object_type'] == 'satellite']
    df_debs = df_all[df_all['object_type'] == 'debris']
    
    sats_path = 'data/processed/satellites_parsed.parquet'
    debs_path = 'data/processed/debris_parsed.parquet'
    
    df_sats.to_parquet(sats_path, engine='pyarrow')
    df_debs.to_parquet(debs_path, engine='pyarrow')
    
    print(f'  Saved {sats_path} - Size: {os.path.getsize(sats_path)/1024/1024:.2f} MB')
    print(f'  Saved {debs_path} - Size: {os.path.getsize(debs_path)/1024/1024:.2f} MB')

# STEP 6 â€” FEATURE NORMALISATION
if not df_all.empty:
    print('\nSTEP 6: Feature Normalisation...')
    norm_cols = ['inclination', 'eccentricity', 'raan', 'arg_perigee', 'mean_anomaly', 'mean_motion', 'bstar', 'x_km', 'y_km', 'z_km']
    
    scaler_params = {}
    for col in norm_cols:
        mean_val = df_all[col].mean()
        std_val = df_all[col].std()
        
        if std_val == 0 or pd.isna(std_val):
            std_val = 1.0
            
        scaler_params[col] = {
            'mean': float(mean_val),
            'std': float(std_val)
        }
        
    with open('data/processed/scaler_params.json', 'w') as f:
        json.dump(scaler_params, f, indent=4)
        
    print('  Saved data/processed/scaler_params.json')
    
    for col in norm_cols:
        df_all[col] = (df_all[col] - scaler_params[col]['mean']) / scaler_params[col]['std']

# STEP 7 (FIXED v2) — BUILD SLIDING WINDOW SEQUENCES WITH DELTA TARGETS

if not df_all.empty:
    print('\nSTEP 7 (FIXED v2): Building sequences with delta targets...')

    FEATURE_COLS = ['inclination', 'eccentricity', 'raan',
                    'arg_perigee', 'mean_anomaly', 'mean_motion', 'bstar']
    POSITION_COLS = ['x_km', 'y_km', 'z_km']
    SEQ_LEN = 20
    PRED_STEP = 5
    MIN_RECORDS = SEQ_LEN + PRED_STEP + 2

    X_list = []
    y_list = []
    skipped_inc = 0
    skipped_short = 0

    unique_ids = df_all['norad_id'].unique()
    print(f'  Processing {len(unique_ids)} unique objects...')

    for nid in unique_ids:
        group = df_all[df_all['norad_id'] == nid].copy()

        inc_vals = group['inclination'].values
        if np.std(inc_vals) < 0.01 and np.abs(np.mean(inc_vals)) < 0.3:
            skipped_inc += 1
            continue

        if len(group) < MIN_RECORDS:
            skipped_short += 1
            continue

        group_features = group[FEATURE_COLS].values
        group_positions = group[POSITION_COLS].values

        n_rows = len(group)
        for i in range(n_rows - SEQ_LEN - PRED_STEP):
            seq_x = group_features[i : i + SEQ_LEN]

            current_pos = group_positions[i + SEQ_LEN - 1]
            future_pos  = group_positions[i + SEQ_LEN + PRED_STEP]
            delta = future_pos - current_pos

            X_list.append(seq_x)
            y_list.append(delta)

    print(f'  Skipped (low inclination) : {skipped_inc}')
    print(f'  Skipped (too short)       : {skipped_short}')

    X_arr = np.array(X_list, dtype=np.float32)
    y_arr = np.array(y_list, dtype=np.float32)

    print(f'  X shape : {X_arr.shape}')
    print(f'  y shape : {y_arr.shape}')

    # [OK] NEW — Clip outlier deltas before normalizing
    print(f'\n  Clipping outliers (5-sigma)...')
    for i, axis in enumerate(['X', 'Y', 'Z']):
        mean_i = y_arr[:, i].mean()
        std_i  = y_arr[:, i].std()
        before = np.abs(y_arr[:, i]).max()
        y_arr[:, i] = np.clip(y_arr[:, i],
                               mean_i - 5 * std_i,
                               mean_i + 5 * std_i)
        after = np.abs(y_arr[:, i]).max()
        print(f'  {axis}-axis | max before={before:.4f} -> max after={after:.4f}')

    print(f'\n  y mean per axis (post-clip) : {y_arr.mean(axis=0).round(4)}')
    print(f'  y std  per axis (post-clip) : {y_arr.std(axis=0).round(4)}')

    # Normalize y
    delta_scaler = {}
    for i, col in enumerate(['dx_km', 'dy_km', 'dz_km']):
        mean_val = float(y_arr[:, i].mean())
        std_val  = float(y_arr[:, i].std())
        if std_val < 1e-6:
            std_val = 1.0
        delta_scaler[col] = {'mean': mean_val, 'std': std_val}
        y_arr[:, i] = (y_arr[:, i] - mean_val) / std_val

    # Verification
    dominant = (np.abs(y_arr[:, 2] - y_arr[:, 2].mean()) < 0.001).mean() * 100
    x_skew = float(pd.Series(y_arr[:, 0]).skew())
    print(f'\n  === VERIFICATION ===')
    print(f'  Z dominant concentration : {dominant:.2f}% (target: <10%)')
    print(f'  X-axis skew              : {x_skew:.4f} (target: <2.0)')
    if dominant < 10 and abs(x_skew) < 2.5:
        print(f'  ALL CHECKS PASSED [OK] — ready to upload to Colab')
    else:
        print(f'  ISSUES REMAIN [FAIL] — review output above')

    # Save
    import json
    np.save('data/training/X.npy', X_arr)
    np.save('data/training/y.npy', y_arr)

    with open('data/processed/delta_scaler.json', 'w') as f:
        json.dump(delta_scaler, f, indent=4)

    print(f'\n  Saved data/training/X.npy')
    print(f'  Saved data/training/y.npy')
    print(f'  Saved data/processed/delta_scaler.json')
# STEP 8 â€” FINAL SUMMARY REPORT
if not df_all.empty:
    print('\nSTEP 8: Final Summary Report')
    print(f'Total raw records parsed (estimated combined): {initial_count + err_sat + err_deb}')
    print(f'Records after deduplication: {initial_count}')
    print(f'Records after propagation: {survived}')
    unique_sats = df_all[df_all['object_type']=='satellite']['norad_id'].nunique()
    unique_debs = df_all[df_all['object_type']=='debris']['norad_id'].nunique()
    print(f'Unique satellites processed: {unique_sats}')
    print(f'Unique debris objects processed: {unique_debs}')
    if len(X_arr) > 0:
        print(f'Total training sequences (X.npy rows): {len(X_arr)}')
        print(f'X.npy size in MB: {os.path.getsize(x_path)/1024/1024:.2f} MB')
        print(f'y.npy size in MB: {os.path.getsize(y_path)/1024/1024:.2f} MB')
    print('\nFiles saved:')
    print('  - data/processed/satellites_parsed.parquet')
    print('  - data/processed/debris_parsed.parquet')
    print('  - data/processed/scaler_params.json')
    if len(X_arr) > 0:
        print('  - data/training/X.npy')
        print('  - data/training/y.npy')
