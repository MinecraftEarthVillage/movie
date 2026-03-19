export default {
    template: `
        <div class="collection-list" v-if="collection" :style="{ height: wrapperHeight + 'px' }">
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
            showDescription: false
        };
    },
    mounted() {
        this.loadCollectionData();
        this.loadAutoPlaySetting();
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
                        break;
                    }
                }
            } catch (err) {
                console.error('加载合集数据失败:', err);
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
            const video = this.videos.find(v => String(v.id) === String(videoId));
            if (!video || !video.duration) return '00:00';
            
            const seconds = video.duration;
            const h = Math.floor(seconds / 3600);
            const m = Math.floor((seconds % 3600) / 60);
            const s = Math.floor(seconds % 60);
            return h ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
                : `${m}:${s.toString().padStart(2, '0')}`;
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
        }
    }
};