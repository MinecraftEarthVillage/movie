export default {
    template: `
        <div v-if="show" class="modal-overlay" >
            <div class="video-modal">
                <button class="close-modal" @click="close" aria-label="关闭">
                    <i class="fas fa-times"></i>
                </button>
                
                <div class="modal-content">
                    <div class="video-player">
                        <video 
                            :src="video.path" 
                            controls
                            :poster="video.thumbnail"
                            ref="videoPlayer"
                            @play="handlePlay"
                            @pause="handlePause"
                            @ended="handleEnded"
                        ></video>
                    </div>
                    
                    <div class="video-details">
                        <h2>{{ video.title }}</h2>
                        
                        <div class="video-meta">
                            <span class="views">
                                <i class="fas fa-eye"></i> {{ formatViews(video.views) }} 次播放
                            </span>
                            <span class="date">
                                <i class="far fa-calendar"></i> {{ formatDate(video.date) }}
                            </span>
                            <span class="duration">
                                <i class="far fa-clock"></i> {{ video.duration }}
                            </span>
                        </div>
                        
                        <div class="video-tags" v-if="video.tags && video.tags.length > 0">
                            <span 
                                v-for="tag in video.tags" 
                                :key="tag"
                                class="tag"
                                @click="searchByTag(tag)"
                            >
                                {{ tag }}
                            </span>
                        </div>
                        
                        <div class="video-description" v-if="video.description">
                            <h4>视频简介</h4>
                            <p>{{ video.description }}</p>
                        </div>
                        
                        <div class="video-actions" v-if="showActions">
                            <button class="action-btn" @click="handleShare">
                                <i class="fas fa-share"></i> 分享
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `,
    props: {
        show: {
            type: Boolean,
            default: false
        },
        video: {
            type: Object,
            default: () => ({})
        }
    },
    emits: ['close', 'play', 'pause', 'ended', 'share', 'search-tag'],
    data() {
        return {
            showActions: true
        };
    },
    methods: {
        close() {
            this.$emit('close');
        },
        handlePlay() {
            this.$emit('play', this.video);
        },
        handlePause() {
            this.$emit('pause', this.video);
        },
        handleEnded() {
            this.$emit('ended', this.video);
        },
        handleShare() {
            const shareUrl = window.location.origin + window.location.pathname + '?video=' + this.video.id;
            if (navigator.share) {
                navigator.share({
                    title: this.video.title,
                    text: this.video.description || '看看这个视频',
                    url: shareUrl
                });
            } else {
                // 回退方案：复制链接到剪贴板
                navigator.clipboard.writeText(shareUrl).then(() => {
                    alert('链接已复制到剪贴板！');
                });
            }
            this.$emit('share', this.video);
        },
        searchByTag(tag) {
            this.$emit('search-tag', tag);
        },
        
        stopVideo() {
            if (this.$refs.videoPlayer) {
                this.$refs.videoPlayer.pause();
                this.$refs.videoPlayer.currentTime = 0;
            }
        },
        formatViews(views) {
            if (views >= 10000) {
                return (views / 10000).toFixed(1) + '万';
            }
            return views;
        },
        formatDate(dateString) {
            const date = new Date(dateString);
            const now = new Date();
            const diffTime = Math.abs(now - date);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays === 1) return '昨天';
            if (diffDays <= 7) return `${diffDays}天前`;
            if (diffDays <= 30) return `${Math.floor(diffDays / 7)}周前`;
            if (diffDays <= 365) return `${Math.floor(diffDays / 30)}个月前`;
            return `${Math.floor(diffDays / 365)}年前`;
        }
    }
};