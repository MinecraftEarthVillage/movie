// scripts/update-video-dates.js
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ---------- 配置 ----------
const VIDEO_DATA_PATH = path.join(__dirname, '../data/video-data.json');
const REPO_ROOT = path.join(__dirname, '..'); // 仓库根目录
const TIMEZONE = 'Asia/Shanghai'; // 目标时区（中国时间）

/**
 * 获取当前时间的本地格式：YYYY-MM-DD HH:mm:ss
 */
function getCurrentLocalTime() {
    return new Date().toLocaleString('sv-SE', { timeZone: TIMEZONE }).replace(' ', ' ');
}

/**
 * 尝试从 Git 提交历史获取文件的最后提交日期（本地格式）
 * @param {string} filePath - 相对于仓库根目录的文件路径
 * @returns {string|null}  YYYY-MM-DD HH:mm:ss 或 null
 */
function getGitCommitDate(filePath) {
    try {
        const absolutePath = path.join(REPO_ROOT, filePath);
        if (!fs.existsSync(absolutePath)) return null;
        // 获取最后提交的 ISO 8601 格式（含时区）
        const isoDate = execSync(
            `git log -1 --format=%cI -- "${filePath}"`,
            { encoding: 'utf-8', cwd: REPO_ROOT }
        ).trim();
        if (!isoDate) return null;
        // 转换为目标时区的 YYYY-MM-DD HH:mm:ss
        const date = new Date(isoDate);
        return date.toLocaleString('sv-SE', { timeZone: TIMEZONE }).replace(' ', ' ');
    } catch {
        return null;
    }
}

/**
 * 判断路径是否为相对路径且指向仓库内部文件
 */
function isLocalRepoFile(pathStr) {
    if (!pathStr || pathStr.startsWith('http://') || pathStr.startsWith('https://')) return false;
    // 允许 ./videos/xxx.mp4 或 videos/xxx.mp4 等形式
    const cleanPath = pathStr.replace(/^\.\//, '');
    const fullPath = path.join(REPO_ROOT, cleanPath);
    return fs.existsSync(fullPath);
}

// ---------- 主流程 ----------
console.log('🔄 正在更新视频日期...');

// 1. 读取现有数据
const rawData = fs.readFileSync(VIDEO_DATA_PATH, 'utf-8');
const videos = JSON.parse(rawData);
let updatedCount = 0;

// 2. 遍历每个视频
videos.forEach(video => {
    if (video.date && video.date.trim() !== '') {
        return; // 已有日期，跳过
    }

    console.log(`📌 正在处理: ${video.title || video.id}`);
    let newDate = null;

    // 优先从 Git 提交历史获取（仅限仓库内文件）
    if (isLocalRepoFile(video.path)) {
        newDate = getGitCommitDate(video.path.replace(/^\.\//, ''));
        if (newDate) {
            console.log(`   ✅ 从 Git 历史获取: ${newDate}`);
        }
    }

    // 后备方案：使用当前推送时间
    if (!newDate) {
        newDate = getCurrentLocalTime();
        console.log(`   ⏱️ 使用当前时间: ${newDate}`);
    }

    // 写入 date 字段
    video.date = newDate;
    updatedCount++;
});

// 3. 写回 JSON 文件
fs.writeFileSync(VIDEO_DATA_PATH, JSON.stringify(videos, null, 2));
console.log(`✅ 更新完成，共补全 ${updatedCount} 个视频的日期。`);