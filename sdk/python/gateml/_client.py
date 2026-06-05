"""GateML client — wraps the OpenAI client with the GateML base URL."""

from __future__ import annotations

from typing import Any

try:
    from openai import OpenAI as _OpenAI
except ImportError as exc:  # pragma: no cover
    raise ImportError(
        "openai is required: pip install openai"
    ) from exc

GATEWAY_URL = "https://api.gateml.io/v1"


def get_config(api_key: str, base_url: str = GATEWAY_URL) -> dict[str, str]:
    """
    Return a dict of keyword arguments to pass to the OpenAI client constructor.

    Example::

        from openai import OpenAI
        from gateml import get_config

        client = OpenAI(**get_config(api_key="gml-sk-live_..."))
    """
    return {"api_key": api_key, "base_url": base_url}


class GateML(_OpenAI):
    """
    A configured OpenAI client pointed at the GateML gateway.

    The API is identical to ``openai.OpenAI`` — swap the constructor and
    nothing else needs to change.

    :param api_key: Your GateML API key (``gml-sk-test_...`` or ``gml-sk-live_...``).
    :param base_url: Override the gateway URL (default: ``https://api.gateml.io/v1``).
    """

    def __init__(
        self,
        api_key: str,
        base_url: str = GATEWAY_URL,
        **kwargs: Any,
    ) -> None:
        super().__init__(api_key=api_key, base_url=base_url, **kwargs)
