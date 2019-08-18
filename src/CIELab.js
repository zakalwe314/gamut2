export function labF(v) {
  return v <= 0.008856 ? v * 7.787 + 16 / 116 : Math.pow(v, 1 / 3);
}

export function xyz2lab(a){
  const fy=labF(a[1]);
  return [116*fy-16, 500*(labF(a[0])-fy), 200*(fy-labF(a[2]))];
}