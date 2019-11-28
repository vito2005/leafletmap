<template>
  <div id="app">
      <div class="font-awesome"><i class="fa fa-lock"></i></div>
      <leaflet-map
            :trackData="points"
    ></leaflet-map>
  </div>
</template>

<script>
import LeafletMap from "@/components/LeafletMap/LeafletMap.vue";
import {getAllCoordinates} from '@/api/index';
export default {
  name: 'app',
  components: {
    LeafletMap
  },
  data(){
    return {
      points: null,
    }
  },
  async created() {
    window.main = this;
    const {data} = await this.getAllPoints();
    this.points = data;
  },
  mounted(){
  },
  methods: {
    getAllPoints() {
      return  getAllCoordinates();
    }
  }
}
</script>

<style>
  @import '~@fortawesome/fontawesome-free/css/fontawesome.min.css';

</style>
