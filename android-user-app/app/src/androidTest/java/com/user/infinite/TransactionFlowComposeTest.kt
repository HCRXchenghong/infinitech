package com.user.infinite

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import com.user.infinite.core.model.Product
import com.user.infinite.core.model.Shop
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class TransactionFlowComposeTest {

    @get:Rule
    val composeRule = createComposeRule()

    @Test
    fun shopDetail_cartPopupAction_clickable() {
        var openCartPopupClicked = false
        val shop = Shop(id = "shop-1", name = "Demo Shop")
        val product = Product(id = "product-1", shopId = shop.id, name = "Milk Tea", price = 12.0)

        composeRule.setContent {
            ShopDetailScreen(
                state = ShopsUiState(
                    selectedShop = shop,
                    menu = listOf(product),
                    cart = mapOf(product.id to 1),
                ),
                onBack = {},
                onAddToCart = {},
                onRemoveFromCart = {},
                onOpenProductDetail = {},
                onOpenCartPopup = { openCartPopupClicked = true },
                onCheckout = {},
            )
        }

        composeRule.onNodeWithText("Cart").assertIsDisplayed().performClick()
        assertTrue(openCartPopupClicked)
    }

    @Test
    fun orderConfirm_emptyAddress_showsValidationAndBlocksSubmit() {
        val context = InstrumentationRegistry.getInstrumentation().targetContext
        val submitDesc = context.getString(R.string.submit_order)
        val addressRequired = context.getString(R.string.order_confirm_address_required)

        var submitted = false
        val shop = Shop(id = "shop-2", name = "Demo Shop 2")
        val product = Product(id = "product-2", shopId = shop.id, name = "Fried Rice", price = 18.0)

        composeRule.setContent {
            OrderConfirmScreen(
                state = ShopsUiState(selectedShop = shop),
                products = listOf(product to 1),
                totalPrice = 18.0,
                selectedAddress = null,
                onBack = {},
                onOpenAddressSelector = {},
                onOpenAddressEditor = {},
                onSubmit = { _, _, _ -> submitted = true },
            )
        }

        composeRule.onNodeWithContentDescription(submitDesc).performClick()
        composeRule.onNodeWithText(addressRequired).assertIsDisplayed()
        assertFalse(submitted)
    }
}
