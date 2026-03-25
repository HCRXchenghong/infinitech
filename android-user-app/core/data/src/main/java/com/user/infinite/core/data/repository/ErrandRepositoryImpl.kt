package com.user.infinite.core.data.repository

import com.user.infinite.core.common.ApiResult
import com.user.infinite.core.model.ErrandEntry
import com.user.infinite.core.model.repository.ErrandRepository

class ErrandRepositoryImpl : ErrandRepository {

    override suspend fun fetchHomeEntries(): ApiResult<List<ErrandEntry>> {
        return ApiResult.Success(
            listOf(
                ErrandEntry(id = "buy", title = "帮我买", description = "超市代购和代买服务"),
                ErrandEntry(id = "deliver", title = "帮我送", description = "同城文件与物品急送"),
                ErrandEntry(id = "pickup", title = "帮我取", description = "快递和门店取件"),
                ErrandEntry(id = "do", title = "帮我办", description = "排队、代办和上门服务"),
            ),
        )
    }
}
