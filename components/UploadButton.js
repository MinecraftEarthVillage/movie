/**
 * UploadButton 组件
 * 功能用途：投稿按钮，点击后跳转到 GitHub Issues 页面进行视频投稿
 * 
 * 核心逻辑：
 * 1. 提供投稿按钮界面
 * 2. 点击按钮时跳转到 GitHub Issues 页面
 * 3. 同时触发 upload-click 事件通知父组件
 * 
 * 事件：
 * - upload-click: 点击按钮时触发
 * 
 * 使用场景示例：
 * <UploadButton @upload-click="handleUploadClick" />
 * 
 * 重要注意事项：
 * 1. 点击按钮会打开新窗口跳转到 GitHub Issues 页面
 * 2. 跳转到的页面使用了自定义的投稿模板 (template=投稿.yml)
 */
export default {
    template: `
        <button class="upload-btn" @click="handleClick">
            <i class="fas fa-upload"></i> 投稿
        </button>
    `,
    methods: {
        /**
         * 处理点击事件
         * 1. 跳转到 GitHub Issues 页面进行投稿
         * 2. 触发 upload-click 事件
         */
        handleClick() {
            // 跳转到 GitHub Issues 页面
            window.open('https://github.com/minecraftearthvillage/movie/issues/new?template=投稿.yml', '_blank');
            
            // 发送事件给父组件
            this.$emit('upload-click');
        }
    },
    /**
     * 事件
     */
    emits: ['upload-click']
};