<template>
  <input type="file" @change="doLoad">
</template>

<script>
  /**
   * once a file has been read the loaded event will be emitted.
   *
   * Use like this:
   *
   * <text-file-loader ref="loader" accept=".txt" @loaded="do something"/>
   *
   * this.$refs.loader.click()
   */
  export default {
    props:{
      accept:String
    },
    methods:{
      doLoad(){
        const reader = new FileReader();
        reader.onload = ()=>{
          this.$emit('loaded', {name: this.$el.files[0].name ,data:reader.result})
        };
        reader.readAsText(this.$el.files[0]);
      }
    }
  }
</script>

<style scoped>
  *{display:none}
</style>