package com.user.infinite.core.data.repository

import com.google.gson.JsonArray
import com.google.gson.JsonElement
import com.google.gson.JsonObject
import com.user.infinite.core.model.AppNotification
import com.user.infinite.core.model.AppNotificationDetail
import com.user.infinite.core.model.Banner
import com.user.infinite.core.model.Category
import com.user.infinite.core.model.ChatMessage
import com.user.infinite.core.model.Conversation
import com.user.infinite.core.model.CouponSummary
import com.user.infinite.core.model.OrderDetail
import com.user.infinite.core.model.OrderSummary
import com.user.infinite.core.model.Product
import com.user.infinite.core.model.Shop
import com.user.infinite.core.model.UserProfile
import com.user.infinite.core.model.WalletBalance
import com.user.infinite.core.model.WalletOperationResult
import com.user.infinite.core.model.WalletTransaction

internal fun parseShopCategoryNames(root: JsonElement): List<String> {
    val unwrapped = unwrapData(root)
    if (unwrapped.isJsonArray) {
        return parseStringOrObjectNames(unwrapped.asJsonArray)
    }

    if (unwrapped.isJsonObject) {
        val obj = unwrapped.asJsonObject
        obj.optArray("list", "categories", "items")?.let { return parseStringOrObjectNames(it) }
    }

    return emptyList()
}

internal fun parseShopList(root: JsonElement): List<Shop> {
    val list = extractArray(root, "list", "shops", "items")
    if (list.isNotEmpty()) {
        return list.mapNotNull { it.toShopOrNull() }
    }

    val unwrapped = unwrapData(root)
    if (unwrapped.isJsonObject) {
        return listOfNotNull(unwrapped.asJsonObject.toShopOrNull())
    }

    return emptyList()
}

internal fun parseCategoryList(root: JsonElement): List<Category> {
    val list = extractArray(root, "list", "categories", "items")
    if (list.isNotEmpty()) {
        return list.mapNotNull { it.toCategoryOrNull() }
    }

    val unwrapped = unwrapData(root)
    if (unwrapped.isJsonObject) {
        return listOfNotNull(unwrapped.asJsonObject.toCategoryOrNull())
    }

    return emptyList()
}

internal fun parseProductList(root: JsonElement): List<Product> {
    val list = extractArray(root, "list", "products", "items", "menu")
    if (list.isNotEmpty()) {
        return list.mapNotNull { it.toProductOrNull() }
    }

    val unwrapped = unwrapData(root)
    if (unwrapped.isJsonObject) {
        return listOfNotNull(unwrapped.asJsonObject.toProductOrNull())
    }

    return emptyList()
}

internal fun parseBannerList(root: JsonElement): List<Banner> {
    val list = extractArray(root, "list", "banners", "items")
    if (list.isNotEmpty()) {
        return list.mapNotNull { it.toBannerOrNull() }
    }

    val unwrapped = unwrapData(root)
    if (unwrapped.isJsonObject) {
        return listOfNotNull(unwrapped.asJsonObject.toBannerOrNull())
    }

    return emptyList()
}

internal fun parseCouponList(root: JsonElement): List<CouponSummary> {
    val list = extractArray(root, "list", "coupons", "items")
    if (list.isNotEmpty()) {
        return list.mapNotNull { it.toCouponOrNull() }
    }

    val unwrapped = unwrapData(root)
    if (unwrapped.isJsonObject) {
        return listOfNotNull(unwrapped.asJsonObject.toCouponOrNull())
    }

    return emptyList()
}

internal fun parseOrderSummaryList(root: JsonElement): List<OrderSummary> {
    val list = extractArray(root, "list", "orders", "items")
    if (list.isNotEmpty()) {
        return list.mapNotNull { it.toOrderSummaryOrNull() }
    }

    val unwrapped = unwrapData(root)
    if (unwrapped.isJsonObject) {
        return listOfNotNull(unwrapped.asJsonObject.toOrderSummaryOrNull())
    }

    return emptyList()
}

internal fun parseOrderSummary(root: JsonElement): OrderSummary? {
    val unwrapped = unwrapData(root)
    return if (unwrapped.isJsonObject) {
        unwrapped.asJsonObject.toOrderSummaryOrNull()
    } else {
        null
    }
}

internal fun parseOrderDetail(root: JsonElement): OrderDetail? {
    val unwrapped = unwrapData(root)
    if (!unwrapped.isJsonObject) return null

    val obj = unwrapped.asJsonObject
    val summary = obj.toOrderSummaryOrNull() ?: return null

    val rawFields = obj.entrySet().associate { entry ->
        entry.key to entry.value.asRawString()
    }

    return OrderDetail(
        order = summary,
        address = obj.optString("address").orEmpty(),
        riderName = obj.optString("riderName", "rider_name").orEmpty(),
        riderPhone = obj.optString("riderPhone", "rider_phone").orEmpty(),
        errandRequest = obj.optString("errandRequest", "errand_request").orEmpty(),
        rawFields = rawFields,
    )
}

internal fun parseConversationList(root: JsonElement): List<Conversation> {
    val list = extractArray(root, "list", "conversations", "items")
    if (list.isNotEmpty()) {
        return list.mapNotNull { it.toConversationOrNull() }
    }

    val unwrapped = unwrapData(root)
    if (unwrapped.isJsonObject) {
        return listOfNotNull(unwrapped.asJsonObject.toConversationOrNull())
    }

    return emptyList()
}

internal fun parseConversation(root: JsonElement): Conversation? {
    val unwrapped = unwrapData(root)
    return if (unwrapped.isJsonObject) {
        unwrapped.asJsonObject.toConversationOrNull()
    } else {
        null
    }
}

internal fun parseChatMessageList(root: JsonElement): List<ChatMessage> {
    val list = extractArray(root, "list", "messages", "items")
    if (list.isNotEmpty()) {
        return list.mapNotNull { it.toChatMessageOrNull() }
    }

    val unwrapped = unwrapData(root)
    if (unwrapped.isJsonObject) {
        return listOfNotNull(unwrapped.asJsonObject.toChatMessageOrNull())
    }

    return emptyList()
}

internal fun parseChatMessage(root: JsonElement): ChatMessage? {
    val unwrapped = unwrapData(root)
    return if (unwrapped.isJsonObject) {
        unwrapped.asJsonObject.toChatMessageOrNull()
    } else {
        null
    }
}

internal fun parseNotificationList(root: JsonElement): List<AppNotification> {
    val list = extractArray(root, "list", "items")
    if (list.isNotEmpty()) {
        return list.mapNotNull { it.toNotificationOrNull() }
    }

    val unwrapped = unwrapData(root)
    if (unwrapped.isJsonObject) {
        return listOfNotNull(unwrapped.asJsonObject.toNotificationOrNull())
    }

    return emptyList()
}

internal fun parseNotificationDetail(root: JsonElement): AppNotificationDetail? {
    val unwrapped = unwrapData(root)
    return if (unwrapped.isJsonObject) {
        unwrapped.asJsonObject.toNotificationDetailOrNull()
    } else {
        null
    }
}

internal fun parseUserProfile(root: JsonElement): UserProfile? {
    val unwrapped = unwrapData(root)
    if (!unwrapped.isJsonObject) return null

    val obj = unwrapped.asJsonObject
    val id = obj.optString("id", "uid", "userId", "phone")?.trim().orEmpty()
    if (id.isBlank()) return null

    val nickname = obj.optString("nickname", "name") ?: "yuexiang user"
    return UserProfile(
        id = id,
        phone = obj.optString("phone").orEmpty(),
        nickname = nickname,
        avatarUrl = obj.optString("avatarUrl", "avatar", "avatar_url"),
    )
}

internal fun parseWalletBalance(root: JsonElement): WalletBalance? {
    val unwrapped = unwrapData(root)
    if (!unwrapped.isJsonObject) return null

    val obj = unwrapped.asJsonObject
    val userId = obj.optString("userId", "user_id")?.trim().orEmpty()
    if (userId.isBlank()) return null

    return WalletBalance(
        userId = userId,
        userType = obj.optString("userType", "user_type") ?: "customer",
        balance = obj.optLong("balance"),
        frozenBalance = obj.optLong("frozenBalance", "frozen_balance"),
        totalBalance = obj.optLong("totalBalance", "total_balance"),
        status = obj.optString("status") ?: "active",
    )
}

internal fun parseWalletTransactionList(root: JsonElement): List<WalletTransaction> {
    val list = extractArray(root, "items", "list", "records")
    if (list.isEmpty()) return emptyList()

    return list.mapNotNull { obj ->
        val id = obj.optString("transactionId", "transaction_id", "id")?.trim().orEmpty()
        if (id.isBlank()) return@mapNotNull null

        WalletTransaction(
            transactionId = id,
            type = obj.optString("type") ?: "unknown",
            status = obj.optString("status") ?: "unknown",
            amount = obj.optLong("amount"),
            createdAt = obj.optString("createdAt", "created_at").orEmpty(),
            description = obj.optString("description", "remark").orEmpty(),
        )
    }
}

internal fun parseWalletOperationResult(root: JsonElement): WalletOperationResult {
    val unwrapped = unwrapData(root)
    if (!unwrapped.isJsonObject) {
        return WalletOperationResult(success = false)
    }

    val obj = unwrapped.asJsonObject
    val status = obj.optString("status").orEmpty()
    val success = obj.optBoolean("success") || status in setOf("success", "pending", "paid")

    return WalletOperationResult(
        success = success,
        transactionId = obj.optString("transactionId", "transaction_id").orEmpty(),
        status = status,
        balance = obj.optLong("balance"),
    )
}

internal fun parseBooleanResult(root: JsonElement): Boolean {
    val unwrapped = unwrapData(root)

    if (unwrapped.isJsonPrimitive) {
        return runCatching { unwrapped.asBoolean }.getOrDefault(false)
    }

    if (!unwrapped.isJsonObject) {
        return false
    }

    val obj = unwrapped.asJsonObject
    return obj.optBoolean("success", "isFavorite", "favorited", "isFavorited", "isCollected") ||
        obj.optString("status") == "success"
}

internal fun parseSocketToken(root: JsonElement): String {
    val unwrapped = unwrapData(root)
    return when {
        unwrapped.isJsonPrimitive -> runCatching { unwrapped.asString }.getOrDefault("")
        unwrapped.isJsonObject -> unwrapped.asJsonObject.optString("token").orEmpty()
        else -> ""
    }
}

private fun JsonObject.toShopOrNull(): Shop? {
    val id = optString("id", "uid", "shopId", "shop_id", "legacyId")?.trim().orEmpty()
    if (id.isBlank()) return null

    return Shop(
        id = id,
        name = optString("name", "shopName").orEmpty(),
        category = optString("businessCategory", "business_category", "category", "orderType").orEmpty(),
        rating = optDouble("rating", "avgRating"),
        monthlySales = optInt("monthlySales", "monthly_sales"),
        minPrice = optDouble("minPrice", "min_price"),
        deliveryPrice = optDouble("deliveryPrice", "delivery_price"),
        deliveryTime = optString("deliveryTime", "delivery_time").orEmpty(),
        distance = optString("distance").orEmpty(),
        coverImage = optString("coverImage", "cover_image", "image"),
        logo = optString("logo"),
        address = optString("address").orEmpty(),
        isActive = if (has("isActive") || has("is_active")) {
            optBoolean("isActive", "is_active")
        } else {
            true
        },
        isTodayRecommended = optBoolean("isTodayRecommended", "is_today_recommended"),
    )
}

private fun JsonObject.toCategoryOrNull(): Category? {
    val id = optString("id", "uid", "categoryId", "category_id", "legacyId")?.trim().orEmpty()
    if (id.isBlank()) return null

    return Category(
        id = id,
        name = optString("name", "title").orEmpty(),
        sortOrder = optInt("sortOrder", "sort_order"),
    )
}

private fun JsonObject.toProductOrNull(): Product? {
    val id = optString("id", "uid", "productId", "product_id", "legacyId")?.trim().orEmpty()
    if (id.isBlank()) return null

    return Product(
        id = id,
        shopId = optString("shopId", "shop_id").orEmpty(),
        categoryId = optString("categoryId", "category_id").orEmpty(),
        name = optString("name", "title").orEmpty(),
        description = optString("description", "desc").orEmpty(),
        image = optString("image", "coverImage", "cover_image"),
        images = optStringList("images"),
        price = optDouble("price"),
        originalPrice = optDouble("originalPrice", "original_price"),
        monthlySales = optInt("monthlySales", "monthly_sales"),
        rating = optDouble("rating", "avgRating"),
        stock = optInt("stock"),
        unit = optString("unit").orEmpty(),
        tags = optStringList("tags"),
        isRecommend = optBoolean("isRecommend", "is_recommend", "isFeatured", "is_featured"),
    )
}

private fun JsonObject.toBannerOrNull(): Banner? {
    val id = optString("id", "uid", "bannerId", "banner_id", "legacyId")?.trim().orEmpty()
    if (id.isBlank()) return null

    return Banner(
        id = id,
        title = optString("title").orEmpty(),
        imageUrl = optString("imageUrl", "image_url", "coverImage", "cover_image").orEmpty(),
        linkType = optString("linkType", "link_type").orEmpty(),
        linkValue = optString("linkValue", "link_value").orEmpty(),
    )
}

private fun JsonObject.toCouponOrNull(): CouponSummary? {
    val id = optString("id", "uid", "couponId", "coupon_id", "legacyId")?.trim().orEmpty()
    if (id.isBlank()) return null

    return CouponSummary(
        id = id,
        title = optString("title", "name").orEmpty(),
        discountText = optString("discountText", "discount_text", "discount", "description").orEmpty(),
    )
}

private fun JsonObject.toOrderSummaryOrNull(): OrderSummary? {
    val id = optString("id", "uid", "orderId", "order_id", "daily_order_id", "legacyId")?.trim().orEmpty()
    if (id.isBlank()) return null

    return OrderSummary(
        id = id,
        shopId = optString("shopId", "shop_id").orEmpty(),
        shopName = optString("shopName", "shop_name").orEmpty(),
        status = optString("status").orEmpty(),
        statusText = optString("statusText", "status_text").orEmpty(),
        price = optDouble("price", "totalPrice", "total_price", "amount"),
        items = optString("items", "food_request").orEmpty(),
        createdAt = optString("createdAt", "created_at", "time").orEmpty(),
        isReviewed = optBoolean("isReviewed", "is_reviewed"),
        bizType = optString("bizType", "biz_type") ?: "takeout",
    )
}

private fun JsonObject.toConversationOrNull(): Conversation? {
    val id = optString("id", "chatId", "chat_id")?.trim().orEmpty()
    if (id.isBlank()) return null

    return Conversation(
        id = id,
        name = optString("name", "targetName", "target_name").orEmpty(),
        role = optString("role", "targetType", "target_type", "senderRole", "sender_role") ?: "user",
        phone = optString("phone", "targetPhone", "target_phone").orEmpty(),
        avatar = optString("avatar", "targetAvatar", "target_avatar").orEmpty(),
        lastMessage = optString("lastMessage", "msg", "content").orEmpty(),
        updatedAt = optLong("updatedAt", "updated_at"),
    )
}

private fun JsonObject.toChatMessageOrNull(): ChatMessage? {
    val id = optString("id", "messageId", "message_id")?.trim().orEmpty()
    if (id.isBlank()) return null

    val roomId = optString("roomId", "chatId", "chat_id").orEmpty()

    return ChatMessage(
        id = id,
        roomId = roomId,
        senderId = optString("senderId", "sender_id").orEmpty(),
        senderRole = optString("senderRole", "sender_role").orEmpty(),
        senderName = optString("sender", "senderName", "sender_name").orEmpty(),
        content = optString("content").orEmpty(),
        messageType = optString("messageType", "message_type") ?: "text",
        imageUrl = optString("imageUrl", "image_url"),
        time = optString("time", "createdAt", "created_at").orEmpty(),
    )
}

private fun JsonObject.toNotificationOrNull(): AppNotification? {
    val id = optString("id", "uid", "notificationId", "notification_id", "legacyId")?.trim().orEmpty()
    if (id.isBlank()) return null

    return AppNotification(
        id = id,
        title = optString("title").orEmpty(),
        summary = optString("summary", "content", "description").orEmpty(),
        cover = optString("cover", "coverImage", "cover_image").orEmpty(),
        source = optString("source").orEmpty(),
        createdAt = optString("createdAt", "created_at", "time").orEmpty(),
    )
}

private fun JsonObject.toNotificationDetailOrNull(): AppNotificationDetail? {
    val id = optString("id", "uid", "notificationId", "notification_id", "legacyId")?.trim().orEmpty()
    if (id.isBlank()) return null

    val contentText = when {
        has("content") -> {
            val content = get("content")
            when {
                content.isJsonPrimitive -> runCatching { content.asString }.getOrDefault("")
                content.isJsonObject || content.isJsonArray -> content.toString()
                else -> ""
            }
        }

        has("summary") -> optString("summary").orEmpty()
        else -> ""
    }

    return AppNotificationDetail(
        id = id,
        title = optString("title").orEmpty(),
        contentText = contentText,
        cover = optString("cover", "coverImage", "cover_image").orEmpty(),
        source = optString("source").orEmpty(),
        createdAt = optString("createdAt", "created_at", "time").orEmpty(),
    )
}

private fun parseStringOrObjectNames(array: JsonArray): List<String> {
    return array.mapNotNull { element ->
        when {
            element == null -> null
            element.isJsonPrimitive -> runCatching { element.asString }.getOrNull()
            element.isJsonObject -> element.asJsonObject.optString("name", "title", "category")
            else -> null
        }
    }.map { it.trim() }.filter { it.isNotBlank() }
}

private fun JsonObject.optStringList(vararg keys: String): List<String> {
    val array = optArray(*keys)
    if (array != null) {
        return array.mapNotNull { entry ->
            runCatching { entry.asString }.getOrNull()
        }.map { it.trim() }.filter { it.isNotBlank() }
    }

    val inline = optString(*keys).orEmpty()
    if (inline.startsWith("[") && inline.endsWith("]")) {
        val parsed = runCatching { com.google.gson.JsonParser.parseString(inline) }.getOrNull()
        if (parsed != null && parsed.isJsonArray) {
            return parsed.asJsonArray.mapNotNull { runCatching { it.asString }.getOrNull() }
                .map { it.trim() }
                .filter { it.isNotBlank() }
        }
    }

    return inline
        .split(',', ';', '|')
        .map { it.trim() }
        .filter { it.isNotBlank() }
}

private fun JsonElement.asRawString(): String {
    if (isJsonNull) return ""
    return runCatching { asString }.getOrElse { toString() }
}
