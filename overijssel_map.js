import * as THREE from 'three';
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

import {CSS3DRenderer, CSS3DObject} from 'three/addons/renderers/CSS3DRenderer.js';
import {TrackballControls} from 'three/addons/controls/TrackballControls.js';

import {LineMaterial} from 'https://cdn.jsdelivr.net/npm/three@latest/examples/jsm/lines/LineMaterial.js';
import {LineGeometry} from 'https://cdn.jsdelivr.net/npm/three@latest/examples/jsm/lines/LineGeometry.js';
import {Line2} from 'https://cdn.jsdelivr.net/npm/three@latest/examples/jsm/lines/Line2.js';


// initial elements of the 3D scene
var controls, camera, glScene, cssScene, glRenderer, cssRenderer;
var theMap = null;

var map_length, map_width, map_height;
map_length = 2000;
map_width = 3000;
map_height = 2000;

//[-6.9786458015441326,62.338024139404411]
var map_center = {lat: -6.97864, lng: 62.33802};
//var map_center = {lat: 12.9748 51 , lng: 77.618414};
//var map_center = {lat: 52.3552 , lng: 4.8957};
var map_scale = 6.8;
//var map_scale = 13;

mapboxgl.accessToken = 'pk.eyJ1IjoicG9vcm5pLWJhZHJpbmF0aCIsImEiOiJjanUwbmYzc3UwdDI3NGRtZ3kzMTltbWZpIn0.SB9PEksVcEwWvZJ9A7J9uA';

// the app starts in initialize()

const tubes = [];

// process flow data
let globalFLowsData;
let globalSoldiersRange = [0, 0];
let globalTemperatureRange = [0, 0];
let globalTimeRange = [0, 0];

let globalMigrationRange = [0, 0];
let globalMigrationRange_clean = [0, 0];
let globalMigrationRange_clean_overijs = [0, 0]

let globalFlowVisDirection = "all"


let globalColorScale = null;
let globalDivers_ColorScale = null;
let globalThicknessScale = null;
let globalZAxisScale = null;

let globalMigrationScale = null;
let globalMigrationScale_clean = null;
let globalMigrationScale_clean_order = null;

let globalMigrationScale_overijs = null
let globalMigrationScale_clean_order_overijs = null;

let corpsNameList = null;

// visual variables
let formatDate = d3.timeFormat("%Y-%m-%d");

// 3D flow scene
let meshes = [];

let dataFaroeGeo = [];
let dataMigration = [];
let dataCities = [];

let dataOverijssel = null;
let dataOverijsselMigration = null;
let citiesOverisj_locations = new Map();
let citiesList = null;

let flying_balls = [];

let faroerProjection = null;
let projectOverijs = null;


let graphics3D = {

    //doc div parameters
    windowdiv_width: window.innerWidth,
    windowdiv_height: window.innerHeight,
    windowdiv_width_3DM: window.innerWidth,
    windowdiv_height_3DM: window.innerHeight,
    icelandCenter: [-6.964583396911621, 61.89270782470703],

    //graphic elements
    svg3DbaseMap: null,
    projection: null,

    //3D sence
    camera: null,
    glScene: null,
    cssScene: null,
    glRenderer: null,
    cssRenderer: null,
    controls: null,
    unitline3D: 120,
    linerValueScale: null,

    //3D for matrix
    camera_3DM: null,
    glScene_3DM: null,
    cssScene_3DM: null,
    glRenderer_3DM: null,
    controls_3DM: null,

    //2D graphic
    map_length: 2000,
    map_width: 3000,
    map_height: 2400,

    //other
    //centerMap: d3.map()
}

initialize();

async function initialize() {

    initialize3DScene()

// 创建射线投射器（用于检测鼠标和物体的交互）
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    let selectedObject = null; // 记录当前选中的对象

    await readFlowsData().then((data) => {
        //data.map(d=>flowData.push(d));

        globalFLowsData = data.map(function (flow) {
            return flow.sort((a, b) => d3.ascending(new Date(a.attributes.DATA), new Date(b.attributes.DATA)))
        });

        citiesList = dataOverijssel.cities.map(d => d.name);


        //console.log("globalFLowsData",globalFLowsData);
        initLayerControls();
    })

    function initialize3DScene() {

        //-------------create 3D scene-------------
        camera = new THREE.PerspectiveCamera(60, 0.85 * window.innerWidth / window.innerHeight, 0.1, 10000);
        camera.position.set(0, -2000, 1700)
        glRenderer = createGlRenderer();
        cssRenderer = createCssRenderer();
        //document.body.appendChild(glRenderer.domElement);

        document.getElementById("scene-container").appendChild(cssRenderer.domElement);
        //document.body.appendChild(cssRenderer.domElement);
        cssRenderer.domElement.appendChild(glRenderer.domElement);
        cssRenderer.setSize(window.innerWidth * 0.85, window.innerHeight);
        glRenderer.setSize(window.innerWidth * 0.85, window.innerHeight);

        glScene = new THREE.Scene();
        cssScene = new THREE.Scene();

        //-------------create lights
        var ambientLight = new THREE.AmbientLight(0x555555);
        glScene.add(ambientLight);
        var directionalLight = new THREE.DirectionalLight(0xffffff);
        directionalLight.position.set(1000, -2, 10).normalize();
        glScene.add(directionalLight);

        var directionalLight_2 = new THREE.DirectionalLight(0xFFFFFF, 1.0);
        directionalLight_2.position.set(0, 0, 2300);
        directionalLight_2.target.position.set(1400, 800, 0);
        directionalLight_2.castShadow = true;
        directionalLight_2.shadow.camera.near = 0.01;
        directionalLight_2.shadow.camera.far = 3000;
        directionalLight_2.shadow.camera.top = 1200;
        directionalLight_2.shadow.camera.bottom = -1200;
        directionalLight_2.shadow.camera.left = -1400;
        directionalLight_2.shadow.camera.right = 1400;
        glScene.add(directionalLight_2);

        //var helper = new THREE.CameraHelper( directionalLight_2.shadow.camera );

        //glScene.add(helper);

        //creatAixs();

        controls = new TrackballControls(camera, cssRenderer.domElement);
        controls.rotateSpeed = 2;
        controls.minDistance = 30;
        controls.maxDistance = 8000;


    }

    function initLayerControls() {

        const container = d3.select("#layerControls");

        //console.log(dataOverijssel.cities)

        const layersData = dataOverijssel.cities.map((d, index) => {
            return {
                name: d.name, value: index
            }
        });

        //console.log("layersData", layersData)


        // 为每个数据项创建一个复选框和对应的标签
        layersData.forEach((d, i) => {
            // 创建一个 <label> 元素
            const label = container.append("label")
                .attr("for", `checkbox-${i}`)
                .style("display", "block"); // 每个复选框独占一行

            // 在 <label> 内添加复选框
            label.append("input")
                .attr("type", "checkbox")
                .attr("id", `checkbox-${i}`)
                .attr("name", d.name)
                .attr("value", d.value)
                .property("checked", true); // 默认选中

            // 在 <label> 内添加显示的文本
            label.append("span")
                .text("From: " + d.name);
        });

        //console.log("corpsNameList", corpsNameList);
        // 图层控制

        layersData.forEach((d, i) => {
            var checkboxID = "checkbox-" + i;

            document.getElementById(checkboxID).addEventListener('change', function (event) {
                if (event.target.checked) {
                    camera.layers.enable(i + 1);
                } else {
                    camera.layers.disable(i + 1);
                }
            });
        })


        document.getElementById("viaToggle").addEventListener("change", function () {
            console.log("viaToggle", this.checked);
            resetLayerControls(this.checked)
        });

    }

    //console.log("globalFLowsData",globalFLowsData);

    globalDivers_ColorScale = d3.scaleOrdinal()
        .domain(d3.range(17))  // 17 个类别
        .range(d3.schemeSet3.concat([
            "#ff0000", "#ff7f00",
            "#ffff00", "#7fff00", "#3322d2"  // 额外补充 5 种颜色
        ]));


    globalColorScale = d3.scaleLinear().domain(globalTemperatureRange).range(["blue", "red"]);

    globalThicknessScale = d3.scaleLinear().domain(globalSoldiersRange).range([3, 50]);

    globalZAxisScale = d3.scaleLinear().domain(globalTimeRange).range([0, 1200]);


    globalMigrationScale = d3.scaleLinear().domain(globalMigrationRange).range([10, 40])

    globalMigrationScale_clean = d3.scaleLinear().domain(globalMigrationRange_clean).range([2, 30])

    globalMigrationScale_clean_order =
        d3.scaleQuantize().domain(globalMigrationRange_clean).range([2, 3, 4, 5, 6, 7]);


    globalMigrationScale_clean_order_overijs =
        d3.scaleQuantize().domain(globalMigrationRange_clean_overijs).range([1, 2, 3, 4]);

    //-------------create flow map-------------
    //createMap();

    draw3DBaseMap();

    //draw3DCitiesOnMap();

    //createFlows_arc();

    //createFlows_STC();

    //createFlows_particles_speed()

    //createFlows_particles_frequency();

    //createFlows_particles_speed_2D()

    createFlows_particles_frequency_2D();

    //createFlows_2DWall();

    //createFlows_3DWall();

    //createFlows_Old();

    // set controllers

    // 交互监听
    const interactionLog = document.getElementById("log-list");

    function logInteraction(message) {
        const li = document.createElement("li");
        li.textContent = message;
        interactionLog.appendChild(li);
        if (interactionLog.childElementCount > 5) {
            interactionLog.removeChild(interactionLog.firstChild);
        }
    }

    // 监听鼠标移动事件
    window.addEventListener('mousemove', (event) => {
        // 计算鼠标在归一化设备坐标 (-1 ~ 1)
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        // 进行射线检测
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(tubes);

        if (intersects.length > 0) {
            if (selectedObject !== intersects[0].object) {

                console.log(intersects[0].object)
                if (selectedObject) selectedObject.material.emissive.set(0x000000); // 恢复原色
                selectedObject = intersects[0].object;
                selectedObject.material.emissive.set(0x333333); // 高亮

                logInteraction(`点击了立方体, 坐标: (${intersects[0].point.x.toFixed(2)}, ${intersects[0].point.y.toFixed(2)})`);
            }


        } else {
            if (selectedObject) selectedObject.material.emissive.set(0x000000);
            selectedObject = null;
        }
    });

    window.addEventListener("resize", () => {
        camera.aspect = (window.innerWidth * 0.85) / window.innerHeight;
        camera.updateProjectionMatrix();
        glRenderer.setSize(window.innerWidth * 0.85, window.innerHeight);
        cssRenderer.setSize(window.innerWidth * 0.85, window.innerHeight);
    });

    update();

    animate();


    // 处理下拉框选择事件
    document.getElementById('objectSelector').addEventListener('change', function (event) {
        const selectedObject = event.target.value;
        updateVisualizationMethods(selectedObject);
    });


    function createGlRenderer() {
        var glRenderer = new THREE.WebGLRenderer({alpha: true});
        glRenderer.setClearColor(0x000000, 0);
        glRenderer.setPixelRatio(window.devicePixelRatio);
        glRenderer.setSize(window.innerWidth, window.innerHeight);
        glRenderer.domElement.style.position = 'absolute';
        //glRenderer.domElement.style.zIndex = 0;
        glRenderer.domElement.style.top = 0;

        //glRenderer.domElement.appendChild(cssRenderer.domElement);
        //glRenderer.domElement.appendChild(cssRenderer.domElement);
        glRenderer.shadowMap.enabled = true;
        //glRenderer.shadowMap.type = THREE.PCFShadowMap;
        //glRenderer.shadowMapAutoUpdate = true;

        return glRenderer;
    }

    function createCssRenderer() {
        var cssRenderer = new CSS3DRenderer();
        cssRenderer.setSize(window.innerWidth, window.innerHeight);
        cssRenderer.domElement.style.position = 'absolute';
        cssRenderer.domElement.style.zIndex = 1;
        cssRenderer.domElement.style.top = 1;
        //cssRenderer.domElement.style.position = 'absolute';
        cssRenderer.shadowMapAutoUpdate = true;
        return cssRenderer;
    }

    function creatAixs() {
        //create axis
        var material = new THREE.LineBasicMaterial({color: 0x000000, opacity: 0.5});

        //create axis
        const points = [];

        var x = map_length / 2, y = map_width / 2, z = map_height;
        points.push(new THREE.Vector3(x, y, z));
        points.push(new THREE.Vector3(x, y, 0));
        points.push(new THREE.Vector3(x, y, z));

        points.push(new THREE.Vector3(x, -y, z));
        points.push(new THREE.Vector3(x, -y, 0));
        points.push(new THREE.Vector3(x, -y, z));

        points.push(new THREE.Vector3(-x, -y, z));
        points.push(new THREE.Vector3(-x, -y, 0));
        points.push(new THREE.Vector3(-x, -y, z));

        points.push(new THREE.Vector3(-x, y, z));
        points.push(new THREE.Vector3(-x, y, 0));
        points.push(new THREE.Vector3(-x, y, z));
        points.push(new THREE.Vector3(x, y, z));

        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(geometry, material);
        //add all the element to sence
        glScene.add(line);

    }

}

function convert(vertex) {
    return new THREE.Vector3(vertex[0], vertex[1], vertex[2]);
}

function convert2D(vertex) {
    return new THREE.Vector2(vertex[0], vertex[1]);
}

//-------------read flow data-------------
async function readFlowsData() {

    const allData = [];
    let flowsList = null;

    const fileNames = Array.from({length: 13}, (_, i) => `data/minard_map_data/Napoleones_${i + 1}.json`);

    async function loadminardFiles() {

        for (let i = 0; i < fileNames.length; i++) {
            try {
                const data = await d3.json(fileNames[i]);
                //console.log(`读取 ${fileNames[i]}：`, data);
                allData.push(data);
            } catch (error) {
                console.error(`加载 ${fileNames[i]} 失败:`, error);
            }
        }
        //console.log("所有 JSON 数据：", allData);
    }

    async function reformatData() {

        const getdata = allData.map(function (d) {
            return d.features
        })


        flowsList = getdata;

        //console.log("flowsList",flowsList)
    }

    async function processFlowData() {
        try {
            await loadminardFiles();  // 等待异步任务完成;
            await reformatData();

            await loadFaroeGeoData();
            //console.log("flowsList",flowsList);
            //console.log(flowsList);

            const flatData = flowsList.flat();
            //console.log(flatData);

            const maxSoldiers = Math.max(...flatData.map(item => item.attributes.SOLDIERS));
            const minSoldiers = Math.min(...flatData.map(item => item.attributes.SOLDIERS));

            const maxTemperature = Math.max(...flatData.map(item => item.attributes.TEMPERATUR));
            const minTemperature = Math.min(...flatData.map(item => item.attributes.TEMPERATUR));

            const maxDate = Math.max(...flatData.map(item => item.attributes.DATA));
            const minDate = Math.min(...flatData.map(item => item.attributes.DATA));

            //console.log("maxSoldiers",maxSoldiers,"minSoldiers",minSoldiers);
            //`ture",maxTemperature,"minTemperature",minTemperature);
            //console.log("newestDate",formatDate(new Date(maxDate)),"oldestDate",formatDate(new Date(minDate)));


            const flowValues = dataMigration.migration.flat();

            const maxMigrationValue = d3.max(flowValues);
            const minMigrationValue = d3.min(flowValues);

            globalMigrationRange = [minMigrationValue, maxMigrationValue];


            //---------

            //去掉第一行第一列，最后一行，最后一列

            // 过滤掉行号和列号相同的元素
            const filteredData_sameIJ = dataMigration.migration.map((row, rowIndex) =>
                row.filter((_, colIndex) => rowIndex !== colIndex)
            );
            const filteredData_firstRow = filteredData_sameIJ.slice(1, -1).map(row => row.slice(1, -1));// 去掉第一行和最后一行
            const flowValues_clean = filteredData_firstRow.flat();
            const flowValues_clean_no_0 = flowValues_clean.filter(d => d !== 0);
            //console.log(filteredData, dataMigration.migration)

            //console.log("flowValues_clean", flowValues_clean, flowValues_clean_no_0)
            const maxMigrationValue_clean = d3.max(flowValues_clean_no_0);
            const minMigrationValue_clean = d3.min(flowValues_clean_no_0);
            globalMigrationRange_clean = [minMigrationValue_clean, maxMigrationValue_clean];


            //


            globalTimeRange = [minDate, maxDate];
            globalTemperatureRange = [minTemperature, maxTemperature];
            globalSoldiersRange = [minSoldiers, maxSoldiers];

        } catch (error) {
            console.error("发生错误：", error);
        }
    }

    await processFlowData();

    async function loadFaroeGeoData(callback) {

        const dataGeo = await d3.json("data/faroe_data/faroer_adm2.json");
        dataFaroeGeo = dataGeo;

        const data1 = await d3.json("data/faroe_data/faroe_migration.json");

        dataMigration = data1;

        const data2 = await d3.json("data/faroe_data/citiesGeo.json");

        dataCities = data2;


        const data3 = await d3.json("data/overijssel_map_data/overijssel-data-inAll.json");

        dataOverijssel = data3;

        const data4 = await d3.json("data/overijssel_map_data/overijssel_migration.json");

        dataOverijsselMigration = data4.migration;

        var dataOverijsselMigration_flat = dataOverijsselMigration.flat();
        const dataOverijsselMigration_flat_clean = dataOverijsselMigration_flat.filter(d => d !== 0);

        // console.log(dataOverijsselMigration_flat_clean)
        const range_overijs = [d3.min(dataOverijsselMigration_flat_clean),
            d3.max(dataOverijsselMigration_flat_clean)]
        globalMigrationScale_overijs = d3.scaleLinear().domain(range_overijs).range([10, 40])

        globalMigrationRange_clean_overijs = range_overijs;



    }

    return Promise.resolve(flowsList);

}

//-------------create flow map-------------

function draw3DCitiesOnMap() {

    var material = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        opacity: 0.0,
        side: THREE.DoubleSide,
        //blending : THREE.NoBlending
    });

    var geometry = new THREE.PlaneGeometry(graphics3D.map_length, graphics3D.map_width);
    var mesh = new THREE.Mesh(geometry, material);
    mesh.position.x = 0;
    mesh.position.y = 0;
    mesh.position.z = -1;
    mesh.receiveShadow = true;

    //glScene.add(mesh);

    dataCities.forEach((d, i) => {

        //console.log(d.name);

        var location = graphics3D.projection(d.geometry)

        //console.log(d.name, location);

        // 创建球体几何体
        const radius = 5; // 半径
        const widthSegments = 32; // 水平方向上的分段数
        const heightSegments = 32; // 垂直方向上的分段数
        const geometry = new THREE.SphereGeometry(radius, widthSegments, heightSegments);

        // 创建材质
        const material = new THREE.MeshLambertMaterial({color: "rgba(41,91,21,0.35)", wireframe: true});

        // 创建网格对象
        const sphere = new THREE.Mesh(geometry, material);
        sphere.position.x = location[0] - graphics3D.map_length / 2; // 向右移动1个单位
        sphere.position.y = graphics3D.map_width / 2 - location[1]; // 向下移动2个单位
        sphere.position.z = 3;

        // 创建标签元素
        //var map_container = document.getElementById("map_container_1").createElement('div');
        const labelDiv = document.createElement('div');
        labelDiv.className = 'label' + i;
        labelDiv.textContent = d.name;
        labelDiv.style.marginTop = '-1em';
        labelDiv.style.color = 'red';
        labelDiv.style.fontSize = '30px'; // 设置字体大小为 24 像素


        // 创建 CSS3DObject 标签
        const label = new CSS3DObject(labelDiv);
        label.position.set(location[0] - graphics3D.map_length / 2, graphics3D.map_width / 2 - location[1], 20);
        glScene.add(sphere);

// 将球体添加到场景中
        cssScene.add(label);


    })

}

function draw3DBaseMap() {

    const centerOverijseel = turf.center(dataOverijssel.geojson);
    const overijsCenter = centerOverijseel.geometry.coordinates;

    //console.log("地图中心坐标:", overijsCenter);

    projectOverijs = d3.geoStereographic()
        .scale(250000)
        .center(overijsCenter)
        .translate([graphics3D.map_length / 2, graphics3D.map_width / 2])
        .clipAngle(180 - 1e-4)
        .clipExtent([[0, 0], [graphics3D.map_length, graphics3D.map_width]])
        .precision(.1);

    const pathOverijs = d3.geoPath().projection(projectOverijs);

    d3.selectAll('.migration_map_overijs_div')
        .data([1]).enter()
        .append("div")
        .attr("class", "migration_map_overijs_div")
        .attr("id", "migration_map_overijs_div_1");

    const overijsBaseMap = d3.select("#migration_map_overijs_div_1").append("svg")
        .attr("id", "svg_flow_3D_2")
        .attr("width", graphics3D.map_length)
        .attr("height", graphics3D.map_width)
        .attr("transform", "rotate(0,180,180)")
        .attr("transform", "translate(" + 0 + "," + 0 + ")");

    const g_overijs_basemap = overijsBaseMap.append("g")
        .attr("class", "basemap3D_overijs");

    //console.log("dataMigration",dataMigration);

    g_overijs_basemap.selectAll("path")
        .data(dataOverijssel.geojson.features)
        .enter()
        .append("path")
        .attr("d", pathOverijs)
        .attr("fill", "#a29f9f")
        .attr("stroke", "#dddddd")
        .attr("stroke-width", 4)
        .attr("opacity", 0.4)
        .attr("class", "basemap3DpathOverijs")
        .attr("name", function (d) {
            var name = d.properties.gm_naam;
            return name;
        });


    d3.selectAll(".basemap3DpathOverijs").each(function (d) {
        var center = pathOverijs.centroid(d);
        var named = d3.select(this).attr("name");
        g_overijs_basemap.append("text")
            .attr("class", "basemaplabel3D")
            .text(named)
            .attr("x", center[0])
            .attr("y", center[1] + 30)
            .attr("text-anchor", "middle")
            .attr("font-size", 40);

        citiesOverisj_locations.set(named, [center[0] - map_length / 2, map_width / 2 - center[1]])
    });


    //console.log(citiesOverisj_locations);

    var map_container_2 = document.getElementById("migration_map_overijs_div_1");
    var cssObject2 = new CSS3DObject(map_container_2);
    cssObject2.position.x = 0, cssObject2.position.y = 0, cssObject2.position.z = 1;
    cssObject2.receiveShadow = true;
    cssScene.add(cssObject2);

}

function createMap() {

    d3.selectAll('.map-div')
        .data([1]).enter()
        .append("div")
        .attr("class", "map-div")
        .attr("id", "mappad")
        .each(function (d) {

            var map = new mapboxgl.Map({
                container: 'mappad', // container ID
                style: 'mapbox://styles/mapbox/streets-v12', // style URL
                center: [map_center.lng, map_center.lat], // starting position [lng, lat]
                zoom: map_scale, // starting zoom,
                dragPan: false,
                scrollZoom: false,

            });
            theMap = map;
        });

    var mapContainer = document.getElementById("mappad");
    var cssObject = new CSS3DObject(mapContainer);
    cssObject.position.x = 0;
    cssObject.position.y = 0;
    cssObject.position.z = 0;
    cssObject.receiveShadow = true;
    cssScene.add(cssObject);

}


//-------------create flow map graphics-------------
async function createFlows_3DWall_Old() {
    console.log("Array.isArray(meshes) && meshes.some(Array.isArray)", Array.isArray(meshes) && meshes.some(Array.isArray));
    //判断是否二维
    if (Array.isArray(meshes) && meshes.some(Array.isArray)) {
        meshes = meshes.flat();
        meshes.forEach(mesh => glScene.remove(mesh));
    } else {
        meshes.forEach(mesh => glScene.remove(mesh));
    }


    meshes = [];
    meshes = globalFLowsData.map((flow, index) => {

        let segments = [];
        var vertex, geometry, material, mesh;

        let vertices = flow.map(function (v) {
            const point = projectGeoPointsTo3D(v)
            //console.log("point",point);
            return point;
        });

        //console.log("vertices", vertices);

        for (var i = 0; i < vertices.length - 1; i++) {

            const segmentCurve = new THREE.CatmullRomCurve3([vertices[i], vertices[i + 1]]);
            const color = globalColorScale(flow[i].attributes.TEMPERATUR);
            const radius = globalThicknessScale(flow[i].attributes.SOLDIERS);

            //material = new THREE.MeshLambertMaterial({opacity: 1,transparent: true,  color: color });


            // 5️⃣ 创建墙的剖面（矩形）
            const wallHeight = 3;
            const wallThickness = -radius * 10;
            const shape = new THREE.Shape();
            shape.moveTo(0, 0);
            shape.lineTo(0, wallHeight);
            shape.lineTo(wallThickness, wallHeight);
            shape.lineTo(wallThickness, 0);
            shape.closePath();

            // 6️⃣ 使用 `ExtrudeGeometry` 沿折线生成墙体
            const extrudeSettings = {
                steps: 4,
                bevelEnabled: false,
                extrudePath: segmentCurve // 沿着折线挤出
            };

            const wallGeometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
            const wallMaterial = new THREE.MeshLambertMaterial({
                color: color, // 让墙体醒目
                emissive: 0x440000,
                side: THREE.DoubleSide
            });

            const wallMesh = new THREE.Mesh(wallGeometry, wallMaterial);

            wallMesh.castShadow = true;
            wallMesh.layers.set(index);

            glScene.add(wallMesh);
            segments.push(wallMesh);
        }

        return segments;
    });

    resetLayerControls(true);

    console.log(meshes);

    function projectGeoPointsTo3D(stop) {
        var pointOrigin = {x: 0, y: 0};

        var point_center = theMap.project(new mapboxgl.LngLat(map_center.lng, map_center.lat));

        var point = new THREE.Vector3(0, 0, 0);

        //project => (lng, lat)
        var temp_point = theMap.project(new mapboxgl.LngLat(stop.geometry.x, stop.geometry.y));

        point.x = temp_point.x - pointOrigin.x - map_length / 2;
        point.y = 2 * point_center.y - temp_point.y - pointOrigin.y - map_width / 2;
        //point.z = globalZAxisScale(stop.attributes.DATA);
        point.z = 2;

        return point;
    }

}

async function createFlows_STC() {

    console.log("Array.isArray(meshes) && meshes.some(Array.isArray)",
        Array.isArray(meshes) && meshes.some(Array.isArray));
    //判断是否二维
    if (Array.isArray(meshes) && meshes.some(Array.isArray)) {
        meshes = meshes.flat();
        meshes.forEach(mesh => glScene.remove(mesh));
    } else {
        meshes.forEach(mesh => glScene.remove(mesh));
    }


    meshes = globalFLowsData.map((flow, index) => {
        //console.log("flow", flow);

        //create flow lines with data

        let segments = [];

        var vertex, geometry, material, mesh;

        let vertices = flow.map(function (v) {
            const point = projectGeoPointsTo3D(v)
            //console.log("point",point);
            return point;
        });

        //console.log("vertices", vertices);

        for (var i = 0; i < vertices.length - 1; i++) {

            const segmentCurve = new THREE.CatmullRomCurve3([vertices[i], vertices[i + 1]]);
            const color = globalColorScale(flow[i].attributes.TEMPERATUR);
            const radius = globalThicknessScale(flow[i].attributes.SOLDIERS);

            const segmentGeometry = new THREE.TubeGeometry(segmentCurve, 50, radius, 8, false);

            const segmentMaterial = new THREE.MeshLambertMaterial({
                opacity: 1,
                transparent: true, color: color
            });

            const segmentMesh = new THREE.Mesh(segmentGeometry, segmentMaterial);

            //material = new THREE.MeshLambertMaterial({opacity: 1,transparent: true,  color: color });

            segmentMesh.castShadow = true;
            segmentMesh.layers.set(index);

            glScene.add(segmentMesh);
            segments.push(segmentMesh);
        }
        return segments;
    });

    resetLayerControls(true);


    //console.log(meshes);

    function projectGeoPointsTo3D(stop) {
        var pointOrigin = {x: 0, y: 0};

        var point_center = theMap.project(new mapboxgl.LngLat(map_center.lng, map_center.lat));

        var point = new THREE.Vector3(0, 0, 0);

        //project => (lng, lat)
        var temp_point = theMap.project(new mapboxgl.LngLat(stop.geometry.x, stop.geometry.y));

        point.x = temp_point.x - pointOrigin.x - map_length / 2;
        point.y = 2 * point_center.y - temp_point.y - pointOrigin.y - map_width / 2;
        point.z = globalZAxisScale(stop.attributes.DATA);
        //console.log("point", point);

        return point;
    }

}

async function createFlows_3DWall() {

    console.log("Array.isArray(meshes) && meshes.some(Array.isArray)",
        Array.isArray(meshes) && meshes.some(Array.isArray));
    //判断是否二维
    if (Array.isArray(meshes) && meshes.some(Array.isArray)) {
        meshes = meshes.flat();
        meshes.forEach(mesh => glScene.remove(mesh));
    } else {
        meshes.forEach(mesh => glScene.remove(mesh));
    }

    //console.log(dataMigration)

    flying_balls.forEach(ball => glScene.remove(ball.mesh));
    flying_balls = [];


    meshes = dataOverijsselMigration.map(function (flows, i) {

        let segments = [];
        const color = globalDivers_ColorScale(i);


        //遍历除了第一列，最后一列，对角线
        for (var j = 0; j < flows.length - 1; j++) {

            var flowValue = dataOverijsselMigration[i][j];


            //排除value为0
            if (flowValue != 0) {

                var startPoint = citiesOverisj_locations.get(citiesList[i]);
                var endPoint = citiesOverisj_locations.get(citiesList[j]);

                const pointA = new THREE.Vector3(startPoint[0], startPoint[1], 0);
                const pointB = new THREE.Vector3(endPoint[0], endPoint[1], 0);

                const segmentCurve = new THREE.CatmullRomCurve3([pointA, pointB]);
                const radius = globalMigrationScale_overijs(flowValue);           // 管道半径

                // 5️⃣ 创建墙的剖面（矩形）
                const wallHeight = 3;
                const wallThickness = -radius * 5;
                const shape = new THREE.Shape();
                shape.moveTo(0, 0);
                shape.lineTo(0, wallHeight);
                shape.lineTo(wallThickness, wallHeight);
                shape.lineTo(wallThickness, 0);
                shape.closePath();

                // 6️⃣ 使用 `ExtrudeGeometry` 沿折线生成墙体
                const extrudeSettings = {
                    steps: 4,
                    bevelEnabled: false,
                    extrudePath: segmentCurve // 沿着折线挤出
                };

                const wallGeometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
                const wallMaterial = new THREE.MeshLambertMaterial({
                    color: color, // 让墙体醒目
                    emissive: 0x440000,
                    side: THREE.DoubleSide
                });

                const wallMesh = new THREE.Mesh(wallGeometry, wallMaterial);

                wallMesh.castShadow = true;
                wallMesh.layers.set(i + 1);

                glScene.add(wallMesh);
                segments.push(wallMesh);


            }

        }//for finished


        return segments;


    })

    resetLayerControls(true);

    //console.log(meshes);

}

async function createFlows_2DWall() {

    console.log("Array.isArray(meshes) && meshes.some(Array.isArray)",
        Array.isArray(meshes) && meshes.some(Array.isArray));
    //判断是否二维
    if (Array.isArray(meshes) && meshes.some(Array.isArray)) {
        meshes = meshes.flat();
        meshes.forEach(mesh => glScene.remove(mesh));
    } else {
        meshes.forEach(mesh => glScene.remove(mesh));
    }

    //console.log(dataMigration)

    flying_balls.forEach(ball => glScene.remove(ball.mesh));
    flying_balls = [];


    meshes = dataOverijsselMigration.map(function (flows, i) {

        let segments = [];
        const color = globalDivers_ColorScale(i);

        for (var j = 1; j < flows.length - 1; j++) {

            var flowValue = dataOverijsselMigration[i][j];

            if (flowValue != 0) {

                var startPoint = citiesOverisj_locations.get(citiesList[i]);
                var endPoint = citiesOverisj_locations.get(citiesList[j]);

                const pointA = new THREE.Vector3(startPoint[0], startPoint[1], 0);
                const pointB = new THREE.Vector3(endPoint[0], endPoint[1], 0);

                const thickness = globalMigrationScale_overijs(flowValue) * 2;           // 管道半径

                // 计算两点之间的方向和长度
                const dir = new THREE.Vector3().subVectors(pointB, pointA);
                const length = dir.length();
                const angle = Math.atan2(dir.y, dir.x); // 计算角度

                // 创建一个 PlaneGeometry 作为 2D 线
                const geometry = new THREE.PlaneGeometry(length, thickness); // 0.1 = 线的宽度
                const material = new THREE.MeshBasicMaterial({color: color, side: THREE.DoubleSide});
                const line = new THREE.Mesh(geometry, material);

                // 设置线段的位置和旋转
                line.position.copy(pointA.clone().add(pointB).multiplyScalar(0.5)); // 取中点
                line.rotation.z = angle; // 旋转到正确角度

                line.layers.set(i + 1);

                glScene.add(line);
                segments.push(line);
            }

        }//for finished


        return segments;

    })

    resetLayerControls(true);

    function projectGeoPointsTo3D(stop) {

        var location_2D = graphics3D.projection(stop);

        var point = new THREE.Vector3(0, 0, 0);

        point.x = location_2D[0] - graphics3D.map_length / 2; // 向右移动1个单位
        point.y = graphics3D.map_width / 2 - location_2D[1]; // 向下移动2个单位
        point.z = 3;

        return point;
    }

    //console.log(meshes);
}

async function createFlows_arc() {

    console.log("Array.isArray(meshes) && meshes.some(Array.isArray)",
        Array.isArray(meshes) && meshes.some(Array.isArray));
    //判断是否二维
    if (Array.isArray(meshes) && meshes.some(Array.isArray)) {
        meshes = meshes.flat();
        meshes.forEach(mesh => glScene.remove(mesh));
    } else {
        meshes.forEach(mesh => glScene.remove(mesh));
    }

    flying_balls.forEach(ball => glScene.remove(ball.mesh));
    flying_balls = [];

    meshes = dataOverijsselMigration.map(function (flows, i) {

        let segments = [];

        //console.log(citiesGeo);
        for (var j = 0; j < flows.length - 1; j++) {

            var flowValue = dataOverijsselMigration[i][j];

            if (flowValue != 0) {

                var startPoint = citiesOverisj_locations.get(citiesList[i]);
                var endPoint = citiesOverisj_locations.get(citiesList[j]);


                const pointA = new THREE.Vector3(startPoint[0], startPoint[1], 0);
                const pointB = new THREE.Vector3(endPoint[0], endPoint[1], 0);
                //const pointD = projectGeoPointsTo3D(D.geometry.coordinates);

                //console.log(pointA, pointB)
                const distance = pointA.distanceTo(pointB);

                // 计算中点
                const midpoint_flat = new THREE.Vector3().addVectors(pointA, pointB).multiplyScalar(0.5);
                const zHeight_arc = (distance / 2 + 2) * 0.8;


                const midpoint = new THREE.Vector3(midpoint_flat.x, midpoint_flat.y, zHeight_arc);

                const curve = new THREE.CatmullRomCurve3([pointA, midpoint, pointB]);

//globalMigrationScale_clean_order_overijs
                let color = globalDivers_ColorScale(i);

                const tubularSegments = 32; // 沿曲线方向的细分数
                const radius = globalMigrationScale_overijs(flowValue);           // 管道半径
                const radialSegments = 8;  // 管道横截面的细分数
                const closed = false;      // 管道两端是否闭合
                const geometry = new THREE.TubeGeometry(curve, tubularSegments, radius, radialSegments, closed);

// 创建材质
                const material = new THREE.MeshLambertMaterial({
                    color: color, // 让墙体醒目
                    emissive: 0x440000,
                    side: THREE.DoubleSide
                });

// 创建网格对象
                const tube = new THREE.Mesh(geometry, material);

                tube.castShadow = true;
                tube.layers.set(i + 1);

                glScene.add(tube);
                segments.push(tube);


            }


        }

        return segments;


    })


    resetLayerControls(true);

    function projectGeoPointsTo3D(stop) {

        var location_2D = projectOverijs(stop);
        //console.log(location_2D)

        var point = new THREE.Vector3(0, 0, 0);

        //point.x = location_2D[0] - graphics3D.map_length / 2; // 向右移动1个单位
        //point.y = graphics3D.map_width / 2 - location_2D[1]; // 向下移动2个单位
        //point.z = 3;


        point.x = location_2D[0] - graphics3D.map_length + graphics3D.map_length / 4;
        point.y = graphics3D.map_width - location_2D[1] + graphics3D.map_width / 4;
        point.z = 3;


        return point;
    }

    //console.log(meshes);

}

async function createFlows_particles_speed() {

    console.log("Array.isArray(meshes) && meshes.some(Array.isArray)",
        Array.isArray(meshes) && meshes.some(Array.isArray));
    //判断是否二维
    if (Array.isArray(meshes) && meshes.some(Array.isArray)) {
        meshes = meshes.flat();
        meshes.forEach(mesh => glScene.remove(mesh));
    } else {
        meshes.forEach(mesh => glScene.remove(mesh));
    }

    flying_balls.forEach(ball => glScene.remove(ball.mesh));
    flying_balls = [];

    meshes = await dataOverijsselMigration.map(function (flows, i) {


        let segments = [];

        for (var j = 1; j < flows.length - 1; j++) {

            var flowValue = dataOverijsselMigration[i][j];

            if (flowValue != 0) {

                var startPoint = citiesOverisj_locations.get(citiesList[i]);
                var endPoint = citiesOverisj_locations.get(citiesList[j]);


                const pointA = new THREE.Vector3(startPoint[0], startPoint[1], 0);
                const pointB = new THREE.Vector3(endPoint[0], endPoint[1], 0);

                //console.log(pointA, pointB)
                const distance = pointA.distanceTo(pointB);

                // 计算中点
                const midpoint_flat = new THREE.Vector3().addVectors(pointA, pointB).multiplyScalar(0.5);
                const zHeight_arc = (distance / 2 + 2) * 0.8;
                const midpoint = new THREE.Vector3(midpoint_flat.x, midpoint_flat.y, zHeight_arc);
                const curve = new THREE.CatmullRomCurve3([pointA, midpoint, pointB]);

                let color = globalDivers_ColorScale(i);
                let color_path = "#676161";

                //create tube objects
                const tubularSegments = 32; // 沿曲线方向的细分数
                const radius = 1;
                //const radius = globalMigrationScale_clean(flowValue);           // 管道半径
                const radialSegments = 8;  // 管道横截面的细分数
                const closed = false;      // 管道两端是否闭合
                const geometry = new THREE.TubeGeometry(curve, tubularSegments, radius, radialSegments, closed);
                const material = new THREE.MeshLambertMaterial({
                    color: color_path, // 让墙体醒目
                    emissive: 0x440000,
                    side: THREE.DoubleSide
                });

                const tube = new THREE.Mesh(geometry, material);
                tube.castShadow = true;
                tube.layers.set(i + 1);

                glScene.add(tube);
                segments.push(tube);

                flying_balls.push({
                    mesh: createSphere(color, pointA),
                    curve: curve,
                    speed: 0.002 * globalMigrationScale_overijs(flowValue),
                    progress: 0,
                    layer: i + 1
                });

            }


        }

        return segments;


    });

    flying_balls.forEach(ball => {

        //console.log(ball.layer)
        glScene.add(ball.mesh);
        ball.mesh.layers.set(ball.layer)
    });


    function createSphere(color, point) {
        const geometry = new THREE.SphereGeometry(20, 16, 16);
        const material = new THREE.MeshLambertMaterial({color});
        return new THREE.Mesh(geometry, material);
    }

    resetLayerControls(true);

    function projectGeoPointsTo3D(stop) {

        var location_2D = graphics3D.projection(stop);

        var point = new THREE.Vector3(0, 0, 0);

        point.x = location_2D[0] - graphics3D.map_length / 2; // 向右移动1个单位
        point.y = graphics3D.map_width / 2 - location_2D[1]; // 向下移动2个单位
        point.z = 3;

        return point;
    }

    //console.log(meshes);

}

async function createFlows_particles_frequency() {

    console.log("Array.isArray(meshes) && meshes.some(Array.isArray)",
        Array.isArray(meshes) && meshes.some(Array.isArray));
    //判断是否二维
    if (Array.isArray(meshes) && meshes.some(Array.isArray)) {
        meshes = meshes.flat();
        meshes.forEach(mesh => glScene.remove(mesh));
    } else {
        meshes.forEach(mesh => glScene.remove(mesh));
    }

    flying_balls.forEach(ball => glScene.remove(ball.mesh));
    flying_balls = [];

    meshes = await dataOverijsselMigration.map(function (flows, i) {


        let segments = [];

        for (var j = 1; j < flows.length - 1; j++) {


            var flowValue = dataOverijsselMigration[i][j];

            if (flowValue != 0) {


                var startPoint = citiesOverisj_locations.get(citiesList[i]);
                var endPoint = citiesOverisj_locations.get(citiesList[j]);


                const pointA = new THREE.Vector3(startPoint[0], startPoint[1], 0);
                const pointB = new THREE.Vector3(endPoint[0], endPoint[1], 0);

                //console.log(pointA, pointB)
                const distance = pointA.distanceTo(pointB);

                // 计算中点
                const midpoint_flat = new THREE.Vector3().addVectors(pointA, pointB).multiplyScalar(0.5);
                const zHeight_arc = (distance / 2 + 2) * 0.8;
                const midpoint = new THREE.Vector3(midpoint_flat.x, midpoint_flat.y, zHeight_arc);
                const curve = new THREE.CatmullRomCurve3([pointA, midpoint, pointB]);

                let color = globalDivers_ColorScale(i);
                let color_path = "#676161";

                //create tube objects
                const tubularSegments = 32; // 沿曲线方向的细分数
                const radius = 1;
                //const radius = globalMigrationScale_clean(flowValue);           // 管道半径
                const radialSegments = 8;  // 管道横截面的细分数
                const closed = false;      // 管道两端是否闭合
                const geometry = new THREE.TubeGeometry(curve, tubularSegments, radius, radialSegments, closed);
                const material = new THREE.MeshLambertMaterial({
                    color: color_path, // 让墙体醒目
                    emissive: 0x440000,
                    side: THREE.DoubleSide
                });

                const tube = new THREE.Mesh(geometry, material);
                tube.castShadow = true;
                tube.layers.set(i + 1);

                glScene.add(tube);
                segments.push(tube);

                // create numbers sphere
                var count = globalMigrationScale_clean_order_overijs(flowValue)
                //console.log("count", count);
                for (let j = 0; j < count; j++) {
                    const progress = j / count; // 均匀分布小球
                    flying_balls.push({
                        mesh: createSphere(color, pointA),
                        curve: curve,
                        speed: 0.005,
                        progress: progress,
                        layer: i + 1
                    });
                }

            }
        }

        return segments;


    });

    flying_balls.forEach(ball => {

        //console.log(ball.layer)
        glScene.add(ball.mesh);
        ball.mesh.layers.set(ball.layer)
    });


    function createSphere(color, point) {
        const geometry = new THREE.SphereGeometry(20, 16, 16);
        const material = new THREE.MeshLambertMaterial({color});
        return new THREE.Mesh(geometry, material);
    }

    resetLayerControls(true);

    function projectGeoPointsTo3D(stop) {

        var location_2D = graphics3D.projection(stop);

        var point = new THREE.Vector3(0, 0, 0);

        point.x = location_2D[0] - graphics3D.map_length / 2; // 向右移动1个单位
        point.y = graphics3D.map_width / 2 - location_2D[1]; // 向下移动2个单位
        point.z = 3;

        return point;
    }

    //console.log(meshes);

}

async function createFlows_particles_speed_2D() {

    console.log("Array.isArray(meshes) && meshes.some(Array.isArray)",
        Array.isArray(meshes) && meshes.some(Array.isArray));
    //判断是否二维
    if (Array.isArray(meshes) && meshes.some(Array.isArray)) {
        meshes = meshes.flat();
        meshes.forEach(mesh => glScene.remove(mesh));
    } else {
        meshes.forEach(mesh => glScene.remove(mesh));
    }

    flying_balls.forEach(ball => glScene.remove(ball.mesh));
    flying_balls = [];

    meshes = await dataOverijsselMigration.map(function (flows, i) {


        let segments = [];

        for (var j = 1; j < flows.length - 1; j++) {


            var flowValue = dataOverijsselMigration[i][j];

            if (flowValue != 0) {


                var startPoint = citiesOverisj_locations.get(citiesList[i]);
                var endPoint = citiesOverisj_locations.get(citiesList[j]);


                const pointA = new THREE.Vector3(startPoint[0], startPoint[1], 0);
                const pointB = new THREE.Vector3(endPoint[0], endPoint[1], 0);
                //const pointD = projectGeoPointsTo3D(D.geometry.coordinates);

                //console.log(pointA, pointB)
                const distance = pointA.distanceTo(pointB);

                // 计算中点
                const midpoint_flat = new THREE.Vector3().addVectors(pointA, pointB).multiplyScalar(0.5);
                const zHeight_arc = (distance / 2 + 2) * 0.8;
                const midpoint = new THREE.Vector3(midpoint_flat.x, midpoint_flat.y, zHeight_arc);
                const curve = new THREE.CatmullRomCurve3([pointA, pointB]);

                let color = globalDivers_ColorScale(i);
                let color_path = "#676161";

                //create tube objects
                const tubularSegments = 32; // 沿曲线方向的细分数
                const radius = 1;
                //const radius = globalMigrationScale_clean(flowValue);           // 管道半径
                const radialSegments = 8;  // 管道横截面的细分数
                const closed = false;      // 管道两端是否闭合
                const geometry = new THREE.TubeGeometry(curve, tubularSegments, radius, radialSegments, closed);
                const material = new THREE.MeshLambertMaterial({
                    color: color_path, // 让墙体醒目
                    emissive: 0x440000,
                    side: THREE.DoubleSide
                });

                const tube = new THREE.Mesh(geometry, material);
                tube.castShadow = true;
                tube.layers.set(i + 1);

                glScene.add(tube);
                segments.push(tube);

                flying_balls.push({
                    mesh: createSphere(color, pointA),
                    curve: curve,
                    speed: 0.002 * globalMigrationScale_overijs(flowValue),
                    progress: 0,
                    layer: i + 1
                });

            }


        }

        return segments;


    });

    flying_balls.forEach(ball => {

        //console.log(ball.layer)
        glScene.add(ball.mesh);
        ball.mesh.layers.set(ball.layer)
    });


    function createSphere(color, point) {
        const geometry = new THREE.SphereGeometry(20, 16, 16);
        const material = new THREE.MeshLambertMaterial({color});
        return new THREE.Mesh(geometry, material);
    }

    resetLayerControls(true);

    function projectGeoPointsTo3D(stop) {

        var location_2D = graphics3D.projection(stop);

        var point = new THREE.Vector3(0, 0, 0);

        point.x = location_2D[0] - graphics3D.map_length / 2; // 向右移动1个单位
        point.y = graphics3D.map_width / 2 - location_2D[1]; // 向下移动2个单位
        point.z = 3;

        return point;
    }

    //console.log(meshes);

}

async function createFlows_particles_frequency_2D() {

    console.log("Array.isArray(meshes) && meshes.some(Array.isArray)",
        Array.isArray(meshes) && meshes.some(Array.isArray));
    //判断是否二维
    if (Array.isArray(meshes) && meshes.some(Array.isArray)) {
        meshes = meshes.flat();
        meshes.forEach(mesh => glScene.remove(mesh));
    } else {
        meshes.forEach(mesh => glScene.remove(mesh));
    }

    flying_balls.forEach(ball => glScene.remove(ball.mesh));
    flying_balls = [];

    meshes = await dataOverijsselMigration.map(function (flows, i) {


        let segments = [];

        for (var j = 1; j < flows.length - 1; j++) {


            var flowValue = dataOverijsselMigration[i][j];

            if (flowValue != 0) {

                var startPoint = citiesOverisj_locations.get(citiesList[i]);
                var endPoint = citiesOverisj_locations.get(citiesList[j]);


                const pointA = new THREE.Vector3(startPoint[0], startPoint[1], 0);
                const pointB = new THREE.Vector3(endPoint[0], endPoint[1], 0);
                //console.log(pointA, pointB)
                const distance = pointA.distanceTo(pointB);

                // 计算中点
                const midpoint_flat = new THREE.Vector3().addVectors(pointA, pointB).multiplyScalar(0.5);
                const zHeight_arc = (distance / 2 + 2) * 0.8;
                const midpoint = new THREE.Vector3(midpoint_flat.x, midpoint_flat.y, zHeight_arc);
                const curve = new THREE.CatmullRomCurve3([pointA, pointB]);

                let color = globalDivers_ColorScale(i);
                let color_path = "#676161";

                //create tube objects
                const tubularSegments = 32; // 沿曲线方向的细分数
                const radius = 1;
                //const radius = globalMigrationScale_clean(flowValue);           // 管道半径
                const radialSegments = 8;  // 管道横截面的细分数
                const closed = false;      // 管道两端是否闭合
                const geometry = new THREE.TubeGeometry(curve, tubularSegments, radius, radialSegments, closed);
                const material = new THREE.MeshLambertMaterial({
                    color: color_path, // 让墙体醒目
                    emissive: 0x440000,
                    side: THREE.DoubleSide
                });

                const tube = new THREE.Mesh(geometry, material);
                tube.castShadow = true;
                tube.layers.set(i + 1);

                glScene.add(tube);
                segments.push(tube);

                // create numbers sphere
                var count = globalMigrationScale_clean_order_overijs(flowValue)
                //console.log("count", count);
                for (let j = 0; j < count; j++) {
                    const progress = j / count; // 均匀分布小球
                    flying_balls.push({
                        mesh: createSphere(color, pointA),
                        curve: curve,
                        speed: 0.005,
                        progress: progress,
                        layer: i + 1
                    });
                }

            }


        }

        return segments;


    });

    flying_balls.forEach(ball => {

        //console.log(ball.layer)
        glScene.add(ball.mesh);
        ball.mesh.layers.set(ball.layer)
    });


    function createSphere(color, point) {
        const geometry = new THREE.SphereGeometry(20, 16, 16);
        const material = new THREE.MeshLambertMaterial({color});
        return new THREE.Mesh(geometry, material);
    }

    resetLayerControls(true);

    function projectGeoPointsTo3D(stop) {

        var location_2D = graphics3D.projection(stop);

        var point = new THREE.Vector3(0, 0, 0);

        point.x = location_2D[0] - graphics3D.map_length / 2; // 向右移动1个单位
        point.y = graphics3D.map_width / 2 - location_2D[1]; // 向下移动2个单位
        point.z = 3;

        return point;
    }

    //console.log(meshes);

}


function drawLinesOnPlane(vertices, troops, temperatures, coor) {
    var vertex, geometry, material, mesh;
    var max = d3.max(troops);
    var min = d3.min(troops);

    //set the range of troops
    var trooplinear = d3.scaleLinear([min, max], [2, 20]);
    var temperaturelinear = d3.scaleLinear([d3.min(temperatures), d3.max(temperatures)], ["blue", "red"]);

    var segments = new THREE.Object3D();
    vertices = vertices.map(convert2D);

    var pointlast1 = new THREE.Vector2(vertices[0].x, vertices[0].y);
    var pointlast2 = new THREE.Vector2(vertices[0].x, vertices[0].y);

    for (var i = 0, len = vertices.length; i < len - 2; i++) {
        var color = temperaturelinear(temperatures[i]);
        vertex = vertices[i];

        var vector1 = new THREE.Vector2(vertices[i + 1].x - vertices[i].x, vertices[i + 1].y - vertices[i].y);
        var angle1 = vector1.angle();

        var vector2 = new THREE.Vector2(vertices[i + 2].x - vertices[i + 1].x, vertices[i + 2].y - vertices[i + 1].y);
        var angle2 = vector2.angle();


        var angle = 0.5 * (angle1 + angle2);


        var angleX = Math.sin(angle);
        var angleY = Math.cos(angle);

        var pointtemp1 = new THREE.Vector2(vertices[i + 1].x - trooplinear(troops[i + 1]) / 2 * angleX,
            vertices[i + 1].y + trooplinear(troops[i + 1]) / 2 * angleY);
        var pointtemp2 = new THREE.Vector2(vertices[i + 1].x + trooplinear(troops[i + 1]) / 2 * angleX,
            vertices[i + 1].y - trooplinear(troops[i + 1]) / 2 * angleY);


        if (pointtemp1.y < pointtemp2.y) {
            var point = pointtemp1;
            pointtemp1 = pointtemp2;
            pointtemp2 = point;

        }
        if (pointlast1.y < pointlast2.y) {
            var point = pointtemp1;
            pointlast1 = pointlast2;
            pointlast2 = point;

        }

        var point1 = pointlast1,
            point2 = pointtemp1,
            point3 = pointtemp2,
            point4 = pointlast2;

        if (point1.x < point2.x && point3.x < point4.x) {
            //console.log("point3.x < point4.x happend");
            var pointtt = point3;
            point3 = point4;
            point4 = pointtt;
        } else if (point1.x > point2.x && point3.x > point4.x) {
            //console.log("point3.x < point4.x happend");
            var pointtt = point3;
            point3 = point4;
            point4 = pointtt;
        }


        var californiaPts = [];
        californiaPts.push(point1);
        californiaPts.push(point2);
        californiaPts.push(point3);
        californiaPts.push(point4);

        var flowShape = new THREE.Shape(californiaPts);
        var geometry = new THREE.ShapeGeometry(flowShape);


        var mesh = new THREE.Mesh(geometry, new THREE.MeshPhongMaterial({
            color: color, side: THREE.DoubleSide, transparent: true,
            opacity: 0.6
        }));
        mesh.position.z = 5;
        segments.add(mesh);

        pointlast1 = pointtemp1;
        pointlast2 = pointtemp2;

    }


    for (var i = 0, len = vertices.length; i < len - 2; i++) {
        var color = temperaturelinear(temperatures[i]);
        vertex = vertices[i];

        var vectorthis = new THREE.Vector2(vertices[i + 1].x - vertices[i].x, vertices[i + 1].y - vertices[i].y);
        var angle = vectorthis.angle();
        var angleX = Math.sin(angle);
        var angleY = Math.cos(angle);

        var californiaPts = [];
        californiaPts.push(new THREE.Vector2(vertices[i].x - trooplinear(troops[i]) / 2 * angleX,
            vertices[i].y + trooplinear(troops[i]) / 2 * angleY));
        californiaPts.push(new THREE.Vector2(vertices[i + 1].x - trooplinear(troops[i + 1]) / 2 * angleX,
            vertices[i + 1].y + trooplinear(troops[i + 1]) / 2 * angleY));
        //californiaPts.push( new THREE.Vector2 ( vertices[i+2].x - trooplinear(troops[i+2])/2 * angleX,
        //                                        vertices[i+2].y + trooplinear(troops[i+2])/2 * angleY ) );
        //californiaPts.push( new THREE.Vector2 ( vertices[i+2].x + trooplinear(troops[i+2])/2 * angleX,
        //                                        vertices[i+2].y - trooplinear(troops[i+2])/2 * angleY ) );
        californiaPts.push(new THREE.Vector2(vertices[i + 1].x + trooplinear(troops[i + 1]) / 2 * angleX,
            vertices[i + 1].y - trooplinear(troops[i + 1]) / 2 * angleY));
        californiaPts.push(new THREE.Vector2(vertices[i].x + trooplinear(troops[i]) / 2 * angleX,
            vertices[i].y - trooplinear(troops[i]) / 2 * angleY));

        var flowShape = new THREE.Shape(californiaPts);
        var geometry = new THREE.ShapeGeometry(flowShape);
        var mesh = new THREE.Mesh(geometry, new THREE.MeshPhongMaterial({
            color: color, side: THREE.DoubleSide, transparent: true,
            opacity: 0.6
        }));
        mesh.position.z = 5;
        segments.add(mesh);

    }

    return segments;
}

//-------------create interaction components-------------

function resetLayerControls(switchCheckbox) {
    if (switchCheckbox) {
        dataOverijssel.cities.forEach((d, i) => {
            var checkboxID = "#checkbox-" + i;
            //console.log("checkboxID",checkboxID);
            d3.select(checkboxID).property('checked', true);
            camera.layers.enable(i + 1);
        })

    } else {
        //console.log("resetLayerControls switchCheckbox", switchCheckbox)
        dataOverijssel.cities.forEach((d, i) => {
            var checkboxID = "#checkbox-" + i;
            d3.select(checkboxID).property('checked', false);
            camera.layers.disable(i + 1);
        })
    }
}

function updateVisualizationMethods(selectedMethod) {
    //console.log(selectedMethod);
    if (selectedMethod == "wall") {
        createFlows_3DWall();
    } else if (selectedMethod == "wall_2D") {
        createFlows_2DWall();
    } else if (selectedMethod == "arcs") {
        createFlows_arc();
    } else if (selectedMethod == "particles") {
        createFlows_particles_speed();
    } else if (selectedMethod == "particles_speed") {
        createFlows_particles_speed();
    } else if (selectedMethod == "particles_frequency") {
        createFlows_particles_frequency();
    } else if (selectedMethod == "particles_speed_2D") {
        createFlows_particles_speed_2D();
    } else if (selectedMethod == "particles_frequency_2D") {
        createFlows_particles_frequency_2D();
    }

}

function update() {
    controls.update();
    cssRenderer.render(cssScene, camera);
    glRenderer.render(glScene, camera);
    requestAnimationFrame(update);
}

function animate() {
    requestAnimationFrame(animate);

    flying_balls.forEach(ball => {
        ball.progress += ball.speed;
        if (ball.progress > 1) ball.progress = 0;
        const position = ball.curve.getPointAt(ball.progress);
        ball.mesh.position.set(position.x, position.y, position.z);
    });

    glRenderer.render(glScene, camera);
}
