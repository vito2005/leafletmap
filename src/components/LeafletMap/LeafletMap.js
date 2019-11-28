import Vue from 'vue';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css'
import * as countriesConvertor from 'i18n-iso-countries';
import 'mapbox-gl-leaflet';
import 'mapbox-gl/src/css/mapbox-gl.css';
import moment from 'moment';

// BUG https://github.com/Leaflet/Leaflet/issues/4968
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';


// Track pin's
import pinGreen from '@/assets/images/pin-green.svg';
import pinOrange from '@/assets/images/pin-orange.svg';
import pinRed from '@/assets/images/pin-red.svg';
import latchInstalled from '@/assets/images/latch_installed.svg';
import latchExtracted from '@/assets/images/latch_extracted.svg';
import latchInstalledYellow from '@/assets/images/latch_installed_yellow.svg';
import latchExtractedYellow from '@/assets/images/latch_extracted_yellow.svg';
import latchInstalledRed from '@/assets/images/latch_installed_red.svg';
import latchExtractedRed from '@/assets/images/latch_extracted_red.svg';

// ZNU pin's
import pin from '@/assets/images/pin.png';
import autotrack from '@/assets/images/order-type-autotrack.png';
import container from '@/assets/images/order-type-container.png';
import covered_wagon from '@/assets/images/order-type-covered_wagon.png';
import main_vehicle from '@/assets/images/order-type-main_vehicle.png';
import semi_wagon from '@/assets/images/order-type-semi_wagon.png';
import tank from '@/assets/images/order-type-tank.png';
import tractor from '@/assets/images/order-type-tractor.png';
import trailer_semi_trailer from '@/assets/images/order-type-trailer_semi_trailer.png';

L.Canvas.include({
    _updateMarker6Point: function (layer) {
        if (!this._drawing || layer._empty()) { return; }

        var p = layer._point,
            ctx = this._ctx,
            r = Math.max(Math.round(layer._radius), 1);
        this._drawnLayers = {};
        this._drawnLayers[layer._leaflet_id] = layer;

        function roundedRect(ctx,x,y,width,height,radius){
            ctx.beginPath();
            ctx.moveTo(x,y+radius);
            ctx.lineTo(x,y+height-radius);
            ctx.quadraticCurveTo(x,y+height,x+radius,y+height);
            ctx.lineTo(x+width-radius,y+height);
            ctx.quadraticCurveTo(x+width,y+height,x+width,y+height-radius);
            ctx.lineTo(x+width,y+radius);
            ctx.quadraticCurveTo(x+width,y,x+width-radius,y);
            ctx.lineTo(x+radius,y);
            ctx.quadraticCurveTo(x,y,x,y+radius);
            ctx.stroke();
            ctx.fillStyle = 'white';
            ctx.fill();
        }
        ctx.fillStyle = '#27AE60';
        ctx.beginPath();
        ctx.strokeStyle = 'white';
        ctx.arc(p.x + 3,p.y+7,11,0,4*Math.PI, true);
        ctx.lineWidth = 2;
        ctx.fill();
        ctx.stroke();

        roundedRect(ctx,p.x - 3,p.y + 4,12,9,4);
        ctx.fillStyle = '#27AE60';
        ctx.strokeStyle = '#27AE60';
        ctx.beginPath();
        ctx.arc(p.x + 3,p.y + 9,0.5,0,2*Math.PI);
        ctx.fill();
        ctx.stroke();
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.strokeStyle = 'white';
        ctx.arc(Math.round(p.x) + 3,Math.round(p.y) + 3,3,0,Math.PI, true);
        ctx.scale(0.3, 0.3);
        ctx.stroke();
        this._fillStroke(ctx, layer);
    }
});

export default {

    name: 'LeafletMap',
    props: [
        'contolPointsData',
        'selectedOrderId',
        'isViolation',
        'orderId',
        'popupContent',
        'trackData',
        'vehicles',
        'severalTracksData',
    ],
    components: {
    },
    data() {
        return {
            pins: {
                green: pinGreen,
                orange: pinOrange,
                red: pinRed,
                latch_installed: latchInstalled,
                latch_extracted: latchExtracted,
                latch_installed_yellow: latchInstalledYellow,
                latch_extracted_yellow: latchExtractedYellow,
                latch_installed_red: latchInstalledRed,
                latch_extracted_red: latchExtractedRed,
            },
            iconsByType: {
                autotrack,
                container,
                covered_wagon,
                main_vehicle,
                semi_wagon,
                tank,
                tractor,
                trailer_semi_trailer,
            },
            center: null,
            clickedCircle: null,
            dangerPoints: [],
            pixiLayer: null,
            currentPopup: null,
            url: 'http://{s}.tile.osm.org/{z}/{x}/{y}.png',
            zoom: 6,
            bounds: null,
            mapInstance: null,
            markers: [],
            normalPoints: [],
            polyLines: [],
            controlPoints: [],
            standartBounds: null,
            zoomForAllTrack: 12,
            map: null,
            eventCodes: ['latch_extracted', 'latch_installed'],
        };
    },
    async created() {
        this.fixBug();
        window.cmpLeaflet = this;
    },
    mounted() {
        this.renderMap();
    },
    watch: {
        vehicles(value) {
            if (value && value.length > 0) {
                this.removeCircleMarkers();
                this.removeMarkers(value);
                this.removePolyLines();
                this.removeControlPoints();
                this.removePopupLayer();
                if (value.length > 1) {
                    this.standartBounds = L.latLngBounds(value.map(vehicle => ({
                        lat: vehicle.telemetry.coordinate.lat,
                        lng: vehicle.telemetry.coordinate.lon,
                    })));
                }
                this.addMarkers(value);
                this.fitAllMarkers();
            } else {
                this.removeMarkers();
            }
        },
        severalTracksData(data) {
            this.removeMarkers();
            this.removeCircleMarkers();
            this.removePolyLines();
            this.removePopupLayer();
            if (data && data.telemetry) {
                for (const track in data.telemetry) {
                    this.addTrackRecord(data.telemetry[track]);
                    this.addControlPoints(data.control_points_and_order_info[track]);
                }
            }
        },
        trackData(value) {
            if (value && value.length > 0) {
                this.drawTrackData(value);
            } else {
                this.removeCircleMarkers();
            }
        },
        contolPointsData(control_points) {
            if (control_points && control_points.entry_point && control_points.exit_point) {
                this.addControlPoints(control_points);
                if (!this.trackData) {
                    this.removeCircleMarkers();
                    this.fitAllMarkers();
                    this.mapInstance.setZoom(3);
                }
            } else {
                this.removeControlPoints();
                this.removePolyLines();
            }
        },
    },
    methods: {
        async drawTrackData(value) {
            this.removeMarkers();
            this.removeCircleMarkers();
            this.removePolyLines();
            this.removePopupLayer();
            await this.addTrackRecord(value);
            // this.setViewOnLastPoint(value);
        },
        addMarkers(value) {
            value.forEach((point) => {
                const customIcon = L.divIcon({
                    className: 'customIcon',
                    html: `
                    <img src=${pin} alt="" class="pin">
                    <img src=${this.iconsByType[point.vehicle_type_code]} alt="" class="pinType">
                    <span class="monitoring-point-icon__number">
                        ${point.reg_number}
                        <img src="/flags/1x1/${this.numericToAlpha2Code(point.customer_country_code)}.svg" alt="" class="flagstyle">
                    </span>
                    `,
                });
                if (point.telemetry.coordinate.lat && point.telemetry.coordinate.lon) {
                    const latlng = [point.telemetry.coordinate.lat, point.telemetry.coordinate.lon];
                    const marker = L.marker(latlng, { icon: customIcon });
                    marker.dcId = point.cargo_bay_id;
                    marker.telemetryId = point.telemetry.id;
                    marker.on('click', (e) => {
                        this.currentPopup = this.createPopUp(e.target._latlng, e.target);
                    });
                    this.mapInstance.addLayer(marker);
                    this.markers.push(marker);
                }
            });
            this.fitAllMarkers();
            this.mapInstance.setZoom(3);
        },
        numericToAlpha2Code(code) {
            const alpha2Code = countriesConvertor.numericToAlpha2(code);
            if (alpha2Code) {
                return alpha2Code.toLowerCase();
            }

            return 'empty';
        },
        async addTrackRecord(value) {
            const lines = [{
                type: 'Feature',
                properties: { color: '#27AE60', colorName: 'green' },
                geometry: {
                    coordinates: [],
                    type: 'MultiLineString',
                },
            },
            {
                type: 'Feature',
                properties: { color: '#F2994A', colorName: 'orange' },
                geometry: {
                    coordinates: [],
                    type: 'MultiLineString',
                },
            },
            {
                type: 'Feature',
                properties: { color: '#fff100', colorName: 'yellow' },
                geometry: {
                    coordinates: [],
                    type: 'MultiLineString',
                },
            },
            {
                type: 'Feature',
                properties: { color: '#EB5757', colorName: 'red' },
                geometry: {
                    coordinates: [],
                    type: 'MultiLineString',
                },

            }];
            const points = {
                type: 'FeatureCollection',
                features: [],
            };
            const dangerPoints = {
                type: 'FeatureCollection',
                features: [],
            };
            const promises = [];

            let prevDeviation = false;
            for (let key = 0; key < value.length; key++) {
                const trackPoint = value[key];

                let colorName = 'green';
                let color = '#27AE60';

                if (trackPoint.with_violation) {
                    color = 'red';
                    colorName = 'red';
                } else if (!prevDeviation && trackPoint.route_deviation) {
                    color = '#EB5757';
                    colorName = 'red';
                } else if (trackPoint.battery_warn) {
                    color = '#fff100';
                    colorName = 'yellow';
                } else if (trackPoint.route_deviation) {
                    color = '#F2994A';
                    colorName = 'orange';
                }

                if (trackPoint.route_deviation) {
                    prevDeviation = true;
                }

                const marker_suffix = '';
                if (!trackPoint.with_violation && trackPoint.battery_warn) {
                    marker_suffix = '_yellow';
                }
                if (!trackPoint.with_violation && trackPoint.with_violation) {
                    marker_suffix = '_red';
                }
                const point = {
                    geometry: {
                        type: 'Point',
                        coordinates: [trackPoint.coordinates.lon, trackPoint.coordinates.lat],
                    },
                    type: 'Feature',
                    properties: {
                        telemetryId: trackPoint.telemetry_id,
                        serial_number: trackPoint.serial_number,
                        // event: trackPoint.event_code,
                        // battery_warn: trackPoint.battery_warn,
                        // popupContent: 'Point',
                        pointType: this.eventCodes.includes(trackPoint.event_code) ? 'Marker' : 'Point',
                        color,
                        colorName,
                        marker_suffix,
                    },
                    // id: point.sn
                };

                if (colorName === 'red') {
                    // dangerPoints.features.push(pointDotFill);
                    // dangerPoints.features.push(pointDot);
                    dangerPoints.features.push(point);
                } else {
                    // points.features.push(pointDotFill);
                    // points.features.push(pointDot);
                    points.features.push(point);
                }

                if (value[key + 1]) {
                    const lineLatLngs = [[trackPoint.coordinates.lon, trackPoint.coordinates.lat], [value[key + 1].coordinates.lon, value[key + 1].coordinates.lat]];
                    lines.forEach((line) => {
                        if (line.properties.colorName === colorName) {
                            line.geometry.coordinates.push(lineLatLngs);
                        }
                    });
                }
            }

            const { pins } = this;

            Promise.all(lines).then(() => {
                const polyLinesLayer = L.geoJSON(lines, {
                    style: (feature) => {
                        switch (feature.properties.colorName) {
                        case 'green':
                            return { color: '#27AE60' };
                        case 'orange':
                            return { color: '#F2994A' };
                        case 'red':
                            return { color: '#EB5757' };
                        case 'yellow':
                            return { color: '#fff100' };
                        default:
                            return { color: '#27AE60' };
                        }
                    },
                });

                polyLinesLayer.addTo(this.mapInstance);
                this.polyLines.push(polyLinesLayer);

                const onEachFeature = (feature, layer) => {
                    layer.on('click', (e) => {
                        if (feature.properties.pointType === 'Point') {
                            e.target.setRadius(12);
                            this.clickedCircle = e.target;
                        }
                       // this.currentPopup = this.createPopUp(e.target._latlng, e.target);
                    });
                   // layer.bindTooltip(layerTt => `<div class="device_tooltip"><h2><span>${this.$t('component.leaflet.serial_number')}</span> ${feature.properties.serial_number}</h2></div>`);
                };
                var Marker6Point = L.CircleMarker.extend({
                    _updatePath: function () {
                        this._renderer._updateMarker6Point(this);
                    }
                });


                const normalPointsLayer = L.geoJSON(points, {

                    style: feature => ({}),
                    onEachFeature,
                    pointToLayer(feature, latlng) {
                        if (feature.properties.pointType === 'Marker') {
                            return L.marker(latlng, {
                                icon: L.icon({
                                    iconUrl: pins[`${feature.properties.event}${feature.properties.marker_suffix}`],
                                    iconSize: [32, 34], // size of the icon
                                    iconAnchor: [16, 16], // point of the icon which will correspond to marker's location
                                    popupAnchor: [-16, -16], // point from which the popup should open relative to the iconAnchor
                                }),
                                telemetryId: feature.properties.telemetryId,
                                fillColor: feature.properties.color,
                            });
                        }

                        // if (feature.properties.isDot) {
                       // (p, style(feature));
                        return new Marker6Point (latlng, {
                            radius: 8,
                            telemetryId: feature.properties.telemetryId,
                            fillColor: feature.properties.color,
                            fillOpacity: 1,
                            color: 'white',
                            weight: 3,
                            opacity: 1,
                        });
                    },
                });


                // if (this.mapInstance.getZoom() > this.zoomForAllTrack)
                normalPointsLayer.addTo(this.mapInstance);
                this.normalPoints.push(normalPointsLayer);

                const dangerPointsLayer = L.geoJSON(dangerPoints, {

                    style: feature => ({}),
                    onEachFeature,
                    pointToLayer(feature, latlng) {
                        return L.circleMarker(latlng, {
                            radius: 8,
                            telemetryId: feature.properties.telemetryId,
                            fillColor: feature.properties.color,
                            fillOpacity: 1,
                            color: 'white',
                            weight: 3,
                            opacity: 1,
                        });
                    },
                });
                dangerPointsLayer.addTo(this.mapInstance);
                this.dangerPoints.push(dangerPointsLayer);
            })
                .catch((e) => {
                    console.error(e);
                });
        },
        addControlPoints(value) {
            const activated_date = value.order_active_date ? `, ${moment(value.order_active_date).format('DD.MM.YYYY HH:mm:ss')}` : '';
            const deactivated_date = value.order_deactivated_date ? `, ${moment(value.order_deactivated_date).format('DD.MM.YYYY HH:mm:ss')}` : '';

            const startPoint = L.marker([value.entry_point.coordinate.lat, value.entry_point.coordinate.lon], {
                icon: L.divIcon({
                    className: 'customIcon',
                    html: '<i class="el-icon-location-outline"></i>',
                    iconSize: [30, 30],
                    iconAnchor: [20, 30],
                    tooltipAnchor: [0, 0],
                }),
            });

            startPoint.bindTooltip(`<div class="device_tooltip"><h2><span>${this.$t('component.leaflet.entry_point')}</span>
                ${value.entry_point.type ? value.entry_point.type : ''} ${value.entry_point.name}${activated_date}</h2></div>`);
            startPoint.addTo(this.mapInstance);

            this.controlPoints.push(startPoint);

            const endPoint = L.marker([value.exit_point.coordinate.lat, value.exit_point.coordinate.lon], {
                icon: L.divIcon({
                    className: 'customIcon',
                    html: '<i class="el-icon-location"></i>',
                    iconSize: [30, 30],
                    iconAnchor: [20, 30],
                    tooltipAnchor: [0, 0],
                }),
            });
            endPoint.bindTooltip(`<div class="device_tooltip"><h2><span>${this.$t('component.leaflet.exit_point')}</span>${value.exit_point.type ? value.exit_point.type : ''} ${value.exit_point.name}${deactivated_date}</h2></div>`);
            endPoint.addTo(this.mapInstance);
            this.controlPoints.push(endPoint);
        },
        zoomIn() {
            if (this.map.getZoom() >= 18) {
                return;
            }
            this.map.zoomIn();
        },
        zoomOut() {
            if (this.map.getZoom() <= 3) {
                return;
            }
            this.map.zoomOut();
        },
        createMapInstance() {
            const map = L.map(this.$refs.map_container, {
                fullscreenControl: true,
                preferCanvas: true,
                zoomDelta: 0.5,
                zoomSnap: 0.5,
                zoomControl: false,
                wheelPxPerZoomLevel: 120,
                maxZoom: 20,
                minZoom: 3,
                zoomAnimation: true,
            }).setView(this.mapCenter(), 3);

            map.on('popupclose', (e) => {
                if (this.clickedCircle) {
                    this.clickedCircle.setRadius(8);
                }
            });
            map.on('fullscreenchange', () => {
                const zoomin = document.querySelector('.icon-zoom-in');
                const zoomout = document.querySelector('.icon-zoom-out');
                const controlPanel = document.querySelector('.leaflet-control-container');
                if (map.isFullscreen()) {
                    console.log('entered fullscreen');
                    controlPanel.appendChild(zoomin);
                    controlPanel.appendChild(zoomout);
                } else {
                    console.log('exited fullscreen');
                }
            });
            this.map = map;

            if (this.isViolation) {
                map.scrollWheelZoom.disable();
            }
            L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw', {
                maxZoom: 18,
                attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
                    '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
                    'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
                id: 'mapbox.streets'
            }).addTo(map);
            L.control.scale({
                metric: true,
                imperial: false,
            }).addTo(map);

            if (this.trackData) {
                this.drawTrackData(this.trackData);
            }

            return map;
        },
        createPopUp(latlng, target) {
            const popup = L.popup({
                maxWidth: 475,
                minWidth: 475,
            }).setLatLng(latlng);

            const ComponentClass = Vue.extend(Popup);
            const instance = new ComponentClass({
                data: {
                    selectedOrderId: this.selectedOrderId,
                    orderId: this.orderId,
                    router: this.$router,
                    telemetryId: target.telemetryId || target.options.telemetryId,
                },
                i18n: this.$i18n
            });
            instance.$mount();
            popup.setContent(instance.$el).openOn(this.mapInstance);
            return popup;
        },
        drawPopup(value) {
            if (value && this.currentPopup) {
                this.currentPopup.setContent(value)
                    .openOn(this.mapInstance);
            }
        },
        fixBug() {
            // https://github.com/Leaflet/Leaflet/issues/4968
            L.Marker.prototype.options.icon = L.icon({
                iconRetinaUrl,
                iconUrl,
                shadowUrl,
                iconSize: [25, 41],
                iconAnchor: [12, 41],
                popupAnchor: [1, -34],
                tooltipAnchor: [16, -28],
                shadowSize: [41, 41],
            });
        },
        findDeviceOnMap(device) {
            const bounds = L.latLngBounds({
                lat: this.vehicles[this.vehicles.length - 1].children[0].lat,
                lng: this.vehicles[this.vehicles.length - 1].children[0].lon,
            },
            {
                lat: this.vehicles[this.vehicles.length - 1].children[0].lat,
                lng: this.vehicles[this.vehicles.length - 1].children[0].lon,
            });
            this.bounds = bounds;
        },
        fitAllMarkers() {
            if (this.mapInstance && this.markers.length) {
                const group = L.featureGroup(this.markers);
                if (this.markers.length > 1) {
                    this.mapInstance.fitBounds(group.getBounds());
                }
            }
        },
        mapCenter() {
            // if (this.vehicles && this.vehicles.length) {
            //     return this.center = [this.vehicles[this.vehicles.length - 1].children[0].lat, this.vehicles[this.vehicles.length - 1].children[0].lon];
            // }
            // return this.center || [61.59855895286674, 111.25511169433594];
            return [61.59855895286674, 111.25511169433594];
        },
        polylineLatlng(firstPoint, secPoint) {
            return (secPoint) ? [[firstPoint.lat, firstPoint.lon], [secPoint.lat, secPoint.lon]]
                : [[firstPoint.lat, firstPoint.lon], [firstPoint.lat, firstPoint.lon]];
        },
        renderMap() {
            return this.mapInstance = this.createMapInstance();
        },
        removeMarkers(value) {
            if (this.mapInstance) {
                // this.markers
                for (const marker of this.markers) {
                    this.mapInstance.removeLayer(marker);
                }
                this.markers = [];
            }
        },
        removeCircleMarkers() {
            if (!this.mapInstance) {
                return false;
            }
            if (this.normalPoints) {
                this.normalPoints.forEach(layer => this.mapInstance.removeLayer(layer));
                this.normalPoints = [];
            }
            if (this.dangerPoints) {
                this.dangerPoints.forEach(layer => this.mapInstance.removeLayer(layer));
                this.dangerPoints = [];
            }
        },
        removeControlPoints() {
            if (this.controlPoints) {
                this.controlPoints.forEach(layer => this.mapInstance.removeLayer(layer));
                this.controlPoints = [];
            }
        },
        removePolyLines() {
            if (this.mapInstance && this.polyLines) {
                this.polyLines.forEach(layer => this.mapInstance.removeLayer(layer));
            }
        },
        removePopupLayer() {
            if (this.mapInstance && this.currentPopup) {
                if (this.mapInstance.hasLayer(this.currentPopup)) this.mapInstance.removeLayer(this.currentPopup);
            }
        },
        async showDeviceTrack(deviceForTrack) {
            this.vehicles = null;

            this.records = pointsData[0].result.points; // records
            this.zoom = 16;
        },
        setViewOnLastPoint(value) {
            if (value.length > 0) {
                this.map.invalidateSize(true);
                // hack leaflet map on tab
                this.map.setView({
                    lat: value[value.length - 1].coordinates.lat - 1,
                    lng: value[value.length - 1].coordinates.lon,
                }, 18); // for 50 meters zoom
                this.map.setView({
                    lat: value[value.length - 1].coordinates.lat,
                    lng: value[value.length - 1].coordinates.lon,
                }, 18); // for 50 meters zoom
            }
        },
    },
};
