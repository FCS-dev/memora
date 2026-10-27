package fcs.memora.ai;

import fcs.memora.config.GlobalExceptionHandler;
import fcs.memora.note.exception.IdempotencyConflictException;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class AiErrorMappingTest {

    private final MockMvc mockMvc = MockMvcBuilders.standaloneSetup(new ProbeController())
        .setControllerAdvice(new GlobalExceptionHandler())
        .build();

    @Test
    void mapsConsentRequiredTo428() throws Exception {
        mockMvc.perform(get("/probe/consent"))
            .andExpect(status().is(428))
            .andExpect(jsonPath("$.detail").value("Se requiere consentimiento para usar la IA"));
    }

    @Test
    void mapsQuotaTo429() throws Exception {
        mockMvc.perform(get("/probe/quota"))
            .andExpect(status().isTooManyRequests());
    }

    @Test
    void mapsDisabledTo503() throws Exception {
        mockMvc.perform(get("/probe/disabled"))
            .andExpect(status().isServiceUnavailable());
    }

    @Test
    void mapsProviderFailureTo502() throws Exception {
        mockMvc.perform(get("/probe/provider"))
            .andExpect(status().isBadGateway());
    }

    @Test
    void mapsTimeoutTo504() throws Exception {
        mockMvc.perform(get("/probe/timeout"))
            .andExpect(status().isGatewayTimeout());
    }

    @Test
    void mapsTagCatalogFailureTo502() throws Exception {
        mockMvc.perform(get("/probe/tags"))
            .andExpect(status().isBadGateway())
            .andExpect(jsonPath("$.detail").value("No se pudieron cargar las etiquetas"));
    }

    @Test
    void mapsIdempotencyConflictTo409() throws Exception {
        mockMvc.perform(get("/probe/idempotency"))
            .andExpect(status().isConflict());
    }

    @RestController
    static class ProbeController {

        @GetMapping("/probe/consent")
        void consent() {
            throw new AiConsentRequiredException();
        }

        @GetMapping("/probe/quota")
        void quota() {
            throw new AiQuotaExceededException();
        }

        @GetMapping("/probe/disabled")
        void disabled() {
            throw new AiDisabledException();
        }

        @GetMapping("/probe/provider")
        void provider() {
            throw new AiProviderException("no se expone");
        }

        @GetMapping("/probe/timeout")
        void timeout() {
            throw new AiTimeoutException();
        }

        @GetMapping("/probe/tags")
        void tags() {
            throw new TagCatalogUnavailableException();
        }

        @GetMapping("/probe/idempotency")
        void idempotency() {
            throw new IdempotencyConflictException();
        }
    }
}
