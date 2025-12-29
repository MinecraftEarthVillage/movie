export default {
    template: `
        <div class="video-card" @click="$emit('video-click', video)">
            <div class="video-thumbnail">
                <img 
                    :src="thumbnail" 
                    :alt="video.title"
                    @load="onThumbnailLoad"
                    @error="handleImageError"
                    ref="thumbnailImg"
                />
                <div v-if="thumbnailLoading" class="loading-overlay">
                    <i class="fas fa-spinner fa-spin"></i>
                </div>
                <div v-if="duration" class="video-duration">{{ formatDuration(duration) }}</div>
            </div>
            <div class="video-info">
                <h3 class="video-title">{{ video.title }}</h3>
                <div class="video-meta">
                    <span class="views">
                        <i class="fas fa-eye"></i> {{ formatViews(video.views) }} 播放
                    </span>
                    <span class="date" v-if="video.date">
                        <i class="far fa-calendar"></i> {{ formatDate(video.date) }}
                    </span>
                </div>
            </div>
        </div>
    `,
    props: {
        video: {
            type: Object,
            required: true
        }
    },
    emits: ['video-click'],
    data() {
        return {
            duration: null,
            thumbnail: null,
            thumbnailLoading: false,
            durationLoaded: false,
            captureAttempts: 0,
            maxCaptureAttempts: 3
        };
    },
    mounted() {
        this.loadCachedVideoInfo();
        this.initializeThumbnail();
    },
    methods: {
        initializeThumbnail() {
            // 1. 优先使用现有的缩略图
            if (this.video.thumbnail) {
                this.thumbnail = this.video.thumbnail;
                return;
            }

            // 2. 检查缓存中的缩略图
            const cachedThumbnail = this.getCachedThumbnail();
            if (cachedThumbnail) {
                this.thumbnail = cachedThumbnail;
                return;
            }

            // 3. 如果视频路径可用，开始生成缩略图
            if (this.video.path) {
                this.generateThumbnailFromVideo();
            } else {
                // 4. 最后使用默认缩略图
                this.useDefaultThumbnail();
            }
        },

        getCachedThumbnail() {
            try {
                const videoKey = `video_${this.video.id || this.video.path}`;
                const cachedInfo = localStorage.getItem(videoKey);
                
                if (cachedInfo) {
                    const { thumbnail, lastUpdated } = JSON.parse(cachedInfo);
                    const cacheValidDuration = 7 * 24 * 60 * 60 * 1000; // 7天
                    const now = Date.now();
                    
                    if (thumbnail && lastUpdated && (now - lastUpdated) < cacheValidDuration) {
                        return thumbnail;
                    }
                }
            } catch (error) {
                console.warn('读取缩略图缓存失败:', error);
            }
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
                console.warn('生成视频缩略图失败:', error.message);
                this.useDefaultThumbnail();
            } finally {
                this.thumbnailLoading = false;
            }
        },

        captureVideoFrame() {
            return new Promise((resolve, reject) => {
                // 创建video元素
                const video = document.createElement('video');
                video.crossOrigin = 'anonymous';
                video.preload = 'metadata';
                video.muted = true;
                video.playsInline = true;

                // 设置超时
                const timeoutId = setTimeout(() => {
                    cleanup();
                    reject(new Error('视频加载超时'));
                }, 10000);

                const cleanup = () => {
                    clearTimeout(timeoutId);
                    video.removeEventListener('loadedmetadata', onLoadedMetadata);
                    video.removeEventListener('seeked', onSeeked);
                    video.removeEventListener('error', onError);
                    video.pause();
                    video.src = '';
                    video.load();
                };

                const onLoadedMetadata = () => {
                    // 设置视频时长（如果尚未设置）
                    if (!this.duration && video.duration) {
                        this.duration = video.duration;
                        this.durationLoaded = true;
                        this.cacheVideoInfo({ duration: video.duration });
                    }

                    // 尝试跳转到10%的位置，但不超过1秒
                    const targetTime = Math.min(video.duration * 0.1, 1);
                    video.currentTime = targetTime;
                };

                const onSeeked = () => {
                    // 创建canvas并绘制视频帧
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    
                    // 设置canvas尺寸（缩略图尺寸）
                    canvas.width = 320;
                    canvas.height = 180;
                    
                    try {
                        // 绘制视频帧
                        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                        
                        // 检查canvas是否被污染（跨域问题）
                        ctx.getImageData(0, 0, 1, 1);
                        
                        // 生成Base64缩略图
                        const thumbnail = canvas.toDataURL('image/jpeg', 0.7);
                        cleanup();
                        resolve(thumbnail);
                    } catch (error) {
                        cleanup();
                        reject(new Error('无法访问视频帧（跨域限制）'));
                    }
                };

                const onError = (error) => {
                    cleanup();
                    reject(error);
                };

                // 绑定事件
                video.addEventListener('loadedmetadata', onLoadedMetadata);
                video.addEventListener('seeked', onSeeked);
                video.addEventListener('error', onError);

                // 开始加载视频
                video.src = this.video.path;
            });
        },

        loadCachedVideoInfo() {
            try {
                const videoKey = `video_${this.video.id || this.video.path}`;
                const cachedInfo = localStorage.getItem(videoKey);
                
                if (cachedInfo) {
                    const { duration, lastUpdated } = JSON.parse(cachedInfo);
                    const cacheValidDuration = 7 * 24 * 60 * 60 * 1000;
                    const now = Date.now();
                    
                    if (duration && lastUpdated && (now - lastUpdated) < cacheValidDuration) {
                        this.duration = duration;
                        this.durationLoaded = true;
                    }
                }
            } catch (error) {
                console.warn('读取视频缓存失败:', error);
            }
        },

        cacheVideoInfo(info) {
            try {
                const videoKey = `video_${this.video.id || this.video.path}`;
                const cachedInfoStr = localStorage.getItem(videoKey);
                let cachedInfo = cachedInfoStr ? JSON.parse(cachedInfoStr) : {};
                
                // 更新缓存信息
                Object.assign(cachedInfo, info, { lastUpdated: Date.now() });
                
                localStorage.setItem(videoKey, JSON.stringify(cachedInfo));
            } catch (error) {
                console.warn('缓存视频信息失败:', error);
            }
        },

        useDefaultThumbnail() {
            const colors = ['#00a1d6', '#f25d8e', '#fb7299', '#ff9800', '#4caf50', '#2196f3', '#9c27b0'];
            const color = colors[Math.floor(Math.random() * colors.length)];
            const title = this.video.title || '视频标题';
            const text = title.length > 20 ? title.substring(0, 20) + '...' : title;
            
            // 创建SVG缩略图
            const svg = `
                <svg xmlns="http://www.w3.org/2000/svg" width="320" height="180" viewBox="0 0 320 180">
                    <rect width="100%" height="100%" fill="${color}"/>
                    <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="16" 
                          fill="white" text-anchor="middle" dy=".3em">${text}</text>
                    <path d="M120 80 L200 120 L120 160 Z" fill="white" opacity="0.8" transform="translate(0, -10)"/>
                </svg>`;
            
            const defaultThumbnail = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
            
            // 如果当前没有缩略图，才设置默认缩略图
            if (!this.thumbnail) {
                this.thumbnail = defaultThumbnail;
                this.cacheVideoInfo({ thumbnail: defaultThumbnail });
            }
        },

        onThumbnailLoad() {
            this.thumbnailLoading = false;
        },

        handleImageError() {
            console.log('缩略图加载失败，尝试重新生成或使用默认缩略图');
            
            // 如果还有尝试次数，重新生成缩略图
            if (this.captureAttempts < this.maxCaptureAttempts) {
                this.generateThumbnailFromVideo();
            } else {
                this.useDefaultThumbnail();
                this.thumbnailLoading = false;
            }
        },

        formatDuration(seconds) {
            if (!seconds) return '00:00';
            
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            const secs = Math.floor(seconds % 60);
            
            if (hours > 0) {
                return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
            } else {
                return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
            }
        },

        formatViews(views) {
            if (!views) return 0;
            
            if (views >= 10000) {
                return (views / 10000).toFixed(1) + '万';
            } else if (views >= 1000) {
                return (views / 1000).toFixed(1) + '千';
            }
            return views;
        },

        formatDate(dateString) {
            if (!dateString) return '';
            
            try {
                const date = new Date(dateString);
                if (isNaN(date.getTime())) return dateString;
                
                const now = new Date();
                const diffTime = Math.abs(now - date);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                
                if (diffDays === 1) return '昨天';
                if (diffDays <= 7) return `${diffDays}天前`;
                if (diffDays <= 30) return `${Math.floor(diffDays / 7)}周前`;
                if (diffDays <= 365) return `${Math.floor(diffDays / 30)}个月前`;
                return `${Math.floor(diffDays / 365)}年前`;
            } catch (error) {
                return dateString;
            }
        }
    }
};