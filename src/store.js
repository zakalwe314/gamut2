import Vue from 'vue';
import Vuex from 'vuex';
import qh from "convex-hull";

Vue.use(Vuex);

const refs = {
  rec2020: require('./rec2020.json')
};

const state = {
  dataSets:Object.keys(refs).map(k=>refData2dataSet(refs[k],k)),
  refData:0,
  testData:0,
  refGeo:null,
  testGeo:null,
  interGeo:null,
  refShow:{mesh:false, wire:true},
  testShow:{mesh:true, wire:false},
  interShow:{mesh:false, wire:false},
};
state.refGeo = makeWireFrame(makeCIELabMesh(state.dataSets[state.refData]));
state.testGeo = makeWireFrame(makeCIELabMesh(state.dataSets[state.testData]));
state.interGeo = makeWireFrame(makeInterGeo(state.refGeo, state.testGeo));

const mutations = {
  import(state, {data,name}){
    const ds=readData(data,name);
    state.dataSets = [...state.dataSets, ds];
  },
  setRef(state, idx){
    if (typeof state.dataSets[idx] === "undefined") idx = state.dataSets.length-1;
    if (state.refData !== idx){
      state.refData = idx;
      state.refGeo = makeWireFrame(makeCIELabMesh(state.dataSets[idx]));
      state.interGeo = makeWireFrame(makeInterGeo(state.refGeo, state.testGeo));
    }
  },
  setTest(state, idx){
    if (typeof state.dataSets[idx] === "undefined") idx = state.dataSets.length-1;
    if (state.testData !== idx){
      state.testData = idx;
      state.testGeo = makeWireFrame(makeCIELabMesh(state.dataSets[idx]));
      state.interGeo = makeWireFrame(makeInterGeo(state.refGeo, state.testGeo));
    }
  },
  toggleShow(state,[set,field]){
	  switch(set){
		  case "ref":
			state.refShow = Object.assign({},state.refShow, {[field]:!state.refShow[field]});
		  break;
      case "test":
        state.testShow = Object.assign({},state.testShow, {[field]:!state.testShow[field]});
        break;
      case "inter":
        state.interShow = Object.assign({},state.interShow, {[field]:!state.interShow[field]});
        break;
	  }
  }
};

const actions = {

};

const getters = {
  refData:state=>state.dataSets[state.refData],
  testData:state=>state.dataSets[state.testData],
  refGeo:state=>state.refGeo,
  testGeo:state=>state.testGeo,
  interGeo:state=>state.interGeo,
  sets:state=>state.dataSets.map(ds=>ds.name),
  refShow:state=>state.refShow,
  testShow:state=>state.testShow,
  interShow:state=>state.interShow,
};

export default new Vuex.Store({
  state,
  mutations,
  actions,
  getters,
})

function readData(s,name) {
  const validData = /^\s*\d+(\s+\d+){3}(\s+\d*.?\d+){3}\s*$/;
  const array = s
    .split('\n')
    .filter(l => validData.test(l))
    .map(l => l
      .split(/\s+/)
      .map(Number.parseFloat)
    );
  //first get a list of unique greyscale values
  const ugs=new Set();
  for(let a of array) for(let i=1;i<4;i++) ugs.add(a[i]);
  const gs=[...ugs].sort((a,b)=>a-b);
  //then build a map to find xyz values from the rgb
  const map = new Map();
  const sp=gs[gs.length-1]+1;
  for(let a of array){
    map.set((a[1]*sp+a[2])*sp+a[3],a.slice(4));
  }
  //get the required tesselation
  const {RGB,TRI} = makeTesselation(gs);
  //then use the map to build the xyz array
  const XYZ = RGB.map(rgb=>map.get((rgb[0]*sp+rgb[1])*sp+rgb[2]));
  return {RGB, XYZ, TRI, name};
}

function refData2dataSet(refData,name){
  function mixrgb(rgb1,rgb2,lin){
    return [
      rgb1[0]*(1-lin)+rgb2[0]*lin,
      rgb1[1]*(1-lin)+rgb2[1]*lin,
      rgb1[2]*(1-lin)+rgb2[2]*lin,
    ]
  }
  const gs=refData.GS.sort((a,b)=>a-b),mx=gs[gs.length-1],mn=gs[0];
  const gs2lin=v=>Math.pow((v-mn)/(mx-mn),refData.gamma);
  const {RGB,TRI} = makeTesselation(gs);
  //First get the primaries in order 0K 1B 2G 3C 4R 5M 6Y 7W
  const primaries = refData.primaries.sort(tripleCompare);
  //Now for each RGB value get the XYZ from the supplied primaries
  const XYZ = RGB.map(function(rgb){
    const lr=gs2lin(rgb[0]),lg=gs2lin(rgb[1]),lb=gs2lin(rgb[2]);
    const pr=[];
    for(let n=0;n<4;n++) pr.push(mixrgb(primaries[n].slice(3),primaries[n+4].slice(3),lr));
    for(let n=0;n<2;n++) pr.push(mixrgb(pr[n],pr[n+2],lg));
    return mixrgb(pr[4],pr[5],lb);
  });
  return {RGB, XYZ, TRI, name};
}

function makeTesselation(gs){
  const n=gs.length-1;
  const mx=gs[n], mn=gs[0];
  const faces = [
    [mn,0,1,2],
    [mn,2,0,1],
    [mn,1,2,0],
    [mx,0,2,1],
    [mx,1,0,2],
    [mx,2,1,0],
  ];
  const TRI=[],RGB=[];
  for (let face of faces){
    const st=RGB.length;
    for(let q=0;q<=n;q++){
      for(let p=0;p<=n;p++){
        const rgb=[0,0,0];
        rgb[face[1]]=face[0];
        rgb[face[2]]=gs[q];
        rgb[face[3]]=gs[p];
        RGB.push(rgb);
      }
    }
    for(let q=0;q<n;q++){
      for(let p=0;p<n;p++){
        const m=st + (n+1)*q + p;
        TRI.push(
          [m,m+n+1,m+1],
          [m+n+1,m+n+2,m+1],
        )
      }
    }
  }
  return {TRI,RGB};
}

function volume(Lab, TRI){
  let vol=0;
  for(let tri of TRI){
    const a=Lab[tri[0]], b=Lab[tri[1]], c=Lab[tri[2]];
    const v1=[b[0]-c[0],b[1]-c[1],b[2]-c[2]];
    const v2=[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
    vol += (a[0]*(v1[1]*v2[2]-v1[2]*v2[1])
          + a[1]*(v1[2]*v2[0]-v1[0]*v2[2])
          + a[2]*(v1[0]*v2[1]-v1[1]*v2[0]))/6;
  }
  return vol;
}

const tripleCompare = (a,b) => a[0]!==b[0]?a[0]-b[0]: a[1]!==b[1]?a[1]-b[1] : a[2]-b[2];



function unique(arr,tol){
  const tol2=tol*tol;
  arr=arr.slice().sort(tripleCompare);
  for(let n=arr.length-1;n>0;--n){
    let i=0,d=arr[n][0]-arr[n-1][0],t=d*d;
    if (t>=tol2) continue;
    d=arr[n][1]-arr[n-1][1];t+=d*d;
    if (t>=tol2) continue;
    d=arr[n][2]-arr[n-1][2];t+=d*d;
    if (t<tol2) arr.splice(n,1);
  }
  return arr;
}

function intersection(BLA1, BLA2){
  BLA1=unique(BLA1,0.01);
  BLA2=unique(BLA2,0.01);
  let shiftL=0;
  function shift([b, L, a]) {
    L-=50;
    const s = 1+shiftL/Math.sqrt(b * b + L * L + a * a);
    // const s = Math.pow(b * b + L * L + a * a,-0.46875)
    return [b * s, L * s + 50, a * s];
  }

  function unshift([b, L, a]) {
    L-=50;
    const s = 1-shiftL/Math.sqrt(b * b + L * L + a * a);
    return [b * s, L * s + 50, a * s];
  }
  let convex=false;
  let BLA1s,BLA2s,TRI1,TRI2;
  while(!convex) {
    BLA1s = BLA1.map(shift);
    BLA2s = BLA2.map(shift);
    TRI1 = qh(BLA1s);
    TRI2 = qh(BLA2s);
    const ut1=new Set(TRI1.flat());
    const ut2=new Set(TRI2.flat());

    convex = ut1.size === BLA1.length && ut2.size===BLA2.length;
    // console.log(shiftL, convex,ut1.size, ut2.size, BLA1.length);
    if (!convex) shiftL+=100+shiftL;
    if (shiftL>1000000) throw new Error('Could not make the surfaces concave');
  }
  const norms1 = getNorms(BLA1s,TRI1);
  const norms2 = getNorms(BLA2s,TRI2);
  console.log(BLA1s.filter(bla=>isInside(bla,norms1)).length);
  const BLAs = unique([...BLA1s.filter(bla=>isInside(bla,norms2)),...BLA2s.filter(bla=>isInside(bla,norms1))],0.01);
  console.log(BLAs.length);
  const TRI = qh(BLAs).map(a=>[a[1],a[0],a[2]]);
  const BLA = BLAs.map(unshift);
  return {BLA,TRI};
}

function getNorms(LAB, TRI){
  return TRI.map(tri=>{
    const a=LAB[tri[0]], b=LAB[tri[1]], c=LAB[tri[2]];
    const v1=[b[0]-c[0],b[1]-c[1],b[2]-c[2]];
    const v2=[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
    const norm = [v1[1]*v2[2]-v1[2]*v2[1],v1[2]*v2[0]-v1[0]*v2[2],v1[0]*v2[1]-v1[1]*v2[0],0];
    const l=Math.sqrt(norm[0]*norm[0]+norm[1]*norm[1]+norm[2]*norm[2]);
    norm[0]/=l;
    norm[1]/=l;
    norm[2]/=l;
    norm[3]=b[0]*norm[0]+b[1]*norm[1]+b[2]*norm[2];
    return norm;
  })
}

function isInside(pt,norms){
  return norms.every(norm=>pt[0]*norm[0]+pt[1]*norm[1]+pt[2]*norm[2]>=1.0001*norm[3]);
}

function makeInterGeo(geo1,geo2){
  const {BLA:bla,TRI} = intersection(geo1.bla,geo2.bla);

  const geometry = new THREE.Geometry();
  for (let i = 0; i < bla.length; i += 1) {
    geometry.vertices.push(new THREE.Vector3().fromArray(bla[i]));
    //geometry.vertexColors.push(new THREE.Color(cols[i]));
  }
  let normal;
  for (let i = 0; i < TRI.length; i += 1) {
    const a = new THREE.Vector3().fromArray(bla[TRI[i][0]]);
    const b = new THREE.Vector3().fromArray(bla[TRI[i][1]]);
    const c = new THREE.Vector3().fromArray(bla[TRI[i][2]]);
    normal  = new THREE.Vector3()
      .crossVectors(
        new THREE.Vector3().subVectors(c, a),
        new THREE.Vector3().subVectors(b, a),
      )
      .normalize();
    geometry.faces.push(
      new THREE.Face3(TRI[i][0], TRI[i][2], TRI[i][1], normal, [new THREE.Color(0x777777),new THREE.Color(0x777777),new THREE.Color(0x777777)])
    );
  }

  return {
    mesh:new THREE.Mesh(
      geometry,
      new THREE.MeshBasicMaterial( { vertexColors:THREE.VertexColors })
    ),
    vol:volume(bla,TRI),
    bla,
    TRI
  };

}

function makeCIELabMesh(s){
  const {RGB, XYZ, TRI} = s;
  const cols = RGB.map(c => (c[0]<<16) + (c[1]<<8) + c[2]);
  const offset = sumArrays(RGB).map(v=>-v/RGB.length);
  const points = offsetArrays(RGB,offset).map(p=>unitVector(p));

  const max = maxArray(XYZ, a=>a[1]);
  const bla = normArrays(XYZ,max).map(xyz2lab).map(p=>[p[2],p[0],p[1],]);

  const geometry = new THREE.Geometry();
  for (let i = 0; i < points.length; i += 1) {
    geometry.vertices.push(new THREE.Vector3().fromArray(bla[i]));
    //geometry.vertexColors.push(new THREE.Color(cols[i]));
  }
  let normal;
  for (let i = 0; i < TRI.length; i += 1) {
    const a = new THREE.Vector3().fromArray(bla[TRI[i][0]]);
    const b = new THREE.Vector3().fromArray(bla[TRI[i][1]]);
    const c = new THREE.Vector3().fromArray(bla[TRI[i][2]]);
    normal  = new THREE.Vector3()
      .crossVectors(
        new THREE.Vector3().subVectors(c, a),
        new THREE.Vector3().subVectors(b, a),
      )
      .normalize();
    geometry.faces.push(
      new THREE.Face3(TRI[i][0], TRI[i][2], TRI[i][1], normal, [new THREE.Color(cols[TRI[i][0]]),new THREE.Color(cols[TRI[i][2]]),new THREE.Color(cols[TRI[i][1]])])
    );
  }

  return {
    mesh:new THREE.Mesh(
      geometry,
      new THREE.MeshBasicMaterial( { vertexColors:THREE.VertexColors })
    ),
    vol:volume(bla,TRI),
    bla,
    TRI
  };
}
function labF(v) {
  return v <= 0.008856 ? v * 7.787 + 16 / 116 : Math.pow(v, 1 / 3);
}
function xyz2lab(a){
  const fy=labF(a[1]);
  return [116*fy-16, 500*(labF(a[0])-fy), 200*(fy-labF(a[2]))];
}
function sumArrays(d){
  return d.reduce((a,b)=>a?a.map((v,i)=>v+b[i]):b);
}

function offsetArrays(d,o){
  return d.map(a=>a.map((v,i)=>v+o[i]));
}

function mag(a){
  return Math.sqrt(a.reduce((t,v)=>t+v*v,0));
}

function unitVector(a){
  const d=mag(a);
  return a.map(v=>v/d);
}

function maxArray(a,fn){
  return a.reduce((m,dat)=>{
    const r={val:fn(dat),dat};
    return m && m.val>=r.val ? m : r;
  },null).dat;
}
function normArrays(d,n){
  return d.map(a=>a.map((v,i)=>v/n[i]));
}
function makeWireFrame({mesh,vol,bla,TRI}){
  const wire                = new THREE.WireframeHelper(mesh);
  wire.material.depthTest   = false;
  wire.material.opacity     = 0.25;
  wire.material.transparent = true;
  return {wire,mesh,vol,bla,TRI};
}