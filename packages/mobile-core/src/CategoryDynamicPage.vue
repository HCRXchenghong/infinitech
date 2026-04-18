<script>
import SharedCategoryListPage from "./CategoryListPage.vue";

export default {
  extends: SharedCategoryListPage,
  categoryPageConfig: {
    queryKey: "category",
    fallbackTitle: "全部分类",
  },
};
</script>
