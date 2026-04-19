import { createConsumerOrderStore } from '../../packages/mobile-core/src/consumer-order-store.js'

const consumerOrderStore = createConsumerOrderStore()

export const {
  state,
  setRemark,
  setTableware,
  reset,
  useUserOrderStore,
} = consumerOrderStore
