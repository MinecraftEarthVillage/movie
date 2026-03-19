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
        currentVideoId: { type: String, required: true },
        videos: { type: Array, required: true },
        wrapperHeight: { type: Number, default: 0 }
    },
    emits: ['play-video', 'collection-loaded'],
    data() {
        return {
            collection: null,
            currentIndex: 0,
            autoPlay: false,
            showDescription: false,
            isExpanded: false,
            durations: {}
        };
    },
    computed: {
        isMobilePortrait() {
            return window.innerWidth < 768 && window.innerHeight > window.innerWidth;
        }
    },
    mounted() {
        this.loadCollectionData();
        this.loadAutoPlaySetting();
    },
    watch: {
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
        getVideoPath(videoId) {
            const video = this.videos.find(v => String(v.id) === String(videoId));
            return video ? video.path : '';
        },
        cleanupVideo(video) {
            video.src = '';
            video.load();
            if (video.parentNode) video.parentNode.removeChild(video);
        },
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
        async loadAllDurations() {
            if (!this.collection || !this.collection['视频列表']) return;
            
            for (const videoId of this.collection['视频列表']) {
                this.fetchDuration(videoId);
            }
        },
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
        saveAutoPlaySetting() {
            try {
                localStorage.setItem('collectionAutoPlay', this.autoPlay);
            } catch (e) {
                console.error('保存自动连播设置失败:', e);
            }
        },
        getVideoTitle(videoId) {
            const video = this.videos.find(v => String(v.id) === String(videoId));
            return video ? video.title : `视频 ${videoId}`;
        },
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
        playVideo(videoId) {
            this.$emit('play-video', videoId);
        },
        onDescriptionMouseOut(event) {
            // 检查鼠标是否离开了按钮或弹窗
            const button = event.currentTarget;
            const popup = button.nextElementSibling;
            if (!button.contains(event.relatedTarget) && (!popup || !popup.contains(event.relatedTarget))) {
                this.showDescription = false;
            }
        },
        toggleExpand() {
            this.isExpanded = !this.isExpanded;
        }
    }
};