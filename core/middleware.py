from django.middleware.csrf import get_token
from rest_framework.authentication import SessionAuthentication


class CsrfExemptSessionAuthentication(SessionAuthentication):
    """
    SessionAuthentication without CSRF enforcement.

    This is safe because our React SPA and Django API share the same origin
    (Vite proxy in dev, same domain in prod), so the session cookie alone
    is sufficient protection. JWT is the primary auth method, but Google
    OAuth only creates sessions — this fallback lets those work too.
    """

    def enforce_csrf(self, request):
        return  # Skip CSRF — same-origin requests don't need it


class EnsureCsrfCookieMiddleware:
    """
    Always set the CSRF cookie on every response so the React SPA
    can read it and include it in X-CSRFToken headers.

    Django's CsrfViewMiddleware only sets the cookie when a view uses
    {% csrf_token %} or explicitly calls get_token(). Since our SPA
    never renders Django templates, the cookie would never get set.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Calling get_token() forces Django to set the cookie on the response
        get_token(request)
        return self.get_response(request)
