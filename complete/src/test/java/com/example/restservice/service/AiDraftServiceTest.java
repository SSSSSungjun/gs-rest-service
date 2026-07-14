package com.example.restservice.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class AiDraftServiceTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void extractsGeminiCandidateText() throws Exception {
        JsonNode response = objectMapper.readTree("""
                {
                  "candidates": [
                    {
                      "content": {
                        "parts": [
                          { "text": "첫 문단" },
                          { "text": "둘째 문단" }
                        ]
                      }
                    }
                  ]
                }
                """);

        assertThat(AiDraftService.extractGeminiOutputText(response))
                .isEqualTo("첫 문단\n둘째 문단");
    }

    @Test
    void extractsOpenAiTextWithoutAssumingTheFirstOutputItemIsTheMessage() throws Exception {
        JsonNode response = objectMapper.readTree("""
                {
                  "output": [
                    { "type": "reasoning", "content": [] },
                    {
                      "type": "message",
                      "content": [
                        { "type": "output_text", "text": "첫 문단" },
                        { "type": "output_text", "text": "둘째 문단" }
                      ]
                    }
                  ]
                }
                """);

        assertThat(AiDraftService.extractOpenAiOutputText(response))
                .isEqualTo("첫 문단\n둘째 문단");
    }
}
