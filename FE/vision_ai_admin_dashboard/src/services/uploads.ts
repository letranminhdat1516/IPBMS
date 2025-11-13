import { useMutation, useQueryClient } from '@tanstack/react-query';

import api from '@/lib/api';

/**
 * Uploads service
 *
 * Assumptions (derived from backend docs summary):
 * - The backend exposes an endpoint to request a presigned URL for uploads.
 *   We'll call it POST /uploads/presigned (body: { filename, content_type, purpose? })
 *   and expect a response shape { upload_id, upload_url, file_url?, expires_in? }.
 * - After client PUTs the file to the presigned URL, the client calls
 *   POST /uploads/{upload_id}/complete to finalize and obtain the canonical file URL.
 *
 * These names are reasonable defaults — if your backend uses different paths,
 * adjust the functions below to match the actual endpoints.
 */

export type InitUploadRequest = {
  filename: string;
  content_type?: string;
  purpose?: string; // optional purpose/namespace
};

export type InitUploadResponse = {
  upload_id: string;
  upload_url: string; // presigned URL (PUT)
  file_url?: string; // optional final file url if already known
  expires_in?: number; // seconds
};

export type CompleteUploadResponse = {
  success: boolean;
  file_url: string;
};

export function initUploadPresigned(body: InitUploadRequest) {
  return api.post<InitUploadResponse>('/uploads/presigned', body);
}

export function completeUpload(upload_id: string) {
  return api.post<CompleteUploadResponse>(`/uploads/${encodeURIComponent(upload_id)}/complete`);
}

/**
 * Upload binary data to a presigned URL using a PUT request.
 * This does not use the central `api` client because presigned URLs are often
 * absolute external URLs and may require direct PUTs.
 */
export async function uploadToPresignedUrl(
  uploadUrl: string,
  data: Blob | ArrayBuffer | Uint8Array,
  contentType?: string
) {
  const headers: Record<string, string> = {};
  if (contentType) headers['Content-Type'] = contentType;

  // Normalize to Blob for fetch
  let body: Blob;
  if (data instanceof Blob) {
    body = data;
  } else if (data instanceof ArrayBuffer) {
    body = new Blob([new Uint8Array(data)]);
  } else {
    // Uint8Array or other array-like: convert to number[] to avoid SharedArrayBuffer typing issues
    const arr = Array.from(data as Iterable<number>);
    body = new Blob([new Uint8Array(arr)]);
  }

  const res = await fetch(uploadUrl, {
    method: 'PUT',
    headers,
    body,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const error = new Error(
      `Failed to upload to presigned url: ${res.status} ${res.statusText} ${text}`
    );
    // attach status for callers who expect it
    (error as { status?: number }).status = res.status;
    throw error;
  }

  return true;
}

// High-level helper that performs init -> PUT -> complete and returns file_url
export async function uploadFileToServer(options: {
  file: Blob | ArrayBuffer | Uint8Array;
  filename: string;
  content_type?: string;
  purpose?: string;
}) {
  const init = await initUploadPresigned({
    filename: options.filename,
    content_type: options.content_type,
    purpose: options.purpose,
  });

  // If backend already returned final file_url, we can skip the PUT
  if (init.file_url) return init.file_url;

  await uploadToPresignedUrl(init.upload_url, options.file, options.content_type);

  const completed = await completeUpload(init.upload_id);
  if (!completed.success) throw new Error('Upload complete failed');
  return completed.file_url;
}

// React Query hooks
export function useInitUpload() {
  return useMutation({ mutationFn: initUploadPresigned });
}

export function useCompleteUpload() {
  return useMutation({ mutationFn: completeUpload });
}

export function useUploadFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      file,
      filename,
      content_type,
      purpose,
    }: {
      file: Blob | ArrayBuffer | Uint8Array;
      filename: string;
      content_type?: string;
      purpose?: string;
    }) => uploadFileToServer({ file, filename, content_type, purpose }),
    onSuccess: () => {
      // Invalidate generic uploads/list caches if they exist
      queryClient.invalidateQueries({ queryKey: ['uploads'] });
    },
  });
}

export default {
  initUploadPresigned,
  completeUpload,
  uploadToPresignedUrl,
  uploadFileToServer,
};
