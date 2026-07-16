const canvas = document.querySelector('#toyCanvas');
const ctx = canvas.getContext('2d');
const upload = document.querySelector('#imageUpload');
const springImage = new Image();
springImage.src = 'assets/spring.png';
const uploadedCharacterScale = 1.5;
const characterDisplaySize = 285;

let w = 0, h = 0, dpr = 1;
let characterImage = null;
let characterObjectUrl = null;
let dragging = false;
let pointerId = null;
let grabOffset = 0;
let targetY = 0;
let positionY = 0;
let velocity = 0;
let targetX = 0;
let positionX = 0;
let sideVelocity = 0;
let grabOffsetX = 0;
let pressX = 0;
let pressY = 0;
let draggedDistance = 0;
let lastTime = performance.now();

const spring = { x: 0, floorY: 0, restHeight: 205, minHeight: 48, maxHeight: 410, width: 150 };

function resize() {
  const rect = canvas.getBoundingClientRect();
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  w = rect.width; h = rect.height;
  canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  spring.x = w / 2; spring.floorY = h * .84;
  if (!positionY) positionY = spring.floorY - spring.restHeight;
  if (!positionX) positionX = spring.x;
  targetY = positionY;
  targetX = positionX;
}

function characterSize() {
  return characterDisplaySize;
}

function drawDefaultCharacter(x, y, size) {
  ctx.save(); ctx.translate(x, y);
  ctx.strokeStyle = '#363636'; ctx.lineWidth = Math.max(3, size*.017); ctx.lineJoin = 'round';
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.ellipse(-size*.23, -size*.43, size*.13, size*.42, -.28, 0, Math.PI*2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(size*.23, -size*.43, size*.13, size*.42, .28, 0, Math.PI*2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#ffd8df';
  ctx.beginPath(); ctx.ellipse(-size*.23, -size*.42, size*.052, size*.25, -.28, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(size*.23, -size*.42, size*.052, size*.25, .28, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.ellipse(0, 3, size*.48, size*.37, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#2e2e2e';
  ctx.beginPath(); ctx.arc(-size*.15, -size*.035, size*.027, 0, Math.PI*2); ctx.arc(size*.15, -size*.035, size*.027, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#f4aebe'; ctx.beginPath(); ctx.ellipse(-size*.29, size*.10, size*.078, size*.043, 0, 0, Math.PI*2); ctx.ellipse(size*.29, size*.10, size*.078, size*.043, 0, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#363636'; ctx.beginPath(); ctx.arc(0, size*.10, size*.010, 0, Math.PI*2); ctx.fill();
  ctx.restore();
}

function drawCharacter(topY) {
  const size = characterSize();
  const centerY = topY - size * .36;
  if (characterImage) {
    const ratio = characterImage.width / characterImage.height;
    const imgH = size * 1.35 * uploadedCharacterScale, imgW = imgH * ratio;
    ctx.drawImage(characterImage, positionX - imgW/2, topY - imgH + 14, imgW, imgH);
  } else drawDefaultCharacter(positionX, centerY, size);
}

function drawSpring(topY) {
  const height = spring.floorY - topY;
  ctx.save();
  ctx.globalAlpha = .16; ctx.fillStyle = '#222'; ctx.beginPath(); ctx.ellipse(spring.x, spring.floorY + 8, spring.width*.58, 13, 0, 0, Math.PI*2); ctx.fill();
  ctx.globalAlpha = 1;
  ctx.translate(spring.x, spring.floorY);
  ctx.scale(1, height / spring.restHeight);
  ctx.transform(1, 0, -(positionX - spring.x) / spring.restHeight, 1, 0, 0);
  if (springImage.complete && springImage.naturalWidth) {
    const sourceRatio = springImage.naturalWidth / springImage.naturalHeight;
    const drawH = spring.restHeight * 1.38, drawW = drawH * sourceRatio;
    ctx.drawImage(springImage, -drawW/2, -drawH, drawW, drawH);
  } else {
    ctx.strokeStyle = '#777'; ctx.lineWidth = 9;
    ctx.beginPath();
    for (let y = -18; y > -spring.restHeight; y -= 24) {
      ctx.moveTo(-spring.width*.33, y); ctx.quadraticCurveTo(0, y - 15, spring.width*.33, y - 24);
    }
    ctx.stroke();
  }
  ctx.restore();
}

function animate(time) {
  const dt = Math.min((time - lastTime) / 1000, .035); lastTime = time;
  if (!dragging) {
    const restTop = spring.floorY - spring.restHeight;
    const displacement = positionY - restTop;
    velocity += (-88 * displacement - 4.5 * velocity) * dt;
    positionY += velocity * dt;
    if (Math.abs(displacement) < .08 && Math.abs(velocity) < .08) { positionY = restTop; velocity = 0; }
    const sideDisplacement = positionX - spring.x;
    sideVelocity += (-62 * sideDisplacement - 3.4 * sideVelocity) * dt;
    positionX += sideVelocity * dt;
    if (Math.abs(sideDisplacement) < .08 && Math.abs(sideVelocity) < .08) { positionX = spring.x; sideVelocity = 0; }
  } else {
    positionY += (targetY - positionY) * Math.min(1, dt * 25);
    positionX += (targetX - positionX) * Math.min(1, dt * 25);
  }
  positionY = Math.max(spring.floorY - spring.maxHeight, Math.min(spring.floorY - spring.minHeight, positionY));
  positionX = Math.max(spring.x - spring.width*1.45, Math.min(spring.x + spring.width*1.45, positionX));
  ctx.clearRect(0, 0, w, h);
  drawSpring(positionY); drawCharacter(positionY);
  requestAnimationFrame(animate);
}

function pointerY(event) { return event.clientY - canvas.getBoundingClientRect().top; }
function pointerX(event) { return event.clientX - canvas.getBoundingClientRect().left; }
function characterHit(event) {
  const py = pointerY(event), size = characterSize();
  const imageRatio = characterImage ? characterImage.width / characterImage.height : 1;
  const imageHeight = characterImage ? size * 1.35 * uploadedCharacterScale : size * 1.35;
  const imageWidth = characterImage ? imageHeight * imageRatio : size;
  return py > positionY - imageHeight && py < positionY + 30 && Math.abs(pointerX(event) - positionX) < imageWidth / 2;
}
canvas.addEventListener('pointerdown', event => {
  if (!characterHit(event)) return;
  dragging = true; pointerId = event.pointerId; grabOffset = pointerY(event) - positionY; grabOffsetX = pointerX(event) - positionX;
  pressX = pointerX(event); pressY = pointerY(event); draggedDistance = 0;
  canvas.setPointerCapture(pointerId); canvas.classList.add('dragging');
});
canvas.addEventListener('pointermove', event => {
  if (!dragging || event.pointerId !== pointerId) return;
  draggedDistance = Math.max(draggedDistance, Math.hypot(pointerX(event) - pressX, pointerY(event) - pressY));
  targetY = Math.max(spring.floorY - spring.maxHeight, Math.min(spring.floorY - spring.minHeight, pointerY(event) - grabOffset));
  targetX = Math.max(spring.x - spring.width*1.45, Math.min(spring.x + spring.width*1.45, pointerX(event) - grabOffsetX));
});
function release(event) {
  if (!dragging || event.pointerId !== pointerId) return;
  if (draggedDistance < 8) {
    velocity = 1180;
    sideVelocity = (pointerX(event) < spring.x ? -1 : 1) * 430;
  } else {
    const restTop = spring.floorY - spring.restHeight;
    velocity = (targetY - positionY) * 22 - (positionY - restTop) * 8;
    sideVelocity = (targetX - positionX) * 28 - (positionX - spring.x) * 8;
  }
  dragging = false; canvas.classList.remove('dragging'); pointerId = null;
}
canvas.addEventListener('pointerup', release); canvas.addEventListener('pointercancel', release);

function trimTransparentEdges(image) {
  const source = document.createElement('canvas');
  source.width = image.naturalWidth; source.height = image.naturalHeight;
  const sourceCtx = source.getContext('2d', { willReadFrequently: true });
  sourceCtx.drawImage(image, 0, 0);
  const { data, width, height } = sourceCtx.getImageData(0, 0, source.width, source.height);
  let left = width, top = height, right = -1, bottom = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (data[(y * width + x) * 4 + 3] > 8) {
        left = Math.min(left, x); right = Math.max(right, x);
        top = Math.min(top, y); bottom = Math.max(bottom, y);
      }
    }
  }
  if (right < left || bottom < top) return image;
  const cropped = document.createElement('canvas');
  cropped.width = right - left + 1; cropped.height = bottom - top + 1;
  cropped.getContext('2d').drawImage(source, left, top, cropped.width, cropped.height, 0, 0, cropped.width, cropped.height);
  return cropped;
}

upload.addEventListener('change', event => {
  const file = event.target.files?.[0]; if (!file) return;
  if (characterObjectUrl) URL.revokeObjectURL(characterObjectUrl);
  characterObjectUrl = URL.createObjectURL(file);
  const url = characterObjectUrl;
  const img = new Image();
  img.onload = () => { characterImage = trimTransparentEdges(img); URL.revokeObjectURL(url); if (characterObjectUrl === url) characterObjectUrl = null; };
  img.src = url;
});
window.addEventListener('resize', resize);
springImage.onload = () => { };
springImage.onerror = () => { console.warn('Spring image could not be loaded.'); };
resize();
requestAnimationFrame(animate);
