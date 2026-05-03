export let formatterSettings = {
  units: 'km',
  timeFormat: 'utc'
};

export function syncFormatterSettings(settings: any) {
  formatterSettings = settings;
}

export function formatPc(pc: number): string {
  if (pc === 0) return "0.0";
  const str = pc.toExponential(1);
  const [base, exp] = str.split('e');
  
  // Clean up exponent formatting (e.g. e-05 to 10⁻⁵)
  const power = parseInt(exp, 10);
  const superscriptMap: Record<string, string> = {
    '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', 
    '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹'
  };
  
  const formattedExp = power.toString().split('').map(char => superscriptMap[char] || char).join('');
  return `${base}×10${formattedExp}`;
}

export function formatDistance(km: number): string {
  if (formatterSettings.units === 'miles') {
    const miles = km * 0.621371;
    if (miles < 1) {
      return `${(miles * 5280).toFixed(0)} ft`;
    }
    return `${miles.toFixed(2)} mi`;
  }
  
  // Default to km
  if (km < 1) {
    return `${(km * 1000).toFixed(0)} m`;
  }
  return `${km.toFixed(2)} km`;
}

export function formatCountdown(isoString: string | null): string {
  if (!isoString) return '--:--:--';
  const diff = new Date(isoString).getTime() - Date.now();
  if (diff < 0) return '00:00:00';
  
  const h = Math.floor(diff / 3600000).toString().padStart(2, '0');
  const m = Math.floor((diff % 3600000) / 60000).toString().padStart(2, '0');
  const s = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0');
  
  return `${h}:${m}:${s}`;
}

export function formatTime(isoString: string): string {
  const d = new Date(isoString);
  
  if (formatterSettings.timeFormat === 'local') {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
      timeZoneName: 'short'
    }).format(d).replace(',', ' ·'); // Match UI styling
  }
  
  // Default to UTC
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const h = d.getUTCHours().toString().padStart(2, '0');
  const m = d.getUTCMinutes().toString().padStart(2, '0');
  return `${months[d.getUTCMonth()]} ${d.getUTCDate()} · ${h}:${m} UTC`;
}

export function getPcColor(pc: number): string {
  if (pc >= 1e-4) return 'var(--accent-red)';
  if (pc >= 1e-5) return 'var(--accent-orange)';
  if (pc >= 1e-6) return 'var(--accent-yellow)';
  return 'var(--accent-green)';
}

export function getPcLabel(pc: number): 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' {
  if (pc >= 1e-4) return 'CRITICAL';
  if (pc >= 1e-5) return 'HIGH';
  if (pc >= 1e-6) return 'MEDIUM';
  return 'LOW';
}

export function altitudeToColor(alt: number): string {
  if (alt < 400) return 'var(--accent-blue)';
  if (alt < 800) return 'var(--accent-orange)';
  return 'var(--accent-red)';
}
