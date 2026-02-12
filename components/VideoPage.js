// components/VideoPage.js
export default {
    template: `
        <div class="video-page">
            <button class="back-home-btn" @click="goBack">
                <i class="fas fa-arrow-left"></i> 返回首页
            </button>

            <div class="video-player-container">
                <!-- 视频播放器 -->
                <video 
                    :src="currentSrc"
                    controls
                    :poster="thumbnail"
                    ref="videoPlayer"
                    @loadedmetadata="onVideoLoaded"
                    @error="handleVideoError"
                    crossorigin="anonymous"
                    autoplay
                ></video>

                <!-- CORS 代理提示 -->
                <div v-if="corsError && !usingProxy" class="cors-warning">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>无法直接播放该视频（跨域限制）</p>
                    <button class="proxy-btn" @click="useProxy">
                        <i class="fas fa-shield-alt"></i> 使用代理播放
                    </button>
                    <p class="proxy-note">
                        代理服务由第三方提供，仅用于临时播放。<br>
                        您也可以 <a :href="video.path" target="_blank">下载视频</a> 后本地观看。
                    </p>
                </div>

                <!-- 代理切换失败提示（可选） -->
                <div v-if="proxyFailed" class="cors-warning error">
                    <i class="fas fa-times-circle"></i>
                    <p>代理播放失败，请尝试其他代理或下载视频。</p>
                    <button class="proxy-btn" @click="resetAndRetry">
                        <i class="fas fa-redo"></i> 重试
                    </button>
                </div>
            </div>

            <div class="video-details">
                <h2>{{ video.title }}</h2>
                <div class="video-meta">
                    <span v-if="video.date"><i class="far fa-calendar"></i> {{ formatDate(video.date) }}</span>
                    <span v-if="videoDuration"><i class="far fa-clock"></i> {{ formatDuration(videoDuration) }}</span>
                </div>
                <div class="video-tags" v-if="video.tags && video.tags.length">
                    <span v-for="tag in video.tags" :key="tag" class="tag" @click="searchTag(tag)">
                        {{ tag }}
                    </span>
                </div>
                <div class="video-description" v-if="video.description">
                    <h4>简介</h4>
                    <p v-if="video.description" class="video-description" style="white-space: pre-line;">
                        {{ video.description }}
                    </p>
                </div>
            </div>
        </div>


    `,
    props: {
        video: { type: Object, required: true }
    },
    emits: ['back', 'search-tag'],
    data() {
        return {
            videoDuration: null,
            thumbnail: this.video.thumbnail || '',
            currentSrc: this.video.path,        // 当前视频源
            corsError: false,                   // 是否发生 CORS 错误
            usingProxy: false,                 // 是否正在使用代理
            proxyFailed: false,                // 代理播放失败
            // 公共 CORS 代理列表（按优先顺序尝试）
            proxyList: [
                'https://cors-anywhere.herokuapp.com/',
                'https://api.allorigins.win/raw?url=',
                'https://proxy.cors.sh/'
            ],
            currentProxyIndex: 0
        };
    },
    mounted() {
        this.loadCachedDuration();
        document.body.style.overflow = 'auto';
    },
    methods: {
        onVideoLoaded(e) {
            this.videoDuration = e.target.duration;
            this.cacheVideoDuration();
            // 成功加载后重置错误状态
            this.corsError = false;
            this.proxyFailed = false;
        },
        handleVideoError(e) {
            const error = e.target.error;
            // 只要出错，并且当前没有使用代理，就显示代理按钮
            if (!this.usingProxy) {
                this.corsError = true;
            } else {
                // 其他错误（如404）可显示通用提示
                console.warn('视频加载失败:', error);
            }
        },
        // 使用 CORS 代理重新加载视频
        useProxy() {
            if (!this.video.path) return;
            this.usingProxy = true;
            this.corsError = false;
            this.proxyFailed = false;

            const proxyUrl = this.proxyList[this.currentProxyIndex];
            if (!proxyUrl) {
                // 所有代理均尝试完毕
                this.proxyFailed = true;
                this.usingProxy = false;
                return;
            }

            // 构建代理 URL（不同代理格式略有差异）
            let proxiedSrc;
            if (proxyUrl.includes('allorigins') || proxyUrl.includes('raw?url=')) {
                proxiedSrc = proxyUrl + encodeURIComponent(this.video.path);
            } else {
                proxiedSrc = proxyUrl + this.video.path;
            }

            this.currentSrc = proxiedSrc;

            // 监听下一次错误，若仍失败则尝试下一个代理
            const nextProxy = () => {
                this.currentProxyIndex++;
                if (this.currentProxyIndex < this.proxyList.length) {
                    this.useProxy();
                } else {
                    this.proxyFailed = true;
                    this.usingProxy = false;
                }
            };

            // 等待视频加载，如果 5 秒内未触发 loadedmetadata 则视为失败
            const timeout = setTimeout(() => {
                if (!this.videoDuration) {
                    nextProxy();
                }
            }, 5000);

            // 单次监听 loadedmetadata，成功后清除超时
            const onLoad = () => {
                clearTimeout(timeout);
                this.$refs.videoPlayer.removeEventListener('loadedmetadata', onLoad);
            };
            this.$refs.videoPlayer.addEventListener('loadedmetadata', onLoad);
        },
        // 重置为原始链接并重新尝试（清空代理状态）
        resetAndRetry() {
            this.currentSrc = this.video.path;
            this.usingProxy = false;
            this.corsError = true;      // 让代理提示再次显示
            this.proxyFailed = false;
            this.currentProxyIndex = 0;
        },
        loadCachedDuration() {
            try {
                const key = `video_${this.video.id || this.video.path}`;
                const cached = localStorage.getItem(key);
                if (cached) {
                    const { duration } = JSON.parse(cached);
                    this.videoDuration = duration;
                }
            } catch (e) { }
        },
        cacheVideoDuration() {
            if (!this.videoDuration) return;
            try {
                const key = `video_${this.video.id || this.video.path}`;
                const cached = JSON.parse(localStorage.getItem(key) || '{}');
                cached.duration = this.videoDuration;
                cached.lastUpdated = Date.now();
                localStorage.setItem(key, JSON.stringify(cached));
            } catch (e) { }
        },
        formatDuration(seconds) {
            if (!seconds) return '00:00';
            const h = Math.floor(seconds / 3600);
            const m = Math.floor((seconds % 3600) / 60);
            const s = Math.floor(seconds % 60);
            return h ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
                : `${m}:${s.toString().padStart(2, '0')}`;
        },
        formatDate(dateString) {
            if (!dateString) return '';
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return dateString; // 非法格式，原样返回

            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');

            // 判断时间部分是否全为零（纯日期字符串解析后为 00:00:00）
            const hours = date.getHours();
            const minutes = date.getMinutes();
            const seconds = date.getSeconds();
            const milliseconds = date.getMilliseconds();

            if (hours === 0 && minutes === 0 && seconds === 0 && milliseconds === 0) {
                // 纯日期，不显示时间
                return `${year}年${month}月${day}日`;
            } else {
                // 包含时间，精确到秒
                const time = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
                return `${year}年${month}月${day}日 ${time}`;
            }
        },
        goBack() {
            this.$emit('back');
        },
        searchTag(tag) {
            this.$emit('search-tag', tag);
        }
    }
};