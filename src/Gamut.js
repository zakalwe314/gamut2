import {makeTesselation} from "./iecTesselation";
import * as Matrix from "t-matrix";
Matrix.mixin(Matrix);

export default function create(data){

}

export function createFromMatrix(mRGB,mXYZ){
  const uGs=Matrix.from([...new Set(mRGB)].sort());
}

export function createFromRGBXYZ(array,
                         toRGB=a=>a.slice(1,4),
                         toXYZ=a=>a.slice(4,7)){
   const uGs=unique(array.map(toRGB));
   const nGs=uGs.length;
   const gsLookup = new Map(uGs.map((gs,i)=>[i,gs]));
   const getIndex=(rgb)=>gsLookup.get(rgb[3])
     +nGs*(gsLookup.get(rgb[2])
       +nGs*gsLookup.get(rgb[1]));
   const xyzLookup = new Map(array.map(a=>[
     getIndex(toRGB(a)),
     toXYZ(a)
   ]));
   const {RGB,TRI} = makeTesselation(uGs);
   const XYZ = RGB.map(rgb=>xyzLookup.get(getIndex(rgb)));
   return new Gamut(RGB, XYZ, TRI);
}
export class Gamut{
  constructor(data){

  }
}


function unique(arr){
  return [...new Set(flatten(arr))].sort();
}

function *flatten(a){
  if (a instanceof Array) for(let b of a) yield* flatten(b);
  else yield a;
}