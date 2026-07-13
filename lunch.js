// ==================== CPS链接配置 ====================
// 填入联盟后台生成的推广链接；同一 HTTPS 链接各地用户均可打开（能否下单、是否计佣以平台规则为准）。
const CPS_LINKS = {
    prizeLink: 'https://xxxxxx',
    catalogLink: 'https://xxxxxx'
};

const FALLBACK_PRIZE_URL = 'https://www.ele.me/';
const FALLBACK_PRIZE_URL_INTL = 'https://www.ubereats.com/';
// ====================================================

// 转盘选项数据（8个选项：1个大奖 + 7个普通选项）
const wheelItems = [
    { name: '外卖红包', icon: '🎁', isPrize: true, type: 'prize' }, // 大奖
    { name: '继续努力', icon: '💪', isPrize: false, type: 'normal' },
    { name: '明天再来', icon: '🌙', isPrize: false, type: 'normal' },
    { name: '加油加油', icon: '🔥', isPrize: false, type: 'normal' },
    { name: '再接再厉', icon: '⭐', isPrize: false, type: 'normal' },
    { name: '坚持就是胜利', icon: '🏆', isPrize: false, type: 'normal' },
    { name: '好运连连', icon: '🍀', isPrize: false, type: 'normal' },
    { name: '下次一定', icon: '✨', isPrize: false, type: 'normal' }
];

// 完整菜谱数据（用于餐谱目录）
const menuItems = [
    { name: '东北烀饼', icon: '🥘', price: 65, taste: ['清淡'], vegetarian: false, desc: '锅里面有排骨豆角、土豆、粉条、山药，上面加千层饼' },
    { name: '猪肉酸菜炖粉条', icon: '🍲', price: 45, taste: ['清淡'], vegetarian: false },
    { name: '牛排西式面', icon: '🍝', price: 85, taste: ['清淡'], vegetarian: false },
    { name: '西红柿炖牛腩', icon: '🍅', price: 75, taste: ['清淡'], vegetarian: false },
    { name: '麻辣香锅', icon: '🌶️', price: 55, taste: ['中辣', '重辣'], vegetarian: false },
    { name: '火锅', icon: '🔥', price: 80, taste: ['中辣', '重辣'], vegetarian: false },
    { name: '烤大虾', icon: '🦐', price: 90, taste: ['清淡'], vegetarian: false },
    { name: '铁板烤鱼', icon: '🐟', price: 70, taste: ['中辣', '重辣'], vegetarian: false },
    { name: '烧肉铁锅', icon: '🍖', price: 60, taste: ['清淡', '中辣'], vegetarian: false },
    { name: '炖大鹅', icon: '🦢', price: 95, taste: ['清淡'], vegetarian: false },
    { name: '红烧肉', icon: '🥩', price: 50, taste: ['清淡'], vegetarian: false },
    { name: '拉面', icon: '🍜', price: 25, taste: ['清淡'], vegetarian: false },
    { name: '麻辣烫', icon: '🌶️', price: 30, taste: ['中辣', '重辣'], vegetarian: false },
    { name: '沙拉', icon: '🥗', price: 35, taste: ['清淡'], vegetarian: true },
    { name: '炒饭', icon: '🍛', price: 20, taste: ['清淡', '中辣'], vegetarian: false },
    { name: '水饺', icon: '🥟', price: 25, taste: ['清淡'], vegetarian: false },
    { name: '烧烤', icon: '🍢', price: 60, taste: ['中辣', '重辣'], vegetarian: false },
    { name: '寿司', icon: '🍣', price: 60, taste: ['清淡'], vegetarian: false },
    { name: '汉堡', icon: '🍔', price: 35, taste: ['清淡'], vegetarian: false },
    { name: '披萨', icon: '🍕', price: 50, taste: ['清淡'], vegetarian: false },
    { name: '炸鸡', icon: '🍗', price: 40, taste: ['清淡', '中辣'], vegetarian: false },
    { name: '盖浇饭', icon: '🍱', price: 28, taste: ['清淡', '中辣'], vegetarian: false },
    { name: '酸辣粉', icon: '🍲', price: 22, taste: ['中辣', '重辣'], vegetarian: false },
    { name: '粥', icon: '🥣', price: 15, taste: ['清淡'], vegetarian: true }
];

// 转盘颜色数组（五颜六色）
const wheelColors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
    '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739', '#52BE80',
    '#EC7063', '#5DADE2', '#F1948A', '#82E0AA', '#F9E79F'
];

// 历史记录（存储在localStorage）
let history = JSON.parse(localStorage.getItem('lunchHistory')) || [];

// 转盘相关变量
let wheelCanvas, wheelCtx;
let currentRotation = 0;
let isSpinning = false;
let selectedIndex = -1;

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    initParticleBackground();
    initWheel();
    initEventListeners();
    updateTodayRecommend();
    updateHistory();
    initCatalogButton();
});

// 初始化3D粒子背景
function initParticleBackground() {
    const canvas = document.getElementById('particleCanvas');
    const ctx = canvas.getContext('2d');
    
    // 设置画布大小
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // 粒子类
    class Particle {
        constructor() {
            this.reset();
        }
        
        reset() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.z = Math.random() * 1000 + 500;
            this.size = Math.random() * 2 + 1;
            this.speed = Math.random() * 0.5 + 0.2;
        }
        
        update() {
            this.z -= this.speed;
            if (this.z <= 0) {
                this.reset();
                this.z = 1000;
            }
        }
        
        draw() {
            const x = (this.x - canvas.width / 2) * (500 / this.z) + canvas.width / 2;
            const y = (this.y - canvas.height / 2) * (500 / this.z) + canvas.height / 2;
            const scale = 500 / this.z;
            const alpha = Math.min(1, this.z / 500);
            
            ctx.beginPath();
            ctx.arc(x, y, this.size * scale, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(0, 255, 255, ${alpha * 0.6})`;
            ctx.fill();
            
            // 连接线
            particles.forEach(p => {
                if (p !== this) {
                    const dx = (this.x - canvas.width / 2) * (500 / this.z) - 
                               (p.x - canvas.width / 2) * (500 / p.z);
                    const dy = (this.y - canvas.height / 2) * (500 / this.z) - 
                               (p.y - canvas.height / 2) * (500 / p.z);
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    if (distance < 100 && this.z < 800 && p.z < 800) {
                        ctx.beginPath();
                        ctx.moveTo(
                            (this.x - canvas.width / 2) * (500 / this.z) + canvas.width / 2,
                            (this.y - canvas.height / 2) * (500 / this.z) + canvas.height / 2
                        );
                        ctx.lineTo(
                            (p.x - canvas.width / 2) * (500 / p.z) + canvas.width / 2,
                            (p.y - canvas.height / 2) * (500 / p.z) + canvas.height / 2
                        );
                        ctx.strokeStyle = `rgba(0, 255, 255, ${(1 - distance / 100) * 0.2})`;
                        ctx.lineWidth = 1;
                        ctx.stroke();
                    }
                }
            });
        }
    }
    
    // 创建粒子
    const particles = [];
    for (let i = 0; i < 100; i++) {
        particles.push(new Particle());
    }
    
    // 动画循环
    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        particles.forEach(particle => {
            particle.update();
            particle.draw();
        });
        
        requestAnimationFrame(animate);
    }
    
    animate();
}

// 初始化事件监听
function initEventListeners() {
    document.getElementById('spinBtn').addEventListener('click', spinWheel);
    document.getElementById('againBtn').addEventListener('click', spinWheel);
    
    // 过滤选项变化时更新
    document.querySelectorAll('input[name="budget"], input[name="taste"]').forEach(input => {
        input.addEventListener('change', function() {
            // 可以在这里添加实时过滤提示
        });
    });
}

// 初始化餐谱目录按钮
function initCatalogButton() {
    const catalogBtn = document.getElementById('catalogBtn');
    if (catalogBtn) {
        catalogBtn.addEventListener('click', function() {
            // 跳转到餐谱目录CPS链接
            if (CPS_LINKS.catalogLink && CPS_LINKS.catalogLink !== 'https://xxxxxx') {
                window.open(CPS_LINKS.catalogLink, '_blank');
            } else {
                alert('餐谱目录链接未配置，请联系管理员！');
            }
        });
    }
}

// 初始化转盘
function initWheel() {
    wheelCanvas = document.getElementById('wheelCanvas');
    wheelCtx = wheelCanvas.getContext('2d');
    
    // 设置画布大小
    function resizeWheel() {
        const container = document.querySelector('.wheel-container');
        const maxSize = Math.min(window.innerWidth - 80, 400);
        const size = Math.max(maxSize, 280); // 最小280px
        wheelCanvas.width = size;
        wheelCanvas.height = size;
        drawWheel();
    }
    
    // 延迟初始化，确保DOM已渲染
    setTimeout(() => {
        resizeWheel();
        window.addEventListener('resize', resizeWheel);
    }, 100);
}

// 绘制转盘
function drawWheel(items = null) {
    if (!wheelCtx) return;
    
    let itemsToShow = items;
    if (!itemsToShow || itemsToShow.length === 0) {
        // 如果没有指定或为空，使用转盘选项（8个选项）
        itemsToShow = wheelItems;
    }
    
    const centerX = wheelCanvas.width / 2;
    const centerY = wheelCanvas.height / 2;
    const radius = Math.min(centerX, centerY) - 20;
    const anglePerItem = (2 * Math.PI) / itemsToShow.length;
    
    // 清空画布
    wheelCtx.clearRect(0, 0, wheelCanvas.width, wheelCanvas.height);
    
    // 保存当前状态
    wheelCtx.save();
    wheelCtx.translate(centerX, centerY);
    wheelCtx.rotate(currentRotation);
    
    // 绘制扇形
    itemsToShow.forEach((item, index) => {
        const startAngle = index * anglePerItem - Math.PI / 2;
        const endAngle = (index + 1) * anglePerItem - Math.PI / 2;
        
        // 绘制扇形
        wheelCtx.beginPath();
        wheelCtx.moveTo(0, 0);
        wheelCtx.arc(0, 0, radius, startAngle, endAngle);
        wheelCtx.closePath();
        
        // 填充颜色
        const color = wheelColors[index % wheelColors.length];
        wheelCtx.fillStyle = color;
        wheelCtx.fill();
        
        // 边框
        wheelCtx.strokeStyle = '#fff';
        wheelCtx.lineWidth = 2;
        wheelCtx.stroke();
        
        // 绘制文字
        const textAngle = startAngle + anglePerItem / 2;
        const textRadius = radius * 0.65;
        const textX = Math.cos(textAngle) * textRadius;
        const textY = Math.sin(textAngle) * textRadius;
        
        wheelCtx.save();
        wheelCtx.translate(textX, textY);
        wheelCtx.rotate(textAngle + Math.PI / 2);
        wheelCtx.fillStyle = '#fff';
        
        // 根据转盘大小自适应字体
        const baseFontSize = Math.max(14, radius / 15);
        wheelCtx.font = `bold ${baseFontSize}px Microsoft YaHei`;
        wheelCtx.textAlign = 'center';
        wheelCtx.textBaseline = 'middle';
        
        // 绘制图标和文字
        const text = `${item.icon} ${item.name}`;
        const maxWidth = radius * 0.35;
        
        // 如果文字太长，缩小字体
        let fontSize = baseFontSize;
        while (wheelCtx.measureText(text).width > maxWidth && fontSize > 10) {
            fontSize -= 1;
            wheelCtx.font = `bold ${fontSize}px Microsoft YaHei`;
        }
        
        // 添加文字阴影效果
        wheelCtx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        wheelCtx.shadowBlur = 3;
        wheelCtx.shadowOffsetX = 1;
        wheelCtx.shadowOffsetY = 1;
        
        wheelCtx.fillText(text, 0, 0);
        wheelCtx.restore();
    });
    
    wheelCtx.restore();
    
    // 绘制中心圆
    const centerRadius = Math.max(25, radius / 12);
    wheelCtx.beginPath();
    wheelCtx.arc(centerX, centerY, centerRadius, 0, 2 * Math.PI);
    wheelCtx.fillStyle = '#fff';
    wheelCtx.fill();
    wheelCtx.strokeStyle = '#00ffff';
    wheelCtx.lineWidth = 3;
    wheelCtx.stroke();
    
    // 绘制指针（根据转盘大小调整）
    const pointerSize = Math.max(12, radius / 20);
    wheelCtx.beginPath();
    wheelCtx.moveTo(centerX, centerY - radius - pointerSize * 1.2);
    wheelCtx.lineTo(centerX - pointerSize, centerY - radius - pointerSize * 0.3);
    wheelCtx.lineTo(centerX + pointerSize, centerY - radius - pointerSize * 0.3);
    wheelCtx.closePath();
    wheelCtx.fillStyle = '#00ff88';
    wheelCtx.fill();
    wheelCtx.strokeStyle = '#fff';
    wheelCtx.lineWidth = 2;
    wheelCtx.stroke();
}

// 转盘旋转
function spinWheel() {
    if (isSpinning) return;
    
    const spinBtn = document.getElementById('spinBtn');
    const againBtn = document.getElementById('againBtn');
    const catalogBtn = document.getElementById('catalogBtn');
    
    // 禁用所有按钮（防止重复点击）
    spinBtn.disabled = true;
    if (againBtn.style.display !== 'none') {
        againBtn.disabled = true;
    }
    if (catalogBtn) {
        catalogBtn.disabled = true;
    }
    
    isSpinning = true;
    
    // 使用转盘选项（8个选项）
    const itemsToSpin = wheelItems;
    
    // 重新绘制转盘
    drawWheel(itemsToSpin);
    
    // 随机选择（可以控制中奖概率）
    const selected = selectWheelItem(itemsToSpin);
    selectedIndex = itemsToSpin.indexOf(selected);
    
    // 计算目标角度（让选中的项停在指针位置）
    const anglePerItem = (2 * Math.PI) / itemsToSpin.length;
    const targetAngle = -selectedIndex * anglePerItem + Math.PI / 2;
    
    // 旋转动画（多转几圈增加效果）
    const spins = 5; // 转5圈
    const totalRotation = spins * 2 * Math.PI + targetAngle;
    
    const startRotation = currentRotation;
    const startTime = Date.now();
    const duration = 3000; // 3秒
    
    function animate() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // 使用缓动函数
        const easeOut = 1 - Math.pow(1 - progress, 3);
        currentRotation = startRotation + totalRotation * easeOut;
        
        drawWheel(itemsToSpin);
        
        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            // 动画结束
            isSpinning = false;
            
            // 检查是否是大奖
            if (selected.isPrize) {
                // 大奖：自动跳转到CPS链接
                handlePrizeWin(selected);
            } else {
                // 普通选项：显示结果弹窗
                displayResult(selected);
                
                // 显示"再来一次"按钮
                againBtn.style.display = 'inline-block';
                spinBtn.disabled = false;
                againBtn.disabled = false;
                if (catalogBtn) {
                    catalogBtn.disabled = false;
                }
            }
            
            // 保存到历史记录
            addToHistory(selected);
            updateHistory();
            
            // 高亮选中项
            highlightSelected(itemsToSpin, selectedIndex);
        }
    }
    
    animate();
}

// 选择转盘选项（可控制中奖概率）
function selectWheelItem(items) {
    // 可以调整中奖概率，这里设置为12.5%（1/8）
    // 如果需要调整概率，可以修改这里的逻辑
    const prizeProbability = 0.125; // 12.5%概率中奖
    
    if (Math.random() < prizeProbability) {
        // 中奖：返回大奖选项
        return items.find(item => item.isPrize) || items[0];
    } else {
        // 未中奖：随机返回普通选项
        const normalItems = items.filter(item => !item.isPrize);
        const randomIndex = Math.floor(Math.random() * normalItems.length);
        return normalItems[randomIndex];
    }
}

// 处理大奖中奖
function handlePrizeWin(item) {
    // 显示中奖提示
    const modal = document.getElementById('resultModal');
    const modalText = document.getElementById('modalText');
    const modalIcon = document.getElementById('modalIcon');
    
    modalText.textContent = `🎉 恭喜你抽中${item.icon} ${item.name}！\n\n正在跳转到优惠券领取页面...`;
    modalIcon.textContent = item.icon;
    
    modal.classList.add('show');
    
    // 延迟跳转，让用户看到提示
    setTimeout(() => {
        const configured = CPS_LINKS.prizeLink && CPS_LINKS.prizeLink !== 'https://xxxxxx';
        const lang = (navigator.language || '').toLowerCase();
        const preferIntl = !lang.startsWith('zh');
        if (configured) {
            window.open(CPS_LINKS.prizeLink, '_blank');
        } else {
            window.open(preferIntl ? FALLBACK_PRIZE_URL_INTL : FALLBACK_PRIZE_URL, '_blank');
        }
        
        // 关闭弹窗
        closeModal();
        
        // 恢复按钮状态
        const spinBtn = document.getElementById('spinBtn');
        const againBtn = document.getElementById('againBtn');
        const catalogBtn = document.getElementById('catalogBtn');
        
        againBtn.style.display = 'inline-block';
        spinBtn.disabled = false;
        againBtn.disabled = false;
        if (catalogBtn) {
            catalogBtn.disabled = false;
        }
    }, 2000); // 2秒后跳转
}

// 高亮选中项
function highlightSelected(items, index) {
    const anglePerItem = (2 * Math.PI) / items.length;
    const centerX = wheelCanvas.width / 2;
    const centerY = wheelCanvas.height / 2;
    const radius = Math.min(centerX, centerY) - 20;
    
    // 绘制高亮边框
    const startAngle = index * anglePerItem - Math.PI / 2;
    const endAngle = (index + 1) * anglePerItem - Math.PI / 2;
    
    wheelCtx.save();
    wheelCtx.translate(centerX, centerY);
    wheelCtx.rotate(currentRotation);
    
    wheelCtx.beginPath();
    wheelCtx.moveTo(0, 0);
    wheelCtx.arc(0, 0, radius, startAngle, endAngle);
    wheelCtx.closePath();
    wheelCtx.strokeStyle = '#00ff88';
    wheelCtx.lineWidth = 5;
    wheelCtx.stroke();
    
    wheelCtx.restore();
}

// 获取过滤后的选项
function getFilteredItems() {
    // 获取预算
    const budget = parseInt(document.querySelector('input[name="budget"]:checked').value);
    
    // 获取口味偏好
    const selectedTastes = Array.from(document.querySelectorAll('input[name="taste"]:checked'))
        .map(cb => cb.value);
    
    // 获取最近3次历史记录
    const recentHistory = history.slice(-3).map(h => h.name);
    
    // 过滤
    let filtered = menuItems.filter(item => {
        // 预算过滤
        if (item.price > budget) return false;
        
        // 口味过滤（如果选择了口味偏好）
        if (selectedTastes.length > 0) {
            if (selectedTastes.includes('素食')) {
                if (!item.vegetarian) return false;
            } else {
                // 检查是否有匹配的口味
                const hasMatchingTaste = item.taste.some(taste => selectedTastes.includes(taste));
                if (!hasMatchingTaste) return false;
            }
        }
        
        // 避免重复最近3次
        if (recentHistory.includes(item.name)) return false;
        
        return true;
    });
    
    // 如果过滤后没有选项，则放宽条件（只保留预算限制）
    if (filtered.length === 0) {
        filtered = menuItems.filter(item => item.price <= budget);
    }
    
    return filtered;
}

// 随机选择（带权重，今日推荐优先）
function selectRandomItem(items) {
    // 获取今日推荐
    const todayRecommend = getTodayRecommend();
    
    // 如果今日推荐在选项中，增加权重
    if (todayRecommend && items.some(item => item.name === todayRecommend.name)) {
        const recommendItem = items.find(item => item.name === todayRecommend.name);
        // 50%概率选择推荐项
        if (Math.random() < 0.5) {
            return recommendItem;
        }
    }
    
    // 否则随机选择
    const randomIndex = Math.floor(Math.random() * items.length);
    return items[randomIndex];
}

// 显示结果
function displayResult(item) {
    // 显示弹窗
    showModal(item);
}

// 显示弹窗
function showModal(item) {
    const modal = document.getElementById('resultModal');
    const modalText = document.getElementById('modalText');
    const modalIcon = document.getElementById('modalIcon');
    
    let text = `今天吃${item.icon} ${item.name}！`;
    if (item.desc) {
        text += `\n${item.desc}`;
    }
    modalText.textContent = text;
    modalIcon.textContent = item.icon;
    
    modal.classList.add('show');
    
    // 更新分享按钮
    updateShareButton(item);
}

// 关闭弹窗
function closeModal() {
    const modal = document.getElementById('resultModal');
    modal.classList.remove('show');
}

// 添加到历史记录
function addToHistory(item) {
    const historyItem = {
        name: item.name,
        icon: item.icon,
        date: new Date().toLocaleDateString('zh-CN'),
        isPrize: item.isPrize || false
    };
    
    history.push(historyItem);
    
    // 只保留最近10条
    if (history.length > 10) {
        history = history.slice(-10);
    }
    
    localStorage.setItem('lunchHistory', JSON.stringify(history));
}

// 更新历史记录显示
function updateHistory() {
    const historyList = document.getElementById('historyList');
    const recentHistory = history.slice(-3).reverse();
    
    if (recentHistory.length === 0) {
        historyList.innerHTML = '<div class="history-item">暂无历史记录</div>';
        return;
    }
    
    historyList.innerHTML = recentHistory.map(item => 
        `<div class="history-item">${item.icon} ${item.name} - ${item.date}</div>`
    ).join('');
}

// 获取今日推荐（从完整菜谱中选择）
function getTodayRecommend() {
    // 简单的推荐逻辑：根据天气/时间等
    const hour = new Date().getHours();
    const day = new Date().getDay();
    
    // 雨天推荐火锅（这里用随机模拟）
    const isRainy = Math.random() < 0.3; // 30%概率模拟雨天
    
    if (isRainy) {
        return menuItems.find(item => item.name === '火锅') || menuItems[0];
    }
    
    // 晴天推荐沙拉
    if (hour >= 11 && hour <= 14) {
        return menuItems.find(item => item.name === '沙拉') || menuItems[0];
    }
    
    // 其他时间随机推荐
    return menuItems[Math.floor(Math.random() * menuItems.length)];
}

// 更新今日推荐显示
function updateTodayRecommend() {
    const recommendItem = getTodayRecommend();
    const recommendDiv = document.getElementById('todayRecommend');
    
    if (recommendItem) {
        recommendDiv.innerHTML = `⭐ ${recommendItem.icon} ${recommendItem.name} - ${recommendItem.price}元`;
    } else {
        recommendDiv.innerHTML = '暂无推荐';
    }
}

// 更新分享按钮
function updateShareButton(item) {
    const shareBtn = document.getElementById('shareBtn');
    if (shareBtn) {
        shareBtn.onclick = function() {
            shareToWeChat(item);
        };
    }
}

// 微信分享功能
function shareToWeChat(item) {
    const shareText = `🎉 今天吃${item.icon} ${item.name}！\n\n快来试试随机午餐大转盘，决定今天吃什么！`;
    const shareUrl = window.location.href;
    
    // 复制到剪贴板
    if (navigator.clipboard) {
        navigator.clipboard.writeText(shareText + '\n' + shareUrl).then(() => {
            alert('分享内容已复制到剪贴板！\n\n可以在微信中粘贴分享给好友或朋友圈。');
        }).catch(() => {
            fallbackShare(shareText, shareUrl);
        });
    } else {
        fallbackShare(shareText, shareUrl);
    }
}

// 备用分享方法
function fallbackShare(text, url) {
    const textarea = document.createElement('textarea');
    textarea.value = text + '\n' + url;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
        document.execCommand('copy');
        alert('分享内容已复制到剪贴板！\n\n可以在微信中粘贴分享给好友或朋友圈。');
    } catch (err) {
        alert('请手动复制以下内容分享：\n\n' + text + '\n' + url);
    }
    document.body.removeChild(textarea);
}

// 点击弹窗外部关闭
window.onclick = function(event) {
    const modal = document.getElementById('resultModal');
    if (event.target === modal) {
        closeModal();
    }
}
