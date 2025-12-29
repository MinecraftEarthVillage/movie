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
        categories: {
            type: Array,
            required: true,
            default: () => []
        },
        currentCategory: {
            type: Object,
            required: true
        }
    },
    emits: ['category-change']
};