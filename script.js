const audioEl = document.getElementById("bg-audio");
const volumeSlider = document.getElementById("volume");
const autoplayNote = document.getElementById("autoplay-note");

let audioContext = null;
let sourceNode = null;
let filterNode = null;
let gainNode = null;
let ttsInterval = null;

// Restored your original extreme music settings
const TARGET_VOLUME = 5.0;      // crazy high
const BOOST_FACTOR = 5.25;      // even more overdrive

const chudPhrases = [
  "YOU ARE A CHUD!",
  "NICE TRY, CHUD!",
  "CHUD DETECTED!",
  "STOP THAT, CHUD!",
  "CLASSIC CHUD BEHAVIOR!",
  "CERTIFIED CHUD MOMENT!"
];

function getRandomChudPhrase() {
  return chudPhrases[Math.floor(Math.random() * chudPhrases.length)];
}

function speak(text) {
  if (!("speechSynthesis" in window)) return;

  const utterance = new SpeechSynthesisUtterance(text);
  
  // Try to pick a strong, energetic voice
  const voices = window.speechSynthesis.getVoices();
  const preferredVoice = voices.find(v => 
    v.name.includes("Google") || 
    v.name.includes("Microsoft") || 
    v.name.toLowerCase().includes("male") || 
    v.name.includes("en-US")
  ) || voices[0];

  utterance.voice = preferredVoice;
  utterance.volume = 100.0;     // maximum allowed by browser
  utterance.rate   = 1.20;    // faster = more cutting / perceived louder
  utterance.pitch  = 1.25;    // higher pitch = stands out more against bass-heavy music

  window.speechSynthesis.cancel(); // interrupt anything playing
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

  // Force the insane volume you had before
  gainNode.gain.value = TARGET_VOLUME * BOOST_FACTOR;
}

function forceMaxVolume() {
  if (gainNode) {
    gainNode.gain.value = TARGET_VOLUME * BOOST_FACTOR;
  }
  audioEl.volume = 1.0;
}

function speakChud() {
  // Small delay so it has a chance to be heard over the blast
  setTimeout(() => {
    speak(getRandomChudPhrase());
  }, 300);
}

async function tryPlayAudio() {
  try {
    if (audioContext && audioContext.state === "suspended") {
      await audioContext.resume();
    }

    // Wait for voices (some browsers load them async)
    if (window.speechSynthesis.getVoices().length === 0) {
      await new Promise(resolve => {
        window.speechSynthesis.onvoiceschanged = resolve;
      });
    }

    createBassBoost();
    forceMaxVolume();

    await audioEl.play();
    autoplayNote.hidden = true;

    // Start TTS a tiny bit delayed so it punches through
    setTimeout(() => {
      speak("BENJAMIN NETANYAHU IS MY DAD!");
    }, 800);

    if (!ttsInterval) {
      ttsInterval = setInterval(() => {
        speak("BENJAMIN NETANYAHU IS MY DAD!");
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

// Slider disabled + chud punishment
volumeSlider.disabled = true;

volumeSlider.addEventListener("pointerdown", () => {
  speakChud();
  forceMaxVolume();
}, { passive: true });

volumeSlider.addEventListener("keydown", (e) => {
  if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) {
    speakChud();
    forceMaxVolume();
    e.preventDefault();
  }
});

audioEl.addEventListener("volumechange", () => {
  if (audioEl.volume < 0.95) {
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

audioEl.addEventListener("pause", () => {
  if (audioEl.currentTime < audioEl.duration - 1) {
    audioEl.play().catch(() => {});
    forceMaxVolume();
  }
});