"""
GateML Python SDK

Route your LLM calls through the GateML gateway — one key, all providers,
automatic fallback. Drop-in replacement for the OpenAI client.

Usage::

    from gateml import GateML

    client = GateML(api_key="gml-sk-live_...")
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": "Hello!"}],
    )
    print(response.choices[0].message.content)

Or bring your own OpenAI client::

    from openai import OpenAI
    from gateml import get_config

    client = OpenAI(**get_config(api_key="gml-sk-live_..."))
"""

from gateml._client import GateML, get_config

__all__ = ["GateML", "get_config"]
__version__ = "0.1.0"
