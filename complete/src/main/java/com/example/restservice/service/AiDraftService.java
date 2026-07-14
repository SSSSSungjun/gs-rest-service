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
import java.util.Locale;
import java.util.Map;

import static org.springframework.http.HttpStatus.BAD_GATEWAY;
import static org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE;

@Service
public class AiDraftService {
    private static final String GEMINI_PROVIDER = "gemini";
    private static final String OPENAI_PROVIDER = "openai";
    private static final String INSTRUCTIONS = """
            한국어 익명 커뮤니티 게시글 작성 도우미입니다.
            사용자가 설명한 의도와 말투를 살려 자연스러운 게시글 본문을 작성하세요.
            제목, 머리말, 설명, 인용 부호, 마크다운 코드 블록 없이 바로 붙여넣을 본문만 출력하세요.
            사실로 확인되지 않은 구체적인 정보는 지어내지 마세요.
            게시글 본문은 1800자 이내로 작성하세요.
            """;

    private final RestClient openAiRestClient;
    private final RestClient geminiRestClient;
    private final String provider;
    private final String openAiApiKey;
    private final String openAiModel;
    private final String geminiApiKey;
    private final String geminiModel;

    public AiDraftService(
            RestClient.Builder restClientBuilder,
            @Value("${app.ai.provider:gemini}") String provider,
            @Value("${app.openai.api-key:}") String openAiApiKey,
            @Value("${app.openai.model:gpt-5.4-mini}") String openAiModel,
            @Value("${app.openai.base-url:https://api.openai.com}") String openAiBaseUrl,
            @Value("${app.gemini.api-key:}") String geminiApiKey,
            @Value("${app.gemini.model:gemini-3.5-flash}") String geminiModel,
            @Value("${app.gemini.base-url:https://generativelanguage.googleapis.com}") String geminiBaseUrl
    ) {
        this.openAiRestClient = restClientBuilder.baseUrl(openAiBaseUrl).build();
        this.geminiRestClient = restClientBuilder.baseUrl(geminiBaseUrl).build();
        this.provider = provider;
        this.openAiApiKey = openAiApiKey;
        this.openAiModel = openAiModel;
        this.geminiApiKey = geminiApiKey;
        this.geminiModel = geminiModel;
    }

    public String generateDraft(String prompt) {
        try {
            return switch (provider.trim().toLowerCase(Locale.ROOT)) {
                case GEMINI_PROVIDER -> generateWithGemini(prompt);
                case OPENAI_PROVIDER -> generateWithOpenAi(prompt);
                default -> throw new ResponseStatusException(
                        SERVICE_UNAVAILABLE,
                        "지원하지 않는 AI provider입니다: " + provider
                );
            };
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

    private String generateWithGemini(String prompt) {
        if (geminiApiKey.isBlank()) {
            throw new ResponseStatusException(
                    SERVICE_UNAVAILABLE,
                    "GEMINI_API_KEY가 설정되지 않았습니다."
            );
        }

        JsonNode response = geminiRestClient.post()
                .uri("/v1beta/models/{model}:generateContent", geminiModel)
                .header("x-goog-api-key", geminiApiKey)
                .contentType(MediaType.APPLICATION_JSON)
                .accept(MediaType.APPLICATION_JSON)
                .body(Map.of(
                        "system_instruction", Map.of(
                                "parts", List.of(Map.of("text", INSTRUCTIONS))
                        ),
                        "contents", List.of(Map.of(
                                "role", "user",
                                "parts", List.of(Map.of("text", prompt.trim()))
                        )),
                        "generationConfig", Map.of("maxOutputTokens", 700)
                ))
                .retrieve()
                .body(JsonNode.class);

        return extractGeminiOutputText(response);
    }

    private String generateWithOpenAi(String prompt) {
        if (openAiApiKey.isBlank()) {
            throw new ResponseStatusException(
                    SERVICE_UNAVAILABLE,
                    "OPENAI_API_KEY가 설정되지 않았습니다."
            );
        }

        JsonNode response = openAiRestClient.post()
                .uri("/v1/responses")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + openAiApiKey)
                .contentType(MediaType.APPLICATION_JSON)
                .accept(MediaType.APPLICATION_JSON)
                .body(Map.of(
                        "model", openAiModel,
                        "instructions", INSTRUCTIONS,
                        "input", prompt.trim(),
                        "max_output_tokens", 700
                ))
                .retrieve()
                .body(JsonNode.class);

        return extractOpenAiOutputText(response);
    }

    static String extractGeminiOutputText(JsonNode response) {
        if (response == null) {
            throw emptyResponse();
        }

        List<String> textParts = new ArrayList<>();
        for (JsonNode candidate : response.path("candidates")) {
            for (JsonNode part : candidate.path("content").path("parts")) {
                addTextPart(textParts, part);
            }
        }
        return requireOutputText(textParts);
    }

    static String extractOpenAiOutputText(JsonNode response) {
        if (response == null) {
            throw emptyResponse();
        }

        List<String> textParts = new ArrayList<>();
        for (JsonNode outputItem : response.path("output")) {
            if (!"message".equals(outputItem.path("type").asText())) {
                continue;
            }

            for (JsonNode contentItem : outputItem.path("content")) {
                if ("output_text".equals(contentItem.path("type").asText())) {
                    addTextPart(textParts, contentItem);
                }
            }
        }
        return requireOutputText(textParts);
    }

    private static void addTextPart(List<String> textParts, JsonNode item) {
        String text = item.path("text").asText("").trim();
        if (!text.isEmpty()) {
            textParts.add(text);
        }
    }

    private static String requireOutputText(List<String> textParts) {
        if (textParts.isEmpty()) {
            throw new ResponseStatusException(
                    BAD_GATEWAY,
                    "AI 응답에서 게시글 본문을 찾지 못했습니다."
            );
        }
        return String.join("\n", textParts);
    }

    private static ResponseStatusException emptyResponse() {
        return new ResponseStatusException(BAD_GATEWAY, "AI 응답이 비어 있습니다.");
    }
}
