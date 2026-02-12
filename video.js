// video.js
import VideoPage from './components/VideoPage.js';

const { createApp, ref, onMounted, watch, onUnmounted } = Vue;

createApp({
    components: { VideoPage },
    setup() {
        const video = ref(null);
        const isLoading = ref(true);
        const error = ref(null);
        let timeoutId = null;

        // 统一设置页面标题
        const setTitle = (title) => {
            document.title = `${title}_哔哩哔哩_bilibili`;
        };

        // 从 URL 获取 video ID
        const getVideoIdFromUrl = () => {
            const params = new URLSearchParams(window.location.search);
            return params.get('video');
        };

        // 加载所有视频，查找匹配项
        const loadVideo = async () => {
            isLoading.value = true;
            error.value = null;
            setTitle('视频加载中……');
            const videoId = getVideoIdFromUrl();

            if (!videoId) {
                error.value = 'no_id';
                isLoading.value = false;
                return;
            }

            try {
                const response = await fetch('./data/video-data.json');
                if (!response.ok) throw new Error('Failed to load videos');
                const videos = await response.json();
                const found = videos.find(v => String(v.id) === String(videoId));
                if (found) {
                    video.value = found;
                    setTitle(found.title);
                } else {
                    error.value = 'not_found';
                    setTitle('视频去哪了呢？');
                }
            } catch (err) {
                console.error('加载视频数据失败:', err);
                error.value = 'load_error';
                setTitle('加载失败');
            } finally {
                isLoading.value = false;
            }
        };

        // 监听错误状态，3 秒后跳转首页
        watch(error, (newError) => {
            if (newError) {
                timeoutId = setTimeout(() => {
                    window.location.href = 'index.html';
                }, 3000);
            } else {
                if (timeoutId) clearTimeout(timeoutId);
            }
        });

        onMounted(loadVideo);
        onUnmounted(() => {
            if (timeoutId) clearTimeout(timeoutId);
        });

        return {
            video,
            isLoading,
            error
        };
    },
    template: `
        <div v-if="isLoading" class="loading-container">
            <div class="loading-spinner">
                <i class="fas fa-spinner fa-spin"></i>
                <p>正在加载视频...</p>
            </div>
        </div>
        <div v-else-if="error" class="error-container">
            <i class="fas fa-video-slash"></i>
            <h2>啊叻？视频不见了？</h2>
            <p>3秒后为您自动跳转至首页</p>
        </div>
        <div v-else>
            <video-page :video="video" @back="goHome"></video-page>
        </div>
    `,
    methods: {
        goHome() {
            window.location.href = 'index.html';
        }
    }
}).mount('#video-app');