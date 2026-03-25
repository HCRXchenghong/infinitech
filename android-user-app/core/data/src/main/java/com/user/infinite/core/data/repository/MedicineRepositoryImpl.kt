package com.user.infinite.core.data.repository

import com.user.infinite.core.common.ApiResult
import com.user.infinite.core.model.MedicineEntry
import com.user.infinite.core.model.repository.MedicineRepository

class MedicineRepositoryImpl : MedicineRepository {

    override suspend fun fetchHomeEntries(): ApiResult<List<MedicineEntry>> {
        return ApiResult.Success(
            listOf(
                MedicineEntry(id = "consult", title = "在线问药", description = "药师图文咨询"),
                MedicineEntry(id = "order", title = "购药下单", description = "药店下单配送到家"),
                MedicineEntry(id = "tracking", title = "配送追踪", description = "实时查看配送进度"),
            ),
        )
    }
}
