function XYZ2LMS([X,Y,Z]){
  return [
    +0.8951*X+0.2664*Y-0.1614*Z,
    -0.7502*X+1.7135*Y+0.0367*Z,
    +0.0389*X-0.0685*Y+1.0296*Z
  ]
}

function LMS2XYZ([L,M,S]){
  return [
    +0.9869929*L-0.1470543*M+0.1599627*S,
    +0.4323053*L+0.5183603*M+0.0492912*S,
    -0.0085287*L+0.0400428*M+0.9684867*S
  ]
}

export default function bradfordCA(XYZ, fromXyz, toXyz){
  const fromLMS = XYZ2LMS(fromXyz);
  const toLMS = XYZ2LMS(toXyz);
  const rL=toLMS[0]/fromLMS[0], rM=toLMS[1]/fromLMS[1],rS=toLMS[2]/fromLMS[2];
  return XYZ.map(XYZ2LMS).map(([L,M,S])=>[rL*L,rM*M,rS*S]).map(LMS2XYZ);
}