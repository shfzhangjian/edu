(function () {
  'use strict';
  const mint = '#8ddfc9', amber = '#efbb75', sky = '#8dc9f0', red = '#f39a8c', muted = '#91b2b7';
  const fmt = (n, digits = 2) => Number(n).toLocaleString('zh-CN', { maximumFractionDigits: digits });
  const rect = (x, y, w, h, fill = '#244954', stroke = '#4e7980', r = 5) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" stroke="${stroke}"/>`;
  const path = (d, stroke = mint, width = 2, fill = 'none') => `<path d="${d}" stroke="${stroke}" stroke-width="${width}" fill="${fill}"/>`;
  const arrow = (x1, y1, x2, y2, color = mint) => {
    const a = Math.atan2(y2 - y1, x2 - x1), size = 7;
    return path(`M${x1},${y1} L${x2},${y2} M${x2 - size * Math.cos(a - .45)},${y2 - size * Math.sin(a - .45)} L${x2},${y2} L${x2 - size * Math.cos(a + .45)},${y2 - size * Math.sin(a + .45)}`, color);
  };
  const centered = (ctx, x, y, content, color = '') => ctx.text(x, y, content, `text-anchor="middle"${color ? ` style="fill:${color}"` : ''}`);
  const title = (ctx, content) => ctx.text(30, 30, content, 'class="label"');
  const resets = (controls, values) => () => controls.forEach((input, i) => {
    input.value = values[i];
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  const battery = (ctx, x, y, label) => ctx.line(x - 19, y - 21, x - 19, y + 21, amber, 3) + ctx.line(x + 8, y - 11, x + 8, y + 11, amber, 3) + ctx.line(x - 36, y, x - 19, y) + ctx.line(x + 8, y, x + 34, y) + ctx.text(x - 34, y - 28, '+', '') + ctx.text(x + 10, y - 28, '−', '') + centered(ctx, x, y + 46, label, amber);
  const resistor = (ctx, x, y, name, value, color) => rect(x, y - 15, 90, 30, '#1b3a45', color, 2) + centered(ctx, x + 45, y + 5, name, color) + centered(ctx, x + 45, y - 26, `${fmt(value)} Ω`, color);

  function heat(ctx) {
    let mass = .5, rise = 20, material = 0;
    const materials = [{ name: '水', c: 4200 }, { name: '食用油（近似）', c: 2100 }, { name: '铝（近似）', c: 900 }];
    const update = () => {
      const m = materials[material], q = m.c * mass * rise, finalT = 20 + rise, level = 224 - finalT * 1.65;
      let dots = '';
      for (let i = 0; i < 24; i++) {
        const x = 97 + (i % 6) * 22, y = 173 + Math.floor(i / 6) * 23;
        dots += ctx.circle(x, y, 3 + rise / 32, rise > 35 ? amber : mint);
      }
      ctx.svg(title(ctx, '吸收的热量，由三个量共同决定') +
        path('M75 110 L75 269 Q75 280 87 280 L226 280 Q238 280 238 268 L238 110', muted, 3) +
        rect(79, 156, 155, 118, '#285767', 'none', 0) + dots +
        centered(ctx, 156, 137, m.name) + centered(ctx, 156, 313, `质量 ${fmt(mass, 1)} kg`) +
        rect(304, 70, 20, 184, '#19343e', muted, 10) + rect(310, level, 8, 248 - level, amber, 'none', 4) + ctx.circle(314, 262, 18, amber) +
        [20, 40, 60, 80].map(t => ctx.line(329, 224 - t * 1.65, 338, 224 - t * 1.65, muted) + ctx.text(345, 229 - t * 1.65, `${t}℃`)).join('') +
        centered(ctx, 314, 313, `末温 ${fmt(finalT)}℃`) +
        arrow(391, 156, 472, 156, amber) + centered(ctx, 456, 132, '热传递') +
        centered(ctx, 485, 209, `${fmt(q / 1000, 2)} kJ`, amber) + centered(ctx, 485, 239, `温升 ${fmt(rise)}℃`) +
        ctx.text(30, 61, '初温固定为20℃；圆点仅作粒子示意。', `style="fill:${muted}"`));
      ctx.result(`<b>Q = cmΔt = ${fmt(q)} J</b><br>${fmt(m.c)} × ${fmt(mass)} × ${fmt(rise)}<br>末温：20 + ${fmt(rise)} = ${fmt(finalT)}℃`);
      ctx.state({ material: m.name, specificHeat: m.c, massKg: mass, initialTempC: 20, temperatureRiseC: rise, finalTempC: finalT, heatJ: q });
    };
    const a = ctx.slider('heat-mass', '质量 m', .1, 3, mass, .1, 'kg', v => { mass = +v; update(); });
    const b = ctx.slider('heat-rise', '升高温度 Δt', 0, 70, rise, 1, '℃', v => { rise = +v; update(); });
    ctx.buttons(materials.map((m, i) => ({ label: m.name, run: () => { material = i; update(); } })));
    ctx.buttons([{ label: '重置数值', run: resets([a, b], [.5, 20]) }]);
    ctx.limit('Q=cmΔt：质量用kg，比热容用J/(kg·℃)。假定比热容恒定、热损失忽略且无物态变化；水的模型温度为20—90℃，不模拟沸腾。');
    update();
  }

  function energy(ctx) {
    if (ctx.c.id === 'physics-22') {
      let oldP = 36, newP = 18, count = 20, hours = 5;
      const days = 20;
      const update = () => {
        const before = oldP * count * hours * days / 1000, after = newP * count * hours * days / 1000;
        const saving = before - after, rate = (oldP - newP) / oldP * 100, scale = Math.max(before, after, 1), positive = saving >= 0;
        ctx.svg(title(ctx, '同样的照明需求，比较一个月用电') +
          ctx.text(35, 77, `${count}盏灯 × 每天${hours}h × ${days}天`) +
          ctx.text(35, 122, `原方案 ${oldP} W/盏`) + rect(35, 139, 510, 32, '#193640', 'none') + rect(35, 139, before / scale * 510, 32, '#658293', 'none') +
          ctx.text(35, 202, `新方案 ${newP} W/盏`) + rect(35, 219, 510, 32, '#193640', 'none') + rect(35, 219, after / scale * 510, 32, positive ? '#428d78' : '#a76455', 'none') +
          ctx.text(45, 161, `${fmt(before)} kW·h`) + ctx.text(45, 241, `${fmt(after)} kW·h`) +
          centered(ctx, 300, 294, `${positive ? '预计节省' : '预计增加'} ${fmt(Math.abs(saving))} 度电`, positive ? mint : red) +
          centered(ctx, 300, 323, '比较前提：两方案均满足相同照明需求。', muted));
        ctx.result(`<b>${positive ? '预计节电' : '预计增加用电'}：${fmt(Math.abs(saving))} kW·h</b><br>原方案 ${fmt(before)} 度 → 新方案 ${fmt(after)} 度<br>${positive ? '节电率' : '增耗率'}：${fmt(Math.abs(rate), 1)}%`);
        ctx.state({ model: 'lighting', originalPowerW: oldP, newPowerW: newP, lampCount: count, hoursPerDay: hours, days, beforeKWh: before, afterKWh: after, savedKWh: saving, savingRatePercent: rate });
      };
      const inputs = [
        ctx.slider('energy-old', '原单灯功率', 10, 100, oldP, 1, 'W', v => { oldP = +v; update(); }),
        ctx.slider('energy-new', '新单灯功率', 1, 80, newP, 1, 'W', v => { newP = +v; update(); }),
        ctx.slider('energy-count', '灯具数量', 1, 40, count, 1, '盏', v => { count = +v; update(); }),
        ctx.slider('energy-hours', '每天使用', 1, 10, hours, .5, 'h', v => { hours = +v; update(); })
      ];
      ctx.buttons([{ label: '重置数值', run: resets(inputs, [36, 18, 20, 5]) }]);
      ctx.limit('按每月20个使用日估算，电能=功率×时间。假设实际功率等于给定值、照明需求相同，忽略其他配套耗电。节电率不同于装置的能量转换效率；功率并不能单独决定照度。');
      update(); return;
    }
    let input = 2000, efficiency = 30;
    const update = () => {
      const useful = input * efficiency / 100, other = input - useful, useWidth = 480 * efficiency / 100;
      ctx.svg(title(ctx, '输入能量 = 有用输出 + 其他能量去向') +
        centered(ctx, 300, 77, `燃料完全燃烧输入 ${fmt(input)} kJ`, amber) +
        rect(60, 102, 480, 38, '#806643', amber) + arrow(300, 146, 300, 185, amber) +
        rect(60, 206, useWidth, 55, '#377f6e', mint) + rect(60 + useWidth, 206, 480 - useWidth, 55, '#5a6470', muted) +
        centered(ctx, 60 + useWidth / 2, 239, `${efficiency}%`, mint) + centered(ctx, 60 + useWidth + (480 - useWidth) / 2, 239, `${100 - efficiency}%`) +
        ctx.text(60, 292, `有用机械功 ${fmt(useful)} kJ`, `style="fill:${mint}"`) +
        ctx.text(310, 292, `其他去向 ${fmt(other)} kJ`) + centered(ctx, 300, 324, '排气、冷却、摩擦等：能量分散，未曾消失。', muted));
      ctx.result(`<b>有用功 ${fmt(useful)} kJ</b><br>η = W有用 / Q输入 = ${efficiency}%<br>收支核对：${fmt(useful)} + ${fmt(other)} = ${fmt(input)} kJ`);
      ctx.state({ model: 'heat-engine', inputKJ: input, efficiencyPercent: efficiency, usefulKJ: useful, otherKJ: other });
    };
    const a = ctx.slider('energy-input', '输入能量', 100, 5000, input, 100, 'kJ', v => { input = +v; update(); });
    const b = ctx.slider('energy-efficiency', '有用功占比', 5, 60, efficiency, 1, '%', v => { efficiency = +v; update(); });
    ctx.buttons([{ label: '重置数值', run: resets([a, b], [2000, 30]) }]);
    ctx.limit('稳态热机的简化能量收支模型，忽略装置自身储能变化。“其他去向”合并排气、冷却和摩擦等，不虚构各项具体比例；效率范围仅供探索，不代表某一真实热机。');
    update();
  }

  function circuit(ctx) {
    let voltage = 6, r1 = 10, r2 = 20, mode = 'series';
    const update = () => {
      const series = mode === 'series', totalR = series ? r1 + r2 : r1 * r2 / (r1 + r2);
      const current = voltage / totalR, i1 = series ? current : voltage / r1, i2 = series ? current : voltage / r2;
      const u1 = series ? i1 * r1 : voltage, u2 = series ? i2 * r2 : voltage;
      let scene = title(ctx, series ? '串联：一条路径，电流处处相等' : '并联：两条支路，两端电压相同');
      if (series) {
        scene += path('M70 110 L175 110 M265 110 L350 110 M440 110 L530 110 L530 269 L334 269 M264 269 L70 269 L70 110') +
          resistor(ctx, 175, 110, 'R₁', r1, mint) + resistor(ctx, 350, 110, 'R₂', r2, sky) + battery(ctx, 300, 269, `${fmt(voltage)} V`) +
          centered(ctx, 220, 157, `U₁=${fmt(u1, 3)} V`, mint) + centered(ctx, 395, 157, `U₂=${fmt(u2, 3)} V`, sky) +
          arrow(84, 93, 133, 93) + centered(ctx, 300, 205, `I₁ = I₂ = ${fmt(current, 3)} A`);
      } else {
        scene += path('M110 110 L255 110 M345 110 L490 110 L490 276 L334 276 M264 276 L110 276 L110 110 M110 205 L255 205 M345 205 L490 205') +
          resistor(ctx, 255, 110, 'R₁', r1, mint) + resistor(ctx, 255, 205, 'R₂', r2, sky) + battery(ctx, 300, 276, `${fmt(voltage)} V`) +
          centered(ctx, 300, 151, `I₁=${fmt(i1, 3)} A`, mint) + centered(ctx, 300, 246, `I₂=${fmt(i2, 3)} A`, sky) +
          arrow(151, 99, 194, 99, mint) + arrow(151, 194, 194, 194, sky) +
          [110, 490].map(x => ctx.circle(x, 205, 4, mint)).join('');
      }
      ctx.svg(scene);
      ctx.result(`<b>总电阻 ${fmt(totalR, 3)} Ω</b><br>总电流 ${fmt(current, 3)} A<br>${series ? `分压：${fmt(u1, 3)} + ${fmt(u2, 3)} = ${fmt(voltage)} V` : `分流：${fmt(i1, 3)} + ${fmt(i2, 3)} ≈ ${fmt(current, 3)} A`}`);
      ctx.state({ mode, voltageV: voltage, r1Ohm: r1, r2Ohm: r2, totalResistanceOhm: totalR, totalCurrentA: current, i1A: i1, i2A: i2, u1V: u1, u2V: u2 });
    };
    ctx.buttons([{ label: '串联电路', run: () => { mode = 'series'; update(); } }, { label: '并联电路', run: () => { mode = 'parallel'; update(); } }]);
    const a = ctx.slider('circuit-voltage', '电源电压', .5, 12, voltage, .5, 'V', v => { voltage = +v; update(); });
    const b = ctx.slider('circuit-r1', '电阻 R₁', 5, 100, r1, 5, 'Ω', v => { r1 = +v; update(); });
    const c = ctx.slider('circuit-r2', '电阻 R₂', 5, 100, r2, 5, 'Ω', v => { r2 = +v; update(); });
    ctx.buttons([{ label: '重置数值', run: resets([a, b, c], [6, 10, 20]) }]);
    ctx.limit('理想电源、恒定欧姆电阻，忽略导线与仪表电阻。箭头表示规定电流方向，不是电子运动方向。数值用于虚拟计算，不能据此直接选择真实实验器材；显示值存在四舍五入。');
    update();
  }

  function ohm(ctx) {
    let voltage = 6, resistance = 20;
    const x = u => 75 + u / 12 * 450, y = i => 278 - i / 2.4 * 205;
    const update = () => {
      const current = voltage / resistance;
      let scene = title(ctx, '保持电阻不变，看电流怎样随电压变化');
      for (let u = 0; u <= 12; u += 2) scene += ctx.line(x(u), 73, x(u), 278, '#355661', 1) + centered(ctx, x(u), 300, u);
      for (let i = 0; i <= 2.40001; i += .6) scene += ctx.line(75, y(i), 525, y(i), '#355661', 1) + ctx.text(33, y(i) + 5, fmt(i, 1));
      scene += arrow(75, 278, 550, 278) + arrow(75, 278, 75, 51) + ctx.text(549, 301, 'U/V') + ctx.text(25, 52, 'I/A') +
        path(`M${x(0)} ${y(0)} L${x(12)} ${y(12 / resistance)}`, mint, 3) +
        path(`M${x(voltage)} 278 L${x(voltage)} ${y(current)} L75 ${y(current)}`, amber, 1.5) + ctx.circle(x(voltage), y(current), 6, amber) +
        ctx.text(115, 61, `R = ${resistance} Ω，当前 I = ${fmt(current, 3)} A`, `style="fill:${amber}"`) +
        centered(ctx, 300, 333, '固定坐标尺度：斜率越大，电阻越小。', muted);
      ctx.svg(scene);
      ctx.result(`<b>I = U/R = ${fmt(current, 3)} A</b><br>${fmt(voltage)} V ÷ ${resistance} Ω<br>改变R会换一条直线；研究I与U时应固定R。`);
      ctx.state({ voltageV: voltage, resistanceOhm: resistance, currentA: current, plotMaxVoltageV: 12, plotMaxCurrentA: 2.4 });
    };
    const a = ctx.slider('ohm-voltage', '电压 U', 0, 12, voltage, .5, 'V', v => { voltage = +v; update(); });
    const b = ctx.slider('ohm-resistance', '电阻 R', 5, 100, resistance, 5, 'Ω', v => { resistance = +v; update(); });
    ctx.buttons([{ label: '重置数值', run: resets([a, b], [6, 20]) }]);
    ctx.limit('定温欧姆导体模型：I=U/R。即使U=0且I=0，电阻仍然存在；不能用此时的0/0计算电阻。灯丝温度明显改变时，真实I-U关系未必为直线。');
    update();
  }

  function power(ctx) {
    let voltage = 12, current = .5, minutes = 30;
    const update = () => {
      const watts = voltage * current, seconds = minutes * 60, joules = watts * seconds, kwh = watts / 1000 * minutes / 60;
      const band = 400 * watts / 72;
      ctx.svg(title(ctx, '功率描述快慢，电能还要乘使用时间') +
        rect(50, 84, 185, 135, '#1d414c', mint, 13) + centered(ctx, 142, 115, '虚拟用电器') + centered(ctx, 142, 153, `${fmt(voltage)} V × ${fmt(current)} A`, mint) + centered(ctx, 142, 189, `${fmt(watts)} W`, amber) +
        arrow(250, 153, 305, 153, amber) + rect(322, 84, 224, 135, '#1d414c', sky, 13) +
        centered(ctx, 434, 114, `持续 ${fmt(minutes)} min`) + centered(ctx, 434, 153, `${fmt(joules)} J`, sky) + centered(ctx, 434, 189, `${fmt(kwh, 5)} kW·h`, sky) +
        ctx.text(50, 259, '功率标尺（最大72W）', `style="fill:${muted}"`) + rect(50, 276, 400, 18, '#19343e', 'none') + rect(50, 276, band, 18, '#b18c57', 'none') +
        ctx.text(466, 291, `${fmt(watts)} W`) + centered(ctx, 300, 332, '同一功率下，工作时间加倍，耗电量也加倍。', muted));
      ctx.result(`<b>P = UI = ${fmt(watts)} W</b><br>W = Pt = ${fmt(joules)} J<br>= ${fmt(kwh, 5)} kW·h（度）`);
      ctx.state({ voltageV: voltage, currentA: current, minutes, timeSeconds: seconds, powerW: watts, energyJ: joules, energyKWh: kwh });
    };
    const a = ctx.slider('power-voltage', '工作电压', 1, 24, voltage, 1, 'V', v => { voltage = +v; update(); });
    const b = ctx.slider('power-current', '工作电流', 0, 3, current, .1, 'A', v => { current = +v; update(); });
    const c = ctx.slider('power-time', '工作时间', 1, 120, minutes, 1, 'min', v => { minutes = +v; update(); });
    ctx.buttons([{ label: '重置数值', run: resets([a, b, c], [12, .5, 30]) }]);
    ctx.limit('恒定直流工作状态，独立输入实际U、I与时间；不是某一真实电器的伏安特性。P用W、时间用s得J；P用kW、时间用h得kW·h。1kW·h=3.6×10⁶J。电能不等于所有设备产生的电热。');
    update();
  }

  function safety(ctx) {
    let kettle = 1500, heater = 1000, other = 100;
    const voltage = 220, limitA = 10, limitW = voltage * limitA;
    const update = () => {
      const total = kettle + heater + other, amps = total / voltage, overloaded = amps > limitA, atLimit = total === limitW;
      const color = overloaded ? red : atLimit ? amber : mint;
      const loads = [{ name: '热水设备模型', p: kettle, color: sky }, { name: '取暖设备模型', p: heater, color: amber }, { name: '其他负载模型', p: other, color: mint }];
      ctx.svg(title(ctx, '虚拟负载判断：总功率增加，总电流增加') + loads.map((a, i) => rect(25 + i * 194, 75, 178, 88, '#1b3c47', a.color) + centered(ctx, 114 + i * 194, 106, a.name) + centered(ctx, 114 + i * 194, 140, `${fmt(a.p)} W`, a.color)).join('') +
        ctx.text(38, 201, `总功率 ${fmt(total)} W；总电流 ${fmt(amps, 2)} A`, `style="fill:${color}"`) +
        rect(38, 225, 510, 25, '#19343e', muted) + rect(38, 225, Math.min(total / 4600, 1) * 510, 25, overloaded ? '#9f6155' : '#38836f', 'none') +
        ctx.line(38 + limitW / 4600 * 510, 214, 38 + limitW / 4600 * 510, 261, amber, 3) +
        centered(ctx, 38 + limitW / 4600 * 510, 283, '给定额定值：10A / 2200W', amber) +
        centered(ctx, 300, 322, overloaded ? '已超过本模型给定额定值。' : atLimit ? '已到额定值；不能由此断言实物安全。' : '数值未超额定值 ≠ 已证明实际线路安全。', color));
      ctx.result(`<b>${overloaded ? '超过额定值' : atLimit ? '达到额定值' : '数值未超过额定值'}</b><br>I = ${fmt(total)} / 220 = ${fmt(amps, 2)} A<br>虚拟额定值固定为10A。`);
      ctx.state({ voltageV: voltage, ratedCurrentA: limitA, ratedPowerW: limitW, kettleW: kettle, heaterW: heater, otherW: other, totalPowerW: total, currentA: amps, overloaded, atLimit });
    };
    const a = ctx.slider('safety-kettle', '热水设备功率', 0, 2000, kettle, 100, 'W', v => { kettle = +v; update(); });
    const b = ctx.slider('safety-heater', '取暖设备功率', 0, 2200, heater, 100, 'W', v => { heater = +v; update(); });
    const c = ctx.slider('safety-other', '其他负载功率', 0, 400, other, 50, 'W', v => { other = +v; update(); });
    ctx.buttons([{ label: '重置数值', run: resets([a, b, c], [1500, 1000, 100]) }]);
    ctx.limit('只作纸上等效模型，按220V及纯电阻负载计算；实际交流设备、插座与线路条件可能不同。绝不操作市电或自行拆修，不把本图当作布线与选型指导。破损、潮湿、接触不良等仍可导致危险；保护装置交由专业人员处理。');
    update();
  }

  function magnet(ctx) {
    let turns = 8, current = .5, direction = 1;
    const update = () => {
      const on = current > 0, rightN = direction === 1, fieldColor = on ? mint : muted;
      let scene = title(ctx, '通电螺线管：先看绕向，再判磁极') + rect(128, 147, 267, 61, '#31505b', muted, 14);
      for (let i = 0; i < turns; i++) {
        const x = 136 + i * 245 / Math.max(1, turns - 1);
        scene += path(`M${x} 147 C${x - 13} 110 ${x + 18} 110 ${x + 14} 149 L${x + 9} 207 C${x - 3} 240 ${x - 15} 230 ${x - 6} 206`, on ? amber : muted, 2);
      }
      scene += centered(ctx, 102, 183, on ? (rightN ? 'S' : 'N') : '—', on ? sky : muted) + centered(ctx, 422, 183, on ? (rightN ? 'N' : 'S') : '—', on ? red : muted);
      if (on) {
        scene += path('M393 141 C418 55 100 55 128 141 M393 211 C418 292 100 292 128 211', fieldColor, 1.7);
        scene += rightN ? arrow(284, 78, 245, 78, fieldColor) + arrow(284, 273, 245, 273, fieldColor) + arrow(230, 177, 287, 177, fieldColor) : arrow(245, 78, 284, 78, fieldColor) + arrow(245, 273, 284, 273, fieldColor) + arrow(287, 177, 230, 177, fieldColor);
      }
      scene += `<circle cx="514" cy="151" r="38" fill="none" stroke="${on ? amber : muted}" stroke-width="2"/>` +
        (rightN ? arrow(532, 116, 509, 111, on ? amber : muted) : arrow(495, 116, 518, 111, on ? amber : muted)) +
        centered(ctx, 514, 156, on ? `${fmt(current, 1)} A` : '断电') + centered(ctx, 514, 212, '从右端看') + centered(ctx, 514, 235, rightN ? '逆时针' : '顺时针', amber) +
        centered(ctx, 273, 316, on ? `${turns}匝 · 右端是${rightN ? 'N' : 'S'}极` : '电流为0：本理想模型无通电磁场', fieldColor);
      ctx.svg(scene);
      ctx.result(`<b>${on ? `右端${rightN ? 'N' : 'S'}极，左端${rightN ? 'S' : 'N'}极` : '电流为0，通电磁场消失'}</b><br>从右端看电流${rightN ? '逆时针' : '顺时针'}。<br>其他条件相同：匝数或电流增加，磁性通常增强。`);
      ctx.state({ turns, currentA: current, direction, rightEndCurrent: rightN ? 'counterclockwise' : 'clockwise', energized: on, rightPole: on ? (rightN ? 'N' : 'S') : null, leftPole: on ? (rightN ? 'S' : 'N') : null });
    };
    ctx.buttons([{ label: '右端看：逆时针', run: () => { direction = 1; update(); } }, { label: '右端看：顺时针', run: () => { direction = -1; update(); } }]);
    const a = ctx.slider('magnet-turns', '示意匝数', 4, 16, turns, 1, '匝', v => { turns = +v; update(); });
    const b = ctx.slider('magnet-current', '电流大小', 0, 1, current, .1, 'A', v => { current = +v; update(); });
    ctx.buttons([{ label: '重置数值', run: resets([a, b], [8, .5]) }]);
    ctx.limit('线圈与磁感线均为定性示意；磁感线外部从N到S，内部从S到N。用右端视图约定绕向，不显示未建模的磁感应强度数值，不模拟铁芯剩磁、饱和与发热。参数不是实物接线规格。');
    update();
  }

  function wave(ctx) {
    let frequency = 100;
    const speed = 3e8, xmax = 30, px = distance => 65 + distance / xmax * 480;
    const update = () => {
      const hz = frequency * 1e6, wavelength = speed / hz, periodNs = 1e9 / hz;
      let d = '';
      for (let i = 0; i <= 960; i++) {
        const distance = i / 960 * xmax, y = 193 - 55 * Math.sin(2 * Math.PI * distance / wavelength);
        d += `${i ? 'L' : 'M'}${px(distance).toFixed(2)},${y.toFixed(2)} `;
      }
      let scene = title(ctx, '同一波速下：频率越高，波长越短') + ctx.text(32, 61, '一瞬间的空间波形：横轴是距离，不是时间。', `style="fill:${muted}"`);
      for (let x = 0; x <= 30; x += 5) scene += ctx.line(px(x), 128, px(x), 258, '#355661', 1) + centered(ctx, px(x), 283, x);
      scene += arrow(65, 193, 568, 193, muted) + path(d, mint, 2.5) +
        path(`M${px(0)} 111 L${px(0)} 95 L${px(wavelength)} 95 L${px(wavelength)} 111`, amber, 2) +
        ctx.text(75, 85, `一个波长 λ = ${fmt(wavelength, 3)} m`, `style="fill:${amber}"`) + ctx.text(530, 307, '距离/m') +
        ctx.text(32, 323, `f = ${fmt(frequency)} MHz    λ = ${fmt(wavelength, 3)} m    v = 3.0×10⁸ m/s`);
      ctx.svg(scene);
      ctx.result(`<b>λ = v/f = ${fmt(wavelength, 3)} m</b><br>f = ${fmt(hz)} Hz<br>周期 T = ${fmt(periodNs, 3)} ns<br>核对：λf = 3.0×10⁸ m/s`);
      ctx.state({ frequencyMHz: frequency, frequencyHz: hz, speedMPerS: speed, wavelengthM: wavelength, periodS: 1 / hz, plotDistanceM: xmax });
    };
    const a = ctx.slider('wave-frequency', '电磁波频率', 20, 200, frequency, 5, 'MHz', v => { frequency = +v; update(); });
    ctx.buttons([{ label: '重置频率', run: resets([a], [100]) }]);
    ctx.limit('真空中的理想电磁波，传播速度固定为3.0×10⁸m/s，1MHz=10⁶Hz。曲线高度只作示意，不代表介质上下运动，也不显示电磁场实际强度；同频率在其他介质中的波长可能不同。');
    update();
  }

  window.PHYS_WIDGETS = { heat, energy, circuit, ohm, power, safety, magnet, wave };
}());
