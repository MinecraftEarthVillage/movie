/**
 * CategoryNav 组件
 * 功能用途：显示视频分类导航栏，支持分类切换
 * 
 * 核心逻辑：
 * 1. 遍历分类数据，生成导航项
 * 2. 标记当前选中的分类
 * 3. 点击分类时触发切换事件
 * 
 * 关键参数：
 * - categories: 分类数据数组（必需），每个分类对象包含 id、name 和可选的 icon 属性
 * - currentCategory: 当前选中的分类对象（必需）
 * 
 * 事件：
 * - category-change: 点击分类时触发，传递选中的分类对象
 * 
 * 使用场景示例：
 * <CategoryNav 
 *   :categories="categories" 
 *   :currentCategory="currentCategory"
 *   @category-change="handleCategoryChange"
 * />
 * 
 * 重要注意事项：
 * 1. 分类数据需要包含 id 和 name 属性
 * 2. 可选的 icon 属性用于显示分类图标，使用 Font Awesome 图标类名
 */
export default {
    template: `
        <nav class="category-nav">
            <ul>
                <li 
                    v-for="category in categories" 
                    :key="category.id"
                    :class="['category-item', { active: category.id === currentCategory.id }]"
                    @click="$emit('category-change', category)"
                >
                    <i v-if="category.icon" :class="['fas', category.icon]"></i>
                    {{ category.name }}
                </li>
            </ul>
        </nav>
    `,
    props: {
        /**
         * 分类数据数组
         * @type {Array}
         * @required
         * @default []
         */
        categories: {
            type: Array,
            required: true,
            default: () => []
        },
        /**
         * 当前选中的分类对象
         * @type {Object}
         * @required
         */
        currentCategory: {
            type: Object,
            required: true
        }
    },
    /**
     * 事件
     */
    emits: ['category-change']
};