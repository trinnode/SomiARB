export const pseudoRandom = (seed: number, offset: number = 0): number => {
  const x = Math.sin(seed * 12.9898 + offset * 78.233) * 43758.5453;
  return x - Math.floor(x);
};
