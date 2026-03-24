---
pubDatetime: 2026-03-24T00:00:00Z
title: "處處連續卻處處不可微——Weierstrass 怪物函數的故事"
slug: weierstrass-monster-function
draft: false
tags:
  - math
  - analysis
description: "Karl Weierstrass 在 1872 年構造出處處連續卻處處不可微的函數，粉碎了數學家的直覺，催生了碎形幾何與嚴格分析學。這篇文章用 YouBike、棒球、寫 code 的類比，帶你理解這個怪物函數到底怪在哪裡。"
---

## Table of contents

## 那個又臭又長的德國姓氏

如果你修過高等微積分，你一定對 Weierstrass 這個字不陌生。看到這個字，你甚至可能會有 PTSD 發作的感覺——Weierstrass 逼近定理、Bolzano-Weierstrass 定理、Weierstrass M-test⋯⋯好像翻開課本每隔幾頁就會看到這個又臭又長的德國姓氏。

問題來了，他到底是誰？為什麼他的名字像幽靈一樣纏著整本分析學課本？

[Karl Weierstrass](https://en.wikipedia.org/wiki/Karl_Weierstrass)（1815-1897）被稱為「現代分析學之父」。他最驚人的一項成就，是在 1872 年構造出一個讓整個數學界集體崩潰的函數：一個 **處處連續** 卻 **處處不可微** 的怪物。在講這個怪物之前，我們先回到基礎——連續和可微，到底在講什麼？

## 先搞清楚：連續和可微到底在講什麼？

想像你在台北市區騎 YouBike。

**連續** 就是：你的輪子始終在地面上，沒有瞬間移動。從 A 點到 B 點，你經過了中間所有的點，不會突然消失再出現在另一個地方。用數學的話說，函數圖形可以「一筆畫完，筆不離紙」。

**可微** 則是更高的要求：你不只是輪子在地面上，而且在每一個瞬間都有一個明確的「前進方向」。如果有人在任意時刻問你「你現在往哪走？」，你都能指出一個確定的方向——這就是切線斜率存在的意思。

那什麼時候會「連續但不可微」？想像你騎到一個路口，猛然來個 90 度直角轉彎。你的路徑沒有斷開（連續），但在轉彎那個瞬間，你不是朝東也不是朝北，你同時在做兩件事——方向不確定，切線不存在。

數學上最經典的例子就是 $f(x) = |x|$。在原點有個「尖角」，從左邊走來斜率是 -1，從右邊走來斜率是 +1，到了頂點兩邊打架，切線不存在。

<svg width="100%" viewBox="0 0 680 320" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="連續可微 vs 連續不可微的比較圖：左邊是 f(x)=x² 平滑曲線，右邊是 f(x)=|x| 在原點有尖角">
  <defs>
    <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M2 1L8 5L2 9" fill="none" stroke="context-stroke" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    </marker>
  </defs>
  <!-- Left: x² (smooth, differentiable) -->
  <text x="170" y="30" text-anchor="middle" fill="var(--foreground)" font-size="14" font-weight="500" font-family="var(--font-app), monospace">f(x) = x²</text>
  <text x="170" y="48" text-anchor="middle" fill="var(--foreground)" font-size="12" opacity="0.6" font-family="var(--font-app), monospace">Continuous and differentiable</text>
  <!-- Left axes -->
  <line x1="60" y1="260" x2="280" y2="260" stroke="var(--foreground)" stroke-width="0.5" opacity="0.3"/>
  <line x1="170" y1="70" x2="170" y2="270" stroke="var(--foreground)" stroke-width="0.5" opacity="0.3"/>
  <!-- x² curve -->
  <path d="M60,260 Q170,60 280,260" fill="none" stroke="#534AB7" stroke-width="2.5" stroke-linecap="round"/>
  <!-- Tangent line -->
  <line x1="110" y1="185" x2="230" y2="185" stroke="#EF9F27" stroke-width="1.5" stroke-dasharray="4 3" opacity="0.8"/>
  <circle cx="170" cy="185" r="4" fill="#EF9F27"/>
  <text x="236" y="180" fill="var(--foreground)" font-size="12" opacity="0.7" font-family="var(--font-app), monospace">tangent exists everywhere</text>
  <!-- Right: |x| (corner, not differentiable at 0) -->
  <text x="510" y="30" text-anchor="middle" fill="var(--foreground)" font-size="14" font-weight="500" font-family="var(--font-app), monospace">f(x) = |x|</text>
  <text x="510" y="48" text-anchor="middle" fill="var(--foreground)" font-size="12" opacity="0.6" font-family="var(--font-app), monospace">Continuous but NOT differentiable at 0</text>
  <!-- Right axes -->
  <line x1="400" y1="260" x2="620" y2="260" stroke="var(--foreground)" stroke-width="0.5" opacity="0.3"/>
  <line x1="510" y1="70" x2="510" y2="270" stroke="var(--foreground)" stroke-width="0.5" opacity="0.3"/>
  <!-- |x| V shape -->
  <path d="M400,200 L510,260 L620,200" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
  <!-- The problematic corner -->
  <circle cx="510" cy="260" r="6" fill="none" stroke="#E24B4A" stroke-width="2"/>
  <circle cx="510" cy="260" r="2" fill="#E24B4A"/>
  <!-- Two candidate tangents -->
  <line x1="440" y1="300" x2="580" y2="220" stroke="#EF9F27" stroke-width="1.2" stroke-dasharray="4 3" opacity="0.6"/>
  <line x1="440" y1="220" x2="580" y2="300" stroke="#D4537E" stroke-width="1.2" stroke-dasharray="4 3" opacity="0.6"/>
  <text x="588" y="216" fill="var(--foreground)" font-size="12" opacity="0.7" font-family="var(--font-app), monospace">slope = +1?</text>
  <text x="588" y="304" fill="var(--foreground)" font-size="12" opacity="0.7" font-family="var(--font-app), monospace">slope = −1?</text>
  <!-- Arrow pointing to corner -->
  <text x="510" y="290" text-anchor="middle" fill="#E24B4A" font-size="12" font-family="var(--font-app), monospace">corner: no unique tangent</text>
</svg>

但注意：$\lvert x \rvert$ 只有 **一個點** 不可微。其他地方都好好的。

大部分人學到這裡會覺得：「好吧，連續函數頂多在幾個點出問題嘛。」

## 可微與連續的邏輯關係

「可微必定連續，但連續不一定可微」——這句話的核心結構其實在日常生活中到處都是：**A 是 B 的加強版，所以 A 一定滿足 B，但 B 不一定夠格當 A。**

幾個類比：

**正方形與長方形。** 正方形一定是長方形（可微 → 連續），但長方形不一定是正方形（連續 ↛ 可微）。正方形就是比長方形多了一個條件：四邊等長。可微就是比連續多了一個條件：每個點都有明確的切線方向。

**職業棒球選手與會打棒球的人。** 能上中職的一定會打棒球，但你週末去河濱公園打個慢壘，不代表你能上職棒。會打是基本門檻（連續），職業水準要求的是每一個動作都精準可控（可微）。

**能寫 code 跟寫出 production-grade code。** 你寫了一個腳本能跑、不會 crash（連續），但如果有人要在每一行做 code review 問你「這裡的設計決策方向是什麼？」，你不一定每一行都答得出來（不可微）。Production-grade 的 code 是在每一個局部都有清楚的意圖和方向。

這些類比對應的抽象結構都一樣：

> 強條件 → 弱條件 ✓
>
> 弱條件 → 強條件 ✗

## 然後 Weierstrass 掀桌了

Weierstrass 不是什麼年少成名的天才。他大學讀的是法律和行政（他爸幫他選的），後來自己跑去旁聽數學課，結果法律學位沒拿到。之後他在普魯士的中學教了十五年書——教數學，也兼教體育。對，就是那個後來被封為「現代分析學之父」的人，曾經在操場上帶學生跑步跳遠。

他在中學期間一邊教課一邊做研究，論文發在學校年報上，幾乎沒人看到。直到快四十歲才因為一篇關於 Abel 函數的論文被數學界注意到，然後一路從中學老師跳到柏林大學教授。

1872 年，這位大器晚成的教授在柏林科學院發表了一個函數，震驚了整個數學界。這個函數 **到處連續**（筆不離紙），卻 **到處不可微**（每一個點都是尖角）。

不是一個尖角、不是一百個尖角——是 **無窮多個**，密到你在任何地方放大來看，永遠都是鋸齒狀的。

想像一下：你拿到一條繩子，它完全沒有斷裂（連續），但不管你用多強的放大鏡去看任何一小段，它都像是碎玻璃的邊緣一樣鋒利。你永遠找不到一小段「平滑」的部分。

這個函數長這樣：

$$W(x) = \sum_{n=0}^{\infty} a^n \cos(b^n \pi x)$$

其中 $0 < a < 1$，$b$ 是正奇數，且 $ab > 1 + \frac{3\pi}{2}$。

秘訣在於：它是無窮多個餘弦波疊加出來的。每一層波的振幅越來越小（$a^n$ 在衰減），但頻率越來越高（$b^n$ 在爆炸）。頻率增長的速度遠超過振幅衰減的速度，所以不管你放大多少倍，新的鋸齒永遠在等著你。

試試看：先把 Terms 設為 1，再慢慢增加，觀察每一層如何疊加出更細的鋸齒。然後 zoom in——它永遠不會變平滑。

<div style="padding: 0.5rem 0;">
  <div style="display:flex;flex-wrap:wrap;gap:16px;align-items:center;margin-bottom:12px;">
    <div style="display:flex;align-items:center;gap:8px;">
      <label style="font-size:13px;color:var(--foreground);opacity:0.85;min-width:70px">Terms (n)</label>
      <input type="range" id="terms" min="1" max="20" value="1" step="1" style="width:140px" oninput="draw()">
      <span id="terms-out" style="font-size:14px;font-weight:500;color:var(--foreground);min-width:24px">1</span>
    </div>
    <div style="display:flex;align-items:center;gap:8px;">
      <label style="font-size:13px;color:var(--foreground);opacity:0.85;min-width:70px">a = </label>
      <input type="range" id="aval" min="30" max="90" value="50" step="5" style="width:120px" oninput="draw()">
      <span id="a-out" style="font-size:14px;font-weight:500;color:var(--foreground);min-width:36px">0.5</span>
    </div>
    <div style="display:flex;align-items:center;gap:8px;">
      <label style="font-size:13px;color:var(--foreground);opacity:0.85;min-width:70px">b = </label>
      <input type="range" id="bval" min="3" max="15" value="7" step="2" style="width:120px" oninput="draw()">
      <span id="b-out" style="font-size:14px;font-weight:500;color:var(--foreground);min-width:24px">7</span>
    </div>
  </div>
  <div style="display:flex;gap:8px;margin-bottom:12px;">
    <button style="color:var(--foreground);background:var(--muted);border:1px solid var(--border);border-radius:4px;padding:4px 12px;cursor:pointer" onclick="zoomIn()">Zoom in</button>
    <button style="color:var(--foreground);background:var(--muted);border:1px solid var(--border);border-radius:4px;padding:4px 12px;cursor:pointer" onclick="zoomOut()">Zoom out</button>
    <button style="color:var(--foreground);background:var(--muted);border:1px solid var(--border);border-radius:4px;padding:4px 12px;cursor:pointer" onclick="resetView()">Reset</button>
    <span id="zoom-label" style="font-size:12px;color:var(--foreground);opacity:0.7;align-self:center;margin-left:8px">x: [-2, 2]</span>
  </div>
  <canvas id="wc" style="width:100%;height:320px;border:2px solid color-mix(in srgb, var(--accent) 50%, transparent);border-radius:6px;cursor:crosshair;background:color-mix(in srgb, var(--muted) 40%, transparent)"></canvas>
  <div style="margin-top:12px;display:flex;gap:16px;flex-wrap:wrap;">
    <div style="background:var(--muted);border-radius:6px;padding:8px 14px;flex:1;min-width:140px;">
      <div style="font-size:12px;color:var(--foreground);opacity:0.7">ab product</div>
      <div id="ab-val" style="font-size:18px;font-weight:500;color:var(--foreground)">3.5</div>
    </div>
    <div style="background:var(--muted);border-radius:6px;padding:8px 14px;flex:1;min-width:140px;">
      <div style="font-size:12px;color:var(--foreground);opacity:0.7">Differentiable?</div>
      <div id="diff-status" style="font-size:18px;font-weight:500;color:var(--foreground)">Might be</div>
    </div>
    <div style="background:var(--muted);border-radius:6px;padding:8px 14px;flex:1;min-width:140px;">
      <div style="font-size:12px;color:var(--foreground);opacity:0.7">Zoom level</div>
      <div id="zoom-val" style="font-size:18px;font-weight:500;color:var(--foreground)">1x</div>
    </div>
  </div>
</div>

<script>
const canvas = document.getElementById('wc');
const ctx = canvas.getContext('2d');
let xMin = -2, xMax = 2;
let zoomLevel = 1;

function resize() {
  const r = canvas.getBoundingClientRect();
  canvas.width = r.width * devicePixelRatio;
  canvas.height = r.height * devicePixelRatio;
  ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
}

function weierstrass(x, a, b, n) {
  let sum = 0;
  for (let k = 0; k < n; k++) {
    sum += Math.pow(a, k) * Math.cos(Math.pow(b, k) * Math.PI * x);
  }
  return sum;
}

function draw() {
  resize();
  const w = canvas.getBoundingClientRect().width;
  const h = canvas.getBoundingClientRect().height;
  const n = parseInt(document.getElementById('terms').value);
  const a = parseInt(document.getElementById('aval').value) / 100;
  const b = parseInt(document.getElementById('bval').value);

  document.getElementById('terms-out').textContent = n;
  document.getElementById('a-out').textContent = a.toFixed(2);
  document.getElementById('b-out').textContent = b;

  const ab = a * b;
  document.getElementById('ab-val').textContent = ab.toFixed(1);

  const threshold = 1 + 1.5 * Math.PI;
  if (ab > threshold) {
    document.getElementById('diff-status').textContent = 'Nowhere!';
    document.getElementById('diff-status').style.color = '#e24b4a';
  } else {
    document.getElementById('diff-status').textContent = 'Might be';
    document.getElementById('diff-status').style.color = 'var(--accent)';
  }

  document.getElementById('zoom-val').textContent = Math.round(zoomLevel) + 'x';
  document.getElementById('zoom-label').textContent = 'x: [' + xMin.toFixed(3) + ', ' + xMax.toFixed(3) + ']';

  const dark = document.documentElement.dataset.theme === 'dark';

  ctx.clearRect(0, 0, w, h);

  const pad = 20;
  const pw = w - 2 * pad;
  const ph = h - 2 * pad;

  let yMin = Infinity, yMax = -Infinity;
  const steps = Math.min(2000, Math.max(800, pw * 2));
  const vals = [];
  for (let i = 0; i <= steps; i++) {
    const x = xMin + (xMax - xMin) * i / steps;
    const y = weierstrass(x, a, b, n);
    vals.push(y);
    if (y < yMin) yMin = y;
    if (y > yMax) yMax = y;
  }

  const yRange = yMax - yMin || 1;
  const yPad = yRange * 0.08;
  yMin -= yPad;
  yMax += yPad;

  ctx.strokeStyle = dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  ctx.lineWidth = 0.5;
  for (let i = 0; i <= 4; i++) {
    const gy = pad + ph * i / 4;
    ctx.beginPath(); ctx.moveTo(pad, gy); ctx.lineTo(pad + pw, gy); ctx.stroke();
  }

  if (xMin <= 0 && xMax >= 0) {
    const ax = pad + pw * (0 - xMin) / (xMax - xMin);
    ctx.strokeStyle = dark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)';
    ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(ax, pad); ctx.lineTo(ax, pad + ph); ctx.stroke();
  }
  if (yMin <= 0 && yMax >= 0) {
    const ay = pad + ph * (1 - (0 - yMin) / (yMax - yMin));
    ctx.strokeStyle = dark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)';
    ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(pad, ay); ctx.lineTo(pad + pw, ay); ctx.stroke();
  }

  if (n <= 8) {
    for (let k = 0; k < n; k++) {
      const alpha = 0.15;
      const hue = k * 40;
      ctx.strokeStyle = `hsla(${hue}, 50%, ${dark ? 65 : 45}%, ${alpha})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i <= steps; i++) {
        const x = xMin + (xMax - xMin) * i / steps;
        const y = Math.pow(a, k) * Math.cos(Math.pow(b, k) * Math.PI * x);
        const sx = pad + pw * i / steps;
        const sy = pad + ph * (1 - (y - yMin) / (yMax - yMin));
        if (i === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
      }
      ctx.stroke();
    }
  }

  ctx.strokeStyle = dark ? '#AFA9EC' : '#534AB7';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  for (let i = 0; i <= steps; i++) {
    const sx = pad + pw * i / steps;
    const sy = pad + ph * (1 - (vals[i] - yMin) / (yMax - yMin));
    if (i === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
  }
  ctx.stroke();
}

function zoomIn() {
  const cx = (xMin + xMax) / 2;
  const range = (xMax - xMin) / 4;
  xMin = cx - range;
  xMax = cx + range;
  zoomLevel *= 2;
  draw();
}

function zoomOut() {
  const cx = (xMin + xMax) / 2;
  const range = (xMax - xMin);
  xMin = cx - range;
  xMax = cx + range;
  zoomLevel = Math.max(1, zoomLevel / 2);
  draw();
}

function resetView() {
  xMin = -2; xMax = 2; zoomLevel = 1;
  draw();
}

let dragging = false, dragStartX = 0, origXMin = 0, origXMax = 0;
canvas.addEventListener('mousedown', e => {
  dragging = true;
  dragStartX = e.clientX;
  origXMin = xMin; origXMax = xMax;
});
window.addEventListener('mousemove', e => {
  if (!dragging) return;
  const r = canvas.getBoundingClientRect();
  const dx = (e.clientX - dragStartX) / r.width * (origXMax - origXMin);
  xMin = origXMin - dx;
  xMax = origXMax - dx;
  draw();
});
window.addEventListener('mouseup', () => { dragging = false; });

canvas.addEventListener('wheel', e => {
  e.preventDefault();
  const r = canvas.getBoundingClientRect();
  const frac = (e.clientX - r.left) / r.width;
  const cx = xMin + (xMax - xMin) * frac;
  const factor = e.deltaY > 0 ? 1.3 : 0.77;
  const halfRange = (xMax - xMin) * factor / 2;
  xMin = cx - halfRange;
  xMax = cx + halfRange;
  zoomLevel = 4 / (xMax - xMin);
  draw();
}, { passive: false });

draw();
</script>

拿前面的類比來映射就更刺激了：Weierstrass 造出來的東西，相當於一個人完美符合「會打棒球」的所有定義（連續），但你檢查他的每一個揮棒動作，沒有任何一次達到職業水準（處處不可微）。不是偶爾失手，是 **每一次** 都不行，卻又 **每一次** 都至少能把球打出去。這種東西的存在本身就違反直覺。

## 海岸線的比喻

想像 Google Maps 上看台灣的海岸線。

在最小比例尺下，台灣看起來是一個光滑的番薯形狀。放大到縣市層級，你看到海岸線有很多灣和岬角。再放大到街道層級，每個灣裡面又有更小的凹凸。放大到衛星實拍，岩石的邊緣又是更細的鋸齒。

普通的數學函數就像人造的堤防——放大到夠近就會變平滑。但 Weierstrass 函數就像大自然的海岸線，**永遠不會變平滑**，而且比真正的海岸線更極端，因為它是在 **每一個點** 都如此。

## 數學界的反應：集體驚恐

在 Weierstrass 之前，19 世紀的數學家們普遍相信：「連續函數嘛，頂多在幾個點不可微，大部分地方還是平滑的。」這是一種很符合直覺的想法——你畫一條不斷的線，怎麼可能到處都是尖角？

然後 Weierstrass 就把這個函數拍在桌上。

法國數學家 [Charles Hermite](https://en.wikipedia.org/wiki/Charles_Hermite) 的反應堪稱經典，他在信中寫道大意是：「我從這個可怕的瘟疫面前恐懼地轉身離去。」[Henri Poincaré](https://en.wikipedia.org/wiki/Henri_Poincar%C3%A9) 也曾不太客氣地表達，認為一百年前沒有人會覺得這種函數值得研究。

但歷史證明 Weierstrass 是對的。

## 怪物的後代：從碎形到布朗運動

這個「怪物函數」後來成為好幾個重要領域的起點：

**[碎形幾何](https://en.wikipedia.org/wiki/Fractal)（Fractal Geometry）。** [Benoit Mandelbrot](https://en.wikipedia.org/wiki/Benoit_Mandelbrot) 在 1970 年代正式建立碎形幾何學，而 Weierstrass 函數的圖形正是碎形的早期範例——它具有「自相似性」，放大之後看起來跟放大之前結構一樣。

**[布朗運動](https://en.wikipedia.org/wiki/Brownian_motion)（Brownian Motion）。** 花粉粒在水中的隨機運動軌跡，也是到處連續、到處不可微。這後來成為股票價格數學模型的基礎，整個金融衍生品定價理論都建立在這個性質之上。

**[路徑積分](https://en.wikipedia.org/wiki/Path_integral_formulation)（Path Integral）。** 現代物理中，量子力學的路徑積分用到的粒子軌跡，其典型路徑也是到處連續但到處不可微的。

## 為什麼要學這個？

這個概念的真正價值不在於函數本身，而在於它教會數學家一件事：**直覺是會騙人的。**

在 Weierstrass 之前，數學家依賴直覺和幾何圖像來「理解」分析學。Weierstrass 用這個反例告訴所有人：你必須回到 ε-δ 定義，用嚴格的邏輯來證明事情，不能只是「畫個圖看起來對」就覺得對。

這基本上就是分析學從「靠感覺」進化到「靠證明」的分水嶺。大學高等微積分課上那些 ε-δ 證明之所以被要求那麼嚴格，某種程度上就是因為 Weierstrass 這個人在 150 年前告訴整個數學界：「你們的直覺，不可信。」

所以下次翻開課本又看到 Weierstrass 這個名字的時候，你至少知道：那個讓你 PTSD 發作的人，曾經是一個在操場上帶學生跑步的體育老師。他花了十五年在沒人看到的地方磨練，然後用一個函數掀翻了所有人的直覺。
