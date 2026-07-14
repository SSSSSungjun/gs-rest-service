package com.example.restservice.dto.response;

public record BoardActivityResponseDto(
        String id,
        String type,
        Long postId,
        long occurredAt
) {
}
