/**
 * CollectionList 组件
 * 功能用途：显示视频合集列表，支持视频切换、自动连播设置和合集简介查看
 * 
 * 核心逻辑：
 * 1. 根据当前视频ID加载对应的合集数据
 * 2. 显示合集中的视频列表，标记当前播放的视频
 * 3. 支持移动端折叠/展开视图
 * 4. 提供视频时长显示和自动连播设置
 * 5. 支持查看合集简介
 * 
 * 关键参数：
 * - currentVideoId: 当前播放的视频ID（必需）
 * - videos: 视频数据数组（必需）
 * - wrapperHeight: 容器高度（可选，默认为0）
 * 
 * 事件：
 * - play-video: 点击视频项时触发，传递视频ID
 * - collection-loaded: 合集数据加载完成时触发
 * 
 * 使用场景示例：
 * <CollectionList 
 *   :currentVideoId="currentVideoId" 
 *   :videos="videos" 
 *   :wrapperHeight="300"
 *   @play-video="handlePlayVideo"
 *   @collection-loaded="handleCollectionLoaded"
 * />
 * 
 * 重要注意事项：
 * 1. 组件会自动从 localStorage 缓存视频时长和自动连播设置
 * 2. 视频时长加载采用异步方式，避免阻塞页面渲染
 * 3. 移动端视图会自动折叠，点击头部可展开/收起
 */
export default {
    template: `
        <div v-if="collection" class="collection-container">
            <!-- 移动端折叠视图 -->
            <div class="collection-mobile-header" @click="toggleExpand" v-if="isMobilePortrait">
                <span class="collection-mobile-title">合集 · {{ collection['名'] }}</span>
                <span class="collection-mobile-episode">{{ currentIndex + 1 }}/{{ collection['视频列表'].length }}</span>
                <i class="fas" :class="isExpanded ? 'fa-chevron-up' : 'fa-chevron-down'"></i>
            </div>
            
            <!-- 完整合集列表 -->
            <div class="collection-list" :class="{ 'expanded': isExpanded }" :style="{ height: isMobilePortrait ? 'auto' : wrapperHeight + 'px' }">
                <div class="collection-header">
                    <h3 class="collection-title">{{ collection['名'] }} ({{ currentIndex + 1 }}/{{ collection['视频列表'].length }})</h3>
                    <div class="auto-play-toggle">
                        <span>自动连播</span>
                        <label class="toggle-switch">
                            <input type="checkbox" v-model="autoPlay" @change="saveAutoPlaySetting">
                            <span class="toggle-slider"></span>
                        </label>
                    </div>
                </div>
                <div class="collection-description-container">
                    <button class="description-toggle" @mouseover="showDescription = true" @mouseout="onDescriptionMouseOut">
                        <i class="fas fa-eye"></i> 简介
                    </button>
                    <div class="description-popup" v-if="showDescription" @mouseover="showDescription = true" @mouseout="onDescriptionMouseOut">
                        <p>{{ collection['简介'] }}</p>
                    </div>
                </div>
                <div class="collection-videos">
                    <div 
                        v-for="(videoId, index) in collection['视频列表']" 
                        :key="videoId"
                        class="collection-video-item"
                        :class="{ active: videoId === currentVideoId }"
                        @click="playVideo(videoId)"
                    >
                        <span class="video-title">{{ getVideoTitle(videoId) }}</span>
                        <span class="video-duration">{{ getVideoDuration(videoId) }}</span>
                    </div>
                </div>
            </div>
        </div>
    `,
    props: {
        // 当前播放的视频ID，必需参数
        currentVideoId: { type: String, required: true },
        // 视频数据数组，包含所有视频的信息
        videos: { type: Array, required: true },
        // 容器高度，用于非移动端视图
        wrapperHeight: { type: Number, default: 0 }
    },
    emits: ['play-video', 'collection-loaded'],
    data() {
        return {
            // 当前加载的合集数据
            collection: null,
            // 当前视频在合集中的索引
            currentIndex: 0,
            // 是否开启自动连播
            autoPlay: false,
            // 是否显示合集简介
            showDescription: false,
            // 移动端视图是否展开
            isExpanded: false,
            // 视频时长缓存
            durations: {}
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
    mounted() {
        // 组件挂载时加载合集数据和自动连播设置
        this.loadCollectionData();
        this.loadAutoPlaySetting();
    },
    watch: {
        /**
         * 监听当前视频ID变化
         * 当视频ID变化时，更新当前索引或重新加载合集数据
         */
        currentVideoId: {
            handler(newVideoId) {
                // 当当前视频ID变化时，更新currentIndex
                if (this.collection) {
                    const index = this.collection['视频列表'].indexOf(newVideoId);
                    if (index !== -1) {
                        this.currentIndex = index;
                    }
                } else {
                    // 如果collection还没有加载，重新加载
                    this.loadCollectionData();
                }
            }
        },
        /**
         * 监听视频数据变化
         * 当视频数据加载完成后，加载所有视频时长
         */
        videos: {
            handler(newVideos) {
                if (this.collection && newVideos.length > 0) {
                    this.loadAllDurations();
                }
            },
            immediate: true
        }
    },
    methods: {
        /**
         * 加载合集数据
         * 从本地JSON文件中获取合集数据，并找到包含当前视频的合集
         */
        async loadCollectionData() {
            try {
                const response = await fetch('./data/合集.json');
                if (!response.ok) throw new Error('Failed to load collection data');
                const data = await response.json();
                
                // 查找包含当前视频ID的合集
                for (const coll of data['合集']) {
                    const index = coll['视频列表'].indexOf(this.currentVideoId);
                    if (index !== -1) {
                        this.collection = coll;
                        this.currentIndex = index;
                        // 合集数据加载完成后触发事件
                        this.$emit('collection-loaded');
                        // 加载所有视频时长
                        this.loadAllDurations();
                        break;
                    }
                }
            } catch (err) {
                console.error('加载合集数据失败:', err);
            }
        },
        /**
         * 获取视频路径
         * @param {string} videoId - 视频ID
         * @returns {string} 视频路径
         */
        getVideoPath(videoId) {
            const video = this.videos.find(v => String(v.id) === String(videoId));
            return video ? video.path : '';
        },
        /**
         * 清理视频元素
         * @param {HTMLVideoElement} video - 视频元素
         */
        cleanupVideo(video) {
            video.src = '';
            video.load();
            if (video.parentNode) video.parentNode.removeChild(video);
        },
        /**
         * 获取视频时长
         * 通过创建临时视频元素加载元数据来获取时长，并缓存到localStorage
         * @param {string} videoId - 视频ID
         * @returns {Promise<number|null>} 视频时长（秒）或null
         */
        async fetchDuration(videoId) {
            const key = `video_${videoId}`;
            if (localStorage.getItem(key)) return;
            
            const videoPath = this.getVideoPath(videoId);
            if (!videoPath) {
                console.warn(`视频 ${videoId} 的路径不存在，跳过加载`);
                return;
            }
            
            const video = document.createElement('video');
            video.preload = 'metadata';
            video.src = videoPath;
            video.style.display = 'none';
            document.body.appendChild(video);
            
            return new Promise(resolve => {
                const timeout = setTimeout(() => {
                    console.warn(`加载视频 ${videoId} 元数据超时`);
                    this.cleanupVideo(video);
                    resolve(null);
                }, 10000);
                
                video.onloadedmetadata = () => {
                    clearTimeout(timeout);
                    const duration = video.duration;
                    if (duration) {
                        localStorage.setItem(key, JSON.stringify({ 
                            duration, 
                            lastUpdated: Date.now() 
                        }));
                        this.durations[videoId] = duration;
                    }
                    this.cleanupVideo(video);
                    resolve(duration);
                };
                
                video.onerror = () => {
                    clearTimeout(timeout);
                    this.cleanupVideo(video);
                    resolve(null);
                };
            });
        },
        /**
         * 加载所有视频时长
         * 遍历合集中的所有视频，获取并缓存时长
         */
        async loadAllDurations() {
            if (!this.collection || !this.collection['视频列表']) return;
            
            for (const videoId of this.collection['视频列表']) {
                this.fetchDuration(videoId);
            }
        },
        /**
         * 加载自动连播设置
         * 从localStorage中读取自动连播设置
         */
        loadAutoPlaySetting() {
            try {
                const setting = localStorage.getItem('collectionAutoPlay');
                if (setting !== null) {
                    this.autoPlay = setting === 'true';
                }
            } catch (e) {
                console.error('读取自动连播设置失败:', e);
            }
        },
        /**
         * 保存自动连播设置
         * 将自动连播设置保存到localStorage
         */
        saveAutoPlaySetting() {
            try {
                localStorage.setItem('collectionAutoPlay', this.autoPlay);
            } catch (e) {
                console.error('保存自动连播设置失败:', e);
            }
        },
        /**
         * 获取视频标题
         * @param {string} videoId - 视频ID
         * @returns {string} 视频标题
         */
        getVideoTitle(videoId) {
            const video = this.videos.find(v => String(v.id) === String(videoId));
            return video ? video.title : `视频 ${videoId}`;
        },
        /**
         * 获取视频时长（格式化）
         * 优先从响应式对象中获取，其次从localStorage中获取
         * @param {string} videoId - 视频ID
         * @returns {string} 格式化的视频时长（HH:MM:SS 或 MM:SS）
         */
        getVideoDuration(videoId) {
            // 优先从响应式对象中获取时长
            if (this.durations[videoId]) {
                const duration = this.durations[videoId];
                const h = Math.floor(duration / 3600);
                const m = Math.floor((duration % 3600) / 60);
                const s = Math.floor(duration % 60);
                return h ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
                    : `${m}:${s.toString().padStart(2, '0')}`;
            }
            
            // 从localStorage中获取视频时长
            try {
                const key = `video_${videoId}`;
                const cached = localStorage.getItem(key);
                if (cached) {
                    const { duration } = JSON.parse(cached);
                    if (duration) {
                        // 同时更新到响应式对象中
                        this.durations[videoId] = duration;
                        const h = Math.floor(duration / 3600);
                        const m = Math.floor((duration % 3600) / 60);
                        const s = Math.floor(duration % 60);
                        return h ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
                            : `${m}:${s.toString().padStart(2, '0')}`;
                    }
                }
            } catch (e) {
                console.error('读取视频时长失败:', e);
            }
            return '00:00';
        },
        /**
         * 播放视频
         * 触发play-video事件，传递视频ID
         * @param {string} videoId - 视频ID
         */
        playVideo(videoId) {
            this.$emit('play-video', videoId);
        },
        /**
         * 处理简介鼠标移出事件
         * 当鼠标离开按钮或弹窗时，隐藏简介
         * @param {MouseEvent} event - 鼠标事件
         */
        onDescriptionMouseOut(event) {
            // 检查鼠标是否离开了按钮或弹窗
            const button = event.currentTarget;
            const popup = button.nextElementSibling;
            if (!button.contains(event.relatedTarget) && (!popup || !popup.contains(event.relatedTarget))) {
                this.showDescription = false;
            }
        },
        /**
         * 切换移动端视图展开/收起状态
         */
        toggleExpand() {
            this.isExpanded = !this.isExpanded;
        }
    }
};