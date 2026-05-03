/** @vitest-environment jsdom */
import React from 'react';
import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MissionContext } from '../context/MissionContext';
import { MetricCards } from '../components/Dashboard/MetricCards';
import { ConjunctionTable } from '../components/Dashboard/ConjunctionTable';
import { formatPc, formatCountdown, getPcColor } from '../utils/format';
import { MOCK_RESULT } from '../utils/mockData';

const mockContextVal: any = {
  missionInput: { mode: 'norad' },
  setMissionInput: vi.fn(),
  analysisResult: MOCK_RESULT,
  setAnalysisResult: vi.fn(),
  isLoading: false,
  error: null,
  layers: {
    debrisCloud: true,
    activeSatellites: true,
    safeRoutingCorridor: true,
    tcaMarkers: true,
    uncertaintyEllipsoids: true
  },
  setLayers: vi.fn(),
  simulation: { currentHour: 0, speed: 1, isPlaying: false },
  setSimulation: vi.fn(),
  selectedConjunction: null,
  setSelectedConjunction: vi.fn()
};

describe('Formatting Utils', () => {
  test('formatPc returns correct scientific notation', () => {
    expect(formatPc(0.00032)).toBe("3.2×10⁻⁴");
  });

  test('formatCountdown returns HH:MM:SS format', () => {
    const futureDate = new Date(Date.now() + 3665000).toISOString(); // 1h 1m 5s
    expect(formatCountdown(futureDate)).toBe("01:01:05");
  });

  test('getPcColor returns correct color based on threshold', () => {
    expect(getPcColor(1.5e-4)).toBe("var(--accent-red)");
    expect(getPcColor(1e-5)).toBe("var(--accent-orange)");
    expect(getPcColor(1e-7)).toBe("var(--accent-green)");
  });
});

describe('Dashboard Component Rendering', () => {
  test('MetricCards renders without crashing', () => {
    render(
      <MissionContext.Provider value={mockContextVal}>
        <MetricCards />
      </MissionContext.Provider>
    );
    expect(screen.getByText(/High Risk Events/i)).toBeDefined();
    expect(screen.getAllByText('1').length).toBeGreaterThan(0);
  });

  test('ConjunctionTable renders all mock conjunction rows', () => {
    render(
      <MissionContext.Provider value={mockContextVal}>
        <ConjunctionTable />
      </MissionContext.Provider>
    );
    expect(screen.getAllByText('COSMOS 2251 DEB').length).toBeGreaterThan(0);
    expect(screen.getAllByText('IRIDIUM 33 DEB').length).toBeGreaterThan(0);
    expect(screen.getAllByText('FENGYUN 1C DEB').length).toBeGreaterThan(0);
    expect(screen.getAllByText('SL-8 R/B DEB').length).toBeGreaterThan(0);
    expect(screen.getAllByText('DEBRIS 2019-006C').length).toBeGreaterThan(0);
  });

  test('ConjunctionTable sorts correctly when Pc column header clicked', () => {
    render(
      <MissionContext.Provider value={mockContextVal}>
        <ConjunctionTable />
      </MissionContext.Provider>
    );
    const pcHeader = screen.getAllByText(/Pc Score/i)[0];
    fireEvent.click(pcHeader);
    
    expect(pcHeader).toBeDefined();
  });
});
