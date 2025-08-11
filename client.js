const socket = io();

let myId = null;
let players = {}; // id => {id,name,color,x,y}
let my = {name:null,color:'#2d8cff',x:100,y:100};

const loginScreen = document.getElementById('loginScreen');
const nameInput = document.getElementById('nameInput');
const colorInput = document.getElementById('colorInput');
const joinBtn = document.getElementById('joinBtn');
const canvas = document.getElementById('world');
const ctx = canvas.getContext('2d');
const chatMessages = document.getElementById('chatMessages');
const messageInput = document.getElementById('message');
const sendBtn = document.getElementById('sendBtn');
const playersUl = document.getElementById('players');

// join
joinBtn.onclick = () => {
  const name = nameInput.value.trim() || 'Guest';
  const color = colorInput.value;
  my.name = name;
  my.color = color;
  socket.emit('join', {name, color});
  loginScreen.style.display = 'none';
};

socket.on('currentPlayers', (data) => {
  players = data || {};
  // if our socket id not set, set it from socket.id
  myId = socket.id;
  // add self if not present (server will also broadcast join)
  if (!players[myId]) {
    players[myId] = { id: myId, name: my.name, color: my.color, x: my.x, y: my.y };
  }
  renderPlayersList();
});

socket.on('playerJoined', (p) => {
  players[p.id] = p;
  renderPlayersList();
});

socket.on('playerMoved', (m) => {
  if (players[m.id]) {
    players[m.id].x = m.x;
    players[m.id].y = m.y;
  }
});

socket.on('playerLeft', (p) => {
  delete players[p.id];
  renderPlayersList();
});

socket.on('chat', (d) => {
  appendChat(d.from + ': ' + d.text);
});

// chat
sendBtn.onclick = sendMessage;
messageInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') sendMessage();
});
function sendMessage(){
  const txt = messageInput.value.trim();
  if (!txt) return;
  socket.emit('chat', txt);
  appendChat('Me: ' + txt);
  messageInput.value = '';
}
function appendChat(t){
  const el = document.createElement('div');
  el.className = 'msg';
  el.textContent = t;
  chatMessages.appendChild(el);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// movement
const keys = {};
window.addEventListener('keydown', e => { keys[e.key] = true; });
window.addEventListener('keyup', e => { keys[e.key] = false; });

function update(){
  const speed = 3;
  let moved = false;
  if (keys['ArrowUp'] || keys['w'] || keys['W']){ my.y -= speed; moved = true; }
  if (keys['ArrowDown'] || keys['s'] || keys['S']){ my.y += speed; moved = true; }
  if (keys['ArrowLeft'] || keys['a'] || keys['A']){ my.x -= speed; moved = true; }
  if (keys['ArrowRight'] || keys['d'] || keys['D']){ my.x += speed; moved = true; }
  // clamp
  my.x = Math.max(16, Math.min(canvas.width-16, my.x));
  my.y = Math.max(16, Math.min(canvas.height-16, my.y));
  if (moved){
    // update local copy
    if (!players[myId]) players[myId] = {id:myId, name: my.name, color: my.color, x: my.x, y: my.y};
    players[myId].x = my.x;
    players[myId].y = my.y;
    socket.emit('move', {x: my.x, y: my.y});
  }
}

function draw(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  // draw grid or background
  // draw players
  for (const id in players){
    const p = players[id];
    drawPlayer(p);
  }
}

function drawPlayer(p){
  // circle
  ctx.beginPath();
  ctx.fillStyle = p.color || '#666';
  ctx.strokeStyle = 'rgba(0,0,0,0.12)';
  ctx.lineWidth = 2;
  ctx.arc(p.x, p.y, 16, 0, Math.PI*2);
  ctx.fill();
  ctx.stroke();
  // name
  ctx.fillStyle = '#fff';
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(p.name, p.x, p.y+4);
}

function renderPlayersList(){
  playersUl.innerHTML = '';
  for (const id in players){
    const p = players[id];
    const li = document.createElement('li');
    const dot = document.createElement('span');
    dot.className = 'avatarDot';
    dot.style.background = p.color || '#666';
    li.appendChild(dot);
    const txt = document.createElement('span');
    txt.textContent = p.name + (id===myId ? ' (You)' : '');
    li.appendChild(txt);
    playersUl.appendChild(li);
  }
}

// main loop
function loop(){
  update();
  draw();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
