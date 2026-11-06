package com.playershype.shared;
import org.junit.Test;
import static org.junit.Assert.*;
public class PublicResultsTest {
 @Test public void endpointIsFixedAndScoped(){assertEquals("https://hypepredict-results.players-hype1.workers.dev/results?track=CMR&date=2026-11-05",PublicResults.endpoint("CMR","2026-11-05"));}
 @Test public void invalidRequestsAreRejected(){for(String[] values:new String[][]{{"GP","2026-11-05"},{"CMR","2026-02-30"},{"CMR","2026-11-05&url=https://example.com"},{"CMR",null}}){try{PublicResults.endpoint(values[0],values[1]);fail();}catch(RuntimeException expected){}}}
 @Test public void payloadMustMatchRequestedDateAndTrack()throws Exception{String raw="{\"ok\":true,\"track\":\"Camarero\",\"date\":\"2026-11-05\",\"races\":[{\"raceNumber\":1}]}";assertTrue(PublicResults.validate(raw,"CMR","2026-11-05").contains("Camarero"));for(String bad:new String[]{raw.replace("2026-11-05","2026-11-04"),raw.replace("Camarero","Gulfstream Park"),raw.replace("[{\"raceNumber\":1}]","[{\"raceNumber\":1},{\"raceNumber\":1}]")}){try{PublicResults.validate(bad,"CMR","2026-11-05");fail();}catch(Exception expected){}}}
}
