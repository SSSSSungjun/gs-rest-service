package com.example.restservice.event;

public record BoardActivityCreatedEvent(
        Type type,
        Long postId,
        String ownerSessionId
) {
    public enum Type {
        POST,
        COMMENT
    }
}
