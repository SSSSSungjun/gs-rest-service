package com.example.restservice.entity;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class PostTest {

    @Test
    void readsLegacyNullViewCountAsZero() {
        Post post = Post.builder()
                .viewCount(null)
                .build();

        assertThat(post.getViewCount()).isZero();
    }

    @Test
    void incrementsLegacyNullViewCountFromZero() {
        Post post = Post.builder()
                .viewCount(null)
                .build();

        post.increaseViewCount();

        assertThat(post.getViewCount()).isEqualTo(1L);
    }
}
