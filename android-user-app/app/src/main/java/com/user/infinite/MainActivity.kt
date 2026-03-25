package com.user.infinite

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Surface
import androidx.compose.ui.Modifier
import com.user.infinite.core.ui.theme.YueXiangTheme
import com.user.infinite.core.sync.SyncScheduler

class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        SyncScheduler.schedule(this)

        val app = application as YueXiangApplication
        val factory = YueXiangViewModelFactory(app.container)

        setContent {
            YueXiangTheme {
                Surface(modifier = Modifier.fillMaxSize()) {
                    YueXiangApp(factory = factory)
                }
            }
        }
    }
}
