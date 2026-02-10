const audioEl = document.getElementById("bg-audio");
const volumeSlider = document.getElementById("volume");
const autoplayNote = document.getElementById("autoplay-note");

let audioContext = null;
let sourceNode = null;
let filterNode = null;
let gainNode = null;
let ttsInterval = null;

// We want it LOUD — this is the effective max (Web Audio gain can go >1.0 if you want overdrive)
const TARGET_VOLUME = 5.0;      // 100%
const BOOST_FACTOR = 5.25;      // slight overdrive for extra chud energy (reduce to 1.0 if too distorted)

const chudPhrases = [
  "you are a chud",
  "nice try chud",
  "chud detected",
  "stop that, chud",
  "chud behavior",
  "certified chud moment"
];

function getRandomChudPhrase() {
  return chudPhrases[Math.floor(Math.random() * chudPhrases.length)];
}

function speak(text) {
  if (!("speechSynthesis" in window)) return;
  
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1.1;     // slightly faster to sound mocking
  utterance.pitch = 0.9;    // a bit deeper/more menacing
  utterance.volume = 1.0;
  
  window.speechSynthesis.cancel(); // clear queue so it interrupts
  window.speechSynthesis.speak(utterance);
}

function updateMarqueeSize() {
  const ratio = window.innerWidth / Math.max(1, window.innerHeight);
  const base = window.innerWidth * 0.06;
  const scaled = base * Math.min(1.5, Math.max(0.6, ratio));
  const size = Math.max(18, Math.min(64, scaled));
  document.documentElement.style.setProperty("--marquee-size", `${size}px`);
}

function createBassBoost() {
  if (audioContext) return;

  audioContext = new (window.AudioContext || window.webkitAudioContext)();
  sourceNode = audioContext.createMediaElementSource(audioEl);

  filterNode = audioContext.createBiquadFilter();
  filterNode.type = "lowshelf";
  filterNode.frequency.value = 180;
  filterNode.gain.value = 10;

  gainNode = audioContext.createGain();
  
  sourceNode.connect(filterNode);
  filterNode.connect(gainNode);
  gainNode.connect(audioContext.destination);

  // Force max volume right away
  gainNode.gain.value = TARGET_VOLUME * BOOST_FACTOR;
}

function forceMaxVolume() {
  if (gainNode) {
    gainNode.gain.value = TARGET_VOLUME * BOOST_FACTOR;
  }
  // Also set native volume high as fallback
  audioEl.volume = 1.0;
}

function speakChud() {
  speak(getRandomChudPhrase());
}

async function tryPlayAudio() {
  try {
    if (audioContext && audioContext.state === "suspended") {
      await audioContext.resume();
    }

    createBassBoost();
    forceMaxVolume();

    await audioEl.play();
    autoplayNote.hidden = true;

    speak("benjamin netanyahu is my dad");
    if (!ttsInterval) {
      ttsInterval = setInterval(() => {
        speak("benjamin netanyahu is my dad");
      }, 30000);
    }

    return true;
  } catch (err) {
    autoplayNote.hidden = false;
    console.log("Autoplay blocked:", err);
    return false;
  }
}

function handleUserGesture() {
  tryPlayAudio();
}

// Slider is disabled, but detect any attempt to touch/click/drag it
volumeSlider.disabled = true;

// Catch interaction attempts (click, touch, drag start)
volumeSlider.addEventListener("pointerdown", () => {
  speakChud();
  forceMaxVolume(); // just in case
}, { passive: true });

// Also catch if someone tries to change it via keyboard (focus + arrows)
volumeSlider.addEventListener("keydown", (e) => {
  if (e.key === "ArrowLeft" || e.key === "ArrowRight" || e.key === "ArrowUp" || e.key === "ArrowDown") {
    speakChud();
    forceMaxVolume();
    e.preventDefault();
  }
});

// If someone manages to change volume via dev tools or extension, snap back
audioEl.addEventListener("volumechange", () => {
  if (audioEl.volume < 0.95) { // small tolerance
    forceMaxVolume();
    speakChud();
  }
});

// Init
window.addEventListener("resize", updateMarqueeSize);

window.addEventListener("DOMContentLoaded", () => {
  updateMarqueeSize();
  tryPlayAudio();

  const startOnGesture = () => {
    handleUserGesture();
    window.removeEventListener("pointerdown", startOnGesture);
    window.removeEventListener("keydown", startOnGesture);
  };

  window.addEventListener("pointerdown", startOnGesture);
  window.addEventListener("keydown", startOnGesture);
});

// Watchdog: if paused somehow, restart + max volume
audioEl.addEventListener("pause", () => {
  if (audioEl.currentTime < audioEl.duration - 1) {
    audioEl.play().catch(() => {});
    forceMaxVolume();
  }
});