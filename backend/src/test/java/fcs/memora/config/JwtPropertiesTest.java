package fcs.memora.config;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
@ActiveProfiles("test")
class JwtPropertiesTest {

    @Autowired
    private JwtProperties jwtProperties;

    @Test
    void shouldLoadJwtProperties() {
        assertThat(jwtProperties.secret()).isEqualTo("testSecretKeyAtLeast32CharactersLongForTestingPurposesOnly");
        assertThat(jwtProperties.accessTtl()).isEqualTo(900000L);
        assertThat(jwtProperties.refreshTtl()).isEqualTo(2592000000L);
    }
}
