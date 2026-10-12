package fcs.memora.config;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class SecurityConfigTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void publicAuthEndpointsShouldBeAccessible() throws Exception {
        mockMvc.perform(post("/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isBadRequest());
    }

    @Test
    void publicHealthEndpointShouldBeAccessible() throws Exception {
        mockMvc.perform(get("/health"))
            .andExpect(status().isOk());
    }

    @Test
    void protectedEndpointsShouldRequireAuthentication() throws Exception {
        mockMvc.perform(get("/notes"))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.status").value(401));
    }

    @Test
    void adminEndpointsShouldRequireAuthentication() throws Exception {
        mockMvc.perform(get("/admin/users/test/status"))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.detail").isNotEmpty());
    }
}
