package com.user.infinite.feature.auth

data class AuthUiState(
    val phone: String = "",
    val password: String = "",
    val loading: Boolean = false,
    val error: String? = null,
) {
    val canLogin: Boolean
        get() = phone.trim().length == 11 && password.isNotBlank() && !loading
}
