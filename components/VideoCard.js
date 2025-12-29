export default {
    template: `
        <div class="video-card" @click="$emit('video-click', video)">
            <div class="video-thumbnail">
                <img 
                    :src="video.thumbnail" 
                    :alt="video.title"
                    @error="handleImageError"
                />
                <div class="video-duration">{{ video.duration }}</div>
            </div>
            <div class="video-info">
                <h3 class="video-title">{{ video.title }}</h3>
                <div class="video-meta">
                    <span class="views">
                        <i class="fas fa-eye"></i> {{ formatViews(video.views) }} 播放
                    </span>
                    <span class="date">
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
    methods: {
        handleImageError(event) {
            // 如果缩略图加载失败，使用默认图片
            const colors = ['#00a1d6', '#f25d8e', '#fb7299', '#ff9800', '#4caf50'];
            const color = colors[Math.floor(Math.random() * colors.length)];
            event.target.src = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180" viewBox="0 0 320 180"><rect width="100%" height="100%" fill="${color}"/><text x="50%" y="50%" font-family="Arial" font-size="16" fill="white" text-anchor="middle" dy=".3em">${this.video.title}</text></svg>`;
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