package com.user.infinite

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.user.infinite.core.model.AuthSession
import com.user.infinite.core.model.UserProfile
import com.user.infinite.core.model.repository.AuthRepository
import com.user.infinite.core.storage.AuthSessionStore
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

class MainViewModel(
    private val authRepository: AuthRepository,
    authSessionStore: AuthSessionStore,
) : ViewModel() {

    val session: StateFlow<AuthSession?> = authRepository.observeSession()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), null)

    val profile: StateFlow<UserProfile?> = authSessionStore.observeProfile()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), null)

    fun logout() {
        viewModelScope.launch {
            authRepository.logout()
        }
    }
}
