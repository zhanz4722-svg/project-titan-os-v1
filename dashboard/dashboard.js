(() => {
  const d = window.__TITAN_DATA__;
  if (!d) {
    document.body.innerHTML = "<pre>Missing window.__TITAN_DATA__</pre>";
    return;
  }

  const app = document.getElementById("app");
  const dash = "—";
  const isNum = value => typeof value === "number" && Number.isFinite(value);
  const esc = value => String(value ?? dash).replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  }[c]));
  const fmtMin = minutes => isNum(minutes) ? `${Math.floor(minutes / 60)}h${String(minutes % 60).padStart(2, "0")}m` : dash;
  const fmtKg = kg => isNum(kg) ? `${Number.isInteger(kg) ? kg : kg.toFixed(1)} kg` : dash;
  const fmtReps = reps => isNum(reps) ? String(reps) : dash;
  const fmtFixed = (value, digits = 1) => isNum(value) ? value.toFixed(digits) : dash;
  const fmtPercent = value => isNum(value) ? `${value}%` : dash;
  const fmtUnit = (value, unit, fallback = null) => isNum(value) ? `${value}${unit}` : (fallback || dash);
  const pct = (value, target) => isNum(value) && isNum(target) && target > 0 ? Math.round(value / target * 100) : null;
  const badgeClass = badge => badge === "PENDING" ? "pending" : badge === "AUTO" ? "auto" : "";
  const cardTitle = (number, title, color = "green", badge = "LOCKED") =>
    `<div class="card-title ${color}"><span>🔒</span>${number ? `${number}. ` : ""}${title}<span class="badge ${badgeClass(badge)}">${badge}</span></div>`;

  const mealNotes = d.meal_notes || {};
  const meal = (number, title, color, items, note) => {
    const rows = items.length
      ? items.map(item => `<tr><td>${esc(item.food)}</td><td class="center">${esc(item.quantity)}</td></tr>`).join("")
      : `<tr><td colspan="2" class="center muted">${esc(note || "未单独记录")}</td></tr>`;
    return `<section class="card meal-card">${cardTitle(number, title, color)}<table><thead><tr><th>食物</th><th>数量</th></tr></thead><tbody>${rows}</tbody></table>${note ? `<div class="note-box">${esc(note)}</div>` : ""}</section>`;
  };

  const hist = d.history || [];
  const svgLine = (values, min, max, color = "#009b4d") => {
    const clean = values.map(value => isNum(value) ? value : null);
    if (clean.length < 2 || clean.some(value => value === null)) {
      return `<div class="empty small">趋势数据不足</div>`;
    }
    const w = 150;
    const h = 95;
    const p = 16;
    const span = max === min ? 1 : max - min;
    const xs = clean.map((_, i) => p + i * (w - 2 * p) / (clean.length - 1));
    const ys = clean.map(value => h - p - (value - min) / span * (h - 2 * p));
    return `<svg viewBox="0 0 ${w} ${h}"><polyline points="${xs.map((x, i) => `${x},${ys[i]}`).join(" ")}" fill="none" stroke="${color}" stroke-width="2"/>${xs.map((x, i) => `<circle cx="${x}" cy="${ys[i]}" r="3.5" fill="${color}"/><text x="${x}" y="${ys[i] - 7}" text-anchor="middle" font-size="9">${clean[i]}</text>`).join("")}</svg>`;
  };

  const sleep = d.sleep;
  const hasStageBreakdown = [sleep.deep_minutes, sleep.light_minutes, sleep.rem_minutes].every(isNum);
  const stageTotal = hasStageBreakdown ? sleep.deep_minutes + sleep.light_minutes + sleep.rem_minutes : null;
  const deepPct = hasStageBreakdown ? pct(sleep.deep_minutes, stageTotal) ?? 0 : null;
  const lightPct = hasStageBreakdown ? pct(sleep.light_minutes, stageTotal) ?? 0 : null;
  const remPct = hasStageBreakdown ? pct(sleep.rem_minutes, stageTotal) ?? 0 : null;
  const donutBg = hasStageBreakdown
    ? `conic-gradient(#32118f 0 ${deepPct}%, #7650ff ${deepPct}% ${deepPct + lightPct}%, #b4a8ff ${deepPct + lightPct}% ${deepPct + lightPct + remPct}%, #ff7a00 ${deepPct + lightPct + remPct}% 100%)`
    : "conic-gradient(#dfe6ee 0 100%)";
  const stageText = (minutes, status, percentValue) => {
    const base = isNum(minutes) ? fmtMin(minutes) : (status || dash);
    return `${base}（${isNum(percentValue) ? `${percentValue}%` : dash}）`;
  };

  const training = d.training;
  const duration = isNum(training.duration_minutes)
    ? training.duration_minutes
    : (() => {
        const [sh, sm] = training.start_time.split(":").map(Number);
        const [eh, em] = training.end_time.split(":").map(Number);
        return (eh * 60 + em) - (sh * 60 + sm);
      })();
  const exercises = training.exercises || [];
  const workingSetCount = exercise => isNum(exercise.working_sets)
    ? exercise.working_sets
    : (exercise.sets || []).filter(set => set.type === "working" && set.working_set !== false).length;
  const totalWorkingSets = exercises.reduce((sum, exercise) => sum + workingSetCount(exercise), 0);
  const setWeight = set => {
    if (isNum(set.left_weight_kg) || isNum(set.right_weight_kg)) {
      return `左 ${fmtKg(set.left_weight_kg)} / 右 ${fmtKg(set.right_weight_kg)}`;
    }
    return fmtKg(set.weight_kg);
  };
  const setReps = set => {
    if (isNum(set.left_reps) || isNum(set.right_reps)) {
      return `左 ${fmtReps(set.left_reps)} / 右 ${fmtReps(set.right_reps)}`;
    }
    return fmtReps(set.reps);
  };
  const setLabel = (set, index) => {
    const base = set.type === "warmup" ? "热身" : "工作组";
    const label = set.movement ? `${set.movement}` : base;
    return set.set_no ? `${label} ${set.set_no}` : `${label} ${index + 1}`;
  };
  const trainingRows = exercises.length ? exercises.map((exercise, exerciseIndex) => {
    const sets = exercise.sets || [];
    return sets.map((set, setIndex) => `<tr>
      ${setIndex === 0 ? `<td rowspan="${sets.length}" class="group-cell">${exerciseIndex + 1}</td><td rowspan="${sets.length}">${esc(exercise.body_part)}</td><td rowspan="${sets.length}"><b>${esc(exercise.name)}</b><br><span class="muted">${esc(exercise.target)}</span></td>` : ""}
      <td>${esc(setLabel(set, setIndex))}</td>
      <td class="center">${esc(setWeight(set))}</td>
      <td class="center">${esc(setReps(set))}</td>
      <td class="center">${esc(set.rpe)}</td>
      <td>${esc(set.note)}</td>
    </tr>`).join("");
  }).join("") : `<tr><td colspan="8" class="center muted">恢复日，无力量训练。</td></tr>`;

  const morningMissingReason = d.morning_check.missing_reason || "未记录";
  const morningRows = [
    ["空腹体重", isNum(d.morning_check.weight_kg) ? `${d.morning_check.weight_kg.toFixed(1)} kg` : dash, isNum(d.morning_check.weight_kg) ? "正常波动" : morningMissingReason],
    ["空腹腰围", isNum(d.morning_check.waist_cm) ? `${d.morning_check.waist_cm.toFixed(1)} cm` : dash, isNum(d.morning_check.waist_cm) ? "良好" : morningMissingReason],
    ["睡眠时长", fmtMin(sleep.sleep_minutes), "良好"],
    ["睡眠效率", fmtPercent(sleep.efficiency_percent), isNum(sleep.efficiency_percent) ? "优秀" : (sleep.quality || "良好")],
    ["睡眠评分", fmtUnit(sleep.score, " 分", sleep.quality), "良好"],
    ["静息心率", fmtUnit(sleep.heart_rate_bpm, " bpm", sleep.heart_rate_status), "良好"],
    ["肌肉恢复", d.morning_check.muscle_recovery, dash],
    ["胃部状态", d.morning_check.stomach_status, dash],
    ["精神状态", d.morning_check.mental_status, dash],
    ["训练准备度", isNum(d.morning_check.training_readiness) ? `${d.morning_check.training_readiness.toFixed(1)} / 10` : dash, isNum(d.morning_check.training_readiness) ? "可以正常训练" : dash]
  ];

  const legacyRecoveryRows = [
    ["睡眠", "25%", "23 / 25", "92%"],
    ["体重 / 腰围", "20%", "18 / 20", "90%"],
    ["肌肉恢复", "30%", "27 / 30", "90%"],
    ["精神状态", "15%", "13 / 15", "87%"],
    ["胃部状态", "10%", "9 / 10", "90%"]
  ];
  const recoveryCard = () => {
    const recovery = d.recovery_index;
    if (isNum(recovery?.score_10) || Array.isArray(recovery?.rows)) {
      const rows = Array.isArray(recovery?.rows) ? recovery.rows : [];
      const scoreRow = isNum(recovery?.score_10)
        ? `<tr><td><b>Recovery评分</b></td><td class="center"><b>${recovery.score_10} / 10</b></td><td>${esc(recovery.note)}</td></tr>`
        : "";
      const detailRows = rows.map(row => `<tr><td>${esc(row.metric)}</td><td class="center">${esc(row.value)}</td><td>${esc(row.note)}</td></tr>`).join("");
      return `<section class="card">${cardTitle("", "恢复指数（Recovery Index）", "green", recovery.status || "LOCKED")}<table><thead><tr><th>指标</th><th>数据</th><th>评价</th></tr></thead><tbody>${scoreRow}${detailRows}</tbody></table></section>`;
    }
    if (recovery?.status === "PENDING") {
      return `<section class="card">${cardTitle("", "恢复指数（Recovery Index）", "green", "PENDING")}<div class="empty">${esc(recovery.note || "等待计算")}</div></section>`;
    }
    return `<section class="card">${cardTitle("", "恢复指数（Recovery Index）", "green")}<table><thead><tr><th>指标</th><th>权重</th><th>得分（满分）</th><th>百分比</th></tr></thead><tbody>${legacyRecoveryRows.map(row => `<tr>${row.map(cell => `<td class="center">${cell}</td>`).join("")}</tr>`).join("")}<tr><td><b>总分（满分100）</b></td><td></td><td class="center"><b>90 / 100</b></td><td class="center good">优秀</td></tr></tbody></table></section>`;
  };

  const nutritionItems = [
    ["热量 (kcal)", d.nutrition.calories_kcal, d.nutrition.targets.calories_kcal],
    ["蛋白质 (g)", d.nutrition.protein_g, d.nutrition.targets.protein_g],
    ["碳水 (g)", d.nutrition.carbs_g, d.nutrition.targets.carbs_g],
    ["脂肪 (g)", d.nutrition.fat_g, d.nutrition.targets.fat_g]
  ];
  const nutritionKeys = ["calories_kcal", "protein_g", "carbs_g", "fat_g"];
  const displayNutritionValue = (key, value) => {
    const range = d.nutrition.ranges?.[key];
    if (Array.isArray(range) && range.length === 2) {
      return `${range[0]}-${range[1]}`;
    }
    return isNum(value) ? `~${value}` : dash;
  };
  const nutritionRows = nutritionItems.map(([name, value, target], index) => {
    const key = nutritionKeys[index];
    const percent = pct(value, target);
    const delta = isNum(value) && isNum(target) ? (value <= target ? `~${target - value}` : `+${value - target}`) : "未估算";
    return `<div class="nutrition-row"><b>${name}</b><span>${displayNutritionValue(key, value)}</span><span>${target}</span><span>${percent ?? dash}${percent !== null ? "%" : ""}</span><div class="bar ${percent !== null && percent > 100 ? "red" : "blue"}"><span style="width:${percent === null ? 0 : Math.min(percent, 100)}%"></span></div><span>${delta}</span></div>`;
  }).join("");

  const progressEntries = Object.entries(d.database_progress || {});
  const completedCount = progressEntries.filter(([, status]) => status === "LOCKED" || status === "SKIPPED").length;
  const volumeRows = (d.training_volume || []).map(row => `<tr><td>${esc(row.muscle)}</td><td>${esc(row.exercise)}</td><td class="center">${esc(row.working_sets)}</td></tr>`).join("");
  const weightHistory = hist.filter(entry => isNum(entry.weight_kg));
  const waistHistory = hist.filter(entry => isNum(entry.waist_cm));
  const trainingNote = training.performed === false
    ? `恢复日，无力量训练。${training.notes ? ` ${esc(training.notes)}` : ""}`
    : `备注：${training.body_parts.join(" + ")}训练完成，正式工作组 ${totalWorkingSets} 组。${training.notes ? ` ${esc(training.notes)}` : ""}`;

  app.innerHTML = `
  <header class="header"><div class="brand">🛡️ | PROJECT TITAN | DAILY DATABASE</div><div class="date">日期：${d.meta.date}（${d.meta.week} ${d.meta.day}）</div><div class="legend">Version ${d.meta.version}（锁定模板） 🟢锁定 | ⭐估算 | 🔵自动计算</div></header>
  <main class="main">
    <div class="col">
      <section class="card">${cardTitle(1, "Morning Check（晨间检查）", "green")}<table><thead><tr><th>项目</th><th>今日数据</th><th>对比昨日</th><th>状态</th><th>评价</th></tr></thead><tbody>${morningRows.map(row => `<tr><td>${row[0]}</td><td class="center">${esc(row[1])}</td><td class="center">${dash}</td><td class="center"><span class="kpi-dot"></span></td><td>${esc(row[2])}</td></tr>`).join("")}</tbody></table></section>
      ${recoveryCard()}
      <section class="card">${cardTitle("", "趋势追踪（体重 & 腰围）", "green")}<table><thead><tr><th>日期</th><th>体重 (kg)</th><th>变化</th><th>腰围 (cm)</th><th>变化</th><th>备注</th></tr></thead><tbody>${hist.map((entry, index) => { const prev = hist[index - 1] || {}; const weightDelta = isNum(entry.weight_kg) && isNum(prev.weight_kg) ? (entry.weight_kg - prev.weight_kg).toFixed(1) : dash; const waistDelta = isNum(entry.waist_cm) && isNum(prev.waist_cm) ? (entry.waist_cm - prev.waist_cm).toFixed(1) : dash; return `<tr><td>${entry.date}</td><td class="center">${fmtFixed(entry.weight_kg)}</td><td class="center">${weightDelta}</td><td class="center">${fmtFixed(entry.waist_cm)}</td><td class="center">${waistDelta}</td><td>睡眠 ${fmtMin(entry.sleep_minutes)}</td></tr>`; }).join("")}</tbody></table><div class="chart-row"><div><div class="spark-title">体重趋势 (kg)</div><div class="spark">${svgLine(weightHistory.map(entry => entry.weight_kg), 69, 73)}</div></div><div><div class="spark-title">腰围趋势 (cm)</div><div class="spark">${svgLine(waistHistory.map(entry => entry.waist_cm), 75, 77)}</div></div></div></section>
      <section class="card">${cardTitle("", "数据库进度（Database Progress）", "blue")}<div>${progressEntries.map(([key, status]) => { const complete = status === "LOCKED" || status === "SKIPPED"; const label = status === "PENDING" ? "待补" : status === "PARTIAL" ? "部分" : "完成"; const width = complete ? 100 : status === "PARTIAL" ? 65 : 35; return `<div class="progress-row"><b>${key}</b><span class="center">🔒 ${status}</span><span class="center">${label}</span><div class="bar"><span style="width:${width}%"></span></div></div>`; }).join("")}</div><div class="overall">总体完成度：${completedCount} / ${progressEntries.length}（${Math.round(completedCount / progressEntries.length * 100)}%）</div></section>
    </div>
    <div class="col">
      <section class="card">${cardTitle("", "Sleep（睡眠记录）", "blue")}<div class="sleep-wrap"><div><div class="small">睡眠效率</div><div class="big">${fmtPercent(sleep.efficiency_percent)}</div><div class="small">合理范围：85% - 100%</div></div><div class="donut" style="background:${donutBg}"><div class="donut-label">${fmtMin(sleep.sleep_minutes)}</div></div><div class="legend-list"><div><span class="sw" style="background:#32118f"></span>深睡　${esc(stageText(sleep.deep_minutes, sleep.deep_status, deepPct))}</div><div><span class="sw" style="background:#7650ff"></span>浅睡　${esc(stageText(sleep.light_minutes, sleep.light_status, lightPct))}</div><div><span class="sw" style="background:#b4a8ff"></span>REM　${esc(stageText(sleep.rem_minutes, sleep.rem_status, remPct))}</div><div><span class="sw" style="background:#ff7a00"></span>清醒　${esc(isNum(sleep.awake_minutes) ? `${sleep.awake_minutes}m` : dash)}</div></div></div><div class="sleep-mini"><div class="mini"><strong>${fmtMin(sleep.time_in_bed_minutes)}</strong>卧床时长</div><div class="mini"><strong>${fmtMin(sleep.sleep_minutes)}</strong>实际睡眠</div><div class="mini"><strong>${fmtMin(sleep.sleep_latency_minutes)}</strong>入睡时间</div><div class="mini"><strong>${fmtUnit(sleep.awakenings, "次")}</strong>清醒次数</div><div class="mini"><strong>${fmtUnit(sleep.score, "分", sleep.quality)}</strong>睡眠评分</div></div><div class="note-box">睡眠平均心率：${esc(fmtUnit(sleep.heart_rate_bpm, " bpm", sleep.heart_rate_status))}　　睡眠呼吸率：${esc(fmtUnit(sleep.respiratory_rate, " 次/min", sleep.respiratory_rate_status))}</div></section>
      <div class="meal-grid">${meal(2, "Breakfast（早餐记录）", "orange", d.meals.breakfast, mealNotes.breakfast)}${meal(3, "Lunch（午餐记录）", "red", d.meals.lunch, mealNotes.lunch)}</div>
      ${meal(5, "Dinner（晚餐记录）", "red", d.meals.dinner, mealNotes.dinner)}
      <section class="card">${cardTitle("", d.nutrition.estimated ? "Today Nutrition（全天营养累计）" : "Today Nutrition（未估算）", "blue", d.nutrition.estimated ? "AUTO" : "LOCKED")}<div>${nutritionRows}</div><div class="note-box">${esc(d.nutrition.note || "营养数据为估算值，后续餐饮摄入后自动更新。")}</div></section>
      <section class="card"><div class="card-title blue">训练容量（Volume）<span class="badge auto">AUTO</span></div><table><thead><tr><th>肌群</th><th>动作</th><th>工作组</th></tr></thead><tbody>${volumeRows}</tbody></table></section>
    </div>
    <div class="col">
      <section class="card training">${cardTitle(4, "Training（训练记录）", "red")}<div class="training-meta"><span>训练开始：${esc(training.start_time)}</span><span>训练结束：${esc(training.end_time)}</span><span>总时长：${fmtMin(duration)}</span></div><table><thead><tr><th>项目</th><th>肌群</th><th>训练内容</th><th>动作/组</th><th>重量</th><th>次数</th><th>RPE</th><th>备注</th></tr></thead><tbody>${trainingRows}</tbody></table><div class="note-box">${trainingNote}</div></section>
      <section class="card summary">${cardTitle(6, "Daily Summary（每日总结）", "red", "LOCKED")}<table><thead><tr><th>项目</th><th>内容</th></tr></thead><tbody>${Object.entries(d.daily_summary || {}).map(([key, value]) => `<tr><td>${({training: "今日训练完成情况", diet: "今日饮食完成情况", sleep: "睡眠总结", body: "身体状态总结", scores: "今日综合评分", tomorrow: "明日计划 / 调整"})[key] || key}</td><td>${esc(value)}</td></tr>`).join("")}</tbody></table></section>
      <section class="card summary">${cardTitle(7, "今日关键发现（Discovery）", "red", "LOCKED")}<table><thead><tr><th>类别</th><th>内容</th></tr></thead><tbody>${Object.entries(d.discovery || {}).map(([key, value]) => `<tr><td>${({training: "训练表现", diet: "饮食反馈", body: "身体反馈"})[key] || key}</td><td>${esc(value)}</td></tr>`).join("")}</tbody></table></section>
      <section class="card">${cardTitle(8, "备注（可随时补充）", "red", d.notes ? "LOCKED" : "PENDING")}<div class="empty">${esc(d.notes || "等待补充")}</div></section>
    </div>
  </main><footer class="footer">所有时间均基于柏林本地时间（CET / CEST），每日数据当日录入，周日晚统一审计汇总。</footer>`;
})();
