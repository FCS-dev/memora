package fcs.memora.health;

import org.springframework.stereotype.Service;

@Service
public class HealthService {

    public boolean isHealthy() {
        return true;
    }

    public HealthResponse buildHealthResponse() {
        return new HealthResponse("ok");
    }
}
