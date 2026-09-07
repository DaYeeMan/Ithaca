from __future__ import annotations

from contextvars import ContextVar, Token
from dataclasses import dataclass, field
from threading import Event
from time import monotonic


class ExecutionStopped(RuntimeError):
    """Raised cooperatively when a solve is cancelled or exceeds its deadline."""


@dataclass(slots=True)
class ExecutionControl:
    deadline: float
    stopped: Event = field(default_factory=Event)
    reason: str = "cancelled"

    def stop(self, reason: str) -> None:
        self.reason = reason
        self.stopped.set()

    def check(self) -> None:
        if self.stopped.is_set() or monotonic() >= self.deadline:
            raise ExecutionStopped(self.reason if self.stopped.is_set() else "deadline exceeded")


_current: ContextVar[ExecutionControl | None] = ContextVar("ithaca_execution", default=None)


def bind_execution(control: ExecutionControl) -> Token[ExecutionControl | None]:
    return _current.set(control)


def reset_execution(token: Token[ExecutionControl | None]) -> None:
    _current.reset(token)


def check_execution() -> None:
    control = _current.get()
    if control is not None:
        control.check()
