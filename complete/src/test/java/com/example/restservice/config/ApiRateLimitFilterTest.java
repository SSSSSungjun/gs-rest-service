package com.example.restservice.config;

import com.example.restservice.service.AnonymousSessionService;
import com.example.restservice.service.ApiRateLimitService;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

class ApiRateLimitFilterTest {

    @Test
    @DisplayName("쓰기 요청이 IP 한도를 넘으면 429와 재시도 시간을 응답한다")
    void returnsTooManyRequestsAfterTheIpLimit() throws Exception {
        ApiRateLimitProperties properties = new ApiRateLimitProperties();
        properties.setEnabled(true);
        properties.getContent().setIpLimit(1);
        ApiRateLimitFilter filter = new ApiRateLimitFilter(
                properties,
                new AnonymousSessionService(false),
                new ApiRateLimitService(properties),
                new ObjectMapper()
        );
        FilterChain firstChain = mock(FilterChain.class);
        FilterChain secondChain = mock(FilterChain.class);

        MockHttpServletRequest firstRequest = postRequest("/api/posts", "203.0.113.40");
        MockHttpServletResponse firstResponse = new MockHttpServletResponse();
        filter.doFilter(firstRequest, firstResponse, firstChain);

        MockHttpServletRequest secondRequest = postRequest("/api/posts", "203.0.113.40");
        MockHttpServletResponse secondResponse = new MockHttpServletResponse();
        filter.doFilter(secondRequest, secondResponse, secondChain);

        verify(firstChain).doFilter(firstRequest, firstResponse);
        verifyNoInteractions(secondChain);
        assertThat(secondResponse.getStatus()).isEqualTo(429);
        assertThat(secondResponse.getHeader("Retry-After")).isNotBlank();
        assertThat(secondResponse.getContentAsString()).contains("요청이 너무 많습니다");
    }

    @Test
    @DisplayName("조회 요청은 rate limit 대상에서 제외한다")
    void leavesReadRequestsUnrestricted() throws Exception {
        ApiRateLimitProperties properties = new ApiRateLimitProperties();
        properties.setEnabled(true);
        ApiRateLimitFilter filter = new ApiRateLimitFilter(
                properties,
                new AnonymousSessionService(false),
                new ApiRateLimitService(properties),
                new ObjectMapper()
        );
        FilterChain chain = mock(FilterChain.class);
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/posts");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, chain);

        verify(chain).doFilter(request, response);
        assertThat(response.getStatus()).isEqualTo(200);
    }

    @Test
    @DisplayName("좋아요와 투표 및 조회수 요청을 상호작용 한도로 분류한다")
    void classifiesInteractionEndpoints() {
        assertThat(ApiRateLimitFilter.resolvePolicy("POST", "/api/posts/1/likes"))
                .isEqualTo(ApiRateLimitService.Policy.INTERACTION);
        assertThat(ApiRateLimitFilter.resolvePolicy("POST", "/api/posts/1/poll-options/2/votes"))
                .isEqualTo(ApiRateLimitService.Policy.INTERACTION);
        assertThat(ApiRateLimitFilter.resolvePolicy("POST", "/api/posts/1/views"))
                .isEqualTo(ApiRateLimitService.Policy.INTERACTION);
    }

    private MockHttpServletRequest postRequest(String path, String remoteAddress) {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", path);
        request.setRemoteAddr(remoteAddress);
        return request;
    }
}
