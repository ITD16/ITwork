const isDarkTheme =
  document.documentElement.getAttribute("data-theme") === "dark";

const particlesConfig = isDarkTheme
  ? {
      dotColor: "#d7e3ff",
      dotOpacity: 0.82,
      lineColor: "#c6d6ff",
      lineOpacity: 0.68,
      grabLineOpacity: 1,
    }
  : {
      dotColor: "#8b93a7",
      dotOpacity: 0.5,
      lineColor: "#a0a8bb",
      lineOpacity: 0.4,
      grabLineOpacity: 0.8,
    };

particlesJS("particles-js", {
  particles: {
    number: {
      value: 80,
      density: { enable: true, value_area: 800 },
    },
    color: { value: particlesConfig.dotColor },
    shape: {
      type: "circle",
      stroke: { width: 0, color: "#000000" },
    },
    opacity: {
      value: particlesConfig.dotOpacity,
      random: false,
      anim: { enable: false, speed: 1, opacity_min: 0.1, sync: false },
    },
    size: {
      value: 3,
      random: true,
      anim: { enable: false, speed: 40, size_min: 0.1, sync: false },
    },
    line_linked: {
      enable: true,
      distance: 150,
      color: particlesConfig.lineColor,
      opacity: particlesConfig.lineOpacity,
      width: 1,
    },
    move: {
      enable: true,
      speed: 3,
      direction: "none",
      random: false,
      straight: false,
      out_mode: "out",
      bounce: false,
      attract: { enable: false, rotateX: 600, rotateY: 1200 },
    },
  },
  interactivity: {
    detect_on: "canvas",
    events: {
      onhover: { enable: true, mode: "grab" },
      onclick: { enable: true, mode: "push" },
      resize: true,
    },
    modes: {
      grab: {
        distance: 180,
        line_linked: { opacity: particlesConfig.grabLineOpacity },
      },
      bubble: { distance: 150, size: 40, duration: 2, opacity: 8, speed: 3 },
      repulse: { distance: 180, duration: 0.4 },
      push: { particles_nb: 4 },
      remove: { particles_nb: 2 },
    },
  },
  retina_detect: true,
});
