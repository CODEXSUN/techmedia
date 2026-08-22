package `in`.techmedia.techme.auth

import android.content.Context
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

enum class AppDestination { SignIn, Dashboard, Calls, Messenger }

data class AppState(
    val destination: AppDestination = AppDestination.SignIn,
    val loading: Boolean = false,
    val message: String? = null,
    val session: MobileSession? = null
)

class TechMeController(context: Context) {
    private val sessionStore = SecureSessionStore(context)
    private val scope = CoroutineScope(Dispatchers.Main)

    var state by mutableStateOf(AppState())
        private set

    fun restoreSession() {
        val session = sessionStore.readCurrent()
        if (session == null) {
            state = AppState(destination = AppDestination.SignIn)
            return
        }
        scope.launch {
            runCatching { withContext(Dispatchers.IO) { TechMediaApi.verifySession(session.token) } }
                .onSuccess { verifiedSession ->
                    sessionStore.save(verifiedSession)
                    state = AppState(destination = AppDestination.Dashboard, session = verifiedSession)
                }
                .onFailure {
                    sessionStore.clear()
                    state = AppState(destination = AppDestination.SignIn)
                }
        }
    }

    fun signIn(email: String, password: String) {
        state = state.copy(loading = true, message = null)
        scope.launch {
            runCatching { withContext(Dispatchers.IO) { TechMediaApi.login(email, password) } }
                .onSuccess { session ->
                    sessionStore.save(session)
                    state = AppState(destination = AppDestination.Dashboard, session = session)
                }
                .onFailure { error ->
                    state = state.copy(loading = false, message = error.message ?: "Unable to sign in.")
                }
        }
    }

    fun signOut() {
        sessionStore.clear()
        state = AppState(destination = AppDestination.SignIn)
    }

    fun openMessenger() {
        if (state.session != null) state = state.copy(destination = AppDestination.Messenger)
    }

    fun openCalls() {
        if (state.session != null) state = state.copy(destination = AppDestination.Calls)
    }

    fun returnToDashboard() {
        if (state.session != null) state = state.copy(destination = AppDestination.Dashboard)
    }
}
