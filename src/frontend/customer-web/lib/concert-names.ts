const CONCERT_NAMES: Record<string, string> = {
  'demo-concert': 'Sơn Tùng M-TP — SKY Tour 2026',
  'concert-001': 'BlackPink — Born Pink World Tour',
};

export function getConcertName(concertId: string): string {
  return CONCERT_NAMES[concertId] ?? `Concert ${concertId}`;
}
