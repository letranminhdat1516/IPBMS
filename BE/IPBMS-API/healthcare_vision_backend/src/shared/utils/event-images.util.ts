export type EventImage = {
  image_id: string;
  image_path: string | null;
  cloud_url: string | null;
  created_at: string;
};

export type EventLike = Record<string, any>;

export function pickImageUrl(row: EventLike, rawKey = 'image_url'): string | undefined {
  if (!row) return undefined;
  const fromRaw = row?.[rawKey];
  if (typeof fromRaw === 'string' && fromRaw.trim()) return fromRaw;
  const s = row?.snapshot ?? row?.s;
  const cloud = s?.cloud_url;
  const path = s?.image_path;
  if (typeof cloud === 'string' && cloud.trim()) return cloud;
  if (typeof path === 'string' && path.trim()) return path;
  return undefined;
}

export function ensureImages<T extends EventLike>(
  row: T,
  rawKey = 'image_url',
  rawImagesKey = 'images',
): T & { images: EventImage[] } {
  const rawImages = row?.[rawImagesKey];
  if (Array.isArray(rawImages) && rawImages.length > 0) {
    return { ...(row as any), images: rawImages };
  }

  const url = pickImageUrl(row, rawKey);
  const image: EventImage | undefined = url
    ? {
        image_id: '',
        image_path: url?.startsWith('http') ? null : url,
        cloud_url: url?.startsWith('http') ? url : null,
        created_at: '',
      }
    : undefined;

  const images = image ? [image] : [];
  return { ...(row as any), images };
}

export function ensureImagesBatch<T extends EventLike>(
  rows: T[],
  rawKey = 'image_url',
  rawImagesKey = 'images',
): Array<T & { images: EventImage[] }> {
  return (rows ?? []).map((r) => ensureImages(r, rawKey, rawImagesKey));
}

export function mergeEntitiesWithRawImages<T extends EventLike>(
  entities: T[],
  raw: EventLike[],
  rawKey = 'image_url',
  rawImagesKey = 'images',
): Array<T & { images: EventImage[] }> {
  return (entities ?? []).map((e, i) => {
    const r = raw?.[i] ?? {};
    const rawImages = r?.[rawImagesKey];

    if (Array.isArray(rawImages) && rawImages.length > 0) {
      return { ...(e as any), images: rawImages };
    }

    const url = r?.[rawKey];
    const image: EventImage | undefined = url
      ? {
          image_id: '',
          image_path: url?.startsWith('http') ? null : url,
          cloud_url: url?.startsWith('http') ? url : null,
          created_at: '',
        }
      : undefined;

    return image ? { ...(e as any), images: [image] } : ensureImages(e, rawKey, rawImagesKey);
  });
}
