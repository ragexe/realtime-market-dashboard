/** Pseudo-Random Number Generator based on the Xoshiro128+ algorithm */
export class Xoshiro128Plus {
  // Internal state of the generator (4 variables, 32 bits each)
  private s0: u32 = 0x12345678;
  private s1: u32 = 0x36243606;
  private s2: u32 = 0x52128862;
  private s3: u32 = 0x88675123;

  // Initialize state with a seed. Avoids the state where all 4 variables are zeroes.
  public init(seed: u32): void {
    this.s0 = seed ^ 0x9e3779b9;
    this.s1 = (seed << 13) | 0x36243606;
    this.s2 = (seed >> 9) ^ 0x52128862;
    this.s3 = (seed << 5) | 0x88675123;
  }

  // Core generator: returns an unsigned 32-bit integer [0, 4294967295]
  public nextU32(): u32 {
    const result = this.s0 + this.s3;
    const t = this.s1 << 9;

    this.s2 ^= this.s0;
    this.s3 ^= this.s1;
    this.s1 ^= this.s2;
    this.s0 ^= this.s3;

    this.s2 ^= t;
    this.s3 = rotl<u32>(this.s3, 11);

    return result;
  }

  /** Returns a floating-point number between 0.0 (inclusive) and 1.0 (exclusive) */
  public nextF64(): f64 {
    return (this.nextU32() as f64) / 4294967296.0;
  }

  /** Returns a floating-point number within a specified range [min, max] */
  public nextRange(min: f64, max: f64): f64 {
    return min + this.nextF64() * (max - min);
  }

  /** Random integer in [min, max], both inclusive */
  public nextInt(min: i32, max: i32): i32 {
    return min + ((this.nextU32() % ((max - min + 1) as u32)) as i32);
  }
}
