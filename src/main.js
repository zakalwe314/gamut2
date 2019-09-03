import Vue from 'vue'
import App from './App.vue'
// import router from './router'
import store from './store'
import vuetify from './plugins/vuetify';
import './OrbitControls';

Vue.config.productionTip = false

new Vue({
  // router,
  store,
  vuetify,
  render: h => h(App)
}).$mount('#app')


/**
 * Some thought regarding a final, more complete, app structure.
 *
 * Vue components:
 * A gamut scene
 * A gamut surface
 * A gamut wireframe
 * A file loader
 * App containing a gamut scene and the menus
 *
 * Vuex store:
 * A list of gamuts
 * The selections of which are processed.
 *
 * Class:
 * Gamut
 *    constructor(array data)
 *    constructor({TRI,Lab})
 *    error: string or null
 *    TRI, RGB, XYZ, Lab
 *    intersectWith(ref):gamut
 *
 **/