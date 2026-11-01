/** Keeps `value` within [`lower`, `upper`], both inclusive; assumes `lower <= upper` */
export function clamp(value: i32, lower: i32, upper: i32): i32 {
  return min<i32>(max<i32>(value, lower), upper);
}
