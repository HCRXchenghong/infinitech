package com.user.infinite.feature.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.user.infinite.core.common.ApiResult
import com.user.infinite.core.model.repository.AuthRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

class SetPasswordViewModel(
    private val authRepository: AuthRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(SetPasswordUiState())
    val uiState: StateFlow<SetPasswordUiState> = _uiState.asStateFlow()

    fun initialize(phone: String, code: String) {
        val current = _uiState.value
        if (current.phone == phone && current.code == code) return

        _uiState.update {
            SetPasswordUiState(
                phone = phone.filter(Char::isDigit).take(11),
                code = code,
            )
        }
    }

    fun updatePassword(value: String) {
        _uiState.update { it.copy(password = value.take(20), error = null, message = null) }
    }

    fun updateConfirmPassword(value: String) {
        _uiState.update { it.copy(confirmPassword = value.take(20), error = null, message = null) }
    }

    fun submit(onSuccess: () -> Unit) {
        val state = _uiState.value
        if (state.loading) return

        when {
            state.phone.length != 11 || state.code.isBlank() -> {
                _uiState.update { it.copy(error = "验证信息已失效，请重新上一步操作") }
                return
            }

            state.password.length < 6 -> {
                _uiState.update { it.copy(error = "密码至少6位") }
                return
            }

            state.password != state.confirmPassword -> {
                _uiState.update { it.copy(error = "两次密码不一致") }
                return
            }
        }

        viewModelScope.launch {
            _uiState.update { it.copy(loading = true, error = null, message = null) }
            when (
                val result = authRepository.setNewPassword(
                    phone = state.phone,
                    code = state.code,
                    password = state.password,
                )
            ) {
                is ApiResult.Success -> {
                    _uiState.update {
                        it.copy(
                            loading = false,
                            error = null,
                            message = "密码设置成功，请重新登录",
                        )
                    }
                    onSuccess()
                }

                is ApiResult.Failure -> {
                    _uiState.update { it.copy(loading = false, error = result.message) }
                }
            }
        }
    }
}
