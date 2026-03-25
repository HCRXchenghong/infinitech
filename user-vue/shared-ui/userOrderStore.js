const state = {
  remark: '',
  tableware: null
}

export function useUserOrderStore() {
  const setRemark = (text) => {
    state.remark = text || ''
  }

  const setTableware = (value) => {
    state.tableware = value
  }

  return {
    state,
    setRemark,
    setTableware
  }
}

