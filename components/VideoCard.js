// components/VideoCard.js
export default {
    template: `
        <div class="video-card" @click="goToVideoPage">
            <div class="video-thumbnail">
                <img 
                    :src="thumbnail" 
                    :alt="video.title"
                    @error="handleImageError"
                />
                <div v-if="duration" class="video-duration">{{ formatDuration(duration) }}</div>
            </div>
            <div class="video-info">
                <h3 class="video-title">{{ video.title }}</h3>
                <div class="video-meta">
                    <span class="date" v-if="video.date">
                        <i class="far fa-calendar"></i> {{ formatDate(video.date) }}
                    </span>
                </div>
            </div>
        </div>
    `,
    props: {
        video: { type: Object, required: true }
    },
    data() {
        return {
            duration: null,
            thumbnail: null,
            thumbnailLoading: false,
            captureAttempts: 0,
            maxCaptureAttempts: 3
        };
    },
    mounted() {
        this.loadCachedVideoInfo();
        this.initializeThumbnail();
    },
    methods: {
        // 直接跳转（刷新页面，实现独立URL）
        goToVideoPage() {
            window.open(`?video=${this.video.id}`, '_blank');
        },
        // ---------- 缩略图生成逻辑（与之前完全相同）----------
        initializeThumbnail() {
            if (this.video.thumbnail) {
                this.thumbnail = this.video.thumbnail;
                return;
            }
            const cached = this.getCachedThumbnail();
            if (cached) {
                this.thumbnail = cached;
                return;
            }
            if (this.video.path) {
                this.generateThumbnailFromVideo();
            } else {
                this.useDefaultThumbnail();
            }
        },
        getCachedThumbnail() {
            try {
                const key = `video_${this.video.id || this.video.path}`;
                const cached = localStorage.getItem(key);
                if (cached) {
                    const { thumbnail, lastUpdated } = JSON.parse(cached);
                    if (thumbnail && lastUpdated && (Date.now() - lastUpdated) < 7 * 24 * 60 * 60 * 1000) {
                        return thumbnail;
                    }
                }
            } catch (e) {}
            return null;
        },
        async generateThumbnailFromVideo() {
            if (this.captureAttempts >= this.maxCaptureAttempts) {
                this.useDefaultThumbnail();
                return;
            }
            this.thumbnailLoading = true;
            this.captureAttempts++;
            try {
                const thumbnail = await this.captureVideoFrame();
                if (thumbnail) {
                    this.thumbnail = thumbnail;
                    this.cacheVideoInfo({ thumbnail });
                } else {
                    this.useDefaultThumbnail();
                }
            } catch (error) {
                console.warn('生成缩略图失败:', error.message);
                this.useDefaultThumbnail();
            } finally {
                this.thumbnailLoading = false;
            }
        },
        captureVideoFrame() {
            return new Promise((resolve, reject) => {
                const video = document.createElement('video');
                video.crossOrigin = 'anonymous';
                video.preload = 'metadata';
                video.muted = true;
                video.playsInline = true;

                const timeout = setTimeout(() => {
                    cleanup();
                    reject(new Error('超时'));
                }, 10000);

                const cleanup = () => {
                    clearTimeout(timeout);
                    video.removeEventListener('loadedmetadata', onLoadedMetadata);
                    video.removeEventListener('seeked', onSeeked);
                    video.removeEventListener('error', onError);
                    video.pause();
                    video.src = '';
                    video.load();
                };

                const onLoadedMetadata = () => {
                    if (!this.duration && video.duration) {
                        this.duration = video.duration;
                        this.cacheVideoInfo({ duration: video.duration });
                    }
                    video.currentTime = Math.min(video.duration * 0.1, 10);
                };

                const onSeeked = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = 320;
                    canvas.height = 180;
                    const ctx = canvas.getContext('2d');
                    try {
                        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                        ctx.getImageData(0, 0, 1, 1);
                        const thumb = canvas.toDataURL('image/jpeg', 0.7);
                        cleanup();
                        resolve(thumb);
                    } catch (err) {
                        cleanup();
                        reject(new Error('跨域限制'));
                    }
                };

                const onError = (err) => {
                    cleanup();
                    reject(err);
                };

                video.addEventListener('loadedmetadata', onLoadedMetadata);
                video.addEventListener('seeked', onSeeked);
                video.addEventListener('error', onError);
                video.src = this.video.path;
            });
        },
        loadCachedVideoInfo() {
            try {
                const key = `video_${this.video.id || this.video.path}`;
                const cached = localStorage.getItem(key);
                if (cached) {
                    const { duration, lastUpdated } = JSON.parse(cached);
                    if (duration && lastUpdated && (Date.now() - lastUpdated) < 7 * 24 * 60 * 60 * 1000) {
                        this.duration = duration;
                    }
                }
            } catch (e) {}
        },
        cacheVideoInfo(info) {
            try {
                const key = `video_${this.video.id || this.video.path}`;
                const cached = JSON.parse(localStorage.getItem(key) || '{}');
                Object.assign(cached, info, { lastUpdated: Date.now() });
                localStorage.setItem(key, JSON.stringify(cached));
            } catch (e) {}
        },
        useDefaultThumbnail() {
            if (this.thumbnail) return;
            const colors = ['#00a1d6', '#f25d8e', '#fb7299', '#ff9800', '#4caf50', '#2196f3', '#9c27b0'];
            const color = colors[Math.floor(Math.random() * colors.length)];
            const text = (this.video.title || '视频').length > 20 ? this.video.title.substring(0, 20) + '...' : (this.video.title || '视频');
            const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180"><rect width="100%" height="100%" fill="${color}"/><text x="50%" y="50%" font-family="Arial" font-size="16" fill="white" text-anchor="middle" dy=".3em">${text}</text><path d="M120 80 L200 120 L120 160 Z" fill="white" opacity="0.8"/></svg>`;
            this.thumbnail = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
        },
        handleImageError() {
            if (this.captureAttempts < this.maxCaptureAttempts) {
                this.generateThumbnailFromVideo();
            } else {
                this.useDefaultThumbnail();
                this.thumbnailLoading = false;
            }
        },
        formatDuration(seconds) {
            if (!seconds) return '00:00';
            const h = Math.floor(seconds / 3600);
            const m = Math.floor((seconds % 3600) / 60);
            const s = Math.floor(seconds % 60);
            return h ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}` : `${m}:${s.toString().padStart(2, '0')}`;
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
        }
    }
};