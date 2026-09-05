/**
 * Computes Haversine distance in meters between two lat/lon coordinates
 */
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  if (lat1 === lat2 && lon1 === lon2) return 0;
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

/**
 * Computes forward Great-Circle initial bearing (0-360 deg) from point A to point B
 */
export function calculateBearing(startLat: number, startLng: number, destLat: number, destLng: number): number {
  const y = Math.sin(((destLng - startLng) * Math.PI) / 180) * Math.cos((destLat * Math.PI) / 180);
  const x =
    Math.cos((startLat * Math.PI) / 180) * Math.sin((destLat * Math.PI) / 180) -
    Math.sin((startLat * Math.PI) / 180) *
      Math.cos((destLat * Math.PI) / 180) *
      Math.cos(((destLng - startLng) * Math.PI) / 180);
  let brng = (Math.atan2(y, x) * 180) / Math.PI;
  return (brng + 360) % 360;
}

/**
 * Calculates the needle rotation angle for the UI arrow
 * Rotation = (Bearing To Target - Compass Heading + 360) % 360
 */
export function calculateArrowAngle(
  myLat: number,
  myLng: number,
  targetLat: number,
  targetLng: number,
  compassHeading: number
): number {
  const bearing = calculateBearing(myLat, myLng, targetLat, targetLng);
  return (bearing - compassHeading + 360) % 360;
}

/**
 * Gets a friendly directional instruction based on relative angle (0-360)
 */
export function getRelativeDirectionAdvice(relativeAngle: number, lang: 'en' | 'hi' | 'mr' = 'en'): string {
  const angle = ((relativeAngle % 360) + 360) % 360;
  
  if (angle >= 345 || angle <= 15) {
    if (lang === 'hi') return 'सीधे आगे बढ़ें (Straight Ahead)';
    if (lang === 'mr') return 'सरळ पुढे जा (Straight Ahead)';
    return 'Straight Ahead';
  }
  if (angle > 15 && angle <= 65) {
    const deg = Math.round(angle);
    if (lang === 'hi') return `दाएं मुड़ें (~${deg}°)`;
    if (lang === 'mr') return `उजवीकडे वळा (~${deg}°)`;
    return `Bear Right (~${deg}°)`;
  }
  if (angle > 65 && angle <= 120) {
    if (lang === 'hi') return 'दाएं घूमें (Turn Right)';
    if (lang === 'mr') return 'उजवीकडे वळा (Turn Right)';
    return 'Turn Right';
  }
  if (angle > 120 && angle <= 165) {
    if (lang === 'hi') return 'पीछे दाएं (Hard Right)';
    if (lang === 'mr') return 'मागे उजवीकडे (Hard Right)';
    return 'Sharp Right';
  }
  if (angle > 165 && angle <= 195) {
    if (lang === 'hi') return 'पीछे मुड़ें (Turn Around)';
    if (lang === 'mr') return 'मागे वळा (Turn Around)';
    return 'Turn Around / Behind You';
  }
  if (angle > 195 && angle <= 240) {
    if (lang === 'hi') return 'पीछे बाएं (Hard Left)';
    if (lang === 'mr') return 'मागे डावीकडे (Hard Left)';
    return 'Sharp Left';
  }
  if (angle > 240 && angle <= 295) {
    if (lang === 'hi') return 'बाएं घूमें (Turn Left)';
    if (lang === 'mr') return 'डावीकडे वळा (Turn Left)';
    return 'Turn Left';
  }
  const degLeft = Math.round(360 - angle);
  if (lang === 'hi') return `बाएं मुड़ें (~${degLeft}°)`;
  if (lang === 'mr') return `डावीकडे वळा (~${degLeft}°)`;
  return `Bear Left (~${degLeft}°)`;
}
