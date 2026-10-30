const publicJsonCache = new Map<string, Promise<unknown>>();

/** Share one in-flight versioned static-artifact request between app surfaces. */
export function loadPublicJSON<T>(path: string, version: string): Promise<T> {
  const key = `${path}?v=${version}`;
  const hit = publicJsonCache.get(key);
  if (hit) return hit as Promise<T>;
  const pending = fetch(key).then((res) => {
    if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
    return res.json() as Promise<T>;
  }).catch((error: unknown) => {
    publicJsonCache.delete(key);
    throw error;
  });
  publicJsonCache.set(key, pending);
  return pending;
}
