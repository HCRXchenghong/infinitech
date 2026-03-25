package com.user.infinite

import org.junit.Assert.assertEquals
import org.junit.Test

class RouteResolverTest {

    @Test
    fun resolveErrandRoute_prioritizesServiceId() {
        assertEquals("errand_buy/buy", resolveErrandRoute(serviceId = "buy", title = "foo"))
        assertEquals("errand_deliver/deliver", resolveErrandRoute(serviceId = "deliver", title = "foo"))
        assertEquals("errand_pickup/pickup", resolveErrandRoute(serviceId = "pickup", title = "foo"))
        assertEquals("errand_do/do", resolveErrandRoute(serviceId = "do", title = "foo"))
    }

    @Test
    fun resolveErrandRoute_fallsBackToKeywords() {
        assertEquals("errand_buy/x1", resolveErrandRoute(serviceId = "x1", title = "buy now"))
        assertEquals("errand_deliver/x2", resolveErrandRoute(serviceId = "x2", title = "express deliver"))
        assertEquals("errand_pickup/x3", resolveErrandRoute(serviceId = "x3", title = "pickup ticket"))
        assertEquals("errand_do/x4", resolveErrandRoute(serviceId = "x4", title = "queue support"))
        assertEquals("errand_detail/x5", resolveErrandRoute(serviceId = "x5", title = "misc"))
    }

    @Test
    fun resolveMedicineRoute_prioritizesServiceId() {
        assertEquals("medicine_chat/consult", resolveMedicineRoute(serviceId = "consult", title = "foo"))
        assertEquals("medicine_chat/chat", resolveMedicineRoute(serviceId = "chat", title = "foo"))
        assertEquals("medicine_order/order", resolveMedicineRoute(serviceId = "order", title = "foo"))
        assertEquals("medicine_order/buy", resolveMedicineRoute(serviceId = "buy", title = "foo"))
        assertEquals("medicine_tracking/tracking", resolveMedicineRoute(serviceId = "tracking", title = "foo"))
    }

    @Test
    fun resolveMedicineRoute_fallsBackToKeywords() {
        assertEquals("medicine_chat/a1", resolveMedicineRoute(serviceId = "a1", title = "online consult"))
        assertEquals("medicine_order/a2", resolveMedicineRoute(serviceId = "a2", title = "place order"))
        assertEquals("medicine_tracking/a3", resolveMedicineRoute(serviceId = "a3", title = "delivery track"))
        assertEquals("medicine_chat/a4", resolveMedicineRoute(serviceId = "a4", title = "misc"))
    }
}
