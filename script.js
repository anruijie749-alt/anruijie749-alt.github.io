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

// 变现功能：生成方案（示例）
function generatePlan(type) {
    alert('AI正在为您生成专属方案，请稍候...\n\n（此功能可对接AI API或后端服务）');
}

// 变现功能：咨询表单
function showConsultForm(service) {
    alert(`${service} - 咨询表单\n\n（可对接后端API或第三方表单服务，如金数据、腾讯问卷等）\n\n功能说明：\n1. 收集用户姓名、电话、咨询内容\n2. 对接支付接口验证\n3. 自动发送通知到管理员\n4. 24小时内联系用户`);
}

function submitConsult() {
    alert('咨询信息已提交，我们将在24小时内与您联系！');
}

// 全局函数：生成方案
function generatePlan(type) {
    const typeMap = {
        'health': '健康管理',
        'senior': '银发族生活',
        'tea': '茶文化',
        'tools': 'AI工具'
    };
    const typeName = typeMap[type] || '专属';
    alert(`AI正在为您生成${typeName}专属方案，请稍候...\n\n（此功能可对接AI API，如OpenAI、文心一言等）\n\n实现方式：\n1. 收集用户输入信息\n2. 调用AI API生成方案\n3. 返回个性化方案文档\n4. 支持付费解锁完整版`);
}

