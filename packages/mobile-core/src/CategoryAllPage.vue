<script>
import SharedCategoryListPage from "./CategoryListPage.vue";

export default {
  extends: SharedCategoryListPage,
  categoryPageConfig: {
    title: "全部分类",
    matchAll: true,
  },
};
</script>
