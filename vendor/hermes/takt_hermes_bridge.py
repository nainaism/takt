#!/usr/bin/env python3
"""
TAKT-Hermes Bridge — Long-lived Python process for TAKT hermes provider.

Communicates with TypeScript via newline-delimited JSON on stdin/stdout.
Protocol:
  Request:  {"id": <int>, "method": "call"|"setup"|"shutdown", "params": {...}}
  Response: {"id": <int>, "result": {...}} | {"id": <int>, "error": {"message": "...", "type": "..."}}
"""

import json
import os
import signal
import sys
import traceback
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional

from takt_guard import get_tool_config

# Configure logging to stderr (stdout is for JSON protocol)
logging.basicConfig(
    level=logging.WARNING,
    format="%(asctime)s [takt-bridge] %(levelname)s: %(message)s",
    stream=sys.stderr,
)
logger = logging.getLogger("takt_hermes_bridge")

# ---------------------------------------------------------------------------
# Agent holder — long-lived AIAgent instance
# ---------------------------------------------------------------------------

_agent = None  # type: Optional[Any]
_agent_config = {}  # type: Dict[str, Any]


def _resolve_venv_python() -> str:
    """Find the Python executable inside hermes-agent's venv.

    hermes-agent is always installed at ~/.hermes/hermes-agent/,
    regardless of profile. HERMES_HOME may point to a profile directory,
    so we use a fixed path for the agent installation.
    """
    base_home = os.path.expanduser("~/.hermes")
    venv_python = os.path.join(base_home, "hermes-agent", "venv", "bin", "python3")
    if os.path.isfile(venv_python):
        return venv_python
    # Fallback to current interpreter
    return sys.executable


def _ensure_hermes_on_path() -> None:
    """Add hermes-agent source and vendor/hermes to sys.path.

    hermes-agent is always at ~/.hermes/hermes-agent/,
    regardless of profile. HERMES_HOME controls the agent's
    config/profile, not the installation location.
    """
    base_home = os.path.expanduser("~/.hermes")
    hermes_src = os.path.join(base_home, "hermes-agent")
    if hermes_src not in sys.path:
        sys.path.insert(0, hermes_src)

    # Add vendor/hermes (this directory) for takt_guard import
    vendor_dir = os.path.dirname(os.path.abspath(__file__))
    if vendor_dir not in sys.path:
        sys.path.insert(0, vendor_dir)


def _create_agent(config: Dict[str, Any]) -> Any:
    """Create a new AIAgent with the given config."""
    _ensure_hermes_on_path()
    from run_agent import AIAgent

    permission_mode = config.get("permissionMode", "readonly")
    extra_enabled = config.get("enabledToolsets", [])
    extra_disabled = config.get("disabledToolsets", [])

    # Use takt_guard for permission-aware toolset configuration
    enabled_toolsets, disabled_toolsets = get_tool_config(
        permission_mode,
        extra_enabled=extra_enabled if extra_enabled else None,
        extra_disabled=extra_disabled if extra_disabled else None,
    )

    agent = AIAgent(
        model=config.get("model", ""),
        provider=config.get("provider"),
        base_url=config.get("baseUrl"),
        api_key=config.get("apiKey"),
        quiet_mode=True,  # Required — suppress spinner/banner
        ephemeral_system_prompt=config.get("systemPrompt", ""),
        skip_context_files=True,  # Prevent AGENTS.md double-loading
        skip_memory=True,  # Prevent cross-task memory leaking
        max_iterations=config.get("maxTurns", 90),
        enabled_toolsets=enabled_toolsets if enabled_toolsets else None,
        disabled_toolsets=disabled_toolsets if disabled_toolsets else None,
        platform="takt",  # Identify as TAKT-sourced
        session_id=config.get("sessionId"),
        persist_session=False,  # TAKT manages sessions; prevent cross-task context leak
    )
    return agent


# ---------------------------------------------------------------------------
# Request handlers
# ---------------------------------------------------------------------------

def handle_setup(params: Dict[str, Any]) -> Dict[str, Any]:
    """Initialize or reinitialize the AIAgent."""
    global _agent, _agent_config
    _agent_config = params
    _agent = _create_agent(params)
    return {
        "status": "ok",
        "sessionId": _agent.session_id if _agent else None,
    }


def handle_call(params: Dict[str, Any]) -> Dict[str, Any]:
    """Run a conversation turn and return the result."""
    global _agent

    if _agent is None or not _agent_config:
        # Fix: setup must be called before call — no auto-setup with empty config
        return {
            "status": "error",
            "content": "",
            "error": "Agent not initialized. Call 'setup' first.",
            "sessionId": None,
            "usage": {},
        }

    prompt = params.get("prompt", "")
    conversation_history = params.get("conversationHistory")
    system_message = params.get("systemMessage")
    task_id = params.get("taskId")

    try:
        result = _agent.run_conversation(
            user_message=prompt,
            system_message=system_message,
            conversation_history=conversation_history,
            task_id=task_id,
        )
    except Exception as exc:
        logger.error("run_conversation failed: %s", exc)
        return {
            "status": "error",
            "content": "",
            "error": str(exc),
            "sessionId": _agent.session_id if _agent else None,
            "usage": {},
        }

    # Extract final response
    final_response = result.get("final_response", "") or ""
    completed = result.get("completed", False)
    interrupted = result.get("interrupted", False)

    # Build usage info
    usage = {
        "inputTokens": result.get("input_tokens", 0),
        "outputTokens": result.get("output_tokens", 0),
        "cacheReadTokens": result.get("cache_read_tokens", 0),
        "cacheWriteTokens": result.get("cache_write_tokens", 0),
        "totalTokens": result.get("total_tokens", 0),
        "estimatedCostUsd": result.get("estimated_cost_usd", 0),
        "model": result.get("model", ""),
        "provider": result.get("provider", ""),
        "apiCalls": result.get("api_calls", 0),
    }

    # Determine status
    if result.get("error"):
        status = "error"
    elif interrupted:
        status = "blocked"
    elif completed:
        status = "done"
    else:
        status = "done"

    return {
        "status": status,
        "content": final_response,
        "error": result.get("error"),
        "sessionId": _agent.session_id if _agent else None,
        "usage": usage,
        "completed": completed,
        "interrupted": interrupted,
    }


def handle_shutdown(_params: Dict[str, Any]) -> Dict[str, Any]:
    """Gracefully shut down the agent and exit."""
    global _agent
    _agent = None
    return {"status": "ok"}


# ---------------------------------------------------------------------------
# JSON-RPC-ish protocol loop
# ---------------------------------------------------------------------------

HANDLERS = {
    "setup": handle_setup,
    "call": handle_call,
    "shutdown": handle_shutdown,
}


def _send_response(response: Dict[str, Any]) -> None:
    """Write a JSON response to stdout (newline-delimited)."""
    try:
        line = json.dumps(response, ensure_ascii=False)
        sys.stdout.write(line + "\n")
        sys.stdout.flush()
    except Exception:
        logger.error("Failed to write response")


def _send_error(req_id: int, message: str, error_type: str = "RuntimeError") -> None:
    _send_response({
        "id": req_id,
        "error": {"message": message, "type": error_type},
    })


def main() -> None:
    """Main read-eval-print loop. Reads JSON requests from stdin."""
    # Let SIGPIPE terminate the process naturally if parent dies
    if hasattr(signal, "SIGPIPE"):
        signal.signal(signal.SIGPIPE, signal.SIG_DFL)

    logger.info("TAKT-Hermes bridge started (PID %d)", os.getpid())

    # Signal ready
    _send_response({"id": 0, "result": {"status": "ready"}})

    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            request = json.loads(line)
        except json.JSONDecodeError as exc:
            logger.error("Invalid JSON: %s", exc)
            _send_error(0, f"Invalid JSON: {exc}", "JSONDecodeError")
            continue

        req_id = request.get("id", 0)
        method = request.get("method", "")
        params = request.get("params", {})

        handler = HANDLERS.get(method)
        if handler is None:
            _send_error(req_id, f"Unknown method: {method}", "MethodNotFound")
            continue

        try:
            result = handler(params)
            _send_response({"id": req_id, "result": result})
        except Exception as exc:
            tb = traceback.format_exc()
            logger.error("Handler %s failed: %s\n%s", method, exc, tb)
            _send_error(req_id, str(exc), type(exc).__name__)

    logger.info("TAKT-Hermes bridge shutting down (stdin closed)")
    handle_shutdown({})


if __name__ == "__main__":
    main()