package `in`.techmedia.techme

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Text
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.runtime.Composable

@Composable
fun CallsScreen() {
    Column(
        modifier = Modifier.fillMaxSize().background(Color(0xFFF9FAFC)).padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Text("Calls", color = Color(0xFF18181B), fontSize = 25.sp)
        Spacer(Modifier.height(10.dp))
        Text("Your call activity will appear here.", color = Color(0xFF666D78), fontSize = 15.sp)
    }
}
