<template>
  <Renderer ref="renderer" antialias :orbit-ctrl="{ enableDamping: true }" resize="window">
    <Camera :position="{ z: 10 }" />
    <Scene>
      <PointLight :position="{ y: 50, z: 50 }" />
      <PointLight :position="{ y: -100000, z: -5000 }" />
      <Box ref="box" :rotation="{ y: Math.PI / 4, z: Math.PI / 4 }">
        <LambertMaterial />
      </Box>
    </Scene>
  </Renderer>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { Box, Camera, LambertMaterial, MeshPublicInterface, PointLight, Renderer, RendererPublicInterface, Scene } from 'troisjs'

export default defineComponent({
  components: { Box, Camera, LambertMaterial, PointLight, Renderer, Scene },
  mounted() {
    const renderer = this.$refs.renderer as RendererPublicInterface
    const box = this.$refs.box as MeshPublicInterface
    if (renderer && box) {
      renderer.onBeforeRender(() => {
        box.mesh.rotation.x += 0.07
        box.mesh.rotation.y += 0.07
      })
    }
  },
})
</script>

<style>
body, html {
  margin: 0;
}
canvas {
  display: block;
}
</style>
