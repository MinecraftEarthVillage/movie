// components/CustomPlayer.js
export default {
    template: `
        <div 
            class="custom-player" 
            @contextmenu.prevent
            tabindex="-1"
            @keydown="handleKeyDown"
            @keyup="handleKeyUp"
            @blur="handleBlur"
        >
        什么？你开F12了？不许盗视频😡🤬<br>
            不许盗视频😡🤬<br>
            不许盗视频😡🤬<br>
            放过我吧/(ㄒoㄒ)/~~纯前端实现的不容易啊！(>_<)~☆<br>
            <video
                ref="video"
                :src="currentSrc"
                :poster="poster"
                @loadedmetadata="onLoadedMetadata"
                @timeupdate="onTimeUpdate"
                @ended="onEnded"
                @error="handleVideoError"
                crossorigin="anonymous"
                preload="metadata"
                playsinline
                webkit-playsinline
                @play="onPlay"
                @pause="onPause"
                @click="togglePlay"
            >
            </video>

            <!-- 错误提示和代理按钮 - 放在视频上方，控件层之下（但实际要浮于所有之上） -->
            <div v-if="corsError && !usingProxy" class="proxy-tip-overlay">
                <div class="proxy-tip-content">
                    <p>视频加载遇到跨域问题？</p>
                    <button @click="useProxy">尝试使用代理播放</button>
                </div>
            </div>
            <div v-if="proxyFailed" class="proxy-tip-overlay">
                <div class="proxy-tip-content">
                    <p>所有代理均失败，请稍后重试</p>
                    <button @click="resetAndRetry">重试原始链接</button>
                </div>
            </div>

            <!-- 自定义控件层 -->
            <div class="player-controls" v-if="!error">
                <div class="progress-bar" @mousedown="startSeek" ref="progressBar">
                    <div class="progress-played" :style="{ width: playedPercentage + '%' }"></div>
                    <div class="progress-handle" :style="{ left: playedPercentage + '%' }"></div>
                </div>

                <div class="controls-buttons">
                    <!-- 左侧控件组 -->
                    <div class="left-controls">
                        <button @click="togglePlay" class="control-btn">
                            <i :class="playing ? 'fas fa-pause' : 'fas fa-play'"></i>
                        </button>
                        <span class="time">{{ formatTime(currentTime) }} / {{ formatTime(duration) }}</span>
                    </div>

                    <!-- 右侧控件组 -->
                    <div class="right-controls">
                        <!-- 倍速选择 -->
                        <select v-model="playbackRate" @change="changePlaybackRate" class="speed-select">
                            <option value="0.5">0.5x</option>
                            <option value="1">1x</option>
                            <option value="1.5">1.5x</option>
                            <option value="2">2x</option>
                        </select>

                        <!-- 音量控制 -->
                        <div class="volume-control">
                            <button @click="toggleMute" class="control-btn">
                                <i :class="muted ? 'fas fa-volume-mute' : (volume > 0.5 ? 'fas fa-volume-up' : (volume > 0 ? 'fas fa-volume-down' : 'fas fa-volume-off'))"></i>
                            </button>
                            <input type="range" min="0" max="1" step="0.05" v-model.number="volume" @input="changeVolume" class="volume-slider">
                        </div>

                        <!-- 全屏按钮 -->
                        <button @click="toggleFullscreen" class="control-btn">
                            <i class="fas fa-expand"></i>
                        </button>
                    </div>
                </div>
            </div>

            <!-- 倍速提示（长按右键时显示） -->
            <div class="speed-tip" v-show="showSpeedTip">
                <i class="fas fa-forward"></i> 3倍速播放中
            </div>
        </div>
    `,
    props: {
        src: { type: String, required: true },
        poster: { type: String, default: '' },
        videoId: { type: [String, Number], required: true }
    },
    emits: ['loaded', 'error'],
    data() {
        return {
            playing: false,
            currentTime: 0,
            duration: 0,
            playedPercentage: 0,
            volume: 1,
            muted: false,
            playbackRate: 1,
            // 代理相关
            currentSrc: this.src,
            corsError: false,
            usingProxy: false,
            proxyFailed: false,
            proxyList: [
                'https://cors-anywhere.herokuapp.com/',
                'https://api.allorigins.win/raw?url=',
                'https://proxy.cors.sh/'
            ],
            currentProxyIndex: 0,
            error: null,
            // 键盘长按相关
            longPressTimer: null,
            repeatInterval: null,
            isRightLongPressing: false,
            showSpeedTip: false,
            originalPlaybackRate: 1,  // 用于恢复长按前的倍速
            leftPressed: false,
            rightPressed: false
        };
    },
    mounted() {
        this.loadCachedDuration();
        // 禁用默认右键（已通过 @contextmenu.prevent 实现）
        // 使 div 可聚焦
        this.$el.focus();
    },
    beforeUnmount() {
        this.pauseVideo();
        this.clearAllLongPress();
    },
    methods: {
        togglePlay() {
            const video = this.$refs.video;
            if (video.paused) {
                video.play().catch(e => console.warn('播放错误:', e));
            } else {
                video.pause();
            }
        },
        pauseVideo() {
            this.$refs.video?.pause();
        },
        // 新增：视频开始播放时
        onPlay() {
            this.playing = true;
        },

        // 新增：视频暂停时
        onPause() {
            this.playing = false;
        },
        onLoadedMetadata(e) {
            const video = e.target;
            this.duration = video.duration;
            this.cacheVideoDuration();
            this.$emit('loaded', { duration: video.duration });
        },
        onTimeUpdate(e) {
            const video = e.target;
            this.currentTime = video.currentTime;
            if (this.duration) {
                this.playedPercentage = (this.currentTime / this.duration) * 100;
            }
        },
        onEnded() {
            this.playing = false;
        },
        startSeek(e) {
            const rect = this.$refs.progressBar.getBoundingClientRect();
            const percent = (e.clientX - rect.left) / rect.width;
            const newTime = percent * this.duration;
            this.$refs.video.currentTime = newTime;

            const onMouseMove = (moveEvent) => {
                const movePercent = (moveEvent.clientX - rect.left) / rect.width;
                const moveTime = Math.min(this.duration, Math.max(0, movePercent * this.duration));
                this.$refs.video.currentTime = moveTime;
            };
            const onMouseUp = () => {
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            };
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        },
        changeVolume() {
            this.$refs.video.volume = this.volume;
            this.muted = this.volume === 0;
        },
        toggleMute() {
            this.muted = !this.muted;
            this.$refs.video.muted = this.muted;
            if (!this.muted && this.volume === 0) {
                this.volume = 0.5;
                this.$refs.video.volume = 0.5;
            }
        },
        changePlaybackRate() {
            if (this.isRightLongPressing) {
                // 长按期间不应用用户选择的倍速，但保留值以便恢复
                // 可静默忽略或提示，这里忽略
                return;
            }
            this.$refs.video.playbackRate = this.playbackRate;
        },
        toggleFullscreen() {
            const container = this.$el;
            if (document.fullscreenElement) {
                document.exitFullscreen();
            } else {
                container.requestFullscreen();
            }
        },
        // 以下为 CORS 代理相关方法（从原组件迁移）
        handleVideoError(e) {
            const error = e.target.error;
            if (!this.usingProxy) {
                this.corsError = true;
            } else {
                console.warn('视频加载失败:', error);
                this.proxyFailed = true;
            }
            this.$emit('error', error);
        },
        useProxy() {
            if (!this.src) return;
            this.usingProxy = true;
            this.corsError = false;
            this.proxyFailed = false;

            const proxyUrl = this.proxyList[this.currentProxyIndex];
            if (!proxyUrl) {
                this.proxyFailed = true;
                this.usingProxy = false;
                return;
            }

            let proxiedSrc;
            if (proxyUrl.includes('allorigins') || proxyUrl.includes('raw?url=')) {
                proxiedSrc = proxyUrl + encodeURIComponent(this.src);
            } else {
                proxiedSrc = proxyUrl + this.src;
            }
            this.currentSrc = proxiedSrc;

            const nextProxy = () => {
                this.currentProxyIndex++;
                if (this.currentProxyIndex < this.proxyList.length) {
                    this.useProxy();
                } else {
                    this.proxyFailed = true;
                    this.usingProxy = false;
                }
            };

            const timeout = setTimeout(() => {
                if (!this.duration) {
                    nextProxy();
                }
            }, 5000);

            const onLoad = () => {
                clearTimeout(timeout);
                this.$refs.video.removeEventListener('loadedmetadata', onLoad);
            };
            this.$refs.video.addEventListener('loadedmetadata', onLoad);
        },
        resetAndRetry() {
            this.currentSrc = this.src;
            this.usingProxy = false;
            this.corsError = true;
            this.proxyFailed = false;
            this.currentProxyIndex = 0;
        },
        // 时长缓存
        loadCachedDuration() {
            try {
                const key = `video_${this.videoId}`;
                const cached = localStorage.getItem(key);
                if (cached) {
                    const { duration } = JSON.parse(cached);
                    this.duration = duration;
                }
            } catch (e) { }
        },
        cacheVideoDuration() {
            if (!this.duration) return;
            try {
                const key = `video_${this.videoId}`;
                const cached = JSON.parse(localStorage.getItem(key) || '{}');
                cached.duration = this.duration;
                cached.lastUpdated = Date.now();
                localStorage.setItem(key, JSON.stringify(cached));
            } catch (e) { }
        },
        formatTime(seconds) {
            if (!seconds || isNaN(seconds)) return '00:00';
            const h = Math.floor(seconds / 3600);
            const m = Math.floor((seconds % 3600) / 60);
            const s = Math.floor(seconds % 60);
            return h ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}` : `${m}:${s.toString().padStart(2, '0')}`;
        },
        // 键盘事件处理
        handleKeyDown(e) {
            const key = e.key;
            // 防止页面滚动或触发浏览器快捷键
            if (key === ' ' || key === 'Spacebar' || key === 'Space') {
                e.preventDefault();
                this.togglePlay();
                return;
            }
            if (key === 'ArrowLeft') {
                e.preventDefault();
                if (!this.leftPressed) {
                    this.leftPressed = true;
                    this.handleLeftKeyDown();
                }
                return;
            }
            if (key === 'ArrowRight') {
                e.preventDefault();
                if (!this.rightPressed) {
                    this.rightPressed = true;
                    this.handleRightKeyDown();
                }
                return;
            }
        },

        handleKeyUp(e) {
            const key = e.key;
            if (key === 'ArrowLeft') {
                this.leftPressed = false;
                this.clearLeftLongPress();
            }
            if (key === 'ArrowRight') {
                this.rightPressed = false;
                this.clearRightLongPress();
            }
        },

        handleBlur() {
            // 失去焦点时清除所有长按状态
            this.leftPressed = false;
            this.rightPressed = false;
            this.clearAllLongPress();
        },

        // 左箭头处理
        handleLeftKeyDown() {
            this.clearLeftLongPress(); // 清除之前的定时器
            // 立即后退5秒
            this.seekRelative(-5);
            // 设置长按定时器，300ms后开始连续后退
            this.longPressTimer = setTimeout(() => {
                this.repeatInterval = setInterval(() => {
                    this.seekRelative(-5);
                }, 200);
            }, 300);
        },

        clearLeftLongPress() {
            if (this.longPressTimer) {
                clearTimeout(this.longPressTimer);
                this.longPressTimer = null;
            }
            if (this.repeatInterval) {
                clearInterval(this.repeatInterval);
                this.repeatInterval = null;
            }
        },

        // 右箭头处理
        handleRightKeyDown() {
            this.clearRightLongPress();
            // 立即快进5秒
            this.seekRelative(5);
            // 设置长按定时器，300ms后进入3倍速模式
            this.longPressTimer = setTimeout(() => {
                this.isRightLongPressing = true;
                this.showSpeedTip = true;
                // 保存当前用户设置的倍速，然后临时设为3倍速
                this.originalPlaybackRate = this.playbackRate;
                this.$refs.video.playbackRate = 3;
            }, 300);
        },

        clearRightLongPress() {
            if (this.longPressTimer) {
                clearTimeout(this.longPressTimer);
                this.longPressTimer = null;
            }
            if (this.isRightLongPressing) {
                // 恢复原倍速
                this.$refs.video.playbackRate = this.originalPlaybackRate;
                this.isRightLongPressing = false;
                this.showSpeedTip = false;
            }
        },

        clearAllLongPress() {
            this.clearLeftLongPress();
            this.clearRightLongPress();
        },

        // 相对跳转（秒）
        seekRelative(seconds) {
            const video = this.$refs.video;
            if (!video) return;
            let newTime = video.currentTime + seconds;
            if (newTime < 0) newTime = 0;
            if (newTime > this.duration) newTime = this.duration;
            video.currentTime = newTime;
        },
    }
};