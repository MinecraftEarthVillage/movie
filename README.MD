# 🛡️ 伪哔哩哔哩 · 数字记忆的庇护所

> **“不被允许存在的，未必没有存在的意义。”**

## ✨ 项目起源

在算法与规则的夹缝中，许多用心创作的内容悄然消失。它们或许触碰了模糊的边界，或许只是不符合某种隐形规则——但其中不乏值得被看见的思考、创意与表达。

**伪哔哩哔哩** 诞生于这样的信念：数字时代的记忆不应由单一算法决定其存亡。我们搭建这座“数字方舟”，旨在收录那些在B站上**无故消失**的创作，为被平台机制静音的声音提供一个备份空间。

## 🏗️ 如何运作

### 内容收录原则
- ✅ **接受**：在B站曾正常发布，后因**非作者意愿**被删除、屏蔽或账号封禁的视频
- ✅ **审核**：所有投稿内容将经过人工复核，确保符合基本内容准则
- ❌ **拒绝**：违法内容、极端言论、纯粹广告及其他平台明确禁止的恶意内容

### 投稿流程
1. **提交内容**
  1. 前往 [反馈区](issues)
  2. 点击"New issue"创建新的投稿申请
  3. 按格式提供视频信息、被删原因（可选）、视频文件。若文件过大，可以提供网盘链接、对象存储直链等；或者将视频文件放置在你的仓库内并开启 GitHub Pages。**注意**：请勿使用 `https://github.com/用户名/仓库名/raw/refs/heads/main/...` 这样的文件链接，因为有跨域限制。对于超过 GitHub 限制的单文件，可以使用我们的[切片小工具](#小工具)进行切分，然后提供生成的 m3u8 文件链接即可。
2. **审核验证**：团队核实视频的删除情况与内容性质
3. **存档上线**：通过审核的内容将加入网页，获得新的访问地址
4. **作者标注**：保留原始创作者信息，尊重原创精神

## 🌍 我们的使命

> **“我们不是在对抗平台，而是在保存数字生态的多样性。”**

每一段被消失的视频背后，都可能是一个创作者的数小时心血、一次真诚的分享，或是一个微小但重要的观点。这个项目希望：

- 📦 **建立备份**：防止有价值的创作因平台决策而永久消失
- 🔍 **提供参照**：形成一份另类的内容审核案例库
- 💬 **引发思考**：促进关于平台治理与表达自由的理性讨论
- 🤝 **连接彼此**：让有相似经历的内容创作者感到不再孤单

## 📂 内容范围

我们特别关注以下类型的消失内容：
- 社会议题的深度讨论
- 边缘但重要的文化表达
- 创意独特的个人作品
- 有争议但有价值的技术/学术内容
- 其他平台审核中可能存在的“误伤”案例

## 🧭 参与方式

### 如果你是内容创作者：
1. 提交你被删除的作品信息
2. 可选择匿名或署名保存
3. 成为这个数字记忆库的共建者

### 如果你是支持者：
1. Star这个仓库，增加项目能见度
2. 分享给可能有需要的人
3. 提交你发现的有价值但已消失的内容链接

### 如果你是开发者：
1. 帮助我们改进网站
2. 参与工具开发，简化投稿流程
3. 协助构建更智能的内容管理方案

## 📜 法律与伦理声明

- 本项目为**非营利性质**，旨在文化保存与讨论促进
- 所有收录内容均保留原始版权信息，尊重创作者权利
- 我们鼓励通过合法渠道申诉平台决策，本存档为补充性保护措施
- 如版权方要求删除特定内容，我们将及时响应

## 🌐 立即访问
- **网站链接：** https://bilibili.globalvillage.广东 或 https://globalvillage.广东/movie
- **投稿渠道**：通过GitHubIssues提交
- **讨论群组**：[Discord](https://discord.gg/rQc7D3baS5)

## 小工具

### 切片

<details>
<summary>将大视频文件切分成10MB~~~</summary>

```CMD/POWERSHELL脚本 需安装FFmpeg

@echo off
setlocal enabledelayedexpansion

REM 检查参数
if "%~1"=="" (
    echo 用法: %~nx0 ^<视频文件^>
    echo 功能: 将视频切成 HLS 流（m3u8+ts），每段大小 ≤ 5MB，保存到视频文件名（不含扩展名）的文件夹中
    exit /b 1
)

REM 获取输入文件的完整路径并验证存在性
set "input=%~f1"
if not exist "%input%" (
    echo 错误: 文件 "%input%" 不存在
    exit /b 1
)

REM 提取文件名（不含扩展名）用于后续输出
set "basename=%~n1"

REM 创建输出目录：原视频所在目录\原视频标题
set "outdir=%~dpn1"
if not exist "%outdir%" mkdir "%outdir%"

echo 正在分析视频文件: "%input%"

REM --- 第1步：获取视频文件总大小（字节） ---
for %%I in ("%input%") do set "file_size=%%~zI"
REM 设定目标分片最大字节数
set /a target_size=5*1000*1000

REM --- 第2步：获取视频总时长（秒） ---
for /f "usebackq delims=." %%a in (`ffprobe -v error -show_entries format^=duration -of default^=noprint_wrappers^=1:nokey^=1 "%input%"`) do set "duration_float=%%a"
set /a duration_sec=!duration_float! + 1

echo 文件总大小: !file_size! 字节
echo 视频时长: !duration_sec! 秒 (向上取整)

REM --- 第3步：计算最少分段数 ---
set /a segments=!file_size! / !target_size!
set /a remainder=!file_size! %% !target_size!
if !remainder! gtr 0 set /a segments=!segments! + 1

echo 目标每段大小: !target_size! 字节 (不超过20MB)
echo 至少需要分段数: !segments!

REM 计算分段数的位数，用于生成带前导零的序号
set /a temp=segments
set "ndigits=0"
:count_digits
if !temp! gtr 0 (
    set /a ndigits+=1
    set /a temp/=10
    goto count_digits
)
if !ndigits! equ 0 set ndigits=1
echo 数字位数: !ndigits!

REM 构造文件名格式字符串，例如 %%03d.ts
set "fmt=%%0!ndigits!d.ts"

REM --- 第4步：计算每段近似时长 ---
set /a segment_time=!duration_sec! / !segments!
set /a time_remainder=!duration_sec! %% !segments!
if !time_remainder! gtr 0 set /a segment_time=!segment_time! + 1
echo 计算得每段时长: !segment_time! 秒

echo 开始生成 HLS 切片...

REM --- 第5步：执行 HLS 切片命令 ---
ffmpeg -i "%input%" -c copy -start_number 0 -hls_time !segment_time! -hls_list_size 0 -hls_segment_filename "%outdir%\!basename!!fmt!" -f hls "%outdir%\!basename!.m3u8"

if errorlevel 1 (
    echo 切片过程中出现错误，请检查 FFmpeg 输出。
    exit /b 1
) else (
    echo HLS 切片完成！文件保存在 "%outdir%"
    exit /b 0
)

```
</details>

### 无损压缩

```同样需要安装FFmpeg

ffmpeg -i "原视频.mp4" -c:v libx264 -crf 28 -c:a aac -b:a 128k 原视频_已压缩.mp4
pause

```

---

## 💎 最后的话

**“平台可以删除一段视频，但不能删除它存在过的意义。”**

每一份消失的内容都像一颗星——即使从夜空中坠落，它曾发出的光依然在某个时空中传播。我们在这里搭建的，不是对抗的堡垒，而是记忆的温室；不是愤怒的回声，而是理性的存档。

当算法的浪潮冲刷数字海岸时，总有一些贝壳值得被拾起、保存、展示。

**加入我们，一起为那些不应被遗忘的创作，建一座数字的亚历山大图书馆。**
这是一个开源项目，欢迎开发者贡献代码，也欢迎内容创作者投稿被删视频。让我们共同打造一个真正的内容自由之地！

---

*无论你的声音在哪里被沉默，这里都会为你保留一席之地。*
*“伪哔哩哔哩”项目组 · 始于2026年 · 为记忆而存在*