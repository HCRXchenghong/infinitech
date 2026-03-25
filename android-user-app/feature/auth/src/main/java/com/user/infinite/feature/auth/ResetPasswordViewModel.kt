package com.user.infinite.feature.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.user.infinite.core.common.ApiResult
import com.user.infinite.core.model.repository.AuthRepository
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

class ResetPasswordViewModel(
    private val authRepository: AuthRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(ResetPasswordUiState())
    val uiState: StateFlow<ResetPasswordUiState> = _uiState.asStateFlow()

    private var cooldownJob: Job? = null

    fun reset() {
        cooldownJob?.cancel()
        _uiState.value = ResetPasswordUiState()
    }

    fun updatePhone(value: String) {
        _uiState.update { it.copy(phone = value.filter(Char::isDigit).take(11), error = null, message = null) }
    }

    fun updateCode(value: String) {
        _uiState.update { it.copy(code = value.filter(Char::isDigit).take(6), error = null, message = null) }
    }

    fun sendCode() {
        val state = _uiState.value
        if (state.sendingCode || state.codeCooldown > 0) return
        if (state.phone.length != 11) {
            _uiState.update { it.copy(error = "请输入正确手机号") }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(sendingCode = true, error = null, message = null) }
            when (val result = authRepository.requestSmsCode(phone = state.phone, scene = "reset")) {
                is ApiResult.Success -> {
                    if (result.data.success) {
                        val tip = result.data.debugCode?.let { "${result.data.message}（测试码：$it）" }
                            ?: result.data.message
                        _uiState.update {
                            it.copy(
                                sendingCode = false,
                                message = tip,
                                error = null,
                            )
                        }
                        startCooldown()
                    } else {
                        _uiState.update {
                            it.copy(
                                sendingCode = false,
                                error = result.data.message,
                                message = null,
                            )
                        }
                    }
                }

                is ApiResult.Failure -> {
                    _uiState.update { it.copy(sendingCode = false, error = result.message, message = null) }
                }
            }
        }
    }

    fun verify(onSuccess: (phone: String, code: String) -> Unit) {
        val state = _uiState.value
        if (state.loading) return

        when {
            state.phone.length != 11 -> {
                _uiState.update { it.copy(error = "请输入正确手机号") }
                return
            }

            state.code.isBlank() -> {
                _uiState.update { it.copy(error = "请输入验证码") }
                return
            }
        }

        viewModelScope.launch {
            _uiState.update { it.copy(loading = true, error = null, message = null) }
            when (
                val result = authRepository.verifySmsCode(
                    phone = state.phone,
                    scene = "reset",
                    code = state.code,
                    consume = false,
                )
            ) {
                is ApiResult.Success -> {
                    _uiState.update { it.copy(loading = false, error = null) }
                    onSuccess(state.phone, state.code)
                }

                is ApiResult.Failure -> {
                    _uiState.update { it.copy(loading = false, error = result.message) }
                }
            }
        }
    }

    private fun startCooldown() {
        cooldownJob?.cancel()
        cooldownJob = viewModelScope.launch {
            for (second in 60 downTo 1) {
                _uiState.update { it.copy(codeCooldown = second) }
                delay(1000L)
            }
            _uiState.update { it.copy(codeCooldown = 0) }
        }
    }

    override fun onCleared() {
        super.onCleared()
        cooldownJob?.cancel()
    }
}
