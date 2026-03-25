package com.user.infinite.feature.auth

data class ResetPasswordUiState(
    val phone: String = "",
    val code: String = "",
    val sendingCode: Boolean = false,
    val codeCooldown: Int = 0,
    val loading: Boolean = false,
    val message: String? = null,
    val error: String? = null,
) {
    val canSubmit: Boolean
        get() = phone.length == 11 && code.length >= 4 && !loading
}
