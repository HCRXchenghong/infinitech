export function createDefaultConsumerOrderStoreState() {
  return {
    remark: "",
    tableware: null,
  };
}

function normalizeInitialState(initialState = {}) {
  const baseState = createDefaultConsumerOrderStoreState();
  const source = initialState && typeof initialState === "object" ? initialState : {};

  return {
    remark: String(source.remark || ""),
    tableware: source.tableware ?? baseState.tableware,
  };
}

export function createConsumerOrderStore(initialState = {}) {
  const state = normalizeInitialState(initialState);

  function setRemark(text) {
    state.remark = text || "";
  }

  function setTableware(value) {
    state.tableware = value;
  }

  function reset() {
    state.remark = "";
    state.tableware = null;
  }

  function useUserOrderStore() {
    return {
      state,
      setRemark,
      setTableware,
      reset,
    };
  }

  return {
    state,
    setRemark,
    setTableware,
    reset,
    useUserOrderStore,
  };
}
