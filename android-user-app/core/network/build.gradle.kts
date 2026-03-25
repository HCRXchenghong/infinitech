plugins {
    alias(libs.plugins.android.library)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.serialization)
}

fun escapeBuildConfigValue(value: String): String = buildString {
    append('"')
    value.forEach { ch ->
        when (ch) {
            '\\' -> append("\\\\")
            '"' -> append("\\\"")
            else -> append(ch)
        }
    }
    append('"')
}

fun normalizedApiBaseUrl(raw: String): String = raw.trim().trimEnd('/') + "/"
fun normalizedSocketUrl(raw: String): String = raw.trim().trimEnd('/')

val apiBaseUrl = providers.gradleProperty("API_BASE_URL")
    .orElse(providers.environmentVariable("API_BASE_URL"))
    .map(::normalizedApiBaseUrl)
    .orElse("http://10.0.2.2:25500/")

val socketUrl = providers.gradleProperty("SOCKET_URL")
    .orElse(providers.environmentVariable("SOCKET_URL"))
    .map(::normalizedSocketUrl)
    .orElse("http://10.0.2.2:9898")

android {
    namespace = "com.user.infinite.core.network"
    compileSdk = 35

    defaultConfig {
        minSdk = 24
        buildConfigField("String", "API_BASE_URL", escapeBuildConfigValue(apiBaseUrl.get()))
        buildConfigField("String", "SOCKET_URL", escapeBuildConfigValue(socketUrl.get()))
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }

    buildFeatures {
        buildConfig = true
    }
}

dependencies {
    implementation(project(":core:model"))
    implementation(project(":core:common"))
    implementation(project(":core:storage"))

    implementation(libs.squareup.retrofit)
    implementation(libs.squareup.retrofit.gson)
    implementation(libs.squareup.okhttp)
    implementation(libs.squareup.okhttp.logging)
    implementation(libs.kotlinx.coroutines.core)
}
