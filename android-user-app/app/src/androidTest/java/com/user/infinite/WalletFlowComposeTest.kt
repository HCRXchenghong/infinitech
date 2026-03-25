package com.user.infinite

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.hasSetTextAction
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performTextInput
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import com.user.infinite.core.model.WalletTransaction
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class WalletFlowComposeTest {

    @get:Rule
    val composeRule = createComposeRule()

    @Test
    fun walletRecharge_submitCallbackReceivesAmount() {
        val context = InstrumentationRegistry.getInstrumentation().targetContext
        val submitText = context.getString(R.string.wallet_submit_recharge)
        var submittedAmount = 0L

        composeRule.setContent {
            WalletRechargeScreen(
                recharging = false,
                lastOperation = null,
                error = null,
                onBack = {},
                onSubmit = { amount -> submittedAmount = amount },
            )
        }

        composeRule.onAllNodes(hasSetTextAction())[0].performTextInput("520")
        composeRule.onNodeWithText(submitText).performClick()
        assertEquals(520L, submittedAmount)
    }

    @Test
    fun walletWithdraw_submitCallbackReceivesFormValues() {
        val context = InstrumentationRegistry.getInstrumentation().targetContext
        val submitText = context.getString(R.string.wallet_submit_withdraw)
        var receivedAmount = 0L
        var receivedAccount = ""

        composeRule.setContent {
            WalletWithdrawScreen(
                withdrawing = false,
                lastOperation = null,
                error = null,
                onBack = {},
                onSubmit = { amount, account ->
                    receivedAmount = amount
                    receivedAccount = account
                },
            )
        }

        composeRule.onAllNodes(hasSetTextAction())[0].performTextInput("300")
        composeRule.onAllNodes(hasSetTextAction())[1].performTextInput("test-account")
        composeRule.onNodeWithText(submitText).performClick()

        assertEquals(300L, receivedAmount)
        assertEquals("test-account", receivedAccount)
    }

    @Test
    fun walletBills_renderTransactions() {
        val tx = WalletTransaction(
            transactionId = "tx-1",
            type = "recharge",
            status = "success",
            amount = 1000L,
            createdAt = "2026-02-27 20:00:00",
            description = "test tx",
        )

        composeRule.setContent {
            WalletBillsScreen(
                loading = false,
                transactions = listOf(tx),
                error = null,
                onBack = {},
                onRefresh = {},
            )
        }

        composeRule.onNodeWithText("test tx").assertIsDisplayed()
        assertTrue(true)
    }
}
