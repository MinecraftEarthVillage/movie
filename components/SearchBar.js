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
        modelValue: {
            type: String,
            default: ''
        }
    },
    emits: ['update:modelValue', 'search', 'clear'],
    mounted() {
        // 添加搜索快捷键 (Ctrl+K 或 Cmd+K)
        document.addEventListener('keydown', this.handleKeydown);
    },
    beforeUnmount() {
        document.removeEventListener('keydown', this.handleKeydown);
    },
    methods: {
        handleKeydown(event) {
            if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
                event.preventDefault();
                this.$refs.searchInput.focus();
            }
        }
    }
};