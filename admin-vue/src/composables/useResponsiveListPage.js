import { ref, onMounted, onUnmounted } from 'vue';

const DEFAULT_BREAKPOINT = 768;

export function useResponsiveListPage(options = {}) {
  const {
    breakpoint = DEFAULT_BREAKPOINT,
    mobilePageSize = 5,
    desktopPageSize = 15,
    onModeChange
  } = options;

  const getIsMobile = () => typeof window !== 'undefined' && window.innerWidth <= breakpoint;
  const isMobile = ref(getIsMobile());
  const pageSize = ref(isMobile.value ? mobilePageSize : desktopPageSize);

  const updatePageSizeByMode = () => {
    pageSize.value = isMobile.value ? mobilePageSize : desktopPageSize;
  };

  const handleResize = () => {
    const prev = isMobile.value;
    isMobile.value = getIsMobile();
    if (prev !== isMobile.value) {
      updatePageSizeByMode();
      if (typeof onModeChange === 'function') {
        onModeChange({ isMobile: isMobile.value, wasMobile: prev, pageSize: pageSize.value });
      }
    }
  };

  onMounted(() => {
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', handleResize);
    }
  });

  onUnmounted(() => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', handleResize);
    }
  });

  return {
    isMobile,
    pageSize,
    handleResize
  };
}
