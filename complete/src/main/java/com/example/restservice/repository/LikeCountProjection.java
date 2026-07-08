package com.example.restservice.repository;

public interface LikeCountProjection {
    Long getTargetId();

    long getLikeCount();
}
