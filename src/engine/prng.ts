/**
 * Seedable Pseudorandom Number Generator (Mulberry32)
 * Ensures 100% reproducible melody generation across identical seeds.
 */

export class PRNG {
  private state: number;

  constructor(seed: number = 1337) {
    this.state = seed ? Math.floor(Math.abs(seed)) : 1337;
    if (this.state === 0) this.state = 1337;
  }

  // Returns float in [0, 1)
  next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  // Returns integer in [min, max] inclusive
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  // Pick random element from array
  choice<T>(array: readonly T[] | T[]): T {
    const idx = Math.floor(this.next() * array.length);
    return array[idx];
  }

  // Weighted choice
  weightedChoice<T>(options: { item: T; weight: number }[]): T {
    const totalWeight = options.reduce((sum, opt) => sum + Math.max(0, opt.weight), 0);
    if (totalWeight <= 0) return options[0].item;

    let rand = this.next() * totalWeight;
    for (const opt of options) {
      if (rand < opt.weight) return opt.item;
      rand -= opt.weight;
    }
    return options[options.length - 1].item;
  }

  // Shuffle array copy deterministically
  shuffle<T>(array: T[]): T[] {
    const copy = [...array];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }
}
