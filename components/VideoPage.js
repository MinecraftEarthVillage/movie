// components/VideoPage.js
export default {
    template: `
        <div class="video-page">
            <button class="back-home-btn" @click="goBack">
                <i class="fas fa-arrow-left"></i> 返回首页
            </button>
            <div class="video-player-container">
                <video 
                    :src="video.path" 
                    controls
                    :poster="thumbnail"
                    ref="videoPlayer"
                    @loadedmetadata="onVideoLoaded"
                    autoplay
                ></video>
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
                    <p>{{ video.description }}</p>
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
            thumbnail: this.video.thumbnail || ''
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
        },
        loadCachedDuration() {
            try {
                const key = `video_${this.video.id || this.video.path}`;
                const cached = localStorage.getItem(key);
                if (cached) {
                    const { duration } = JSON.parse(cached);
                    this.videoDuration = duration;
                }
            } catch (e) {}
        },
        cacheVideoDuration() {
            if (!this.videoDuration) return;
            try {
                const key = `video_${this.video.id || this.video.path}`;
                const cached = JSON.parse(localStorage.getItem(key) || '{}');
                cached.duration = this.videoDuration;
                cached.lastUpdated = Date.now();
                localStorage.setItem(key, JSON.stringify(cached));
            } catch (e) {}
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
            if (isNaN(date.getTime())) return dateString;
            const diff = Math.ceil((Date.now() - date) / (1000 * 60 * 60 * 24));
            if (diff === 1) return '昨天';
            if (diff <= 7) return `${diff}天前`;
            if (diff <= 30) return `${Math.floor(diff / 7)}周前`;
            if (diff <= 365) return `${Math.floor(diff / 30)}个月前`;
            return `${Math.floor(diff / 365)}年前`;
        },
        goBack() {
            this.$emit('back');
        },
        searchTag(tag) {
            this.$emit('search-tag', tag);
        }
    }
};