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
                { id: 'all', name: '全部', description: '所有视频内容', icon: 'fa-compass' }
            ];
        };

        const getMockVideos = () => {
            return [
                {
                    id: 1,
                    title: '啥也木有',
                    description: '我就是来占位的',
                    path: '',
                    thumbnail: '',  // 将动态生成
                    views: 0,
                    date: '',
                    tags: [],
                    category: ''
                },
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