package com.user.infinite.core.network

import com.user.infinite.core.network.api.AuthApi
import com.user.infinite.core.network.api.MessageApi
import com.user.infinite.core.network.api.OrderApi
import com.user.infinite.core.network.api.ProductApi
import com.user.infinite.core.network.api.ShopApi
import com.user.infinite.core.network.api.SocketTokenApi
import com.user.infinite.core.network.api.SyncApi
import com.user.infinite.core.network.api.UserApi
import com.user.infinite.core.network.api.WalletApi
import com.user.infinite.core.network.interceptor.AuthTokenAuthenticator
import com.user.infinite.core.network.interceptor.AuthTokenInterceptor
import com.user.infinite.core.storage.AuthSessionStore
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

class AppNetwork(authSessionStore: AuthSessionStore) {

    private val loggingInterceptor = HttpLoggingInterceptor().apply {
        level = HttpLoggingInterceptor.Level.BASIC
    }

    private val refreshClient: OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(ApiConfig.CONNECT_TIMEOUT_SECONDS, TimeUnit.SECONDS)
        .readTimeout(ApiConfig.READ_TIMEOUT_SECONDS, TimeUnit.SECONDS)
        .addInterceptor(loggingInterceptor)
        .build()

    private val refreshRetrofit: Retrofit = Retrofit.Builder()
        .baseUrl(ApiConfig.BASE_URL)
        .client(refreshClient)
        .addConverterFactory(GsonConverterFactory.create())
        .build()

    private val refreshAuthApi: AuthApi = refreshRetrofit.create(AuthApi::class.java)

    private val httpClient: OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(ApiConfig.CONNECT_TIMEOUT_SECONDS, TimeUnit.SECONDS)
        .readTimeout(ApiConfig.READ_TIMEOUT_SECONDS, TimeUnit.SECONDS)
        .addInterceptor(AuthTokenInterceptor(authSessionStore))
        .authenticator(AuthTokenAuthenticator(authSessionStore, refreshAuthApi))
        .addInterceptor(loggingInterceptor)
        .build()

    private val retrofit: Retrofit = Retrofit.Builder()
        .baseUrl(ApiConfig.BASE_URL)
        .client(httpClient)
        .addConverterFactory(GsonConverterFactory.create())
        .build()

    private val socketRetrofit: Retrofit = Retrofit.Builder()
        .baseUrl(ApiConfig.SOCKET_URL.trimEnd('/') + "/")
        .client(refreshClient)
        .addConverterFactory(GsonConverterFactory.create())
        .build()

    val authApi: AuthApi = retrofit.create(AuthApi::class.java)
    val shopApi: ShopApi = retrofit.create(ShopApi::class.java)
    val productApi: ProductApi = retrofit.create(ProductApi::class.java)
    val orderApi: OrderApi = retrofit.create(OrderApi::class.java)
    val messageApi: MessageApi = retrofit.create(MessageApi::class.java)
    val userApi: UserApi = retrofit.create(UserApi::class.java)
    val walletApi: WalletApi = retrofit.create(WalletApi::class.java)
    val syncApi: SyncApi = retrofit.create(SyncApi::class.java)

    val socketTokenApi: SocketTokenApi = socketRetrofit.create(SocketTokenApi::class.java)
}
