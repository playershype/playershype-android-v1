package com.playershype.shared;
import org.junit.Test;
import static org.junit.Assert.*;

public class LaunchGateTest {
  @Test public void onlyFirstUserLaunchClaimsTheEntry(){LaunchGate gate=new LaunchGate();assertTrue(gate.claim(false,false));assertFalse(gate.claim(false,false));}
  @Test public void adminDoesNotConsumeOrShowTheUserEntry(){LaunchGate gate=new LaunchGate();assertFalse(gate.claim(true,false));assertTrue(gate.claim(false,false));}
  @Test public void restorationNeverReplaysEntry(){LaunchGate gate=new LaunchGate();assertFalse(gate.claim(false,true));assertFalse(gate.claim(false,false));}
  @Test public void animationOrLateCallbackCannotExtendBudget(){assertEquals(2500L,LaunchGate.DURATION_MS);assertEquals(2500L,LaunchGate.remaining(100,100));assertEquals(220L,LaunchGate.remaining(100,2380));assertEquals(0L,LaunchGate.remaining(100,2700));assertEquals(0L,LaunchGate.remaining(100,10000));assertEquals(2500L,LaunchGate.remaining(100,80));}
}
