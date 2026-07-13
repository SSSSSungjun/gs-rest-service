package com.example.restservice.service;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static org.springframework.http.HttpStatus.BAD_GATEWAY;
import static org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE;

@Service
public class AiDraftService {
    private static final String INSTRUCTIONS = """
            한국어 익명 커뮤니티 게시글 작성 도우미입니다.
            사용자가 설명한 의도와 말투를 살려 자연스러운 게시글 본문을 작성하세요.
            제목, 머리말, 설명, 인용 부호, 마크다운 코드 블록 없이 바로 붙여넣을 본문만 출력하세요.
            사실로 확인되지 않은 구체적인 정보는 지어내지 마세요.
            """;

    private final RestClient restClient;
    private final String apiKey;
    private final String model;

    public AiDraftService(
            RestClient.Builder restClientBuilder,
            @Value("${app.openai.api-key:}") String apiKey,
            @Value("${app.openai.model:gpt-5.4-mini}") String model,
            @Value("${app.openai.base-url:https://api.openai.com}") String baseUrl
    ) {
        this.restClient = restClientBuilder.baseUrl(baseUrl).build();
        this.apiKey = apiKey;
        this.model = model;
    }

    public String generateDraft(String prompt) {
        if (apiKey.isBlank()) {
            throw new ResponseStatusException(
                    SERVICE_UNAVAILABLE,
                    "OPENAI_API_KEY가 설정되지 않았습니다."
            );
        }

        try {
            JsonNode response = restClient.post()
                    .uri("/v1/responses")
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .accept(MediaType.APPLICATION_JSON)
                    .body(Map.of(
                            "model", model,
                            "instructions", INSTRUCTIONS,
                            "input", prompt.trim(),
                            "max_output_tokens", 1000
                    ))
                    .retrieve()
                    .body(JsonNode.class);

            return extractOutputText(response);
        } catch (ResponseStatusException exception) {
            throw exception;
        } catch (RestClientException exception) {
            throw new ResponseStatusException(
                    BAD_GATEWAY,
                    "AI 글 생성 요청에 실패했습니다.",
                    exception
            );
        }
    }

    static String extractOutputText(JsonNode response) {
        if (response == null) {
            throw new ResponseStatusException(BAD_GATEWAY, "AI 응답이 비어 있습니다.");
        }

        List<String> textParts = new ArrayList<>();
        for (JsonNode outputItem : response.path("output")) {
            if (!"message".equals(outputItem.path("type").asText())) {
                continue;
            }

            for (JsonNode contentItem : outputItem.path("content")) {
                if ("output_text".equals(contentItem.path("type").asText())) {
                    String text = contentItem.path("text").asText("").trim();
                    if (!text.isEmpty()) {
                        textParts.add(text);
                    }
                }
            }
        }

        if (textParts.isEmpty()) {
            throw new ResponseStatusException(
                    BAD_GATEWAY,
                    "AI 응답에서 게시글 본문을 찾지 못했습니다."
            );
        }
        return String.join("\n", textParts);
    }
}
