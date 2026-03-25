package com.user.infinite.feature.auth

data class SetPasswordUiState(
    val phone: String = "",
    val code: String = "",
    val password: String = "",
    val confirmPassword: String = "",
    val loading: Boolean = false,
    val message: String? = null,
    val error: String? = null,
) {
    val canSubmit: Boolean
        get() =
            phone.length == 11 &&
                code.isNotBlank() &&
                password.length >= 6 &&
                confirmPassword == password &&
                !loading
}
