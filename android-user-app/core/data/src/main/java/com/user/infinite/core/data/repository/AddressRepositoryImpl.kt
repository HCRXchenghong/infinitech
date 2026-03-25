package com.user.infinite.core.data.repository

import com.user.infinite.core.common.ApiResult
import com.user.infinite.core.model.UserAddress
import com.user.infinite.core.model.repository.AddressRepository
import com.user.infinite.core.storage.JsonDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import kotlinx.serialization.builtins.ListSerializer

private const val ADDRESS_LIST_KEY = "profile_addresses"
private const val SELECTED_ADDRESS_ID_KEY = "profile_selected_address_id"

class AddressRepositoryImpl(
    private val dataStore: JsonDataStore,
) : AddressRepository {

    override fun observeAddresses(): Flow<List<UserAddress>> {
        return dataStore.observe(
            key = ADDRESS_LIST_KEY,
            defaultValue = defaultAddresses,
            deserialize = { raw ->
                dataStore.json().decodeFromString(ListSerializer(UserAddress.serializer()), raw)
            },
        )
    }

    override fun observeSelectedAddress(): Flow<UserAddress?> {
        return combine(observeAddresses(), observeSelectedAddressId()) { addresses, selectedId ->
            val matched = addresses.firstOrNull { it.id == selectedId }
            matched ?: addresses.firstOrNull()
        }
    }

    override suspend fun upsertAddress(address: UserAddress): ApiResult<UserAddress> {
        val normalized = normalize(address)

        if (normalized.name.isBlank() || normalized.phone.isBlank() || normalized.address.isBlank()) {
            return ApiResult.Failure(
                code = 400,
                message = "请填写地址信息",
                recoverable = true,
            )
        }

        if (!PHONE_REGEX.matches(normalized.phone)) {
            return ApiResult.Failure(
                code = 400,
                message = "手机号格式不正确",
                recoverable = true,
            )
        }

        val current = observeAddresses().first().toMutableList()
        val index = current.indexOfFirst { it.id == normalized.id }
        if (index >= 0) {
            current[index] = normalized
        } else {
            current.add(normalized)
        }

        saveAddresses(current)

        val selectedId = observeSelectedAddressId().first()
        if (selectedId.isNullOrBlank()) {
            saveSelectedAddressId(normalized.id)
        }

        return ApiResult.Success(normalized)
    }

    override suspend fun deleteAddress(addressId: String): ApiResult<Boolean> {
        val id = addressId.trim()
        if (id.isBlank()) {
            return ApiResult.Failure(
                code = 400,
                message = "地址不存在",
                recoverable = true,
            )
        }

        val current = observeAddresses().first()
        val updated = current.filterNot { it.id == id }
        if (updated.size == current.size) {
            return ApiResult.Failure(
                code = 404,
                message = "未找到该地址",
                recoverable = true,
            )
        }

        saveAddresses(updated)

        val selectedId = observeSelectedAddressId().first()
        if (selectedId == id) {
            saveSelectedAddressId(updated.firstOrNull()?.id.orEmpty())
        }

        return ApiResult.Success(true)
    }

    override suspend fun selectAddress(addressId: String): ApiResult<Boolean> {
        val id = addressId.trim()
        if (id.isBlank()) {
            return ApiResult.Failure(
                code = 400,
                message = "地址不存在",
                recoverable = true,
            )
        }

        val addresses = observeAddresses().first()
        if (addresses.none { it.id == id }) {
            return ApiResult.Failure(
                code = 404,
                message = "未找到该地址",
                recoverable = true,
            )
        }

        saveSelectedAddressId(id)
        return ApiResult.Success(true)
    }

    private fun observeSelectedAddressId(): Flow<String?> {
        return dataStore.observe(
            key = SELECTED_ADDRESS_ID_KEY,
            defaultValue = "",
            deserialize = { it },
        ).map { raw ->
            raw.takeIf { it.isNotBlank() }
        }
    }

    private suspend fun saveAddresses(addresses: List<UserAddress>) {
        val encoded = dataStore.json().encodeToString(ListSerializer(UserAddress.serializer()), addresses)
        dataStore.saveRaw(ADDRESS_LIST_KEY, encoded)
    }

    private suspend fun saveSelectedAddressId(addressId: String) {
        dataStore.saveRaw(SELECTED_ADDRESS_ID_KEY, addressId)
    }

    private fun normalize(address: UserAddress): UserAddress {
        val cleanedId = address.id.trim().ifBlank { generateAddressId() }
        return address.copy(
            id = cleanedId,
            tag = address.tag.trim().ifBlank { "家" },
            name = address.name.trim(),
            phone = address.phone.trim(),
            address = address.address.trim(),
            detail = address.detail.trim(),
        )
    }

    private fun generateAddressId(): String {
        return "addr_${System.currentTimeMillis()}_${(100..999).random()}"
    }

    private companion object {
        val PHONE_REGEX = Regex("^1\\d{10}$")

        val defaultAddresses = listOf(
            UserAddress(
                id = "addr_default_home",
                tag = "家",
                name = "张三",
                phone = "13800008888",
                address = "腾讯大厦A座",
                detail = "18楼",
            ),
        )
    }
}
