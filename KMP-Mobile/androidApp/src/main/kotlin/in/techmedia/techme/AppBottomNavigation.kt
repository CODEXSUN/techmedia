package `in`.techmedia.techme

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import `in`.techmedia.techme.auth.AppDestination

@Composable
fun AppBottomNavigation(destination: AppDestination, onNavigate: (AppDestination) -> Unit) {
    NavigationBar(containerColor = Color.White, modifier = Modifier.fillMaxWidth()) {
        AppNavigationItem(BottomIcon.Home, "Home", destination == AppDestination.Dashboard) { onNavigate(AppDestination.Dashboard) }
        AppNavigationItem(BottomIcon.Calls, "Calls", destination == AppDestination.Calls) { onNavigate(AppDestination.Calls) }
        AppNavigationItem(BottomIcon.Messages, "Messages", destination == AppDestination.Messenger) { onNavigate(AppDestination.Messenger) }
        AppNavigationMenu(onNavigate)
    }
}

@Composable
private fun RowScope.AppNavigationItem(icon: BottomIcon, label: String, selected: Boolean, onClick: () -> Unit) {
    val color = if (selected) Color(0xFF662C90) else Color(0xFF626976)
    Box(
        modifier = Modifier.weight(1f).clickable(onClick = onClick).padding(vertical = 10.dp),
        contentAlignment = Alignment.Center
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Canvas(Modifier.width(22.dp).height(22.dp).padding(bottom = 2.dp)) { drawBottomIcon(icon, color) }
            Text(label, fontSize = 12.sp, color = color)
        }
    }
}

@Composable
private fun RowScope.AppNavigationMenu(onNavigate: (AppDestination) -> Unit) {
    var expanded by remember { mutableStateOf(false) }
    Box(modifier = Modifier.weight(1f), contentAlignment = Alignment.Center) {
        Column(
            modifier = Modifier.clickable { expanded = true }.padding(vertical = 10.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Canvas(Modifier.width(22.dp).height(22.dp).padding(bottom = 2.dp)) {
                drawBottomIcon(BottomIcon.Menu, Color(0xFF626976))
            }
            Text("Menu", fontSize = 12.sp, color = Color(0xFF626976))
        }
        DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
            DropdownMenuItem(text = { Text("Calls") }, onClick = {
                expanded = false
                onNavigate(AppDestination.Calls)
            })
            DropdownMenuItem(text = { Text("Messages") }, onClick = {
                expanded = false
                onNavigate(AppDestination.Messenger)
            })
        }
    }
}

private enum class BottomIcon { Home, Calls, Messages, Menu }

private fun DrawScope.drawBottomIcon(icon: BottomIcon, color: Color) {
    val stroke = Stroke(width = size.width * 0.1f)
    when (icon) {
        BottomIcon.Home -> {
            drawLine(color, androidx.compose.ui.geometry.Offset(size.width * 0.12f, size.height * 0.48f), androidx.compose.ui.geometry.Offset(size.width * 0.5f, size.height * 0.15f), stroke.width)
            drawLine(color, androidx.compose.ui.geometry.Offset(size.width * 0.5f, size.height * 0.15f), androidx.compose.ui.geometry.Offset(size.width * 0.88f, size.height * 0.48f), stroke.width)
            drawRect(color, topLeft = androidx.compose.ui.geometry.Offset(size.width * 0.23f, size.height * 0.45f), size = androidx.compose.ui.geometry.Size(size.width * 0.54f, size.height * 0.4f), style = stroke)
        }
        BottomIcon.Calls -> drawArc(color, 135f, 270f, false, style = Stroke(width = size.width * 0.25f))
        BottomIcon.Messages -> {
            drawRoundRect(color, cornerRadius = androidx.compose.ui.geometry.CornerRadius(4f, 4f), style = stroke)
            drawLine(color, androidx.compose.ui.geometry.Offset(size.width * 0.38f, size.height * 0.82f), androidx.compose.ui.geometry.Offset(size.width * 0.22f, size.height), stroke.width)
        }
        BottomIcon.Menu -> {
            repeat(3) { index ->
                val y = size.height * (0.22f + index * 0.28f)
                drawLine(
                    color,
                    androidx.compose.ui.geometry.Offset(size.width * 0.16f, y),
                    androidx.compose.ui.geometry.Offset(size.width * 0.84f, y),
                    stroke.width
                )
            }
        }
    }
}
