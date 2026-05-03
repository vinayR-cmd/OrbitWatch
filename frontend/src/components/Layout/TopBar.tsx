import React, { useContext } from 'react';
import { Satellite, Settings } from 'lucide-react';
import jsPDF from 'jspdf';
import { MissionContext } from '../../context/MissionContext';

export const TopBar: React.FC = () => {
  const context = useContext(MissionContext);
  if (!context) return null;
  const { setIsSettingsOpen } = context;

  function exportToPDF(analysisResult: any) {
    const doc = new jsPDF({ 
      orientation: 'portrait', 
      unit: 'mm', 
      format: 'a4' 
    });

    const pageW = 210;
    const margin = 18;
    const colW = pageW - margin * 2;
    let y = 20;

    const colors = {
      bg: [8, 12, 28] as [number, number, number],
      panel: [15, 22, 45] as [number, number, number],
      cyan: [0, 229, 255] as [number, number, number],
      red: [244, 67, 54] as [number, number, number],
      orange: [255, 109, 0] as [number, number, number],
      yellow: [255, 193, 7] as [number, number, number],
      green: [0, 230, 118] as [number, number, number],
      white: [232, 234, 246] as [number, number, number],
      muted: [121, 134, 203] as [number, number, number],
      border: [26, 32, 64] as [number, number, number],
    };

    // ── Full page dark background ──
    doc.setFillColor(...colors.bg);
    doc.rect(0, 0, 210, 297, 'F');

    // ── Header bar ──
    doc.setFillColor(...colors.panel);
    doc.rect(0, 0, 210, 22, 'F');
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...colors.cyan);
    doc.text('ORBITWATCH', margin, 14);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...colors.muted);
    doc.text('SPACE DEBRIS TRACKING & COLLISION PREVENTION REPORT', margin + 38, 14);
    doc.setTextColor(...colors.muted);
    doc.text(
      `Generated: ${new Date().toUTCString()}`, 
      pageW - margin, 
      14, 
      { align: 'right' }
    );

    y = 32;

    // ── Mission summary card ──
    doc.setFillColor(...colors.panel);
    doc.roundedRect(margin, y, colW, 28, 3, 3, 'F');
    doc.setDrawColor(...colors.border);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, y, colW, 28, 3, 3, 'S');

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...colors.muted);
    doc.text('MISSION', margin + 6, y + 8);

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...colors.white);
    doc.text(analysisResult.mission.name, margin + 6, y + 16);

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...colors.muted);
    const missionMeta = [
      `NORAD ID: ${analysisResult.mission.noradId}`,
      `Altitude: ${analysisResult.mission.altitudeKm.toFixed(1)} km`,
      `Inclination: ${analysisResult.mission.inclinationDeg.toFixed(2)}°`,
      `Position: X ${analysisResult.mission.position.xKm.toFixed(0)} / Y ${analysisResult.mission.position.yKm.toFixed(0)} / Z ${analysisResult.mission.position.zKm.toFixed(0)} km`,
    ];
    doc.text(missionMeta.join('    ·    '), margin + 6, y + 23);

    y += 36;

    // ── Summary metric cards (2×2 grid) ──
    const highRiskCount = analysisResult.summary.highRiskCount;
    const maxPc = Math.max(...analysisResult.conjunctions.map((c: any) => c.pc));
    const minDist = Math.min(...analysisResult.conjunctions.map((c: any) => c.missDistanceKm));
    const closestObj = analysisResult.conjunctions.find(
      (c: any) => c.missDistanceKm === minDist
    );
    const nextTca = analysisResult.summary.nextTca;
    const tcaDiff = (new Date(nextTca).getTime() - Date.now()) / 3600000;
    const tcaHours = Math.max(0, tcaDiff);

    const cards = [
      { 
        label: 'HIGH RISK EVENTS', 
        value: String(highRiskCount), 
        sub: 'objects above Pc 1×10⁻⁴',
        color: highRiskCount > 0 ? colors.red : colors.green 
      },
      { 
        label: 'NEXT TCA IN', 
        value: `${Math.floor(tcaHours)}h ${Math.floor((tcaHours % 1) * 60)}m`,
        sub: new Date(nextTca).toUTCString().slice(0, 25) + ' UTC',
        color: tcaHours < 6 ? colors.orange : colors.cyan
      },
      { 
        label: 'MIN MISS DISTANCE', 
        value: minDist < 1 ? `${(minDist * 1000).toFixed(0)} m` : `${minDist.toFixed(2)} km`,
        sub: closestObj?.name ?? 'N/A',
        color: minDist < 1 ? colors.red : minDist < 10 ? colors.orange : colors.green
      },
      { 
        label: 'MAX Pc SCORE', 
        value: maxPc > 0 ? maxPc.toExponential(1).replace('e', '×10^').replace('+', '').replace('-0','-') : '0',
        sub: maxPc > 1e-4 ? 'MANEUVER REQUIRED' : 'ALL CLEAR',
        color: maxPc > 1e-4 ? colors.red : colors.green
      },
    ];

    const cardW = (colW - 6) / 2;
    const cardH = 22;
    cards.forEach((card, i) => {
      const cx = margin + (i % 2) * (cardW + 6);
      const cy = y + Math.floor(i / 2) * (cardH + 4);
      doc.setFillColor(...colors.panel);
      doc.roundedRect(cx, cy, cardW, cardH, 2, 2, 'F');
      doc.setDrawColor(...colors.border);
      doc.setLineWidth(0.3);
      doc.roundedRect(cx, cy, cardW, cardH, 2, 2, 'S');
      doc.setFontSize(6);
      doc.setTextColor(...colors.muted);
      doc.text(card.label, cx + 5, cy + 6);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...card.color);
      doc.text(card.value, cx + 5, cy + 14);
      doc.setFontSize(6);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...colors.muted);
      doc.text(card.sub, cx + 5, cy + 20);
    });

    y += 2 * (cardH + 4) + 10;

    // ── Conjunction table ──
    doc.setFillColor(...colors.panel);
    doc.roundedRect(margin, y, colW, 8, 2, 2, 'F');
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...colors.cyan);
    doc.text('CONJUNCTION EVENTS — T+0 TO T+72H', margin + 5, y + 5.5);

    y += 10;

    // Table header
    const cols = [
      { label: 'OBJECT', x: margin + 2, w: 48 },
      { label: 'NORAD ID', x: margin + 52, w: 20 },
      { label: 'TCA TIME (UTC)', x: margin + 74, w: 36 },
      { label: 'MISS DIST', x: margin + 112, w: 24 },
      { label: 'Pc SCORE', x: margin + 138, w: 24 },
      { label: 'ACTION', x: margin + 164, w: 22 },
    ];

    doc.setFillColor(20, 28, 53);
    doc.rect(margin, y, colW, 7, 'F');
    doc.setFontSize(6);
    doc.setFont('helvetica', 'bold');
    cols.forEach(col => {
      doc.setTextColor(...colors.muted);
      doc.text(col.label, col.x, y + 4.8);
    });

    y += 8;

    // Table rows
    analysisResult.conjunctions.forEach((conj: any, idx: number) => {
      const rowH = 9;
      const isManeuver = conj.action === 'MANEUVER';
      const rowBg: [number,number,number] = idx % 2 === 0 ? [15, 22, 45] : [12, 18, 38];

      doc.setFillColor(...rowBg);
      if (isManeuver) {
        doc.setFillColor(40, 15, 15);
      }
      doc.rect(margin, y, colW, rowH, 'F');

      // Left accent bar for maneuver rows
      if (isManeuver) {
        doc.setFillColor(...colors.red);
        doc.rect(margin, y, 1.5, rowH, 'F');
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(...colors.white);
      doc.text(conj.name.length > 18 ? conj.name.slice(0, 18) + '…' : conj.name, cols[0].x, y + 6);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(...colors.muted);
      doc.text(String(conj.noradId), cols[1].x, y + 6);

      doc.setTextColor(...colors.white);
      const tcaFormatted = new Date(conj.tcaTime)
        .toUTCString().slice(0, 22);
      doc.text(tcaFormatted, cols[2].x, y + 6);

      const distColor: [number,number,number] = conj.missDistanceKm < 1 
        ? colors.red 
        : conj.missDistanceKm < 10 
          ? colors.orange 
          : colors.yellow;
      doc.setTextColor(...distColor);
      const distStr = conj.missDistanceKm < 1 
        ? `${(conj.missDistanceKm * 1000).toFixed(0)} m` 
        : `${conj.missDistanceKm.toFixed(2)} km`;
      doc.text(distStr, cols[3].x, y + 6);

      const pcColor: [number,number,number] = conj.pc > 1e-4 
        ? colors.red 
        : conj.pc > 1e-5 
          ? colors.orange 
          : colors.muted;
      doc.setTextColor(...pcColor);
      doc.text(
        conj.pc.toExponential(1).replace('e-0', '×10⁻').replace('e-', '×10⁻'),
        cols[4].x, y + 6
      );

      if (isManeuver) {
        doc.setFillColor(...colors.red);
        doc.setDrawColor(...colors.red);
        doc.roundedRect(cols[5].x - 1, y + 1.5, 20, 6, 1, 1, 'FD');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(5.5);
        doc.text('MANEUVER', cols[5].x + 1, y + 5.8);
      } else {
        doc.setDrawColor(41, 98, 200);
        doc.roundedRect(cols[5].x - 1, y + 1.5, 18, 6, 1, 1, 'S');
        doc.setTextColor(92, 143, 255);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(5.5);
        doc.text('MONITOR', cols[5].x + 1, y + 5.8);
      }

      y += rowH;
    });

    y += 10;

    // ── Safe routing section (if maneuver needed) ──
    const highRisk = analysisResult.conjunctions.find((c: any) => c.action === 'MANEUVER');
    if (highRisk) {
      doc.setFillColor(...colors.panel);
      doc.setDrawColor(0, 150, 80);
      doc.setLineWidth(0.3);
      doc.roundedRect(margin, y, colW, 50, 3, 3, 'FD');

      doc.setFillColor(0, 120, 60);
      doc.roundedRect(margin, y, colW, 8, 3, 3, 'F');
      doc.rect(margin, y + 5, colW, 3, 'F');
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 230, 118);
      doc.text('SUGGESTED MANEUVER PLAN', margin + 5, y + 5.8);

      const tcaHoursUntil = Math.max(
        0,
        (new Date(highRisk.tcaTime).getTime() - Date.now()) / 3600000
      );
      const deltaV = Math.max(0.1, Math.min(2.0, 1.0 / highRisk.missDistanceKm));
      const newDist = highRisk.missDistanceKm * 4;
      const newPc = highRisk.pc / 150;

      const planRows = [
        ['Threatening object', highRisk.name, colors.white],
        ['NORAD ID', String(highRisk.noradId), colors.muted],
        ['Current TCA', new Date(highRisk.tcaTime).toUTCString().slice(0, 25) + ' UTC', colors.white],
        ['Current miss distance', highRisk.missDistanceKm < 1 
          ? `${(highRisk.missDistanceKm * 1000).toFixed(0)} m` 
          : `${highRisk.missDistanceKm.toFixed(2)} km`, colors.red as [number,number,number]],
        ['Current Pc', highRisk.pc.toExponential(1), colors.red as [number,number,number]],
        ['Recommended maneuver time', `T - 6h (${(tcaHoursUntil - 6).toFixed(1)}h from now)`, colors.cyan as [number,number,number]],
        ['Burn direction', 'Prograde (+V-bar)', colors.white],
        ['Delta-V required', `${deltaV.toFixed(3)} m/s`, colors.cyan as [number,number,number]],
        ['Est. new miss distance', `${newDist.toFixed(2)} km`, colors.green as [number,number,number]],
        ['Est. new Pc after maneuver', newPc.toExponential(1), colors.green as [number,number,number]],
      ];

      let ry = y + 13;
      const halfW = (colW - 10) / 2;
      planRows.forEach((row, i) => {
        const rx = i % 2 === 0 ? margin + 5 : margin + 5 + halfW + 5;
        if (i % 2 === 0) {
          ry += i === 0 ? 0 : 8;
        }
        doc.setFontSize(5.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...colors.muted);
        doc.text(String(row[0]), rx, ry);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...(row[2] as [number,number,number]));
        doc.text(String(row[1]), rx, ry + 4.5);
      });

      y += 58;
    }

    // ── Footer ──
    doc.setFillColor(...colors.panel);
    doc.rect(0, 285, 210, 12, 'F');
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...colors.muted);
    doc.text('OrbitWatch · AI-Powered Space Debris Tracking', margin, 292);
    doc.text(
      'Data source: Space-Track.org · Model: OrbitalTransformer · Estimates only — verify with flight dynamics team',
      pageW - margin,
      292,
      { align: 'right' }
    );

    doc.save(`orbitwatch_report_${analysisResult.mission.name.replace(/\s/g, '_')}_${
      new Date().toISOString().slice(0, 10)
    }.pdf`);
  }

  if (!context) return null;
  const { analysisResult, isDemoMode } = context;

  return (
    <div className="col-span-full h-14 bg-space-primary border-b border-space-border px-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Satellite size={20} className="text-accent-cyan" />
        <span className="text-lg font-bold text-text-primary tracking-wide">OrbitWatch</span>
      </div>

      <div className="flex items-center justify-center flex-1">
        {analysisResult && (
          <div className="flex items-center gap-3 bg-transparent px-4 py-1.5 rounded-full border border-space-border">
            <span className="text-[12px] font-[600] text-[#00e5ff] px-[14px] py-[4px] rounded-[20px] bg-transparent border border-[rgba(0,229,255,0.25)]">{analysisResult.mission.name}</span>
            <div className="w-[1px] h-4 bg-space-border" />
            <div className="flex items-center gap-2">
              <span className="w-[6px] h-[6px] rounded-full bg-[#00e676] animate-[pulse_2s_infinite]" />
              <span className="text-[11px] font-bold text-text-secondary tracking-widest uppercase">LIVE</span>
            </div>
            {isDemoMode && (
              <>
                <div className="w-[1px] h-4 bg-space-border" />
                <span className="text-[9px] text-[#ff9800] bg-transparent border border-[#ff9800] px-[7px] py-[2px] rounded-[3px]">DEMO</span>
              </>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        <button 
          onClick={() => {
            if (analysisResult) {
              exportToPDF(analysisResult);
            } else {
              alert('Run an analysis first before exporting.');
            }
          }}
          className="h-[32px] rounded-[6px] bg-transparent border border-[#1a2845] text-[#7986cb] text-[11px] uppercase tracking-wider font-bold px-3 hover:border-[#00e5ff] hover:text-[#00e5ff] transition-colors duration-150"
        >
          Export PDF
        </button>
        <button 
          onClick={() => setIsSettingsOpen(true)}
          className="p-2 text-text-secondary hover:text-text-primary transition-colors"
        >
          <Settings size={18} />
        </button>
      </div>
    </div>
  );
};
