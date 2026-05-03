# OrbitWatch: High-Fidelity Orbital Situational Awareness & Analysis

OrbitWatch is a state-of-the-art satellite monitoring and mission planning dashboard. It combines classical orbital mechanics (SGP4), deep learning (OrbitalTransformer AI), and high-performance spatial analysis to provide real-time tracking, collision risk assessment, and maneuver optimization.

---

## 🛰️ System Architecture & Logic

OrbitWatch operates on a **Hybrid Intelligence** model. While standard systems rely purely on physics-based TLE propagation (SGP4), OrbitWatch integrates a PyTorch-based **OrbitalTransformer** that learns the specific drift patterns of individual satellites from their tracking history, providing a corrected "Truth" state for safety-critical analysis.

### The Two Operational Modes

#### 🔵 Mode A: Pre-Launch (Physics Engine)
*   **Target**: Future missions, hypothetical satellites, or rockets yet to launch.
*   **Logic**: Uses a **Synthetic TLE Generator**. The user inputs orbital parameters (Apogee, Perigee, Inclination, RAAN), and the system constructs a valid TLE to simulate the mission.
*   **Analysis**: Since there is no tracking history, the system uses **Pure SGP4 Physics** to propagate the mission and screen for potential conjunctions before the satellite even leaves the ground.

#### 🔴 Mode B: Active Satellite (AI Hybrid Engine)
*   **Target**: Real-world satellites currently in orbit (tracked by NORAD).
*   **Logic**: Fetches live TLEs from Space-Track.org. It also retrieves the last 20 historical TLEs to feed into the **OrbitalTransformer AI**.
*   **Analysis**: The AI predicts the residual error (drift) between the SGP4 physics model and the actual observed tracking data. This correction is added back to the live position, resulting in much higher accuracy for conjunction screening.

---

## 🛠️ Key Features & Modules

### 1. 3D Global Visualization (CesiumJS)
*   **Real-Time Tracking**: Smooth rendering of thousands of satellites and debris objects.
*   **Inertial Frame Correction**: Implements **GMST (Greenwich Mean Sidereal Time)** rotation to perfectly align inertial SGP4 coordinates with the rotating Earth (TEME → ECEF).
*   **Elliptical Pathing**: High-resolution 360-point orbital rings that accurately represent eccentric orbits.
*   **Dynamic Markers**: Instant visual identification of Apogee, Perigee, and Time of Closest Approach (TCA).

### 2. Conjunction Analysis Engine
*   **72-Hour Screening**: Uses a high-speed `KDTree` spatial index to check the mission satellite against thousands of debris candidates within 500km.
*   **Multi-Pass Refinement**: To find the exact moment of danger, the system runs a coarse scan (10m), followed by a 1-minute refinement, and finally a 5-second ultra-precision scan.
*   **Probability of Collision (Pc)**: Calculates risk using a **Monte Carlo** model for close encounters, returning a clear "MANEUVER", "MONITOR", or "ALL CLEAR" status.
*   **False-Positive Filtering**: 
    *   **ISS Complex Filter**: Automatically skips conjunction alerts between modules of the International Space Station or docked spacecraft.
    *   **Co-location Filter**: Ignores objects that are physically bolted together or flying in formation (within 5km at T=0).

### 3. Safe Routing & Maneuver Planner
*   **Suggested Burns**: If a "MANEUVER" risk is detected, the system calculates a suggested velocity change ($\Delta v$) using the **Along-Track Displacement** formula.
*   **Maneuver Simulation**: Predicts the "New Miss Distance" and "New Pc" if the suggested maneuver is executed 6 hours before TCA.
*   **Fuel Cost Calculator**:
    *   Implements the **Tsiolkovsky Rocket Equation**.
    *   Supports multiple thruster types (Cold Gas, Hydrazine, Bipropellant, Ion Thrusters) with specific $I_{sp}$ values.
    *   Calculates fuel mass burned (kg) and tracks remaining fuel percentage.
    *   Provides "Feasibility Checks" (Red alerts if the maneuver exceeds available fuel).

### 4. Orbital Decay Predictor
*   **Natural Decay (Mode 1)**: Simulates the long-term ballistic reentry of a satellite due to atmospheric drag.
*   **Sustained Orbit (Mode 2)**: Simulates a "Reboost Lifecycle" where the satellite uses fuel to fight drag and maintain its altitude.
*   **Piecewise Atmosphere Model**: Uses a NASA-validated 11-segment exponential model to calculate accurate density ($\rho$) from 200km to 1000km.
*   **Compliance Rule**: Automatically checks if the satellite meets the **International 25-Year Reentry Rule**.
*   **Lifecycle Summary**: Predicts "Maintained Months" (while fuel lasts) vs "Natural Decay Years" (after fuel exhaustion).

### 5. Mission Settings & Customization
*   **Units**: Toggle between Metric (KM) and Imperial (Miles) across the entire UI.
*   **Timezones**: Switch between UTC and Local Browser Time.
*   **Globe Themes**: Choice of "Space", "Standard", or "Dark" imagery layers.
*   **Refresh Control**: Set auto-update intervals (30s, 60s, 120s) or use "Manual" refresh to lock the simulation state.

---

## 📐 Technical Implementation Details

*   **Coordinate Transformations**: SGP4 coordinates are converted from the TEME inertial frame to the ECEF earth-fixed frame using the IAU-1982 GMST formula.
*   **Coordinate Correction**: `pt = rotate(sgp4_pos, -GMST)`.
*   **Atmospheric Drag**: $a_{drag} = -\frac{1}{2} \rho v^2 \frac{C_d A}{m}$. In our predictor, this is simplified to a calibrated rate matching observed ISS/Hubble decay profiles.
*   **Maneuver Logic**: $\Delta s \approx 3 \cdot \Delta v \cdot t$. This calculates how much along-track separation is gained over time $t$ for a given impulse $\Delta v$.

---

## 🔍 Accuracy & Reliability

OrbitWatch is designed for high-fidelity estimation. By combining **Deep Learning residuals** with **SGP4 Physics**, it provides a more accurate prediction of satellite positions than standard physics-only models, especially for satellites with high area-to-mass ratios or those in complex drag environments.

*Disclaimer: This is an analytical tool. All mission-critical maneuvers should be cross-verified with official government SSA data.*
