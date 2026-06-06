from django.contrib import admin
from django.utils.html import format_html
from django.db.models  import Count
from .models import FlagRule, TransactionFlag, FlagAuditLog, OperatorReport


RISK_COLORS = {
    "critical": "#ff4d4f",
    "high":     "#fa8c16",
    "medium":   "#faad14",
    "low":      "#52c41a",
}

def colored_risk(level):
    color = RISK_COLORS.get(level, "#8c8c8c")
    return format_html(
        '<span style="color:{}; font-weight:600; text-transform:capitalize;">{}</span>',
        color, level or "—",
    )

def status_badge(value, on_color="#52c41a", off_color="#ff4d4f"):
    color = on_color if value else off_color
    label = "Yes" if value else "No"
    return format_html(
        '<span style="color:{}; font-weight:600;">{}</span>', color, label
    )


@admin.register(FlagRule)
class FlagRuleAdmin(admin.ModelAdmin):
    list_display  = (
        "name", "rule_type", "risk_level_display", "weight",
        "is_active_display", "merchant", "times_triggered", "created_at",
    )
    list_filter   = ("rule_type", "risk_level", "is_active")
    search_fields = ("name", "description", "merchant__business_name")
    ordering      = ("-created_at",)
    readonly_fields = ("created_at", "times_triggered")

    fieldsets = (
        ("Basic Info", {
            "fields": ("name", "description", "rule_type", "risk_level", "weight", "is_active", "merchant"),
        }),
        ("Thresholds", {
            "fields": ("threshold_amount", "threshold_count", "threshold_minutes"),
            "description": "Fill in only the fields relevant to the selected rule type.",
        }),
        ("Meta", {
            "fields": ("created_at", "times_triggered"),
        }),
    )

    def get_queryset(self, request):
        return super().get_queryset(request).annotate(
            _triggered=Count("triggered_flags")
        )

    @admin.display(description="Risk Level", ordering="risk_level")
    def risk_level_display(self, obj):
        return colored_risk(obj.risk_level)

    @admin.display(description="Active", boolean=False, ordering="is_active")
    def is_active_display(self, obj):
        return status_badge(obj.is_active)

    @admin.display(description="Times Triggered", ordering="_triggered")
    def times_triggered(self, obj):
        return obj._triggered

    actions = ["activate_rules", "deactivate_rules"]

    @admin.action(description="Activate selected rules")
    def activate_rules(self, request, queryset):
        updated = queryset.update(is_active=True)
        self.message_user(request, f"{updated} rule(s) activated.")

    @admin.action(description="Deactivate selected rules")
    def deactivate_rules(self, request, queryset):
        updated = queryset.update(is_active=False)
        self.message_user(request, f"{updated} rule(s) deactivated.")



@admin.register(TransactionFlag)
class TransactionFlagAdmin(admin.ModelAdmin):
    list_display  = (
        "transaction_ref", "rule", "risk_level_display", "detail_short", "flagged_at",
    )
    list_filter   = ("rule__risk_level", "rule__rule_type")
    search_fields = ("transaction__reference", "rule__name", "detail")
    ordering      = ("-flagged_at",)
    readonly_fields = ("transaction", "rule", "detail", "flagged_at")

    def get_queryset(self, request):
        return super().get_queryset(request).select_related("transaction", "rule")

    @admin.display(description="Transaction", ordering="transaction__reference")
    def transaction_ref(self, obj):
        return obj.transaction.reference if obj.transaction else "—"

    @admin.display(description="Risk Level", ordering="rule__risk_level")
    def risk_level_display(self, obj):
        return colored_risk(obj.rule.risk_level if obj.rule else None)

    @admin.display(description="Detail")
    def detail_short(self, obj):
        if obj.detail and len(obj.detail) > 80:
            return obj.detail[:80] + "…"
        return obj.detail or "—"


@admin.register(FlagAuditLog)
class FlagAuditLogAdmin(admin.ModelAdmin):
    list_display  = (
        "transaction_ref", "action_display", "performed_by", "reason_short", "timestamp",
    )
    list_filter   = ("action",)
    search_fields = ("transaction__reference", "performed_by__email", "reason")
    ordering      = ("-timestamp",)
    readonly_fields = (
        "transaction", "action", "performed_by", "reason", "timestamp",
    )

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser

    def get_queryset(self, request):
        return super().get_queryset(request).select_related(
            "transaction", "performed_by"
        )

    @admin.display(description="Transaction", ordering="transaction__reference")
    def transaction_ref(self, obj):
        return obj.transaction.reference if obj.transaction else "—"

    @admin.display(description="Action", ordering="action")
    def action_display(self, obj):
        color = "#ff4d4f" if obj.action == "flagged" else "#52c41a"
        return format_html(
            '<span style="color:{}; font-weight:600; text-transform:capitalize;">{}</span>',
            color, obj.action,
        )

    @admin.display(description="Reason")
    def reason_short(self, obj):
        if obj.reason and len(obj.reason) > 80:
            return obj.reason[:80] + "…"
        return obj.reason or "—"


STATUS_COLORS = {
    "open":         "#fa8c16",
    "under_review": "#1677ff",
    "resolved":     "#52c41a",
    "dismissed":    "#8c8c8c",
}

@admin.register(OperatorReport)
class OperatorReportAdmin(admin.ModelAdmin):
    list_display  = (
        "title", "transaction_ref", "severity_display", "status_display",
        "submitted_by", "resolved_by", "created_at",
    )
    list_filter   = ("severity", "status")
    search_fields = (
        "title", "description",
        "transaction__reference",
        "submitted_by__email",
        "resolved_by__email",
    )
    ordering      = ("-created_at",)
    readonly_fields = (
        "transaction", "submitted_by", "created_at", "updated_at",
        "resolved_at",
    )

    fieldsets = (
        ("Report", {
            "fields": ("title", "description", "severity", "transaction", "submitted_by"),
        }),
        ("Resolution", {
            "fields": ("status", "resolution_note", "resolved_by", "resolved_at"),
        }),
        ("Meta", {
            "fields": ("created_at", "updated_at"),
        }),
    )

    def get_queryset(self, request):
        return super().get_queryset(request).select_related(
            "transaction", "submitted_by", "resolved_by"
        )

    @admin.display(description="Transaction", ordering="transaction__reference")
    def transaction_ref(self, obj):
        return obj.transaction.reference if obj.transaction else "—"

    @admin.display(description="Severity", ordering="severity")
    def severity_display(self, obj):
        return colored_risk(obj.severity)

    @admin.display(description="Status", ordering="status")
    def status_display(self, obj):
        color = STATUS_COLORS.get(obj.status, "#8c8c8c")
        label = (obj.status or "").replace("_", " ").title()
        return format_html(
            '<span style="color:{}; font-weight:600;">{}</span>', color, label
        )

    actions = ["mark_under_review", "mark_resolved", "mark_dismissed"]

    @admin.action(description="Mark selected as Under Review")
    def mark_under_review(self, request, queryset):
        updated = queryset.filter(status="open").update(status="under_review")
        self.message_user(request, f"{updated} report(s) moved to Under Review.")

    @admin.action(description="Mark selected as Resolved")
    def mark_resolved(self, request, queryset):
        from django.utils import timezone
        updated = queryset.exclude(status="resolved").update(
            status="resolved", resolved_at=timezone.now(), resolved_by=request.user
        )
        self.message_user(request, f"{updated} report(s) marked as Resolved.")

    @admin.action(description="Mark selected as Dismissed")
    def mark_dismissed(self, request, queryset):
        from django.utils import timezone
        updated = queryset.exclude(status="dismissed").update(
            status="dismissed", resolved_at=timezone.now(), resolved_by=request.user
        )
        self.message_user(request, f"{updated} report(s) dismissed.")