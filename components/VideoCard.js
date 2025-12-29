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
                <div v-if="loading" class="loading-overlay">
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
            
            <!-- 隐藏的 video 元素用于获取视频时长 -->
            <video 
                v-if="!durationLoaded && video.path"
                :src="video.path"
                preload="metadata"
                @loadedmetadata="onVideoMetadataLoaded"
                @error="onVideoLoadError"
                ref="videoElement"
                crossorigin="anonymous"
                style="display: none;"
            ></video>
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
            thumbnail: this.getThumbnail(),
            loading: false,
            durationLoaded: false,
            attempts: 0
        };
    },
    mounted() {
        // 尝试从缓存加载视频信息
        this.loadCachedVideoInfo();
        
        // 如果没有缩略图，尝试生成
        if (!this.thumbnail) {
            this.loading = true;
        }
    },
    methods: {
        getThumbnail() {
            // 如果有现成的缩略图，直接使用
            if (this.video.thumbnail) {
                return this.video.thumbnail;
            }
            
            // 尝试从缓存获取
            const videoKey = `video_${this.video.id || this.video.path}`;
            const cachedInfo = localStorage.getItem(videoKey);
            
            if (cachedInfo) {
                try {
                    const { thumbnail, lastUpdated } = JSON.parse(cachedInfo);
                    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
                    
                    if (thumbnail && lastUpdated > oneWeekAgo) {
                        return thumbnail;
                    }
                } catch (error) {
                    console.warn('读取缩略图缓存失败:', error);
                }
            }
            
            // 使用默认的SVG占位符
            return this.generateDefaultThumbnail();
        },
        
        async loadCachedVideoInfo() {
            try {
                const videoKey = `video_${this.video.id || this.video.path}`;
                const cachedInfo = localStorage.getItem(videoKey);
                
                if (cachedInfo) {
                    const { duration, lastUpdated } = JSON.parse(cachedInfo);
                    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
                    
                    if (duration && lastUpdated > oneWeekAgo) {
                        this.duration = duration;
                        this.durationLoaded = true;
                        return;
                    }
                }
            } catch (error) {
                console.warn('读取视频缓存失败:', error);
            }
            
            // 如果没有缓存，将等待视频元素加载
        },
        
        onVideoMetadataLoaded(event) {
            const video = event.target;
            
            if (video.duration && video.duration > 0) {
                this.duration = video.duration;
                this.durationLoaded = true;
                
                // 缓存视频时长
                this.cacheVideoInfo();
                
                // 尝试生成缩略图（如果还没有）
                if (!this.video.thumbnail && this.attempts < 3) {
                    this.generateThumbnail();
                }
            }
            
            // 清理视频元素
            this.cleanupVideoElement();
        },
        
        async generateThumbnail() {
            this.attempts++;
            
            // 如果视频是跨域的，我们不能使用Canvas生成缩略图
            // 尝试使用更简单的方法：创建一个临时的video元素
            try {
                const video = document.createElement('video');
                video.crossOrigin = 'anonymous';
                video.preload = 'metadata';
                
                // 设置超时
                const timeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => reject(new Error('超时')), 5000);
                });
                
                const loadPromise = new Promise((resolve, reject) => {
                    video.onloadeddata = () => {
                        video.currentTime = Math.min(video.duration * 0.1, 1);
                        resolve();
                    };
                    video.onerror = reject;
                });
                
                video.src = this.video.path;
                
                // 等待视频加载
                await Promise.race([loadPromise, timeoutPromise]);
                
                // 等待视频跳转到指定位置
                await new Promise(resolve => {
                    video.onseeked = resolve;
                    setTimeout(resolve, 1000);
                });
                
                // 尝试通过Canvas生成缩略图
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = 320;
                canvas.height = 180;
                
                // 注意：跨域视频可能会抛出安全错误
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                
                // 检查Canvas是否被污染
                try {
                    const imageData = ctx.getImageData(0, 0, 1, 1);
                    if (imageData) {
                        const thumbnail = canvas.toDataURL('image/jpeg', 0.7);
                        this.thumbnail = thumbnail;
                        this.cacheThumbnail(thumbnail);
                    }
                } catch (error) {
                    // Canvas被污染，不能使用
                    console.log('Canvas被污染，无法生成缩略图');
                    this.useDefaultThumbnail();
                }
                
            } catch (error) {
                console.warn('生成缩略图失败:', error.message);
                this.useDefaultThumbnail();
            } finally {
                this.loading = false;
            }
        },
        
        cacheVideoInfo() {
            try {
                const videoKey = `video_${this.video.id || this.video.path}`;
                const cachedInfoStr = localStorage.getItem(videoKey);
                let cachedInfo = {};
                
                if (cachedInfoStr) {
                    cachedInfo = JSON.parse(cachedInfoStr);
                }
                
                cachedInfo.duration = this.duration;
                cachedInfo.lastUpdated = Date.now();
                
                localStorage.setItem(videoKey, JSON.stringify(cachedInfo));
            } catch (error) {
                console.warn('缓存视频信息失败:', error);
            }
        },
        
        cacheThumbnail(thumbnail) {
            try {
                const videoKey = `video_${this.video.id || this.video.path}`;
                const cachedInfoStr = localStorage.getItem(videoKey);
                let cachedInfo = {};
                
                if (cachedInfoStr) {
                    cachedInfo = JSON.parse(cachedInfoStr);
                }
                
                cachedInfo.thumbnail = thumbnail;
                cachedInfo.lastUpdated = Date.now();
                
                localStorage.setItem(videoKey, JSON.stringify(cachedInfo));
            } catch (error) {
                console.warn('缓存缩略图失败:', error);
            }
        },
        
        generateDefaultThumbnail() {
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
                </svg>`;
            
            return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
        },
        
        useDefaultThumbnail() {
            this.thumbnail = this.generateDefaultThumbnail();
            this.cacheThumbnail(this.thumbnail);
        },
        
        cleanupVideoElement() {
            if (this.$refs.videoElement) {
                const video = this.$refs.videoElement;
                video.pause();
                video.src = '';
                video.load();
            }
        },
        
        onThumbnailLoad() {
            this.loading = false;
        },
        
        handleImageError() {
            console.log('缩略图加载失败，使用默认缩略图');
            this.useDefaultThumbnail();
            this.loading = false;
        },
        
        onVideoLoadError(error) {
            console.warn('加载视频元数据失败:', error);
            this.loading = false;
            this.durationLoaded = true;
        },
        
        formatDuration(seconds) {
            if (!seconds) return '00:00';
            
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            const secs = Math.floor(seconds % 60);
            
            if (hours > 0) {
                return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
            } else {
                return `${minutes}:${secs.toString().padStart(2, '0')}`;
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
    },
    
    beforeUnmount() {
        this.cleanupVideoElement();
    }
};