import Vue from 'vue'
import Vuex from 'vuex'

Vue.use(Vuex);

const refs = {
  rec2020: require('./rec2020.json')
};

const state = {
  dataSets:Object.keys(refs).map(k=>refData2dataSet(refs[k],k)),
  refData:0,
  testData:0,
};

const mutations = {

};

const actions = {

};

const getters = {
  refData:state=>state.dataSets[state.refData],
  testData:state=>state.dataSets[state.testData],
  sets:state=>state.dataSets.map(ds=>ds.name),
};

export default new Vuex.Store({
  state,
  mutations,
  actions,
  getters,
})

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
  const primaries = refData.primaries.sort((a,b)=>a[0]!==b[0]?a[0]-b[0]: a[1]!==b[1]?a[1]-b[1] : a[2]-b[2]);
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
