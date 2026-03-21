/**
 * CustomPlayer 组件
 * 功能用途：自定义视频播放器，支持播放控制、进度调节、音量控制、倍速播放、全屏等功能
 * 
 * 核心逻辑：
 * 1. 视频播放控制（播放/暂停、进度调节）
 * 2. 音量控制和静音功能
 * 3. 倍速播放设置
 * 4. 全屏切换
 * 5. 跨域视频代理播放
 * 6. 实时缓冲状态和网速显示
 * 7. 键盘和触摸事件处理
 * 8. 控件自动隐藏/显示
 * 
 * 关键参数：
 * - src: 视频源地址（必需）
 * - poster: 视频封面图片（可选，默认为空）
 * - videoId: 视频ID（必需，用于缓存视频信息）
 * 
 * 事件：
 * - loaded: 视频加载完成时触发，传递视频时长
 * - error: 视频加载错误时触发，传递错误对象
 * - ended: 视频播放结束时触发
 * - resize: 视频尺寸变化时触发
 * 
 * 使用场景示例：
 * <CustomPlayer 
 *   :src="videoUrl" 
 *   :poster="videoPoster"
 *   :videoId="videoId"
 *   @loaded="handleVideoLoaded"
 *   @error="handleVideoError"
 *   @ended="handleVideoEnded"
 *   @resize="handleVideoResize"
 * />
 * 
 * 重要注意事项：
 * 1. 支持键盘控制：空格键播放/暂停，左右箭头快进/后退
 * 2. 支持触摸长按进入3倍速播放模式
 * 3. 当遇到跨域问题时，会自动尝试使用代理播放
 * 4. 视频进度和时长会缓存到localStorage，下次播放时恢复
 * 5. 控件会在3秒无操作后自动隐藏
 */
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
            <div class="video-wrapper" ref="videoWrapper">
                <!--
                    什么？你开F12了？！
                    不许盗视频😡🤬
                    不许盗视频😡🤬
                    不许盗视频😡🤬
                -->
                <!-- 视频播放器 -->
                <video
                    v-if="!isSwf"
                    ref="video"
                    :src="currentSrc"
                    :poster="poster"
                    @loadedmetadata="onLoadedMetadata"
                    @timeupdate="onTimeUpdate"
                    @ended="onEnded"
                    @error="handleVideoError"
                    @waiting="onWaiting"
                    @playing="onPlaying"
                    @canplay="onCanPlay"
                    @progress="onProgress"
                    crossorigin="anonymous"
                    preload="metadata"
                    playsinline
                    webkit-playsinline
                    @play="onPlay"
                    @pause="onPause"
                    @click="togglePlay"
                >            </video>
                
                <!-- SWF播放器 -->
                <div v-else class="swf-player">
                    <div class="swf-content">
                        <object 
                            :data="currentSrc" 
                            type="application/x-shockwave-flash"
                            width="100%"
                            height="100%"
                            ref="swfObject"
                        >
                            <param name="movie" :value="currentSrc" />
                            <param name="quality" value="high" />
                            <param name="wmode" value="transparent" />
                            <param name="allowScriptAccess" value="always" />
                            <param name="allowFullScreen" value="true" />
                            <embed 
                                :src="currentSrc" 
                                type="application/x-shockwave-flash"
                                width="100%"
                                height="100%"
                                quality="high"
                                wmode="transparent"
                                allowScriptAccess="always"
                                allowFullScreen="true"
                            />
                            <!-- 当 Flash 不可用时显示的内容 -->
                            <div class="swf-fallback">
                                <h3>Flash 播放器不可用</h3>
                                <p>现代浏览器已经不再默认支持 Flash 播放器。</p>
                                <p>您可以：</p>
                                <ul>
                                    <li>使用支持 Flash 的浏览器（如旧版本的 Chrome 或 Firefox）</li>
                                    <li>下载 SWF 文件到本地使用 Flash 播放器打开</li>
                                </ul>
                                <a :href="currentSrc" download class="download-btn">下载 SWF 文件</a>
                            </div>
                        </object>
                    </div>
                </div>

                <!-- 缓冲提示层 -->
                <div v-if="buffering && !error" class="buffering-overlay">
                    <div class="buffering-content">
                        <i class="fas fa-spinner fa-spin"></i> 缓冲中
                        <span v-if="downloadSpeed">{{ downloadSpeed.toFixed(0) }} KB/s</span>
                    </div>
                </div>

                <!-- 错误提示和代理按钮 - 放在视频上方，控件层之下（但实际要浮于所有之上） -->
                <div v-if="corsError && !usingProxy && !isSwf" class="proxy-tip-overlay">
                    <div class="proxy-tip-content">
                        <p>视频加载遇到跨域问题？</p>
                        <button @click="useProxy">尝试使用代理播放</button>
                    </div>
                </div>
                <div v-if="proxyFailed && !isSwf" class="proxy-tip-overlay">
                    <div class="proxy-tip-content">
                        <p>所有代理均失败，请稍后重试</p>
                        <button @click="resetAndRetry">重试原始链接</button>
                    </div>
                </div>

                <!-- 自定义控件层 -->
                <div class="player-controls"  :class="{ 'controls-visible': controlsVisible }"  v-if="!error && !isSwf">
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
        </div>
    `,
    props: {
        /**
         * 视频源地址
         * @type {String}
         * @required
         */
        src: { type: String, required: true },
        /**
         * 视频封面图片
         * @type {String}
         * @default ''
         */
        poster: { type: String, default: '' },
        /**
         * 视频ID，用于缓存视频信息
         * @type {[String, Number]}
         * @required
         */
        videoId: { type: [String, Number], required: true }
    },
    /**
     * 事件
     */
    emits: ['loaded', 'error', 'ended', 'resize'],
    data() {
        return {
            // 播放状态
            playing: false,
            // 当前播放时间（秒）
            currentTime: 0,
            // 视频总时长（秒）
            duration: 0,
            // 保存的播放进度（用于恢复）
            savedTime: 0,
            // 播放进度百分比
            playedPercentage: 0,
            // 音量（0-1）
            volume: 1,
            // 是否静音
            muted: false,
            // 播放倍速
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
            rightPressed: false,
            // 触摸长按相关
            touchLongPressTimer: null,
            isTouchLongPressing: false,
            // 缓冲与网速
            buffering: true,// 是否显示缓冲层
            downloadSpeed: null,// 实时网速 (KB/s)
            totalSize: null,// 视频总字节数（用于计算速度）
            lastLoadedBytes: 0,// 上一次已加载字节数
            lastProgressTime: 0,// 上一次progress时间戳
            //进度条隐藏
            controlsVisible: true,// 控件是否可见
            hideControlsTimer: null,// 隐藏控件的定时器
            leaveTimer: null// 鼠标离开后的延迟隐藏定时器
        };
    },
    computed: {
        /**
         * 判断是否为 SWF 格式
         * @returns {boolean} 是否为 SWF 格式
         */
        isSwf() {
            return this.currentSrc.toLowerCase().endsWith('.swf');
        }
    },
    mounted() {
        // 加载缓存的视频时长和进度
        this.loadCachedDuration();
        // 使 div 可聚焦
        this.$el.focus();
        // 尝试获取视频大小
        this.fetchVideoSize(this.currentSrc);

        // 控件自动隐藏逻辑
        const wrapper = this.$refs.videoWrapper;
        wrapper.addEventListener('mousemove', this.onUserActivity);
        wrapper.addEventListener('touchmove', this.onUserActivity);
        wrapper.addEventListener('mousedown', this.onUserActivity);
        wrapper.addEventListener('touchstart', this.onTouchStart);
        wrapper.addEventListener('touchend', this.onTouchEnd);
        wrapper.addEventListener('touchcancel', this.onTouchEnd);
        wrapper.addEventListener('mouseenter', this.onMouseEnter);
        wrapper.addEventListener('mouseleave', this.onMouseLeave);

        // 监听视频尺寸变化
        this.observeVideoResize();
    },
    beforeUnmount() {
        // 组件卸载前清理
        this.pauseVideo();
        this.clearAllLongPress();
        this.clearHideTimer();
        if (this.leaveTimer) clearTimeout(this.leaveTimer);
        if (this.touchLongPressTimer) clearTimeout(this.touchLongPressTimer);

        // 移除事件监听器
        const wrapper = this.$refs.videoWrapper;
        if (wrapper) {
            wrapper.removeEventListener('mousemove', this.onUserActivity);
            wrapper.removeEventListener('touchmove', this.onUserActivity);
            wrapper.removeEventListener('mousedown', this.onUserActivity);
            wrapper.removeEventListener('touchstart', this.onTouchStart);
            wrapper.removeEventListener('touchend', this.onTouchEnd);
            wrapper.removeEventListener('touchcancel', this.onTouchEnd);
            wrapper.removeEventListener('mouseenter', this.onMouseEnter);
            wrapper.removeEventListener('mouseleave', this.onMouseLeave);
        }

        // 清理ResizeObserver
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
    },
    methods: {
        /**
         * 切换播放/暂停状态
         */
        togglePlay() {
            if (this.isSwf) {
                this.toggleSwfPlay();
                return;
            }
            const video = this.$refs.video;
            if (video.paused) {
                video.play().catch(e => console.warn('播放错误:', e));
            } else {
                video.pause();
            }
        },
        /**
         * 切换 SWF 播放/暂停状态
         */
        toggleSwfPlay() {
            // SWF 内容通常会自己处理播放控制
            // 这里主要是为了保持与视频播放器的交互一致性
            this.playing = !this.playing;
        },
        /**
         * 暂停视频
         */
        pauseVideo() {
            if (!this.isSwf) {
                this.$refs.video?.pause();
            } else {
                this.playing = false;
            }
        },
        /**
         * 视频开始播放时
         */
        onPlay() {
            this.playing = true;
        },

        /**
         * 视频暂停时
         */
        onPause() {
            this.playing = false;
        },
        /**
         * 视频元数据加载完成时
         * @param {Event} e - 事件对象
         */
        onLoadedMetadata(e) {
            if (this.isSwf) {
                // SWF 格式不需要获取视频时长
                this.duration = 0;
                this.buffering = false;
                this.$emit('loaded', { duration: 0 });
                return;
            }
            const video = e.target;
            this._tryGetDuration(video);   // 尝试获取并更新 duration
            // 恢复播放进度
            if (this.savedTime > 0) {
                video.currentTime = this.savedTime;
                this.currentTime = this.savedTime;
            }
        },
        /**
         * 尝试获取视频时长
         * @param {HTMLVideoElement} video - 视频元素
         * @param {number} maxAttempts - 最大尝试次数
         */
        _tryGetDuration(video, maxAttempts = 10) {
            const check = (attempt = 0) => {
                if (video.duration && !isNaN(video.duration) && video.duration !== Infinity) {
                    this.duration = video.duration;
                    this.cacheVideoDuration();
                    this.$emit('loaded', { duration: video.duration });
                    return;
                }
                if (attempt < maxAttempts) {
                    setTimeout(() => check(attempt + 1), 200);
                }
            };
            check();
        },
        /**
         * 视频播放时间更新时
         * @param {Event} e - 事件对象
         */
        onTimeUpdate(e) {
            if (this.isSwf) {
                return;
            }
            const video = e.target;
            this.currentTime = video.currentTime;
            if (this.duration) {
                this.playedPercentage = (this.currentTime / this.duration) * 100;
                // 每5秒缓存一次进度
                if (Math.floor(this.currentTime) % 5 === 0) {
                    this.cacheVideoDuration();
                }
            }
        },
        /**
         * 视频播放结束时
         */
        onEnded() {
            if (this.isSwf) {
                return;
            }
            this.playing = false;
            this.$emit('ended');
        },
        /**
         * 开始拖动进度条
         * @param {MouseEvent} e - 鼠标事件
         */
        startSeek(e) {
            if (this.isSwf) {
                return;
            }
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
        /**
         * 改变音量
         */
        changeVolume() {
            if (!this.isSwf) {
                this.$refs.video.volume = this.volume;
                this.muted = this.volume === 0;
            }
        },
        /**
         * 切换静音状态
         */
        toggleMute() {
            if (this.isSwf) {
                return;
            }
            this.muted = !this.muted;
            this.$refs.video.muted = this.muted;
            if (!this.muted && this.volume === 0) {
                this.volume = 0.5;
                this.$refs.video.volume = 0.5;
            }
        },
        /**
         * 改变播放倍速
         */
        changePlaybackRate() {
            if (this.isSwf || this.isRightLongPressing) {
                // SWF 格式或长按期间不应用用户选择的倍速
                return;
            }
            this.$refs.video.playbackRate = this.playbackRate;
        },
        /**
         * 切换全屏
         */
        toggleFullscreen() {
            const container = this.$el;
            if (document.fullscreenElement) {
                document.exitFullscreen();
            } else {
                container.requestFullscreen();
            }
        },
        /**
         * 视频缓冲时
         */
        onWaiting() {
            if (!this.isSwf) {
                this.buffering = true;
            }
        },
        /**
         * 视频播放时
         */
        onPlaying() {
            if (!this.isSwf) {
                this.buffering = false;
            }
        },
        /**
         * 视频可播放时
         */
        onCanPlay() {
            if (!this.isSwf) {
                this.buffering = false;
            }
        },
        /**
         * 视频错误时
         */
        onError() {
            if (!this.isSwf) {
                this.buffering = false;
            }
        },
        /**
         * 视频缓冲进度更新时，估算网速
         */
        onProgress() {
            if (this.isSwf) {
                return;
            }
            const video = this.$refs.video;
            if (!video || !video.buffered.length || !this.duration) return;

            // 获取当前缓冲的末尾时间
            const bufferedEnd = video.buffered.end(video.buffered.length - 1);

            // 如果有总大小，基于字节计算速度
            if (this.totalSize && this.duration > 0) {
                const loadedBytes = (bufferedEnd / this.duration) * this.totalSize;
                const now = Date.now();

                if (this.lastLoadedBytes > 0 && this.lastProgressTime > 0) {
                    const deltaBytes = loadedBytes - this.lastLoadedBytes;
                    const deltaTime = (now - this.lastProgressTime) / 1000; // 秒
                    if (deltaTime > 0 && deltaBytes > 0) {
                        const speedBps = (deltaBytes * 8) / deltaTime; // 比特/秒
                        const speedKBs = speedBps / 1024 / 8;          // KB/s
                        this.downloadSpeed = speedKBs;
                    }
                }

                this.lastLoadedBytes = loadedBytes;
                this.lastProgressTime = now;
            } else {
                // 降级方案：使用网络信息 API（如果可用）
                if (navigator.connection && navigator.connection.downlink) {
                    // downlink 单位 Mbps，转为 KB/s
                    this.downloadSpeed = (navigator.connection.downlink * 1024) / 8;
                } else {
                    this.downloadSpeed = null;
                }
            }
        },
        /**
         * 获取视频总大小（通过 HEAD 请求）
         * @param {string} url - 视频地址
         */
        async fetchVideoSize(url) {
            if (!url || this.isSwf) return;
            try {
                const response = await fetch(url, { method: 'HEAD', mode: 'cors' });
                const contentLength = response.headers.get('content-length');
                if (contentLength) {
                    this.totalSize = parseInt(contentLength, 10);
                } else {
                    this.totalSize = null;
                }
            } catch (e) {
                // 跨域或其他错误，忽略
                this.totalSize = null;
            }
        },
        /**
         * 处理视频错误
         * @param {Event} e - 事件对象
         */
        handleVideoError(e) {
            if (this.isSwf) {
                return;
            }
            const error = e.target.error;
            if (!this.usingProxy) {
                this.corsError = true;
            } else {
                console.warn('视频加载失败:', error);
                this.proxyFailed = true;
            }
            this.$emit('error', error);
            this.buffering = false; // 出错时关闭缓冲提示
        },
        /**
         * 使用代理播放视频
         */
        useProxy() {
            if (!this.src || this.isSwf) return;
            this.usingProxy = true;
            this.corsError = false;
            this.proxyFailed = false;
            this.buffering = true;   // 切换代理时重新显示缓冲

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

            // 尝试获取新代理地址的视频大小
            this.fetchVideoSize(proxiedSrc);

            const nextProxy = () => {
                this.currentProxyIndex++;
                if (this.currentProxyIndex < this.proxyList.length) {
                    this.useProxy();
                } else {
                    this.proxyFailed = true;
                    this.usingProxy = false;
                    this.buffering = false;
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
        /**
         * 重置并重试原始链接
         */
        resetAndRetry() {
            if (this.isSwf) return;
            this.currentSrc = this.src;
            this.usingProxy = false;
            this.corsError = true;
            this.proxyFailed = false;
            this.currentProxyIndex = 0;
            this.buffering = true;
            this.fetchVideoSize(this.src);
        },
        /**
         * 加载缓存的视频时长和进度
         */
        loadCachedDuration() {
            if (this.isSwf) return;
            try {
                const key = `video_${this.videoId}`;
                const cached = localStorage.getItem(key);
                if (cached) {
                    const { duration, currentTime } = JSON.parse(cached);
                    if (duration) this.duration = duration;
                    if (currentTime) this.savedTime = currentTime;
                }
            } catch (e) { }
        },
        /**
         * 缓存视频时长和进度
         */
        cacheVideoDuration() {
            if (!this.duration || this.isSwf) return;
            try {
                const key = `video_${this.videoId}`;
                const cached = JSON.parse(localStorage.getItem(key) || '{}');
                cached.duration = this.duration;
                cached.currentTime = this.currentTime;
                cached.lastUpdated = Date.now();
                localStorage.setItem(key, JSON.stringify(cached));
            } catch (e) { }
        },
        /**
         * 格式化时间
         * @param {number} seconds - 秒数
         * @returns {string} 格式化的时间字符串
         */
        formatTime(seconds) {
            if (!seconds || isNaN(seconds)) return '00:00';
            const h = Math.floor(seconds / 3600);
            const m = Math.floor((seconds % 3600) / 60);
            const s = Math.floor(seconds % 60);
            return h ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}` : `${m}:${s.toString().padStart(2, '0')}`;
        },
        /**
         * 处理键盘按下事件
         * @param {KeyboardEvent} e - 键盘事件
         */
        handleKeyDown(e) {
            this.showControls(); // 任何键盘操作都刷新控件显示
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

        /**
         * 处理键盘释放事件
         * @param {KeyboardEvent} e - 键盘事件
         */
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

        /**
         * 处理失去焦点事件
         */
        handleBlur() {
            // 失去焦点时清除所有长按状态
            this.leftPressed = false;
            this.rightPressed = false;
            this.clearAllLongPress();
        },

        /**
         * 处理左箭头按下
         */
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

        /**
         * 清除左箭头长按
         */
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

        /**
         * 处理右箭头按下
         */
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

        /**
         * 清除右箭头长按
         */
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

        /**
         * 清除所有长按状态
         */
        clearAllLongPress() {
            this.clearLeftLongPress();
            this.clearRightLongPress();
        },

        /**
         * 相对跳转（秒）
         * @param {number} seconds - 跳转秒数，正数快进，负数后退
         */
        seekRelative(seconds) {
            if (this.isSwf) return;
            const video = this.$refs.video;
            if (!video) return;
            let newTime = video.currentTime + seconds;
            if (newTime < 0) newTime = 0;
            if (newTime > this.duration) newTime = this.duration;
            video.currentTime = newTime;
        },
        /**
         * 显示控件
         */
        showControls() {
            this.controlsVisible = true;
            this.resetHideTimer();
        },
        /**
         * 重置隐藏控件的定时器
         */
        resetHideTimer() {
            if (this.hideControlsTimer) clearTimeout(this.hideControlsTimer);
            this.hideControlsTimer = setTimeout(() => {
                this.controlsVisible = false;
            }, 3000); // 3秒无操作后隐藏
        },
        /**
         * 清除隐藏控件的定时器
         */
        clearHideTimer() {
            if (this.hideControlsTimer) {
                clearTimeout(this.hideControlsTimer);
                this.hideControlsTimer = null;
            }
        },
        /**
         * 处理用户活动
         */
        onUserActivity() {
            // 用户活动（鼠标移动、触摸、点击等）时显示控件并重置定时器
            this.showControls();
        },
        /**
         * 处理鼠标进入事件
         */
        onMouseEnter() {
            // 鼠标进入视频区域，清除离开定时器并显示控件
            if (this.leaveTimer) {
                clearTimeout(this.leaveTimer);
                this.leaveTimer = null;
            }
            this.showControls();
        },
        /**
         * 处理鼠标离开事件
         */
        onMouseLeave() {
            // 鼠标离开视频区域，延迟隐藏（避免闪烁）
            this.clearHideTimer(); // 清除常规隐藏定时器
            this.leaveTimer = setTimeout(() => {
                this.controlsVisible = false;
            }, 200); // 200ms后隐藏，期间若重新进入则取消
        },
        /**
         * 监听视频尺寸变化
         */
        observeVideoResize() {
            const video = this.$refs.video;
            if (!video) return;

            this.resizeObserver = new ResizeObserver(() => {
                this.$emit('resize');
            });

            this.resizeObserver.observe(video);
        },
        /**
         * 处理触摸开始事件
         * @param {TouchEvent} e - 触摸事件
         */
        onTouchStart(e) {
            this.onUserActivity();
            // 清除之前的定时器
            if (this.touchLongPressTimer) {
                clearTimeout(this.touchLongPressTimer);
                this.touchLongPressTimer = null;
            }
            // 设置长按定时器，300ms后进入3倍速模式
            this.touchLongPressTimer = setTimeout(() => {
                this.isTouchLongPressing = true;
                this.isRightLongPressing = true; // 复用现有的倍速提示逻辑
                this.showSpeedTip = true;
                // 保存当前用户设置的倍速，然后临时设为3倍速
                this.originalPlaybackRate = this.playbackRate;
                this.$refs.video.playbackRate = 3;
            }, 300);
        },
        /**
         * 处理触摸结束事件
         */
        onTouchEnd() {
            // 清除长按定时器
            if (this.touchLongPressTimer) {
                clearTimeout(this.touchLongPressTimer);
                this.touchLongPressTimer = null;
            }
            // 如果是长按状态，恢复原倍速
            if (this.isTouchLongPressing) {
                this.isTouchLongPressing = false;
                this.clearRightLongPress(); // 复用现有的清除逻辑
            }
        }
    },
    watch: {
        /**
         * 监听视频源变化
         */
        src: {
            handler(newSrc) {
                this.currentSrc = newSrc;// 更新内部地址
                this.corsError = false;// 重置错误状态
                this.usingProxy = false;
                this.proxyFailed = false;
                this.currentProxyIndex = 0;
                this.buffering = true;// 切换视频时显示缓冲
                this.downloadSpeed = null;
                this.totalSize = null;
                this.lastLoadedBytes = 0;
                this.lastProgressTime = 0;
                if (!this.isSwf) {
                    this.$nextTick(() => this.$refs.video?.load()); // 重新加载视频
                } else {
                    // SWF 格式不需要调用 load() 方法，但需要显示缓冲提示
                    setTimeout(() => {
                        this.buffering = false;
                        this.$emit('loaded', { duration: 0 });
                    }, 1000); // 1秒后隐藏缓冲提示
                }
            },
            immediate: true,
        },
    },
};