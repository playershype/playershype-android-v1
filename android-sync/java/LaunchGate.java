package com.playershype.shared;

/** Process-local launch budget. It never waits for a network response. */
public final class LaunchGate {
  public static final long DURATION_MS = 2500L;
  public static final long FADE_MS = 220L;
  private boolean claimed;

  public synchronized boolean claim(boolean admin, boolean restored) {
    if (admin) return false;
    boolean first = !claimed;
    claimed = true;
    return first && !restored;
  }

  public static long remaining(long startedAt, long now) {
    long elapsed = Math.max(0L, now - startedAt);
    return elapsed >= DURATION_MS ? 0L : DURATION_MS - elapsed;
  }
}
