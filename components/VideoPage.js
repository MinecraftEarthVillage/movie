/**
 * VideoPage 组件
 * 功能用途：视频详情页面，显示视频播放器、合集列表、视频详情和评论区
 * 
 * 核心逻辑：
 * 1. 显示视频播放器，支持播放控制、进度调节等功能
 * 2. 显示视频合集列表，支持切换视频
 * 3. 显示视频详情，包括标题、日期、时长、简介和标签
 * 4. 集成 giscus 评论区
 * 5. 支持自动连播功能
 * 
 * 关键参数：
 * - video: 视频对象（必需），包含 id、title、path、date、description、tags、thumbnail 等属性
 * 
 * 事件：
 * - back: 点击返回按钮时触发
 * - search-tag: 点击标签时触发，传递标签内容
 * - play-video: 播放视频时触发，传递视频ID
 * 
 * 使用场景示例：
 * <VideoPage 
 *   :video="currentVideo"
 *   @back="handleBack"
 *   @search-tag="handleSearchTag"
 *   @play-video="handlePlayVideo"
 * />
 * 
 * 重要注意事项：
 * 1. 组件会从 localStorage 缓存视频时长，避免重复计算
 * 2. 支持响应式布局，在移动端和桌面端显示不同的合集列表布局
 * 3. 视频播放结束时，若开启自动连播，会自动播放合集中的下一个视频
 * 4. 集成了 giscus 评论区，每个视频有独立的评论线程
 */
import CustomPlayer from './CustomPlayer.js';
import CollectionList from './CollectionList.js';
export default {
    components: { CustomPlayer, CollectionList },
    template: `
        <div class="video-page">
            <button class="back-home-btn" @click="goBack">
                <i class="fas fa-arrow-left"></i> 返回首页
            </button>

            <div class="video-content-wrapper">
                <div class="video-player-container">
                    <!-- 自定义防右键盗视频播放器 -->
                    <custom-player 
                        :src="currentSrc"
                        :poster="thumbnail"
                        :video-id="video.id"
                        ref="videoPlayer"
                        @loaded="onVideoLoaded"
                        @error="handleVideoError"
                        @ended="handleVideoEnded"
                        @resize="updateWrapperHeight"
                    ></custom-player>
                </div>
                
                <div class="collection-desktop" v-if="!isMobilePortrait">
                    <collection-list 
                        :current-video-id="video.id" 
                        :videos="allVideos"
                        :wrapper-height="wrapperHeight"
                        @play-video="playVideo"
                        @collection-loaded="updateWrapperHeight"
                    ></collection-list>
                </div>
            </div>

            <div class="video-details">
                <h2>{{ video.title }}</h2>
                <div class="video-meta">
                    <span v-if="video.date"><i class="far fa-calendar"></i> {{ formatDate(video.date) }}</span>
                    <span v-if="videoDuration"><i class="far fa-clock"></i> {{ formatDuration(videoDuration) }}</span>
                </div>

                <div class="video-description" v-if="video.description">
                    <h4>简介</h4>
                    <p style="white-space: pre-line;">{{ video.description }}</p>
                </div>

                <!-- 标签 -->
                <div class="video-tags" v-if="video.tags && video.tags.length">
                    <span v-for="tag in video.tags" :key="tag" class="tag" @click="searchTag(tag)">
                        {{ tag }}
                    </span>
                </div>
                
                <!-- 移动端合集栏 -->
                <div class="collection-mobile" v-if="isMobilePortrait">
                    <collection-list 
                        :current-video-id="video.id" 
                        :videos="allVideos"
                        @play-video="playVideo"
                    ></collection-list>
                </div>
                

            </div>

            <!-- ===== giscus 评论区容器 ===== -->
            <div class="giscus-container" ref="giscusContainer"></div>
        </div>
    `,
    props: {
        /**
         * 视频对象
         * @type {Object}
         * @required
         * @property {string|number} id - 视频ID
         * @property {string} title - 视频标题
         * @property {string} path - 视频路径
         * @property {string} [date] - 视频日期
         * @property {string} [description] - 视频简介
         * @property {string[]} [tags] - 视频标签
         * @property {string} [thumbnail] - 视频缩略图
         */
        video: { type: Object, required: true }
    },
    /**
     * 事件
     */
    emits: ['back', 'search-tag', 'play-video'],
    data() {
        return {
            // 视频时长（秒）
            videoDuration: null,
            // 视频缩略图
            thumbnail: this.video.thumbnail || '',
            // 当前视频源地址
            currentSrc: this.video.path,
            // 所有视频数据（用于合集列表）
            allVideos: [],
            // 合集列表容器高度
            wrapperHeight: 0
        };
    },
    computed: {
        /**
         * 判断是否为移动端竖屏视图
         * @returns {boolean} 是否为移动端竖屏
         */
        isMobilePortrait() {
            return window.innerWidth < 768 && window.innerHeight > window.innerWidth;
        }
    },
    watch: {
        /**
         * 监听视频变化
         * 当视频切换时，更新视频源、缩略图，并重新加载评论区
         */
        video: {
            handler(newVal) {
                this.currentSrc = newVal.path;            // 尝试修复edge手机端的关键更新
                this.thumbnail = newVal.thumbnail || '';
                this.$nextTick(() => {
                    this.loadGiscus();
                    // 视频切换后更新高度
                    this.updateWrapperHeight();
                });
            },
            immediate: true
        }
    },
    mounted() {
        // 从本地缓存加载视频时长，避免重复计算
        this.loadCachedDuration();
        
        // 加载所有视频数据，用于合集列表显示
        this.loadAllVideos();
        
        // 确保页面可以正常滚动（防止其他页面设置的隐藏滚动条影响）
        document.body.style.overflow = 'auto';
        
        // 初始化时计算视频容器高度，用于设置合集列表高度
        this.updateWrapperHeight();
        
        // 监听窗口大小变化，动态调整合集列表高度以保持与视频播放器对齐
        window.addEventListener('resize', this.updateWrapperHeight);
    },
    beforeUnmount() {
        // 移除窗口大小变化监听器
        window.removeEventListener('resize', this.updateWrapperHeight);
    },
    methods: {
        /**
         * 加载 giscus 评论区
         */
        loadGiscus() {
            const container = this.$refs.giscusContainer;
            if (!container) return;
            container.innerHTML = ''; // 清空旧评论

            const script = document.createElement('script');
            script.src = 'https://giscus.app/client.js';
            script.setAttribute('data-repo', 'MinecraftEarthVillage/movie');
            script.setAttribute('data-repo-id', 'R_kgDOLgVUUg');
            script.setAttribute('data-category', '评论区');
            script.setAttribute('data-category-id', 'DIC_kwDOLgVUUs4C2TWn');
            script.setAttribute('data-mapping', 'specific');
            script.setAttribute('data-term', `视频-${this.video.id}`);
            script.setAttribute('data-strict', '0');
            script.setAttribute('data-reactions-enabled', '1');
            script.setAttribute('data-emit-metadata', '0');
            script.setAttribute('data-input-position', 'top');
            script.setAttribute('data-theme', 'preferred_color_scheme');
            script.setAttribute('data-lang', 'zh-CN');
            script.setAttribute('data-loading', 'lazy');
            script.setAttribute('crossorigin', 'anonymous');
            script.async = true;

            container.appendChild(script);
        },
        /**
         * 视频加载完成时
         * @param {Object} data - 视频加载数据
         * @param {number} data.duration - 视频时长
         */
        onVideoLoaded({ duration }) {
            this.videoDuration = duration;
            this.cacheVideoDuration();
            // 视频加载后更新高度，使用nextTick确保DOM已更新
            this.$nextTick(() => {
                this.updateWrapperHeight();
            });
        },
        /**
         * 处理视频错误
         * @param {Event} e - 事件对象
         */
        handleVideoError(e) {
            // 只要出错，并且当前没有使用代理，就显示代理按钮
            console.warn('视频加载失败:', e.target.error);
        },
        /**
         * 加载缓存的视频时长
         */
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
        /**
         * 缓存视频时长
         */
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
        /**
         * 格式化视频时长
         * @param {number} seconds - 秒数
         * @returns {string} 格式化的时长字符串
         */
        formatDuration(seconds) {
            if (!seconds) return '00:00';
            const h = Math.floor(seconds / 3600);
            const m = Math.floor((seconds % 3600) / 60);
            const s = Math.floor(seconds % 60);
            return h ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
                : `${m}:${s.toString().padStart(2, '0')}`;
        },
        /**
         * 格式化日期
         * @param {string} dateString - 日期字符串
         * @returns {string} 格式化的日期字符串
         */
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
        /**
         * 返回首页
         */
        goBack() {
            this.$emit('back');
        },
        /**
         * 搜索标签
         * @param {string} tag - 标签内容
         */
        searchTag(tag) {
            this.$emit('search-tag', tag);
        },
        /**
         * 更新合集列表容器高度
         * 使合集列表高度与视频播放器高度保持一致
         */
        updateWrapperHeight() {
            // 查找视频元素
            const videoElement = document.querySelector('video');
            if (videoElement && videoElement.offsetHeight > 0) {
                this.wrapperHeight = videoElement.offsetHeight;
            } else {
                // 备用方案：使用视频播放器容器的高度
                const videoContainer = document.querySelector('.video-player-container');
                if (videoContainer && videoContainer.offsetHeight > 0) {
                    this.wrapperHeight = videoContainer.offsetHeight;
                } else {
                    // 最终备用：使用固定高度
                    this.wrapperHeight = 480;
                }
            }
        },
        /**
         * 加载所有视频数据
         */
        async loadAllVideos() {
            try {
                const response = await fetch('./data/video-data.json');
                if (!response.ok) throw new Error('Failed to load videos');
                const videos = await response.json();
                this.allVideos = videos;
            } catch (err) {
                console.error('加载视频数据失败:', err);
            }
        },
        /**
         * 播放视频
         * @param {string|number} videoId - 视频ID
         */
        playVideo(videoId) {
            this.$emit('play-video', videoId);
        },
        /**
         * 处理视频播放结束
         * 如果开启自动连播，播放合集中的下一个视频
         */
        async handleVideoEnded() {
            try {
                const autoPlay = localStorage.getItem('collectionAutoPlay') === 'true';
                if (!autoPlay) return;
                
                const response = await fetch('./data/合集.json');
                if (!response.ok) throw new Error('Failed to load collection data');
                const data = await response.json();
                
                // 查找包含当前视频ID的合集
                for (const coll of data['合集']) {
                    const index = coll['视频列表'].indexOf(this.video.id);
                    if (index !== -1 && index < coll['视频列表'].length - 1) {
                        // 播放下一个视频
                        const nextVideoId = coll['视频列表'][index + 1];
                        this.playVideo(nextVideoId);
                        break;
                    }
                }
            } catch (err) {
                console.error('自动连播失败:', err);
            }
        }
    }
};