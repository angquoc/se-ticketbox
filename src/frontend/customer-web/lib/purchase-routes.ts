/** Các route thuộc luồng mua vé — chỉ redirect waiting room khi user còn ở đây. */
export function isPurchaseFlowPath(pathname: string, concertId: string): boolean {
  const base = `/concerts/${concertId}`;
  return (
    pathname === `${base}/waiting` ||
    pathname === `${base}/seats` ||
    pathname === `${base}/checkout`
  );
}
