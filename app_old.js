// 导入组件
const { createApp, ref, computed, onMounted, onUnmounted } = Vue;

// 搜索栏组件
const SearchBar = {
    template: `
        <div class="search-container">
            <i class="fas fa-search search-icon"></i>
            <input 
                type="text" 
                class="search-box" 
                placeholder="搜索视频标题、简介或标签..."
                :value="searchQuery"
                @input="$emit('update:searchQuery', $event.target.value)"
                @keyup.enter="$emit('search')"
            />
            <button 
                v-if="searchQuery" 
                @click="$emit('clear')"
                class="search-clear"
            >
                <i class="fas fa-times"></i>
            </button>
        </div>
    `,
    props: ['searchQuery'],
    emits: ['update:searchQuery', 'search', 'clear']
};

// 视频卡片组件
const VideoCard = {
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
                        <i class="fas fa-eye"></i> {{ video.views }} 播放
                    </span>
                    <span class="date">
                        <i class="far fa-calendar"></i> {{ video.date }}
                    </span>
                </div>
            </div>
        </div>
    `,
    props: ['video'],
    emits: ['video-click'],
    methods: {
        handleImageError(event) {
            // 如果缩略图加载失败，使用默认图片
            event.target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180" viewBox="0 0 320 180"><rect width="100%" height="100%" fill="%23333"/><text x="50%" y="50%" font-family="Arial" font-size="16" fill="white" text-anchor="middle" dy=".3em">视频缩略图</text></svg>';
        }
    }
};

// 分区导航组件
const CategoryNav = {
    template: `
        <nav class="category-nav">
            <ul>
                <li 
                    v-for="category in categories" 
                    :key="category.id"
                    :class="['category-item', { active: category.id === currentCategory.id }]"
                    @click="$emit('category-change', category)"
                >
                    {{ category.name }}
                </li>
            </ul>
        </nav>
    `,
    props: ['categories', 'currentCategory'],
    emits: ['category-change']
};

// 投稿按钮组件
const UploadButton = {
    template: `
        <button class="upload-btn" @click="$emit('upload-click')">
            <i class="fas fa-upload"></i> 投稿
        </button>
    `,
    emits: ['upload-click']
};

// 主应用
createApp({
    components: {
        SearchBar,
        VideoCard,
        CategoryNav,
        UploadButton
    },
    setup() {
        // 响应式数据
        const videos = ref([]);
        const categories = ref([]);
        const currentCategory = ref({});
        const searchQuery = ref('');
        const selectedVideo = ref(null);
        const showScrollTop = ref(false);
        const currentPage = ref(1);
        const videosPerPage = ref(12);
        
        // 计算属性
        const filteredVideos = computed(() => {
            let filtered = videos.value;
            
            // 按分区筛选
            if (currentCategory.value.id !== 'all') {
                filtered = filtered.filter(video => 
                    video.category === currentCategory.value.id
                );
            }
            
            // 按搜索词筛选
            if (searchQuery.value) {
                const query = searchQuery.value.toLowerCase();
                filtered = filtered.filter(video => 
                    video.title.toLowerCase().includes(query) ||
                    video.description.toLowerCase().includes(query) ||
                    video.tags.some(tag => tag.toLowerCase().includes(query))
                );
            }
            
            return filtered;
        });
        
        const totalPages = computed(() => {
            return Math.ceil(filteredVideos.value.length / videosPerPage.value);
        });
        
        const paginatedVideos = computed(() => {
            const start = (currentPage.value - 1) * videosPerPage.value;
            const end = start + videosPerPage.value;
            return filteredVideos.value.slice(start, end);
        });
        
        // 方法
        const loadVideos = async () => {
            try {
                // 这里应该从服务器获取视频数据
                // 模拟从静态JSON文件加载
                const response = await fetch('./data/video-data.json');
                videos.value = await response.json();
                
                // 模拟缩略图
                videos.value.forEach(video => {
                    if (!video.thumbnail) {
                        // 为每个视频生成一个随机的颜色作为占位符
                        const colors = ['#00a1d6', '#f25d8e', '#fb7299', '#ff9800', '#4caf50'];
                        const color = colors[Math.floor(Math.random() * colors.length)];
                        video.thumbnail = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180" viewBox="0 0 320 180"><rect width="100%" height="100%" fill="${color}"/><text x="50%" y="50%" font-family="Arial" font-size="16" fill="white" text-anchor="middle" dy=".3em">${video.title}</text></svg>`;
                    }
                });
            } catch (error) {
                console.error('加载视频数据失败:', error);
                // 使用模拟数据
                videos.value = getMockVideos();
            }
        };
        
        const loadCategories = async () => {
            try {
                // 这里应该从服务器获取分区配置
                // 模拟从静态JSON文件加载
                const response = await fetch('./data/config.json');
                const config = await response.json();
                categories.value = config.categories;
                
                // 设置默认分区
                currentCategory.value = categories.value.find(cat => cat.id === 'all') || categories.value[0];
            } catch (error) {
                console.error('加载分区配置失败:', error);
                // 使用默认分区
                categories.value = [
                    { id: 'all', name: '全部', description: '所有视频内容' },
                    { id: 'entertainment', name: '娱乐', description: '搞笑、综艺、明星' },
                    { id: 'game', name: '游戏', description: '游戏实况、攻略、解说' },
                    { id: 'technology', name: '科技', description: '科技资讯、数码评测' },
                    { id: 'life', name: '生活', description: '日常记录、美食、旅行' }
                ];
                currentCategory.value = categories.value[0];
            }
        };
        
        const changeCategory = (category) => {
            currentCategory.value = category;
            currentPage.value = 1;
            // 滚动到顶部
            window.scrollTo({ top: 0, behavior: 'smooth' });
        };
        
        const performSearch = () => {
            currentPage.value = 1;
        };
        
        const clearSearch = () => {
            searchQuery.value = '';
            currentPage.value = 1;
        };
        
        const handleVideoClick = (video) => {
            selectedVideo.value = video;
            // 增加点击量
            video.views = (parseInt(video.views) || 0) + 1;
            
            // 更新本地存储中的点击量
            updateVideoViews(video.id, video.views);
            
            // 防止背景滚动
            document.body.style.overflow = 'hidden';
        };
        
        const handleVideoPlay = () => {
            // 可以在这里添加播放统计
            console.log(`视频 ${selectedVideo.value.title} 开始播放`);
        };
        
        const closeModal = () => {
            selectedVideo.value = null;
            document.body.style.overflow = 'auto';
        };
        
        const updateVideoViews = (videoId, views) => {
            // 在实际应用中，这里应该发送请求到后端更新点击量
            // 由于没有后端，我们使用localStorage模拟
            try {
                const videoStats = JSON.parse(localStorage.getItem('videoStats') || '{}');
                videoStats[videoId] = { views, lastUpdated: new Date().toISOString() };
                localStorage.setItem('videoStats', JSON.stringify(videoStats));
            } catch (error) {
                console.error('更新视频点击量失败:', error);
            }
        };
        
        const handleUpload = () => {
            // 跳转到GitHub反馈页
            window.open('https://github.com/your-username/your-repo/issues', '_blank');
        };
        
        const searchByTag = (tag) => {
            searchQuery.value = tag;
            performSearch();
        };
        
        const scrollToTop = () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        };
        
        const handleScroll = () => {
            showScrollTop.value = window.scrollY > 300;
        };
        
        const nextPage = () => {
            if (currentPage.value < totalPages.value) {
                currentPage.value++;
                scrollToTop();
            }
        };
        
        const prevPage = () => {
            if (currentPage.value > 1) {
                currentPage.value--;
                scrollToTop();
            }
        };
        
        // 模拟数据（当无法加载JSON文件时使用）
        const getMockVideos = () => {
            return [
                {
                    id: 1,
                    title: '无数据',
                    description: '我只是来占位的',
                    path: '',
                    thumbnail: '',
                    views: 1234,
                    date: '',
                    duration: '',
                    tags: [],
                    category: ''
                }
            ];
        };
        
        // 生命周期钩子
        onMounted(() => {
            loadCategories();
            loadVideos();
            
            // 从localStorage恢复点击量
            try {
                const videoStats = JSON.parse(localStorage.getItem('videoStats') || '{}');
                videos.value.forEach(video => {
                    if (videoStats[video.id]) {
                        video.views = videoStats[video.id].views;
                    }
                });
            } catch (error) {
                console.error('恢复视频点击量失败:', error);
            }
            
            // 添加滚动监听
            window.addEventListener('scroll', handleScroll);
        });
        
        onUnmounted(() => {
            // 移除滚动监听
            window.removeEventListener('scroll', handleScroll);
        });
        
        return {
            videos,
            categories,
            currentCategory,
            searchQuery,
            selectedVideo,
            showScrollTop,
            currentPage,
            videosPerPage,
            filteredVideos,
            totalPages,
            paginatedVideos,
            changeCategory,
            performSearch,
            clearSearch,
            handleVideoClick,
            handleVideoPlay,
            closeModal,
            handleUpload,
            searchByTag,
            scrollToTop,
            nextPage,
            prevPage
        };
    }
}).mount('#app');