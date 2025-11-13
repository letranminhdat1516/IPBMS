export function formatIsoLocal(d?: Date): string {
  const date = d ?? new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());

  const tzOffsetMin = -date.getTimezoneOffset();
  const sign = tzOffsetMin >= 0 ? '+' : '-';
  const absMin = Math.abs(tzOffsetMin);
  const tzH = pad(Math.floor(absMin / 60));
  const tzM = pad(absMin % 60);

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${sign}${tzH}:${tzM}`;
}
