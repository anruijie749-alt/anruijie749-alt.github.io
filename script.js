// 粒子背景初始化
function initParticles() {
  if (typeof particlesJS !== 'undefined') {
      particlesJS("particles-js", {
          "particles": {
              "number": { 
                  "value": 100, 
                  "density": { 
                      "enable": true, 
                      "value_area": 800 
                  } 
              },
              "color": { 
                  "value": ["#38bdf8", "#818cf8", "#a78bfa"] 
              },
              "shape": { 
                  "type": "circle" 
              },
              "opacity": { 
                  "value": 0.6, 
                  "random": true 
              },
              "size": { 
                  "value": 4, 
                  "random": true, 
                  "anim": { 
                      "enable": true, 
                      "speed": 2, 
                      "size_min": 1 
                  } 
              },
              "line_linked": {
                  "enable": true,
                  "distance": 160,
                  "color": "#38bdf8",
                  "opacity": 0.3,
                  "width": 1
              },
              "move": {
                  "enable": true,
                  "speed": 1.2,
                  "direction": "none",
                  "random": true,
                  "straight": false,
                  "out_mode": "out",
                  "bounce": false,
                  "attract": { 
                      "enable": true, 
                      "rotateX": 600, 
                      "rotateY": 1200 
                  }
              }
          },
          "interactivity": {
              "detect_on": "canvas",
              "events": {
                  "onhover": { 
                      "enable": true, 
                      "mode": "grab" 
                  },
                  "onclick": { 
                      "enable": true, 
                      "mode": "push" 
                  },
                  "resize": true
              },
              "modes": {
                  "grab": { 
                      "distance": 150, 
                      "line_linked": { 
                          "opacity": 0.8 
                      } 
                  },
                  "push": { 
                      "particles_nb": 5 
                  }
              }
          },
          "retina_detect": true
      });
  }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
  initParticles();
  
  // 设置当前页面的导航高亮
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  const navLinks = document.querySelectorAll('.nav-menu a');
  navLinks.forEach(link => {
      const linkPage = link.getAttribute('href');
      if (linkPage === currentPage || (currentPage === '' && linkPage === 'index.html')) {
          link.classList.add('active');
      }
  });
});

// 平滑滚动
function smoothScroll(target) {
  const element = document.querySelector(target);
  if (element) {
      element.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
      });
  }
}

// 汉堡菜单点击
const hamburger = document.getElementById('hamburger');
const navContainer = document.getElementById('navContainer');
if (hamburger) {
  hamburger.addEventListener('click', function() {
      navContainer.classList.toggle('active');
  });
}