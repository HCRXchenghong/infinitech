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

class RegisterViewModel(
    private val authRepository: AuthRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(RegisterUiState())
    val uiState: StateFlow<RegisterUiState> = _uiState.asStateFlow()

    private var cooldownJob: Job? = null

    fun reset() {
        cooldownJob?.cancel()
        _uiState.value = RegisterUiState()
    }

    fun updateNickname(value: String) {
        _uiState.update { it.copy(nickname = value.take(16), error = null, message = null) }
    }

    fun updatePhone(value: String) {
        _uiState.update { it.copy(phone = value.filter(Char::isDigit).take(11), error = null, message = null) }
    }

    fun updateCode(value: String) {
        _uiState.update { it.copy(code = value.filter(Char::isDigit).take(6), error = null, message = null) }
    }

    fun updatePassword(value: String) {
        _uiState.update { it.copy(password = value.take(20), error = null, message = null) }
    }

    fun updateConfirmPassword(value: String) {
        _uiState.update { it.copy(confirmPassword = value.take(20), error = null, message = null) }
    }

    fun sendCode() {
        val state = _uiState.value
        if (state.sendingCode || state.codeCooldown > 0) return
        if (state.phone.length != 11) {
            _uiState.update { it.copy(error = "请输入正确手机号") }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(sendingCode = true, error = null, message = null, needCaptcha = false) }
            when (val result = authRepository.requestSmsCode(phone = state.phone, scene = "register")) {
                is ApiResult.Success -> {
                    val payload = result.data
                    if (payload.success) {
                        val tip = payload.debugCode?.let { "${payload.message}（测试码：$it）" } ?: payload.message
                        _uiState.update {
                            it.copy(
                                sendingCode = false,
                                message = tip,
                                error = null,
                                needCaptcha = false,
                            )
                        }
                        startCooldown()
                    } else {
                        _uiState.update {
                            it.copy(
                                sendingCode = false,
                                needCaptcha = payload.needCaptcha,
                                message = null,
                                error = if (payload.needCaptcha) {
                                    "当前账号触发图形验证码，请前往旧端完成验证后重试"
                                } else {
                                    payload.message
                                },
                            )
                        }
                    }
                }

                is ApiResult.Failure -> {
                    _uiState.update {
                        it.copy(
                            sendingCode = false,
                            error = result.message,
                            message = null,
                        )
                    }
                }
            }
        }
    }

    fun submit(onSuccess: () -> Unit) {
        val state = _uiState.value
        if (state.loading) return

        when {
            state.nickname.isBlank() -> {
                _uiState.update { it.copy(error = "请输入昵称") }
                return
            }

            state.phone.length != 11 -> {
                _uiState.update { it.copy(error = "请输入正确手机号") }
                return
            }

            state.code.isBlank() -> {
                _uiState.update { it.copy(error = "请输入验证码") }
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
                val verifyResult = authRepository.verifySmsCode(
                    phone = state.phone,
                    scene = "register",
                    code = state.code,
                    consume = true,
                )
            ) {
                is ApiResult.Failure -> {
                    _uiState.update { it.copy(loading = false, error = verifyResult.message) }
                    return@launch
                }

                is ApiResult.Success -> Unit
            }

            when (
                val registerResult = authRepository.register(
                    phone = state.phone,
                    nickname = state.nickname,
                    password = state.password,
                )
            ) {
                is ApiResult.Success -> {
                    _uiState.update {
                        it.copy(
                            loading = false,
                            error = null,
                            message = "注册成功，请登录",
                        )
                    }
                    onSuccess()
                }

                is ApiResult.Failure -> {
                    _uiState.update { it.copy(loading = false, error = registerResult.message) }
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
