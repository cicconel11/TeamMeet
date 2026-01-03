import type { AlumniBucket } from "@/types/database";

export const ALUMNI_LIMITS: Record<AlumniBucket, number | null> = {
  none: 0,
  "0-200": 200,
  "201-600": 600,
  "601-1500": 1500,
  "1500+": null,
};

export function getAlumniLimit(bucket: AlumniBucket | null | undefined) {
  if (!bucket || !(bucket in ALUMNI_LIMITS)) return 0;
  return ALUMNI_LIMITS[bucket];
}

export function normalizeBucket(bucket: string | null | undefined): AlumniBucket {
  const allowed: AlumniBucket[] = ["none", "0-200", "201-600", "601-1500", "1500+"];
  return allowed.includes(bucket as AlumniBucket) ? (bucket as AlumniBucket) : "none";
}
