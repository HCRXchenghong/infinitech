package com.user.infinite.core.model

data class Shop(
    val id: String,
    val name: String,
    val category: String = "",
    val rating: Double = 0.0,
    val monthlySales: Int = 0,
    val minPrice: Double = 0.0,
    val deliveryPrice: Double = 0.0,
    val deliveryTime: String = "",
    val distance: String = "",
    val coverImage: String? = null,
    val logo: String? = null,
    val address: String = "",
    val isActive: Boolean = true,
    val isTodayRecommended: Boolean = false,
)

data class Category(
    val id: String,
    val name: String,
    val sortOrder: Int = 0,
)

data class Banner(
    val id: String,
    val title: String = "",
    val imageUrl: String,
    val linkType: String = "",
    val linkValue: String = "",
)

data class Product(
    val id: String,
    val shopId: String = "",
    val categoryId: String = "",
    val name: String,
    val description: String = "",
    val image: String? = null,
    val images: List<String> = emptyList(),
    val price: Double = 0.0,
    val originalPrice: Double = 0.0,
    val monthlySales: Int = 0,
    val rating: Double = 0.0,
    val stock: Int = 0,
    val unit: String = "",
    val tags: List<String> = emptyList(),
    val isRecommend: Boolean = false,
)

data class CouponSummary(
    val id: String,
    val title: String,
    val discountText: String = "",
)

data class CreateOrderRequest(
    val shopId: String,
    val shopName: String,
    val userId: String,
    val items: String,
    val address: String,
    val totalPrice: Double,
    val remark: String? = null,
    val tableware: String? = null,
)

data class OrderSummary(
    val id: String,
    val shopId: String = "",
    val shopName: String = "",
    val status: String = "",
    val statusText: String = "",
    val price: Double = 0.0,
    val items: String = "",
    val createdAt: String = "",
    val isReviewed: Boolean = false,
    val bizType: String = "takeout",
)

data class OrderDetail(
    val order: OrderSummary,
    val address: String = "",
    val riderName: String = "",
    val riderPhone: String = "",
    val errandRequest: String = "",
    val rawFields: Map<String, String> = emptyMap(),
)

data class Conversation(
    val id: String,
    val name: String,
    val role: String,
    val phone: String = "",
    val avatar: String = "",
    val lastMessage: String = "",
    val updatedAt: Long = 0L,
)

data class ChatMessage(
    val id: String,
    val roomId: String,
    val senderId: String,
    val senderRole: String,
    val senderName: String,
    val content: String,
    val messageType: String,
    val imageUrl: String? = null,
    val time: String = "",
)

data class SyncMessageRequest(
    val roomId: String,
    val senderId: String,
    val senderRole: String,
    val senderName: String,
    val content: String,
    val messageType: String = "text",
)

data class AppNotification(
    val id: String,
    val title: String,
    val summary: String = "",
    val cover: String = "",
    val source: String = "",
    val createdAt: String = "",
)

data class AppNotificationDetail(
    val id: String,
    val title: String,
    val contentText: String,
    val cover: String = "",
    val source: String = "",
    val createdAt: String = "",
)

data class WalletBalance(
    val userId: String,
    val userType: String,
    val balance: Long,
    val frozenBalance: Long,
    val totalBalance: Long,
    val status: String,
)

data class WalletTransaction(
    val transactionId: String,
    val type: String,
    val status: String,
    val amount: Long,
    val createdAt: String,
    val description: String = "",
)

data class WalletRechargeRequest(
    val userId: String,
    val userType: String = "customer",
    val amount: Long,
    val paymentMethod: String = "wechat",
)

data class WalletPayRequest(
    val userId: String,
    val userType: String = "customer",
    val amount: Long,
    val orderId: String,
    val paymentMethod: String = "ifpay",
)

data class WalletWithdrawRequest(
    val userId: String,
    val userType: String = "customer",
    val amount: Long,
    val withdrawMethod: String = "ifpay",
    val withdrawAccount: String,
)

data class WalletOperationResult(
    val success: Boolean,
    val transactionId: String = "",
    val status: String = "",
    val balance: Long = 0L,
)

data class ErrandEntry(
    val id: String,
    val title: String,
    val description: String = "",
)

data class MedicineEntry(
    val id: String,
    val title: String,
    val description: String = "",
)