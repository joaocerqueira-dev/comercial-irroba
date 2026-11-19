export const PREVIEW_STATUS = {
  processing: "processing",
  ready: "ready",
  error: "error",
} as const;
export type PreviewStatus = (typeof PREVIEW_STATUS)[keyof typeof PREVIEW_STATUS];
