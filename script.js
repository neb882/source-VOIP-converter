/* --- SIMULATION ENGINE --- */
class SourceSimulator {
    constructor(logCallback) {
        this.log = logCallback;
        this.isActive = false;
        this.activePlayers = [];
        this.maxPlayers = 24;
        this.initialPopulation();
    }

    initialPopulation() {
        for(let i=0; i<12; i++) this.addPlayer(true);
    }

    start() {
        if(this.isActive) return;
        this.isActive = true;
        this.loop();
    }

    stop() { this.isActive = false; }

    addPlayer(silent = false) {
        if (this.activePlayers.length >= this.maxPlayers) return;
        const pool = TF2_DATA.playerNames.filter(n => !this.activePlayers.includes(n));
        if (pool.length === 0) return;
        const name = pool[Math.floor(Math.random() * pool.length)];
        this.activePlayers.push(name);
        if (!silent) this.log(`Player ${name} connected`, 'text');
    }

    getRandomPlayer() {
        return this.activePlayers[Math.floor(Math.random() * this.activePlayers.length)];
    }

    triggerKill() {
        if (this.activePlayers.length < 2) return;
        const killer = this.getRandomPlayer();
        let victim = this.getRandomPlayer();
        while (victim === killer) victim = this.getRandomPlayer();
        const weapon = TF2_DATA.weapons[Math.floor(Math.random() * TF2_DATA.weapons.length)];
        const isCrit = Math.random() > 0.85;
        let msg = `${killer} killed ${victim} with ${weapon}.`;
        if (isCrit) msg += ` (crit)`;
        this.log(msg, 'text');
    }

    triggerChat() {
        if (this.activePlayers.length < 1) return;
        const player = this.getRandomPlayer();
        const msg = TF2_DATA.chat[Math.floor(Math.random() * TF2_DATA.chat.length)];
        const isDead = Math.random() > 0.7;
        const team = Math.random() > 0.8 ? "(TEAM) " : "";
        const prefix = isDead ? "*DEAD* " : "";
        this.log(`${prefix}${team}${player} :  ${msg}`, 'text');
    }

    triggerError() {
        const error = TF2_DATA.errors[Math.floor(Math.random() * TF2_DATA.errors.length)];
        this.log(error, 'err');
    }

    triggerSystem() {
        const msg = TF2_DATA.system[Math.floor(Math.random() * TF2_DATA.system.length)];
        this.log(msg, 'text');
    }

    triggerAchievement() {
        if (this.activePlayers.length < 1) return;
        const player = this.getRandomPlayer();
        const ach = TF2_DATA.achievements[Math.floor(Math.random() * TF2_DATA.achievements.length)];
        this.log(`${player} has earned the achievement **${ach}**`, 'ach');
    }

    triggerItem() {
         if (this.activePlayers.length < 1) return;
        const player = this.getRandomPlayer();
        const item = TF2_DATA.items[Math.floor(Math.random() * TF2_DATA.items.length)];
        this.log(`${player} has found: ${item}`, 'item');
    }

    loop() {
        if (!this.isActive) return;
        // Random tick rate between 0.5s and 4s
        const nextTick = Math.random() * 3500 + 500;
        setTimeout(() => { this.processTick(); this.loop(); }, nextTick);
    }

    processTick() {
        const roll = Math.random();
        if (roll < 0.02) this.addPlayer();
        else if (roll < 0.30) this.triggerKill();
        else if (roll < 0.55) this.triggerChat();
        else if (roll < 0.60) this.triggerError();
        else if (roll < 0.65) this.triggerAchievement();
        else if (roll < 0.70) this.triggerItem();
        else if (roll < 0.75) this.triggerSystem();
    }
}

/* --- GLOBAL ELEMENTS --- */
const els = {
  file: document.getElementById('file'),
  process: document.getElementById('process'),
  dl: document.getElementById('download'),
  audio: document.getElementById('preview'),
  canvas: document.getElementById('visualizer'),
  gain: document.getElementById('gain'),
  env: document.getElementById('env'),
  customEnv: document.getElementById('custom-env'),
  controls: document.getElementById('controls-wrapper'),
  conOut: document.getElementById('console-out'),
  conIn: document.getElementById('console-input'),
  conHint: document.getElementById('console-hint'),
  ng: document.getElementById('net-graph'),
  ngFps: document.getElementById('ng-fps'),
  ngPing: document.getElementById('ng-ping'),
  ngLerp: document.getElementById('ng-lerp'),
  ngFill: document.getElementById('ng-fill'),
  ngLoss: document.getElementById('ng-loss-val')
};

let state = {
  lastBlob: null,
  processedBuffer: null,
  audioCtx: null,
  analyser: null,
  isPlaying: false,
  animationId: null,
  sv_cheats: 0,
  godMode: false,
  noclip: false,
  cmdHistory: [],
  cmdIndex: -1,
  mapName: 'cp_process',
  isConnected: true,
  simEnabled: true
};

// Initialize Simulator
const simulator = new SourceSimulator((text, type) => logLine(text, type));

/* --- CVAR SYSTEM --- */
const cvars = {
  'help': { 
    help: 'Show detailed help about console usage', 
    action: () => {
      logLine('--- CONSOLE HELP ---', 'sys');
      logLine('Format: command [argument]');
      logLine('Use "find <string>" to search for commands.');
      logLine('Use "cvarlist" for a full list.');
      logLine('Use "clear" to empty the console.');
    }
  },
  'cvarlist': { help: 'List all available console commands', action: printCvarList },
  'find': {
    help: 'Find console commands by name',
    usage: 'find <string>',
    action: (v) => {
      if(!v) return logLine("Usage: find <string>", "err");
      logLine(`Searching for: ${v}`, 'sys');
      Object.keys(cvars).filter(k => k.includes(v.toLowerCase())).forEach(k => {
        logLine(`${k.padEnd(25)} : ${cvars[k].help}`, 'text');
      });
    }
  },
  'clear': { help: 'Clear the console output', action: () => els.conOut.innerHTML = '' },
  'echo': { help: 'Echo text to console', usage: 'echo <text>', action: (v) => logLine(v || "") },
  'status': { help: 'Display map and connection status', action: printStatus },
  'disconnect': { 
    help: 'Disconnect from server', 
    action: () => { 
      if(!state.isConnected) return logLine("Already disconnected.", "err");
      logLine('Disconnect: Client disconnect'); 
      state.isConnected = false;
      els.audio.pause();
    }
  },
  'connect': {
    help: 'Connect to a server', usage: 'connect <ip>',
    action: (v) => {
      if(state.isConnected) logLine('Disconnect: Client disconnect');
      logLine(`Connecting to ${v || "127.0.0.1:27015"}...`, 'sys');
      setTimeout(() => logLine("Connected to server.", 'sys'), 800);
      setTimeout(() => logLine("Sending client info...", 'sys'), 1200);
      setTimeout(() => {
          logLine("Entered the game", 'sys');
          state.isConnected = true;
      }, 1600);
    }
  },
  'retry': { help: 'Retry connection to last server', action: () => cvars['connect'].action('last_server') },
  'quit': { 
    help: 'Exit the engine', 
    action: () => { 
      logLine('Engine Error: ED_Alloc: no free edicts', 'err');
      setTimeout(() => {
        document.body.innerHTML = '<div style="color:#fff; text-align:center; margin-top:20%;"><h1>hl2.exe has stopped working</h1><p>Windows is checking for a solution to the problem...</p></div>';
      }, 1000);
    }
  },
  'exec': { help: 'Execute a preset config', usage: 'exec <filename>', action: runPreset },
  'screenshot': {
    help: 'Save visualizer to file',
    action: () => {
      const link = document.createElement('a');
      link.download = `tf2_viz_${Date.now()}.png`;
      link.href = els.canvas.toDataURL();
      link.click();
      logLine(`Wrote ${link.download}`, 'sys');
    }
  },
  'sv_cheats': { 
    val: 0, help: 'Enable cheats/dev limits', flags: FCVAR.SERVER,
    action: (v) => { 
      state.sv_cheats = parseInt(v); 
      if(state.sv_cheats === 1) {
        document.getElementById('gain').removeAttribute('max');
        document.getElementById('loss').removeAttribute('max');
        logLine('Dev limits removed. God speed.');
      } else {
        document.getElementById('gain').setAttribute('max', '5.0');
        logLine('Cheats disabled.');
      }
    }
  },
  'sv_simulate_events': { 
    val: 1, help: 'Toggle background game event simulation', 
    action: (v) => {
      const isOn = parseInt(v) === 1;
      state.simEnabled = isOn;
      if (isOn) { simulator.start(); logLine("Game event simulation enabled.", "sys"); }
      else { simulator.stop(); logLine("Game event simulation disabled.", "sys"); }
    }
  },
  'god': { 
    help: 'Toggle god mode', flags: FCVAR.CHEAT,
    action: () => { state.godMode = !state.godMode; logLine(state.godMode ? "godmode ON" : "godmode OFF", 'sys'); }
  },
  'noclip': { 
    help: 'Toggle noclip movement', flags: FCVAR.CHEAT,
    action: () => { state.noclip = !state.noclip; logLine(state.noclip ? "noclip ON" : "noclip OFF", 'sys'); }
  },
  'impulse': {
    help: 'Cheat commands (101=health/ammo)', flags: FCVAR.CHEAT,
    action: (v) => {
        if (v === "101") logLine("HEV Suit: Health and Ammo full.", "val");
        else logLine(`Impulse ${v} not handled`, "text");
    }
  },
  'ent_create': {
    help: 'Create an entity', flags: FCVAR.CHEAT,
    action: (v) => {
        const el = document.createElement('div');
        el.style.position = 'absolute';
        el.style.left = (Math.random() * 80) + 10 + '%';
        el.style.top = (Math.random() * 80) + 10 + '%';
        el.style.fontSize = '40px';
        el.style.pointerEvents = 'none';
        el.style.animation = 'fadeOut 3s forwards';
        el.innerText = ['📦', '⚠️', '👾', '💥'][Math.floor(Math.random()*4)];
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 3000);
        logLine(`Created entity info_target at origin`, 'sys');
    }
  },
  'mat_fullbright': {
    help: 'Toggle fullbright mode', flags: FCVAR.CHEAT,
    action: (v) => {
        if(v === "1") { document.body.style.filter = "brightness(1.5) contrast(1.2)"; logLine("mat_fullbright 1", "sys"); }
        else { document.body.style.filter = ""; logLine("mat_fullbright 0", "sys"); }
    }
  },
  'thirdperson': {
      help: 'Third person camera', flags: FCVAR.CHEAT,
      action: () => { els.canvas.style.transform = "rotateX(180deg) rotateY(180deg)"; logLine("Camera: Third Person", "sys"); }
  },
  'firstperson': {
      help: 'First person camera',
      action: () => { els.canvas.style.transform = ""; logLine("Camera: First Person", "sys"); }
  },
  'unbindall': {
      help: 'Unbind all keys',
      action: () => { logLine("Key bindings removed.", "sys"); }
  },
  'kill': { 
    help: 'Suicide', 
    action: () => { if(els.audio.duration > 0) { els.audio.pause(); els.audio.currentTime = els.audio.duration; } logLine("Player died.", 'warn'); }
  },
  'explode': { help: 'Suicide with style', action: () => cvars['kill'].action() },
  'say': { help: 'Display player message', usage: 'say <text>', action: (v) => { if(v) logLine(`Player :  ${v}`, 'text'); } },
  'map': { 
    help: 'Set map name', usage: 'map <name>',
    action: (v) => { if(v) { logLine(`CModelLoader::Map_IsValid: '${v}' is not a valid map`, 'warn'); setTimeout(() => { state.mapName = v; logLine(`Changing level to ${v}...`, 'sys'); }, 500); }} 
  },
  'changelevel': { help: 'Change map', link: 'map', action: (v) => cvars['map'].action(v) },
  'net_graph': { 
    val: 0, help: 'Draw the network usage graph (0-4)', 
    action: (v) => { 
      const level = parseInt(v);
      if(isNaN(level) || level < 0) return;
      els.ng.style.display = (level > 0) ? 'block' : 'none';
      els.ng.className = '';
      if(level > 0) els.ng.classList.add(`ng-level-${Math.min(level, 4)}`);
    } 
  },
  'volume': {
    val: 1.0, help: 'Audio playback volume (0.0 - 1.0)',
    action: (v) => {
      const val = parseFloat(v);
      if (!isNaN(val)) els.audio.volume = Math.min(1, Math.max(0, val));
      else logLine(`Current volume: ${els.audio.volume.toFixed(2)}`, 'text');
    }
  },
  'play': { help: 'Start playback', action: () => els.audio.play().catch(e => logLine(e.message, 'err')) },
  'stop': { help: 'Stop playback', action: () => { els.audio.pause(); els.audio.currentTime = 0; } },
  'restart': { help: 'Restart playback', action: () => { els.audio.currentTime = 0; els.audio.play(); } },
  'voice_scale': { help: 'Microphone gain boost', link: 'gain', flags: FCVAR.CHEAT },
  'host_framerate': { help: 'Audio sample rate (Hz)', link: 'sr' },
  'dsp_hpf': { link: 'hp', help: 'High pass filter cutoff' },
  'dsp_lpf': { link: 'lp', help: 'Low pass filter cutoff' },
  'snd_bits': { link: 'bits', help: 'Output bit depth' },
  'net_fakeloss': { link: 'loss', help: 'Simulated packet loss percentage' },
  'net_split': { link: 'frameMs', help: 'Packet size in milliseconds' },
  'dsp_custom_time': { link: 'c_dur', help: 'Custom reverb duration' },
  'dsp_custom_decay': { link: 'c_dec', help: 'Custom reverb decay' },
  'dsp_custom_mix': { link: 'c_mix', help: 'Custom reverb mix %' },
  'dsp_room': { 
    help: 'Reverb environment preset',
    link: 'env', 
    action: (v) => {
      const opts = ['none', 'room', 'locker', 'hall', 'custom'];
      let val = v;
      if(!isNaN(parseInt(v)) && parseInt(v) < 5) val = opts[parseInt(v)];
      if(opts.includes(val)) {
        els.env.value = val;
        els.customEnv.style.display = (val === 'custom') ? 'block' : 'none';
      }
    }
  }
};

const idToCvarMap = {};
Object.keys(cvars).forEach(key => { if(cvars[key].link) idToCvarMap[cvars[key].link] = key; });

/* --- CONSOLE CORE --- */
function logLine(text, type = 'text') {
  const div = document.createElement('div');
  div.className = `c-${type}`;
  div.innerHTML = text; // Changed to innerHTML to support bolding/formatting

  // Auto-scroll only if we are already near the bottom (tolerance of 50px)
  const isAtBottom = (els.conOut.scrollHeight - els.conOut.scrollTop - els.conOut.clientHeight) < 50;

  els.conOut.appendChild(div);
  
  if (isAtBottom) {
    els.conOut.scrollTop = els.conOut.scrollHeight;
  }
}

function tokenize(str) {
  const regex = /[^\s"]+|"([^"]*)"/g;
  const args = [];
  let match;
  while ((match = regex.exec(str)) != null) {
    args.push(match[1] ? match[1] : match[0]);
  }
  return args;
}

function execCommand(rawStr, isFromGui = false) {
  if (!rawStr || !rawStr.trim()) return;
  const tokens = tokenize(rawStr);
  const cmdName = tokens[0].toLowerCase();
  const arg = tokens.length > 1 ? tokens[1] : undefined;
  
  if(!isFromGui) logLine(`] ${rawStr}`);
  else logLine(`] ${rawStr} (gui_msg)`, 'help');

  const cvar = cvars[cmdName];
  if (cvar) {
    if ((cvar.flags & FCVAR.CHEAT) && state.sv_cheats === 0) {
      logLine(`Command "${cmdName}" requires sv_cheats 1.`, 'err');
      return;
    }
    if (cvar.link) {
      const el = document.getElementById(cvar.link);
      if (arg !== undefined) {
        if(el.value !== arg) el.value = arg;
        if(cmdName === 'dsp_room') cvar.action(arg); 
        logLine(`"${cmdName}" = "${arg}"`, 'val');
      } else {
        logLine(`"${cmdName}" = "${el.value}"`, 'text');
        logLine(` - ${cvar.help}`, 'help');
      }
    } else if (cvar.action) {
      cvar.action(arg);
      if(cvar.val !== undefined && arg !== undefined) { cvar.val = arg; logLine(`"${cmdName}" = "${arg}"`, 'val'); }
      else if (cvar.val !== undefined && arg === undefined) { logLine(`"${cmdName}" = "${cvar.val}"`, 'text'); logLine(` - ${cvar.help}`, 'help'); }
    }
  } else { logLine(`Unknown command "${cmdName}"`, 'err'); }
}

window.execCommand = execCommand; 
els.controls.addEventListener('change', (e) => {
  const target = e.target;
  if (idToCvarMap[target.id]) { const cmd = idToCvarMap[target.id]; execCommand(`${cmd} ${target.value}`, true); }
});

function runPreset(name) {
  if(!name) return;
  const cleanName = name.replace('exec ', '').replace('preset_', '');
  const p = presets[cleanName];
  if(!p) { logLine(`Error: preset "${name}" not found.`, 'err'); return; }
  logLine(`exec user_presets/${cleanName}.cfg`, 'cmd');
  const tempCheats = state.sv_cheats; state.sv_cheats = 1; 
  execCommand(`host_framerate ${p.sr}`); execCommand(`dsp_hpf ${p.hp}`); execCommand(`dsp_lpf ${p.lp}`);
  execCommand(`snd_bits ${p.bits}`); execCommand(`voice_scale ${p.gain}`); execCommand(`net_fakeloss ${p.loss}`);
  execCommand(`dsp_room ${p.env}`);
  state.sv_cheats = tempCheats;
}

function printCvarList() {
  logLine('-------------- CVAR LIST --------------', 'sys');
  Object.keys(cvars).sort().forEach(k => {
    let flags = "";
    if(cvars[k].flags & FCVAR.CHEAT) flags += "[sv_cheats] ";
    if(cvars[k].flags & FCVAR.SERVER) flags += "[sv] ";
    logLine(`${k.padEnd(20)} : ${flags}${cvars[k].help}`, 'text');
  });
  logLine('---------------------------------------', 'sys');
  logLine(`${Object.keys(cvars).length} total cvars`, 'sys');
}

function printStatus() {
  if(!state.isConnected) { logLine("Not connected to server.", "text"); return; }
  logLine(`hostname: Local Browser Environment`);
  logLine(`version : 1.0.0.24  / 24 22050 secure`);
  logLine(`map     : ${state.mapName} at: 0 x, 0 y, 0 z`);
  if(els.file.files.length) {
    const f = els.file.files[0];
    logLine(`# userid name                uniqueid            connected ping loss state`);
    logLine(`#      1 "${f.name}"      ${f.size}bytes    00:00       5    0 active`);
  } else { logLine(`No file loaded.`, 'err'); }
}

/* --- INPUT HANDLING --- */
els.conIn.addEventListener('input', (e) => {
  const val = els.conIn.value;
  if(!val) { els.conHint.innerHTML = ""; return; }
  const lowerVal = val.toLowerCase();
  const matches = Object.keys(cvars).filter(k => k.startsWith(lowerVal));
  if(matches.length > 0) {
    const match = matches[0];
    const typedLen = val.length;
    if (typedLen >= match.length) els.conHint.innerHTML = "";
    else els.conHint.innerHTML = `<span style="color:transparent">${match.substring(0, typedLen)}</span>${match.substring(typedLen)}`;
  } else els.conHint.textContent = "";
});

els.conIn.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const val = els.conIn.value;
    if (val) {
      state.cmdHistory.push(val);
      state.cmdIndex = state.cmdHistory.length;
      execCommand(val);
      els.conIn.value = ''; els.conHint.textContent = '';
    }
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (state.cmdIndex > 0) {
      state.cmdIndex--; els.conIn.value = state.cmdHistory[state.cmdIndex];
      els.conIn.dispatchEvent(new Event('input'));
    }
  } else if (e.key === 'ArrowDown') {
    e.preventDefault();
    if (state.cmdIndex < state.cmdHistory.length - 1) {
      state.cmdIndex++; els.conIn.value = state.cmdHistory[state.cmdIndex];
      els.conIn.dispatchEvent(new Event('input'));
    } else {
      state.cmdIndex = state.cmdHistory.length; els.conIn.value = ''; els.conHint.textContent = '';
    }
  } else if (e.key === 'Tab') {
    e.preventDefault();
    const val = els.conIn.value;
    if (!val) return;
    const matches = Object.keys(cvars).filter(k => k.startsWith(val.toLowerCase()));
    if (matches.length === 1) { els.conIn.value = matches[0] + " "; els.conHint.textContent = ""; }
    else if (matches.length > 1) logLine(`> ${matches.join(', ')}`, 'help');
  }
});

document.querySelectorAll('.preset-btn').forEach(btn => {
  btn.addEventListener('click', () => { const cmd = btn.getAttribute('data-cmd'); if(cmd) execCommand(cmd); });
});
els.file.addEventListener('change', () => {
  els.process.disabled = !els.file.files.length;
  if(els.file.files.length) { const f = els.file.files[0]; logLine(`FS_MountFile: "${f.name}" (${(f.size/1024).toFixed(1)} KB) mounted.`, 'sys'); }
});


/* --- AUDIO PROCESSING --- */
els.process.addEventListener('click', async () => {
  els.process.disabled = true; els.dl.setAttribute('disabled', 'true');
  logLine(`S_StartSound: initializing render...`);
  try {
    const file = els.file.files[0];
    if(!file) throw new Error("No file loaded");
    const arrayBuffer = await file.arrayBuffer();
    const tempCtx = new (window.AudioContext || window.webkitAudioContext)();
    const decoded = await tempCtx.decodeAudioData(arrayBuffer);
    const monoRaw = new Float32Array(decoded.length);
    if (decoded.numberOfChannels === 1) monoRaw.set(decoded.getChannelData(0));
    else {
      const ch0 = decoded.getChannelData(0);
      const ch1 = decoded.getChannelData(1);
      for(let i=0; i<decoded.length; i++) monoRaw[i] = (ch0[i] + ch1[i]) / 2;
    }
    const targetRate = parseInt(document.getElementById('sr').value);
    const envChoice = els.env.value;
    let revDur = 0, revDecay = 0, revMix = 0;
    if (envChoice === 'custom') {
      revDur = Number(document.getElementById('c_dur').value);
      revDecay = Number(document.getElementById('c_dec').value);
      revMix = Number(document.getElementById('c_mix').value) / 100;
    } else if (envConfigs[envChoice]) {
      [revDur, revDecay, revMix] = envConfigs[envChoice];
    }
    logLine(`MIX: Rate=${targetRate}Hz, Reverb=${envChoice} (Mix: ${revMix.toFixed(2)})`);
    const extraTail = (revMix > 0) ? revDur * targetRate : 0;
    const offline = new OfflineAudioContext(1, Math.ceil(decoded.duration * targetRate) + extraTail, targetRate);
    const src = offline.createBufferSource();
    const buf = offline.createBuffer(1, monoRaw.length, decoded.sampleRate);
    buf.copyToChannel(monoRaw, 0, 0);
    src.buffer = buf;
    const hp = offline.createBiquadFilter();
    hp.type = 'highpass'; hp.frequency.value = Number(document.getElementById('hp').value);
    const lp = offline.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = Number(document.getElementById('lp').value);
    const dist = offline.createWaveShaper();
    const gainVal = Number(document.getElementById('gain').value);
    dist.curve = makeDistortionCurve((gainVal - 1) * 20);
    const comp = offline.createDynamicsCompressor();
    comp.threshold.value = -12; comp.ratio.value = 12; comp.attack.value = 0.003; comp.release.value = 0.25;
    src.connect(hp); hp.connect(dist); dist.connect(lp);
    if (revMix > 0) {
      const conv = offline.createConvolver();
      conv.buffer = makeImpulse(offline, revDur, revDecay);
      const wetGain = offline.createGain(); wetGain.gain.value = revMix;
      const dryGain = offline.createGain(); dryGain.gain.value = 1.0; 
      lp.connect(dryGain); dryGain.connect(comp);
      lp.connect(conv); conv.connect(wetGain); wetGain.connect(comp);
    } else { lp.connect(comp); }
    comp.connect(offline.destination);
    src.start(0);
    const rendered = await offline.startRendering();
    let samples = rendered.getChannelData(0);
    const bits = Number(document.getElementById('bits').value);
    const loss = Number(document.getElementById('loss').value);
    const frameMs = Number(document.getElementById('frameMs').value);
    samples = quantize(samples, bits);
    samples = applyPacketLoss(samples, targetRate, frameMs, loss);
    state.processedBuffer = samples;
    const wavBlob = makeWav(samples, targetRate);
    if(state.lastBlob) URL.revokeObjectURL(state.lastBlob);
    state.lastBlob = URL.createObjectURL(wavBlob);
    els.audio.src = state.lastBlob;
    els.dl.href = state.lastBlob;
    els.dl.download = file.name.replace(/\.[^/.]+$/, "") + "_tf2.wav";
    els.dl.removeAttribute('disabled');
    drawStaticWaveform();
    logLine(`ChangeLevel: Local audio blob created.`, 'sys');
    logLine(`Net_SendPacket: reliable stream ready.`);
  } catch(e) { console.error(e); logLine(`CModelLoader::Map_IsValid: ${e.message}`, 'err'); } finally { els.process.disabled = false; }
});

function makeDistortionCurve(amount) {
  if (amount <= 0) return new Float32Array([0, 0]);
  const k = amount, n = 44100, curve = new Float32Array(n), deg = Math.PI / 180;
  for (let i = 0; i < n; ++i) { let x = i * 2 / n - 1; curve[i] = (3 + k) * x * 20 * deg / (Math.PI + k * Math.abs(x)); }
  return curve;
}
function makeImpulse(ctx, duration, decay) {
  const rate = ctx.sampleRate; const len = rate * duration;
  const buffer = ctx.createBuffer(1, len, rate); const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = ((Math.random() * 2) - 1) * Math.pow(1 - (i / len), decay);
  return buffer;
}
function quantize(data, bits) {
  if(bits >= 32) return data;
  const step = Math.pow(2, bits);
  for(let i=0; i<data.length; i++) data[i] = Math.floor(data[i]*step)/step;
  return data;
}
function applyPacketLoss(data, rate, ms, pct) {
  if(pct <= 0) return data;
  const frameSz = Math.floor(rate * (ms/1000));
  const out = new Float32Array(data.length);
  let last = 0;
  for(let off=0; off<data.length; off+=frameSz) {
    const lost = Math.random()*100 < pct;
    for(let i=0; i<frameSz; i++) {
      if(off+i >= data.length) break;
      if(lost) out[off+i] = last; else { out[off+i] = data[off+i]; last = data[off+i]; }
    }
  }
  return out;
}
function makeWav(data, rate) {
  const buf = new ArrayBuffer(44 + data.length*2); const view = new DataView(buf);
  const writeStr = (o, s) => { for(let i=0;i<s.length;i++) view.setUint8(o+i, s.charCodeAt(i)); };
  writeStr(0, 'RIFF'); view.setUint32(4, 36+data.length*2, true); writeStr(8, 'WAVE');
  writeStr(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true);
  view.setUint16(22, 1, true); view.setUint32(24, rate, true); view.setUint32(28, rate*2, true);
  view.setUint16(32, 2, true); view.setUint16(34, 16, true); writeStr(36, 'data');
  view.setUint32(40, data.length*2, true);
  let offset = 44;
  for(let i=0; i<data.length; i++, offset+=2) {
    let s = Math.max(-1, Math.min(1, data[i])); view.setInt16(offset, s<0 ? s*0x8000 : s*0x7FFF, true);
  }
  return new Blob([buf], {type:'audio/wav'});
}

/* --- VISUALIZER & NETGRAPH --- */
const ctx = els.canvas.getContext('2d', { alpha: false });
function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1; const rect = els.canvas.getBoundingClientRect();
  if(els.canvas.width !== rect.width * dpr || els.canvas.height !== rect.height * dpr) {
      els.canvas.width = rect.width * dpr; els.canvas.height = rect.height * dpr; ctx.scale(dpr, dpr);
  }
  return { w: rect.width, h: rect.height };
}
function drawGrid(w, h) {
  ctx.fillStyle = '#000'; ctx.fillRect(0,0,w,h); ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, h/2); ctx.lineTo(w, h/2); ctx.stroke();
}
function animateSpectrum() {
  if(!state.isPlaying) return;
  const { w, h } = resizeCanvas(); const bufferLength = state.analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength); state.analyser.getByteFrequencyData(dataArray);
  drawGrid(w, h); const barWidth = (w / bufferLength) * 2.5; let x = 0, sum = 0;
  for(let i=0; i<bufferLength; i++) sum += dataArray[i];
  const isLoud = (sum/bufferLength) > 60; 
  for(let i = 0; i < bufferLength; i++) {
    let barHeight = (dataArray[i] / 255) * h;
    ctx.fillStyle = (isLoud && barHeight > h*0.6) ? `rgb(${barHeight + 100}, 50, 50)` : `rgb(50, ${barHeight + 100}, 240)`;
    ctx.fillRect(x, h - barHeight, barWidth, barHeight); x += barWidth + 1;
  }
  state.animationId = requestAnimationFrame(animateSpectrum);
}
function drawStaticWaveform() {
  if(!state.processedBuffer) return;
  const { w, h } = resizeCanvas(); drawGrid(w, h); ctx.fillStyle = '#66c0f4';
  const data = state.processedBuffer; const step = Math.max(1, Math.ceil(data.length / w)); const amp = h / 2;
  for(let i = 0; i < w; i++){
    let min = 1.0, max = -1.0; const startIdx = i * step; const endIdx = Math.min(startIdx + step, data.length);
    for(let j=startIdx; j<endIdx; j++){ const val = data[j]; if(val < min) min = val; if(val > max) max = val; }
    if(max < min) { min=0; max=0; }
    const yTop = (1 - max) * amp; const yBot = (1 - min) * amp;
    ctx.fillRect(i, yTop, 1, Math.max(1, yBot - yTop));
  }
}
function drawScrubFrame() {
  if(state.isPlaying || !state.processedBuffer) return;
  const { w, h } = resizeCanvas(); drawGrid(w, h);
  const pct = els.audio.currentTime / els.audio.duration; if(!isFinite(pct) || pct < 0 || pct > 1) return;
  const bufferIdx = Math.floor(pct * state.processedBuffer.length);
  const fftSize = 256; const binCount = 128; const out = new Float32Array(binCount); const twoPi = 2 * Math.PI;
  for (let k = 0; k < binCount; k++) {
    let r = 0, i = 0;
    for (let n = 0; n < fftSize; n++) {
      if(bufferIdx + n >= state.processedBuffer.length) break;
      const x = state.processedBuffer[bufferIdx + n]; const w = 0.5 * (1 - Math.cos((twoPi * n) / (fftSize - 1)));
      const theta = (twoPi * k * n) / fftSize; r += (x*w) * Math.cos(theta); i += (x*w) * Math.sin(theta);
    }
    out[k] = Math.sqrt(r*r + i*i);
  }
  const barWidth = (w / binCount) * 2.5; let x = 0;
  for (let i = 0; i < binCount; i++) {
    const val = Math.min(1.0, out[i] * 3.5); const barHeight = val * h;
    ctx.fillStyle = (barHeight > h * 0.6) ? `rgb(${barHeight + 100}, 50, 50)` : `rgb(50, ${barHeight + 100}, 240)`;
    ctx.fillRect(x, h - barHeight, barWidth, barHeight); x += barWidth + 1;
  }
}
els.audio.addEventListener('play', () => {
  if(!state.audioCtx) {
    state.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    state.analyser = state.audioCtx.createAnalyser(); state.analyser.fftSize = 256;
    state.sourceNode = state.audioCtx.createMediaElementSource(els.audio);
    state.sourceNode.connect(state.analyser); state.analyser.connect(state.audioCtx.destination);
  }
  if(state.audioCtx.state === 'suspended') state.audioCtx.resume();
  state.isPlaying = true; cancelAnimationFrame(state.animationId); animateSpectrum();
});
els.audio.addEventListener('pause', () => { state.isPlaying = false; cancelAnimationFrame(state.animationId); drawScrubFrame(); });
els.audio.addEventListener('ended', () => { state.isPlaying = false; cancelAnimationFrame(state.animationId); drawStaticWaveform(); });
els.audio.addEventListener('seeking', drawScrubFrame); els.audio.addEventListener('seeked', drawScrubFrame);
window.addEventListener('resize', () => { if(!state.isPlaying) drawStaticWaveform(); });

let lastTime = performance.now(), frameCount = 0;
function updateNetGraph() {
  requestAnimationFrame(updateNetGraph); const now = performance.now(); frameCount++;
  if (now - lastTime >= 500) { 
    const fps = Math.round(frameCount * 2); els.ngFps.textContent = fps;
    const lerpBase = parseFloat(document.getElementById('frameMs').value) * 2;
    els.ngLerp.textContent = (lerpBase + (Math.random()*2)).toFixed(1);
    els.ngPing.textContent = Math.floor(Math.random() * 15) + 5;
    els.ngLoss.textContent = document.getElementById('loss').value;
    els.ngFill.style.width = Math.min(100, (fps / 60) * 100) + '%';
    els.ngFill.style.background = (fps < 30) ? '#ff4040' : '#a4d007';
    frameCount = 0; lastTime = now;
  }
}
updateNetGraph();

(function bootConsole() {
  const bootLogs = [
    { t: "Valve Software - Source Engine [ Build 22050 ]", c: 'text' },
    { t: "Heap: 256.00 Mb", c: 'text' },
    { t: "Parsed 358 text messages", c: 'text' },
    { t: "execing autoexec.cfg", c: 'text' },
    { t: "cc_lang_listener: loading linguistics_en.txt", c: 'text' },
    { t: "Sound System: Init (2 channels, 16bit)", c: 'sys' },
    { t: "sv_voicecodec: vaudio_celt", c: 'cmd' },
    { t: "Parallel processing initialized", c: 'text' },
    { t: "Type 'sv_simulate_events 0' to disable game event simulation", c: 'sys' },
    { t: "System Ready. Type 'help' for commands.", c: 'sys' }
  ];
  let delay = 0;
  bootLogs.forEach(line => { setTimeout(() => logLine(line.t, line.c), delay); delay += Math.random() * 150 + 50; });
  setTimeout(() => { if(state.simEnabled) simulator.start(); }, delay + 500);
})();