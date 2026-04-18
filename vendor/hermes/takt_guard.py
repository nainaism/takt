#!/usr/bin/env python3
"""
TAKT Guard — Permission mode to toolset mapping for Hermes provider.

Maps TAKT permission modes to appropriate AIAgent tool restrictions.
This module is used by takt_hermes_bridge.py to configure the agent
with the correct tool permissions based on the workflow step configuration.

Permission Modes:
  - readonly: Read-only operations. No file writes, no terminal, no code execution.
  - edit:     Read + write files, but no code execution, no system changes.
  - full:     All tools enabled. No restrictions.
"""

from typing import Dict, List, Optional, Tuple

# ---------------------------------------------------------------------------
# Toolset definitions
# ---------------------------------------------------------------------------

# Toolsets that are always safe for read-only access
READONLY_TOOLSETS = {
    "file",
    "web",
    "search",
}

# Toolsets allowed for edit mode (readonly + write capabilities)
EDIT_TOOLSETS = {
    "file",       # read + write + patch
    "web",
    "search",
    "browser",    # read-only browsing
}

# Toolsets that are potentially dangerous and require 'full' mode
DANGEROUS_TOOLSETS = {
    "terminal",       # shell access
    "code-execution", # execute_code sandbox
    "delegate",       # subagent spawning
    "cronjob",        # scheduled jobs
    "homeassistant",  # IoT control
    "image_gen",      # image generation
    "tts",            # text-to-speech
}

# All known toolsets
ALL_TOOLSETS = READONLY_TOOLSETS | EDIT_TOOLSETS | DANGEROUS_TOOLSETS | {
    "mcp",
    "vision",
    "email",
    "productivity",
    "social-media",
    "github",
    "devops",
}

# ---------------------------------------------------------------------------
# Individual tool-level blocklist for granular control
# ---------------------------------------------------------------------------

# Tools that are ALWAYS blocked (even in edit mode) because they perform
# destructive or system-level operations
ALWAYS_BLOCKED_TOOLS_EDIT = {
    "terminal",
    "execute_code",
    "delegate_task",
    "process",
    "cronjob_create",
    "cronjob_update",
    "homeassistant",
}

# Tools blocked in readonly mode (everything except reads)
READONLY_TOOLS_ALLOWLIST = {
    "read_file",
    "search_files",
    "web_search",
    "web_extract",
    "browser_navigate",
    "browser_snapshot",
    "browser_back",
    "browser_scroll",
    "browser_vision",
    "vision_analyze",
    "session_search",
    "skills_list",
    "skill_view",
}

# ---------------------------------------------------------------------------
# Permission mode → toolset config
# ---------------------------------------------------------------------------

def get_tool_config(
    permission_mode: str,
    extra_enabled: Optional[List[str]] = None,
    extra_disabled: Optional[List[str]] = None,
) -> Tuple[Optional[List[str]], Optional[List[str]]]:
    """Return (enabled_toolsets, disabled_toolsets) for a permission mode.

    Args:
        permission_mode: One of 'readonly', 'edit', 'full'
        extra_enabled: Additional toolsets to enable (overrides mode defaults)
        extra_disabled: Additional toolsets to disable (overrides mode defaults)

    Returns:
        Tuple of (enabled_toolsets, disabled_toolsets).
        Either may be None if no filtering should be applied.
    """
    if permission_mode == "full":
        enabled = list(ALL_TOOLSETS)
        if extra_enabled:
            enabled.extend(extra_enabled)
        disabled = extra_disabled or []
        return (enabled, disabled) if disabled else (enabled, None)

    elif permission_mode == "edit":
        enabled = list(EDIT_TOOLSETS)
        if extra_enabled:
            enabled.extend(extra_enabled)
        disabled = list(DANGEROUS_TOOLSETS)
        if extra_disabled:
            disabled.extend(extra_disabled)
        return (enabled, disabled)

    elif permission_mode == "readonly":
        enabled = list(READONLY_TOOLSETS)
        if extra_enabled:
            enabled.extend(extra_enabled)
        disabled = list(EDIT_TOOLSETS - READONLY_TOOLSETS | DANGEROUS_TOOLSETS)
        if extra_disabled:
            disabled.extend(extra_disabled)
        return (enabled, disabled)

    else:
        # Unknown mode — safest default: readonly
        return get_tool_config("readonly", extra_enabled, extra_disabled)


def validate_tool_call(
    permission_mode: str,
    tool_name: str,
) -> Tuple[bool, Optional[str]]:
    """Check if a tool call is allowed under the given permission mode.

    This is a secondary check — the primary enforcement is via
    disabled_toolsets at agent creation. This function can be used
    for logging or as a belt-and-suspenders validation.

    Args:
        permission_mode: One of 'readonly', 'edit', 'full'
        tool_name: Name of the tool being called

    Returns:
        Tuple of (is_allowed, reason_if_blocked)
    """
    if permission_mode == "full":
        return (True, None)

    if permission_mode == "readonly":
        if tool_name not in READONLY_TOOLS_ALLOWLIST:
            return (False, f"Tool '{tool_name}' blocked in readonly mode")
        return (True, None)

    if permission_mode == "edit":
        if tool_name in ALWAYS_BLOCKED_TOOLS_EDIT:
            return (False, f"Tool '{tool_name}' blocked in edit mode")
        return (True, None)

    # Unknown mode — safest default: block
    return (False, f"Unknown permission mode: {permission_mode}")