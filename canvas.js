var canvas = document.createElement('canvas');
canvas.id = 'canvas';
var width = window.innerWidth;
var height = window.innerHeight;
canvas.width = width - 200;
canvas.height = height - 37;
document.getElementById('canvas1').appendChild(canvas);
var ctx = canvas.getContext('2d');
