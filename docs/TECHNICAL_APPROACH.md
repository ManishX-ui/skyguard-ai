# SkyGuard AI — Technical Approach & Anomaly Detection Methodology

## 1. Problem Formulation

Automatic Weather Stations (AWS) deployed in the field are subject to harsh environmental exposure, mechanical wear, calibration drift, communication dropouts, and electrical faults. At the same time, legitimate meteorological extremes (convective storms, temperature inversions, microbursts) produce rapid, non-linear atmospheric shifts.

The fundamental technical challenge addressed by **SkyGuard AI** (SIH Problem Statement 73) is:

$$\text{Distinguish genuine meteorological phenomena from sensor malfunctions and data-quality defects in real-time sensor streams without requiring heavy cloud GPU dependencies.}$$

The three primary monitored meteorological parameters are:
1. **Temperature ($T$)**: Measured in °C.
2. **Relative Humidity ($RH$)**: Measured in %.
3. **Atmospheric Pressure ($P$)**: Measured in hPa.

---

## 2. Taxonomy of Sensor Anomalies

SkyGuard AI models and identifies six distinct failure modes:

| Failure Mode | Meteorological vs. Fault Signature | Detection Mechanism |
| :--- | :--- | :--- |
| **Out-of-Bounds Spike** | Value exceeds physical climate envelope for the region/altitude. | Layer 1 Physical Plausibility hard-bounding. |
| **Sensor Calibration Drift** | Gradual, systematic departure from regional climate baseline over days. | Layer 2 EWMA + Hourly Diurnal Baselines. |
| **Neighbor Inconsistency** | Station departs significantly from geographically proximate peer stations. | Layer 3 Spatial Consistency via haversine distance & trimmed consensus. |
| **Psychrometric Incoherence** | $T$ and $RH$ diverge from thermodynamic dew point relations or freeze concurrently. | Layer 4 Multivariate Physics Coupling (Dew Point & Hypsometric checks). |
| **Frozen / Stuck Sensor** | Sensor repeats exact same reading across consecutive intervals despite diurnal fluctuations. | Layer 4 Zero-variance consecutive step detection. |
| **Communication / Packet Loss** | Incomplete data transmission or hardware ADC bus fault (`NaN` / `null` values). | Layer 1 Missing data validator & imputation pipeline. |

---

## 3. The 5-Layer TRUST-AWS Detection Architecture

The core engine (`anomaly_engine.py`) implements a weighted multi-layer evaluation stack:

$$\text{Score}_{\text{composite}} = \sum_{k=1}^{4} w_k \cdot S_{L_k} + \text{Penalty}_{\text{comm}}$$

Where weights are calibrated to:
- $w_1 = 0.25$ (Layer 1: Physical plausibility)
- $w_2 = 0.30$ (Layer 2: Temporal learning)
- $w_3 = 0.25$ (Layer 3: Spatial consensus)
- $w_4 = 0.20$ (Layer 4: Multivariate physics)
- $\text{Penalty}_{\text{comm}} = 0.35$ for missing (`NaN`) parameters.

```
Incoming Reading [T, RH, P, timestamp, station_id]
                       │
                       ▼
┌────────────────────────────────────────────────────────┐
│ Layer 1: Physical Bounds & Communication Checks        │
│ Range Limits: T ∈ [-10, 60]°C, RH ∈ [0, 100]%, P ∈ [870, 1084] hPa
└──────────────────────┬─────────────────────────────────┘
                       │
                       ▼
┌────────────────────────────────────────────────────────┐
│ Layer 2: Temporal Dynamics & Diurnal Baseline          │
│ Hourly EWMA, robust Median Absolute Deviation (MAD),   │
│ Step limit enforcement: ΔT ≤ 8°C, ΔRH ≤ 25%, ΔP ≤ 6 hPa│
└──────────────────────┬─────────────────────────────────┘
                       │
                       ▼
┌────────────────────────────────────────────────────────┐
│ Layer 3: Spatial Consistency (Peer Consensus)          │
│ Spatial radius: r ≤ 0.35° (~38 km), min peers = 2,     │
│ 20% Trimmed Mean consensus with inverse-distance weight│
└──────────────────────┬─────────────────────────────────┘
                       │
                       ▼
┌────────────────────────────────────────────────────────┐
│ Layer 4: Multivariate Psychrometric Coupling           │
│ Magnus-Tetens Dewpoint calculation, T-RH correlation,  │
│ Consecutive repeated-value (frozen sensor) detection   │
└──────────────────────┬─────────────────────────────────┘
                       │
                       ▼
┌────────────────────────────────────────────────────────┐
│ Layer 5: Explainable AI & Imputation                   │
│ Additive SHAP-style attribution, sensor health score,  │
│ Robust imputed estimate for corrupt readings           │
└────────────────────────────────────────────────────────┘
```

---

## 4. Layer Implementations

### Layer 1: Physical Plausibility
Hard limits prevent impossible values from entering downstream forecasting or storage:
- **Temperature ($T$)**: $[-10.0^\circ\text{C}, 60.0^\circ\text{C}]$
- **Relative Humidity ($RH$)**: $[0.0\%, 100.0\%]$
- **Atmospheric Pressure ($P$)**: $[870.0\text{ hPa}, 1084.0\text{ hPa}]$

If a parameter is outside these limits, Layer 1 generates a normalized deviation score:
$$S_{L_1}(x) = \min\left(1.0, \frac{\text{dist}(x, [\text{min}, \text{max}])}{\text{scale}}\right)$$

### Layer 2: Temporal Dynamic Analysis
Weather parameters have strong diurnal cycles. Static standard deviation overestimates variance across day/night transitions. SkyGuard AI uses:
1. **Hour-of-day seasonal bins**: Tracks separate running averages for each hour $h \in [0, 23]$.
2. **Robust Spread Estimation (MAD)**:
   $$\text{MAD} = \text{median}(|x_i - \text{median}(X)|)$$
   $$\hat{\sigma} = 1.4826 \times \max(\text{MAD}, \sigma_{\text{floor}})$$
   Where $\sigma_{\text{floor}}$ ensures the engine never divides by zero during calm weather.
3. **Step Limits**: Prevents non-physical step jumps across adjacent 10-minute reporting intervals.

### Layer 3: Spatial Consistency (Neighbor Consensus)
No single station operates in a vacuum. Stations within `NEIGHBOR_RADIUS_DEG = 0.35` (~38 km) form a peer group:
- At least 2 neighboring stations are required (`MIN_NEIGHBORS = 2`).
- Peer consensus uses a **20% trimmed mean** to remain immune to simultaneous corruption in one peer.
- The target station's reading is compared against peer consensus using robust z-score:
  $$Z_{\text{spatial}} = \frac{|x_{\text{station}} - \mu_{\text{trimmed, peers}}|}{\max(\sigma_{\text{peers}}, \sigma_{\text{floor}})}$$

### Layer 4: Multivariate Physics Coupling
Parameters are physically interrelated through thermodynamics:
- **Dew Point Consistency**: Dew point $T_d$ is computed via the Magnus-Tetens formula:
  $$T_d = \frac{c \cdot \gamma(T, RH)}{b - \gamma(T, RH)}, \quad \gamma(T, RH) = \frac{b \cdot T}{c + T} + \ln(RH / 100)$$
  where $b = 17.27, c = 237.7^\circ\text{C}$.
  If $T_d > T + 0.5^\circ\text{C}$, a physical violation is flagged ($RH > 100\%$ equivalent).
- **Frozen Value Detection**: A sensor reporting identical numeric values for $\ge 3$ consecutive reporting cycles in an unconstrained environment receives a frozen-sensor penalty.

---

## 5. Decision Thresholds & Classification

| Composite Score ($S$) | Verdict | Recommended Operator Action |
| :--- | :--- | :--- |
| $S \ge 0.50$ | **ANOMALY** | Quarantine observation; trigger automated alert; replace with imputed value. |
| $0.30 \le S < 0.50$ | **WARNING** | Flag observation as suspect; monitor sensor trend in next cycles. |
| $S < 0.30$ | **NORMAL** | Accept observation into climatological database. |

---

## 6. Explainable AI (XAI) & Attribution

Layer 5 (`shap_explainer.py`) computes additive attribution:
$$\text{Score} = \text{Base} + \sum_{i \in \{T, RH, P\}} \sum_{j \in \{L1, L2, L3, L4\}} \phi_{i, j}$$

Each alert generated includes:
1. Primary contributing sensor parameter.
2. Dominant detection layer (e.g., "Layer 3 Spatial Discrepancy: Departed from 3 peer stations by 4.2 standard deviations").
3. Sensor Health Score ($0 - 100\%$) indicating cumulative degradation over time.
4. Estimated Maintenance ETA (e.g., "Inspect within 48h").

---

## 7. Known Technical Limitations

1. **Topographic Heterogeneity**: Stations located in complex mountain terrain (e.g., Himalayas) may differ legitimately from nearby valley stations due to adiabatic lapse rates. Station elevation adjustment is recommended for alpine deployments.
2. **Sparse Network Density**: When a station has fewer than 2 peers within 38 km, Layer 3 automatically deactivates and its weight shifts to temporal Layer 2.
3. **Extreme Weather Calibration**: Severe cyclonic events can produce pressure drops exceeding $6\text{ hPa/interval}$. Layer 3 peer consensus is critical during such events to confirm genuine synoptic shifts.
