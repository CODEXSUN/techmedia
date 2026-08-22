package `in`.techmedia.techme

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.os.Bundle
import android.os.Build
import android.view.WindowManager
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.animation.animateColorAsState
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.focusable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsHoveredAsState
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.withTransform
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.platform.LocalContext
import `in`.techmedia.techme.auth.AppDestination
import `in`.techmedia.techme.auth.TechMeController
import `in`.techmedia.techme.messaging.MessengerController
import `in`.techmedia.techme.messaging.MessengerScreen

private val AppBackground = Color(0xFFF9FAFC)
private val BrandPurple = Color(0xFF662C90)
private val HeaderBorder = Color(0xFFE8EAF0)

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        createMessagingNotificationChannel()
        window.setFlags(
            WindowManager.LayoutParams.FLAG_SECURE,
            WindowManager.LayoutParams.FLAG_SECURE
        )
        setContent { TechMeApp() }
    }

    private fun createMessagingNotificationChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val channel = NotificationChannel(
            MESSAGING_CHANNEL_ID,
            "Messages",
            NotificationManager.IMPORTANCE_DEFAULT
        ).apply { description = "New TechMe messages" }
        getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
    }

    private companion object {
        const val MESSAGING_CHANNEL_ID = "techme_messages"
    }
}

@Composable
private fun TechMeApp() {
    val context = LocalContext.current.applicationContext
    val controller = remember(context) { TechMeController(context) }
    val messengerController = remember { MessengerController() }
    val state = controller.state
    MaterialTheme {
        Surface(color = AppBackground, modifier = Modifier.fillMaxSize()) {
            LaunchedEffect(Unit) { controller.restoreSession() }
            HandleSystemBack(state.destination, messengerController, controller::returnToDashboard)
            Column(Modifier.fillMaxSize()) {
                Box(Modifier.weight(1f)) {
                    when (state.destination) {
                        AppDestination.SignIn -> SignInScreen(state.loading, state.message, controller::signIn)
                        AppDestination.Dashboard -> DashboardScreen(
                            name = state.session?.name.orEmpty(),
                            onMessenger = controller::openMessenger,
                            onSignOut = controller::signOut
                        )
                        AppDestination.Calls -> CallsScreen()
                        AppDestination.Messenger -> state.session?.let { session ->
                            MessengerScreen(session, messengerController, controller::returnToDashboard)
                        }
                    }
                }
                if (showBottomNavigation(state.destination, messengerController.state.selected != null)) {
                    AppBottomNavigation(state.destination) { destination ->
                        when (destination) {
                            AppDestination.Dashboard -> controller.returnToDashboard()
                            AppDestination.Calls -> controller.openCalls()
                            AppDestination.Messenger -> controller.openMessenger()
                            else -> Unit
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun HandleSystemBack(
    destination: AppDestination,
    messengerController: MessengerController,
    returnToDashboard: () -> Unit
) {
    BackHandler(enabled = destination == AppDestination.Calls || destination == AppDestination.Messenger) {
        if (destination == AppDestination.Messenger && messengerController.state.selected != null) {
            messengerController.closeConversation()
        } else {
            returnToDashboard()
        }
    }
}

private fun showBottomNavigation(destination: AppDestination, conversationOpen: Boolean): Boolean =
    !conversationOpen && destination in setOf(AppDestination.Dashboard, AppDestination.Calls, AppDestination.Messenger)

@Composable
private fun SignInScreen(loading: Boolean, message: String?, onSignIn: (String, String) -> Unit) {
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var passwordVisible by remember { mutableStateOf(false) }
    val initialFocus = remember { FocusRequester() }
    LaunchedEffect(Unit) { initialFocus.requestFocus() }
    Column(
        modifier = Modifier.fillMaxSize().padding(horizontal = 28.dp)
            .focusRequester(initialFocus)
            .focusable(),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        TechMediaLogo(Modifier.width(66.dp).height(54.dp))
        Spacer(Modifier.height(20.dp))
        Text(text = "Welcome to Tech Media", color = Color(0xFF18181B), fontSize = 27.sp,
            modifier = Modifier.align(Alignment.Start))
        Spacer(Modifier.height(10.dp))
        Text(text = "Sign in with your Tech Media identity.", color = Color(0xFF5E6470), fontSize = 16.sp,
            modifier = Modifier.align(Alignment.Start))
        Spacer(Modifier.height(28.dp))
        OutlinedTextField(email, { email = it }, Modifier.fillMaxWidth(), !loading, label = { Text("Email") }, singleLine = true)
        Spacer(Modifier.height(14.dp))
        OutlinedTextField(
            value = password,
            onValueChange = { password = it },
            modifier = Modifier.fillMaxWidth(),
            enabled = !loading,
            label = { Text("Password") },
            singleLine = true,
            visualTransformation = if (passwordVisible) VisualTransformation.None else PasswordVisualTransformation(),
            trailingIcon = {
                PasswordVisibilityIcon(passwordVisible) { passwordVisible = !passwordVisible }
            }
        )
        if (message != null) {
            Spacer(Modifier.height(14.dp))
            Text(text = message, color = Color(0xFFB42318), fontSize = 14.sp)
        }
        Spacer(Modifier.height(24.dp))
        Button(
            onClick = { onSignIn(email.trim(), password) },
            enabled = !loading && email.isNotEmpty() && password.isNotEmpty(),
            modifier = Modifier.fillMaxWidth().height(52.dp),
            colors = ButtonDefaults.buttonColors(containerColor = BrandPurple),
            shape = RoundedCornerShape(14.dp)
        ) { Text(if (loading) "Signing in..." else "Sign in") }
        Spacer(Modifier.height(18.dp))
        SecureConnectionLabel()
    }
}

@Composable
private fun PasswordVisibilityIcon(visible: Boolean, onClick: () -> Unit) {
    val interactions = remember { MutableInteractionSource() }
    val hovered by interactions.collectIsHoveredAsState()
    val pressed by interactions.collectIsPressedAsState()
    val iconColor by animateColorAsState(
        targetValue = if (hovered || pressed) Color(0xFF4B4E57) else Color(0xFF8A8D95),
        animationSpec = tween(120),
        label = "password visibility icon colour"
    )
    val iconScale by animateFloatAsState(
        targetValue = if (pressed) 0.9f else 1f,
        animationSpec = tween(100),
        label = "password visibility icon press"
    )
    Canvas(
        Modifier
            .width(48.dp)
            .height(48.dp)
            .clickable(interactionSource = interactions, indication = null, onClick = onClick)
            .padding(11.dp)
            .semantics { contentDescription = if (visible) "Hide password" else "Show password" }
    ) {
        val centre = androidx.compose.ui.geometry.Offset(size.width / 2, size.height / 2)
        val path = Path().apply {
            moveTo(size.width * 0.08f, centre.y)
            quadraticTo(size.width * 0.30f, size.height * 0.14f, centre.x, size.height * 0.14f)
            quadraticTo(size.width * 0.70f, size.height * 0.14f, size.width * 0.92f, centre.y)
            quadraticTo(size.width * 0.70f, size.height * 0.86f, centre.x, size.height * 0.86f)
            quadraticTo(size.width * 0.30f, size.height * 0.86f, size.width * 0.08f, centre.y)
            close()
        }
        val stroke = Stroke(width = size.width * 0.09f, cap = StrokeCap.Round)
        withTransform({ scale(iconScale, iconScale, centre) }) {
            drawPath(path, iconColor, style = stroke)
            drawCircle(iconColor, radius = size.width * 0.15f, center = centre)
        }
        if (!visible) {
            drawLine(
                iconColor,
                androidx.compose.ui.geometry.Offset(size.width * 0.14f, size.height * 0.14f),
                androidx.compose.ui.geometry.Offset(size.width * 0.86f, size.height * 0.86f),
                stroke.width,
                cap = StrokeCap.Round
            )
        }
    }
}

@Composable
private fun SecureConnectionLabel() {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Canvas(Modifier.width(15.dp).height(16.dp)) {
            val color = Color(0xFF397253)
            val stroke = Stroke(width = size.width * 0.12f)
            drawRoundRect(
                color,
                topLeft = androidx.compose.ui.geometry.Offset(size.width * 0.18f, size.height * 0.42f),
                size = androidx.compose.ui.geometry.Size(size.width * 0.64f, size.height * 0.45f),
                cornerRadius = androidx.compose.ui.geometry.CornerRadius(3f, 3f),
                style = stroke
            )
            drawArc(
                color,
                180f,
                180f,
                false,
                topLeft = androidx.compose.ui.geometry.Offset(size.width * 0.29f, size.height * 0.08f),
                size = androidx.compose.ui.geometry.Size(size.width * 0.42f, size.height * 0.55f),
                style = stroke
            )
        }
        Spacer(Modifier.width(7.dp))
        Text("Securely connected to Tech Media", color = Color(0xFF397253), fontSize = 14.sp)
    }
}

@Composable
private fun DashboardScreen(name: String, onMessenger: () -> Unit, onSignOut: () -> Unit) {
    Column(Modifier.fillMaxSize()) {
        DashboardTopBar(name, onSignOut)
        Column(Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 18.dp)) {
            Text("Welcome back${if (name.isBlank()) "" else ", $name"}", color = Color(0xFF18181B), fontSize = 24.sp)
            Spacer(Modifier.height(6.dp))
            Text("Your work dashboard", color = Color(0xFF5E6470), fontSize = 15.sp)
            Spacer(Modifier.height(20.dp))
            DashboardCard(DashboardIcon.Crm, "CRM", "Manage enquiries and follow-ups")
            Spacer(Modifier.height(12.dp))
            DashboardCard(DashboardIcon.Messages, "Messages", "Keep customer conversations moving", onMessenger)
            Spacer(Modifier.height(12.dp))
            DashboardCard(DashboardIcon.Inbox, "Inbox", "Review your latest notifications")
        }
    }
}

@Composable
private fun DashboardTopBar(name: String, onSignOut: () -> Unit) {
    Column(Modifier.fillMaxWidth().background(Color.White)) {
        Spacer(Modifier.height(28.dp))
        Row(
            modifier = Modifier.fillMaxWidth().height(56.dp).padding(horizontal = 18.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            TechMediaLogo(Modifier.width(31.dp).height(26.dp))
            Spacer(Modifier.width(12.dp))
            Text("Tech Media", color = Color(0xFF26212B), fontSize = 17.sp)
            Spacer(Modifier.weight(1f))
            ConnectionIndicator()
            Spacer(Modifier.width(16.dp))
            AccountMenu(name, onSignOut)
        }
        Box(Modifier.fillMaxWidth().height(1.dp).background(HeaderBorder))
    }
}

@Composable
private fun ConnectionIndicator() {
    Canvas(Modifier.width(10.dp).height(10.dp)) { drawCircle(Color(0xFF16A34A)) }
}

@Composable
private fun AccountMenu(name: String, onSignOut: () -> Unit) {
    var expanded by remember { mutableStateOf(false) }
    Box {
        AccountAvatar(name) { expanded = true }
        DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
            DropdownMenuItem(
                text = { Text(name.ifBlank { "Tech Media account" }) },
                onClick = { expanded = false }
            )
            DropdownMenuItem(
                text = { Text("Sign out") },
                onClick = {
                    expanded = false
                    onSignOut()
                }
            )
        }
    }
}

@Composable
private fun AccountAvatar(name: String, onClick: () -> Unit) {
    Box(
        modifier = Modifier.width(34.dp).height(34.dp).background(BrandPurple, RoundedCornerShape(17.dp)).clickable(onClick = onClick),
        contentAlignment = Alignment.Center
    ) {
        Text(name.firstOrNull()?.uppercase() ?: "T", color = Color.White, fontSize = 15.sp)
    }
}

@Composable
private fun DashboardCard(icon: DashboardIcon, title: String, description: String, onClick: (() -> Unit)? = null) {
    Card(
        modifier = Modifier.fillMaxWidth().then(if (onClick == null) Modifier else Modifier.clickable(onClick = onClick)),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
        shape = RoundedCornerShape(18.dp)
    ) {
        Row(Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
            DashboardIconMark(icon)
            Spacer(Modifier.width(13.dp))
            Column(Modifier.weight(1f)) {
                Text(title, color = Color(0xFF18181B), fontSize = 17.sp)
                Spacer(Modifier.height(4.dp))
                Text(description, color = Color(0xFF666D78), fontSize = 13.sp)
            }
        }
    }
}

private enum class DashboardIcon { Crm, Messages, Inbox }

@Composable
private fun DashboardIconMark(icon: DashboardIcon) {
    val color = when (icon) {
        DashboardIcon.Crm -> Color(0xFF0F766E)
        DashboardIcon.Messages -> Color(0xFF2563EB)
        DashboardIcon.Inbox -> Color(0xFFD97706)
    }
    Box(
        modifier = Modifier.width(46.dp).height(46.dp).background(color, RoundedCornerShape(14.dp)),
        contentAlignment = Alignment.Center
    ) {
        Canvas(Modifier.width(23.dp).height(23.dp)) { drawDashboardIcon(icon) }
    }
}

private fun DrawScope.drawDashboardIcon(icon: DashboardIcon) {
    val white = Color.White
    val stroke = Stroke(width = size.width * 0.09f)
    when (icon) {
        DashboardIcon.Crm -> {
            drawCircle(white, radius = size.width * 0.18f, center = androidx.compose.ui.geometry.Offset(size.width * 0.5f, size.height * 0.31f))
            drawRoundRect(white, topLeft = androidx.compose.ui.geometry.Offset(size.width * 0.2f, size.height * 0.55f),
                size = androidx.compose.ui.geometry.Size(size.width * 0.6f, size.height * 0.28f), cornerRadius = androidx.compose.ui.geometry.CornerRadius(5f, 5f))
        }
        DashboardIcon.Messages -> {
            drawRoundRect(white, topLeft = androidx.compose.ui.geometry.Offset(size.width * 0.08f, size.height * 0.14f),
                size = androidx.compose.ui.geometry.Size(size.width * 0.84f, size.height * 0.58f), cornerRadius = androidx.compose.ui.geometry.CornerRadius(7f, 7f), style = stroke)
            drawLine(white, androidx.compose.ui.geometry.Offset(size.width * 0.34f, size.height * 0.72f),
                androidx.compose.ui.geometry.Offset(size.width * 0.22f, size.height * 0.9f), stroke.width)
        }
        DashboardIcon.Inbox -> {
            drawRoundRect(white, topLeft = androidx.compose.ui.geometry.Offset(size.width * 0.1f, size.height * 0.35f),
                size = androidx.compose.ui.geometry.Size(size.width * 0.8f, size.height * 0.48f), cornerRadius = androidx.compose.ui.geometry.CornerRadius(5f, 5f), style = stroke)
            drawLine(white, androidx.compose.ui.geometry.Offset(size.width * 0.12f, size.height * 0.38f),
                androidx.compose.ui.geometry.Offset(size.width * 0.35f, size.height * 0.1f), stroke.width)
            drawLine(white, androidx.compose.ui.geometry.Offset(size.width * 0.88f, size.height * 0.38f),
                androidx.compose.ui.geometry.Offset(size.width * 0.65f, size.height * 0.1f), stroke.width)
        }
    }
}

@Composable
private fun TechMediaLogo(modifier: Modifier = Modifier) { Canvas(modifier) { drawTechMediaMark() } }

private fun DrawScope.drawTechMediaMark() {
    val width = size.width
    val height = size.height
    polygon(0.188f, 0.001f, 0.541f, 0.001f, 0.463f, 0.446f, 0.097f, 0.447f, width, height)
    polygon(0.646f, 0.001f, 0.999f, 0.001f, 0.921f, 0.445f, 0.555f, 0.446f, width, height)
    polygon(0.540f, 0.554f, 0.894f, 0.554f, 0.816f, 0.998f, 0.449f, 0.999f, width, height)
    polygon(0.092f, 0.554f, 0.445f, 0.554f, 0.367f, 0.998f, 0.001f, 0.999f, width, height)
}

private fun DrawScope.polygon(
    x1: Float, y1: Float, x2: Float, y2: Float, x3: Float, y3: Float, x4: Float, y4: Float,
    width: Float, height: Float
) {
    val path = Path().apply {
        moveTo(x1 * width, y1 * height)
        lineTo(x2 * width, y2 * height)
        lineTo(x3 * width, y3 * height)
        lineTo(x4 * width, y4 * height)
        close()
    }
    drawPath(path, BrandPurple)
}
