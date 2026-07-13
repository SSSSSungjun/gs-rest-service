package com.example.restservice.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AiDraftRequestDto(
        @NotBlank(message = "AI 글쓰기 요청을 입력해주세요.")
        @Size(max = 2000, message = "AI 글쓰기 요청은 2000자 이하여야 합니다.")
        String prompt
) {
}
