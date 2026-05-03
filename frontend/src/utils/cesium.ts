import * as Cesium from 'cesium';

export function ecefToCartesian(x: number, y: number, z: number): Cesium.Cartesian3 {
  // Cesium uses standard Cartesian3 for ECEF
  // The backend returns x,y,z in km, Cesium requires meters
  return new Cesium.Cartesian3(x * 1000, y * 1000, z * 1000);
}

// Simple approximation for UI purposes (a proper implementation would propagate TLE)
export function generateOrbitPoints(centerAltitudeKm: number, steps: number = 60): Cesium.Cartesian3[] {
  const points: Cesium.Cartesian3[] = [];
  const radius = (6371 + centerAltitudeKm) * 1000;
  
  for (let i = 0; i <= steps; i++) {
    const angle = (i / steps) * Math.PI * 2;
    // Approximating circular orbit over equator for demo purposes
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    points.push(new Cesium.Cartesian3(x, y, 0));
  }
  return points;
}

export function createGlowMaterial(colorCss: string, glowPower: number = 0.1): Cesium.MaterialProperty {
  const color = Cesium.Color.fromCssColorString(colorCss);
  return new Cesium.PolylineGlowMaterialProperty({
    glowPower: glowPower,
    color: color,
  });
}

export function flyToPosition(viewer: Cesium.Viewer, position: Cesium.Cartesian3): void {
  // Find a good viewing angle
  const offset = new Cesium.HeadingPitchRange(
    Cesium.Math.toRadians(0),
    Cesium.Math.toRadians(-45),
    2000000 // 2000km away
  );
  
  viewer.camera.flyToBoundingSphere(
    new Cesium.BoundingSphere(position, 0),
    {
      offset,
      duration: 2.0
    }
  );
}
