import { createInput } from './input.js';
import {
  getMap,
  hitWall as hitWallState,
  setLegend as setLegendState,
  setMap as setMapState,
} from './map-state.js';
import { getTextureForMaterial } from './materials.js';
import { castRays } from './raycaster.js';

var pendingSpawn = null;

export function setMap(newMap){
  setMapState(newMap);
}

export function setSpawn(spawn){
  if (!spawn || typeof spawn !== 'object') return;
  if (typeof player === 'undefined') {
    pendingSpawn = spawn;
    return;
  }
  if (typeof spawn.x === 'number') player.x = spawn.x;
  if (typeof spawn.y === 'number') player.y = spawn.y;
  if (typeof spawn.rot === 'number') player.rot = spawn.rot;
}

export function setLegend(newLegend){
  setLegendState(newLegend);
}

window.setMap = setMap;
window.setSpawn = setSpawn;
window.setLegend = setLegend;

// Логические размеры канваса (в CSS-пикселях). При HiDPI canvas.width/height
// могут быть больше, поэтому движок должен опираться на "логический" размер.
function getViewWidth(){
  return (typeof window.canvasCssWidth === 'number') ? window.canvasCssWidth : canvas.width;
}

function getViewHeight(){
  return (typeof window.canvasCssHeight === 'number') ? window.canvasCssHeight : canvas.height;
}

var previousTime = Date.now(); //фремя предыдущего кадра
var lag = 0.0; //задержка между временем
var MS_PER_UPDATE = 1000 / 60; //фпс

var rayc = function() {
  var currentTime = Date.now(); //время текущего кадрв
  var elapsedTime = currentTime - previousTime; //разница между временем кадров
  previousTime = currentTime; //при обновлении время текущего кадра становится предыдущим
  lag += elapsedTime; //суммируем лаги

  // deltaTime в секундах. Дальше используем коэффициент (dt * 60),
  // чтобы сохранить ощущение скорости как раньше при 60 FPS.
  var dt = elapsedTime / 1000;

  processInput(dt); //запуск движения

  //следующий код является по идее костылём от лагов, но он недопилен
  while (lag >= MS_PER_UPDATE) { //пока лагов больше чем фпс(то есть пока тормозит)
    update(); //заглушка которая фиксит тормоза - обновлялка кадров
    lag -= MS_PER_UPDATE; //уменьшаем лаги
  }

  render(lag / MS_PER_UPDATE); //запускаем рендер

  requestAnimationFrame(rayc);//Запускаем отрисовку
  //код спизжен отсбда: http://html5.by/blog/what-is-requestanimationframe/
}

function update(){} //Заглушка

var player={
    x : 46, //Координаты игрока
    y : 7,
    mov : 0, //движение: 1 - вперёд, -1 назад, 0 - стоим на месте(для клавиш)
    dir : 0, //Повороты: 1 - вправо, -1 - влево, 0 - стоим на месте(тоже дял клавиш)
    rot : -1.5, //угол поворота камеры в начале
    speed: 0.05, //скорость движения камеры
    sprint: 0, //бег: 1 - бежим, 0 - идём(придумал Дугар)
    sprintFactor: 2, //коэфициент увеличения движения при беге
    rotSpeed: 2 * Math.PI / 180, //скорость поворотов
    fov : 60 * Math.PI / 180, //Угол обзора(тут косяк с фишаем)
    flatmap : 0,
  };  

if (pendingSpawn) {
  setSpawn(pendingSpawn);
  pendingSpawn = null;
}

var input = createInput({
  onToggleMap: function () {
    player.flatmap = player.flatmap ? 0 : 1;
  },
});

function processInput(dt){
  // Считываем состояние управления из keysDown и заполняем поля player,
  // чтобы остальная логика движения оставалась прежней.
  player.mov = (input.isDown('KeyW') || input.isDown('ArrowUp')) ? 1 : ((input.isDown('KeyS') || input.isDown('ArrowDown')) ? -1 : 0);
  player.dir = (input.isDown('KeyA') || input.isDown('ArrowLeft')) ? 1 : ((input.isDown('KeyD') || input.isDown('ArrowRight')) ? -1 : 0);
  player.sprint = input.isDown('ShiftLeft') || input.isDown('ShiftRight') ? 1 : 0;

  // Масштабируем движение/поворот по времени, чтобы скорость не зависела от FPS.
  // При 60 FPS коэффициент примерно равен 1 (dt ~ 1/60).
  var timeScale = dt * 60;

  var step = player.mov * player.speed * (player.sprint +1) * player.sprintFactor * timeScale; //шаг вперёд или назад
  var rotStep = player.dir * player.rotSpeed * timeScale; //поворот при шаге
  
  player.rot = addRotToAngle(rotStep, player.rot); //И получаем направление куда направлена камера

  var xNew = player.x + step * Math.cos(player.rot); //расчитываем новые координаты игрока
  var yNew = player.y - step * Math.sin(player.rot); 
  
  
  if (!(hitWallState(xNew, yNew))){  //Если тут не стенка
    player.x = xNew;  //Делаем шаг туда
    player.y = yNew;
  }
}

function addRotToAngle(rot, angle){ //Функция нормализирования угла(Этого не хватало в сишной версии движка)
  //Это что-то типа (pos+dir) в сишной версии
  var newAngle = angle + rot; //Итоговый угол получается из суммы угла начального и угла полученого после поворота
  //Если получившийся угол:
  if (newAngle < 0){ //отрицательным, то
    return newAngle + 360 * Math.PI /180; //поворачиваем его на 2*Pi по часовой
  }   
  if (newAngle > 360 * Math.PI / 180){ //положительным, то
    return newAngle - 360 * Math.PI /180; //поворачиваем его на 2*Pi против часовой
  }
  return newAngle;
}

function render(){ //Рендеринг состоит из трёх шагов:
  drawBackground(); //Рисуем пол и потолок
  castRays({ player, getViewWidth, addRotToAngle, drawRay }); //Бросаем лучи и отрисовываем стены
  if(player.flatmap) drawMap(); //Отрисовываем плоскую карту 
}

function drawBackground(){  
  var w = getViewWidth();
  var h = getViewHeight();

  ctx.clearRect(0, 0, w, h); //потолок 
  ctx.fillStyle = '#E3E3E1'; //цвет извести
  ctx.fillRect(0, 0, w, h /2); //пол
  ctx.fillStyle = '#858585'; //Цвет линолеума 
  ctx.fillRect(0, h /2, w, h /2); //поправка на углы
}

function drawRay(dist, x, offset, img) {   //отрисовываем то что получилось 
  var viewWidth = getViewWidth();
  var viewHeight = getViewHeight();
  var distanceProjectionPlane = (viewWidth /2) / Math.tan((player.fov /2)); //расстояние до плоскости проекции(читать "до экрана")
  var sliceHeight = 1 / dist * distanceProjectionPlane; //Высота данной текстуры

  var texture = getTextureForMaterial(img);
  if (!texture) return;
  // Берём целую колонку из текстуры, чтобы избежать размазывания (интерполяции).
  var texX = Math.floor(offset * 512);
  if (texX < 0) texX = 0;
  if (texX > 511) texX = 511;
  ctx.drawImage(texture, texX, 0, 1, 512, x, (viewHeight /2) - (sliceHeight /2), 1, sliceHeight);

}

function drawMap(){ //функция отрисовки маленькой плоской копии карты
  //ну я думаю, тут очевидно всё - просто на белом прямоугольнике чёрным рисуем стенки и красной точкой обозначаем положение камеры
  var map = getMap();
  if (!map) return;

  ctx.clearRect(0, 0, map[0].length*5, map.length*5);
  ctx.fillStyle = 'rgb(255, 0, 0)';
  ctx.fillRect(player.x*5 -1, player.y*5 -1, 2, 2);
  
  for (var y=0; y<map.length; y++){
    for (var x=0; x<map[y].length; x++){
      if (map[y][x] > 0){
        ctx.fillStyle = 'rgb(0, 0, 0)';
        ctx.fillRect(x*5, y*5, 5, 5);
      }   
    }
  }

}

export function startRayc(){
  if (window.__raycStarted) return;
  window.__raycStarted = true;
  input.bind();
  requestAnimationFrame(rayc);
}

window.startRayc = startRayc;