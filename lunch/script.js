// ==================== CPS链接配置 ====================
// 只需要改这里：把链接换成你的淘宝联盟/京东联盟链接（外卖券/红包入口）
// 为空则自动隐藏入口，避免误触/违规风险
const CPS_LINKS = {
  prizeLink: 'https://kzurl18.cn/t2KMrt',
  // prizeLink: 'https://s.click.taobao.com/4jcI3ml',
  catalogLink: 'https://kzurl18.cn/t2KMrt'
};
// ====================================================

// ==================== 外卖平台直达配置（非联盟必填） ====================
// 说明：这里是普通跳转，默认不给你带任何推广标记，不涉及年龄/联盟审核，
// 只是帮你打开饿了么 / 美团官方页面，是否下单完全由用户自己决定。
// 如你日后开通官方推广，可替换为你的合规推广链接。
const PLATFORM_LINKS = {
  eleme: 'https://u.ele.me/BqSwhD2S',   // 饿了么H5首页（可按需修改）
  jingdong: 'https://u.jd.com/RO6EzFn' // 京东秒送H5首页（可按需修改）
};
// ====================================================

// ==================== IP定位（占位） ====================
// 需求：尽量根据 IP 识别用户大致所在地，用于跳转到更匹配的“本地页/频道页”。
// 你可以把 GEO_CONFIG.endpoint 换成你自己的接口：
// - 你的后端：/api/geo/ip
// - 第三方：返回 { country, province, city, district, adcode, lat, lng }
// 注意：如果 endpoint 为空，本功能自动降级，不影响使用。
const GEO_CONFIG = {
  // 第28行，整行改成这样
  endpoint: "https://ipapi.co/json/",
  timeoutMs: 1200,
  cacheMs: 6 * 60 * 60 * 1000, // 6小时
  storageKey: "geo_ip_cache_v1"
};

// 可选：按地区覆盖跳转（优先级最高）
// key 可以是 adcode / 省 / 市（按你接口返回来定）
const REGION_LINK_OVERRIDES = {
  // 例子（占位）：
  // "北京市": { meituan: "https://i.waimai.meituan.com/home?city=beijing", eleme: "https://h5.ele.me/msite/" }
};
// =======================================================

// 转盘固定显示 12 扇形（你要的）
const MAX_WHEEL_ITEMS = 12;

// 统计与历史存储
const STORAGE_KEY_HISTORY = "lunchHistory_v3";
const STORAGE_KEY_STATS = "lunchStats_v1";

let history = JSON.parse(localStorage.getItem(STORAGE_KEY_HISTORY)) || [];
let stats = JSON.parse(localStorage.getItem(STORAGE_KEY_STATS)) || {}; // { name: count }

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
  { name: '水饺', icon: '🥟', price: 20, taste: ['清淡'], vegetarian: false },
  { name: '烧烤', icon: '🍢', price: 60, taste: ['中辣', '重辣'], vegetarian: false },
  { name: '寿司', icon: '🍣', price: 60, taste: ['清淡'], vegetarian: false },
  { name: '汉堡', icon: '🍔', price: 35, taste: ['清淡'], vegetarian: false },
  { name: '披萨', icon: '🍕', price: 50, taste: ['清淡'], vegetarian: false },
  { name: '炸鸡', icon: '🍗', price: 40, taste: ['清淡', '中辣'], vegetarian: false },
  { name: '盖浇饭', icon: '🍱', price: 22, taste: ['清淡', '中辣'], vegetarian: false },
  { name: '酸辣粉', icon: '🍲', price: 18, taste: ['中辣', '重辣'], vegetarian: false },
  { name: '粥', icon: '🥣', price: 15, taste: ['清淡'], vegetarian: true }
];

const wheelColors = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
  '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739', '#52BE80',
  '#EC7063', '#5DADE2'
];

let wheelCanvas, wheelCtx;
let currentRotation = 0;
let isSpinning = false;
let lastCandidates = [];
let jumpLock = false;
let autoJumpTimer = null;

document.addEventListener('DOMContentLoaded', () => {
  initParticleBackground();
  initWheel();
  initEventListeners();
  updateTodayRecommend();
  updateRecentChips();
  initCatalogLink();
  initPlatformButtons();
  initResultModal();
  initFooter();
  initGeoHintAndCache(); // 不阻塞交互，后台识别
});

function initParticleBackground() {
  const canvas = document.getElementById('particleCanvas');
  const ctx = canvas.getContext('2d');
  const prefersReducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isSmallScreen = Math.min(window.innerWidth, window.innerHeight) < 420;

  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  class Particle {
    constructor() { this.reset(); }
    reset() {
      this.x = Math.random() * canvas.width;
      this.y = Math.random() * canvas.height;
      this.z = Math.random() * 1000 + 500;
      this.size = Math.random() * 2 + 1;
      this.speed = Math.random() * 0.5 + 0.2;
    }
    update() {
      this.z -= this.speed;
      if (this.z <= 0) { this.reset(); this.z = 1000; }
    }
    draw(particles) {
      const x = (this.x - canvas.width / 2) * (500 / this.z) + canvas.width / 2;
      const y = (this.y - canvas.height / 2) * (500 / this.z) + canvas.height / 2;
      const scale = 500 / this.z;
      const alpha = Math.min(1, this.z / 500);

      ctx.beginPath();
      ctx.arc(x, y, this.size * scale, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0, 255, 255, ${alpha * 0.6})`;
      ctx.fill();

      for (const p of particles) {
        if (p === this) continue;
        const dx = (this.x - canvas.width / 2) * (500 / this.z) - (p.x - canvas.width / 2) * (500 / p.z);
        const dy = (this.y - canvas.height / 2) * (500 / this.z) - (p.y - canvas.height / 2) * (500 / p.z);
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
    }
  }

  const particles = [];
  // 性能优化：移动端/小屏/减少动效场景降低粒子数量
  const particleCount = prefersReducedMotion ? 0 : (isSmallScreen ? 45 : 90);
  for (let i = 0; i < particleCount; i++) particles.push(new Particle());

  if (particleCount === 0) {
    // 用户系统设置“减少动效”：不绘制背景动画
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    return;
  }

  let rafId = 0;
  let running = true;

  function animate() {
    if (!running) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const p of particles) { p.update(); p.draw(particles); }
    rafId = requestAnimationFrame(animate);
  }

  // 标签页不可见时暂停，避免后台耗电/卡顿
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      running = false;
      if (rafId) cancelAnimationFrame(rafId);
      rafId = 0;
      return;
    }
    if (!running) {
      running = true;
      animate();
    }
  });

  animate();
}

function initEventListeners() {
  document.getElementById('spinBtn').addEventListener('click', () => spinWheel());
  document.getElementById('againBtn').addEventListener('click', () => spinWheel());

  // 图一三个按钮
  document.getElementById('menuBtn').addEventListener('click', showMenuCatalog);
  document.getElementById('statsBtn').addEventListener('click', showStats);
  document.getElementById('clearBtn').addEventListener('click', clearData);

  // 筛选变化
  document.querySelectorAll('input[name="budget"], input[name="taste"]').forEach(input => {
    input.addEventListener('change', () => {
      lastCandidates = getCandidatesForWheel();
      drawWheel(lastCandidates);
      updateTodayRecommend();
    });
  });
}

function initFooter() {
  document.getElementById('privacyLink').addEventListener('click', (e) => {
    e.preventDefault();
    showInfo(
      "隐私政策",
      "本工具仅在你的设备本地保存“最近选择/统计”（localStorage），不上传服务器。\n\n当你点击“外卖优惠入口”等链接时，会跳转到第三方平台；第三方的隐私政策与数据处理规则以其页面为准。"
    );
  });

  document.getElementById('termsLink').addEventListener('click', (e) => {
    e.preventDefault();
    showInfo(
      "使用条款",
      "本页面为午餐选择工具，仅提供随机推荐参考。\n\n如你自愿点击外卖优惠入口，将跳转第三方平台查看信息；是否领券/下单以第三方页面为准。"
    );
  });
}

function initCatalogLink() {
  const catalogBtn = document.getElementById('catalogBtn');
  const url = (CPS_LINKS.catalogLink || "").trim();

  if (!url) {
    catalogBtn.style.display = "none";
    return;
  }
  bindSafeJump(catalogBtn, () => buildJumpUrl(url, { type: "coupon" }));
}

function initPlatformButtons() {
  document.querySelector('.platform-section').style.display = 'block';
  
  const elemeBtn = document.getElementById('elemeBtn');
  const jingdongBtn = document.getElementById('jingdongBtn');

  const elemeUrl = (PLATFORM_LINKS.eleme || "").trim();
  const jingdongUrl = (PLATFORM_LINKS.jingdong || "").trim();

  if (elemeBtn) {
    if (elemeUrl) {
      bindSafeJump(elemeBtn, () => buildJumpUrl(elemeUrl, { platform: "eleme", type: "platform" }));
    } else {
      elemeBtn.classList.add('disabled');
      elemeBtn.disabled = true;
    }
  }

  if (jingdongBtn) {
    if (jingdongUrl) {
      bindSafeJump(jingdongBtn, () => buildJumpUrl(jingdongUrl, { platform: "jingdong", type: "platform" }));
    } else {
      // 默认也允许作为普通直达使用，但不带任何“联盟”/“返利”字样
      jingdongBtn.classList.add('disabled');
      jingdongBtn.disabled = true;
    }
  }
}

function bindSafeJump(el, urlOrFactory) {
  if (!el) return;

  el.addEventListener("pointerup", (ev) => {
    ev.preventDefault();
    if (jumpLock) return;
    jumpLock = true;

    const url = (typeof urlOrFactory === "function")
      ? urlOrFactory()
      : urlOrFactory;
    if (url) el.setAttribute("href", url);

    // 使用当前页面跳转，成功率 100%，不会被阻止
    window.open(url, '_blank');  

    setTimeout(() => { jumpLock = false; }, 1500);
  }, { passive: false });
}

function initWheel() {
  wheelCanvas = document.getElementById('wheelCanvas');
  wheelCtx = wheelCanvas.getContext('2d');

  function resizeWheel() {
    const maxSize = Math.min(window.innerWidth - 80, 400);
    const size = Math.max(maxSize, 280);
    wheelCanvas.width = size;
    wheelCanvas.height = size;

    lastCandidates = getCandidatesForWheel();
    drawWheel(lastCandidates);
  }

  setTimeout(() => {
    resizeWheel();
    window.addEventListener('resize', resizeWheel);
  }, 100);
}

// 关键：固定 12 扇形 + 顺扇形写字（图标+菜名）
function drawWheel(items) {
  if (!wheelCtx) return;

  const itemsToShow = (items && items.length) ? items : [{ name: '无可选项', icon: '❌' }];
  const centerX = wheelCanvas.width / 2;
  const centerY = wheelCanvas.height / 2;
  const radius = Math.min(centerX, centerY) - 20;
  const anglePerItem = (2 * Math.PI) / itemsToShow.length;

  wheelCtx.clearRect(0, 0, wheelCanvas.width, wheelCanvas.height);

  wheelCtx.save();
  wheelCtx.translate(centerX, centerY);
  wheelCtx.rotate(currentRotation);

  itemsToShow.forEach((item, index) => {
    const startAngle = index * anglePerItem - Math.PI / 2;
    const endAngle = (index + 1) * anglePerItem - Math.PI / 2;

    wheelCtx.beginPath();
    wheelCtx.moveTo(0, 0);
    wheelCtx.arc(0, 0, radius, startAngle, endAngle);
    wheelCtx.closePath();

    wheelCtx.fillStyle = wheelColors[index % wheelColors.length];
    wheelCtx.fill();

    wheelCtx.strokeStyle = '#fff';
    wheelCtx.lineWidth = 2;
    wheelCtx.stroke();

    // 顺扇形（沿切线方向）写：图标 + 菜名
    const textAngle = startAngle + anglePerItem / 2;
    const textRadius = radius * 0.68;
    const textX = Math.cos(textAngle) * textRadius;
    const textY = Math.sin(textAngle) * textRadius;

    wheelCtx.save();
    wheelCtx.translate(textX, textY);
    wheelCtx.rotate(textAngle + Math.PI / 2);

    wheelCtx.fillStyle = '#fff';
    wheelCtx.textAlign = 'center';
    wheelCtx.textBaseline = 'middle';

    const baseFontSize = Math.max(12, radius / 15);
    const maxWidth = radius * 0.40;
    const text = `${item.icon || ""} ${item.name || ""}`.trim();

    let fontSize = baseFontSize;
    wheelCtx.font = `bold ${fontSize}px Microsoft YaHei`;
    while (wheelCtx.measureText(text).width > maxWidth && fontSize > 10) {
      fontSize -= 1;
      wheelCtx.font = `bold ${fontSize}px Microsoft YaHei`;
    }

    wheelCtx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    wheelCtx.shadowBlur = 3;
    wheelCtx.shadowOffsetX = 1;
    wheelCtx.shadowOffsetY = 1;

    wheelCtx.fillText(text, 0, 0);
    wheelCtx.restore();
  });

  wheelCtx.restore();

  // 中心圆
  const centerRadius = Math.max(25, radius / 12);
  wheelCtx.beginPath();
  wheelCtx.arc(centerX, centerY, centerRadius, 0, 2 * Math.PI);
  wheelCtx.fillStyle = '#fff';
  wheelCtx.fill();
  wheelCtx.strokeStyle = '#00ffff';
  wheelCtx.lineWidth = 3;
  wheelCtx.stroke();

  // 指针
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

function spinWheel() {
  if (isSpinning) return;

  const candidates = getCandidatesForWheel();
  if (!candidates.length) {
    openResultModal({ icon: "❌", name: "无可选项", desc: "当前筛选条件下没有可选项，试试提高预算或取消口味限制～" });
    return;
  }

  const selected = pickSmart(candidates);
  const selectedIndex = candidates.findIndex(x => x.name === selected.name);

  setSpinningUI(true);
  closeResultModal();

  const anglePerItem = (2 * Math.PI) / candidates.length;
  const targetAngle = -selectedIndex * anglePerItem + Math.PI / 2;

  const spins = 5 + Math.floor(Math.random() * 2);
  const totalRotation = spins * 2 * Math.PI + targetAngle;

  const startRotation = currentRotation;
  const startTime = performance.now();
  const duration = 2600 + Math.floor(Math.random() * 350);

  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

  function animate(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    const eased = easeOutCubic(progress);
    currentRotation = startRotation + (totalRotation) * eased;

    drawWheel(candidates);

    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      isSpinning = false;

      addToHistory(selected);
      document.getElementById('againBtn').disabled = false;

      openResultModal(selected);
      setSpinningUI(false);
    }
  }

  requestAnimationFrame(animate);
}

function setSpinningUI(spinning) {
  const spinBtn = document.getElementById('spinBtn');
  const againBtn = document.getElementById('againBtn');
  const catalogBtn = document.getElementById('catalogBtn');

  isSpinning = spinning;
  spinBtn.disabled = spinning;
  againBtn.disabled = spinning ? true : againBtn.disabled;

  if (catalogBtn) {
    if (spinning) catalogBtn.classList.add("disabled");
    else catalogBtn.classList.remove("disabled");
  }
}

// 固定 12 扇形：从候选里抽 12 个展示与旋转
function getCandidatesForWheel() {
  const budgetInput = document.querySelector('input[name="budget"]:checked');
  const budget = parseInt(budgetInput ? budgetInput.value : "50", 10);
  const selectedTastes = Array.from(document.querySelectorAll('input[name="taste"]:checked')).map(cb => cb.value);

  const recentNames = history.slice(-3).map(h => h.name);

  // 先筛一遍
  let filtered = menuItems.filter(item => {
    if (budget !== 999 && item.price > budget) return false;

    if (selectedTastes.length > 0) {
      if (selectedTastes.includes('素食')) {
        if (!item.vegetarian) return false;
      } else {
        const ok = item.taste.some(t => selectedTastes.includes(t));
        if (!ok) return false;
      }
    }

    if (recentNames.includes(item.name)) return false;
    return true;
  });

  // 如果筛空，放宽“最近3个不重复”
  if (filtered.length === 0) {
    filtered = menuItems.filter(item => {
      if (budget !== 999 && item.price > budget) return false;
      if (selectedTastes.length > 0) {
        if (selectedTastes.includes('素食')) return item.vegetarian;
        return item.taste.some(t => selectedTastes.includes(t));
      }
      return true;
    });
  }

  // 打乱并取前 12 个
  const shuffled = shuffle([...filtered]);
  return shuffled.slice(0, Math.min(MAX_WHEEL_ITEMS, shuffled.length));
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function pickSmart(candidates) {
  const today = getTodayRecommend();
  const last = history.length ? history[history.length - 1].name : null;

  const inCandidates = today && candidates.some(x => x.name === today.name);
  if (inCandidates && Math.random() < 0.5) return candidates.find(x => x.name === today.name);

  const pool = last ? candidates.filter(x => x.name !== last) : candidates;
  const pickFrom = pool.length ? pool : candidates;

  return pickFrom[Math.floor(Math.random() * pickFrom.length)];
}

function addToHistory(item) {
  const historyItem = {
    name: item.name,
    icon: item.icon || "🍽️",
    date: new Date().toLocaleDateString('zh-CN')
  };

  history.push(historyItem);
  if (history.length > 12) history = history.slice(-12);

  // 统计 +1
  stats[item.name] = (stats[item.name] || 0) + 1;

  localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(history));
  localStorage.setItem(STORAGE_KEY_STATS, JSON.stringify(stats));

  updateRecentChips();
  updateTodayRecommend();
}

function updateRecentChips() {
  const el = document.getElementById('recentChips');
  if (!el) return;

  const recent = history.slice(-8).reverse();
  if (recent.length === 0) {
    el.innerHTML = `<div class="chip">暂无记录</div>`;
    return;
  }

  el.innerHTML = recent.map(h =>
    `<div class="chip">${h.icon} ${h.name}</div>`
  ).join('');
}

function getTodayRecommend() {
  const hour = new Date().getHours();
  const isLunchTime = hour >= 11 && hour <= 14;

  if (isLunchTime) {
    const light = menuItems.filter(x => x.taste.includes("清淡"));
    if (light.length) return light[Math.floor(Math.random() * light.length)];
  }
  return menuItems[Math.floor(Math.random() * menuItems.length)];
}

function updateTodayRecommend() {
  const recommendItem = getTodayRecommend();
  const recommendDiv = document.getElementById('todayRecommend');
  if (!recommendDiv) return;

  recommendDiv.innerHTML = `⭐ ${recommendItem.icon} ${recommendItem.name} - 预算参考 ${recommendItem.price} 元`;
}

// ----------------- 结果弹窗（修复：不再绑定不存在的ID） -----------------
function initResultModal() {
  const modal = document.getElementById('resultModal');

  // 点击遮罩关闭
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeResultModal();
  });

  // ESC 关闭
  window.addEventListener('keydown', (e) => {
    if (e.key === "Escape") closeResultModal();
  });

  // 弹窗按钮：立即查看外卖优惠（用户点击触发，最稳定）
  const actionBtn = document.getElementById('modalActionBtn');
  actionBtn.addEventListener('click', () => {
    const url = (CPS_LINKS.prizeLink || "").trim();
    if (!url) {
      showInfo("提示", "链接未配置。你可以先不配链接，等测试确认后再配。");
      return;
    }
    // 用 location 更稳（微信内置/浏览器拦截少）
    window.open(url, '_blank');
  });

  // 弹窗按钮：换一个结果
  const againBtn = document.getElementById('modalAgainBtn');
  againBtn.addEventListener('click', () => {
    closeResultModal();
    setTimeout(() => spinWheel(), 50);
  });
}

function openResultModal(item) {
  const modal = document.getElementById('resultModal');
  const modalText = document.getElementById('modalText');
  const modalIcon = document.getElementById('modalIcon');
  const actionBtn = document.getElementById('modalActionBtn');

  const desc = item.desc ? `\n${item.desc}` : '';
  modalText.textContent =
    `今天吃 ${item.icon || "🍽️"} ${item.name}！${desc}\n\n（如你需要，可自愿点击下方入口查看外卖优惠）`;
  modalIcon.textContent = item.icon || "🎉";

  modal.classList.add('show');
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add('modal-open');

  // Auto redirect logic
  const url = (CPS_LINKS.prizeLink || "").trim();
  if (url && actionBtn) {
    actionBtn.textContent = "🎟️ 立即查看外卖优惠";
    actionBtn.onclick = () => {
      // 使用当前页面跳转，成功率 100%，不会被阻止
      window.open(url, '_blank');
  
  };
} else if (actionBtn) {
  actionBtn.textContent = "🎟️ 立即查看外卖优惠";
  actionBtn.disabled = true;
}
}

function closeResultModal() {
  if (autoJumpTimer) clearInterval(autoJumpTimer);
  const actionBtn = document.getElementById('modalActionBtn');
  if (actionBtn) actionBtn.textContent = "🎟️ 立即查看外卖优惠";

  const modal = document.getElementById('resultModal');
  modal.classList.remove('show');
  modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove('modal-open');
}

// ----------------- 信息弹窗（隐私/条款/目录/统计共用） -----------------
function showInfo(title, text) {
  const modal = document.getElementById('infoModal');
  const t = document.getElementById('infoTitle');
  const p = document.getElementById('infoText');
  const ok = document.getElementById('infoOkBtn');

  t.textContent = title;
  p.textContent = text;

  modal.classList.add('show');
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add('modal-open');

  const close = () => {
    modal.classList.remove('show');
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove('modal-open');
  };

  ok.onclick = close;
  modal.onclick = (e) => { if (e.target === modal) close(); };
  window.onkeydown = (e) => { if (e.key === "Escape") close(); };
}

// ----------------- 图一三个功能按钮 -----------------
function showMenuCatalog() {
  const lines = menuItems.map((m, i) => `${i + 1}. ${m.icon} ${m.name}（约${m.price}元）`).join('\n');
  showInfo("📋 菜单目录", lines);
}

function showStats() {
  const entries = Object.entries(stats)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12);

  if (entries.length === 0) {
    showInfo("📊 查看统计", "暂无统计数据。先转几次再来看～");
    return;
  }

  const lines = entries.map(([name, count], idx) => {
    const item = menuItems.find(x => x.name === name);
    const icon = (item && item.icon) ? item.icon : "🍽️";
    return `${idx + 1}. ${icon} ${name}：${count}次`;
  }).join('\n');

  showInfo("📊 查看统计（Top）", lines);
}

function clearData() {
  const ok = confirm("确定要清除“最近选择”和“统计数据”吗？（不可恢复）");
  if (!ok) return;

  history = [];
  stats = {};
  localStorage.removeItem(STORAGE_KEY_HISTORY);
  localStorage.removeItem(STORAGE_KEY_STATS);

  updateRecentChips();
  updateTodayRecommend();

  // 重新绘制转盘
  lastCandidates = getCandidatesForWheel();
  drawWheel(lastCandidates);

  showInfo("✅ 已清除", "已清除最近选择与统计数据。");
}

// ----------------- IP定位（后台异步 + 缓存 + 占位API） -----------------
function initGeoHintAndCache() {
  const hint = document.getElementById("locationHint");
  const prefersReducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (!hint) return;
  hint.textContent = "📍 正在识别所在地区…（不影响使用）";

  // 减少额外工作：如果用户系统设置“减少动效”，就不做地理请求
  if (prefersReducedMotion) {
    hint.textContent = "";
    return;
  }

  // 异步执行，不阻塞首屏/转盘
  setTimeout(async () => {
    const geo = await getGeoByIpCached();
    if (!geo) {
      hint.textContent = "";
      return;
    }
    const label = [geo.province, geo.city].filter(Boolean).join(" ");
    hint.textContent = `📍 已识别您的位置，为您推荐本地餐饮`;
  }, 0);
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getGeoCacheSync() {
  try {
    const raw = localStorage.getItem(GEO_CONFIG.storageKey);
    if (!raw) return null;
    const cached = JSON.parse(raw);
    if (!cached || !cached.ts || !cached.data) return null;
    if ((Date.now() - cached.ts) >= GEO_CONFIG.cacheMs) return null;
    return cached.data;
  } catch (_) {
    return null;
  }
}

async function getGeoByIpCached() {
  const cached = getGeoCacheSync();
  if (cached) return cached;

  const data = await fetchGeoByIp();
  if (!data) return null;

  try {
    localStorage.setItem(GEO_CONFIG.storageKey, JSON.stringify({ ts: Date.now(), data }));
  } catch (_) {}
  return data;
}

async function fetchGeoByIp() {
  const endpoint = (GEO_CONFIG.endpoint || "").trim();
  if (!endpoint) return null; // 未配置则完全跳过

  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const t = setTimeout(() => { if (controller) controller.abort() }, GEO_CONFIG.timeoutMs);

  try {
    const res = await fetch(endpoint, {
      method: "GET",
      credentials: "omit",
      cache: "no-store",
      signal: controller ? controller.signal : undefined
    });
    if (!res.ok) return null;
    const data = await res.json();

    // 允许多种字段名（尽量兼容）
    const normalized = {
      country: data.country || data.nation || "",
      province: data.province || data.regionName || data.region || "",
      city: data.city || "",
      district: data.district || data.county || "",
      adcode: data.adcode || data.code || "",
      lat: data.lat || data.latitude || "",
      lng: data.lng || data.lon || data.longitude || ""
    };
    return normalized;
  } catch (_) {
    return null;
  } finally {
    clearTimeout(t);
  }
}

function buildJumpUrl(baseUrl, ctx = {}) {
  const url = (baseUrl || "").trim();
  if (!url) return url;

  const geo = getGeoCacheSync();
  if (!geo) return url;

  // 1) 地区覆盖（你可在上方 REGION_LINK_OVERRIDES 配置）
  const keys = [geo.adcode, geo.province, geo.city].filter(Boolean);
  for (const k of keys) {
    const override = REGION_LINK_OVERRIDES[k];
    if (!override) continue;
    if (ctx.platform && override[ctx.platform]) return override[ctx.platform];
    if (!ctx.platform && override.default) return override.default;
  }

  // 2) 通用附参（占位）：把地区信息挂到 query 上，便于你后续在落地页/中转页解析
  //   - 平台不一定会使用这些参数，但你如果用“中转页”就可以读到
  try {
    const u = new URL(url, window.location.href);
    if (geo.province) u.searchParams.set("province", geo.province);
    if (geo.city) u.searchParams.set("city", geo.city);
    if (geo.adcode) u.searchParams.set("adcode", geo.adcode);
    if (ctx.type) u.searchParams.set("src", ctx.type);
    if (ctx.platform) u.searchParams.set("platform", ctx.platform);
    return u.toString();
  } catch (_) {
    return url;
  }
}