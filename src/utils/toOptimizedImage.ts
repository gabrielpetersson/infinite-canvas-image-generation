// for gc and I don't wanna worry about reredering//
const cache: Record<string, string> = {};

export const toOptimizedImage = (url: string) => {
  if (url in cache) {
    return cache[url];
  }
  const optimized = `${url}-/format/auto/`;
  cache[url] = optimized;
  return optimized;
};
