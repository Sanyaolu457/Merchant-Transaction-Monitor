from rest_framework.permissions import BasePermission

ROLE_SUPER_ADMIN = 'super_admin'
ROLE_ADMIN       = 'admin'
ROLE_OPERATOR    = 'operator'
ROLE_USER        = 'user'

ALL_STAFF_ROLES    = {ROLE_SUPER_ADMIN, ROLE_ADMIN, ROLE_OPERATOR}
ELEVATED_ROLES     = {ROLE_SUPER_ADMIN, ROLE_ADMIN}
OPERATOR_AND_ABOVE = {ROLE_SUPER_ADMIN, ROLE_ADMIN, ROLE_OPERATOR}


def get_role(user):
    return getattr(user, 'role', None)


class IsSuperAdmin(BasePermission):
    message = 'Only super admins can perform this action.'

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and get_role(request.user) == ROLE_SUPER_ADMIN
        )


class IsAdminOrAbove(BasePermission):
    message = 'Only admins and above can perform this action.'

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and get_role(request.user) in ELEVATED_ROLES
        )


class IsOperatorOrAbove(BasePermission):
    message = 'Only operators and above can perform this action.'

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and get_role(request.user) in OPERATOR_AND_ABOVE
        )


class IsUser(BasePermission):
    message = 'Only users can perform this action.'

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and get_role(request.user) == ROLE_USER
        )


class CanManageUsers(BasePermission):
    message = 'You do not have permission to manage this user.'

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and get_role(request.user) in ELEVATED_ROLES
        )

    def has_object_permission(self, request, view, obj):
        actor_role  = get_role(request.user)
        target_role = get_role(obj)
        if actor_role == ROLE_SUPER_ADMIN:
            return True
        if actor_role == ROLE_ADMIN:
            return target_role in {ROLE_OPERATOR, ROLE_USER}
        return False


class CanFlagTransaction(BasePermission):
    message = 'Only operators and above can flag transactions.'

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and get_role(request.user) in OPERATOR_AND_ABOVE
        )

    @staticmethod
    def can_flag(user):
        return get_role(user) in OPERATOR_AND_ABOVE

    @staticmethod
    def can_unflag(user):
        """Only admins and super admins can remove a flag."""
        return get_role(user) in ELEVATED_ROLES


class CanSuspendMerchant(BasePermission):
    message = 'Only admins and above can suspend merchants.'

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and get_role(request.user) in ELEVATED_ROLES
        )


class IsAuthenticatedAny(BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated