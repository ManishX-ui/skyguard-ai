# SkyGuard AI — Dataset, Preprocessing, and Evaluation Guide

## 1. Monitored Data Schema

SkyGuard AI processes time-series observations from Automatic Weather Stations. The pipeline supports both streaming JSON payloads over HTTP/MQTT and batch CSV files.

### Standard CSV Column Format

| Column | Type | Unit | Example | Description | Required |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `station_id` | String | — | `AWS-MUM-01` | Unique station identifier | Yes |
| `timestamp` | ISO-8601 String | UTC | `2026-10-15T06:00:00Z` | Reading observation timestamp | Yes |
| `temperature` | Float | °C | `28.4` | Ambient dry-bulb temperature | Yes |
| `humidity` | Float | % | `74.2` | Relative humidity ($0 - 100$) | Yes |
| `pressure` | Float | hPa | `1011.5` | Station barometric pressure | Yes |
| `latitude` | Float | Decimal Deg | `19.0760` | Station geographical latitude | Optional (needed for L3) |
| `longitude` | Float | Decimal Deg | `72.8777` | Station geographical longitude | Optional (needed for L3) |
| `elevation_m` | Float | Meters | `14.0` | Station elevation above sea level | Optional |

---

## 2. Supported Data Sources & Ingestion Scripts

The `scripts/` directory provides ingestion connectors for major meteorological databases:

### A. India Meteorological Department (IMD) AWS Network
- Script: `scripts/ingest_imd_aws.py`
- Formats: Open Government Data (OGD) Platform India & IMD AWS archives.
- Station catalog generator: `scripts/gen-imd-stations.mjs`

### B. NOAA Integrated Surface Dataset (ISD)
- Script: `scripts/ingest_noaa_isd.py`
- Downloads and decodes global surface weather observations from NOAA NCEI servers.

### C. ECMWF ERA5 Reanalysis
- Script: `scripts/ingest_era5.py`
- Fetches hourly atmospheric reanalysis data to provide regional baseline validation.

### D. Synthetic Fault Injection Engine
- Script: `scripts/inject_faults.py`
- Injects controlled anomalies into clean weather time series for benchmark evaluation:
  - Spikes (additive gaussian / extreme impulse)
  - Sensor Drift (linear trend over $N$ hours)
  - Frozen Sensors (constant value repeated)
  - Complete Communication Dropouts (`NaN` injection)
  - Noise Amplification (high-frequency ADC noise)

---

## 3. Data Preprocessing Pipeline

When sensor records enter SkyGuard AI, they pass through sequential transformations:

1. **Timestamp Normalization**: Parses ISO-8601 / RFC-3339 strings and validates chronological ordering.
2. **Missing-Value Sanitization**: Flags explicit `NaN`, `null`, empty strings, or sentinel values (`-999.0`, `9999.0`).
3. **Physical Range Clamping / Bounding**: Validates against meteorological limits ($T \in [-10, 60]^\circ\text{C}$, $RH \in [0, 100]\%$, $P \in [870, 1084]\text{ hPa}$).
4. **Temporal History Buffer**: Maintains a sliding window of recent trusted values ($N=30$) per station for local statistical calculations.
5. **Diurnal Hour-of-Day Aggregation**: Bins readings into 24-hour baseline accumulators.

---

## 4. Model Calibration & Baseline Warmup

Unlike "black-box" deep learning models that require days of offline GPU training and degrade when sensor hardware changes, SkyGuard's **TRUST-AWS** engine operates via **online continual baseline adaptation**:

1. **Warmup Phase (`WARMUP_MIN_SAMPLES = 12`)**:
   During the first 12 observations (~2 hours at 10-minute intervals), the engine learns the station's local microclimate and suppresses false alarms while building historical variance buffers.
2. **Online EWMA Updates**:
   Baseline values update incrementally with an exponential forgetting factor, accommodating seasonal shifts without manual retraining.
3. **Robust Spread Adaptation**:
   Uses Median Absolute Deviation (MAD) rather than classical standard deviation to prevent true anomalies from contaminating the baseline spread.

---

## 5. Running Batch Evaluation

To evaluate SkyGuard AI on a batch weather dataset:

```bash
# Run the built-in deterministic evaluation demo (seed 42)
python examples/csv_example.py --demo

# Run evaluation on your own CSV dataset
python anomaly_engine.py --csv path/to/your_weather_data.csv
```

### Evaluation Output Metrics

The evaluation outputs standard classification performance metrics:

- **True Positives (TP)**: Correctly flagged sensor anomalies.
- **False Positives (FP)**: Legitimate weather shifts misidentified as faults.
- **False Negatives (FN)**: Unidentified sensor failures.
- **True Negatives (TN)**: Verified normal weather readings.
- **Precision**: $\frac{\text{TP}}{\text{TP} + \text{FP}}$
- **Recall**: $\frac{\text{TP}}{\text{TP} + \text{FN}}$
- **F1-Score**: $2 \times \frac{\text{Precision} \times \text{Recall}}{\text{Precision} + \text{Recall}}$

*Note: All benchmark scores reported in documentation reflect deterministic testing scripts with ground-truth fault injection (`examples/csv_example.py`).*
