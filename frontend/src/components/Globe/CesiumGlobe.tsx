import React, { useContext, useEffect, useRef } from 'react';
import * as Cesium from 'cesium';
import { MissionContext } from '../../context/MissionContext';

export const CesiumGlobe: React.FC = () => {
  const viewerRef = useRef<Cesium.Viewer | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const context = useContext(MissionContext);
  if (!context) return null;
  const { analysisResult, layers, selectedConjunction, simulation, settings } = context;

  // FIX 1 & 2B: Viewer initialization with fallback imagery and mouse controls
  useEffect(() => {
    if (viewerRef.current) return;

    try {
      const viewer = new Cesium.Viewer('cesium-container', {
        baseLayerPicker: false,
        geocoder: false,
        homeButton: false,
        sceneModePicker: false,
        navigationHelpButton: false,
        animation: false,
        timeline: false,
        fullscreenButton: true,
        infoBox: false,
        selectionIndicator: false,
        creditContainer: document.createElement('div'),
        contextOptions: {
          webgl: {
            alpha: true,
            failIfMajorPerformanceCaveat: false,
            powerPreference: 'high-performance'
          }
        }
        // Do NOT pass imageryProvider here — add it after init below
      });

      // Theme imagery will be handled by the globeTheme useEffect

      viewer.scene.globe.enableLighting = false;
      viewer.scene.globe.showGroundAtmosphere = true;
      viewer.scene.globe.atmosphereLightIntensity = 10.0;
      viewer.scene.globe.baseColor = Cesium.Color.fromCssColorString('#1a237e');
      viewer.scene.skyAtmosphere = new Cesium.SkyAtmosphere();
      viewer.scene.backgroundColor = Cesium.Color.fromCssColorString('#0a0e1a');

      viewer.camera.setView({
        destination: Cesium.Cartesian3.fromDegrees(0, 20, 25000000),
      });

      viewer.scene.screenSpaceCameraController.enableRotate = true;
      viewer.scene.screenSpaceCameraController.enableZoom = true;
      viewer.scene.screenSpaceCameraController.enableTilt = true;
      viewer.scene.screenSpaceCameraController.enableLook = true;
      viewer.scene.screenSpaceCameraController.enableTranslate = true;
      viewer.scene.screenSpaceCameraController.minimumZoomDistance = 500000;
      viewer.scene.screenSpaceCameraController.maximumZoomDistance = 50000000;

      viewerRef.current = viewer;
    } catch (e: any) {
      console.error("Cesium Initialization Error:", e);
      setError(e.message || "Failed to initialize 3D globe");
    }

    return () => {
      if (viewerRef.current && !viewerRef.current.isDestroyed()) {
        viewerRef.current.destroy();
        viewerRef.current = null;
      }
    };
  }, []);

  // Handle Globe Theme Switching
  useEffect(() => {
    if (!viewerRef.current) return;
    const viewer = viewerRef.current;

    const updateTheme = async () => {
      if (viewer.isDestroyed()) return;
      
      viewer.imageryLayers.removeAll();
      
      if (settings.globeTheme === 'minimal') {
        // No imagery, just the dark blue base color
        return;
      }
      
      try {
        let provider;
        if (settings.globeTheme === 'space') {
          provider = await Cesium.IonImageryProvider.fromAssetId(2); // Blue Marble or similar dark
        } else if (settings.globeTheme === 'terrain') {
          provider = await Cesium.IonImageryProvider.fromAssetId(3); // Bing Maps Aerial
        }
        
        if (!viewer.isDestroyed() && provider) {
          viewer.imageryLayers.addImageryProvider(provider);
        }
      } catch (e) {
        if (viewer.isDestroyed()) return;
        viewer.imageryLayers.removeAll();
        // Fallback
        // @ts-ignore
        const fallbackProvider = await Cesium.TileMapServiceImageryProvider.fromUrl(
          Cesium.buildModuleUrl('Assets/Textures/NaturalEarthII')
        );
        if (!viewer.isDestroyed()) viewer.imageryLayers.addImageryProvider(fallbackProvider);
      }
    };
    
    updateTheme();
  }, [settings.globeTheme]);

  // PROBLEM 2 & 5: Entity drawing and safe corridor
  useEffect(() => {
    if (!viewerRef.current || !analysisResult) return;
    const viewer = viewerRef.current;

    const { xKm, yKm, zKm } = analysisResult.mission.position;
    
    // Guard: if any coordinate is NaN or all are zero, do not draw
    if (isNaN(xKm) || isNaN(yKm) || isNaN(zKm)) {
      console.warn('OrbitWatch: mission position contains NaN, skipping draw');
      return;
    }
    if (xKm === 0 && yKm === 0 && zKm === 0) {
      console.warn('OrbitWatch: mission position is all zeros, skipping draw');
      return;
    }

    try {
      // Clear all previous entities
      viewer.entities.removeAll();

      // Convert ECEF km to Cesium Cartesian3 (multiply by 1000 for meters)
    const { xKm, yKm, zKm } = analysisResult.mission.position;
    const missionPos = new Cesium.Cartesian3(
      xKm * 1000,
      yKm * 1000,
      zKm * 1000
    );

    // Draw mission satellite — large cyan glowing point
    viewer.entities.add({
      id: 'mission-sat',
      name: analysisResult.mission.name,
      position: new Cesium.ConstantPositionProperty(missionPos),
      point: {
        pixelSize: settings.dotSize === 'small' ? 10 : settings.dotSize === 'large' ? 20 : 14,
        color: Cesium.Color.CYAN,
        outlineColor: Cesium.Color.WHITE,
        outlineWidth: 2,
        scaleByDistance: new Cesium.NearFarScalar(1.5e6, 2.0, 1.5e8, 0.5),
      },
      label: {
        text: analysisResult.mission.name,
        show: settings.showLabels,
        font: '13px Inter, sans-serif',
        fillColor: Cesium.Color.CYAN,
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 2,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        pixelOffset: new Cesium.Cartesian2(0, -16),
        distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 5e7),
      },
    });

    // Draw pulsing ring around mission satellite
    viewer.entities.add({
      id: 'mission-ring',
      position: new Cesium.ConstantPositionProperty(missionPos),
      ellipse: {
        semiMinorAxis: 80000,
        semiMajorAxis: 80000,
        material: Cesium.Color.CYAN.withAlpha(0.15),
        outline: true,
        outlineColor: Cesium.Color.CYAN.withAlpha(0.8),
        outlineWidth: 2,
        height: 0,
      },
    });

    // Draw uncertainty ellipsoid for mission
    viewer.entities.add({
      id: 'mission-ellipsoid',
      position: new Cesium.ConstantPositionProperty(missionPos),
      ellipsoid: {
        radii: new Cesium.Cartesian3(5000, 5000, 10000), // 5km x 5km x 10km
        material: Cesium.Color.CYAN.withAlpha(0.1),
        outline: true,
        outlineColor: Cesium.Color.CYAN.withAlpha(0.3),
      },
      show: layers.uncertaintyEllipsoids
    });

    // Draw proper orbit path for mission satellite
    const orbitPoints: Cesium.Cartesian3[] = [];
    if (analysisResult.mission.orbitPath && analysisResult.mission.orbitPath.length > 0) {
      analysisResult.mission.orbitPath.forEach((pt) => {
        if (!isNaN(pt.xKm) && !isNaN(pt.yKm) && !isNaN(pt.zKm) && 
            isFinite(pt.xKm) && isFinite(pt.yKm) && isFinite(pt.zKm)) {
          orbitPoints.push(new Cesium.Cartesian3(pt.xKm * 1000, pt.yKm * 1000, pt.zKm * 1000));
        }
      });
      if (orbitPoints.length > 0) orbitPoints.push(orbitPoints[0]); // close loop
    } else {
      // fallback to circle
      const altM = (analysisResult.mission.altitudeKm || 500) * 1000;
      const earthRadiusM = 6371000;
      const orbitRadiusFallback = earthRadiusM + altM;
      const incRad = ((analysisResult.mission.inclinationDeg || 45) * Math.PI) / 180;
      for (let i = 0; i <= 360; i += 2) {
        const angleRad = (i * Math.PI) / 180;
        const x = orbitRadiusFallback * Math.cos(angleRad);
        const y = orbitRadiusFallback * Math.sin(angleRad) * Math.cos(incRad);
        const z = orbitRadiusFallback * Math.sin(angleRad) * Math.sin(incRad);
        orbitPoints.push(new Cesium.Cartesian3(x, y, z));
      }
    }
    viewer.entities.add({
      id: 'mission-orbit',
      polyline: {
        positions: orbitPoints,
        width: 1.5,
        material: new Cesium.PolylineDashMaterialProperty({
          color: Cesium.Color.CYAN.withAlpha(settings.orbitOpacity / 100),
          dashLength: 16,
        }),
        arcType: Cesium.ArcType.NONE,
      },
    });

    if (analysisResult.mission.apogeePoint && !isNaN(analysisResult.mission.apogeePoint.xKm)) {
      const apogeePos = new Cesium.Cartesian3(
          analysisResult.mission.apogeePoint.xKm * 1000,
          analysisResult.mission.apogeePoint.yKm * 1000,
          analysisResult.mission.apogeePoint.zKm * 1000
      );
      viewer.entities.add({
        id: 'orbit-apogee',
        position: new Cesium.ConstantPositionProperty(apogeePos),
        point: {
          pixelSize: 6,
          color: Cesium.Color.fromCssColorString('#00e676'),
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 1,
        },
        label: {
          text: `Apogee: ${analysisResult.mission.apogeePoint.altitudeKm.toFixed(0)} km`,
          show: settings.showLabels,
          font: '10px Inter, sans-serif',
          fillColor: Cesium.Color.fromCssColorString('#00e676'),
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 2,
          pixelOffset: new Cesium.Cartesian2(0, 15),
          distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 5e7),
        }
      });
    }
    
    if (analysisResult.mission.perigeePoint && !isNaN(analysisResult.mission.perigeePoint.xKm)) {
      const perigeePos = new Cesium.Cartesian3(
          analysisResult.mission.perigeePoint.xKm * 1000,
          analysisResult.mission.perigeePoint.yKm * 1000,
          analysisResult.mission.perigeePoint.zKm * 1000
      );
      viewer.entities.add({
        id: 'orbit-perigee',
        position: new Cesium.ConstantPositionProperty(perigeePos),
        point: {
          pixelSize: 6,
          color: Cesium.Color.fromCssColorString('#ff6d00'),
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 1,
        },
        label: {
          text: `Perigee: ${analysisResult.mission.perigeePoint.altitudeKm.toFixed(0)} km`,
          show: settings.showLabels,
          font: '10px Inter, sans-serif',
          fillColor: Cesium.Color.fromCssColorString('#ff6d00'),
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 2,
          pixelOffset: new Cesium.Cartesian2(0, 15),
          distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 5e7),
        }
      });
    }

    const { inclinationDeg } = analysisResult.mission;
    const earthRadiusM2 = 6371000;
    const apoKm = analysisResult.mission.apogeePoint?.altitudeKm || analysisResult.mission.apogeeKm || analysisResult.mission.altitudeKm || 500;
    const periKm = analysisResult.mission.perigeePoint?.altitudeKm || analysisResult.mission.perigeeKm || analysisResult.mission.altitudeKm || 500;
    const sma = earthRadiusM2 + ((apoKm + periKm) / 2) * 1000;
    const incRad = ((inclinationDeg || 45) * Math.PI) / 180;

    // Draw each conjunction object
    analysisResult.conjunctions.forEach((conj, index) => {
      const cObj = conj as any;
      const xKm = cObj.x_km ?? 0;
      const yKm = cObj.y_km ?? 0;
      const zKm = cObj.z_km ?? 0;
      
      if (xKm === 0 && yKm === 0 && zKm === 0) return;
      
      const debrisPos = new Cesium.Cartesian3(xKm * 1000, yKm * 1000, zKm * 1000);

      const isHighRisk = conj.action === 'MANEUVER';
      const pointColor = isHighRisk
        ? Cesium.Color.RED
        : Cesium.Color.ORANGE.withAlpha(0.8);

      viewer.entities.add({
        id: `debris-${conj.noradId}`,
        name: conj.name,
        position: new Cesium.ConstantPositionProperty(debrisPos),
        point: {
          pixelSize: settings.dotSize === 'small' ? 6 : settings.dotSize === 'large' ? 16 : 10,
          color: pointColor,
          outlineColor: Cesium.Color.WHITE.withAlpha(0.3),
          outlineWidth: 1,
          scaleByDistance: new Cesium.NearFarScalar(1.5e6, 1.5, 1.5e8, 0.4),
        },
        label: {
          text: conj.name,
          show: settings.showLabels,
          font: '11px Inter, sans-serif',
          fillColor: isHighRisk ? Cesium.Color.RED : Cesium.Color.ORANGE,
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 2,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          pixelOffset: new Cesium.Cartesian2(0, -12),
          distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 3e7),
        },
      });

      // Draw uncertainty ellipsoid for conjunction
      viewer.entities.add({
        id: `debris-ellipsoid-${conj.noradId}`,
        name: `${conj.name} Uncertainty`,
        position: new Cesium.ConstantPositionProperty(debrisPos),
        ellipsoid: {
          radii: new Cesium.Cartesian3(8000, 8000, 12000), 
          material: isHighRisk ? Cesium.Color.RED.withAlpha(0.1) : Cesium.Color.ORANGE.withAlpha(0.1),
          outline: true,
          outlineColor: isHighRisk ? Cesium.Color.RED.withAlpha(0.3) : Cesium.Color.ORANGE.withAlpha(0.3),
        },
        show: layers.uncertaintyEllipsoids
      });

      // TCA marker
      const tcaPos = new Cesium.Cartesian3(
        (missionPos.x + debrisPos.x) / 2,
        (missionPos.y + debrisPos.y) / 2,
        (missionPos.z + debrisPos.z) / 2
      );
      viewer.entities.add({
        id: `tca-${conj.noradId}`,
        name: `TCA: ${conj.name}`,
        position: new Cesium.ConstantPositionProperty(tcaPos),
        point: {
          pixelSize: isHighRisk ? 12 : 8,
          color: Cesium.Color.YELLOW.withAlpha(0.9),
          outlineColor: Cesium.Color.ORANGE,
          outlineWidth: 2,
        },
        label: {
          text: `TCA\n${conj.missDistanceKm.toFixed(1)}km`,
          font: '10px Inter, sans-serif',
          fillColor: Cesium.Color.YELLOW,
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 2,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          pixelOffset: new Cesium.Cartesian2(0, -10),
          distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 2e7),
        },
      });

      // Conjunction line
      viewer.entities.add({
        id: `conjunction-line-${conj.noradId}`,
        polyline: {
          positions: new Cesium.ConstantProperty([missionPos, debrisPos]),
          width: isHighRisk ? 1.5 : 0.8,
          material: new Cesium.PolylineDashMaterialProperty({
            color: isHighRisk
              ? Cesium.Color.RED.withAlpha(0.6)
              : Cesium.Color.ORANGE.withAlpha(0.3),
            dashLength: 8,
          }),
          arcType: Cesium.ArcType.NONE,
        },
      });
    });

    // Safe routing corridor
    if (analysisResult.conjunctions.length > 0) {
      const highRisk = analysisResult.conjunctions.find(
        (c) => c.action === 'MANEUVER'
      );
      if (highRisk) {
        const safePoints: Cesium.Cartesian3[] = [];
        for (let i = 0; i <= 180; i += 5) {
          const angleRad = (i * Math.PI) / 180;
          const safeRadius = sma + 15000;
          const x = safeRadius * Math.cos(angleRad);
          const y = safeRadius * Math.sin(angleRad) * Math.cos(incRad);
          const z = safeRadius * Math.sin(angleRad) * Math.sin(incRad);
          safePoints.push(new Cesium.Cartesian3(x, y, z));
        }
        viewer.entities.add({
          id: 'safe-corridor',
          corridor: {
            positions: safePoints,
            width: 20000, // fixed 20km width, never dynamic
            material: Cesium.Color.GREEN.withAlpha(0.15),
            outline: true,
            outlineColor: Cesium.Color.GREEN.withAlpha(0.5),
            outlineWidth: 1,
            height: 0,
            extrudedHeight: 0,
          },
        });
      }
    } else {
      // Create empty safe corridor to allow toggling even if no conjunctions yet? 
      // Actually per requirement we'll just allow toggle to control "safe-corridor" if it exists.
    }

    // FIX 2A: Fly camera to top-down planetary view of orbit
    setTimeout(() => {
      if (!viewerRef.current) return;
      viewerRef.current.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(0, 25, 20000000),
        orientation: {
          heading: Cesium.Math.toRadians(0),
          pitch: Cesium.Math.toRadians(-90),
          roll: 0,
        },
        duration: 2.0,
      });
    }, 500);

    } catch (err) {
      console.error('OrbitWatch: failed to draw entities:', err);
    }
  }, [analysisResult]);

  // FIX 3A: Position updates on simulation time change
  useEffect(() => {
    if (!viewerRef.current || !analysisResult) return;
    const viewer = viewerRef.current;
  
    try {
      const earthRadius = 6371000;
      const apoKm = analysisResult.mission.apogeePoint?.altitudeKm || analysisResult.mission.apogeeKm || analysisResult.mission.altitudeKm || 500;
      const periKm = analysisResult.mission.perigeePoint?.altitudeKm || analysisResult.mission.perigeeKm || analysisResult.mission.altitudeKm || 500;
      const ra = earthRadius + apoKm * 1000;
      const rp = earthRadius + periKm * 1000;
      const sma = (ra + rp) / 2;
      const incRad = ((analysisResult.mission.inclinationDeg || 45) * Math.PI) / 180;
    
      // Orbital period in hours (approx): T = 2π × sqrt(a³/GM)
      const GM = 3.986004418e14;
      const periodSeconds = 2 * Math.PI * Math.sqrt(Math.pow(sma, 3) / GM);
      const periodHours = periodSeconds / 3600;
    
      // Current angle based on simulated hour
      const currentAngle = ((simulation.currentHour / periodHours) * 2 * Math.PI) % (2 * Math.PI);
  
    // Update mission satellite position
    let newMissionPos: Cesium.Cartesian3;
    const path = analysisResult.mission.orbitPath;
    if (path && path.length > 0) {
      // orbitPath has num_pts + 1 (closed loop, so N points spanning exactly 1 period)
      const numPts = path.length - 1;
      let pathIdx = Math.floor(((simulation.currentHour / periodHours) * numPts) % numPts);
      if (pathIdx < 0) pathIdx = 0;
      if (pathIdx > numPts) pathIdx = numPts;
      const pt = path[pathIdx];
      newMissionPos = new Cesium.Cartesian3(pt.xKm * 1000, pt.yKm * 1000, pt.zKm * 1000);
    } else {
      const newX = sma * Math.cos(currentAngle);
      const newY = sma * Math.sin(currentAngle) * Math.cos(incRad);
      const newZ = sma * Math.sin(currentAngle) * Math.sin(incRad);
      newMissionPos = new Cesium.Cartesian3(newX, newY, newZ);
    }

    if (isNaN(newMissionPos.x) || isNaN(newMissionPos.y) || isNaN(newMissionPos.z) || 
        (newMissionPos.x === 0 && newMissionPos.y === 0 && newMissionPos.z === 0)) {
       // Cannot update with invalid or zero geometry
       const mPos = analysisResult.mission.position;
       newMissionPos = new Cesium.Cartesian3(mPos.xKm * 1000, mPos.yKm * 1000, mPos.zKm * 1000); // fallback to stable initial position
    }
  
    const missionEntity = viewer.entities.getById('mission-sat');
    if (missionEntity && missionEntity.position) {
      (missionEntity.position as any) = new Cesium.ConstantPositionProperty(newMissionPos);
    }
  
    const ringEntity = viewer.entities.getById('mission-ring');
    if (ringEntity && ringEntity.position) {
      (ringEntity.position as any) = new Cesium.ConstantPositionProperty(newMissionPos);
    }
  
    // Update each debris object position
    analysisResult.conjunctions.forEach((conj, index) => {
      const cObj = conj as any;
      const xKm = cObj.x_km ?? 0;
      const yKm = cObj.y_km ?? 0;
      const zKm = cObj.z_km ?? 0;
      
      if (xKm === 0 && yKm === 0 && zKm === 0) return;
      
      const r = Math.sqrt(xKm**2 + yKm**2 + zKm**2);
      const GM = 398600.4418;
      const omega = Math.sqrt(GM / r**3);
      const elapsed = simulation.currentHour * 3600;
      const angle = omega * elapsed;
      
      // Rodrigues rotation around the orbital pole vector
      // pole ≈ normalize(r × v), where v ⊥ r in circular orbit
      // For position r = [rx,ry,rz] the pole approximation is:
      //   pole = normalize([-ry*rz, rx*rz, rx²+ry²])
      const rx = xKm, ry = yKm, rz = zKm;

      const poleX = -ry * rz;
      const poleY =  rx * rz;
      const poleZ =  rx * rx + ry * ry;
      const poleMag = Math.sqrt(poleX**2 + poleY**2 + poleZ**2);

      let newX: number, newY: number, newZ_: number;

      if (poleMag < 0.001) {
        // Degenerate (e.g. exactly at pole) — fall back to identity
        newX = rx; newY = ry; newZ_ = rz;
      } else {
        const ux = poleX / poleMag;
        const uy = poleY / poleMag;
        const uz = poleZ / poleMag;

        const cosA = Math.cos(angle);
        const sinA = Math.sin(angle);

        // u · r
        const uDotR = ux*rx + uy*ry + uz*rz;
        // u × r
        const crossX = uy*rz - uz*ry;
        const crossY = uz*rx - ux*rz;
        const crossZ = ux*ry - uy*rx;

        // Rodrigues: v_rot = v·cosA + (u×v)·sinA + u·(u·v)·(1−cosA)
        newX  = rx*cosA + crossX*sinA + ux*uDotR*(1 - cosA);
        newY  = ry*cosA + crossY*sinA + uy*uDotR*(1 - cosA);
        newZ_ = rz*cosA + crossZ*sinA + uz*uDotR*(1 - cosA);
      }

      const newDebrisPos = new Cesium.Cartesian3(
          newX * 1000, newY * 1000, newZ_! * 1000
      );
  
      const debrisEntity = viewer.entities.getById(`debris-${conj.noradId}`);
      if (debrisEntity && debrisEntity.position) {
        (debrisEntity.position as any) = new Cesium.ConstantPositionProperty(newDebrisPos);
      }
  
      // Update TCA marker
      const tcaPos = new Cesium.Cartesian3(
        (newMissionPos.x + newDebrisPos.x) / 2,
        (newMissionPos.y + newDebrisPos.y) / 2,
        (newMissionPos.z + newDebrisPos.z) / 2
      );
      const tcaEntity = viewer.entities.getById(`tca-${conj.noradId}`);
      if (tcaEntity && tcaEntity.position) {
        (tcaEntity.position as any) = new Cesium.ConstantPositionProperty(tcaPos);
      }
  
      // Update conjunction line
      const dist = Cesium.Cartesian3.distance(newMissionPos, newDebrisPos);
      if (dist > 1000) { // only update line if > 1km apart
        const lineEntity = viewer.entities.getById(`conjunction-line-${conj.noradId}`);
        if (lineEntity && lineEntity.polyline) {
          lineEntity.polyline.positions = new Cesium.ConstantProperty([
            newMissionPos,
            newDebrisPos,
          ]);
        }
      }
    });
  
    } catch (err) {
      console.warn('OrbitWatch: simulation frame error (skipping frame):', err);
    }
  }, [simulation.currentHour, analysisResult]);

  // Handle Layer toggles
  useEffect(() => {
    if (!viewerRef.current) return;
    const viewer = viewerRef.current;

    viewer.entities.values.forEach((entity) => {
      const id = entity.id as string;
      if (id.startsWith('debris-')) entity.show = layers.debrisCloud;
      if (id.startsWith('tca-')) entity.show = layers.tcaMarkers;
      if (id.startsWith('conjunction-line-')) entity.show = layers.debrisCloud;
      if (id === 'mission-orbit') entity.show = layers.activeSatellites;
      if (id === 'orbit-apogee' || id === 'orbit-perigee') entity.show = layers.activeSatellites;
      if (id === 'safe-corridor') entity.show = layers.safeRoutingCorridor;
      if (id === 'mission-ellipsoid' || id.startsWith('debris-ellipsoid-')) entity.show = layers.uncertaintyEllipsoids;
    });
  }, [layers]);

  if (error) {
    return (
      <div style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0a0e1a',
        color: '#7986cb',
        flexDirection: 'column',
        gap: '12px',
      }}>
        <p style={{ fontSize: '18px' }}>3D Globe unavailable</p>
        <p style={{ fontSize: '12px' }}>Please refresh the page or ensure WebGL hardware acceleration is enabled.</p>
        <p style={{ fontSize: '10px', opacity: 0.5 }}>{error}</p>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div
        id="cesium-container"
        style={{
          width: '100%',
          height: '100%',
          minHeight: '100vh',
          position: 'relative',
          backgroundColor: '#0a0e1a',
        }}
      />
      
      {/* FIX 2C: Reset View Button */}
      <button
        onClick={() => {
          if (!viewerRef.current) return;
          viewerRef.current.camera.flyTo({
            destination: Cesium.Cartesian3.fromDegrees(0, 25, 20000000),
            duration: 1.5,
          });
        }}
        className="absolute bottom-[48px] right-[8px] z-10 h-[32px] rounded-[6px] bg-transparent border border-[#1a2845] text-[#7986cb] text-[11px] px-3 hover:border-[#00e5ff] hover:text-[#00e5ff] transition-colors duration-150 cursor-pointer"
      >
        RESET VIEW
      </button>

      {!analysisResult && (
        <div style={{
          position: 'absolute',
          bottom: '40px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: 'rgba(10, 14, 26, 0.85)',
          border: '1px solid #1a2040',
          borderRadius: '12px',
          padding: '16px 24px',
          textAlign: 'center',
          color: '#7986cb',
          fontSize: '13px',
          zIndex: 10,
          pointerEvents: 'none',
        }}>
          Enter a NORAD ID or orbital parameters and click Analyze
        </div>
      )}
    </div>
  );
};
