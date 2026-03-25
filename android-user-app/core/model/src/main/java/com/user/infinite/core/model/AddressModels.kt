package com.user.infinite.core.model

import kotlinx.serialization.Serializable

@Serializable
data class UserAddress(
    val id: String,
    val tag: String = "家",
    val name: String,
    val phone: String,
    val address: String,
    val detail: String = "",
    val lat: Double? = null,
    val lng: Double? = null,
) {
    fun fullAddress(): String {
        return listOf(address.trim(), detail.trim())
            .filter { it.isNotBlank() }
            .joinToString(" ")
    }
}
