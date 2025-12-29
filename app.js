// 导入组件
import VideoCard from './components/VideoCard.js';
import SearchBar from './components/SearchBar.js';
import CategoryNav from './components/CategoryNav.js';
import UploadButton from './components/UploadButton.js';
import VideoModal from './components/VideoModal.js';

// 主应用
const { createApp, ref, computed, onMounted, onUnmounted } = Vue;

createApp({
    components: {
        VideoCard,
        SearchBar,
        CategoryNav,
        UploadButton,
        VideoModal
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
        const showVideoModal = ref(false);
        const isLoading = ref(false);
        
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
            isLoading.value = true;
            try {
                const response = await fetch('./data/video-data.json');
                if (!response.ok) throw new Error('Failed to load videos');
                videos.value = await response.json();
                
                // 从localStorage恢复点击量
                const videoStats = JSON.parse(localStorage.getItem('videoStats') || '{}');
                videos.value.forEach(video => {
                    if (videoStats[video.id]) {
                        video.views = videoStats[video.id].views;
                    }
                    
                    // 生成缩略图
                    if (!video.thumbnail) {
                        const colors = ['#00a1d6', '#f25d8e', '#fb7299', '#ff9800', '#4caf50'];
                        const color = colors[Math.floor(Math.random() * colors.length)];
                        video.thumbnail = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180" viewBox="0 0 320 180"><rect width="100%" height="100%" fill="${color}"/><text x="50%" y="50%" font-family="Arial" font-size="16" fill="white" text-anchor="middle" dy=".3em">${video.title.substring(0, 20)}</text></svg>`;
                    }
                });
            } catch (error) {
                console.error('加载视频数据失败:', error);
                videos.value = getMockVideos();
            } finally {
                isLoading.value = false;
            }
        };
        
        const loadCategories = async () => {
            try {
                const response = await fetch('./data/config.json');
                if (!response.ok) throw new Error('Failed to load config');
                const config = await response.json();
                categories.value = config.categories;
                
                // 设置默认分区
                currentCategory.value = categories.value.find(cat => cat.id === 'all') || categories.value[0];
            } catch (error) {
                console.error('加载分区配置失败:', error);
                categories.value = getDefaultCategories();
                currentCategory.value = categories.value[0];
            }
        };
        
        const getDefaultCategories = () => {
            return [
                { id: 'all', name: '全部', description: '所有视频内容', icon: 'fa-compass' },
                { id: 'entertainment', name: '娱乐', description: '搞笑、综艺、明星', icon: 'fa-film' },
                { id: 'game', name: '游戏', description: '游戏实况、攻略、解说', icon: 'fa-gamepad' },
                { id: 'technology', name: '科技', description: '科技资讯、数码评测', icon: 'fa-laptop-code' },
                { id: 'life', name: '生活', description: '日常记录、美食、旅行', icon: 'fa-home' },
                { id: 'music', name: '音乐', description: '音乐现场、翻唱、原创', icon: 'fa-music' },
                { id: 'animation', name: '动画', description: '动漫、二次元', icon: 'fa-tv' }
            ];
        };
        
        const getMockVideos = () => {
            return [
                {
                    id: 1,
                    title: 'Vue.js 3 入门教程',
                    description: '从零开始学习Vue.js 3框架，包含基础语法、组件、路由、状态管理等核心概念。',
                    path: './videos/vue3-tutorial.mp4',
                    thumbnail: '',
                    views: 1567,
                    date: '2023-10-20',
                    duration: '15:30',
                    tags: ['Vue', '前端', '教程', 'JavaScript'],
                    category: 'technology'
                },
                {
                    id: 2,
                    title: 'JavaScript 高级技巧',
                    description: '深入讲解JavaScript高级特性和实用技巧，提升编程能力。',
                    path: './videos/js-advanced.mp4',
                    thumbnail: '',
                    views: 2345,
                    date: '2023-10-15',
                    duration: '22:45',
                    tags: ['JavaScript', '编程', '前端'],
                    category: 'technology'
                },
                {
                    id: 3,
                    title: '游戏实况：最新大作试玩',
                    description: '最新游戏大作的首发试玩体验，包含游戏玩法和画面展示。',
                    path: './videos/gameplay.mp4',
                    thumbnail: '',
                    views: 3456,
                    date: '2023-10-10',
                    duration: '18:20',
                    tags: ['游戏', '实况', '试玩'],
                    category: 'game'
                },
                {
                    id: 4,
                    title: '美食制作：家常菜教程',
                    description: '手把手教你制作美味的家常菜，简单易学，适合新手。',
                    path: './videos/cooking.mp4',
                    thumbnail: '',
                    views: 1234,
                    date: '2023-10-05',
                    duration: '12:15',
                    tags: ['美食', '烹饪', '教程'],
                    category: 'life'
                },
                {
                    id: 5,
                    title: '旅行日记：日本樱花季',
                    description: '记录在日本东京和大阪欣赏樱花的旅行经历，包含美景和美食。',
                    path: './videos/japan-travel.mp4',
                    thumbnail: '',
                    views: 4567,
                    date: '2023-09-28',
                    duration: '25:40',
                    tags: ['旅行', '日本', '樱花', 'vlog'],
                    category: 'life'
                },
                {
                    id: 6,
                    title: '音乐现场：独立音乐人演出',
                    description: '国内独立音乐人的现场演出记录，感受现场音乐的魅力。',
                    path: './videos/live-music.mp4',
                    thumbnail: '',
                    views: 789,
                    date: '2023-09-20',
                    duration: '08:45',
                    tags: ['音乐', '现场', '独立音乐'],
                    category: 'music'
                }
            ];
        };
        
        const changeCategory = (category) => {
            currentCategory.value = category;
            currentPage.value = 1;
            scrollToTop();
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
            showVideoModal.value = true;
            
            // 增加点击量
            video.views = (parseInt(video.views) || 0) + 1;
            updateVideoViews(video.id, video.views);
        };
        
        const closeVideoModal = () => {
            showVideoModal.value = false;
            selectedVideo.value = null;
        };
        
        const handleVideoPlay = (video) => {
            console.log(`视频 ${video.title} 开始播放`);
        };
        
        
        const handleVideoShare = (video) => {
            console.log(`分享视频: ${video.title}`);
        };
        
        const searchByTag = (tag) => {
            searchQuery.value = tag;
            performSearch();
            closeVideoModal();
        };
        
        const updateVideoViews = (videoId, views) => {
            try {
                const videoStats = JSON.parse(localStorage.getItem('videoStats') || '{}');
                videoStats[videoId] = { 
                    views, 
                    lastUpdated: new Date().toISOString() 
                };
                localStorage.setItem('videoStats', JSON.stringify(videoStats));
            } catch (error) {
                console.error('更新视频点击量失败:', error);
            }
        };
        
        const handleUpload = () => {
            window.open('https://github.com/your-username/your-repo/issues', '_blank');
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
        
        // 生命周期钩子
        onMounted(async () => {
            await Promise.all([loadCategories(), loadVideos()]);
            window.addEventListener('scroll', handleScroll);
            
            // 监听键盘事件
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && showVideoModal.value) {
                    closeVideoModal();
                }
            });
        });
        
        onUnmounted(() => {
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
            showVideoModal,
            isLoading,
            filteredVideos,
            totalPages,
            paginatedVideos,
            changeCategory,
            performSearch,
            clearSearch,
            handleVideoClick,
            closeVideoModal,
            handleVideoPlay,
            handleVideoShare,
            handleUpload,
            searchByTag,
            scrollToTop,
            nextPage,
            prevPage
        };
    }
}).mount('#app');