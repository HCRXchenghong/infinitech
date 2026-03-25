package com.user.infinite.feature.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.user.infinite.core.common.ApiResult
import com.user.infinite.core.model.LoginPayload
import com.user.infinite.core.model.repository.AuthRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

class AuthViewModel(
    private val authRepository: AuthRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(AuthUiState())
    val uiState: StateFlow<AuthUiState> = _uiState.asStateFlow()

    fun updatePhone(value: String) {
        _uiState.update {
            it.copy(
                phone = value.filter(Char::isDigit).take(11),
                error = null,
            )
        }
    }

    fun updatePassword(value: String) {
        _uiState.update { it.copy(password = value, error = null) }
    }

    fun login(onSuccess: () -> Unit) {
        val state = _uiState.value
        if (state.loading) return

        if (state.phone.trim().length != 11 || state.password.isBlank()) {
            _uiState.update { it.copy(error = "请输入正确手机号和密码") }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(loading = true, error = null) }
            when (
                val result = authRepository.login(
                    LoginPayload(
                        phone = state.phone.trim(),
                        password = state.password,
                    ),
                )
            ) {
                is ApiResult.Success -> {
                    _uiState.update { it.copy(loading = false, error = null) }
                    onSuccess()
                }

                is ApiResult.Failure -> {
                    _uiState.update {
                        it.copy(
                            loading = false,
                            error = result.message,
                        )
                    }
                }
            }
        }
    }
}
