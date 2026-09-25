"""
Zerogateway - Unified Client & Router for Free LLM APIs
"""

from .client import ZeroGatewayClient
from .registry import RegistryManager
from .router import ZeroGatewayRouter

# Keep aliases for backwards compatibility
FreeLLMClient = ZeroGatewayClient
FreeLLMRouter = ZeroGatewayRouter

__version__ = "0.1.0"
__all__ = ["ZeroGatewayClient", "RegistryManager", "ZeroGatewayRouter", "FreeLLMClient", "FreeLLMRouter"]
