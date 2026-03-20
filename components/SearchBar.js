/**
 * SearchBar 组件
 * 功能用途：搜索输入框，支持搜索视频标题、简介或标签
 * 
 * 核心逻辑：
 * 1. 提供搜索输入框和清除按钮
 * 2. 支持 v-model 双向绑定
 * 3. 按下回车键触发搜索
 * 4. 支持 Ctrl+K 或 Cmd+K 快捷键聚焦搜索框
 * 
 * 关键参数：
 * - modelValue: 搜索框的值（可选，默认为空字符串）
 * 
 * 事件：
 * - update:modelValue: 搜索框值变化时触发，用于 v-model 双向绑定
 * - search: 按下回车键时触发搜索
 * - clear: 点击清除按钮时触发
 * 
 * 使用场景示例：
 * <SearchBar 
 *   v-model="searchQuery"
 *   @search="handleSearch"
 *   @clear="handleClear"
 * />
 * 
 * 重要注意事项：
 * 1. 支持 Ctrl+K 或 Cmd+K 快捷键快速聚焦搜索框
 * 2. 当搜索框有值时，会显示清除按钮
 * 3. 按下回车键会触发搜索事件
 */
export default {
    template: `
        <div class="search-container">
            <i class="fas fa-search search-icon"></i>
            <input 
                type="text" 
                class="search-box" 
                placeholder="搜索视频标题、简介或标签..."
                :value="modelValue"
                @input="$emit('update:modelValue', $event.target.value)"
                @keyup.enter="$emit('search')"
                ref="searchInput"
            />
            <button 
                v-if="modelValue" 
                @click="$emit('clear')"
                class="search-clear"
                aria-label="清除搜索"
            >
                <i class="fas fa-times"></i>
            </button>
        </div>
    `,
    props: {
        /**
         * 搜索框的值
         * @type {String}
         * @default ''
         */
        modelValue: {
            type: String,
            default: ''
        }
    },
    /**
     * 事件
     */
    emits: ['update:modelValue', 'search', 'clear'],
    mounted() {
        // 添加搜索快捷键 (Ctrl+K 或 Cmd+K)
        document.addEventListener('keydown', this.handleKeydown);
    },
    beforeUnmount() {
        // 移除事件监听器
        document.removeEventListener('keydown', this.handleKeydown);
    },
    methods: {
        /**
         * 处理键盘事件，支持 Ctrl+K 或 Cmd+K 快捷键聚焦搜索框
         * @param {KeyboardEvent} event - 键盘事件
         */
        handleKeydown(event) {
            if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
                event.preventDefault();
                this.$refs.searchInput.focus();
            }
        }
    }
};