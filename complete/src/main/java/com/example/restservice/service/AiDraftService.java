package com.example.restservice.service;

import com.fasterxml.jackson.databind.JsonNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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
    private static final Logger LOGGER = LoggerFactory.getLogger(AiDraftService.class);
    private static final String GEMINI_PROVIDER = "gemini";
    private static final String OPENAI_PROVIDER = "openai";
    private static final String INSTRUCTIONS = """
            한국어 글쓰기 초안 작성기입니다.
            사용자가 제시한 주제, 목적, 형식, 분량, 말투를 바탕으로 실제 작성자가 직접 쓴 것처럼 자연스러운 글을 작성하세요.
            사용자가 칼럼, 에세이, 후기, 정보글, 공지, 요약, 대화문 등 형식을 지정하면 해당 장르의 구조와 문체를 최우선으로 따르세요.
            사용자에게 대답하거나 작업을 설명하지 마세요. '물론입니다', '다음과 같습니다', Q/A 라벨 같은 챗봇 표현 없이 요청한 결과물만 출력하세요.
            제목, 소제목, 목록은 사용자가 요청했거나 지정한 형식에 자연스럽게 필요한 경우에만 사용하세요. 그 외에는 바로 붙여넣을 본문만 출력하세요.
            사용자가 제공하지 않은 실제 인물, 사건, 통계, 뉴스는 사실처럼 만들지 마세요. 다만 요청 취지 안에서 일상적인 상황과 감정 묘사는 자연스럽게 보강할 수 있습니다.
            형식이 지정되지 않은 일반 커뮤니티 글은 첫 1~2문장에서 관심을 끌고, 상황이나 계기, 구체적인 장면, 작성자의 감정이나 관점, 독자가 반응할 만한 마무리를 자연스럽게 연결하세요.
            인기글이나 재미를 요청받아도 억지 유행어나 허위 사실 대신 공감 가능한 디테일과 분명한 관점을 사용하세요.
            사용자가 형식과 분량을 지정하지 않은 경우에만 한국어 300~700자, 4~8문장, 2~4문단을 기본값으로 사용하세요.
            사용자가 지정한 분량을 우선하되 최종 결과는 1800자 이내로 작성하세요.
            """;

    private final RestClient openAiRestClient;
    private final RestClient geminiRestClient;
    private final String provider;
    private final String openAiApiKey;
    private final String openAiModel;
    private final String geminiApiKey;
    private final String geminiModel;
    private final String geminiThinkingLevel;
    private final int maxOutputTokens;

    public AiDraftService(
            RestClient.Builder restClientBuilder,
            @Value("${app.ai.provider:gemini}") String provider,
            @Value("${app.openai.api-key:}") String openAiApiKey,
            @Value("${app.openai.model:gpt-5.4-mini}") String openAiModel,
            @Value("${app.openai.base-url:https://api.openai.com}") String openAiBaseUrl,
            @Value("${app.gemini.api-key:}") String geminiApiKey,
            @Value("${app.gemini.model:gemini-3.5-flash}") String geminiModel,
            @Value("${app.gemini.thinking-level:medium}") String geminiThinkingLevel,
            @Value("${app.ai.max-output-tokens:8192}") int maxOutputTokens,
            @Value("${app.gemini.base-url:https://generativelanguage.googleapis.com}") String geminiBaseUrl
    ) {
        this.openAiRestClient = restClientBuilder.baseUrl(openAiBaseUrl).build();
        this.geminiRestClient = restClientBuilder.baseUrl(geminiBaseUrl).build();
        this.provider = provider;
        this.openAiApiKey = openAiApiKey;
        this.openAiModel = openAiModel;
        this.geminiApiKey = geminiApiKey;
        this.geminiModel = geminiModel;
        this.geminiThinkingLevel = geminiThinkingLevel;
        this.maxOutputTokens = maxOutputTokens;
    }

    public String generateDraft(String prompt) {
        String selectedProvider = provider.trim().toLowerCase(Locale.ROOT);
        long startedAt = System.nanoTime();
        try {
            String draft = switch (selectedProvider) {
                case GEMINI_PROVIDER -> generateWithGemini(prompt);
                case OPENAI_PROVIDER -> generateWithOpenAi(prompt);
                default -> throw new ResponseStatusException(
                        SERVICE_UNAVAILABLE,
                        "지원하지 않는 AI provider입니다: " + provider
                );
            };
            LOGGER.info(
                    "AI draft generated: provider={}, durationMs={}",
                    selectedProvider,
                    (System.nanoTime() - startedAt) / 1_000_000
            );
            return draft;
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
                        "generationConfig", Map.of(
                                "maxOutputTokens", maxOutputTokens,
                                "thinkingConfig", Map.of("thinkingLevel", geminiThinkingLevel)
                        )
                ))
                .retrieve()
                .body(JsonNode.class);

        logGeminiResponse(response);
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
                        "max_output_tokens", maxOutputTokens
                ))
                .retrieve()
                .body(JsonNode.class);

        return extractOpenAiOutputText(response);
    }

    static String extractGeminiOutputText(JsonNode response) {
        if (response == null) {
            throw emptyResponse();
        }

        String finishReason = response.path("candidates").path(0).path("finishReason").asText("");
        if ("MAX_TOKENS".equals(finishReason)) {
            throw new ResponseStatusException(
                    BAD_GATEWAY,
                    "Gemini 응답이 출력 토큰 한도에 도달해 중단되었습니다."
            );
        }
        if (!finishReason.isBlank() && !"STOP".equals(finishReason)) {
            throw new ResponseStatusException(
                    BAD_GATEWAY,
                    "Gemini 응답이 정상적으로 완료되지 않았습니다: " + finishReason
            );
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

    private static void logGeminiResponse(JsonNode response) {
        if (response == null) {
            return;
        }

        JsonNode usage = response.path("usageMetadata");
        LOGGER.info(
                "Gemini response: finishReason={}, thoughtsTokens={}, candidateTokens={}, totalTokens={}",
                response.path("candidates").path(0).path("finishReason").asText(""),
                usage.path("thoughtsTokenCount").asInt(0),
                usage.path("candidatesTokenCount").asInt(0),
                usage.path("totalTokenCount").asInt(0)
        );
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
