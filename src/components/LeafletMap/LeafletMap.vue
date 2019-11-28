<template>
    <div class="l-map">
        <div ref="map_container" id="l-map" class="l-map"></div>
    </div>
</template>

<script src="./LeafletMap.js"></script>
<style lang="scss">
    @import "~@fortawesome/fontawesome-free/css/all.css";
    @import '~@fortawesome/fontawesome-free/css/fontawesome.min.css';
    @font-face {
        font-family: "Font Awesome 5 Free";
        src: url('~@fortawesome/fontawesome-free/webfonts/fa-brands-400.ttf');
    }
    .l-map {
        width: 100%;
        height: 100vh;
    }
    $grey: #8792A3;
    $blue: #185DD3;
    .device_tooltip {
        h2 {
            font-weight: 500;
            font-size: 1.6rem;
            line-height: 2rem;
            text-align: right;
            margin: 0;
            span {
                color: $grey;
                font-size: 1.2rem;
                font-weight: normal;
            }
        }
    }
    .leaflet-control-container {
        position: absolute;
        bottom: 0;
        .leaflet-control-fullscreen {
            width: 32px;
            height: 32px;
            display: block;
            position: absolute;
            left: 50px;
            bottom: 43px;
            z-index: 998;
            -webkit-box-shadow: 0px 4px 8px rgba(69, 76, 97, 0.1), 0px 1px 2px rgba(69, 76, 97, 0.1);
            box-shadow: 0px 4px 8px rgba(69, 76, 97, 0.1), 0px 1px 2px rgba(69, 76, 97, 0.1);
            border-radius: 50%;
            border: none;
            cursor: pointer;
            background: white;
            -webkit-transition: all .3s;
            transition: all .3s;
            a.leaflet-control-fullscreen-button[title="View Fullscreen"] {
                width: inherit;
                height: inherit;
                border-radius: 50%;
                background: white;
                &:hover {
                    background: $blue;
                    &:before {
                        color: white;
                    }
                }
                &:before {
                    font-family: 'Font Awesome 5 Free';
                    font-weight: 900;
                    font-size: large;
                    color: $grey;
                    content: "\f065";
                }
              }
            a.leaflet-control-fullscreen-button[title="Exit Fullscreen"] {
                width: inherit;
                height: inherit;
                border-radius: 50%;
                background: white;
                &:hover {
                    background: $blue;
                    &:before {
                        color: white;
                    }
                }
                &:before {
                    font-family: 'Font Awesome 5 Free';
                    font-weight: 900;
                    font-size: large;
                    color: $grey;
                    content: "\f066";
                }
            }
        }
    }

</style>

