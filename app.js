// app.js
import VideoCard from './components/VideoCard.js';
import SearchBar from './components/SearchBar.js';
import CategoryNav from './components/CategoryNav.js';
import UploadButton from './components/UploadButton.js';
// 移除 VideoModal 导入，改为 VideoPage
//import VideoPage from './components/VideoPage.js';

const { createApp, ref, computed, onMounted, onUnmounted } = Vue;

createApp({
    components: {
        VideoCard,
        SearchBar,
        CategoryNav,
        UploadButton,
        //VideoPage 
    },
    setup() {
        // ------- 原有数据 -------
        const videos = ref([]);
        const categories = ref([]);
        const currentCategory = ref({});
        const searchQuery = ref('');
        const selectedVideo = ref(null);   // 保留但不再用于模态框，可保留
        const showScrollTop = ref(false);
        const currentPage = ref(1);
        const videosPerPage = ref(12);
        const isLoading = ref(false);


        // ------- 计算属性 -------
        const filteredVideos = computed(() => {
            let filtered = videos.value;
            if (currentCategory.value.id !== 'all') {
                filtered = filtered.filter(video =>
                    video.category === currentCategory.value.id
                );
            }
            if (searchQuery.value) {
                const query = searchQuery.value.toLowerCase();
                filtered = filtered.filter(video => {
                    // 提供安全的默认值（如果视频没有简介或没有标签）
                    const title = video.title || '';
                    const description = video.description || '';
                    const tags = Array.isArray(video.tags) ? video.tags : [];

                    return title.toLowerCase().includes(query) ||
                        description.toLowerCase().includes(query) ||
                        tags.some(tag => (tag || '').toLowerCase().includes(query));
                });
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

        // ------- 数据加载-------

        const loadVideos = async () => {// 加载视频数据
            isLoading.value = true;
            try {
                const response = await fetch('./data/video-data.json');
                if (!response.ok) throw new Error('Failed to load videos');
                videos.value = await response.json();
            } catch (error) {
                console.error('加载视频数据失败:', error);
                videos.value = getMockVideos();
            } finally {
                isLoading.value = false;
            }
        };

        const loadCategories = async () => {//加载分区
            try {
                const response = await fetch('./data/config.json');
                if (!response.ok) throw new Error('Failed to load config');
                const config = await response.json();
                categories.value = config.categories;
                currentCategory.value = categories.value.find(cat => cat.id === 'all') || categories.value[0];
            } catch (error) {
                console.error('加载分区配置失败:', error);
                categories.value = getDefaultCategories();
                currentCategory.value = categories.value[0];
            }
        };

        const getDefaultCategories = () => [
            { id: 'all', name: '全部', description: '所有视频内容', icon: 'fa-compass' }
        ];

        const getMockVideos = () => [
            { id: 1, title: '啥也木有', description: '我就是来占位的', path: '', date: '', tags: [], category: '' }
        ];

        // ------- 用户交互方法 -------
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

        // ------- 生命周期 -------
        onMounted(async () => {
            await Promise.all([loadCategories(), loadVideos()]);


            // 👇 新增：检查是否有从视频页跳转过来的待搜索标签
            const pendingTag = sessionStorage.getItem('pendingSearch');
            if (pendingTag) {
                searchQuery.value = pendingTag;   // 填入搜索框
                performSearch();                 // 重置分页并触发搜索
                sessionStorage.removeItem('pendingSearch'); // 立即清除，避免刷新重复
            }

            window.addEventListener('scroll', handleScroll);
            window.addEventListener('popstate', handlePopState);
        });

        onUnmounted(() => {
            window.removeEventListener('scroll', handleScroll);
            window.removeEventListener('popstate', handlePopState);
        });
        const handleUpload = () => {
            // 投稿功能暂未实现，可跳转至反馈链接或留空
            window.open('https://github.com/minecraftearthvillage/movie/issues/new?template=投稿.yml', '_blank');
        };

        // ------- 返回给模板的数据和方法 -------
        return {
            // 原有数据
            videos,
            categories,
            currentCategory,
            searchQuery,
            selectedVideo,
            showScrollTop,
            currentPage,
            videosPerPage,
            isLoading,
            filteredVideos,
            totalPages,
            paginatedVideos,
            handleUpload,

            // 原有方法
            changeCategory,
            performSearch,
            clearSearch,
            
            scrollToTop,
            nextPage,
            prevPage,


            
        };
    }
}).mount('#app');