export default {
    template: `
        <button class="upload-btn" @click="handleClick">
            <i class="fas fa-upload"></i> 投稿
        </button>
    `,
    methods: {
        handleClick() {
            // 跳转到 GitHub Issues 页面
            window.open('https://github.com/your-username/your-repo/issues/new', '_blank');
            
            // 发送事件给父组件
            this.$emit('upload-click');
        }
    },
    emits: ['upload-click']
};