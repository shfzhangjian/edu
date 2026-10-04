/* Original ninth-grade chemistry models. No external libraries or real-lab control. */
(() => {
  'use strict';
  const C = { mint: '#8de1c7', blue: '#80bdf0', gold: '#e7b66d', red: '#eb9388', pale: '#d9ece5', dim: '#96b6ba', dark: '#183d48', ink: '#102d37' };
  const fmt = (n, d = 2) => Number(n.toFixed(d)).toLocaleString('zh-CN', { maximumFractionDigits: d });
  const txt = (ctx, x, y, s, size = 13, color = C.pale, anchor = 'start') => ctx.text(x, y, String(s), `text-anchor="${anchor}" style="fill:${color};font-size:${size}px"`);
  const box = (x, y, w, h, fill = C.dark, stroke = '#4e727b', r = 10) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" stroke="${stroke}"/>`;
  const dot = (x, y, r, color) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${color}"/>`;
  const chapterNumber = c => Number(String(c.id || '').split('-').pop()) || Number(String(c.chapter || '').replace(/\D/g, ''));
  const water = (ctx, x, y, scale = 1) => `<g transform="translate(${x} ${y}) scale(${scale})">${ctx.line(0, 0, -13, 12, '#a5c6d0', 4)}${ctx.line(0, 0, 13, 12, '#a5c6d0', 4)}${dot(0, 0, 10, C.red)}${dot(-13, 12, 6, C.pale)}${dot(13, 12, 6, C.pale)}</g>`;
  const pair = (ctx, x, y, color, r = 8) => ctx.line(x - r, y, x + r, y, '#6b97a4', 4) + dot(x - r, y, r, color) + dot(x + r, y, r, color);
  const oxygen = (ctx, x, y) => pair(ctx, x, y, C.red);
  const hydrogen = (ctx, x, y) => pair(ctx, x, y, C.pale, 6);
  const carbonDioxide = (ctx, x, y) => ctx.line(x - 15, y, x + 15, y, '#acc6cb', 4) + dot(x - 16, y, 7, C.red) + dot(x, y, 8, '#bdc8d6') + dot(x + 16, y, 7, C.red);
  function selector(ctx, id, label, items, initial, change) {
    const wrap = document.createElement('label');
    wrap.className = 'param';
    wrap.style.cssText = 'display:flex;flex-direction:column;gap:7px;font-size:11px;color:#b6ced0';
    const title = document.createElement('span'); title.textContent = label;
    const input = document.createElement('select'); input.id = id;
    input.setAttribute('aria-label', label);
    input.style.cssText = 'width:100%;background:#244750;color:#d4e9e4;border-color:#50737a';
    items.forEach((item, i) => { const option = document.createElement('option'); option.value = String(i); option.textContent = item; input.append(option); });
    input.value = String(initial);
    input.addEventListener('change', () => change(Number(input.value)));
    wrap.append(title, input); ctx.panel.append(wrap); return input;
  }
  function check(ctx, id, label, initial, change) {
    const wrap = document.createElement('label');
    wrap.style.cssText = 'display:flex;align-items:center;gap:9px;font-size:12px;color:#c9e4dc;cursor:pointer';
    const input = document.createElement('input'); input.type = 'checkbox'; input.id = id; input.checked = initial;
    input.style.accentColor = C.mint; input.addEventListener('change', () => change(input.checked));
    const caption = document.createElement('span'); caption.textContent = label;
    wrap.append(input, caption); ctx.panel.append(wrap); return input;
  }

  function particles(ctx) {
    const isWater = chapterNumber(ctx.c) === 4;
    let mode = 0, count = 12, relativeVolume = 1.4;
    function update() {
      const width = 240 + (relativeVolume - 1) * 230;
      const left = (600 - width) / 2, top = 80, height = 190;
      let draw = txt(ctx, 300, 31, isWater ? '水分子：组成不随间隔改变' : mode ? '混合物：两种分子共同存在' : '纯净物：只含一种分子', 18, C.mint, 'middle');
      draw += box(left, top, width, height, '#173842', '#759ba4');
      let oxygenCount = 0, nitrogenCount = 0;
      for (let i = 0; i < count; i++) {
        const x = left + 29 + (i % 6) * (width - 58) / 5;
        const y = top + 37 + Math.floor(i / 6) * 60;
        if (isWater) draw += water(ctx, x, y, .84);
        else {
          const isOxygen = !mode || i % 3 === 0;
          if (isOxygen) oxygenCount++; else nitrogenCount++;
          draw += pair(ctx, x, y, isOxygen ? C.red : C.blue, 7);
        }
      }
      draw += txt(ctx, 300, 299, `粒子示例数 ${count}　|　相对容器体积 ${fmt(relativeVolume, 1)}`, 13, C.pale, 'middle');
      draw += txt(ctx, 300, 327, isWater ? '红色：O　浅色：H　每个水分子固定为 2H + 1O' : '红色双球：O₂　蓝色双球：N₂　球的大小保持不变', 12, C.dim, 'middle');
      ctx.svg(draw);
      ctx.result(isWater ? `H₂O 分子示例：<b>${count}</b> 个<br>氢原子 ${count * 2} 个，氧原子 ${count} 个<br>改变容器体积，改变的是粒子间距，不是分子组成。` : `分子种类：<b>${mode ? 2 : 1}</b> 种<br>O₂：${oxygenCount} 个；N₂：${nitrogenCount} 个<br>${mode ? '两种分子共同存在，表示混合物。' : '所有分子相同，表示纯净的氧气。'}`);
      ctx.state({ mode: isWater ? 'water' : mode ? 'mixture' : 'pure', particleCount: count, relativeVolume, molecularSpecies: isWater ? 1 : mode ? 2 : 1, HAtoms: isWater ? 2 * count : 0, OAtoms: isWater ? count : 2 * oxygenCount, NAtoms: 2 * nitrogenCount });
    }
    if (!isWater) ctx.buttons([{ label: '纯净氧气', run: () => { mode = 0; update(); } }, { label: '氧气与氮气混合', run: () => { mode = 1; update(); } }]);
    ctx.slider('chem-particles-number', '分子示例数', 6, 18, count, 1, '个', v => { count = v; update(); });
    ctx.slider('chem-particles-volume', '相对容器体积', 1, 2, relativeVolume, .1, '', v => { relativeVolume = v; update(); });
    ctx.limit('静态粒子模型，颜色和尺寸是人为符号，排列不是实测位置；真实粒子持续运动。此处只讨论组成与间隔，不据二维画面计算压强或判断物态。混合物示例比例不代表真实空气组成。');
    update();
  }

  function atom(ctx) {
    const names = ['氢 H','氦 He','锂 Li','铍 Be','硼 B','碳 C','氮 N','氧 O','氟 F','氖 Ne','钠 Na','镁 Mg','铝 Al','硅 Si','磷 P','硫 S','氯 Cl','氩 Ar'];
    let z = 11;
    function update() {
      const shells = [Math.min(z, 2), Math.min(Math.max(z - 2, 0), 8), Math.max(z - 10, 0)].filter(n => n > 0);
      let draw = txt(ctx, 300, 31, `${names[z - 1]} · 中性原子`, 18, C.mint, 'middle');
      const cx = 192, cy = 181;
      shells.forEach((n, index) => {
        const r = 43 + index * 37;
        draw += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#567d88" stroke-dasharray="5 5"/>`;
        for (let k = 0; k < n; k++) {
          const a = -Math.PI / 2 + k * 2 * Math.PI / n + index * .13;
          draw += dot(cx + r * Math.cos(a), cy + r * Math.sin(a), 5, [C.mint, C.blue, C.gold][index]);
        }
      });
      draw += dot(cx, cy, 26, '#7b5b50') + txt(ctx, cx, cy + 5, `${z}+`, 16, C.pale, 'middle');
      draw += txt(ctx, 380, 111, `核内质子数：${z}`, 16, C.pale) + txt(ctx, 380, 147, `核外电子数：${z}`, 16, C.pale);
      draw += txt(ctx, 380, 188, '各电子层示意', 13, C.dim);
      shells.forEach((n, i) => { draw += txt(ctx, 380, 216 + i * 26, `第 ${i + 1} 层：${n} 个电子`, 14, [C.mint, C.blue, C.gold][i]); });
      draw += txt(ctx, 300, 329, '中性：正负电荷总量相等；元素种类由质子数决定', 12, C.dim, 'middle');
      ctx.svg(draw);
      ctx.result(`原子序数 <b>${z}</b> = 质子数<br>中性原子：电子数 = 质子数<br>电子层分布：<b>${shells.join('，')}</b><br>净电荷：0`);
      ctx.state({ atomicNumber: z, element: names[z - 1], protons: z, electrons: z, shells, netCharge: 0 });
    }
    ctx.slider('chem-atom-z', '原子序数', 1, 18, z, 1, '', v => { z = v; update(); });
    ctx.limit('仅适用前18号元素的中性基态原子简化排布。圆圈表示电子层，不是真实运动轨道；比例、电子位置和核内结构均未按真实尺度绘制，中子省略。');
    update();
  }

  function balance(ctx) {
    let h2 = 1, o2 = 1, h2o = 1;
    function update() {
      const leftH = 2 * h2, rightH = 2 * h2o, leftO = 2 * o2, rightO = h2o;
      const equal = leftH === rightH && leftO === rightO;
      const valid = equal && h2 > 0 && o2 > 0 && h2o > 0;
      const simplest = valid && h2 === 2 && o2 === 1 && h2o === 2;
      let draw = txt(ctx, 300, 32, `${h2}H₂ + ${o2}O₂ → ${h2o}H₂O`, 22, valid ? C.mint : C.gold, 'middle');
      draw += txt(ctx, 91, 78, '氢气', 14, C.pale, 'middle') + txt(ctx, 208, 78, '氧气', 14, C.red, 'middle') + txt(ctx, 467, 78, '水', 14, C.pale, 'middle');
      for (let i = 0; i < h2; i++) draw += hydrogen(ctx, 66 + i % 2 * 48, 110 + Math.floor(i / 2) * 43);
      for (let i = 0; i < o2; i++) draw += oxygen(ctx, 183 + i % 2 * 48, 110 + Math.floor(i / 2) * 43);
      for (let i = 0; i < h2o; i++) draw += water(ctx, 434 + i % 2 * 63, 107 + Math.floor(i / 2) * 43, .85);
      draw += ctx.line(280, 160, 345, 160, C.mint, 3) + `<path d="M337 152 L346 160 L337 168" fill="none" stroke="${C.mint}" stroke-width="3"/>`;
      draw += txt(ctx, 310, 189, '点燃', 12, C.dim, 'middle');
      draw += box(36, 248, 528, 76);
      draw += txt(ctx, 59, 279, `H 原子：左 ${leftH} =? 右 ${rightH}`, 15, leftH === rightH ? C.mint : C.gold);
      draw += txt(ctx, 59, 307, `O 原子：左 ${leftO} =? 右 ${rightO}`, 15, leftO === rightO ? C.mint : C.gold);
      draw += txt(ctx, 455, 290, valid ? '已守恒 ✓' : '待配平', 18, valid ? C.mint : C.gold, 'middle');
      ctx.svg(draw);
      ctx.result(valid ? `<b>两种原子都守恒</b><br>${simplest ? '这是最简整数系数 2∶1∶2。' : '比例正确，但还可以约成最简整数系数。'}<br>相应质量比为 ${2 * h2}∶${32 * o2}∶${18 * h2o}（系数需乘相对质量）。` : `氢原子差（右−左）：${rightH - leftH}<br>氧原子差（右−左）：${rightO - leftO}<br>${equal ? '全为零不能表示这条反应；系数应为正整数。' : '只改化学式前系数，不改 H₂、O₂、H₂O 的组成。'}`);
      ctx.state({ coefficients: [h2, o2, h2o], reactantAtoms: { H: leftH, O: leftO }, productAtoms: { H: rightH, O: rightO }, balanced: valid, simplest, relativeMasses: [2 * h2, 32 * o2, 18 * h2o] });
    }
    ctx.slider('chem-balance-h2', 'H₂ 前的系数', 0, 6, h2, 1, '', v => { h2 = v; update(); });
    ctx.slider('chem-balance-o2', 'O₂ 前的系数', 0, 6, o2, 1, '', v => { o2 = v; update(); });
    ctx.slider('chem-balance-h2o', 'H₂O 前的系数', 0, 6, h2o, 1, '', v => { h2o = v; update(); });
    ctx.limit('配平的是普通化学反应的原子数，不是气体体积或分子总数。模型允许0用于尝试，但完整方程式的系数须为正整数。氢氧混合与点燃有危险，本图不是实验操作说明。');
    update();
  }

  function concentration(ctx) {
    let waterMass = 100, soluteAdded = 30, solubility = 36, evaporatedPercent = 0;
    function update() {
      const finalWater = waterMass * (1 - evaporatedPercent / 100);
      const initialCapacity = solubility * waterMass / 100;
      const initialDissolved = Math.min(soluteAdded, initialCapacity);
      const initiallyUndissolved = soluteAdded - initialDissolved;
      const capacity = solubility * finalWater / 100;
      const dissolved = Math.min(soluteAdded, capacity);
      const newCrystals = Math.max(0, initialDissolved - dissolved);
      const residue = soluteAdded - dissolved, solutionMass = finalWater + dissolved;
      const percent = dissolved / solutionMass * 100;
      const saturated = soluteAdded >= capacity - 1e-9;
      const level = Math.max(35, Math.min(184, solutionMass / 300 * 184));
      let draw = txt(ctx, 300, 31, '先算真正溶解的质量，再算浓度', 18, C.mint, 'middle');
      draw += `<path d="M71 82 V279 Q71 291 83 291 H249 Q261 291 261 279 V82" fill="none" stroke="#9bbcc4" stroke-width="3"/>`;
      draw += `<rect x="73" y="${289 - level}" width="186" height="${level}" fill="#428397" opacity=".6"/>`;
      for (let i = 0; i < Math.min(22, Math.ceil(residue)); i++) {
        const x = 85 + i % 11 * 15, y = 284 - Math.floor(i / 11) * 10;
        draw += `<path d="M${x} ${y - 6} l6 6 -6 3 -6 -3z" fill="${newCrystals > 0 ? C.gold : C.pale}"/>`;
      }
      draw += txt(ctx, 166, 321, residue > .000001 ? '底部：未溶固体 + 新析晶体' : '无固体残留', 12, C.dim, 'middle');
      draw += txt(ctx, 303, 92, `剩余水：${fmt(finalWater)} g`, 16);
      draw += txt(ctx, 303, 127, `最多可溶：${fmt(capacity)} g`, 16);
      draw += txt(ctx, 303, 162, `实际溶质：${fmt(dissolved)} g`, 16, C.mint);
      draw += txt(ctx, 303, 197, `溶液总质量：${fmt(solutionMass)} g`, 16);
      draw += txt(ctx, 303, 237, `${saturated ? '饱和' : '未饱和'} · w = ${fmt(percent)}%`, 21, C.mint);
      draw += txt(ctx, 303, 274, `新析出晶体：${fmt(newCrystals)} g`, 14, C.gold);
      ctx.svg(draw);
      ctx.result(`w = ${fmt(dissolved)} ÷ ${fmt(solutionMass)} ×100%<br><b>溶质质量分数 ${fmt(percent)}%</b><br>原先未溶：${fmt(initiallyUndissolved)} g<br>蒸发后新析出：${fmt(newCrystals)} g<br>固体残留合计：${fmt(residue)} g（不计入溶液质量）`);
      ctx.state({ initialWaterMass: waterMass, soluteAdded, solubility, evaporatedPercent, waterMass: finalWater, capacity, dissolved, initiallyUndissolved, newCrystals, residue, solutionMass, massFraction: dissolved / solutionMass, percent, saturated, finalSystemMass: finalWater + soluteAdded });
    }
    ctx.slider('chem-solvent', '起始水质量', 20, 200, waterMass, 10, 'g', v => { waterMass = v; update(); });
    ctx.slider('chem-solute', '加入固体质量', 0, 100, soluteAdded, 1, 'g', v => { soluteAdded = v; update(); });
    ctx.slider('chem-solubility', '溶解度（每100 g水）', 5, 100, solubility, 1, 'g', v => { solubility = v; update(); });
    ctx.slider('chem-evaporation', '蒸发原有水的比例', 0, 80, evaporatedPercent, 5, '%', v => { evaporatedPercent = v; update(); });
    ctx.limit('假想固体溶质，温度固定；溶解度作为给定数据，不对应某一种盐的完整曲线。假设充分达到平衡、只有水蒸发、晶体不带结晶水且无化学反应。液面高度仅示意，不把质量直接视为体积。');
    update();
  }

  function ph(ctx) {
    let mode = 0, addedMl = 0;
    const initialMl = 100, concentrationMolL = .01, Kw = 1e-14;
    function update() {
      const initialAmount = concentrationMolL * initialMl / 1000;
      const addedBaseAmount = mode === 2 ? concentrationMolL * addedMl / 1000 : 0;
      const volumeL = (initialMl + addedMl) / 1000;
      const net = mode === 1 ? -initialAmount / volumeL : (initialAmount - addedBaseAmount) / volumeL;
      const root = Math.sqrt(net * net + 4 * Kw);
      const h = net >= 0 ? (net + root) / 2 : 2 * Kw / (root - net);
      const pH = -Math.log10(h), oh = Kw / h;
      const neutral = Math.abs(pH - 7) < 1e-7;
      const acidity = neutral ? '中性' : pH < 7 ? '酸性' : '碱性';
      const colors = ['#cf6868','#d87e66','#dd9568','#dcaf6c','#c9bd71','#b3ca85','#87c1a3','#64bfb5','#65b9cc','#6ca8db','#7f98dc','#9890d0','#b087c6','#bf7fb6'];
      let draw = txt(ctx, 300, 32, ['加水稀释盐酸','加水稀释NaOH溶液','向盐酸中加入等浓度NaOH溶液'][mode], 17, C.mint, 'middle');
      for (let i = 0; i < 14; i++) draw += `<rect x="${48 + i * 36}" y="202" width="36" height="31" fill="${colors[i]}"/>`;
      for (let i = 0; i <= 14; i++) draw += txt(ctx, 48 + i * 36, 252, i, 11, C.dim, 'middle');
      const px = 48 + Math.max(0, Math.min(14, pH)) * 36;
      draw += `<path d="M${px - 7} 187 L${px + 7} 187 L${px} 200 Z" fill="${C.pale}"/>`;
      draw += txt(ctx, 300, 115, `pH ${pH.toFixed(2)}`, 44, neutral ? C.mint : pH < 7 ? C.gold : C.blue, 'middle');
      draw += txt(ctx, 300, 153, `${acidity}　·　最终体积 ${initialMl + addedMl} mL`, 16, C.pale, 'middle');
      draw += txt(ctx, 300, 289, mode === 2 ? '先比较H⁺与OH⁻的量，再根据反应后浓度求pH' : '加水后趋近中性，但不会越过中性成为另一侧', 13, C.pale, 'middle');
      draw += txt(ctx, 300, 321, '25℃ · 理想稀溶液 · pH绝不能作线性平均', 12, C.dim, 'middle');
      ctx.svg(draw);
      ctx.result(`初始 ${initialMl} mL，浓度 0.010 mol/L<br>加入${mode === 2 ? '同浓度NaOH溶液' : '纯水'}：${addedMl} mL<br><b>pH = ${pH.toFixed(2)}，${acidity}</b><br>${mode === 2 ? addedMl < 100 ? '盐酸剩余；HCl + NaOH → NaCl + H₂O。' : addedMl === 100 ? '此模型中酸碱恰好反应，生成NaCl溶液。' : 'NaOH剩余；混合物显碱性。' : '溶质的量不变，体积增大，浓度减小。'}`);
      ctx.state({ mode: ['acid-dilution', 'base-dilution', 'neutralization'][mode], initialMl, addedMl, concentrationMolL, totalVolumeMl: initialMl + addedMl, netStrongAcidConcentration: net, hydrogenConcentration: h, hydroxideConcentration: oh, pH, acidity, temperatureC: 25 });
    }
    ctx.buttons([{ label: '盐酸加水', run: () => { mode = 0; update(); } }, { label: 'NaOH加水', run: () => { mode = 1; update(); } }, { label: '酸碱中和', run: () => { mode = 2; update(); } }]);
    ctx.slider('chem-ph-added', '加入液体体积', 0, 200, addedMl, 1, 'mL', v => { addedMl = v; update(); });
    ctx.limit('教师拓展模型：固定25℃，仅适用理想稀盐酸、NaOH强电解质体系，考虑水的离子积Kw=10⁻¹⁴，并假设体积可相加。mol/L是用于计算的扩展浓度单位；不适用于弱酸弱碱、缓冲液或实际浓溶液。色带仅表示pH分区，不表示溶液真实颜色。');
    update();
  }

  function reaction(ctx) {
    const n = chapterNumber(ctx.c);
    if (n === 2) return reactionAir(ctx);
    if (n === 11) return reactionCarbonates(ctx);
    return reactionReduction(ctx);
  }
  function reactionAir(ctx) {
    let oxygenPercent = 21, phase = 0;
    function update() {
      const remaining = 100 - oxygenPercent, shown = phase === 2 ? remaining : 100;
      let draw = txt(ctx, 300, 31, '气体体积：反应前后要在相同温度下比较', 17, C.mint, 'middle');
      draw += box(88, 83, 424, 147, '#173842', '#7c9ca5');
      draw += `<rect x="91" y="86" width="${Math.max(0, shown * 4.18)}" height="141" fill="#436b88" opacity=".7"/>`;
      if (phase === 0) draw += `<rect x="91" y="86" width="${oxygenPercent * 4.18}" height="141" fill="${C.red}" opacity=".8"/>`;
      if (phase === 1) draw += txt(ctx, 300, 152, '氧气被选择性消耗，暂不读取体积', 16, C.gold, 'middle');
      else draw += txt(ctx, 300, 152, `${phase ? '剩余气体' : '原模拟气体'} ${fmt(shown)} mL`, 21, C.pale, 'middle');
      draw += txt(ctx, 300, 267, ['原模拟样品100 mL：红色部分表示氧气','温度尚未恢复，不给出可用于比较的体积','已恢复原温度；假设压强也相同'][phase], 13, C.pale, 'middle');
      draw += txt(ctx, 300, 310, phase === 2 ? `氧气比例 = (100 − ${fmt(remaining)}) ÷ 100 ×100% = ${fmt(oxygenPercent)}%` : '拖动含氧比例，再点击证据步骤', 14, C.mint, 'middle');
      ctx.svg(draw);
      ctx.result(`模拟样品含氧量：<b>${oxygenPercent}%（体积）</b><br>${phase === 2 ? `气体减少 ${oxygenPercent} mL<br>测得比例 ${oxygenPercent}%` : phase === 1 ? '氧气被消耗；温度变化会影响体积，先等待恢复。' : '真实干燥空气通常约含21%氧气；这里可改变样品组成。'}`);
      ctx.state({ variant: 'air', phase, initialVolumeMl: 100, oxygenPercent, remainingVolumeMl: remaining, measuredPercent: phase === 2 ? oxygenPercent : null, measurementValid: phase === 2 });
    }
    ctx.slider('chem-air-oxygen', '模拟样品氧气体积分数', 0, 100, oxygenPercent, 1, '%', v => { oxygenPercent = v; update(); });
    ctx.buttons([{ label: '① 原样品', run: () => { phase = 0; update(); } }, { label: '② 消耗氧气', run: () => { phase = 1; update(); } }, { label: '③ 同温读数', run: () => { phase = 2; update(); } }]);
    ctx.limit('原理模型，不是实物装置。假设选择性除去全部氧气、不形成气态产物、不漏气，其余气体不反应，前后温度与压强相同。中间阶段画面不按体积比例，不能用于读数。');
    update();
  }
  function reactionReduction(ctx) {
    let carbon = 2, copperOxide = 4, phase = 0;
    function update() {
      const extent = Math.min(carbon, copperOxide / 2);
      const remainingC = carbon - extent, remainingCuO = copperOxide - 2 * extent;
      let draw = txt(ctx, 300, 30, 'C + 2CuO —高温→ 2Cu + CO₂↑', 19, C.mint, 'middle');
      draw += box(25, 62, 250, 211) + box(326, 62, 249, 211);
      draw += txt(ctx, 150, 89, '反应物（模型份数）', 14, C.pale, 'middle') + txt(ctx, 450, 89, phase === 2 ? '生成物与剩余物' : '预测反应结果', 14, C.pale, 'middle');
      for (let i = 0; i < carbon; i++) draw += dot(62 + i * 42, 125, 11, '#a6b5c9');
      draw += txt(ctx, 150, 153, `C：${carbon} 份`, 12, C.dim, 'middle');
      for (let i = 0; i < copperOxide; i++) {
        const x = 58 + i % 5 * 43, y = 185 + Math.floor(i / 5) * 33;
        draw += ctx.line(x - 6, y, x + 6, y, '#aac5ce', 3) + dot(x - 6, y, 6, '#d9a178') + dot(x + 6, y, 6, C.red);
      }
      draw += txt(ctx, 150, 256, `CuO：${copperOxide} 份（双球仅为计数符号）`, 10, C.dim, 'middle');
      draw += ctx.line(284, 166, 315, 166, C.mint, 3) + `<path d="M309 159 L316 166 L309 173" fill="none" stroke="${C.mint}" stroke-width="2"/>`;
      if (phase === 2) {
        for (let i = 0; i < 2 * extent; i++) draw += dot(348 + i % 5 * 44, 125 + Math.floor(i / 5) * 29, 8, '#d9a178');
        draw += txt(ctx, 450, 180, `生成 Cu：${2 * extent} 份`, 13, C.gold, 'middle');
        for (let i = 0; i < extent; i++) draw += carbonDioxide(ctx, 350 + i * 49, 214);
        draw += txt(ctx, 450, 252, `CO₂：${extent} 份`, 13, C.pale, 'middle');
      } else {
        draw += txt(ctx, 450, 163, phase === 0 ? '先根据1∶2判断谁会剩余' : '原子重新组合，种类与总数不变', 12, C.pale, 'middle');
        draw += txt(ctx, 450, 198, phase === 0 ? '点击步骤验证' : '高温条件只作概念标注', 12, C.dim, 'middle');
      }
      draw += txt(ctx, 300, 310, phase === 2 ? `剩余 C：${remainingC} 份；剩余 CuO：${remainingCuO} 份` : 'C : CuO 的反应份数比 = 1 : 2', 15, C.mint, 'middle');
      ctx.svg(draw);
      ctx.result(phase === 2 ? `可完成 <b>${extent}</b> 组反应<br>生成Cu ${2 * extent}份、CO₂ ${extent}份<br>剩余C ${remainingC}份、CuO ${remainingCuO}份<br>Cu、O、C原子总数均守恒。` : '只比较计量关系，不预测真实反应速率。<br>每消耗1份C，需要2份CuO。');
      ctx.state({ variant: 'carbon-reduction', phase, carbon, copperOxide, reactionExtent: extent, copperProduced: 2 * extent, co2Produced: extent, remainingCarbon: remainingC, remainingCopperOxide: remainingCuO, atomBalance: { C: carbon, Cu: copperOxide, O: copperOxide } });
    }
    ctx.slider('chem-reaction-c', 'C模型份数', 1, 5, carbon, 1, '', v => { carbon = v; update(); });
    ctx.slider('chem-reaction-cuo', 'CuO模型份数', 2, 10, copperOxide, 2, '', v => { copperOxide = v; update(); });
    ctx.buttons([{ label: '① 反应前', run: () => { phase = 0; update(); } }, { label: '② 重组概念', run: () => { phase = 1; update(); } }, { label: '③ 结果', run: () => { phase = 2; update(); } }]);
    ctx.limit('依据教材所示反应C+2CuO→2Cu+CO₂，在高温且按该产物模型完全反应的前提下计算。模型份数可代表相同数量的化学式单位；CuO球组不表示独立分子或晶体结构。实际高温反应复杂且可能有有毒气体，不提供家庭操作步骤。');
    update();
  }
  function reactionCarbonates(ctx) {
    const samples = [
      { name: '碳酸钠 Na₂CO₃', formula: 'Na₂CO₃ + 2HCl → 2NaCl + H₂O + CO₂↑', gas: true },
      { name: '碳酸氢钠 NaHCO₃', formula: 'NaHCO₃ + HCl → NaCl + H₂O + CO₂↑', gas: true },
      { name: '碳酸钙 CaCO₃', formula: 'CaCO₃ + 2HCl → CaCl₂ + H₂O + CO₂↑', gas: true },
      { name: '氯化钠 NaCl', formula: '此情境下与稀盐酸混合无所示放气反应', gas: false }
    ];
    let sample = 0, phase = 0;
    function update() {
      const s = samples[sample], bubbles = phase > 0 && s.gas, cloudy = phase === 2 && s.gas;
      let draw = txt(ctx, 300, 31, '相似现象，能否唯一确定物质？', 18, C.mint, 'middle');
      draw += txt(ctx, 163, 81, s.name, 15, C.pale, 'middle') + txt(ctx, 438, 81, '澄清石灰水的证据', 15, C.pale, 'middle');
      draw += `<path d="M85 104 V249 Q85 259 95 259 H230 Q240 259 240 249 V104" fill="none" stroke="#9bbcc4" stroke-width="3"/>`;
      draw += `<rect x="87" y="159" width="151" height="98" fill="#4a8091" opacity=".5"/>`;
      draw += `<path d="M364 104 V249 Q364 259 374 259 H506 Q516 259 516 249 V104" fill="none" stroke="#9bbcc4" stroke-width="3"/>`;
      draw += `<rect x="366" y="159" width="148" height="98" fill="${cloudy ? '#c9d5cc' : '#4a8091'}" opacity="${cloudy ? '.85' : '.4'}"/>`;
      if (bubbles) for (let i = 0; i < 8; i++) draw += `<circle cx="${107 + i % 4 * 33}" cy="${136 + Math.floor(i / 4) * 50}" r="${4 + i % 3}" fill="none" stroke="${C.pale}"/>`;
      draw += txt(ctx, 163, 283, phase === 0 ? '仅凭外观不足以判断' : bubbles ? '证据：有气体产生' : '证据：无所示气体产生', 12, C.dim, 'middle');
      draw += txt(ctx, 439, 283, phase < 2 ? '等待查看检测证据' : cloudy ? '证据：变浑浊' : '未见对应浑浊', 12, C.dim, 'middle');
      draw += txt(ctx, 300, 325, s.formula, 12, C.mint, 'middle');
      ctx.svg(draw);
      ctx.result(phase < 2 ? `样品：${s.name}<br>${phase ? '观察放气现象，还不能确认气体身份。' : '选择样品，再逐步查看证据。'}` : s.gas ? '<b>气体使石灰水变浑浊</b><br>在所列样品范围内支持生成CO₂。<br>三种含碳酸根或碳酸氢根的样品现象相似，不能仅凭此区分。' : 'NaCl不提供本模型中的CO₂来源。<br>无此现象不代表样品不是“盐”。');
      ctx.state({ variant: 'carbonate-evidence', sample: s.name, phase, co2Expected: s.gas, visibleBubbles: bubbles, limewaterCloudy: cloudy, uniquelyIdentified: false });
    }
    selector(ctx, 'chem-carbonate-sample', '选择证据样品', samples.map(s => s.name), sample, v => { sample = v; update(); });
    ctx.buttons([{ label: '① 原样品', run: () => { phase = 0; update(); } }, { label: '② 遇酸证据', run: () => { phase = 1; update(); } }, { label: '③ 气体验证', run: () => { phase = 2; update(); } }]);
    ctx.limit('仅为给定纯样品与足量稀盐酸反应的证据推理，示意少量CO₂使石灰水浑浊，不模拟速率、混合杂质或过量CO₂。真实检验由教师在实验室组织，不能把“放气”作为任何未知物的唯一身份证据。');
    update();
  }

  function combustion(ctx) {
    let fuel = true, oxygenPresent = true, hotEnough = false;
    function update() {
      const burning = fuel && oxygenPresent && hotEnough;
      const conditions = [{ label: '有可燃物', value: fuel }, { label: '接触氧气', value: oxygenPresent }, { label: '温度达到着火点', value: hotEnough }];
      let draw = txt(ctx, 300, 31, '常见燃烧：三个条件同时成立', 18, C.mint, 'middle');
      conditions.forEach((condition, i) => {
        const x = 29 + i * 184;
        draw += box(x, 58, 174, 63, condition.value ? '#23584f' : '#283c48', condition.value ? C.mint : '#64757e');
        draw += txt(ctx, x + 87, 84, condition.label, 12, C.pale, 'middle');
        draw += txt(ctx, x + 87, 107, condition.value ? '具备 ✓' : '未具备', 13, condition.value ? C.mint : C.gold, 'middle');
      });
      draw += `<ellipse cx="300" cy="284" rx="92" ry="12" fill="#16343e"/>`;
      if (fuel) draw += `<path d="M256 265 L344 285 M255 285 L345 265" stroke="#a97d59" stroke-width="13" stroke-linecap="round"/>`;
      if (burning) {
        draw += `<path d="M300 147 C306 189 359 197 339 245 C329 269 283 276 263 249 C242 221 280 197 277 177 C286 193 300 185 300 147Z" fill="#e5a45c"/>`;
        draw += `<path d="M303 202 C307 227 330 231 318 251 C308 266 285 262 282 248 C279 232 298 220 303 202Z" fill="#ffe1a1"/>`;
      } else draw += txt(ctx, 300, 220, '本模型中不能维持燃烧', 18, C.dim, 'middle');
      draw += txt(ctx, 300, 328, burning ? '移除任一必要条件，观察结论变化' : `尚缺：${conditions.filter(x => !x.value).map(x => x.label).join('、')}`, 13, burning ? C.mint : C.gold, 'middle');
      ctx.svg(draw);
      ctx.result(`<b>${burning ? '三个条件齐备：可发生燃烧' : '至少一个条件缺失'}</b><br>模型判断 = 可燃物 ∧ 氧气 ∧ 达到着火点<br>降温是降低实际温度，不是降低物质着火点。`);
      ctx.state({ fuel, oxygen: oxygenPresent, atOrAboveIgnitionTemperature: hotEnough, burning, missingConditions: conditions.filter(x => !x.value).map(x => x.label) });
    }
    check(ctx, 'chem-fire-fuel', '有可燃物', fuel, v => { fuel = v; update(); });
    check(ctx, 'chem-fire-oxygen', '可接触到氧气', oxygenPresent, v => { oxygenPresent = v; update(); });
    check(ctx, 'chem-fire-heat', '温度达到着火点', hotEnough, v => { hotEnough = v; update(); });
    ctx.limit('适用于初中讨论的常见氧气支持燃烧的定性模型，忽略燃料比例、热损失、反应动力学和特殊氧化剂等因素。勾选按钮不对应实际操作；不点火、不混合可燃气体，也不据本图决定真实火情的灭火方法。');
    update();
  }

  function materials(ctx) {
    const metals = chapterNumber(ctx.c) === 8;
    const categories = metals ? ['纯金属', '合金', '非金属材料'] : ['天然有机高分子', '合成有机高分子', '无机非金属', '金属材料'];
    const cards = metals ? [
      { name: '纯铜', answer: 0, lines: ['成分：铜元素形成的金属单质', '特性：导电性好，具有延展性'], icon: 'metal' },
      { name: '钢', answer: 1, lines: ['组成：铁与少量碳等成分', '性能随组成和加工工艺而变化'], icon: 'metal' },
      { name: '黄铜', answer: 1, lines: ['组成：铜、锌等', '可加工为多种日用和机械部件'], icon: 'metal' },
      { name: '纯铝', answer: 0, lines: ['成分：铝元素形成的金属单质', '密度较小，表面可形成致密氧化膜'], icon: 'metal' },
      { name: '铝合金', answer: 1, lines: ['组成：铝中加入其他元素', '部分牌号适合轻质结构件'], icon: 'metal' },
      { name: '石墨', answer: 2, lines: ['成分：碳元素形成的单质', '可以导电，但不属于金属'], icon: 'graphite' },
      { name: '聚乙烯塑料', answer: 2, lines: ['由大量重复结构连接成高分子', '属于有机合成材料'], icon: 'polymer' }
    ] : [
      { name: '棉纤维', answer: 0, lines: ['来源：棉花', '主要成分：纤维素'], icon: 'fiber' },
      { name: '羊毛', answer: 0, lines: ['来源：羊的毛', '主要成分：蛋白质'], icon: 'fiber' },
      { name: '聚酯纤维', answer: 1, lines: ['通常由化学合成工艺制造', '常用于服装和纺织品'], icon: 'fiber' },
      { name: '聚乙烯塑料', answer: 1, lines: ['由重复的有机结构连接而成', '常用于包装等产品'], icon: 'polymer' },
      { name: '天然橡胶', answer: 0, lines: ['来源：橡胶树等植物的胶乳', '属于天然有机高分子材料'], icon: 'polymer' },
      { name: '普通玻璃', answer: 2, lines: ['主要包含多种硅酸盐等成分', '属于无机非金属材料'], icon: 'glass' },
      { name: '不锈钢', answer: 3, lines: ['以铁为基础，含铬等元素', '属于具有耐蚀特性的合金'], icon: 'metal' }
    ];
    let current = 0, answer = null;
    const answerButtons = [];
    function update() {
      const item = cards[current], answered = answer !== null, correct = answer === item.answer;
      let draw = txt(ctx, 300, 32, metals ? '从组成判断：单质、合金还是非金属？' : '根据来源与组成给材料分类', 18, C.mint, 'middle');
      draw += box(37, 61, 526, 251);
      if (item.icon === 'metal') draw += `<path d="M88 139 L178 111 L241 145 L151 176Z" fill="#a8b8ba"/><path d="M88 139 V220 L151 254 V176Z" fill="#72909a"/><path d="M151 176 L241 145 V222 L151 254Z" fill="#526e7c"/>`;
      else if (item.icon === 'glass') draw += `<path d="M105 115 L119 249 H211 L225 115Z" fill="#84b5bd" fill-opacity=".18" stroke="#aed3d7" stroke-width="3"/><path d="M119 132 L127 213" stroke="#c8e4e4" stroke-width="4"/>`;
      else if (item.icon === 'graphite') for (let i = 0; i < 5; i++) draw += `<path d="M94 ${145 + i * 18} L178 ${116 + i * 18} L239 ${141 + i * 18} L155 ${169 + i * 18}Z" fill="#667788" stroke="#a3b6c5"/>`;
      else for (let row = 0; row < 5; row++) {
        if (item.icon === 'fiber') draw += `<path d="M90 ${130 + row * 24} C132 ${98 + row * 24},172 ${160 + row * 24},242 ${123 + row * 24}" fill="none" stroke="${row % 2 ? C.mint : C.gold}" stroke-width="5"/>`;
        else for (let i = 0; i < 6; i++) { const x = 101 + i * 25, y = 126 + row * 26 + i % 2 * 9; if (i < 5) draw += ctx.line(x, y, x + 25, 126 + row * 26 + (i + 1) % 2 * 9, '#a9c5c8', 3); draw += dot(x, y, 7, row % 2 ? C.mint : C.gold); }
      }
      draw += txt(ctx, 283, 118, item.name, 25, C.pale);
      item.lines.forEach((s, i) => { draw += txt(ctx, 283, 155 + i * 27, s, 11, C.dim); });
      draw += txt(ctx, 283, 239, answered ? `${correct ? '判断正确 ✓' : '再对照组成：'} ${categories[item.answer]}` : '请选择一种材料类别', 14, answered && correct ? C.mint : C.gold);
      draw += txt(ctx, 300, 335, '图案是材料符号示意，不表示真实微观结构或实测性能', 11, C.dim, 'middle');
      ctx.svg(draw);
      ctx.result(answered ? `<b>${correct ? '分类正确' : '继续比较分类依据'}</b><br>${item.name}：${categories[item.answer]}<br>${metals ? '导电、光泽等单项性质不能单独决定材料类别；如石墨可导电但不是金属。' : '天然/合成是来源分类，不等于“安全/危险”或“能/不能回收”的简单二分。'}` : '先读材料卡上的来源与组成，再选择分类。<br>换一张卡后可继续判断。');
      answerButtons.forEach((b, i) => { b.classList.toggle('selected', answer === i); b.setAttribute('aria-pressed', String(answer === i)); });
      ctx.state({ variant: metals ? 'metals' : 'life-materials', material: item.name, cardIndex: current, selectedCategory: answer === null ? null : categories[answer], correctCategory: categories[item.answer], answered, correct: answered && correct });
    }
    selector(ctx, 'chem-material-card', '选择材料卡', cards.map(x => x.name), current, v => { current = v; answer = null; update(); });
    const group = document.createElement('div'); group.className = 'sim-buttons'; group.setAttribute('role', 'group'); group.setAttribute('aria-label', '判断材料类别');
    categories.forEach((category, i) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = category; b.addEventListener('click', () => { answer = i; update(); }); answerButtons.push(b); group.append(b); });
    ctx.panel.append(group);
    ctx.limit(metals ? '这里只按给定材料的组成分类，样品默认符合标签。合金的性能与具体牌号、加工和使用条件有关，不能认为所有合金的每项性能都优于纯金属。' : '材料卡只给出典型类别和组成线索，不包含所有复合材料。用途、耐温和回收条件应查产品说明与当地规定；不使用燃烧、加热或接触未知试剂来鉴别材料。');
    update();
  }
  window.CHEM_WIDGETS = { particles, atom, balance, concentration, ph, reaction, combustion, materials };
})();
