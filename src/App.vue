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
      ...mapGetters(['sets','refData','testData','testMesh','refWireFrame'])
    },
    watch:{
      refWireFrame(){this.updateScene()},
      testMesh(){this.updateScene()},
    },
    methods:{
      ...mapMutations(['setTest','setRef','import']),
      animate(){
        requestAnimationFrame( this.animate );
        controls.update();
        renderer.render( scene, camera );
      },
      updateScene(){
        scene = new THREE.Scene();
        scene.add(this.testMesh);
        scene.add(this.refWireFrame);
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
