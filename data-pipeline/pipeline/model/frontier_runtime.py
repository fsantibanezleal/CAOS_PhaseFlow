"""Process resident-memory sampling for bounded frontier evaluations."""
from __future__ import annotations

import ctypes
import os
from pathlib import Path
import threading


def _resident_bytes() -> int:
    if os.name == "nt":
        class ProcessMemoryCounters(ctypes.Structure):
            _fields_ = [
                ("cb", ctypes.c_ulong), ("PageFaultCount", ctypes.c_ulong),
                ("PeakWorkingSetSize", ctypes.c_size_t), ("WorkingSetSize", ctypes.c_size_t),
                ("QuotaPeakPagedPoolUsage", ctypes.c_size_t), ("QuotaPagedPoolUsage", ctypes.c_size_t),
                ("QuotaPeakNonPagedPoolUsage", ctypes.c_size_t), ("QuotaNonPagedPoolUsage", ctypes.c_size_t),
                ("PagefileUsage", ctypes.c_size_t), ("PeakPagefileUsage", ctypes.c_size_t),
                ("PrivateUsage", ctypes.c_size_t),
            ]

        counters = ProcessMemoryCounters()
        counters.cb = ctypes.sizeof(counters)
        kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)
        psapi = ctypes.WinDLL("psapi", use_last_error=True)
        kernel32.GetCurrentProcess.restype = ctypes.c_void_p
        psapi.GetProcessMemoryInfo.argtypes = (
            ctypes.c_void_p, ctypes.POINTER(ProcessMemoryCounters), ctypes.c_ulong,
        )
        psapi.GetProcessMemoryInfo.restype = ctypes.c_int
        if not psapi.GetProcessMemoryInfo(
            kernel32.GetCurrentProcess(), ctypes.byref(counters), counters.cb,
        ):
            raise OSError(ctypes.get_last_error(), "GetProcessMemoryInfo failed")
        return int(counters.WorkingSetSize)
    statm = Path("/proc/self/statm")
    if statm.is_file():
        resident_pages = int(statm.read_text(encoding="ascii").split()[1])
        return resident_pages * int(os.sysconf("SC_PAGE_SIZE"))
    raise OSError("resident-memory sampling is unsupported on this platform")


class PeakRSS:
    """Sample this process's resident set during one case and retain its observed peak."""

    def __init__(self, interval_seconds: float = 0.1) -> None:
        if not 0 < interval_seconds <= 1:
            raise ValueError("memory sampling interval must be in (0, 1] seconds")
        self.interval_seconds = interval_seconds
        self.peak_bytes = 0
        self._failure: OSError | None = None
        self._stop = threading.Event()
        self._thread: threading.Thread | None = None

    def _sample(self) -> None:
        while not self._stop.is_set():
            try:
                self.peak_bytes = max(self.peak_bytes, _resident_bytes())
            except OSError as exc:
                self._failure = exc
                self._stop.set()
                return
            self._stop.wait(self.interval_seconds)

    def __enter__(self) -> PeakRSS:
        self.peak_bytes = _resident_bytes()
        self._failure = None
        self._stop.clear()
        self._thread = threading.Thread(target=self._sample, name="frontier-rss-sampler", daemon=True)
        self._thread.start()
        return self

    def __exit__(self, exc_type, exc_value, traceback) -> None:
        self._stop.set()
        if self._thread is not None:
            self._thread.join(timeout=max(1.0, self.interval_seconds * 2))
            self._thread = None
        if self._failure is not None:
            raise RuntimeError(f"resident-memory sampling failed: {self._failure}") from self._failure
        self.peak_bytes = max(self.peak_bytes, _resident_bytes())
