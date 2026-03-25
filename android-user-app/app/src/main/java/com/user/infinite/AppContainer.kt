package com.user.infinite

import android.content.Context
import com.user.infinite.core.data.repository.AddressRepositoryImpl
import com.user.infinite.core.data.repository.AuthRepositoryImpl
import com.user.infinite.core.data.repository.ErrandRepositoryImpl
import com.user.infinite.core.data.repository.FeatureFlagRepositoryImpl
import com.user.infinite.core.data.repository.MedicineRepositoryImpl
import com.user.infinite.core.data.repository.MessageRepositoryImpl
import com.user.infinite.core.data.repository.OrderRepositoryImpl
import com.user.infinite.core.data.repository.ProfileRepositoryImpl
import com.user.infinite.core.data.repository.ShopRepositoryImpl
import com.user.infinite.core.data.repository.SyncStateRepositoryImpl
import com.user.infinite.core.data.repository.WalletRepositoryImpl
import com.user.infinite.core.database.AppDatabase
import com.user.infinite.core.model.repository.AddressRepository
import com.user.infinite.core.model.repository.AuthRepository
import com.user.infinite.core.model.repository.ErrandRepository
import com.user.infinite.core.model.repository.FeatureFlagRepository
import com.user.infinite.core.model.repository.MedicineRepository
import com.user.infinite.core.model.repository.MessageRepository
import com.user.infinite.core.model.repository.OrderRepository
import com.user.infinite.core.model.repository.ProfileRepository
import com.user.infinite.core.model.repository.ShopRepository
import com.user.infinite.core.model.repository.SyncStateRepository
import com.user.infinite.core.model.repository.WalletRepository
import com.user.infinite.core.network.AppNetwork
import com.user.infinite.core.socket.SocketService
import com.user.infinite.core.storage.AuthSessionStore
import com.user.infinite.core.storage.JsonDataStore

class AppContainer(context: Context) {

    val authSessionStore = AuthSessionStore(context)
    private val jsonDataStore = JsonDataStore(context)
    private val appNetwork = AppNetwork(authSessionStore)
    val appDatabase = AppDatabase.getInstance(context)

    private val cacheDao = appDatabase.cacheDao()

    val authRepository: AuthRepository = AuthRepositoryImpl(
        authApi = appNetwork.authApi,
        authSessionStore = authSessionStore,
    )

    val featureFlagRepository: FeatureFlagRepository = FeatureFlagRepositoryImpl(jsonDataStore)
    val syncStateRepository: SyncStateRepository = SyncStateRepositoryImpl(jsonDataStore)
    val addressRepository: AddressRepository = AddressRepositoryImpl(jsonDataStore)

    val shopRepository: ShopRepository = ShopRepositoryImpl(
        shopApi = appNetwork.shopApi,
        productApi = appNetwork.productApi,
        cacheDao = cacheDao,
    )

    val orderRepository: OrderRepository = OrderRepositoryImpl(
        orderApi = appNetwork.orderApi,
        cacheDao = cacheDao,
    )

    val messageRepository: MessageRepository = MessageRepositoryImpl(
        messageApi = appNetwork.messageApi,
        socketTokenApi = appNetwork.socketTokenApi,
        cacheDao = cacheDao,
    )

    val profileRepository: ProfileRepository = ProfileRepositoryImpl(
        userApi = appNetwork.userApi,
        cacheDao = cacheDao,
    )

    val walletRepository: WalletRepository = WalletRepositoryImpl(
        walletApi = appNetwork.walletApi,
        cacheDao = cacheDao,
    )

    val errandRepository: ErrandRepository = ErrandRepositoryImpl()
    val medicineRepository: MedicineRepository = MedicineRepositoryImpl()

    val socketService = SocketService()
}
