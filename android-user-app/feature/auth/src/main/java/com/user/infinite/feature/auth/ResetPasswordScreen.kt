package com.user.infinite.feature.auth

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.Button
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp

@Composable
fun ResetPasswordScreen(
    state: ResetPasswordUiState,
    onBack: () -> Unit,
    onPhoneChange: (String) -> Unit,
    onCodeChange: (String) -> Unit,
    onSendCode: () -> Unit,
    onNext: () -> Unit,
) {
    AuthPageFrame(
        title = stringResource(R.string.auth_reset_title),
        subtitle = stringResource(R.string.auth_reset_subtitle),
        onBack = onBack,
    ) {
        OutlinedTextField(
            value = state.phone,
            onValueChange = onPhoneChange,
            label = { Text(stringResource(R.string.auth_phone_label)) },
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
        )

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            OutlinedTextField(
                value = state.code,
                onValueChange = onCodeChange,
                label = { Text(stringResource(R.string.auth_code_label)) },
                singleLine = true,
                modifier = Modifier.weight(1f),
            )

            SmsCodeButton(
                sending = state.sendingCode,
                cooldown = state.codeCooldown,
                onClick = onSendCode,
            )
        }

        AuthHint(text = state.message)
        AuthHint(text = state.error, isError = true)

        Button(
            onClick = onNext,
            enabled = state.canSubmit,
            modifier = Modifier.fillMaxWidth(),
        ) {
            Text(if (state.loading) stringResource(R.string.auth_reset_verifying) else stringResource(R.string.auth_reset_next))
        }
    }
}
