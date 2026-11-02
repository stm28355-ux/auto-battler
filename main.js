const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

let last = performance.now();

function update(dt) {
  // ゲームの状態更新をここに書く
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#e8e8e8';
  ctx.font = '24px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Hello, Auto Battler!', canvas.width / 2, canvas.height / 2);
}

function loop(now) {
  const dt = (now - last) / 1000;
  last = now;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
