package com.user.infinite.feature.auth

import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.Button
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.input.PasswordVisualTransformation

@Composable
fun SetPasswordScreen(
    state: SetPasswordUiState,
    onBack: () -> Unit,
    onPasswordChange: (String) -> Unit,
    onConfirmPasswordChange: (String) -> Unit,
    onSubmit: () -> Unit,
) {
    AuthPageFrame(
        title = stringResource(R.string.auth_set_password_title),
        subtitle = stringResource(R.string.auth_set_password_subtitle, state.phone),
        onBack = onBack,
    ) {
        OutlinedTextField(
            value = state.password,
            onValueChange = onPasswordChange,
            label = { Text(stringResource(R.string.auth_password_min_label)) },
            visualTransformation = PasswordVisualTransformation(),
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
        )

        OutlinedTextField(
            value = state.confirmPassword,
            onValueChange = onConfirmPasswordChange,
            label = { Text(stringResource(R.string.auth_confirm_password_label)) },
            visualTransformation = PasswordVisualTransformation(),
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
        )

        AuthHint(text = state.message)
        AuthHint(text = state.error, isError = true)

        Button(
            onClick = onSubmit,
            enabled = state.canSubmit,
            modifier = Modifier.fillMaxWidth(),
        ) {
            Text(if (state.loading) stringResource(R.string.auth_set_password_loading) else stringResource(R.string.auth_set_password_submit))
        }
    }
}
