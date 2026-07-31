# PROJECT TITAN OS v1.0

这是 PROJECT TITAN 的第一套可重复渲染源码项目。它使用固定 HTML/CSS 母版、Titan Schema v1.0、每日 JSON 数据和 Playwright 渲染引擎，把同一份数据稳定导出为 PNG 与 PDF。

## 目录

- `dashboard/`: Daily Database v3.1 固定视觉母版
- `schema/titan.schema.json`: Titan Schema v1.0
- `data/2026-07-29.json`: 首个正式每日数据
- `engine/validate.py`: 数据校验程序
- `engine/render.py`: PNG/PDF 导出引擎
- `reports/`: Weekly Audit、Monthly Report、Working Weight Database 预留模块
- `.github/workflows/render-daily.yml`: GitHub Actions 自动校验与渲染流程

## 本地使用

```bash
python -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
python -m playwright install chromium
python engine/render.py data/2026-07-29.json
```

Windows PowerShell:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m playwright install chromium
python engine\render.py data\2026-07-29.json
```

生成文件:

- `output/png/PROJECT_TITAN_2026-07-29.png`
- `output/pdf/PROJECT_TITAN_2026-07-29.pdf`

## GitHub 使用

1. 把本项目推送到 GitHub 仓库。
2. 以后每天新增或修改 `data/YYYY-MM-DD.json`。
3. push 到 GitHub 后，`Render Daily Dashboard` workflow 会自动校验 JSON 并渲染 PNG/PDF。
4. 生成结果会上传为 GitHub Actions artifact，并自动提交回 `output/png/` 与 `output/pdf/`。

也可以在 GitHub 页面手动运行 workflow，并填写某一天的数据文件，例如:

```text
data/2026-07-29.json
```

## 每日 JSON 记录标准

每日 JSON 是 PROJECT TITAN 的数据库源数据，不是图片，也不是简化摘要。正式归档时应尽量保存：

- Morning Check：体重、腰围、训练准备度和主观状态。
- Sleep：评分、实际睡眠、卧床时间、入睡时间、清醒次数、深睡、浅睡、REM、心率、呼吸率。
- Meals：早餐、午餐、晚餐的食物和数量；两餐制可用空数组并在 `meal_notes` 说明。
- Training：开始/结束时间、训练部位、每个动作、每一组重量和次数；左右手或正反握可以逐组保存。
- Training Volume：按肌群汇总本日工作组数，用于后续 Weekly Audit 和 Working Weight Database。
- Nutrition：没有精确估算时保持 `null`，并用 `estimated: false` 说明不做额外估算。

## 核心原则

1. 模板固定：普通每日记录只改 JSON，不改 HTML/CSS。
2. 数据真实：未锁定字段保持 `null`，不自动编造。
3. 估算标记：营养估算必须带 `estimated: true`。
4. 先验证再渲染：Schema 校验失败时停止生成。
