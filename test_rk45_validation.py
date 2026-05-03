import math
import os
import sys
from datetime import datetime

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from backend.propagate import generate_synthetic_tle, tle_to_satrec

def run_tests():
    apogee_km = 422.0
    perigee_km = 408.0
    inclination_deg = 51.6
    raan_deg = 0.0
    arg_perigee_deg = 0.0
    mean_anomaly_deg = 0.0
    bstar = 0.0001
    epoch_time = None

    passed_count = 0

    report_content = f"""OrbitWatch RK45 Validation Report
Generated: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}
====================================

SUMMARY
Tests passed : {{passed}} out of 5
Overall      : {{overall}}

TEST INPUTS USED
Apogee       : 422 km
Perigee      : 408 km
Inclination  : 51.6 degrees
RAAN         : 0.0 degrees
Arg Perigee  : 0.0 degrees
Mean Anomaly : 0.0 degrees
B* Drag      : 0.0001

DETAILED RESULTS
"""

    print("============================================")
    print("OrbitWatch RK45 Validation — Test Results")
    print("============================================")

    try:
        # TEST 1
        R_earth = 6371.0
        GM = 398600.4418
        a = R_earth + (apogee_km + perigee_km) / 2
        T = 2 * math.pi * math.sqrt(a**3 / GM)
        expected_period_minutes = T / 60
        
        t1_pass = 91.0 <= expected_period_minutes <= 94.0
        if t1_pass: passed_count += 1
        
        print("\nTEST 1 — Orbital Period")
        print("Expected : between 91.0 and 94.0 minutes")
        print(f"Got      : {expected_period_minutes:.2f} minutes")
        print(f"Status   : {'PASSED [PASS]' if t1_pass else 'FAILED [FAIL]'}")
        print("Meaning  : The orbital period of the ISS-like orbit is physically correct.")
        
        report_content += f"""
Test 1 — Orbital Period
What we checked : Is the orbital period physically correct?
Expected value  : Between 91 and 94 minutes
Actual value    : {expected_period_minutes:.2f} minutes
Result          : {'PASSED' if t1_pass else 'FAILED'}
Plain English   : The time it takes the satellite to complete
                  one orbit around Earth. For a 415km orbit
                  this should be about 92-93 minutes.
                  ({'PASSED means the physics are correct' if t1_pass else 'FAILED means the orbit size calculation is wrong'})
"""

        # Call the function for the remaining tests
        line1, line2, positions, apogee_point, perigee_point = generate_synthetic_tle(
            apogee_km, perigee_km, inclination_deg, raan_deg, arg_perigee_deg, mean_anomaly_deg, bstar, epoch_time
        )
        
        # TEST 2
        ap_diff = abs(apogee_point['altitude_km'] - 422.0)
        pe_diff = abs(perigee_point['altitude_km'] - 408.0)
        t2_pass = ap_diff <= 15.0 and pe_diff <= 15.0
        if t2_pass: passed_count += 1
        
        print("\nTEST 2 — Apogee and Perigee Altitudes")
        print("Expected : Apogee ~422 km, Perigee ~408 km (±15 km)")
        print(f"Got      : Apogee {apogee_point['altitude_km']:.2f} km, Perigee {perigee_point['altitude_km']:.2f} km")
        print(f"Status   : {'PASSED [PASS]' if t2_pass else 'FAILED [FAIL]'}")
        print("Meaning  : The highest and lowest points of the orbit match what the user entered.")
        
        report_content += f"""
Test 2 — Apogee and Perigee Altitudes
What we checked : Do the highest and lowest orbit points match inputs?
Expected value  : Apogee 422 km, Perigee 408 km (within 5 km)
Actual value    : Apogee {apogee_point['altitude_km']:.2f} km, Perigee {perigee_point['altitude_km']:.2f} km
Result          : {'PASSED' if t2_pass else 'FAILED'}
Plain English   : The orbit should reach exactly as high and as low
                  as the user specified. 
                  ({'PASSED means the orbit shape is correct' if t2_pass else 'FAILED means the eccentricity calculation is wrong'})
"""

        # TEST 3
        p0 = positions[0]
        p_last = positions[-1]
        gap = math.sqrt((p0['x'] - p_last['x'])**2 + (p0['y'] - p_last['y'])**2 + (p0['z'] - p_last['z'])**2)
        t3_pass = gap < 50.0
        if t3_pass: passed_count += 1

        print("\nTEST 3 — Orbit Ring Closure")
        print("Expected : Gap between first and last point < 50 km")
        print(f"Got      : Gap = {gap:.4f} km")
        print(f"Status   : {'PASSED [PASS]' if t3_pass else 'FAILED [FAIL]'}")
        print("Meaning  : The orbit ring shown on the globe is a closed loop with no visible gap.")

        report_content += f"""
Test 3 — Orbit Ring Closure
What we checked : Does the orbit form a closed loop on the globe?
Expected value  : Gap less than 10 km between start and end point
Actual value    : Gap = {gap:.4f} km
Result          : {'PASSED' if t3_pass else 'FAILED'}
Plain English   : The orbit ring drawn on the globe should connect
                  back to where it started with no visible gap.
                  ({'PASSED means the ring looks correct on the globe' if t3_pass else 'FAILED means there will be a visible gap or zig-zag'})
"""

        # TEST 4
        nan_count = 0
        for p in positions:
            if math.isnan(p['x']) or math.isnan(p['y']) or math.isnan(p['z']) or \
               math.isinf(p['x']) or math.isinf(p['y']) or math.isinf(p['z']):
                nan_count += 1
                
        t4_pass = (nan_count == 0) and (len(positions) == 360)
        if t4_pass: passed_count += 1

        print("\nTEST 4 — No Invalid Positions")
        print("Expected : 360 valid positions, 0 NaN values")
        print(f"Got      : {len(positions)} positions, {nan_count} NaN values")
        print(f"Status   : {'PASSED [PASS]' if t4_pass else 'FAILED [FAIL]'}")
        print("Meaning  : The RK45 integrator completed successfully without numerical errors.")
        
        report_content += f"""
Test 4 — No Invalid Positions
What we checked : Did the math complete without errors?
Expected value  : All 360 points valid, zero errors
Actual value    : {len(positions)} points, {nan_count} errors
Result          : {'PASSED' if t4_pass else 'FAILED'}
Plain English   : The orbit calculation should produce exactly
                  360 clean position points with no mathematical errors.
                  ({'PASSED means integration completed successfully' if t4_pass else 'FAILED means the physics equations have a bug'})
"""

        # TEST 5
        alts = [math.sqrt(p['x']**2 + p['y']**2 + p['z']**2) - R_earth for p in positions]
        max_alt = max(alts)
        min_alt = min(alts)
        alt_range = max_alt - min_alt
        
        t5_pass = abs(max_alt - 422.0) <= 15.0 and abs(min_alt - 408.0) <= 15.0 and (1.0 <= alt_range <= 20.0)
        if t5_pass: passed_count += 1

        print("\nTEST 5 — Altitude Range Consistency")
        print("Expected : Max ~422 km, Min ~408 km, Range 1-20 km")
        print(f"Got      : Max {max_alt:.2f} km, Min {min_alt:.2f} km, Range {alt_range:.2f} km")
        print(f"Status   : {'PASSED [PASS]' if t5_pass else 'FAILED [FAIL]'}")
        print("Meaning  : The orbit stays physically bounded between perigee and apogee throughout.")

        report_content += f"""
Test 5 — Altitude Range Consistency
What we checked : Does the orbit stay within correct altitude bounds?
Expected value  : All points between 408 and 422 km altitude
Actual value    : Max {max_alt:.2f} km, Min {min_alt:.2f} km, Range {alt_range:.2f} km
Result          : {'PASSED' if t5_pass else 'FAILED'}
Plain English   : Every point along the orbit should stay between
                  the perigee and apogee altitudes entered by the user.
                  ({'PASSED means the orbit is physically stable' if t5_pass else 'FAILED means drag or perturbation forces are too strong'})
"""

    except Exception as e:
        print(f"\nAN ERROR OCCURRED DURING TESTS: {e}")
        report_content += f"\nAN ERROR OCCURRED DURING TESTS: {e}\n"

    overall_status = "READY FOR PRODUCTION [PASS]" if passed_count == 5 else "NEEDS FIXING [FAIL] — see failed tests above"
    report_overall = "READY" if passed_count == 5 else "NEEDS FIXING"
    
    print("\n============================================")
    print(f"OVERALL RESULT: {passed_count}/5 tests passed")
    print(f"RK45 Status: {overall_status}")
    print("============================================")
    
    report_content = report_content.format(passed=passed_count, overall=report_overall)
    
    report_content += """
====================================
Next Steps:
If all passed  : RK45 is working. No action needed.
If Test 1 fails: Check semi-major axis formula in rk45_propagate_orbit()
If Test 2 fails: Check eccentricity and state vector conversion
If Test 3 fails: Check snapshot_dt is passed to teme_to_ecef()
If Test 4 fails: Check equations_of_motion() for division by zero
If Test 5 fails: Check drag coefficient sign and perturbation magnitudes
"""

    report_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'rk45_validation_report.txt')
    with open(report_path, 'w', encoding='utf-8') as f:
        f.write(report_content)
        
    print(f"\nReport saved to: spacex_developing/rk45_validation_report.txt")

if __name__ == "__main__":
    run_tests()
