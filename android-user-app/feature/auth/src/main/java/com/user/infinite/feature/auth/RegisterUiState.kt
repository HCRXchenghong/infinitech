package com.user.infinite.feature.auth

data class RegisterUiState(
    val nickname: String = "",
    val phone: String = "",
    val code: String = "",
    val password: String = "",
    val confirmPassword: String = "",
    val sendingCode: Boolean = false,
    val codeCooldown: Int = 0,
    val loading: Boolean = false,
    val needCaptcha: Boolean = false,
    val message: String? = null,
    val error: String? = null,
) {
    val canSubmit: Boolean
        get() =
            nickname.isNotBlank() &&
                phone.length == 11 &&
                code.length >= 4 &&
                password.length >= 6 &&
                confirmPassword == password &&
                !loading
}
