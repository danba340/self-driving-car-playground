let randomization = getRandomization()
const SENSOR_COUNT = getSensorCount()
const SENSOR_ANGLE = getSensorAngle()
const SENSOR_LENGTH = getSensorLength()
const IS_PORTRAIT = window.innerHeight > window.innerWidth
const CANVAS_WIDTH = IS_PORTRAIT ? 300 : 300;
const carWidth = CANVAS_WIDTH / (CANVAS_WIDTH / 60)
const carHeight = carWidth * 1.56
let hasShownWin = false

const carCanvas = document.getElementById("carCanvas");
carCanvas.width = CANVAS_WIDTH;
const networkCanvas = document.getElementById("networkCanvas");
networkCanvas.width = IS_PORTRAIT ? 0 : 300;

const randomizationSelect = document.getElementById('randomization')
const sensorCountSelect = document.getElementById('sensors')
const sensorAngleSelect = document.getElementById('sensor-angle')
const sensorLengthSelect = document.getElementById('sensor-length')
randomizationSelect.value = randomization
randomizationSelect.onchange = (e) => {
    setRandomization(parseFloat(e.target.value))
    start()
}
sensorCountSelect.value = SENSOR_COUNT
sensorCountSelect.onchange = (e) => {
    setSensorCount(parseInt(e.target.value))
    discard()
}
sensorAngleSelect.value = SENSOR_ANGLE
sensorAngleSelect.onchange = (e) => {
    setSensorAngle(parseInt(e.target.value))
    discard()
}
sensorLengthSelect.value = SENSOR_LENGTH
sensorLengthSelect.onchange = (e) => {
    setSensorLength(parseInt(e.target.value))
    discard()
}
const progressEl = document.getElementById('progress');

const generations = getGenerations()
const generationsEl = document.getElementById('generation')
generationsEl.innerText = generations

const carCtx = carCanvas.getContext("2d");
const networkCtx = networkCanvas.getContext("2d");

const road = new Road(carCanvas.width / 2, carCanvas.width * 0.9);

const N = 100;

// VARS
let cars = []
let bestCar = null
let traffic = []

function start() {
    randomization = getRandomization()
    cars = generateCars(N);
    bestCar = cars[0];
    if (localStorage.getItem("bestBrain")) {
        for (let i = 0; i < cars.length; i++) {
            cars[i].brain = JSON.parse(
                localStorage.getItem("bestBrain"));

            if (i != 0) {
                NeuralNetwork.mutate(cars[i].brain, randomization);
            }
        }
    }

    traffic = getTraffic()

}
start()
animate();

function save() {
    localStorage.setItem("bestBrain",
        JSON.stringify(bestCar.brain));
    addGeneraton()
    start()
}

function resetGenerations() {
    localStorage.setItem("generations",
        1);
    generationsEl.innerText = '1'
}

function addGeneraton() {
    let current = localStorage.getItem("generations") || 1;
    localStorage.setItem("generations", parseInt(current) + 1);
    generationsEl.innerText = parseInt(current) + 1
}

function getGenerations() {
    return localStorage.getItem("generations") || 1
}

function discard() {
    hasShownWin = false;
    localStorage.removeItem("bestBrain");
    resetGenerations()
    start()
}

function setRandomization(v) {
    localStorage.setItem("randomization", v);
}

function getRandomization() {
    return parseFloat(localStorage.getItem("randomization")) || 0.05
}

function setSensorCount(v) {
    localStorage.setItem("sensor-count", v);
}

function getSensorCount() {
    return parseInt(localStorage.getItem("sensor-count")) || 5
}

function setSensorAngle(v) {
    localStorage.setItem("sensor-angle", v);
}

function getSensorAngle() {
    return parseInt(localStorage.getItem("sensor-angle")) || 180
}

function setSensorLength(v) {
    localStorage.setItem("sensor-length", v);
}

function setTraffic(v) {
    localStorage.setItem("traffic", JSON.stringify(v));
}

function getTraffic(v) {
    let trafficTemplate = localStorage.getItem('traffic')
    if (trafficTemplate) {
        return templateToTraffic(JSON.parse(trafficTemplate))
    }
    trafficTemplate = generateTrafficTemplate(20)
    setTraffic(trafficTemplate)
    return templateToTraffic(trafficTemplate)
}

function getSensorLength() {
    return parseInt(localStorage.getItem("sensor-length")) || 150
}

function generateCars(N) {
    const cars = [];
    for (let i = 1; i <= N; i++) {
        cars.push(new Car(road.getLaneCenter(1), 100, carWidth, carHeight, "AI", CANVAS_WIDTH / 75, getRandomColor()));
    }
    return cars;
}

function templateToTraffic(template) {
    return template.map(({ lane, y }) => {
        return new Car(road.getLaneCenter(lane), y, carWidth, carHeight, "DUMMY", CANVAS_WIDTH / 200, getRandomColor())
    })
}

function newTraffic() {
    const trafficTemplate = generateTrafficTemplate(20)
    setTraffic(trafficTemplate)
    start()
}

function generateTrafficTemplate(rows) {
    const variants = [
        [1],
        [0, 1],
        [0, 2],
        [1, 2],
    ]
    const startY = -100
    const traffic = [];
    for (let i = 0; i < rows; i++) {
        const y = startY - i * 400
        const variant = variants[Math.floor(Math.random() * variants.length)]
        for (const lane of variant) {
            traffic.push({ lane, y })
        }
    }
    return traffic
}

function animate(time) {
    for (let i = 0; i < traffic.length; i++) {
        traffic[i].update(road.borders, []);
    }
    for (let i = 0; i < cars.length; i++) {
        cars[i].update(road.borders, traffic);
    }
    const carsNotInMiddle = cars.filter(c => true)//c.x !== CANVAS_WIDTH / 2)

    bestCar = carsNotInMiddle.find(
        c => c.y == Math.min(
            ...carsNotInMiddle.map(c => c.y)
        )) || cars[0]

    carCanvas.height = window.innerHeight;
    networkCanvas.height = window.innerHeight;

    carCtx.save();
    carCtx.translate(0, -bestCar.y + carCanvas.height * 0.7);

    road.draw(carCtx);
    for (let i = 0; i < traffic.length; i++) {
        traffic[i].draw(carCtx);
    }
    carCtx.globalAlpha = 0.2;
    for (let i = 0; i < cars.length; i++) {
        cars[i].draw(carCtx);
    }
    carCtx.globalAlpha = 1;


    networkCtx.lineDashOffset = -time / 50;
    bestCar.draw(carCtx, true);
    Visualizer.drawNetwork(networkCtx, bestCar.brain);
    const lastTrafficCar = traffic[traffic.length - 1]
    if (bestCar.y < lastTrafficCar.y && !hasShownWin) {
        const generations = localStorage.getItem("generations")
        alert(`Your generation ${generations} is self driving 🚗`)
        hasShownWin = true
    }
    const progress = Math.min(bestCar.y / lastTrafficCar.y, 1) * 100
    progressEl.style.width = `${progress}%`
    carCtx.restore();

    requestAnimationFrame(animate);
}

document.onkeydown = (event) => {
    if (event.key === "r") {
        start();
    }
    if (event.key === "c") {
        discard()
    }
    if (event.key === "s") {
        save()
    }
}