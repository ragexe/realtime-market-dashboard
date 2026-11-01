/** Book quantity: small lots are frequent, large ones are rare (cubic skew). Defaults: `min: 100`, `max: 10000` */
export function randomLot(roll: f64, min: i32 = 100, max: i32 = 1e4): i32 {
  return min + ((roll * roll * roll * ((max - min) as f64)) as i32);
}
