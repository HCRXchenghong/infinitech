package com.user.infinite

import androidx.compose.runtime.mutableStateOf
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import com.user.infinite.core.model.OrderDetail
import com.user.infinite.core.model.OrderSummary
import com.user.infinite.core.model.Product
import com.user.infinite.core.model.Shop
import com.user.infinite.core.model.UserAddress
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class TransactionE2EComposeTest {

    @get:Rule
    val composeRule = createComposeRule()

    @Test
    fun submitOrder_paySuccess_openDetail_andTriggerReviewRefund() {
        val context = InstrumentationRegistry.getInstrumentation().targetContext
        val submitActionDesc = context.getString(R.string.submit_order)
        val viewOrderText = context.getString(R.string.additional_view_order)
        val writeReviewText = context.getString(R.string.write_review)
        val requestRefundText = context.getString(R.string.request_refund)

        val orderId = "order-e2e-1"
        val shop = Shop(id = "shop-e2e-1", name = "E2E Shop")
        val product = Product(id = "product-e2e-1", shopId = shop.id, name = "Noodle Set", price = 22.0)
        val address = UserAddress(
            id = "address-e2e-1",
            name = "Tester",
            phone = "13800138000",
            address = "Test Road",
            detail = "No.1",
        )
        val detail = OrderDetail(
            order = OrderSummary(
                id = orderId,
                shopId = shop.id,
                shopName = shop.name,
                status = "paid",
                statusText = "已支付",
                price = 22.0,
                createdAt = "2026-02-27 21:00:00",
                isReviewed = false,
            ),
            address = address.fullAddress(),
            riderName = "Rider A",
            riderPhone = "18800000000",
        )

        val step = mutableStateOf(FlowStep.CONFIRM)
        var submittedAddress = ""
        var viewedOrder = false
        var reviewOrderId = ""
        var refundOrderId = ""

        composeRule.setContent {
            when (step.value) {
                FlowStep.CONFIRM -> OrderConfirmScreen(
                    state = ShopsUiState(selectedShop = shop),
                    products = listOf(product to 1),
                    totalPrice = 22.0,
                    selectedAddress = address,
                    onBack = {},
                    onOpenAddressSelector = {},
                    onOpenAddressEditor = {},
                    onSubmit = { addr, _, _ ->
                        submittedAddress = addr
                        step.value = FlowStep.PAY_SUCCESS
                    },
                )

                FlowStep.PAY_SUCCESS -> PaySuccessScreen(
                    orderId = orderId,
                    onBackHome = {},
                    onViewOrder = {
                        viewedOrder = true
                        step.value = FlowStep.DETAIL
                    },
                )

                FlowStep.DETAIL -> OrderDetailScreen(
                    detail = detail,
                    loading = false,
                    error = null,
                    onBack = {},
                    onOpenReview = { reviewOrderId = it },
                    onOpenRefund = { refundOrderId = it },
                )
            }
        }

        composeRule.onNodeWithContentDescription(submitActionDesc).assertIsDisplayed().performClick()
        composeRule.runOnIdle {
            assertEquals(address.fullAddress(), submittedAddress)
            assertEquals(FlowStep.PAY_SUCCESS, step.value)
        }

        composeRule.onNodeWithText(viewOrderText).assertIsDisplayed().performClick()
        composeRule.runOnIdle {
            assertTrue(viewedOrder)
            assertEquals(FlowStep.DETAIL, step.value)
        }

        composeRule.onNodeWithText(writeReviewText).assertIsDisplayed().performClick()
        composeRule.onNodeWithText(requestRefundText).assertIsDisplayed().performClick()
        composeRule.runOnIdle {
            assertEquals(orderId, reviewOrderId)
            assertEquals(orderId, refundOrderId)
        }
    }

    private enum class FlowStep {
        CONFIRM,
        PAY_SUCCESS,
        DETAIL,
    }
}
