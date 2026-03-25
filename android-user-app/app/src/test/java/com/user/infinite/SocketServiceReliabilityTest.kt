package com.user.infinite

import com.user.infinite.core.socket.SocketService
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class SocketServiceReliabilityTest {

    @Test
    fun sendMessage_whenDisconnected_isQueuedWithUpperBound() {
        val service = SocketService()
        repeat(150) { index ->
            service.sendMessage(
                roomId = "room-$index",
                sender = "u",
                senderId = "u1",
                senderRole = "customer",
                content = "m$index",
                messageType = "text",
            )
        }

        val pendingQueue = readPrivateField<MutableCollection<*>>(service, "pendingQueue")
        assertEquals(120, pendingQueue.size)
    }

    @Test
    fun joinRoom_and_disconnect_withClearSession_cleansState() {
        val service = SocketService()
        service.joinRoom(roomId = "room-1", userId = "u1", role = "customer")
        service.sendMessage(
            roomId = "room-1",
            sender = "u",
            senderId = "u1",
            senderRole = "customer",
            content = "queued",
            messageType = "text",
        )

        val joinedBefore = readPrivateField<Map<*, *>>(service, "joinedRooms")
        val pendingBefore = readPrivateField<MutableCollection<*>>(service, "pendingQueue")
        assertEquals(1, joinedBefore.size)
        assertTrue(pendingBefore.isNotEmpty())

        service.disconnect(clearSession = true)

        val joinedAfter = readPrivateField<Map<*, *>>(service, "joinedRooms")
        val pendingAfter = readPrivateField<MutableCollection<*>>(service, "pendingQueue")
        assertEquals(0, joinedAfter.size)
        assertEquals(0, pendingAfter.size)
    }

    @Test
    fun disconnect_withoutClearSession_preservesQueuedState() {
        val service = SocketService()
        service.joinRoom(roomId = "room-1", userId = "u1", role = "customer")
        service.sendMessage(
            roomId = "room-1",
            sender = "u",
            senderId = "u1",
            senderRole = "customer",
            content = "queued",
            messageType = "text",
        )

        service.disconnect(clearSession = false)

        val joinedAfter = readPrivateField<Map<*, *>>(service, "joinedRooms")
        val pendingAfter = readPrivateField<MutableCollection<*>>(service, "pendingQueue")
        assertEquals(1, joinedAfter.size)
        assertTrue(pendingAfter.isNotEmpty())
    }

    @Suppress("UNCHECKED_CAST")
    private fun <T> readPrivateField(target: Any, fieldName: String): T {
        val field = target::class.java.getDeclaredField(fieldName)
        field.isAccessible = true
        return field.get(target) as T
    }
}
