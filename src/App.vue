<template xmlns:v-slot="http://www.w3.org/1999/XSL/Transform">
  <v-app>
    <input type="file" style="display:none" ref="file">
    <v-app-bar app dense>
      <v-toolbar-items>

        <v-menu bottom right offset-y>
          <template v-slot:activator="{on}">
            <v-btn text v-on="on">Test Data</v-btn>
          </template>
          <v-list>
            <v-list-item @click="importTest">Import...</v-list-item>
            <v-divider></v-divider>
            <v-list-item @click="" v-for="set of sets" :key="set">{{set}}<v-icon v-if="testData.name===set">mdi-check</v-icon></v-list-item>
          </v-list>
        </v-menu>

        <v-menu bottom right offset-y>
          <template v-slot:activator="{on}">
            <v-btn text v-on="on">Reference Data</v-btn>
          </template>
          <v-list>
            <v-list-item  @click="importRef">Import...</v-list-item>
            <v-divider></v-divider>
            <v-list-item @click="" v-for="set of sets" :key="set">{{set}}<v-icon v-if="refData.name===set">mdi-check</v-icon></v-list-item>
          </v-list>
        </v-menu>

      </v-toolbar-items>
      <v-spacer></v-spacer>
      <v-toolbar-title class="headline text-uppercase">
        <span>Gamut 2</span>
      </v-toolbar-title>
    </v-app-bar>

    <v-content>
      <canvas ref="canvas"></canvas>
    </v-content>
  </v-app>
</template>

<style scoped>
  canvas{
    width:100%;
    height:100%;
  }
</style>

<script>
  let scene, canvas, camera, controls, renderer;


  import {mapGetters, mapActions, mapMutations} from 'vuex';
  export default {
    name: 'App',
    data: () => ({
    }),
    computed:{
      ...mapGetters(['sets','refData','testData'])
    },
    methods:{
      ...mapMutations(['setTest','setRef','import']),
      animate(){
        requestAnimationFrame( this.animate );
        controls.update();
        renderer.render( scene, camera );
      },
      updateScene(){
        const mesh = makeCIELabMesh(this.testData);
        const wire = makeWireFrame(makeCIELabMesh(this.refData));
        scene = new THREE.Scene();
        scene.add(mesh);
        scene.add(wire);
      },
      load(){
        return new Promise(res=>{
          this.$refs.file.onchange = ()=>{
            const reader = new FileReader();
            reader.onload = ()=>{
              this.import({data:reader.result, name:this.$refs.file.files[0].name});
              res();
            };
            reader.readAsText(this.$refs.file.files[0]);
          };
          this.$refs.file.click();
        });
      },
      async importRef(){
        await this.load();
        this.setRef();
        this.updateScene();
      },
      async importTest(){
        await this.load();
        this.setTest();
        this.updateScene();
      }
    },
    mounted(){
      canvas = this.$refs.canvas;
      camera = makeCamera();
      controls = new THREE.OrbitControls(camera, canvas);
      renderer = new THREE.WebGLRenderer({canvas});
      renderer.setSize( window.innerWidth, window.innerHeight );
      this.updateScene();
      this.animate();

      window.addEventListener( 'resize', onWindowResize, false );

      function onWindowResize(){
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();

        renderer.setSize( window.innerWidth, window.innerHeight );
      }
    }
  };


  function makeWireFrame(mesh){
    const helper                = new THREE.WireframeHelper(mesh);
    helper.material.depthTest   = false;
    helper.material.opacity     = 0.25;
    helper.material.transparent = true;
    return helper;
  }
  function makeCamera(){
    let camera,
      width = window.innerWidth,
      height = window.innerHeight,
      fov, ratio, near, far;

    // origin camera
    fov = 22.5;
    ratio = width / height;
    near = 1;
    far = 1000;
    camera = new THREE.OrthographicCamera(
      -width / 4, width / 4, height / 4, height / -4, near, far
    );
    camera.position.set(200, 300, 200);
    camera.lookAt(new THREE.Vector3(0, 50, 0));
    return camera;
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
          new THREE.Vector3().subVectors(b, a),
          new THREE.Vector3().subVectors(c, a)
        )
        .normalize();
      geometry.faces.push(
        new THREE.Face3(TRI[i][0], TRI[i][1], TRI[i][2], normal, [new THREE.Color(cols[TRI[i][0]]),new THREE.Color(cols[TRI[i][1]]),new THREE.Color(cols[TRI[i][2]])])
      );
    }

    return new THREE.Mesh(
      geometry,
      new THREE.MeshBasicMaterial( { vertexColors:THREE.VertexColors })
    );
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

</script>
