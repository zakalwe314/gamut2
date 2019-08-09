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
            <v-list-item @click="setTest(i)" v-for="(set,i) of sets" :key="set">{{set}}<v-icon v-if="testData.name===set">mdi-check</v-icon></v-list-item>
          </v-list>
        </v-menu>

        <v-menu bottom right offset-y>
          <template v-slot:activator="{on}">
            <v-btn text v-on="on">Reference Data</v-btn>
          </template>
          <v-list>
            <v-list-item  @click="importRef">Import...</v-list-item>
            <v-divider></v-divider>
            <v-list-item @click="setRef(i)" v-for="(set,i) of sets" :key="set">{{set}}<v-icon v-if="refData.name===set">mdi-check</v-icon></v-list-item>
          </v-list>
        </v-menu>

        <v-menu bottom right offset-y :close-on-content-click="false">
          <template v-slot:activator="{on}">
            <v-btn text v-on="on">Display</v-btn>
          </template>
          <v-list dense>
            <v-list-item><b>Reference</b></v-list-item>
            <v-list-item @click="toggleShow(['ref','mesh'])">Mesh<v-icon v-if="refShow.mesh">mdi-check</v-icon></v-list-item>
            <v-list-item @click="toggleShow(['ref','wire'])">Wire<v-icon v-if="refShow.wire">mdi-check</v-icon></v-list-item>
            <v-divider></v-divider>
            <v-list-item><b>Test</b></v-list-item>
            <v-list-item @click="toggleShow(['test','mesh'])">Mesh<v-icon v-if="testShow.mesh">mdi-check</v-icon></v-list-item>
            <v-list-item @click="toggleShow(['test','wire'])">Wire<v-icon v-if="testShow.wire">mdi-check</v-icon></v-list-item>
            <v-divider></v-divider>
            <v-list-item><b>Intersection</b></v-list-item>
            <v-list-item @click="toggleShow(['inter','mesh'])">Mesh<v-icon v-if="interShow.mesh">mdi-check</v-icon></v-list-item>
            <v-list-item @click="toggleShow(['inter','wire'])">Wire<v-icon v-if="interShow.wire">mdi-check</v-icon></v-list-item>
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
      <div id="data">
        <table>
          <tr>
            <th></th>
            <th>File</th>
            <th>Volume</th>
            <th>Ratio</th>
          </tr>
          <tr>
            <td>Reference</td>
            <td>{{refData.name}}</td>
            <td>{{refGeo.vol.toFixed(0)}}</td>
            <td>-</td>
          </tr>
          <tr>
            <td>Test</td>
            <td>{{testData.name}}</td>
            <td>{{testGeo.vol.toFixed(0)}}</td>
            <td>{{(testGeo.vol/refGeo.vol).toFixed(3)}}</td>
          </tr>
          <tr>
            <td>Intersection</td>
            <td>-</td>
            <td>{{interGeo.vol.toFixed(0)}}</td>
            <td>{{(interGeo.vol/refGeo.vol).toFixed(3)}}</td>
          </tr>
        </table>
      </div>
    </v-content>
  </v-app>
</template>

<style scoped>
  canvas{
    width:100%;
    height:100%;
  }
  #data{
    position:absolute;
    padding:1em;
    top:0;
    left:0;
    color: #fff7;
  }
  #data td{
    padding: 0 0.5em;
  }
  #data td:nth-child(1){
    text-align: right;
    font-weight: bold;
  }
  #display{

  }
</style>

<style>
  html{
    height:100%;
    overflow: hidden !important;
  }
  * {
    padding:0;
    margin:0;
    box-sizing: border-box;
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
      ...mapGetters(['sets','refData','testData','testGeo','refGeo','interGeo','testShow','refShow','interShow'])
    },
    watch:{
      refGeo(){this.updateScene()},
      testGeo(){this.updateScene()},
      refShow(){this.updateScene()},
      testShow(){this.updateScene()},
      interShow(){this.updateScene()},
    },
    methods:{
      ...mapMutations(['setTest','setRef','import','toggleShow']),
      animate(){
        requestAnimationFrame( this.animate );
        controls.update();
        renderer.render( scene, camera );
      },
      updateScene(){
        scene = new THREE.Scene();
        if(this.testGeo) {
          for(let key of Object.keys(this.testShow)){
            if (this.testShow[key]) scene.add(this.testGeo[key]);
          }
        }
        if(this.refGeo) {
          for(let key of Object.keys(this.refShow)){
            if (this.refShow[key]) scene.add(this.refGeo[key]);
          }
        }
        if(this.interGeo) {
          for(let key of Object.keys(this.interShow)){
            if (this.interShow[key]) scene.add(this.interGeo[key]);
          }
        }
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
      },
      async importTest(){
        await this.load();
        this.setTest();
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

</script>
