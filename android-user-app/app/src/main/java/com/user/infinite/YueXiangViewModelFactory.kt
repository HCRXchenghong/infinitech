package com.user.infinite

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import com.user.infinite.feature.auth.AuthViewModel
import com.user.infinite.feature.auth.RegisterViewModel
import com.user.infinite.feature.auth.ResetPasswordViewModel
import com.user.infinite.feature.auth.SetPasswordViewModel

class YueXiangViewModelFactory(
    private val container: AppContainer,
) : ViewModelProvider.Factory {

    @Suppress("UNCHECKED_CAST")
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        return when {
            modelClass.isAssignableFrom(MainViewModel::class.java) -> {
                MainViewModel(
                    authRepository = container.authRepository,
                    authSessionStore = container.authSessionStore,
                ) as T
            }

            modelClass.isAssignableFrom(AuthViewModel::class.java) -> {
                AuthViewModel(container.authRepository) as T
            }

            modelClass.isAssignableFrom(RegisterViewModel::class.java) -> {
                RegisterViewModel(container.authRepository) as T
            }

            modelClass.isAssignableFrom(ResetPasswordViewModel::class.java) -> {
                ResetPasswordViewModel(container.authRepository) as T
            }

            modelClass.isAssignableFrom(SetPasswordViewModel::class.java) -> {
                SetPasswordViewModel(container.authRepository) as T
            }

            modelClass.isAssignableFrom(ShopsViewModel::class.java) -> {
                ShopsViewModel(
                    shopRepository = container.shopRepository,
                    orderRepository = container.orderRepository,
                ) as T
            }

            modelClass.isAssignableFrom(SearchViewModel::class.java) -> {
                SearchViewModel(container.shopRepository) as T
            }

            modelClass.isAssignableFrom(CouponViewModel::class.java) -> {
                CouponViewModel(container.shopRepository) as T
            }

            modelClass.isAssignableFrom(CatalogViewModel::class.java) -> {
                CatalogViewModel(container.shopRepository) as T
            }

            modelClass.isAssignableFrom(OrdersViewModel::class.java) -> {
                OrdersViewModel(container.orderRepository) as T
            }

            modelClass.isAssignableFrom(OrderReviewViewModel::class.java) -> {
                OrderReviewViewModel(container.orderRepository) as T
            }

            modelClass.isAssignableFrom(MessagesViewModel::class.java) -> {
                MessagesViewModel(container.messageRepository) as T
            }

            modelClass.isAssignableFrom(ChatViewModel::class.java) -> {
                ChatViewModel(
                    messageRepository = container.messageRepository,
                    socketService = container.socketService,
                ) as T
            }

            modelClass.isAssignableFrom(ProfileViewModel::class.java) -> {
                ProfileViewModel(
                    profileRepository = container.profileRepository,
                    walletRepository = container.walletRepository,
                ) as T
            }

            modelClass.isAssignableFrom(FavoritesViewModel::class.java) -> {
                FavoritesViewModel(container.profileRepository) as T
            }

            modelClass.isAssignableFrom(AddressViewModel::class.java) -> {
                AddressViewModel(container.addressRepository) as T
            }

            modelClass.isAssignableFrom(WalletViewModel::class.java) -> {
                WalletViewModel(container.walletRepository) as T
            }

            modelClass.isAssignableFrom(SettingsViewModel::class.java) -> {
                SettingsViewModel(container.featureFlagRepository) as T
            }

            modelClass.isAssignableFrom(ErrandViewModel::class.java) -> {
                ErrandViewModel(container.errandRepository) as T
            }

            modelClass.isAssignableFrom(MedicineViewModel::class.java) -> {
                MedicineViewModel(container.medicineRepository) as T
            }

            else -> error("Unknown view model: ${modelClass.name}")
        }
    }
}
