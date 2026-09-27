package com.playershype.shared;
import org.junit.Test;
import static org.junit.Assert.*;
public class ExportControllerTest {
 @Test public void traversalAndControlNamesAreRejected(){for(String value:new String[]{"../key","..", "a/b", "a\\b", "name\u0000.txt"}){try{ExportController.name(value);fail(value);}catch(IllegalArgumentException expected){}}assertEquals("race.pdf",ExportController.name("race.pdf"));}
 @Test public void mimeAllowlistRejectsExecutableAndUnknownTypes(){assertTrue(ExportController.mimeAllowed("application/pdf"));assertTrue(ExportController.mimeAllowed("image/png"));assertFalse(ExportController.mimeAllowed("application/javascript"));assertFalse(ExportController.mimeAllowed("image/svg+xml"));assertFalse(ExportController.mimeAllowed("application/vnd.android.package-archive"));}
}
