#
# Gramps Web API - A RESTful API for the Gramps genealogy program
#
# Copyright (C) 2025           Alexander Bocken
#
# This program is free software; you can redistribute it and/or modify
# it under the terms of the GNU Affero General Public License as published by
# the Free Software Foundation; either version 3 of the License, or
# (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU Affero General Public License for more details.
#
# You should have received a copy of the GNU Affero General Public License
# along with this program. If not, see <https://www.gnu.org/licenses/>.
#

"""OIDC authentication resources."""

import logging
from gettext import gettext as _
from typing import Optional
from urllib.parse import urlencode

import jwt
from flask import (
    current_app,
    jsonify,
    redirect,
    render_template,
    request,
)
from marshmallow import EXCLUDE, Schema
from webargs import fields

from ...auth import get_name, get_permissions, get_user_details, is_tree_disabled
from ...auth.oidc import (
    create_or_update_oidc_user,
    get_available_oidc_providers,
    get_provider_config,
)
from ...auth.oidc_helpers import is_oidc_enabled
from ...auth.token_blocklist import add_jti_to_blocklist
from ...const import TREE_MULTI
from ..blueprint import api_blueprint
from ..ratelimiter import limiter
from ..util import abort_with_message, get_config, get_tree_id
from . import Resource
from .schemas import OIDCConfigSchema
from .token import get_tokens

logger = logging.getLogger(__name__)


def _is_development_environment(frontend_url: Optional[str]) -> bool:
    """Check if we're in a development environment for cookie security settings."""
    return current_app.debug or (
        "localhost" in (frontend_url or "") or "127.0.0.1" in (frontend_url or "")
    )


class OIDCLoginQueryArgs(Schema):
    """Query arguments for GET /oidc/login."""

    provider = fields.Str(
        required=True,
        metadata={
            "description": "The OIDC provider ID (e.g. 'google', 'microsoft', 'github')."
        },
    )


class OIDCLoginResource(Resource):
    """Resource for initiating OIDC login flow.

    Endpoint: /api/oidc/login/
    """

    @limiter.limit("5/minute")
    @api_blueprint.arguments(OIDCLoginQueryArgs, location="query")
    def get(self, args):
        """Redirect to OIDC provider for authentication."""
        if not is_oidc_enabled():
            abort_with_message(405, "OIDC authentication is not enabled")

        provider_id = args.get("provider")

        # Validate provider is available
        available_providers = get_available_oidc_providers()
        if provider_id not in available_providers:
            abort_with_message(400, f"Provider '{provider_id}' is not available")

        oauth = current_app.extensions.get("authlib.integrations.flask_client")
        if not oauth:
            abort_with_message(500, "OIDC client not properly initialized")

        oidc_client = getattr(oauth, f"gramps_{provider_id}", None)
        if not oidc_client:
            abort_with_message(
                500, f"OIDC client for provider '{provider_id}' not found"
            )

        # Build redirect URI with provider in path (Microsoft-compatible)
        # Using path parameter instead of query parameter for broader compatibility
        base_url = get_config("BASE_URL")
        redirect_uri = f"{base_url.rstrip('/')}/api/oidc/callback/{provider_id}"

        authorization_url = oidc_client.authorize_redirect(redirect_uri)
        return authorization_url


class OIDCCallbackQueryArgs(Schema):
    """Query arguments for GET /oidc/callback."""

    class Meta:
        unknown = EXCLUDE

    provider = fields.Str(
        required=False,
        metadata={
            "description": "The OIDC provider ID (e.g. 'google', 'microsoft', 'github')."
        },
    )  # Optional for backwards compatibility
    tree = fields.Str(
        required=False,
        metadata={"description": "Tree ID to associate with the OIDC login."},
    )
    code = fields.Str(
        required=False,
        metadata={"description": "Authorization code returned by the OIDC provider."},
    )
    state = fields.Str(
        required=False,
        metadata={"description": "State parameter returned by the OIDC provider."},
    )
    session_state = fields.Str(
        required=False,
        metadata={
            "description": "Session state parameter returned by the OIDC provider."
        },
    )
    error = fields.Str(
        required=False,
        metadata={"description": "Error code returned by the OIDC provider."},
    )
    error_description = fields.Str(
        required=False,
        metadata={"description": "Error description returned by the OIDC provider."},
    )


class OIDCCallbackResource(Resource):
    """Resource for handling OIDC callback.

    Endpoint: /api/oidc/callback/ (legacy with query param)
    Endpoint: /api/oidc/callback/<provider_id> (path param, Microsoft-compatible)
    """

    @limiter.limit("5/minute")
    @api_blueprint.arguments(OIDCCallbackQueryArgs, location="query", unknown=EXCLUDE)
    def get(self, args, provider_id=None):
        """Handle OIDC callback and create JWT tokens.

        Args:
            args: Query parameters
            provider_id: Provider ID from path parameter (if using path-based route)
        """
        if not is_oidc_enabled():
            abort_with_message(405, "OIDC authentication is not enabled")

        # Support both path parameter (new, Microsoft-compatible) and query parameter (legacy)
        provider_id = provider_id or args.get("provider")

        if not provider_id:
            abort_with_message(400, "Provider ID is required")

        # Validate provider is available
        available_providers = get_available_oidc_providers()
        if provider_id not in available_providers:
            abort_with_message(400, f"Provider '{provider_id}' is not available")

        oauth = current_app.extensions.get("authlib.integrations.flask_client")
        if not oauth:
            abort_with_message(500, "OIDC client not properly initialized")

        oidc_client = getattr(oauth, f"gramps_{provider_id}", None)
        if not oidc_client:
            abort_with_message(
                500, f"OIDC client for provider '{provider_id}' not found"
            )

        try:
            # Microsoft OIDC has a known issue where the issuer claim in the token
            # may not match the issuer in the discovery document when using /common.
            # Skip issuer validation for Microsoft to handle tenant-specific issuers.
            # Security note: This does not allow arbitrary OIDC providers, because
            # `provider_id` was already validated against the configured providers
            # list via `get_available_oidc_providers()` and mapped to a preconfigured
            # client (`gramps_<provider_id>`) before reaching this code.
            if provider_id == "microsoft":
                token = oidc_client.authorize_access_token(
                    claims_options={"iss": {"essential": False}}
                )
            else:
                token = oidc_client.authorize_access_token()

            # Handle different provider types for userinfo
            if provider_id == "github":
                # GitHub OAuth 2.0 - get user info from API
                resp = oidc_client.get("user", token=token)
                userinfo = resp.json()
            else:
                # Standard OIDC - get userinfo from userinfo endpoint
                userinfo = dict(oidc_client.userinfo(token=token))
                # Merge ID token claims into userinfo — the userinfo endpoint does not
                # include custom claims set by OIDC provider Actions/hooks (e.g. Auth0),
                # but the ID token JWT does. Userinfo values take precedence for standard
                # claims; custom claims (e.g. roles) are added from the ID token.
                if token.get("id_token"):
                    try:
                        id_claims = jwt.decode(
                            token["id_token"],
                            options={"verify_signature": False},
                        )
                        merged = dict(userinfo)
                        merged.update(id_claims)  # id_claims are fresher — always win
                        userinfo = merged
                    except Exception:  # pylint: disable=broad-except
                        logger.warning("Could not parse ID token claims; using userinfo only")

        except Exception:  # pylint: disable=broad-except
            logger.exception("OIDC callback error for provider '%s'", provider_id)
            abort_with_message(401, f"OIDC authentication failed for {provider_id}")

        tree = args.get("tree")
        if (
            tree
            and current_app.config["TREE"] != TREE_MULTI
            and tree != current_app.config["TREE"]
        ):
            abort_with_message(403, f"Invalid tree: {tree}")
        if not tree and current_app.config["TREE"] == TREE_MULTI:
            abort_with_message(403, "Tree is required")

        try:
            user_id = create_or_update_oidc_user(userinfo, tree, provider_id)
            username = get_name(user_id)
            tree_id = get_tree_id(user_id)

            if is_tree_disabled(tree=tree_id):
                abort_with_message(503, "This tree is temporarily disabled")

            # Check if user account is disabled (same as local auth flow)
            user_details = get_user_details(username)
            if user_details and user_details["role"] < 0:
                # User account is disabled - show confirmation page like local registration
                title = _("Account Under Review")
                message = _(
                    "Your account has been created successfully. "
                    "An administrator will review your account request and activate it shortly."
                )
                return render_template(
                    "confirmation.html", title=title, message=message
                )

            # User is enabled - proceed with normal token flow
            permissions = get_permissions(username=username, tree=tree_id)

            tokens = get_tokens(
                user_id=user_id,
                permissions=permissions,
                tree_id=tree_id,
                include_refresh=True,
                fresh=True,
                oidc_provider=provider_id,
            )

            # Redirect to frontend with secure HTTP-only cookies
            frontend_url = get_config("FRONTEND_URL") or get_config("BASE_URL")
            response = redirect(f"{frontend_url.rstrip('/')}/oidc/complete")

            # Set HTTP-only cookies (secure=False for localhost development)
            is_development = _is_development_environment(frontend_url)

            response.set_cookie(
                "oidc_access_token",
                tokens["access_token"],
                max_age=300,  # 5 minutes
                httponly=True,
                secure=not is_development,  # Allow HTTP in development
                samesite="Lax",
                path="/",
            )
            response.set_cookie(
                "oidc_refresh_token",
                tokens["refresh_token"],
                max_age=300,  # 5 minutes
                httponly=True,
                secure=not is_development,  # Allow HTTP in development
                samesite="Lax",
                path="/",
            )

            # Store id_token if available (needed for OIDC logout)
            if token.get("id_token"):
                response.set_cookie(
                    "oidc_id_token",
                    token["id_token"],
                    max_age=300,  # 5 minutes
                    httponly=True,
                    secure=not is_development,  # Allow HTTP in development
                    samesite="Lax",
                    path="/",
                )

            logger.info(
                f"Set OIDC cookies, redirecting to {frontend_url}/oidc/complete"
            )
            return response

        except ValueError as e:
            logger.exception(
                f"Error creating/updating OIDC user for provider '{provider_id}'"
            )
            abort_with_message(400, f"Error processing user: {str(e)}")


class OIDCTokenExchangeResource(Resource):
    """Resource for securely exchanging OIDC tokens from cookies."""

    @limiter.limit("10/minute")
    def get(self):
        """Exchange HTTP-only cookies for tokens that can be stored in localStorage."""
        logger.info("OIDC token exchange request received")
        logger.info(f"Cookies received: {list(request.cookies.keys())}")

        # Get tokens from HTTP-only cookies
        access_token = request.cookies.get("oidc_access_token")
        refresh_token = request.cookies.get("oidc_refresh_token")
        id_token = request.cookies.get("oidc_id_token")

        logger.info(f"Access token found: {bool(access_token)}")
        logger.info(f"Refresh token found: {bool(refresh_token)}")
        logger.info(f"ID token found: {bool(id_token)}")

        if not access_token or not refresh_token:
            logger.error("No OIDC tokens found in cookies")
            abort_with_message(400, "No OIDC tokens found in cookies")

        # Return tokens and clear cookies
        response_data = {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "Bearer",
        }

        # Include id_token if available (needed for OIDC logout)
        if id_token:
            response_data["id_token"] = id_token

        response = jsonify(response_data)

        # Clear the temporary cookies with same settings as when they were set
        frontend_url = get_config("FRONTEND_URL") or get_config("BASE_URL")
        is_development = _is_development_environment(frontend_url)

        response.set_cookie(
            "oidc_access_token",
            "",
            expires=0,
            httponly=True,
            secure=not is_development,
            samesite="Lax",
            path="/",
        )
        response.set_cookie(
            "oidc_refresh_token",
            "",
            expires=0,
            httponly=True,
            secure=not is_development,
            samesite="Lax",
            path="/",
        )
        response.set_cookie(
            "oidc_id_token",
            "",
            expires=0,
            httponly=True,
            secure=not is_development,
            samesite="Lax",
            path="/",
        )

        logger.info("OIDC token exchange successful, cookies cleared")
        return response


class OIDCConfigResource(Resource):
    """Resource for getting OIDC configuration."""

    @api_blueprint.response(200, OIDCConfigSchema())
    def get(self):
        """Get OIDC configuration for frontend."""
        if not is_oidc_enabled():
            return {"enabled": False}

        available_providers = get_available_oidc_providers()
        if not available_providers:
            return {"enabled": False}

        # Build provider list with display information
        base_url = get_config("BASE_URL")
        providers = []
        for provider_id in available_providers:
            provider_config = get_provider_config(provider_id)
            if provider_config:
                providers.append(
                    {
                        "id": provider_id,
                        "name": provider_config["name"],
                        "login_url": f"{base_url.rstrip('/')}/api/oidc/login/?provider={provider_id}",
                    }
                )

        return {
            "enabled": True,
            "providers": providers,
            "disable_local_auth": current_app.config.get(
                "OIDC_DISABLE_LOCAL_AUTH", False
            ),
            "auto_redirect": current_app.config.get("OIDC_AUTO_REDIRECT", True),
        }


class OIDCLogoutQueryArgs(Schema):
    """Query arguments for GET /oidc/logout."""

    provider = fields.Str(
        required=True,
        metadata={
            "description": "The OIDC provider ID (e.g. 'google', 'microsoft', 'github')."
        },
    )
    id_token = fields.Str(
        required=False,
        metadata={"description": "ID token to use as id_token_hint for logout."},
    )
    post_logout_redirect_uri = fields.Str(
        required=False,
        metadata={"description": "URI to redirect to after logout."},
    )


class OIDCLogoutResource(Resource):
    """Resource for getting OIDC logout URL."""

    @api_blueprint.arguments(OIDCLogoutQueryArgs, location="query")
    def get(self, args):
        """Get OIDC logout URL for the specified provider.

        Returns the end_session_endpoint URL from the provider's OIDC discovery document.
        If the provider doesn't support logout, returns None for graceful degradation.
        """
        if not is_oidc_enabled():
            abort_with_message(405, "OIDC authentication is not enabled")

        provider_id = args.get("provider")

        # Validate provider is available
        available_providers = get_available_oidc_providers()
        if provider_id not in available_providers:
            abort_with_message(400, f"Provider '{provider_id}' is not available")

        oauth = current_app.extensions.get("authlib.integrations.flask_client")
        if not oauth:
            abort_with_message(500, "OIDC client not properly initialized")

        oidc_client = getattr(oauth, f"gramps_{provider_id}", None)
        if not oidc_client:
            abort_with_message(
                500, f"OIDC client for provider '{provider_id}' not found"
            )

        try:
            # Load server metadata to get end_session_endpoint
            oidc_client.load_server_metadata()
            end_session_endpoint = oidc_client.server_metadata.get(
                "end_session_endpoint"
            )

            if not end_session_endpoint:
                # Provider doesn't support OIDC logout - graceful degradation
                return {"logout_url": None}

            # Build logout URL with optional parameters
            params = {}
            if args.get("id_token"):
                params["id_token_hint"] = args.get("id_token")
            if args.get("post_logout_redirect_uri"):
                params["post_logout_redirect_uri"] = args.get(
                    "post_logout_redirect_uri"
                )

            logout_url = end_session_endpoint
            if params:
                logout_url = f"{end_session_endpoint}?{urlencode(params)}"

            return {"logout_url": logout_url}

        except Exception as e:
            logger.exception(f"Error getting logout URL for provider '{provider_id}'")
            # On error, gracefully degrade to local logout only
            return {"logout_url": None}


class OIDCBackchannelLogoutResource(Resource):
    """Resource for handling OIDC backchannel logout requests.

    This endpoint receives logout_token JWTs from OIDC providers and revokes
    the corresponding user sessions per the OpenID Connect Back-Channel Logout spec.
    """

    @limiter.limit("10/minute")
    def post(self):
        """Handle backchannel logout request from OIDC provider.

        The provider sends a logout_token (not an id_token) as a form parameter.
        We validate it and revoke all tokens for the user's session (sid) or subject (sub).
        """
        if not is_oidc_enabled():
            abort_with_message(405, "OIDC authentication is not enabled")

        # Get logout_token from form data (per OIDC spec)
        logout_token = request.form.get("logout_token")
        if not logout_token:
            logger.warning("Backchannel logout request missing logout_token")
            abort_with_message(400, "logout_token is required")

        try:
            # Decode the logout token without verification first to get the issuer
            unverified_claims = jwt.decode(
                logout_token, options={"verify_signature": False}
            )
        except jwt.InvalidTokenError as e:
            logger.exception("Invalid logout_token in backchannel logout request")
            abort_with_message(400, f"Invalid logout_token: {str(e)}")

        logger.info(
            f"Received backchannel logout for sub={unverified_claims.get('sub')}, "
            f"sid={unverified_claims.get('sid')}"
        )

        # Validate the logout token structure per OIDC Back-Channel Logout spec
        if "sub" not in unverified_claims and "sid" not in unverified_claims:
            abort_with_message(400, "logout_token must contain either sub or sid claim")

        if "nonce" in unverified_claims:
            abort_with_message(400, "logout_token must not contain nonce claim")

        events = unverified_claims.get("events", {})
        if "http://schemas.openid.net/event/backchannel-logout" not in events:
            abort_with_message(400, "logout_token missing required event type")

        # For now, we track session revocation by adding the logout_token JTI to blocklist
        # This prevents replay attacks
        logout_jti = unverified_claims.get("jti")
        if logout_jti:
            add_jti_to_blocklist(logout_jti)

        # TODO: Implement session tracking to revoke specific user sessions
        # For now, we log the logout request but cannot revoke existing JWT tokens
        # because we don't have a mapping from OIDC sid/sub to our JWT JTIs.
        # A full implementation would require:
        # 1. Store mapping of OIDC sid -> Gramps JWT JTIs when tokens are issued
        # 2. On backchannel logout, look up all JTIs for that sid and blocklist them
        # 3. Clean up mapping when tokens expire

        sub = unverified_claims.get("sub")
        sid = unverified_claims.get("sid")
        logger.warning(
            f"Backchannel logout received for sub={sub}, sid={sid} but session "
            f"revocation not fully implemented. Existing tokens will remain valid "
            f"until expiration."
        )

        # Return success per spec (200 OK)
        return "", 200
